import json
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv(Path(__file__).with_name(".env"))

_CONFIG_PATH = Path(__file__).resolve().parent.parent / "config" / "config.json"

def _load_config() -> dict:
    try:
        with open(_CONFIG_PATH) as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return {}

_CFG = _load_config()

from claude_runner import run_claude
from session_manager import (
    init_db,
    create_session,
    list_sessions,
    get_session,
    update_session,
    delete_session,
    mark_has_messages,
    save_message,
    get_messages,
)
from models import ChatRequest
from permission_manager import (
    request_permission,
    get_pending,
    respond,
    clear,
)

HOOK_COMMAND = f"bash {Path(__file__).parent / 'hook.sh'}"


def setup_hook() -> None:
    """Ensure the Claude settings.json has the PreToolUse hook registered."""
    settings_path = os.path.expanduser("~/.claude/settings.json")
    os.makedirs(os.path.dirname(settings_path), exist_ok=True)

    if os.path.exists(settings_path):
        try:
            with open(settings_path) as f:
                settings: dict = json.load(f)
        except (json.JSONDecodeError, OSError):
            settings = {}
    else:
        settings = {}

    hooks = settings.setdefault("hooks", {})
    pre_tool_use: list = hooks.setdefault("PreToolUse", [])

    # Check if our command is already registered
    for entry in pre_tool_use:
        for h in entry.get("hooks", []):
            if h.get("command") == HOOK_COMMAND:
                return  # Already present

    pre_tool_use.append({
        "hooks": [
            {
                "type": "command",
                "command": HOOK_COMMAND,
            }
        ]
    })

    with open(settings_path, "w") as f:
        json.dump(settings, f, indent=2, ensure_ascii=False)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    setup_hook()
    yield


