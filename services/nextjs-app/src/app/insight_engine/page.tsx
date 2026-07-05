"use client";

import React, { useState } from 'react';
import { Sparkles, RefreshCw, Plus } from 'lucide-react';
import styles from './insight_engine.module.css';
import InsightChatPanel from '@/components/InsightChatPanel';
import InsightObservabilityPanel from '@/components/InsightObservabilityPanel';
import InsightMetricsPanel from '@/components/InsightMetricsPanel';
import { ObservabilityTrace } from '@/lib/observability';

export default function InsightEnginePage() {
  const [topK, setTopK] = useState(5);
  const [enableRerank, setEnableRerank] = useState(true);
  const [observability, setObservability] = useState<ObservabilityTrace | null>(null);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.headerTitle}>
            <Sparkles size={20} />
            Insight Engine
          </h1>
          <span className={styles.headerBadge}>RAG</span>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.headerBtn} onClick={() => window.location.reload()}>
            <RefreshCw size={14} />
            Refresh
          </button>
          <button className={styles.headerBtn} onClick={() => window.location.reload()}>
            <Plus size={14} />
            New chat
          </button>
        </div>
      </header>

      <main className={styles.body}>
        <div className={styles.grid}>
          {/* Left Column: Chat Panel */}
          <InsightChatPanel
            topK={topK}
            enableRerank={enableRerank}
            onObservabilityChange={setObservability}
          />

          {/* Right Column: Observability & Metrics */}
          <div className={styles.rightColumn}>
            <InsightObservabilityPanel
              observability={observability}
              topK={topK}
              setTopK={setTopK}
              enableRerank={enableRerank}
              setEnableRerank={setEnableRerank}
            />
            <InsightMetricsPanel
              observability={observability}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
