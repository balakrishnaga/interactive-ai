import { NextResponse } from "next/server";
import { getLLM } from "@/lib/llm";
import { REFUSAL_MESSAGE, RESPONSE_REFUSAL_MESSAGE, DOCUMENT_SYSTEM_PROMPT } from "@/lib/llm/prompts";
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

async function checkResponseGuardrails(query: string, response: string, chunks: RetrievedChunk[]) {
  const res = await fetch(`${EMBEDDING_SERVICE_URL}/guardrails/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, response, chunks })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `checkResponseGuardrails failed: ${res.status}`);
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
      const guardrails = retrieveResult.guardrails;

      if (guardrails?.allowed === false) {
        return NextResponse.json({
          response: REFUSAL_MESSAGE,
          sources: [],
          observability: { ...observability, guardrails_blocked_reason: guardrails?.reason ?? null }
        });
      }

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
      return NextResponse.json({
        response: REFUSAL_MESSAGE,
        sources: [],
        observability
      });
    }

    const augmentedMessages = messages.map((m: Message) => ({ ...m }));
    if (context) {
      augmentedMessages[augmentedMessages.length - 1].content =
        `${DOCUMENT_SYSTEM_PROMPT}\n\nUse the following context to answer the user question if relevant. If the answer is not in the context, strictly say "I couldn't find information about that in the uploaded documents" and don't answer using general knowledge.\n\nContext: ${context}\n\nQuestion: ${lastMessage}`;
    }

    const llm = getLLM();
    const llmResponse = await llm.chat(augmentedMessages);
    let responseText = typeof llmResponse === "string" ? llmResponse : llmResponse.content;

    // Lightweight output guardrail
    const refusalPhrases = ["i don't know", "not in the context", "no information", "i have no information"];
    const isRefusal = !responseText || responseText.trim().length === 0 || 
                      refusalPhrases.some(phrase => responseText.toLowerCase().includes(phrase));
    
    if (isRefusal) {
      responseText = RESPONSE_REFUSAL_MESSAGE;
    }

    try {
      if (observability.reranked_chunks.length > 0) {
        // Response Guardrail
        const guardrailResult = await checkResponseGuardrails(lastMessage, responseText, observability.reranked_chunks);
        if (guardrailResult.allowed === false) {
          responseText = RESPONSE_REFUSAL_MESSAGE;
          sources = [];
        }

        const metrics = await evaluate(lastMessage, responseText, observability.reranked_chunks);
        observability.metrics = metrics;
      }
    } catch (e) {
      console.error("Response evaluation failed:", e);
      observability.evaluation_error = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json({ response: responseText, sources, observability });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
