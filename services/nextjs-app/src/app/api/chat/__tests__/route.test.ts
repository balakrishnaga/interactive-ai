import { POST } from "../route";
import { REFUSAL_MESSAGE, RESPONSE_REFUSAL_MESSAGE } from "@/lib/llm/prompts";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockChat = jest.fn().mockResolvedValue("Generated response");

jest.mock("@/lib/llm", () => ({
  getLLM: () => ({
    chat: mockChat
  })
}));

describe("/api/chat", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockChat.mockClear();
  });

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
        json: async () => ({ allowed: true })
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
    expect(mockChat).toHaveBeenCalledTimes(1);

    const promptArg = (mockChat.mock.calls[0][0] as Array<{ content: string }>).slice(-1)[0].content;
    expect(promptArg).toContain("hello");
    expect(promptArg).toContain("x");
    expect(promptArg).toContain("a.pdf");
    expect(promptArg).toContain("Page 1");
  });

  it("substitutes user question with empty context when no chunks are retrieved", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        query: "anything",
        top_k: 2,
        reranker_used: true,
        initial_chunks: [],
        reranked_chunks: [],
        metrics: null
      })
    });

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "anything" }] })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.response).toBe("Generated response");
    expect(data.sources).toEqual([]);
    expect(mockChat).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const promptArg = (mockChat.mock.calls[0][0] as Array<{ content: string }>).slice(-1)[0].content;
    expect(promptArg).toContain("anything");
    expect(promptArg).toMatch(/<context>\s*<\/context>/);
    expect(promptArg).not.toContain("{RETRIEVED_CHUNKS}");
    expect(promptArg).not.toContain("{USER_QUESTION}");
  });

  it("returns REFUSAL_MESSAGE when retrieval fails and does not call the LLM", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: "embedding service unavailable" })
    });

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.response).toBe(REFUSAL_MESSAGE);
    expect(data.sources).toEqual([]);
    expect(data.observability.retrieval_error).toBe("embedding service unavailable");
    expect(data.observability.query).toBe("hello");
    expect(mockChat).not.toHaveBeenCalled();
    // Only the failed retrieve call should have been made; no evaluate call either.
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("replaces hallucinated response with RESPONSE_REFUSAL_MESSAGE and clears sources", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: "hallucination",
          top_k: 2,
          reranker_used: true,
          initial_chunks: [],
          reranked_chunks: [
            { text: "fact A", metadata: { filename: "a.pdf", pageIndex: 1, chunkIndex: 0 }, vector_score: 0.9, rerank_score: 0.95 }
          ],
          metrics: null
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ allowed: false, reason: "Hallucinated" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recall: 0, precision: 0, groundedness: 0, faithfulness: 0 })
      });

    mockChat.mockResolvedValue("I am making things up!");

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hallucination" }] })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.response).toBe(RESPONSE_REFUSAL_MESSAGE);
    expect(data.sources).toEqual([]);
    expect(data.observability.reranked_chunks).toHaveLength(1);
    expect(data.observability.guardrails).toEqual({ allowed: false, reason: "Hallucinated" });
    expect(mockChat).toHaveBeenCalledTimes(1);
  });

  it("allows grounded response to pass the response guardrail", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          query: "grounded",
          top_k: 2,
          reranker_used: true,
          initial_chunks: [],
          reranked_chunks: [
            { text: "fact B", metadata: { filename: "b.pdf", pageIndex: 1, chunkIndex: 0 }, vector_score: 0.9, rerank_score: 0.95 }
          ],
          metrics: null
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ allowed: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recall: 1, precision: 1, groundedness: 1, faithfulness: 1 })
      });

    mockChat.mockResolvedValue("This is based on fact B.");

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "grounded" }] })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.response).toBe("This is based on fact B.");
    expect(data.sources).toHaveLength(1);
    expect(data.sources[0].filename).toBe("b.pdf");
    expect(data.observability.guardrails).toEqual({ allowed: true });
  });

  it("returns REFUSAL_MESSAGE when retrieve throws a network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.response).toBe(REFUSAL_MESSAGE);
    expect(data.sources).toEqual([]);
    expect(data.observability.retrieval_error).toBe("ECONNREFUSED");
    expect(mockChat).not.toHaveBeenCalled();
  });
});
