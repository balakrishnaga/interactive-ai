from pydantic import BaseModel

class TextInput(BaseModel):
    text: str

class BatchInput(BaseModel):
    texts: list[str]

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatInput(BaseModel):
    messages: list[ChatMessage]
