from fastapi import APIRouter
from app.schemas.text_input import TextInput, BatchInput
from app.services.embedding import embedding_service

router = APIRouter()

@router.post("/embed")
def generate_embedding(input: TextInput):
    embedding = embedding_service.generate_embedding(input.text)
    return {"embedding": embedding}

@router.post("/embed-batch")
def generate_batch_embeddings(input: BatchInput):
    embeddings = embedding_service.generate_embedding(input.texts)
    return {"embeddings": embeddings}
