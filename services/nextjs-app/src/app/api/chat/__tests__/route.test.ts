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
