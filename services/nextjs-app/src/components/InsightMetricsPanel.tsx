"use client";

import React from 'react';
import type { ObservabilityTrace } from '@/lib/observability';
import styles from '@/app/insight_engine/insight_engine.module.css';

interface Props {
  observability: ObservabilityTrace | null;
}

const TARGET_METRICS = [
  { key: "context_precision", label: "Context Precision" },
  { key: "context_recall", label: "Context Recall" },
  { key: "context_relevancy", label: "Context Relevancy" },
  { key: "answer_relevancy", label: "Answer Relevancy" },
];

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
  
  const precision = metrics.context_precision;
  const recall = metrics.context_recall;
  
  let f1Value = 0;
  if (precision !== undefined && recall !== undefined) {
    if (precision + recall > 0) {
      f1Value = (2 * precision * recall) / (precision + recall);
    }
  }

  const displayMetrics = [
    ...TARGET_METRICS.map(m => ({
      label: m.label,
      value: metrics[m.key] !== undefined ? (metrics[m.key] * 100).toFixed(0) + '%' : '0%'
    })),
    {
      label: "F1 Score",
      value: (f1Value * 100).toFixed(0) + '%'
    }
  ];

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Evaluation Metrics</h3>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.metricsGrid}>
          {displayMetrics.map((metric, index) => (
            <div key={index} className={styles.metricCard}>
              <div className={styles.metricLabel}>{metric.label}</div>
              <div className={styles.metricValue}>{metric.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
