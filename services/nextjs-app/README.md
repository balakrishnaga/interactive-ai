# Interactive AI

A full-stack AI chatbot platform with **Retrieval-Augmented Generation (RAG)** capabilities. Upload PDF documents, ask questions about their content, and get contextually accurate answers powered by vector search and multiple LLM providers.

Built with a microservices architecture — a **Next.js** frontend and a **FastAPI** embedding/document-processing backend — connected via Docker Compose.

## Features

- **RAG Pipeline** — Upload PDFs, automatically chunk and embed them, store in MongoDB Atlas, and retrieve relevant context via vector search to augment LLM responses.
- **Multi-Provider LLM Support** — Switch between **OpenAI**, **Groq**, and **Hugging Face** inference APIs using a strategy pattern.
- **PDF Document Management** — Upload, list, and delete indexed documents directly from the chat interface.
- **Rich Markdown Rendering** — Bot responses render full Markdown including syntax-highlighted code blocks, tables, blockquotes, and lists with a one-click copy button.
- **Modern Chat UI** — Responsive design with animations (Framer Motion), a settings panel, thinking indicators, new chat, and smart suggestions.
- **Dockerized Deployment** — Both services ship with Dockerfiles and a shared `docker-compose.yml` for one-command startup.

## Architecture

```
interactive-ai/
├── services/
│   ├── nextjs-app/          # Frontend + API routes (Next.js 16)
│   └── embedding-service/   # Embedding & PDF processing (FastAPI)
├── infra/
│   └── docker-compose.yml   # Orchestrates both services
└── .gitignore
```

### Data Flow

```
User uploads PDF
     │
     ▼
Next.js /api/upload  ──►  Embedding Service /process-pdf
                              │
                              ├─ LangChain PyPDFLoader (parse)
                              ├─ RecursiveCharacterTextSplitter (chunk)
                              └─ SentenceTransformer BAAI/bge-small-en-v1.5 (embed)
                              │
     ◄────────────────────────┘
     │
     ▼
MongoDB Atlas (vectors collection)

User asks a question
     │
     ▼
Next.js /api/chat  ──►  Generate query embedding via Embedding Service
     │
     ▼
MongoDB Atlas $vectorSearch  ──►  Top-K relevant chunks
     │
     ▼
Augment prompt with context  ──►  LLM Provider (OpenAI / Groq / HuggingFace)
     │
     ▼
Streamed response with source citations
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Bootstrap 5, Vanilla CSS, Framer Motion |
| **Backend** | FastAPI, Python 3.10, LangChain |
| **Embeddings** | SentenceTransformers (`BAAI/bge-small-en-v1.5`) |
| **Database** | MongoDB Atlas (Vector Search) |
| **LLM Providers** | OpenAI, Groq, Hugging Face Inference API |
| **Infrastructure** | Docker, Docker Compose |

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **Python** ≥ 3.10
- **MongoDB Atlas** cluster with a Vector Search index (see [Vector Search Setup](#vector-search-setup))
- API keys for at least one LLM provider

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/interactive-ai.git
cd interactive-ai
```

### 2. Configure the Next.js App

Create `services/nextjs-app/.env`:

```env
# ── LLM Provider ──────────────────────────
NEXT_PUBLIC_LLM_PROVIDER=groq          # openai | groq | huggingface

# ── API Keys ──────────────────────────────
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
HF_API_KEY=your_huggingface_key

# ── Models ────────────────────────────────
OPENAI_MODEL=gpt-3.5-turbo
GROQ_MODEL=llama-3.3-70b-versatile
HF_MODEL=mistralai/Mistral-7B-Instruct-v0.2

# ── MongoDB ───────────────────────────────
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=Cluster0
MONGODB_DB=interactive-ai

# ── Embedding Service ────────────────────
EMBEDDING_SERVICE_URL=http://localhost:8000
```

### 3. Configure the Embedding Service

Create `services/embedding-service/.env`:

```env
HF_API_KEY=your_huggingface_key
HF_MODEL=meta-llama/Llama-3.1-8B-Instruct
HF_EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
```

### 4. Run Locally (Development)

**Embedding Service:**

```bash
cd services/embedding-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Next.js App** (in a separate terminal):

```bash
cd services/nextjs-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run with Docker Compose

```bash
cd infra
docker compose up --build
```

This starts both services:
- **Next.js App** → `http://localhost:3000`
- **Embedding Service** → internal port `8000`

## Vector Search Setup

To enable RAG, create a **Vector Search Index** on your MongoDB Atlas cluster:

1. Go to your Atlas cluster → **Atlas Search** → **Create Search Index**.
2. Select the database (e.g., `interactive-ai`) and collection `vectors`.
3. Use the following index definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 384,
      "similarity": "cosine"
    }
  ]
}
```

4. Name the index **`vector_index`**.

> **Note:** The embedding dimension `384` corresponds to the `BAAI/bge-small-en-v1.5` model.

## Project Structure

### Next.js App (`services/nextjs-app/`)

| Path | Description |
|---|---|
| `src/components/ChatBox.tsx` | Main chat UI — message input, PDF upload, document list |
| `src/components/MessageContent.tsx` | Markdown renderer with syntax highlighting |
| `src/components/SettingsPanel.tsx` | Model & temperature settings slide-over |
| `src/components/ThinkingIndicator.tsx` | Typing/thinking animation |
| `src/components/ErrorBoundary.tsx` | React error boundary |
| `src/app/api/chat/route.ts` | Chat endpoint — vector search → augment → LLM |
| `src/app/api/upload/route.ts` | PDF upload → remote processing → MongoDB storage |
| `src/app/api/documents/route.ts` | List indexed documents |
| `src/app/api/documents/delete/` | Delete a document by filename |
| `src/app/api/documents/clear/` | Clear all vectors |
| `src/lib/llm/` | Strategy pattern for LLM providers (OpenAI, Groq, HuggingFace) |
| `src/lib/rag.ts` | RAG utilities — embeddings, vector search, chunk storage |
| `src/lib/db.ts` | MongoDB client singleton |

### Embedding Service (`services/embedding-service/`)

| Path | Description |
|---|---|
| `app/main.py` | FastAPI app entry point + health check |
| `app/api/endpoints.py` | API routes: `/embed`, `/embed-batch`, `/process-pdf`, `/chat` |
| `app/services/embedding.py` | SentenceTransformer embedding generation |
| `app/services/document_processor.py` | LangChain PDF loading + recursive text splitting |
| `app/services/llm_service.py` | HuggingFace LLM chat via LangChain |
| `app/schemas/text_input.py` | Pydantic request models |

## API Reference

### Next.js API Routes

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Send chat messages, returns LLM response with optional RAG context |
| `POST` | `/api/upload` | Upload a PDF file for processing and indexing |
| `GET` | `/api/documents` | List all indexed document filenames |
| `POST` | `/api/documents/delete` | Delete a specific document's vectors |
| `POST` | `/api/documents/clear` | Clear all vectors from the collection |

### Embedding Service Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/embed` | Generate embedding for a single text |
| `POST` | `/embed-batch` | Generate embeddings for multiple texts |
| `POST` | `/process-pdf` | Parse PDF, chunk text, generate embeddings |
| `POST` | `/chat` | Chat completion via HuggingFace LLM |

## License

This project is licensed under the MIT License.
