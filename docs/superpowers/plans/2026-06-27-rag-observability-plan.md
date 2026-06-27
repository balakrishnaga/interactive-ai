# RAG Observability Debug Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the backend-centric RAG observability feature described in `docs/superpowers/specs/2026-06-27-rag-observability-design.md`: an expandable debug panel inside the chat UI with document upload, retrieval chunks, reranking, and automatic metrics.

**Architecture:** Embedding service adds `/retrieve` (vector search + optional cross-encoder rerank) and `/evaluate` (metrics) endpoints. Next.js `/api/chat` orchestrates both, augments the LLM prompt with reranked chunks, and returns an `observability` payload. The frontend renders it in a new `ObservabilityPanel`.

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Bootstrap 5; FastAPI / Python 3.10 / SentenceTransformers / MongoDB Atlas.

---

## File Structure

### Backend (embedding-service)

| File | Responsibility |
|---|---|
| `app/schemas/retrieve.py` | Pydantic request/response models for `/retrieve` |
| `app/schemas/evaluate.py` | Pydantic request/response models for `/evaluate` |
| `app/services/reranker.py` | Cross-encoder reranker wrapper |
| `app/services/evaluator.py` | Recall, precision, groundedness, faithfulness |
| `app/api/endpoints.py` | Wire `/retrieve` and `/evaluate` routes |
| `requirements.txt` | Ensure dependencies are present |
| `tests/test_retrieve.py` | Unit tests for `/retrieve` logic |
| `tests/test_evaluate.py` | Unit tests for `/evaluate` logic |

### Frontend (nextjs-app)

| File | Responsibility |
|---|---|
| `src/lib/observability.ts` | TypeScript types for observability payload |
| `src/app/api/chat/route.ts` | Orchestrate `/retrieve`, LLM, `/evaluate` |
| `src/components/ObservabilityPanel.tsx` | Expandable split-panel debug UI |
| `src/components/ChatBox.tsx` | Add toggle and pass observability state |
| `src/components/__tests__/ObservabilityPanel.test.tsx` | Component render tests |
| `src/app/api/chat/__tests__/route.test.ts` | API route tests |

---

## Chunk 1: Backend Pydantic Schemas and Reranker Service

**Complexity:** simple  
**Files:**
- Create: `services/embedding-service/app/schemas/retrieve.py`
- Create: `services/embedding-service/app/schemas/evaluate.py`
- Create: `services/embedding-service/app/services/reranker.py`
- Modify: `services/embedding-service/requirements.txt`

### Task 1.1: Create `app/schemas/retrieve.py`

- [ ] **Step 1: Write the schema file**

```python
from pydantic import BaseModel
from typing import List, Optional

class ChunkMetadata(BaseModel):
    filename: str
    pageIndex: int
    chunkIndex: int

class RetrievedChunk(BaseModel):
    text: str
    metadata: ChunkMetadata
    vector_score: float
    rerank_score: Optional[float] = None

class RetrieveRequest(BaseModel):
    query: str
    top_k: int = 5
    rerank: bool = True

class RetrieveResponse(BaseModel):
    query: str
    query_embedding: List[float]
    top_k: int
    initial_chunks: List[RetrievedChunk]
    reranked_chunks: List[RetrievedChunk]
    reranker_used: bool
```

### Task 1.2: Create `app/schemas/evaluate.py`

- [ ] **Step 1: Write the schema file**

```python
from pydantic import BaseModel
from typing import List
from app.schemas.retrieve import RetrievedChunk

class EvaluateRequest(BaseModel):
    query: str
    response: str
    chunks: List[RetrievedChunk]

class EvaluateResponse(BaseModel):
    recall: float
    precision: float
    groundedness: float
    faithfulness: float
```

### Task 1.3: Create `app/services/reranker.py`

- [ ] **Step 1: Write the reranker service**

```python
import os
from typing import List, Dict, Any
from sentence_transformers import CrossEncoder

class RerankerService:
    def __init__(self, model_name: str = "BAAI/bge-reranker-base"):
        self.model_name = model_name
        self.model = None
        try:
            self.model = CrossEncoder(model_name)
        except Exception as e:
            print(f"Warning: failed to load reranker {model_name}: {e}")

    def rerank(self, query: str, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if self.model is None or not chunks:
            return chunks
        pairs = [(query, chunk["text"]) for chunk in chunks]
        scores = self.model.predict(pairs, batch_size=8)
        scored = [
            {**chunk, "rerank_score": float(score)}
            for chunk, score in zip(chunks, scores)
        ]
        return sorted(scored, key=lambda x: x["rerank_score"], reverse=True)

reranker_service = RerankerService()
```

