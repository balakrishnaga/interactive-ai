"use client";

import { motion } from "framer-motion";
import {
  Bot,
  FileText,
  Lightbulb,
  MessageSquare,
  Quote,
  Sparkles,
  User,
  X,
} from "lucide-react";
import styles from "@/app/enterprise_search/enterprise_search.module.css";

const USER_QUESTION =
  "Compare the impact of interest rates and GDP in financial markets.";

const PARAGRAPH_ONE =
  "Macroeconomic factors including interest rates and GDP growth significantly influence financial markets. From 2018 to 2023, fluctuations in interest rates and GDP growth are correlated with the performance of financial markets. Interest rates have shown a variable trend, while GDP growth has been relatively steady, indicating the intricate relationship between these macroeconomic elements and market performance.";

const PARAGRAPH_TWO =
  "In 2020, the price of oil decreased significantly, while the prices of gold and wheat increased. The S&P 500 index also experienced a decline.";

const CITATION_ONE = "Financial Market Analysis Report 2023-7.png";
const CITATION_TWO_A = "Financial Market Analysis Report 2023-5.png";
const CITATION_TWO_B = "Financial Market Analysis Report 2023-3.png";

const SOURCE_JSON = `{
  "citation_id": 1,
  "file": "Financial Market Analysis Report 2023-7.png",
  "page_number": 7,
  "chunk_id": "0:0:0:0:2",
  "embedding_model": "text-embedding-ada-002"
}, {
  "citation_id": 2,
  "file": "Financial Market Analysis Report 2023-5.png",
  "page_number": 5,
  "chunk_id": "0:0:1:0:1",
  "embedding_model": "text-embedding-ada-002"
}, {
  "citation_id": 3,
  "file": "Financial Market Analysis Report 2023-3.png",
  "page_number": 3,
  "chunk_id": "0:0:2:0:0",
  "embedding_model": "text-embedding-ada-002"
}`;

interface CommoditySeries {
  label: string;
  color: string;
  // Normalised bar heights for years 2014..2022 (0..1).
  values: number[];
}

const YEARS: number[] = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022];

const COMMODITIES: CommoditySeries[] = [
  {
    label: "Oil",
    color: "#0078D4",
    values: [0.85, 0.55, 0.5, 0.6, 0.75, 0.65, 0.35, 0.7, 0.9],
  },
  {
    label: "Gold",
    color: "#FFB900",
    values: [0.55, 0.5, 0.6, 0.6, 0.55, 0.65, 0.8, 0.7, 0.75],
  },
  {
    label: "Wheat",
    color: "#E81123",
    values: [0.45, 0.4, 0.4, 0.45, 0.55, 0.5, 0.7, 0.85, 0.95],
  },
];

