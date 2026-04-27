#!/usr/bin/env bash
# Claude Glass PreToolUse hook
# Receives JSON via stdin: {"tool_name": "...", "tool_input": {...}, "session_id": "..."}
# Blocks risky tools and waits for user approval via the Claude Glass frontend.

set -euo pipefail

# If approval env vars are not set, auto-allow
if [ -z "${CLAUDE_GLASS_SESSION_ID:-}" ]; then
  exit 0
fi

if [ "${CLAUDE_GLASS_APPROVAL:-}" != "1" ]; then
  exit 0
fi

# Read the full hook payload from stdin
PAYLOAD="$(cat)"

TOOL_NAME="$(printf '%s' "$PAYLOAD" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))")"

# Read-only / safe tools — always allow without prompting
case "$TOOL_NAME" in
  Read|Glob|Grep|LS|WebSearch|WebFetch|TodoRead|TodoWrite|Task|NotebookRead)
    exit 0
    ;;
esac

# Risky tools that need user approval: Write, Edit, MultiEdit, Bash, Move, etc.
PORT="${CLAUDE_GLASS_PORT:-8000}"
SESSION_ID="${CLAUDE_GLASS_SESSION_ID}"

# POST to backend and wait for decision (up to 310 seconds)
RESPONSE="$(printf '%s' "$PAYLOAD" | python3 -c "
import sys, json, urllib.request, urllib.error

payload_raw = sys.stdin.read()
try:
    payload = json.loads(payload_raw)
except Exception:
    payload = {}

body = json.dumps({
    'session_id': payload.get('session_id', '${SESSION_ID}'),
    'tool_name': payload.get('tool_name', '${TOOL_NAME}'),
    'tool_input': payload.get('tool_input', {}),
}).encode()

req = urllib.request.Request(
    'http://localhost:${PORT}/api/permission/request',
    data=body,
    headers={'Content-Type': 'application/json'},
    method='POST',
)
try:
    with urllib.request.urlopen(req, timeout=310) as resp:
        print(resp.read().decode())
except Exception as e:
    # On error, default to allow so Claude is not stuck
    print(json.dumps({'decision': 'allow'}))
" 2>/dev/null)"

DECISION="$(printf '%s' "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('decision','allow'))"  2>/dev/null || echo "allow")"

if [ "$DECISION" = "deny" ]; then
  printf '{"continue": true, "decision": "block", "reason": "User denied in Claude Glass"}\n'
fi

exit 0
