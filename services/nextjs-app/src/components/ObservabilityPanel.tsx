"use client";

import type { ObservabilityTrace, RetrievedChunk } from "@/lib/observability";

interface Props {
  observability: ObservabilityTrace | null;
  topK: number;
  setTopK: (k: number) => void;
  enableRerank: boolean;
  setEnableRerank: (v: boolean) => void;
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
                  <div className="observability-metric-grid">
                    {Object.entries(observability.metrics).map(([key, value]) => (
                      <div key={key} className="observability-card observability-metric">
                        <div className="observability-metric-label">{key}</div>
                        <div className="observability-metric-value">{(value * 100).toFixed(0)}%</div>
                      </div>
                    ))}
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