function CommodityChart() {
  const width = 520;
  const height = 220;
  const padding = { top: 20, right: 16, bottom: 36, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const groupWidth = chartW / YEARS.length;
  const barWidth = (groupWidth - 10) / COMMODITIES.length;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>Commodity Market Fluctuations</h3>
      <svg
        className={styles.chartSvg}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Bar chart comparing Oil, Gold and Wheat prices from 2014 to 2022"
      >
        {/* Y grid lines */}
        {yTicks.map((t) => {
          const y = padding.top + chartH - t * chartH;
          return (
            <g key={t}>
              <line
                x1={padding.left}
                x2={padding.left + chartW}
                y1={y}
                y2={y}
                stroke="#edebe9"
                strokeWidth={1}
              />
              <text
                x={padding.left - 6}
                y={y + 4}
                fontSize={10}
                fill="#605e5c"
                textAnchor="end"
              >
                {Math.round(t * 100)}
              </text>
            </g>
          );
        })}

        {/* X axis */}
        <line
          x1={padding.left}
          x2={padding.left + chartW}
          y1={padding.top + chartH}
          y2={padding.top + chartH}
          stroke="#a19f9d"
          strokeWidth={1}
        />

        {/* Bars + X labels */}
        {YEARS.map((year, i) => {
          const groupX = padding.left + i * groupWidth + 5;
          return (
            <g key={year}>
              {COMMODITIES.map((series, j) => {
                const value = series.values[i] ?? 0;
                const barH = value * chartH;
                const x = groupX + j * barWidth;
                const y = padding.top + chartH - barH;
                return (
                  <motion.rect
                    key={`${year}-${series.label}`}
                    x={x}
                    y={padding.top + chartH}
                    width={barWidth - 2}
                    height={0}
                    fill={series.color}
                    initial={{ height: 0, y: padding.top + chartH }}
                    animate={{ height: barH, y }}
                    transition={{
                      duration: 0.5,
                      delay: i * 0.04 + j * 0.02,
                      ease: "easeOut",
                    }}
                    rx={2}
                  />
                );
              })}
              <text
                x={groupX + (COMMODITIES.length * barWidth) / 2 - 1}
                y={padding.top + chartH + 16}
                fontSize={10}
                fill="#605e5c"
                textAnchor="middle"
              >
                {year}
              </text>
            </g>
          );
        })}

        {/* Y axis label */}
        <text
          x={10}
          y={padding.top + chartH / 2}
          fontSize={10}
          fill="#605e5c"
          transform={`rotate(-90 10 ${padding.top + chartH / 2})`}
          textAnchor="middle"
        >
          Index
        </text>
      </svg>
      <div className={styles.chartLegend}>
        {COMMODITIES.map((c) => (
          <span key={c.label} className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: c.color }}
              aria-hidden="true"
            />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function EnterpriseChatPanel() {
  return (
    <section className={styles.card} aria-labelledby="chat-panel-title">
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle} id="chat-panel-title">
          <MessageSquare size={16} />
          Chat
        </h2>
      </div>

      <div className={styles.chatTabs} role="tablist">
        <button
          type="button"
          className={`${styles.chatTab} ${styles.chatTabActive}`}
          role="tab"
          aria-selected="true"
        >
          <Sparkles size={14} />
          Ask a question
        </button>
      </div>

      <div className={styles.chatBody}>
        {/* User question */}
        <div className={styles.userMessage}>
          <div className={styles.userAvatar} aria-hidden="true">
            <User size={14} />
          </div>
          <p className={styles.userText}>{USER_QUESTION}</p>
        </div>

        {/* Bot answer */}
        <div className={styles.botMessage}>
          <div className={styles.botAvatar} aria-hidden="true">
            <Bot size={16} />
          </div>
          <div className={styles.botContent}>
            <div className={styles.botHeader}>Assistant</div>

            {/* Thought process */}
            <div className={styles.thoughtBlock}>
              <div className={styles.thoughtTitle}>
                <Lightbulb size={12} style={{ display: "inline", marginRight: 4 }} />
                Thought process
              </div>
              <div className={styles.thoughtMeta}>
                <span className={styles.thoughtKey}>Search Query</span>
                <span>&quot;2020 events and happenings&quot;</span>
                <span className={styles.thoughtKey}>Model ID</span>
                <span>gpt-4v</span>
                <span className={styles.thoughtKey}>semanticCaptions</span>
                <span>false</span>
              </div>
            </div>

            {/* Supporting content */}
            <div className={styles.supportingBlock}>
              <div className={styles.supportingSection}>
                <div className={styles.supportingLabel}>
                  <FileText size={12} />
                  Supporting content
                </div>
                <p className={styles.supportingText}>{PARAGRAPH_ONE}</p>
                <div className={styles.supportingSection}>
                  <div className={styles.supportingLabel}>
                    <Quote size={12} />
                    Citation
                  </div>
                  <span className={styles.citation}>{CITATION_ONE}</span>
                </div>

                <div className={styles.excludeCategory}>
                  <X size={12} />
                  Exclude category: What happened in 2020
                </div>

                <p className={styles.supportingText}>{PARAGRAPH_TWO}</p>
                <div className={styles.supportingSection}>
                  <div className={styles.supportingLabel}>
                    <Quote size={12} />
                    Citations
                  </div>
                  <span className={styles.citation}>1. {CITATION_TWO_A}</span>
                  <span className={styles.citation}>2. {CITATION_TWO_B}</span>
                </div>
              </div>
            </div>

            {/* JSON source block */}
            <div className={styles.supportingSection}>
              <div className={styles.supportingLabel}>Source</div>
              <pre className={styles.jsonBlock}>{SOURCE_JSON}</pre>
            </div>

            {/* Bar chart */}
            <CommodityChart />
          </div>
        </div>
      </div>
    </section>
  );
}
