import asyncio
import json
import os
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

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=expanded_cwd,
        env=env,
    )

    proc.stdin.write(message.encode() + b"\n")
    await proc.stdin.drain()
    proc.stdin.close()

    async for line in proc.stdout:
        line = line.decode().strip()
        if not line:
            continue
        try:
            yield json.loads(line)
        except json.JSONDecodeError:
            continue

    await proc.wait()
