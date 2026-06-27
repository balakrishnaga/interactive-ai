from fastapi import APIRouter, HTTPException, UploadFile, File
from app.schemas.text_input import TextInput, BatchInput, ChatInput
from app.schemas.retrieve import RetrieveRequest, RetrieveResponse
from app.schemas.evaluate import EvaluateRequest, EvaluateResponse
from app.services.embedding import embedding_service
from app.services.document_processor import document_processor
from app.services.evaluator import evaluator_service
from app.services.llm_service import llm_service
from app.services.retriever import retriever_service

router = APIRouter()


@router.post("/chat")
async def chat(input: ChatInput):
    messages = [m.model_dump() for m in input.messages]
    response = await llm_service.chat(messages)
    return {"response": response}


@router.post("/embed")
def generate_embedding(input: TextInput):
    embedding = embedding_service.generate_embedding(input.text)
    return {"embedding": embedding}


@router.post("/embed-batch")
def generate_batch_embeddings(input: BatchInput):
    embeddings = embedding_service.generate_embedding(input.texts)
    return {"embeddings": embeddings}


@router.post("/process-pdf")
def process_pdf(file: UploadFile = File(...)):
    file_bytes = file.file.read()

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    # 1. Process PDF into chunks using LangChain
    chunks = document_processor.process_pdf(file_bytes, file.filename)

    # 2. Extract texts for embedding
    texts = [chunk["text"] for chunk in chunks]

    # 3. Generate embeddings
    embeddings = embedding_service.generate_embedding(texts)

    # 4. Attach embeddings back to chunks
    for i, chunk in enumerate(chunks):
        chunk["embedding"] = embeddings[i]

    return {"chunks": chunks}


@router.post("/retrieve", response_model=RetrieveResponse)
def retrieve(input: RetrieveRequest):
    return retriever_service.retrieve(input.query, input.top_k, input.rerank)


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(input: EvaluateRequest):
    metrics = await evaluator_service.evaluate(
        input.query,
        input.response,
        [chunk.model_dump() for chunk in input.chunks],
        llm_service
    )
    return EvaluateResponse(**metrics)