app = FastAPI(title="Claude Glass", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/chat")
async def chat(request: ChatRequest):
    session = await get_session(request.session_id)
    is_resume = session is not None and session["has_messages"]
    # Resume must use the original cwd so Claude can find its session file
    working_directory = session["working_directory"] if is_resume else request.working_directory

    if session is None:
        await create_session(request.session_id, working_directory=request.working_directory)
    elif not is_resume and session["working_directory"] != request.working_directory:
        # Sync the cwd before the first real message so future resumes use the right path
        await update_session(request.session_id, working_directory=request.working_directory)

    async def event_stream():
        assistant_text = ""
        blocks: list[dict] = []
        seen_tool_ids: set[str] = set()

        async for obj in run_claude(
            message=request.message,
            session_id=request.session_id,
            is_resume=is_resume,
            working_directory=working_directory,
            model=request.model,
            approval=request.approval,
        ):
            yield f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"

            if obj.get("type") == "assistant":
                msg = obj.get("message", {})
                for block in msg.get("content", []):
                    if block.get("type") == "text" and block.get("text"):
                        assistant_text = block["text"]
                        if blocks and blocks[-1].get("type") == "text":
                            blocks[-1]["text"] = block["text"]
                        else:
                            blocks.append({"type": "text", "text": block["text"]})
                    elif block.get("type") == "tool_use":
                        tool_id = block.get("id", "")
                        if tool_id not in seen_tool_ids:
                            seen_tool_ids.add(tool_id)
                            blocks.append({
                                "type": "tool_use",
                                "tool": {
                                    "id": tool_id,
                                    "name": block.get("name", ""),
                                    "input": block.get("input", {}),
                                    "status": "done",
                                },
                            })

        await save_message(request.session_id, "user", request.message)
        if blocks:
            await save_message(
                request.session_id, "assistant", assistant_text,
                json.dumps(blocks, ensure_ascii=False),
            )
        await mark_has_messages(request.session_id)
        clear(request.session_id)
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/permission/request")
async def handle_permission_request(body: dict):
    """Called by hook.sh — blocks until the user responds via the frontend."""
    decision = await request_permission(
        body["session_id"],
        body["tool_name"],
        body.get("tool_input", {}),
    )
    return {"decision": decision}


@app.get("/api/sessions/{session_id}/pending-permission")
async def get_pending_permission_endpoint(session_id: str):
    """Polled by the frontend to check if there is a pending approval request."""
    pending = get_pending(session_id)
    return pending if pending else {}


@app.post("/api/sessions/{session_id}/permission-respond")
async def respond_to_permission(session_id: str, body: dict):
    """Called by the frontend when the user clicks Allow or Deny."""
    respond(session_id, body["decision"])
    return {"ok": True}


@app.get("/api/sessions/{session_id}/messages")
async def get_session_messages(session_id: str):
    return await get_messages(session_id)


@app.get("/api/sessions")
async def get_sessions():
    return await list_sessions()


class CreateSessionRequest(BaseModel):
    title: str = "新对话"
    working_directory: str = _CFG.get("defaultWorkingDirectory", "~")


@app.post("/api/sessions")
async def create_new_session(req: CreateSessionRequest):
    session_id = str(uuid.uuid4())
    return await create_session(session_id, title=req.title, working_directory=req.working_directory)


class UpdateSessionRequest(BaseModel):
    title: str | None = None


@app.patch("/api/sessions/{session_id}")
async def patch_session(session_id: str, req: UpdateSessionRequest):
    session = await get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    kwargs = {}
    if req.title is not None:
        kwargs["title"] = req.title
    return await update_session(session_id, **kwargs)


@app.delete("/api/sessions/{session_id}")
async def remove_session(session_id: str):
    ok = await delete_session(session_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"ok": True}


@app.get("/api/config")
async def get_config():
    cfg = _load_config()
    home = os.path.expanduser("~")
    return {
        "homeDir": home,
        "defaultWorkingDirectory": cfg.get("defaultWorkingDirectory", home),
        "defaultModel": cfg.get("defaultModel", "pa/claude-sonnet-4-6"),
        "models": cfg.get("models", []),
        "workspaces": cfg.get("workspaces", []),
    }


@app.get("/api/fs/list")
async def list_directory(path: str = "~"):
    expanded = os.path.expanduser(path)
    try:
        entries = []
        with os.scandir(expanded) as it:
            for entry in sorted(it, key=lambda e: (not e.is_dir(), e.name.lower())):
                if entry.is_dir() and not entry.name.startswith('.'):
                    entries.append({"name": entry.name, "path": entry.path})
        parent = str(os.path.dirname(expanded)) if expanded != "/" else None
        return {"path": expanded, "parent": parent, "entries": entries}
    except PermissionError:
        return {"path": expanded, "parent": None, "entries": [], "error": "Permission denied"}


class AddWorkspaceRequest(BaseModel):
    name: str
    path: str


@app.delete("/api/config/workspaces")
async def remove_workspace(path: str):
    cfg = _load_config()
    cfg["workspaces"] = [w for w in cfg.get("workspaces", []) if w["path"] != path]
    with open(_CONFIG_PATH, "w") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)
    return {"ok": True}


@app.post("/api/config/workspaces")
async def add_workspace(req: AddWorkspaceRequest):
    cfg = _load_config()
    workspaces: list = cfg.get("workspaces", [])
    path = req.path.strip()
    if any(w["path"] == path for w in workspaces):
        raise HTTPException(status_code=409, detail="该工作区已存在")
    workspaces.append({"name": req.name.strip(), "path": path})
    cfg["workspaces"] = workspaces
    with open(_CONFIG_PATH, "w") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)
    return {"ok": True, "workspaces": workspaces}


class AddModelRequest(BaseModel):
    id: str
    label: str
    desc: str = ""
    icon: str = "zap"


@app.post("/api/config/models")
async def add_model(req: AddModelRequest):
    cfg = _load_config()
    models: list = cfg.get("models", [])
    model_id = req.id.strip()
    if any(m["id"] == model_id for m in models):
        raise HTTPException(status_code=409, detail="该模型已存在")
    models.append({"id": model_id, "label": req.label.strip(), "desc": req.desc.strip(), "icon": req.icon})
    cfg["models"] = models
    with open(_CONFIG_PATH, "w") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)
    return {"ok": True}


@app.delete("/api/config/models")
async def remove_model(id: str):
    cfg = _load_config()
    cfg["models"] = [m for m in cfg.get("models", []) if m["id"] != id]
    with open(_CONFIG_PATH, "w") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)
    return {"ok": True}
