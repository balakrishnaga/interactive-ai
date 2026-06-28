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

    // Each chunk appears in both `initial_chunks` and `reranked_chunks`,
    // so the same text shows up twice on the page.
    expect(screen.getAllByText("chunk a").length).toBeGreaterThan(0);
    expect(screen.getAllByText("chunk b").length).toBeGreaterThan(0);
    expect(screen.getByText("90%")).toBeInTheDocument();
  });
});
