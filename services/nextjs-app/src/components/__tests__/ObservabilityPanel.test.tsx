import { render, screen } from "@testing-library/react";
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
  metrics: {
    context_recall: 0.5,
    context_precision: 0.9,
    context_relevancy: 0.8,
    hit_rate: 1.0,
    faithfulness: 1.0,
    groundedness: 0.85,
    answer_relevancy: 0.9,
    contextual_relevancy: 0.8
  }
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

    // Each chunk appears in both `initial_chunks` and `reranked_chunks`,
    // so the same text shows up twice on the page.
    expect(screen.getAllByText("chunk a").length).toBeGreaterThan(0);
    expect(screen.getAllByText("chunk b").length).toBeGreaterThan(0);
    // 0.9 * 100 -> 90% (context_precision / contextual_relevancy share value).
    expect(screen.getAllByText("90%").length).toBeGreaterThan(0);
    // 0.5 * 100 -> 50% (context_recall).
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders metrics grouped into the three RAG sections", () => {
    render(
      <ObservabilityPanel
        observability={mockTrace}
        topK={2}
        setTopK={() => {}}
        enableRerank={true}
        setEnableRerank={() => {}}
      />
    );

    expect(screen.getByText("Retriever Metrics")).toBeInTheDocument();
    expect(screen.getByText("Generator Metrics")).toBeInTheDocument();
    expect(screen.getByText("End-to-End Metrics")).toBeInTheDocument();
  });

  it("hides sections that have no matching metric keys", () => {
    const partialTrace: ObservabilityTrace = {
      ...mockTrace,
      metrics: { faithfulness: 1.0 }
    };
    render(
      <ObservabilityPanel
        observability={partialTrace}
        topK={2}
        setTopK={() => {}}
        enableRerank={true}
        setEnableRerank={() => {}}
      />
    );

    expect(screen.queryByText("Retriever Metrics")).not.toBeInTheDocument();
    expect(screen.queryByText("Generator Metrics")).not.toBeInTheDocument();
    expect(screen.getByText("End-to-End Metrics")).toBeInTheDocument();
  });
});