### Task 1.4: Verify dependencies

- [ ] **Step 1: Check `requirements.txt`**

Run:

```bash
grep -E "sentence-transformers|pydantic" services/embedding-service/requirements.txt
```

Expected: both present.

- [ ] **Step 2: Add if missing**

If `sentence-transformers` is missing, add:

```
sentence-transformers>=3.0.0
```

If `pydantic` is missing, add:

```
pydantic>=2.0
```

### Task 1.5: Commit

- [ ] **Step 1: Commit the chunk**

```bash
git add services/embedding-service/app/schemas/retrieve.py \
        services/embedding-service/app/schemas/evaluate.py \
        services/embedding-service/app/services/reranker.py \
        services/embedding-service/requirements.txt
git commit -m "feat(observability): add retrieve/evaluate schemas and reranker service"
```

---

## Chunk 2: Backend `/retrieve` Endpoint

**Complexity:** simple  
**Files:**
- Create: `services/embedding-service/app/services/retriever.py`
- Modify: `services/embedding-service/app/api/endpoints.py`

### Task 2.1: Create `app/services/retriever.py`

- [ ] **Step 1: Write the retriever service**

```python
import os
from typing import List, Dict, Any
from pymongo import MongoClient
from app.services.embedding import embedding_service
from app.services.reranker import reranker_service

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "interactive-ai")

class RetrieverService:
    def __init__(self):
        self.client = MongoClient(MONGODB_URI)
        self.db = self.client[MONGODB_DB]

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        rerank: bool = True,
        index_name: str = "vector_index"
    ) -> Dict[str, Any]:
        query_embedding = embedding_service.generate_embedding(query)
        collection = self.db["vectors"]

        results = list(collection.aggregate([
            {
                "$vectorSearch": {
                    "index": index_name,
                    "path": "embedding",
                    "queryVector": query_embedding,
                    "numCandidates": 100,
                    "limit": top_k
                }
            },
            {
                "$project": {
                    "text": 1,
                    "metadata": 1,
                    "score": {"$meta": "vectorSearchScore"}
                }
            }
        ]))

        initial_chunks = [
            {
                "text": r["text"],
                "metadata": r["metadata"],
                "vector_score": float(r["score"])
            }
            for r in results
        ]

        reranked_chunks = reranker_service.rerank(query, initial_chunks) if rerank else initial_chunks

        return {
            "query": query,
            "query_embedding": query_embedding,
            "top_k": top_k,
            "initial_chunks": initial_chunks,
            "reranked_chunks": reranked_chunks,
            "reranker_used": rerank and reranker_service.model is not None
        }

retriever_service = RetrieverService()
```

### Task 2.2: Wire `/retrieve` route in `app/api/endpoints.py`

- [ ] **Step 1: Modify imports and add route**

Replace the top of `endpoints.py` with:

```python
from fastapi import APIRouter, UploadFile, File
from app.schemas.text_input import TextInput, BatchInput, ChatInput
from app.schemas.retrieve import RetrieveRequest, RetrieveResponse
from app.schemas.evaluate import EvaluateRequest, EvaluateResponse
from app.services.embedding import embedding_service
from app.services.document_processor import document_processor
from app.services.llm_service import llm_service
from app.services.retriever import retriever_service
from app.services.evaluator import evaluator_service
```

Add after the existing routes:

```python
@router.post("/retrieve", response_model=RetrieveResponse)
async def retrieve(input: RetrieveRequest):
    return retriever_service.retrieve(input.query, input.top_k, input.rerank)
```

### Task 2.3: Verify endpoint loads

- [ ] **Step 1: Start embedding service and check `/docs`**

```bash
cd services/embedding-service
source venv/bin/activate
python -m pytest tests/ -x -q 2>/dev/null || true
uvicorn app.main:app --reload --port 8000 &
sleep 3
curl -s http://localhost:8000/docs | grep -o "retrieve" | head -1
```

Expected: `retrieve` appears in the OpenAPI docs.

- [ ] **Step 2: Stop uvicorn**

```bash
pkill -f "uvicorn app.main:app" || true
```

### Task 2.4: Commit

- [ ] **Step 1: Commit the chunk**

```bash
git add services/embedding-service/app/services/retriever.py \
        services/embedding-service/app/api/endpoints.py
git commit -m "feat(observability): add /retrieve endpoint with vector search and reranking"
```

---

## Chunk 3: Backend Evaluator Service

**Complexity:** complex  
**Files:**
- Create: `services/embedding-service/app/services/evaluator.py`

### Task 3.1: Create `app/services/evaluator.py`

