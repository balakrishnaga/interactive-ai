from pydantic import BaseModel

class TextInput(BaseModel):
    text: str

class BatchInput(BaseModel):
    texts: list[str]
