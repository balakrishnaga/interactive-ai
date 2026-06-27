"use client";

import { useState } from "react";
import type { ObservabilityTrace, RetrievedChunk } from "@/lib/observability";

interface Props {
  observability: ObservabilityTrace | null;
  topK: number;
  setTopK: (k: number) => void;
  enableRerank: boolean;
  setEnableRerank: (v: boolean) => void;
  onRunRetrieval?: (query: string) => void;
  isUploading?: boolean;
  onUploadClick?: () => void;
}

function ChunkCard({ chunk, highlight }: { chunk: RetrievedChunk; highlight?: boolean }) {
  return (
    <div className={`card mb-2 ${highlight ? "border-primary" : ""}`}>
      <div className="card-body p-2">
        <p className="card-text small">{chunk.text}</p>
        <div className="d-flex gap-2 small text-muted">
          <span>{chunk.metadata.filename}</span>
          <span>Page {chunk.metadata.pageIndex}</span>
          <span>Vector: {(chunk.vector_score * 100).toFixed(1)}%</span>
          {chunk.rerank_score !== undefined && (
            <span>Rerank: {(chunk.rerank_score * 100).toFixed(1)}%</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ObservabilityPanel({
  observability,
  topK,
  setTopK,
  enableRerank,
  setEnableRerank,
  onRunRetrieval,
  isUploading,
  onUploadClick
}: Props) {
  const [query, setQuery] = useState("");

  return (
    <div className="observability-panel border-top bg-light">
      <div className="container-fluid py-3">
        <div className="row">
          <div className="col-md-4 border-end">
            <h5>Upload & Query</h5>
            <div
              className="upload-box p-3 mb-3 border rounded text-center"
              onClick={onUploadClick}
              style={{ cursor: onUploadClick ? "pointer" : "default" }}
              aria-disabled={!onUploadClick}
            >
              {isUploading ? "Uploading..." : "Click to upload PDF"}
            </div>

            <div className="mb-3">
              <label className="form-label">Test Query</label>
              <textarea
                className="form-control"
                rows={2}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question..."
              />
            </div>

            <button
              className="btn btn-primary btn-sm w-100 mb-3"
              onClick={() => onRunRetrieval?.(query.trim())}
              disabled={!query.trim()}
            >
              Run Retrieval
            </button>

            <div className="mb-3">
              <label className="form-label">Top-K: {topK}</label>
              <input
                type="range"
                className="form-range"
                min={1}
                max={20}
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value, 10))}
              />
            </div>

            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                checked={enableRerank}
                onChange={(e) => setEnableRerank(e.target.checked)}
                id="rerankToggle"
              />
              <label className="form-check-label" htmlFor="rerankToggle">
                Enable reranking
              </label>
            </div>
          </div>

          <div className="col-md-8">
            {!observability ? (
              <p className="text-muted">Send a message or run a retrieval to see the trace.</p>
            ) : (
              <>
                {observability.retrieval_error && (
                  <div className="alert alert-warning">{observability.retrieval_error}</div>
                )}

                <div className="mb-3">
                  <h6>Top-K Chunks (before rerank)</h6>
                  {observability.initial_chunks.length === 0 ? (
                    <p className="text-muted small mb-0">No chunks retrieved.</p>
                  ) : (
                    observability.initial_chunks.map((chunk, idx) => (
                      <ChunkCard key={`initial-${idx}`} chunk={chunk} />
                    ))
                  )}
                </div>

                <div className="mb-3">
                  <h6>Reranked Chunks</h6>
                  {observability.reranked_chunks.length === 0 ? (
                    <p className="text-muted small mb-0">No chunks retrieved.</p>
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
                  <div className="alert alert-warning">{observability.evaluation_error}</div>
                )}

                {observability.metrics && (
                  <div className="row g-2">
                    {Object.entries(observability.metrics).map(([key, value]) => (
                      <div key={key} className="col-3">
                        <div className="card text-center">
                          <div className="card-body p-2">
                            <div className="text-uppercase small text-muted">{key}</div>
                            <div className="fw-bold">{(value * 100).toFixed(0)}%</div>
                          </div>
                        </div>
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
