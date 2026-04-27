import aiosqlite
import os
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "sessions.db")


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT DEFAULT '新对话',
                working_directory TEXT DEFAULT '~',
                created_at TEXT,
                updated_at TEXT,
                has_messages INTEGER DEFAULT 0
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL DEFAULT '',
                tools TEXT NOT NULL DEFAULT '[]',
                created_at TEXT,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )
        """)
        await db.commit()


async def create_session(session_id: str, title: str = "新对话", working_directory: str = "~") -> dict:
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO sessions (id, title, working_directory, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (session_id, title, working_directory, now, now),
        )
        await db.commit()
    return {"id": session_id, "title": title, "working_directory": working_directory, "created_at": now, "updated_at": now, "has_messages": False}


async def list_sessions() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM sessions ORDER BY updated_at DESC")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_session(session_id: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def update_session(session_id: str, **kwargs) -> dict | None:
    allowed = {"title", "working_directory", "has_messages"}
    fields = {k: v for k, v in kwargs.items() if k in allowed}
    if not fields:
        return await get_session(session_id)

    fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [session_id]

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE sessions SET {set_clause} WHERE id = ?", values)
        await db.commit()
    return await get_session(session_id)


async def delete_session(session_id: str) -> bool:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        await db.commit()
        return cursor.rowcount > 0


async def mark_has_messages(session_id: str):
    await update_session(session_id, has_messages=1)


async def save_message(session_id: str, role: str, content: str, tools: str = "[]") -> dict:
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO messages (session_id, role, content, tools, created_at) VALUES (?, ?, ?, ?, ?)",
            (session_id, role, content, tools, now),
        )
        await db.commit()
        return {"id": cursor.lastrowid, "session_id": session_id, "role": role, "content": content, "tools": tools, "created_at": now}


async def get_messages(session_id: str) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT role, content, tools FROM messages WHERE session_id = ? ORDER BY id ASC",
            (session_id,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
