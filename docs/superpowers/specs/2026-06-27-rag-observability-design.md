# RAG Observability Debug Panel — Design Spec

**Goal:** Add an expandable debug panel inside the existing chat UI that lets users upload a document, run a query, and inspect the full retrieval trace: top-k retrieved chunks, cross-encoder reranking, and automatic evaluation metrics (recall, precision, groundedness, faithfulness). All retrieval, reranking, and metric computation lives in the embedding service.

**Architecture:** Backend-centric. The embedding service exposes two new endpoints (`/retrieve` and `/evaluate`) that own vector search, reranking, and metric computation. Next.js `/api/chat` orchestrates these calls, augments the LLM prompt with reranked chunks, and returns the response plus an `observability` payload to the frontend. The frontend renders this payload in a new `ObservabilityPanel` component.

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Bootstrap 5 (frontend); FastAPI / Python 3.10 / SentenceTransformers / LangChain / MongoDB Atlas (backend).

---

## 1. Data Flow

```
User asks question
        │
        ▼
Next.js /api/chat
        │
        ├──► Embedding Service /retrieve  (query → top-k chunks → reranked chunks)
        │
        ├──► LLM Provider (augmented prompt with reranked chunks) → response
        │
        └──► Embedding Service /evaluate  (query + response + chunks → metrics)
        │
        ▼
Frontend ChatBox receives { response, sources, observability }
        │
        ▼
ObservabilityPanel renders upload/query controls + retrieval trace + metrics
```

## 2. Backend API Additions

### 2.1 `POST /retrieve`

**Purpose:** Run vector search and optional cross-encoder reranking for a query.

**Request body:**

```json
{
  "query": "What is the refund policy?",
  "top_k": 5,
  "rerank": true
}
```

**Response body:**

```json
{
  "query": "What is the refund policy?",
  "query_embedding": [0.12, -0.05, ...],
  "top_k": 5,
  "initial_chunks": [
    {
      "text": "Customers may request a refund within 30 days...",
      "metadata": { "filename": "policy.pdf", "pageIndex": 4, "chunkIndex": 7 },
      "vector_score": 0.91
    }
  ],
  "reranked_chunks": [
    {
      "text": "Customers may request a refund within 30 days...",
      "metadata": { "filename": "policy.pdf", "pageIndex": 4, "chunkIndex": 7 },
      "vector_score": 0.91,
      "rerank_score": 0.96
    }
  ],
  "reranker_used": true
}
```

**Behavior:**
- Generate query embedding using the existing `BAAI/bge-small-en-v1.5` model.
- Run MongoDB Atlas `$vectorSearch` with `numCandidates=100` and `limit=top_k`.
- If `rerank=true`, run each initial chunk through a cross-encoder reranker (`BAAI/bge-reranker-base`) and return results sorted by `rerank_score`.
- If `rerank=false`, `reranked_chunks` is identical to `initial_chunks` and `rerank_score` is omitted.

### 2.2 `POST /evaluate`

**Purpose:** Compute observability metrics for a query/response/chunks triple.

**Request body:**

```json
{
  "query": "What is the refund policy?",
  "response": "Customers can request a refund within 30 days of purchase.",
  "chunks": [
    { "text": "...", "metadata": { ... }, "rerank_score": 0.96 }
  ]
}
```

> **Note:** `chunks` must be the **reranked chunks** returned by `/retrieve` (or the initial chunks if reranking is disabled).

**Response body:**

```json
{
  "recall": 0.78,
  "precision": 0.84,
  "groundedness": 0.91,
  "faithfulness": 0.88
}
```

**Metric definitions (no ground truth):**

| Metric | Definition | Implementation |
|---|---|---|
| **Recall** | Fraction of query concepts covered by the union of retrieved chunks. | Token/lemma overlap between query and concatenated chunks, normalized by query length. Range `[0, 1]`. |
| **Precision** | Average semantic relevance of retrieved chunks to the query. | Average of reranker scores if reranking enabled; otherwise average of normalized vector scores. Range `[0, 1]`. |
| **Groundedness** | Fraction of response claims that are supported by the retrieved chunks. | LLM judge prompt asks to classify each claim as `supported` or `unsupported`. Score = supported / total claims. Range `[0, 1]`. |
| **Faithfulness** | Degree to which the response is consistent with retrieved chunks (no contradictions). | LLM judge prompt asks if response contradicts chunks. Score = 1 if no contradiction, 0 if contradiction, 0.5 if partial. Range `[0, 1]`. |

**LLM judge:** Use the existing `llm_service` in the embedding service (HuggingFace endpoint). Keep prompts deterministic (`temperature=0.1`) and parse JSON outputs with fallback regex.

## 3. Backend Service Changes

### 3.1 New Files

- `services/embedding-service/app/services/reranker.py` — Cross-encoder reranker wrapper.
- `services/embedding-service/app/services/evaluator.py` — Metrics computation (recall, precision, groundedness, faithfulness).
- `services/embedding-service/app/schemas/retrieve.py` — Pydantic models for `/retrieve` request/response.
- `services/embedding-service/app/schemas/evaluate.py` — Pydantic models for `/evaluate` request/response.

### 3.2 Modified Files

- `services/embedding-service/app/api/endpoints.py` — Add `/retrieve` and `/evaluate` routes.
- `services/embedding-service/app/services/embedding.py` — Ensure embeddings are returned as `list[float]`.
- `services/embedding-service/requirements.txt` — Add `sentence-transformers` (already present) and verify cross-encoder support.

### 3.3 `reranker.py`

