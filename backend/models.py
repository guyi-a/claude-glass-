from pydantic import BaseModel, Field
import uuid


class ChatRequest(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message: str
    working_directory: str = "~"
    model: str | None = None
    approval: bool = False