- [ ] **Step 1: Write the evaluator service**

```python
import re
import json
from typing import List, Dict, Any
from app.services.llm_service import LLMService

class EvaluatorService:
    def __init__(self):
        pass

    def compute_recall(self, query: str, chunks: List[Dict[str, Any]]) -> float:
        if not chunks or not query.strip():
            return 0.0
        query_terms = set(self._tokenize(query))
        if not query_terms:
            return 0.0
        chunk_text = " ".join(c["text"] for c in chunks)
        chunk_terms = set(self._tokenize(chunk_text))
        overlap = query_terms & chunk_terms
        return len(overlap) / len(query_terms)

    def compute_precision(self, query: str, chunks: List[Dict[str, Any]]) -> float:
        if not chunks:
            return 0.0
        scores = [c.get("rerank_score") or c.get("vector_score", 0.0) for c in chunks]
        return sum(scores) / len(scores)

    async def compute_groundedness(
        self,
        query: str,
        response: str,
        chunks: List[Dict[str, Any]],
        llm: LLMService
    ) -> float:
        context = "\n---\n".join(c["text"] for c in chunks)
        prompt = self._groundedness_prompt(query, response, context)
        raw = await llm.chat([{"role": "user", "content": prompt}])
        return self._parse_ratio(raw)

    async def compute_faithfulness(
        self,
        query: str,
        response: str,
        chunks: List[Dict[str, Any]],
        llm: LLMService
    ) -> float:
        context = "\n---\n".join(c["text"] for c in chunks)
        prompt = self._faithfulness_prompt(query, response, context)
        raw = await llm.chat([{"role": "user", "content": prompt}])
        return self._parse_contradiction(raw)

    async def evaluate(
        self,
        query: str,
        response: str,
        chunks: List[Dict[str, Any]],
        llm: LLMService
    ) -> Dict[str, float]:
        groundedness, faithfulness = await asyncio.gather(
            self.compute_groundedness(query, response, chunks, llm),
            self.compute_faithfulness(query, response, chunks, llm)
        )
        return {
            "recall": self.compute_recall(query, chunks),
            "precision": self.compute_precision(query, chunks),
            "groundedness": groundedness,
            "faithfulness": faithfulness
        }

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r"[a-zA-Z0-9]+", text.lower())

    def _groundedness_prompt(self, query: str, response: str, context: str) -> str:
        return f"""You are a strict evaluator. Given the context and the response, identify each distinct claim in the response and classify it as either "supported" or "unsupported" by the context.

Context:
{context}

Question: {query}
Response: {response}

Return ONLY a JSON object with this exact shape:
{{"supported": <int>, "unsupported": <int>}}
"""

    def _faithfulness_prompt(self, query: str, response: str, context: str) -> str:
        return f"""You are a strict evaluator. Given the context and the response, determine if the response contains any information that contradicts the context.

Context:
{context}

Question: {query}
Response: {response}

Return ONLY a JSON object with this exact shape:
{{"contradiction": true}} or {{"contradiction": false}}
"""

    def _parse_ratio(self, raw: str) -> float:
        try:
            cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
            data = json.loads(cleaned)
            supported = int(data.get("supported", 0))
            unsupported = int(data.get("unsupported", 0))
            total = supported + unsupported
            return supported / total if total > 0 else 0.0
        except Exception:
            match = re.search(r'"supported"\s*:\s*(\d+)', raw)
            supported = int(match.group(1)) if match else 0
            match = re.search(r'"unsupported"\s*:\s*(\d+)', raw)
            unsupported = int(match.group(1)) if match else 0
            total = supported + unsupported
            return supported / total if total > 0 else 0.0

    def _parse_contradiction(self, raw: str) -> float:
        try:
            cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
            data = json.loads(cleaned)
            return 0.0 if data.get("contradiction") else 1.0
        except Exception:
            if '"contradiction"' in raw and 'true' in raw.lower():
                return 0.0
            return 1.0

evaluator_service = EvaluatorService()
```

- [ ] **Step 2: Add missing `asyncio` import at the top**

```python
import asyncio
```

### Task 3.2: Test evaluator in isolation

- [ ] **Step 1: Create a quick smoke test file**

Create `services/embedding-service/tests/test_evaluator_smoke.py`:

