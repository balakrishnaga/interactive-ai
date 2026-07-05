import { NextResponse } from "next/server";
import { getLLM } from "@/lib/llm";
import type { Message } from "@/lib/llm/types";
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
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const lastMessageObj = body.messages?.[body.messages.length - 1];
    if (
      !Array.isArray(body.messages) ||
      body.messages.length === 0 ||
      typeof lastMessageObj?.content !== "string" ||
      lastMessageObj.role !== "user"
    ) {
      return NextResponse.json({ error: "Invalid messages array" }, { status: 400 });
    }
    const messages = body.messages;
    const top_k =
      typeof body.top_k === "number" && body.top_k >= 1 && body.top_k <= 100 ? body.top_k : 5;
    const rerank = typeof body.rerank === "boolean" ? body.rerank : true;
    const lastMessage = messages[messages.length - 1].content;

    let context = "";
    let sources: Array<{ filename: string; pageIndex: number }> = [];
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
    } catch (vError) {
      console.error("Retrieve failed:", vError);
      observability.retrieval_error = vError instanceof Error ? vError.message : String(vError);
    }

    const augmentedMessages = messages.map((m: Message) => ({ ...m }));
    if (context) {
      augmentedMessages[augmentedMessages.length - 1].content =
        `Use the following context to answer the user question if relevant. If the answer is not in the context, strictly say answer is not found in the context dont answer using general knowledge.\n\nContext: ${context}\n\nQuestion: ${lastMessage}`;
    }

    const llm = getLLM();
    const llmResponse = await llm.chat(augmentedMessages);
    const responseText = typeof llmResponse === "string" ? llmResponse : llmResponse.content;

    try {
      if (observability.reranked_chunks.length > 0) {
        const metrics = await evaluate(lastMessage, responseText, observability.reranked_chunks);
        observability.metrics = metrics;
      }
    } catch (e) {
      console.error("Evaluate failed:", e);
      observability.evaluation_error = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json({ response: responseText, sources, observability });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
