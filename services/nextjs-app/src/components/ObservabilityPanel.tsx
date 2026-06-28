"use client";

import type { ObservabilityTrace, RetrievedChunk } from "@/lib/observability";

interface Props {
  observability: ObservabilityTrace | null;
  topK: number;
  setTopK: (k: number) => void;
  enableRerank: boolean;
  setEnableRerank: (v: boolean) => void;
}

interface MetricSection {
  id: string;
  title: string;
  subtitle: string;
  keys: string[];
}

const METRIC_SECTIONS: MetricSection[] = [
  {
    id: "retriever",
    title: "Retriever Metrics",
    subtitle: "Where & What",
    keys: ["context_precision", "context_recall", "context_relevancy", "hit_rate", "mrr", "ndcg"]
  },
  {
    id: "generator",
    title: "Generator Metrics",
    subtitle: "How",
    keys: ["answer_relevancy", "answer_correctness", "bleu", "rouge", "bertscore"]
  },
  {
    id: "end_to_end",
    title: "End-to-End Metrics",
    subtitle: "RAG Triad",
    keys: ["faithfulness", "contextual_relevancy", "answer_relevancy"]
  }
];

const METRIC_LABELS: Record<string, string> = {
  context_precision: "Context Precision",
  context_recall: "Context Recall",
  context_relevancy: "Context Relevancy",
  hit_rate: "Hit Rate",
  mrr: "MRR",
  ndcg: "NDCG",
  answer_relevancy: "Answer Relevancy",
  answer_correctness: "Answer Correctness",
  bleu: "BLEU",
  rouge: "ROUGE",
  bertscore: "BERTScore",
  faithfulness: "Faithfulness",
  contextual_relevancy: "Contextual Relevancy",
  groundedness: "Groundedness"
};

function labelFor(key: string): string {
  return METRIC_LABELS[key] ?? key;
}

function ChunkCard({ chunk, highlight }: { chunk: RetrievedChunk; highlight?: boolean }) {
  return (
    <div className={`observability-card ${highlight ? "highlight" : ""}`}>
      <p className="observability-card-text">{chunk.text}</p>
      <div className="observability-card-meta">
        <span>{chunk.metadata.filename}</span>
        <span>Page {chunk.metadata.pageIndex}</span>
        <span>Vector: {(chunk.vector_score * 100).toFixed(1)}%</span>
        {chunk.rerank_score !== undefined && (
          <span>Rerank: {(chunk.rerank_score * 100).toFixed(1)}%</span>
        )}
      </div>
    </div>
  );
}

export default function ObservabilityPanel({
  observability,
  topK,
  setTopK,
  enableRerank,
  setEnableRerank
}: Props) {
  return (
    <div className="observability-panel">
      <div className="observability-container">
        <div className="observability-grid">
          <div className="observability-sidebar">
            <div className="observability-section-title">Retrieval Settings</div>

            <div>
              <label className="observability-label">Top-K: {topK}</label>
              <input
                type="range"
                className="observability-range"
                min={1}
                max={20}
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value, 10))}
              />
            </div>

            <label className="observability-check">
              <input
                type="checkbox"
                checked={enableRerank}
                onChange={(e) => setEnableRerank(e.target.checked)}
              />
              Enable reranking
            </label>
          </div>

          <div className="observability-content">
            {!observability ? (
              <p className="observability-empty">Send a message or run a retrieval to see the trace.</p>
            ) : (
              <>
                {observability.retrieval_error && (
                  <div className="observability-alert">{observability.retrieval_error}</div>
                )}

                <div>
                  <div className="observability-section-title">Top-K Chunks (before rerank)</div>
                  {observability.initial_chunks.length === 0 ? (
                    <p className="observability-empty">No chunks retrieved.</p>
                  ) : (
                    observability.initial_chunks.map((chunk, idx) => (
                      <ChunkCard key={`initial-${idx}`} chunk={chunk} />
                    ))
                  )}
                </div>

                <div>
                  <div className="observability-section-title">Reranked Chunks</div>
                  {observability.reranked_chunks.length === 0 ? (
                    <p className="observability-empty">No chunks retrieved.</p>
                  ) : (
                    observability.reranked_chunks.map((chunk, idx) => {
                      const initialIdx = observability.initial_chunks.findIndex(
                        c => c.metadata.chunkIndex === chunk.metadata.chunkIndex
                      );
                      const moved = initialIdx !== idx;
                      return <ChunkCard key={`reranked-${idx}`} chunk={chunk} highlight={moved} />;
                    })
                  )}
                </div>

                {observability.evaluation_error && (
                  <div className="observability-alert">{observability.evaluation_error}</div>
                )}

                {observability.metrics && (
                  <div className="observability-metrics-container">
                    {METRIC_SECTIONS.map((section) => {
                      const entries = section.keys
                        .filter((key) => observability.metrics && key in observability.metrics)
                        .map((key) => [key, observability.metrics![key]] as [string, number]);
                      if (entries.length === 0) {
                        return null;
                      }
                      return (
                        <div key={section.id} className="observability-metric-section">
                          <div className="observability-metric-section-header">
                            <div className="observability-metric-section-title">{section.title}</div>
                            <div className="observability-metric-section-subtitle">{section.subtitle}</div>
                          </div>
                          <div className="observability-metric-grid">
                            {entries.map(([key, value]) => (
                              <div key={key} className="observability-card observability-metric">
                                <div className="observability-metric-label">{labelFor(key)}</div>
                                <div className="observability-metric-value">{(value * 100).toFixed(0)}%</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
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