```python
import pytest
from app.services.evaluator import evaluator_service

class FakeLLM:
    async def chat(self, messages):
        return '{"supported": 2, "unsupported": 1}'

def test_recall():
    chunks = [{"text": "The refund policy allows 30 days for returns."}]
    score = evaluator_service.compute_recall("refund policy 30 days", chunks)
    assert 0 < score <= 1

def test_precision():
    chunks = [{"text": "x", "rerank_score": 0.9}, {"text": "y", "rerank_score": 0.7}]
    score = evaluator_service.compute_precision("q", chunks)
    assert score == 0.8

@pytest.mark.asyncio
async def test_groundedness():
    chunks = [{"text": "Customers can request a refund within 30 days."}]
    score = await evaluator_service.compute_groundedness("q", "r", chunks, FakeLLM())
    assert score == pytest.approx(2/3, rel=1e-3)
```

- [ ] **Step 2: Run the smoke test**

```bash
cd services/embedding-service
source venv/bin/activate
pytest tests/test_evaluator_smoke.py -v
```

Expected: 3 tests pass.

- [ ] **Step 3: Delete the temporary smoke test file**

```bash
rm services/embedding-service/tests/test_evaluator_smoke.py
```

### Task 3.3: Commit

- [ ] **Step 1: Commit the chunk**

```bash
git add services/embedding-service/app/services/evaluator.py
git commit -m "feat(observability): add evaluator service with recall, precision, groundedness, faithfulness"
```

---

## Chunk 4: Backend `/evaluate` Endpoint

**Complexity:** simple  
**Files:**
- Modify: `services/embedding-service/app/api/endpoints.py`

### Task 4.1: Wire `/evaluate` route

- [ ] **Step 1: Add the route in `endpoints.py`**

Add after `/retrieve`:

```python
@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(input: EvaluateRequest):
    metrics = await evaluator_service.evaluate(
        input.query,
        input.response,
        [chunk.dict() for chunk in input.chunks],
        llm_service
    )
    return EvaluateResponse(**metrics)
```

### Task 4.2: Verify endpoint loads

- [ ] **Step 1: Start embedding service and check `/docs`**

```bash
cd services/embedding-service
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
sleep 3
curl -s http://localhost:8000/docs | grep -oE "retrieve|evaluate" | sort -u
```

Expected: both `evaluate` and `retrieve` appear.

- [ ] **Step 2: Stop uvicorn**

```bash
pkill -f "uvicorn app.main:app" || true
```

### Task 4.3: Commit

- [ ] **Step 1: Commit the chunk**

```bash
git add services/embedding-service/app/api/endpoints.py
git commit -m "feat(observability): add /evaluate endpoint"
```

---

## Chunk 5: Backend Tests

**Complexity:** simple  
**Files:**
- Create: `services/embedding-service/tests/test_retrieve.py`
- Create: `services/embedding-service/tests/test_evaluate.py`

### Task 5.1: Create `tests/test_retrieve.py`

- [ ] **Step 1: Write the test file**

```python
import pytest
from unittest.mock import patch, MagicMock
from app.services.retriever import RetrieverService

@pytest.fixture
def retriever():
    return RetrieverService()

def test_retrieve_without_rerank(retriever):
    mock_collection = MagicMock()
    mock_collection.aggregate.return_value = [
        {"text": "chunk one", "metadata": {"filename": "a.pdf", "pageIndex": 1, "chunkIndex": 0}, "score": 0.9}
    ]
    retriever.db = {"vectors": mock_collection}

    with patch("app.services.retriever.embedding_service") as mock_emb, \
         patch("app.services.retriever.reranker_service") as mock_rerank:
        mock_emb.generate_embedding.return_value = [0.1] * 384
        mock_rerank.rerank.return_value = []
        mock_rerank.model = None

        result = retriever.retrieve("query", top_k=1, rerank=False)

    assert result["query"] == "query"
    assert result["top_k"] == 1
    assert len(result["initial_chunks"]) == 1
    assert result["reranker_used"] is False
```

### Task 5.2: Create `tests/test_evaluate.py`

- [ ] **Step 1: Write the test file**

```python
import pytest
from app.services.evaluator import evaluator_service

class FakeLLM:
    async def chat(self, messages):
        text = messages[0]["content"]
        if "supported" in text:
            return '{"supported": 2, "unsupported": 1}'
        return '{"contradiction": false}'

@pytest.mark.asyncio
async def test_evaluate():
    chunks = [
        {"text": "Refund within 30 days.", "metadata": {"filename": "a.pdf", "pageIndex": 1, "chunkIndex": 0}, "vector_score": 0.9, "rerank_score": 0.95}
    ]
    metrics = await evaluator_service.evaluate("refund policy?", "You can refund in 30 days.", chunks, FakeLLM())
    assert 0 <= metrics["recall"] <= 1
    assert 0 <= metrics["precision"] <= 1
    assert metrics["groundedness"] == pytest.approx(2/3, rel=1e-3)
    assert metrics["faithfulness"] == 1.0
```

