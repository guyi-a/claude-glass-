import asyncio
import json
import os
import sys
from typing import AsyncGenerator


async def run_claude(
    message: str,
    session_id: str,
    is_resume: bool = False,
    working_directory: str = "~",
    model: str | None = None,
    approval: bool = False,
) -> AsyncGenerator[dict, None]:
    cmd = [
        "claude", "-p",
        "--output-format", "stream-json",
        "--verbose",
        "--permission-mode", "auto",
    ]

    if is_resume:
        cmd += ["--resume", session_id]
    else:
        cmd += ["--session-id", session_id]

    if model:
        cmd += ["--model", model]

    expanded_cwd = os.path.expanduser(working_directory)

    env = {**os.environ}
    if model:
        env["ANTHROPIC_MODEL"] = model
        env["ANTHROPIC_SMALL_FAST_MODEL"] = model

    if approval:
        env["CLAUDE_GLASS_SESSION_ID"] = session_id
        env["CLAUDE_GLASS_APPROVAL"] = "1"
        env["CLAUDE_GLASS_PORT"] = "8001"

    print(f"[claude_runner] cmd={cmd} cwd={expanded_cwd}", file=sys.stderr, flush=True)
    print(f"[claude_runner] ANTHROPIC_BASE_URL={env.get('ANTHROPIC_BASE_URL', '(not set)')}", file=sys.stderr, flush=True)
    print(f"[claude_runner] ANTHROPIC_AUTH_TOKEN={'SET' if env.get('ANTHROPIC_AUTH_TOKEN') else '(not set)'}", file=sys.stderr, flush=True)

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=expanded_cwd,
            env=env,
        )
    except FileNotFoundError:
        yield {"type": "error", "message": f"找不到 claude 命令，请确认已安装 Claude Code CLI 并在 PATH 中"}
        return

    proc.stdin.write(message.encode() + b"\n")
    await proc.stdin.drain()
    proc.stdin.close()

    stdout_lines = []
    async for line in proc.stdout:
        line = line.decode().strip()
        if not line:
            continue
        stdout_lines.append(line)
        try:
            yield json.loads(line)
        except json.JSONDecodeError:
            continue

    await proc.wait()
    stderr_output = (await proc.stderr.read()).decode().strip()

    if stderr_output:
        print(f"[claude_runner] stderr:\n{stderr_output}", file=sys.stderr, flush=True)

    if proc.returncode != 0 and not stdout_lines:
        err_text = stderr_output or f"claude 进程退出码 {proc.returncode}"
        print(f"[claude_runner] 失败: {err_text}", file=sys.stderr, flush=True)
        yield {
            "type": "assistant",
            "message": {
                "content": [{"type": "text", "text": f"**Claude 启动失败**\n\n```\n{err_text}\n```"}]
            }
        }
