"""
Manages pending PreToolUse permission requests.
One pending request per session at a time; the hook script POSTs here and
waits up to 300 s for the user to approve or deny from the frontend.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any


@dataclass
class PendingPermission:
    session_id: str
    tool_name: str
    tool_input: dict[str, Any]
    event: asyncio.Event = field(default_factory=asyncio.Event)
    decision: str = "deny"  # "allow" | "deny"


_pending: dict[str, PendingPermission] = {}


async def request_permission(
    session_id: str,
    tool_name: str,
    tool_input: dict[str, Any],
) -> str:
    """Block until the user responds (or 300 s timeout). Returns 'allow' | 'deny'."""
    perm = PendingPermission(
        session_id=session_id,
        tool_name=tool_name,
        tool_input=tool_input,
    )
    _pending[session_id] = perm

    try:
        await perm.event.wait()
    finally:
        _pending.pop(session_id, None)

    return perm.decision


def get_pending(session_id: str) -> dict | None:
    """Return the pending request as a plain dict, or None."""
    perm = _pending.get(session_id)
    if perm is None:
        return None
    return {
        "session_id": perm.session_id,
        "tool_name": perm.tool_name,
        "tool_input": perm.tool_input,
    }


def respond(session_id: str, decision: str) -> None:
    """Set the decision and unblock the waiting coroutine."""
    perm = _pending.get(session_id)
    if perm is None:
        return
    perm.decision = decision
    perm.event.set()


def clear(session_id: str) -> None:
    """Remove any pending request for this session (e.g. when the stream ends)."""
    perm = _pending.pop(session_id, None)
    if perm is not None:
        # Unblock the hook in case it is still waiting
        perm.decision = "allow"
        perm.event.set()