### Task 5.3: Run backend tests

- [ ] **Step 1: Run tests**

```bash
cd services/embedding-service
source venv/bin/activate
pytest tests/test_retrieve.py tests/test_evaluate.py -v
```

Expected: all tests pass.

### Task 5.4: Commit

- [ ] **Step 1: Commit the chunk**

```bash
git add services/embedding-service/tests/test_retrieve.py \
        services/embedding-service/tests/test_evaluate.py
git commit -m "test(observability): add tests for /retrieve and /evaluate"
```

---

## Chunk 6: Frontend Types and `/api/chat` Orchestration

**Complexity:** simple  
**Files:**
- Create: `services/nextjs-app/src/lib/observability.ts`
- Modify: `services/nextjs-app/src/app/api/chat/route.ts`
- Modify: `services/nextjs-app/src/lib/rag.ts` (optional helper)

### Task 6.1: Create `src/lib/observability.ts`

- [ ] **Step 1: Write the types**

```typescript
export interface ChunkMetadata {
  filename: string;
  pageIndex: number;
  chunkIndex: number;
}

export interface RetrievedChunk {
  text: string;
  metadata: ChunkMetadata;
  vector_score: number;
  rerank_score?: number;
}

export interface ObservabilityMetrics {
  recall: number;
  precision: number;
  groundedness: number;
  faithfulness: number;
}

export interface ObservabilityTrace {
  query: string;
  query_embedding?: number[];
  top_k: number;
  reranker_used: boolean;
  initial_chunks: RetrievedChunk[];
  reranked_chunks: RetrievedChunk[];
  metrics: ObservabilityMetrics | null;
  retrieval_error?: string;
  evaluation_error?: string;
}

export interface RetrievePayload {
  query: string;
  top_k: number;
  rerank: boolean;
}

export interface EvaluatePayload {
  query: string;
  response: string;
  chunks: RetrievedChunk[];
}
```

### Task 6.2: Modify `src/app/api/chat/route.ts`

- [ ] **Step 1: Replace the route implementation**

```typescript
import { NextResponse } from "next/server";
import { getLLM } from "@/lib/llm";
import type { ObservabilityTrace, RetrievedChunk } from "@/lib/observability";

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || "http://localhost:8000";

async function retrieve(query: string, top_k: number, rerank: boolean): Promise<ObservabilityTrace> {
  const res = await fetch(`${EMBEDDING_SERVICE_URL}/retrieve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k, rerank })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `retrieve failed: ${res.status}`);
  }
  return res.json();
}