```python
from sentence_transformers import CrossEncoder

class RerankerService:
    def __init__(self, model_name: str = "BAAI/bge-reranker-base"):
        self.model = CrossEncoder(model_name)

    def rerank(self, query: str, chunks: list[dict]) -> list[dict]:
        pairs = [(query, chunk["text"]) for chunk in chunks]
        scores = self.model.predict(pairs, batch_size=8)
        scored = [
            {**chunk, "rerank_score": float(score)}
            for chunk, score in zip(chunks, scores)
        ]
        return sorted(scored, key=lambda x: x["rerank_score"], reverse=True)
```

### 3.4 `evaluator.py`

Responsibilities:
- `compute_recall(query, chunks) -> float`
- `compute_precision(query, chunks) -> float`
- `compute_groundedness(query, response, chunks, llm_service) -> float`
- `compute_faithfulness(query, response, chunks, llm_service) -> float`

All functions must be pure (no side effects) and return floats in `[0, 1]`.

## 4. Frontend Additions

### 4.1 New Files

- `services/nextjs-app/src/components/ObservabilityPanel.tsx` — Expandable split-panel debug UI.
- `services/nextjs-app/src/lib/observability.ts` — TypeScript types for observability payload.
- `services/nextjs-app/src/app/api/chat/route.ts` — Modified to call `/retrieve` and `/evaluate` and include observability in response.

### 4.2 Modified Files

- `services/nextjs-app/src/components/ChatBox.tsx` — Add toggle button for panel, pass observability data to panel.
- `services/nextjs-app/src/lib/rag.ts` — Add optional `top_k` and `rerank` parameters to `vectorSearch` (or replace with call to `/retrieve`).

### 4.3 `ObservabilityPanel.tsx`

State managed by `ChatBox`:
- `isObservabilityOpen: boolean`
- `observability: ObservabilityTrace | null`
- `topK: number` (default 5)
- `enableRerank: boolean` (default true)

Panel UI:
- **Left side:**
  - Document upload dropzone (reuse existing upload flow).
  - Test query input + "Run Retrieval" button.
  - Top-K slider (1–20).
  - Rerank toggle.
- **Right side:**
  - "Initial Top-K Chunks" section: cards with text preview, filename, page, vector score.
  - "Reranked Chunks" section: cards with rerank score, highlighted if order changed.
  - "Metrics" section: four cards/badges showing recall, precision, groundedness, faithfulness.

### 4.4 Types (`lib/observability.ts`)

```typescript
export interface RetrievedChunk {
  text: string;
  metadata: { filename: string; pageIndex: number; chunkIndex: number };
  vector_score: number;
  rerank_score?: number;
}

export interface ObservabilityTrace {
  query: string;
  query_embedding?: number[];
  top_k: number;
  reranker_used: boolean;
  initial_chunks: RetrievedChunk[];
  reranked_chunks: RetrievedChunk[];
  metrics: {
    recall: number;
    precision: number;
    groundedness: number;
    faithfulness: number;
  } | null;
  retrieval_error?: string;
  evaluation_error?: string;
}
```

### 4.5 `/api/chat` Response Shape

```typescript
{
  response: string;
  sources: { filename: string; pageIndex: number }[];
  observability: ObservabilityTrace;
}
```

## 5. LLM Prompt Strategy

`/api/chat` will augment the final user message with `reranked_chunks` (not initial chunks). Sources displayed to the user still come from the reranked chunks.

If retrieval fails (e.g., no index), the chat continues without RAG context, and observability fields are empty/zeroed with an error note.

## 6. Error Handling

- `/retrieve` failures return 500 with a clear message; `/api/chat` falls back to non-RAG response and includes `observability.error`.
- `/evaluate` failures return 500; `/api/chat` still returns the response but with metrics set to `null` and `observability.evaluation_error`.
- Cross-encoder model load failures should not crash the service; the reranker logs a warning and returns unreranked results.

## 7. Performance Considerations

- Cross-encoder reranking is CPU/GPU-bound. Keep batch size small (8) and top-k ≤ 10 by default.
- `/evaluate` makes 2 LLM calls per query. Consider caching or making this asynchronous if latency becomes an issue. For the first version, keep it synchronous.
- `/api/chat` will make 3 sequential calls: `/retrieve`, LLM, `/evaluate`. Document expected latency increase (~1–3 seconds depending on LLM provider).

## 8. Testing Strategy

### 8.1 Backend Tests

- `test_retrieve.py` — Mock embedding model and MongoDB aggregation; verify response shape and reranking order.
- `test_evaluator.py` — Test recall/precision with known inputs; mock LLM judge for groundedness/faithfulness.
- `test_evaluate_endpoint.py` — Integration test for `/evaluate` endpoint.

### 8.2 Frontend Tests

- `ObservabilityPanel.test.tsx` — Render panel with mock trace; verify chunks and metrics display.
- `route.chat.test.ts` — Mock embedding service calls; verify response includes observability payload.

### 8.3 Manual QA

- Upload a PDF, ask a question, open debug panel, verify:
  - Initial chunks and reranked chunks are visible.
  - Rerank toggle changes results.
  - Top-K slider changes the number of chunks.
  - Metrics are populated after response completes.

## 9. Open Questions / Decisions

1. **Cross-encoder model choice:** Default to `BAAI/bge-reranker-base` because it is small, permissive, and pairs well with the existing `bge-small-en-v1.5` embedding model.
2. **Metrics without ground truth:** Recall and precision use proxy scores, not true relevance labels. Document this limitation in the UI.
3. **LLM judge model:** Use the existing HuggingFace endpoint in the embedding service for deterministic evaluation.

## 10. Out of Scope

- Persistent logging of observability traces to a database.
- Time-series dashboards or historical comparison.
- User-provided ground-truth answers for supervised metrics.
- A/B testing of reranker models.

---

**Next Step:** Convert this design spec into a task-level implementation plan.