# Interactive AI

A full-stack **AI chatbot platform** with **Retrieval-Augmented Generation (RAG)** — upload PDF documents, ask questions about their content, and get contextually accurate answers powered by vector search and multiple LLM providers.

## Architecture

```
interactive-ai/
├── services/
│   ├── nextjs-app/          # Frontend + API routes (Next.js 16, React 19, TypeScript)
│   └── embedding-service/   # Embedding & PDF processing (FastAPI, LangChain, SentenceTransformers)
├── infra/
│   └── docker-compose.yml   # Orchestrates both services
└── README.md
```

### Data Flow

```
User uploads PDF
     │
     ▼
Next.js /api/upload  ──►  Embedding Service /process-pdf
                              ├─ LangChain PyPDFLoader (parse)
                              ├─ RecursiveCharacterTextSplitter (chunk)
                              └─ SentenceTransformer bge-small-en-v1.5 (embed)
     ◄────────────────────────┘
     ▼
MongoDB Atlas (vectors collection)

User asks a question
     │
     ▼
Generate query embedding  ──►  MongoDB Atlas $vectorSearch (Top-K chunks)
     │
     ▼
Augment prompt with context  ──►  LLM Provider (OpenAI / Groq / HuggingFace)
     │
     ▼
Response with source citations
```

## Key Features

- **RAG Pipeline** — PDF upload → chunk → embed → MongoDB Atlas Vector Search → context-augmented LLM responses
- **Multi-Provider LLM** — Switch between OpenAI, Groq, and Hugging Face via environment config (strategy pattern)
- **Document Management** — Upload, list, and delete indexed PDFs from the chat UI
- **Rich Markdown Rendering** — Syntax-highlighted code blocks, tables, lists, blockquotes with copy-to-clipboard
- **Modern Chat UI** — Animations (Framer Motion), settings panel, thinking indicators, smart suggestions
- **Dockerized Deployment** — One-command startup with Docker Compose

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Bootstrap 5, Framer Motion |
| **Backend** | FastAPI, Python 3.10, LangChain |
| **Embeddings** | SentenceTransformers (`BAAI/bge-small-en-v1.5`) |
| **Database** | MongoDB Atlas (Vector Search) |
| **LLM Providers** | OpenAI, Groq, Hugging Face Inference API |
| **Infrastructure** | Docker, Docker Compose |

## Quick Start

### Prerequisites

- Node.js ≥ 20, Python ≥ 3.10
- MongoDB Atlas cluster with a [Vector Search index](#vector-search-setup)
- API key(s) for at least one LLM provider

### 1. Clone & Configure

```bash
git clone https://github.com/<your-username>/interactive-ai.git
cd interactive-ai
```

Create **`services/nextjs-app/.env`**:

```env
NEXT_PUBLIC_LLM_PROVIDER=groq          # openai | groq | huggingface

OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
HF_API_KEY=your_huggingface_key

OPENAI_MODEL=gpt-3.5-turbo
GROQ_MODEL=llama-3.3-70b-versatile
HF_MODEL=mistralai/Mistral-7B-Instruct-v0.2

MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=Cluster0
MONGODB_DB=interactive-ai

EMBEDDING_SERVICE_URL=http://localhost:8000
```

Create **`services/embedding-service/.env`**:

```env
HF_API_KEY=your_huggingface_key
HF_MODEL=meta-llama/Llama-3.1-8B-Instruct
HF_EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
```

### 2. Run Locally

**Embedding Service:**

```bash
cd services/embedding-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Next.js App** (separate terminal):

```bash
cd services/nextjs-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. Run with Docker Compose

```bash
cd infra
docker compose up --build
```

- **Next.js App** → `http://localhost:3000`
- **Embedding Service** → internal port `8000`

## Vector Search Setup

Create a **Vector Search Index** on your MongoDB Atlas cluster:

1. Navigate to **Atlas Search** → **Create Search Index**.
2. Select database `interactive-ai`, collection `vectors`.
3. Use this index definition:

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

> The `384` dimensions correspond to the `BAAI/bge-small-en-v1.5` embedding model.

## API Reference

### Next.js API Routes

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Send messages, returns LLM response with optional RAG context |
| `POST` | `/api/upload` | Upload a PDF for processing and indexing |
| `GET` | `/api/documents` | List all indexed document filenames |
| `POST` | `/api/documents/delete` | Delete a document's vectors |
| `POST` | `/api/documents/clear` | Clear all vectors |

### Embedding Service Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/embed` | Generate embedding for a single text |
| `POST` | `/embed-batch` | Generate embeddings for multiple texts |
| `POST` | `/process-pdf` | Parse PDF → chunk → embed |
| `POST` | `/chat` | Chat completion via HuggingFace LLM |

## Services

| Service | README | Description |
|---|---|---|
| **nextjs-app** | [services/nextjs-app/README.md](services/nextjs-app/README.md) | Frontend chat UI + Next.js API routes |
| **embedding-service** | — | FastAPI backend for embeddings & PDF processing |

## License

This project is licensed under the MIT License.