async function evaluate(query: string, response: string, chunks: RetrievedChunk[]) {
  const res = await fetch(`${EMBEDDING_SERVICE_URL}/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, response, chunks })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `evaluate failed: ${res.status}`);
  }
  return res.json();
}

export async function POST(req: Request) {
  try {
    const { messages, top_k = 5, rerank = true } = await req.json();
    const lastMessage = messages[messages.length - 1].content;

    let context = "";
    let sources: any[] = [];
    let observability: ObservabilityTrace = {
      query: lastMessage,
      top_k,
      reranker_used: false,
      initial_chunks: [],
      reranked_chunks: [],
      metrics: null
    };

    try {
      const retrieveResult = await retrieve(lastMessage, top_k, rerank);
      observability = retrieveResult;
      const chunks = retrieveResult.reranked_chunks;

      if (chunks.length > 0) {
        context = "\n\nContext from uploaded documents:\n" +
          chunks.map(r => `[From ${r.metadata.filename}, Page ${r.metadata.pageIndex}]: ${r.text}`).join("\n---\n");

        sources = chunks.map(r => ({
          filename: r.metadata.filename,
          pageIndex: r.metadata.pageIndex
        }));
      }
    } catch (vError: any) {
      console.error("Retrieve failed:", vError);
      observability.retrieval_error = vError.message;
    }

    const augmentedMessages = [...messages];
    if (context) {
      augmentedMessages[augmentedMessages.length - 1].content =
        `Use the following context to answer the user question if relevant. If the answer is not in the context, answer based on your general knowledge but mention if you are using general knowledge.\n\nContext: ${context}\n\nQuestion: ${lastMessage}`;
    }

    const llm = getLLM();
    const response = await llm.chat(augmentedMessages);

    try {
      if (observability.reranked_chunks.length > 0) {
        const metrics = await evaluate(lastMessage, response, observability.reranked_chunks);
        observability.metrics = metrics;
      }
    } catch (e: any) {
      console.error("Evaluate failed:", e);
      observability.evaluation_error = e.message;
    }

    return NextResponse.json({ response, sources, observability });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
```

### Task 6.3: Run TypeScript checks

- [ ] **Step 1: Check types**

```bash
cd services/nextjs-app
npx tsc --noEmit
```

Expected: no type errors.

### Task 6.4: Commit

- [ ] **Step 1: Commit the chunk**

```bash
git add services/nextjs-app/src/lib/observability.ts \
        services/nextjs-app/src/app/api/chat/route.ts
git commit -m "feat(observability): add observability types and orchestrate retrieve/evaluate in /api/chat"
```

---

## Chunk 7: Frontend `ObservabilityPanel` Component

**Complexity:** simple  
**Files:**
- Create: `services/nextjs-app/src/components/ObservabilityPanel.tsx`

### Task 7.1: Create the component

- [ ] **Step 1: Write the component**

```typescript
"use client";

import { useState } from "react";
import type { ObservabilityTrace, RetrievedChunk } from "@/lib/observability";

interface Props {
  observability: ObservabilityTrace | null;
  topK: number;
  setTopK: (k: number) => void;
  enableRerank: boolean;
  setEnableRerank: (v: boolean) => void;
  onRunRetrieval?: (query: string) => void;
  isUploading?: boolean;
  onUploadClick?: () => void;
}

function ChunkCard({ chunk, highlight }: { chunk: RetrievedChunk; highlight?: boolean }) {
  return (
    <div className={`card mb-2 ${highlight ? "border-primary" : ""}`}>
      <div className="card-body p-2">
        <p className="card-text small">{chunk.text}</p>
        <div className="d-flex gap-2 small text-muted">
          <span>{chunk.metadata.filename}</span>
          <span>Page {chunk.metadata.pageIndex}</span>
          <span>Vector: {(chunk.vector_score * 100).toFixed(1)}%</span>
          {chunk.rerank_score !== undefined && (
            <span>Rerank: {(chunk.rerank_score * 100).toFixed(1)}%</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ObservabilityPanel({
  observability,
  topK,
  setTopK,
  enableRerank,
  setEnableRerank,
  onRunRetrieval,
  isUploading,
  onUploadClick
}: Props) {
  const [query, setQuery] = useState("");

  return (
    <div className="observability-panel border-top bg-light">
      <div className="container-fluid py-3">
        <div className="row">
          <div className="col-md-4 border-end">
            <h5>Upload & Query</h5>
            <div
              className="upload-box p-3 mb-3 border rounded text-center"
              onClick={onUploadClick}
              style={{ cursor: "pointer" }}
            >
              {isUploading ? "Uploading..." : "Click to upload PDF"}
            </div>

            <div className="mb-3">
              <label className="form-label">Test Query</label>
              <textarea
                className="form-control"
                rows={2}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question..."
              />
            </div>

            <button
              className="btn btn-primary btn-sm w-100 mb-3"
              onClick={() => onRunRetrieval?.(query)}
              disabled={!query.trim()}
            >
              Run Retrieval
            </button>

            <div className="mb-3">
              <label className="form-label">Top-K: {topK}</label>
              <input
                type="range"
                className="form-range"
                min={1}
                max={20}
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value, 10))}
              />
            </div>

            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                checked={enableRerank}
                onChange={(e) => setEnableRerank(e.target.checked)}
                id="rerankToggle"
              />
              <label className="form-check-label" htmlFor="rerankToggle">
                Enable reranking
              </label>
            </div>
          </div>

          <div className="col-md-8">
            {!observability ? (
              <p className="text-muted">Send a message or run a retrieval to see the trace.</p>
            ) : (
              <>
                {observability.retrieval_error && (
                  <div className="alert alert-warning">{observability.retrieval_error}</div>
                )}

                <div className="mb-3">
                  <h6>Top-K Chunks (before rerank)</h6>
                  {observability.initial_chunks.map((chunk, idx) => (
                    <ChunkCard key={`initial-${idx}`} chunk={chunk} />
                  ))}
                </div>

                <div className="mb-3">
                  <h6>Reranked Chunks</h6>
                  {observability.reranked_chunks.map((chunk, idx) => {
                    const initialIdx = observability.initial_chunks.findIndex(
                      c => c.metadata.chunkIndex === chunk.metadata.chunkIndex
                    );
                    const moved = initialIdx !== idx;
                    return <ChunkCard key={`reranked-${idx}`} chunk={chunk} highlight={moved} />;
                  })}
                </div>

                {observability.evaluation_error && (
                  <div className="alert alert-warning">{observability.evaluation_error}</div>
                )}

                {observability.metrics && (
                  <div className="row g-2">
                    {Object.entries(observability.metrics).map(([key, value]) => (
                      <div key={key} className="col-3">
                        <div className="card text-center">
                          <div className="card-body p-2">
                            <div className="text-uppercase small text-muted">{key}</div>
                            <div className="fw-bold">{(value * 100).toFixed(0)}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Task 7.2: Add CSS for the panel (optional)

- [ ] **Step 1: Add minimal styles to `globals.css`**

```css
.observability-panel {
  max-height: 60vh;
  overflow-y: auto;
}

.observability-panel .upload-box:hover {
  background-color: #f8f9fa;
}
```

### Task 7.3: Run lint

- [ ] **Step 1: Lint the new file**

```bash
cd services/nextjs-app
npm run lint -- src/components/ObservabilityPanel.tsx
```

Expected: no errors.

### Task 7.4: Commit

- [ ] **Step 1: Commit the chunk**

```bash
git add services/nextjs-app/src/components/ObservabilityPanel.tsx \
        services/nextjs-app/src/app/globals.css
git commit -m "feat(observability): add ObservabilityPanel component"
```

---

## Chunk 8: Integrate Panel into `ChatBox`

**Complexity:** simple  
**Files:**
- Modify: `services/nextjs-app/src/components/ChatBox.tsx`
- Modify: `services/nextjs-app/src/lib/llm/types.ts` (if Message type needs observability)

### Task 8.1: Update `Message` type

- [ ] **Step 1: Add observability to bot messages**

In `services/nextjs-app/src/lib/llm/types.ts`:

```typescript
import type { ObservabilityTrace } from "@/lib/observability";

export interface Message {
  role: "user" | "bot";
  content: string;
  sources?: { filename: string; pageIndex: number }[];
  observability?: ObservabilityTrace | null;
}
```

### Task 8.2: Modify `ChatBox.tsx`

- [ ] **Step 1: Add imports and state**

Add to imports:

```typescript
import ObservabilityPanel from "./ObservabilityPanel";
import type { ObservabilityTrace } from "@/lib/observability";
import { Activity } from "lucide-react";
```

Add state inside `ChatBox`:

```typescript
const [isObservabilityOpen, setIsObservabilityOpen] = useState(false);
const [observability, setObservability] = useState<ObservabilityTrace | null>(null);
const [topK, setTopK] = useState(5);
const [enableRerank, setEnableRerank] = useState(true);
```

- [ ] **Step 2: Update `sendMessage` to include topK/rerank and capture observability**

Replace the `sendMessage` body:

```typescript
async function sendMessage(messageText?: string) {
  const text = messageText || input;
  if (!text.trim() || isLoading) return;

  const userMessage: Message = { role: "user", content: text.trim() };
  const updatedMessages = [...messages, userMessage];

  setMessages(updatedMessages);
  setInput("");
  setIsLoading(true);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: updatedMessages, top_k: topK, rerank: enableRerank }),
    });

    const data = await res.json();
    const botMessage: Message = {
      role: "bot",
      content: data.response,
      sources: data.sources,
      observability: data.observability
    };
    setMessages((prev) => [...prev, botMessage]);
    setObservability(data.observability ?? null);
  } catch (error) {
    console.error("Failed to send message:", error);
    const errorMessage: Message = {
      role: "bot",
      content: "Something went wrong. Please try again."
    };
    setMessages((prev) => [...prev, errorMessage]);
  } finally {
    setIsLoading(false);
  }
}
```

- [ ] **Step 3: Add toggle button and panel**

Add a toggle button in the top bar near the "New chat" button:

```tsx
<button
  className="new-chat-btn"
  onClick={() => setIsObservabilityOpen(!isObservabilityOpen)}
  title="Toggle observability panel"
  aria-label="Toggle observability panel"
