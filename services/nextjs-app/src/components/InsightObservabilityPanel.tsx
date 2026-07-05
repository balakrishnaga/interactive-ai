"use client";

import React from 'react';
import type { ObservabilityTrace, RetrievedChunk } from '@/lib/observability';
import styles from '@/app/insight_engine/insight_engine.module.css';

interface Props {
  observability: ObservabilityTrace | null;
  topK: number;
  setTopK: (k: number) => void;
  enableRerank: boolean;
  setEnableRerank: (v: boolean) => void;
}

function ChunkItem({ chunk, highlight }: { chunk: RetrievedChunk; highlight?: boolean }) {
  return (
    <div 
      className={styles.chunkCard} 
      style={{ 
        marginBottom: '8px', 
        borderLeft: highlight ? '4px solid #0078d4' : '1px solid #edebe9',
        backgroundColor: highlight ? '#f0f7ff' : undefined 
      }}
    >
      <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>{chunk.text}</div>
      <div style={{ fontSize: '0.7rem', color: '#605e5c', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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

export default function InsightObservabilityPanel({
  observability,
  topK,
  setTopK,
  enableRerank,
  setEnableRerank,
}: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>
          Observability
        </h3>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          style={{ color: '#605e5c', cursor: 'pointer' }}
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 18.82 1.65 1.65 0 0 0 7.82 17 1.65 1.65 0 0 0 7.51 15.5V15a1.65 1.65 0 0 0-1.51-1.18 1.65 1.65 0 0 0-1.18 1.51V17a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 2 13.18 1.65 1.65 0 0 0 3.18 12 1.65 1.65 0 0 0 4.51 10.5V10a1.65 1.65 0 0 0 1.18-1.51 1.65 1.65 0 0 0 1.51 1.18V12" />
        </svg>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.configSection} style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className={styles.configLabel} style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Top-K: {topK}
              </label>
              <input
                type="range"
                min={1}
                max={20}
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value, 10))}
                style={{ width: '100%' }}
              />
            </div>
            <div className={styles.checkRow} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
              <input
                type="checkbox"
                id="rerank-toggle"
                checked={enableRerank}
                onChange={(e) => setEnableRerank(e.target.checked)}
              />
              <label htmlFor="rerank-toggle">Enable reranking</label>
            </div>
          </div>
        </div>

        {!observability ? (
          <div style={{ textAlign: 'center', color: '#605e5c', fontSize: '0.85rem', padding: '20px' }}>
            No observability trace available.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {observability.retrieval_error && (
              <div style={{ padding: '8px', backgroundColor: '#fff4ce', border: '1px solid #f2c94c', borderRadius: '4px', fontSize: '0.8rem', color: '#323130' }}>
                {observability.retrieval_error}
              </div>
            )}

            <div>
              <div className={styles.cardSubtitle}>Top-K Chunks (before rerank)</div>
              {observability.initial_chunks.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#605e5c' }}>No chunks retrieved.</div>
              ) : (
                observability.initial_chunks.map((chunk, idx) => (
                  <ChunkItem key={`initial-${idx}`} chunk={chunk} />
                ))
              )}
            </div>

            <div>
              <div className={styles.cardSubtitle}>Reranked Chunks</div>
              {observability.reranked_chunks.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#605e5c' }}>No chunks retrieved.</div>
              ) : (
                observability.reranked_chunks.map((chunk, idx) => {
                  const initialIdx = observability.initial_chunks.findIndex(
                    c => c.metadata.chunkIndex === chunk.metadata.chunkIndex
                  );
                  const moved = initialIdx !== idx;
                  return <ChunkItem key={`reranked-${idx}`} chunk={chunk} highlight={moved} />;
                })
              )}
            </div>

            {observability.evaluation_error && (
              <div style={{ padding: '8px', backgroundColor: '#fff4ce', border: '1px solid #f2c94c', borderRadius: '4px', fontSize: '0.8rem', color: '#323130' }}>
                {observability.evaluation_error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
