import logging

from fastapi import APIRouter, HTTPException, UploadFile, File
from app.schemas.text_input import TextInput, BatchInput, ChatInput
from app.schemas.retrieve import RetrieveRequest, RetrieveResponse
from app.schemas.evaluate import EvaluateRequest, EvaluateResponse
from app.schemas.guardrails import GuardrailsCheckRequest, GuardrailResult, GuardrailsQueryRequest
from app.services.embedding import embedding_service
from app.services.document_processor import document_processor
from app.services.evaluator import evaluator_service
from app.services.llm_service import llm_service
from app.services.retriever import retriever_service
from app.services.guardrails import query_relevance_guardrail, response_guardrail

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/chat")
async def chat(input: ChatInput):
    logger.info("Chat request received")
    messages = [m.model_dump() for m in input.messages]
    logger.debug("Chat message count: %d", len(messages))
    response = await llm_service.chat(messages)
    logger.info("Chat response returning")
    return {"response": response}


@router.post("/embed")
def generate_embedding(input: TextInput):
    logger.info("Embedding request received")
    logger.debug("Embedding text length: %d", len(input.text))
    embedding = embedding_service.generate_embedding(input.text)
    return {"embedding": embedding}


@router.post("/embed-batch")
def generate_batch_embeddings(input: BatchInput):
    logger.info("Batch embedding request received")
    logger.debug("Batch embedding size: %d", len(input.texts))
    embeddings = embedding_service.generate_embedding(input.texts)
    return {"embeddings": embeddings}


@router.post("/process-pdf")
def process_pdf(file: UploadFile = File(...)):
    logger.info("Process PDF request received")
    logger.debug("Process PDF filename: %s", file.filename)

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

    logger.info("Process PDF chunks produced: %d", len(chunks))
    return {"chunks": chunks}


@router.post("/retrieve", response_model=RetrieveResponse)
def retrieve(input: RetrieveRequest):
    logger.info("Retrieve request received")
    logger.debug(
        "Retrieve query length: %d, top_k: %d, rerank: %s",
        len(input.query),
        input.top_k,
        input.rerank,
    )
    result = retriever_service.retrieve(input.query, input.top_k, input.rerank)
    
    return result


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(input: EvaluateRequest):
    logger.info("Evaluate request received")
    logger.debug(
        "Evaluate query length: %d, response length: %d, reference provided: %s",
        len(input.query),
        len(input.response),
        input.reference_answer is not None,
    )
    metrics = await evaluator_service.evaluate(
        input.query,
        input.response,
        [chunk.model_dump() for chunk in input.chunks],
        llm_service,
        input.reference_answer
    )
    logger.info("Evaluate metrics computed")
    return EvaluateResponse(**metrics)


@router.post("/guardrails/check", response_model=GuardrailResult)
async def check_guardrails(input: GuardrailsCheckRequest):
    logger.info("Guardrails check request received")
    
    chunks_dict = [chunk.model_dump() for chunk in input.chunks]
    
    if not input.chunks:
        logger.debug("Performing query-only relevance check (no chunks provided)")
        if not input.response:
            return query_relevance_guardrail.check_without_chunks(input.query)
        # If response is provided but chunks are empty, response guardrail will still be called,
        # though it may fail groundedness.
    
    if not input.response:
        logger.debug("Performing full query relevance check")
        return query_relevance_guardrail.check(input.query, chunks_dict)
    
    logger.debug("Performing response guardrail check")
    return await response_guardrail.check(
        input.query, 
        input.response, 
        chunks_dict, 
        llm_service
    )


@router.post("/guardrails/query", response_model=GuardrailResult)
async def check_query_guardrails(input: GuardrailsQueryRequest):
    logger.info("Query-only guardrails check request received")
    return query_relevance_guardrail.check_without_chunks(input.query)