>
  <Activity size={18} />
</button>
```

Add the panel at the bottom of the chat layout:

```tsx
{isObservabilityOpen && (
  <ObservabilityPanel
    observability={observability}
    topK={topK}
    setTopK={setTopK}
    enableRerank={enableRerank}
    setEnableRerank={setEnableRerank}
    onUploadClick={() => fileInputRef.current?.click()}
    isUploading={isUploading}
    onRunRetrieval={(query) => sendMessage(query)}
  />
)}
```

### Task 8.3: Type-check and lint

- [ ] **Step 1: Run TypeScript check**

```bash
cd services/nextjs-app
npx tsc --noEmit
```

- [ ] **Step 2: Run lint**

```bash
cd services/nextjs-app
npm run lint
```

Expected: no errors.

### Task 8.4: Commit

- [ ] **Step 1: Commit the chunk**

```bash
git add services/nextjs-app/src/lib/llm/types.ts \
        services/nextjs-app/src/components/ChatBox.tsx
git commit -m "feat(observability): integrate ObservabilityPanel into ChatBox"
```

---

## Chunk 9: Frontend Tests

**Complexity:** simple  
**Files:**
- Create: `services/nextjs-app/src/components/__tests__/ObservabilityPanel.test.tsx`
- Create: `services/nextjs-app/src/app/api/chat/__tests__/route.test.ts`

### Task 9.1: Create component test

- [ ] **Step 1: Write the test file**

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import ObservabilityPanel from "../ObservabilityPanel";
import type { ObservabilityTrace } from "@/lib/observability";

const mockTrace: ObservabilityTrace = {
  query: "q",
  top_k: 2,
  reranker_used: true,
  initial_chunks: [
    { text: "chunk b", metadata: { filename: "a.pdf", pageIndex: 2, chunkIndex: 1 }, vector_score: 0.8 },
    { text: "chunk a", metadata: { filename: "a.pdf", pageIndex: 1, chunkIndex: 0 }, vector_score: 0.9 }
  ],
  reranked_chunks: [
    { text: "chunk a", metadata: { filename: "a.pdf", pageIndex: 1, chunkIndex: 0 }, vector_score: 0.9, rerank_score: 0.95 },
    { text: "chunk b", metadata: { filename: "a.pdf", pageIndex: 2, chunkIndex: 1 }, vector_score: 0.8, rerank_score: 0.85 }
  ],
  metrics: { recall: 0.5, precision: 0.9, groundedness: 0.8, faithfulness: 1.0 }
};

describe("ObservabilityPanel", () => {
  it("renders chunks and metrics", () => {
    render(
      <ObservabilityPanel
        observability={mockTrace}
        topK={2}
        setTopK={() => {}}
        enableRerank={true}
        setEnableRerank={() => {}}
      />
    );

    expect(screen.getByText("chunk a")).toBeInTheDocument();
    expect(screen.getByText("chunk b")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("calls onRunRetrieval with query", () => {
    const onRun = jest.fn();
    render(
      <ObservabilityPanel
        observability={null}
        topK={5}
        setTopK={() => {}}
        enableRerank={true}
        setEnableRerank={() => {}}
        onRunRetrieval={onRun}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), {
      target: { value: "test query" }
    });
    fireEvent.click(screen.getByText("Run Retrieval"));
    expect(onRun).toHaveBeenCalledWith("test query");
  });
});
```

