"use client";

import React from 'react';
import type { ObservabilityTrace } from '@/lib/observability';
import styles from '@/app/insight_engine/insight_engine.module.css';

interface Props {
  observability: ObservabilityTrace | null;
}

const METRIC_SECTIONS = [
  {
    id: "retriever",
    title: "Retriever Metrics",
    keys: ["context_precision", "context_recall", "context_relevancy", "hit_rate", "mrr", "ndcg"]
  },
  {
    id: "generator",
    title: "Generator Metrics",
    keys: ["answer_relevancy", "answer_correctness", "bleu", "rouge", "bertscore"]
  },
  {
    id: "end_to_end",
    title: "End-to-End Metrics",
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
};

export default function InsightMetricsPanel({ observability }: Props) {
  if (!observability || !observability.metrics) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Evaluation Metrics</h3>
        </div>
        <div className={styles.cardBody}>
          <div style={{ textAlign: 'center', color: '#605e5c', fontSize: '0.85rem', padding: '20px' }}>
            No metrics available.
          </div>
        </div>
      </div>
    );
  }

  const metrics = observability.metrics;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Evaluation Metrics</h3>
      </div>
      <div className={styles.cardBody}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {METRIC_SECTIONS.map((section) => {
            const sectionMetrics = section.keys.filter(key => key in metrics);
            
            if (sectionMetrics.length === 0) return null;

            return (
              <div key={section.id}>
                <div className={styles.cardSubtitle}>{section.title}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', marginTop: '8px' }}>
                  {sectionMetrics.map(key => (
                    <div key={key} className={styles.metricCard}>
                      <div className={styles.metricLabel}>{METRIC_LABELS[key] || key}</div>
                      <div className={styles.metricValue}>
                        {(metrics[key] * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