> **Note:** If `@testing-library/jest-dom` is not installed, add it as a dev dependency and configure Jest.

### Task 9.2: Create API route test

- [ ] **Step 1: Write the test file**

```typescript
import { POST } from "../route";

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock("@/lib/llm", () => ({
  getLLM: () => ({
    chat: jest.fn().mockResolvedValue("Generated response")
  })
}));

describe("/api/chat", () => {
  it("returns response, sources, and observability", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: "hello",
          top_k: 2,
          reranker_used: true,
          initial_chunks: [],
          reranked_chunks: [
            { text: "x", metadata: { filename: "a.pdf", pageIndex: 1, chunkIndex: 0 }, vector_score: 0.9, rerank_score: 0.95 }
          ],
          metrics: null
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recall: 1, precision: 1, groundedness: 1, faithfulness: 1 })
      });

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.response).toBe("Generated response");
    expect(data.observability.reranked_chunks).toHaveLength(1);
    expect(data.observability.metrics).toEqual({ recall: 1, precision: 1, groundedness: 1, faithfulness: 1 });
  });
});
```

### Task 9.3: Run frontend tests

- [ ] **Step 1: Run tests**

```bash
cd services/nextjs-app
npm test -- --watchAll=false
```

Expected: tests pass.

### Task 9.4: Commit

- [ ] **Step 1: Commit the chunk**

```bash
git add services/nextjs-app/src/components/__tests__/ObservabilityPanel.test.tsx \
        services/nextjs-app/src/app/api/chat/__tests__/route.test.ts
git commit -m "test(observability): add frontend tests for panel and chat route"
```

---

## Self-Review

1. **Spec coverage:** Every section of the design spec maps to at least one task.
2. **Placeholder scan:** No TBD/TODO placeholders remain; every code block contains concrete code.
3. **Type consistency:** `ObservabilityTrace`, `RetrievedChunk`, and request/response shapes match between backend schemas and frontend types.
4. **Test coverage:** Backend has tests for `/retrieve` and `/evaluate`; frontend has component and route tests.
5. **Chunk size:** Each chunk is 1–3 files and independently buildable.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-27-rag-observability-plan.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per chunk, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach would you like?