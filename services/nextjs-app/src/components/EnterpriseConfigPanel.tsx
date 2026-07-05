"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import styles from "@/app/enterprise_search/enterprise_search.module.css";

const DEFAULT_PROMPT = `You are an intelligent assistant for Contoso Ltd company annual reports.
Use the sources to answer the question as accurately as possible.
If you cannot answer using the sources, say so.
When you do answer, include the source citations as markdown links using the file names.
Provide answers in the language of the question.
Where possible, structure answers as HTML tables using the column names: Year, Revenue, Profit.
If the question is not related to the annual reports, politely inform the user that you can only answer questions related to Contoso Ltd annual reports.`;

type VisionInput = "images_and_text" | "text_only" | "images_only";
type RetrievalMode = "vectors" | "text" | "hybrid";

export default function EnterpriseConfigPanel() {
  const [prompt, setPrompt] = useState<string>(DEFAULT_PROMPT);

  const [useSemanticRanker, setUseSemanticRanker] = useState<boolean>(true);
  const [useQueryContextualSummaries, setUseQueryContextualSummaries] =
    useState<boolean>(false);
  const [suggestFollowUps, setSuggestFollowUps] = useState<boolean>(true);
  const [useGpt4Vision, setUseGpt4Vision] = useState<boolean>(true);
  const [streamChat, setStreamChat] = useState<boolean>(true);

  const [visionInput, setVisionInput] = useState<VisionInput>("images_and_text");
  const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>("hybrid");

  const [textVector, setTextVector] = useState<boolean>(false);
  const [imageVector, setImageVector] = useState<boolean>(false);
  const [textAndImageVector, setTextAndImageVector] = useState<boolean>(true);

  return (
    <section
      className={`${styles.card} border-0`}
      aria-labelledby="config-panel-title"
    >
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle} id="config-panel-title">
          <Settings2 size={16} />
          Configure answer generation
        </h2>
      </div>

      <div className={styles.configBody}>
        {/* Override prompt template */}
        <div className={styles.configSection}>
          <label className={styles.configLabel} htmlFor="prompt-template">
            Override prompt template
          </label>
          <textarea
            id="prompt-template"
            className={styles.promptTextarea}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            spellCheck={false}
          />
        </div>

        {/* Retrieval toggles */}
        <div className={styles.configSection}>
          <span className={styles.configLabel}>Retrieval options</span>

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={useSemanticRanker}
              onChange={(e) => setUseSemanticRanker(e.target.checked)}
            />
            <span className={styles.checkText}>
              <span>Use semantic ranker for retrieval</span>
            </span>
          </label>

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={useQueryContextualSummaries}
              onChange={(e) => setUseQueryContextualSummaries(e.target.checked)}
            />
            <span className={styles.checkText}>
              <span>Use query-contextual summaries instead of whole documents</span>
            </span>
          </label>

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={suggestFollowUps}
              onChange={(e) => setSuggestFollowUps(e.target.checked)}
            />
            <span className={styles.checkText}>
              <span>Suggest follow-up questions</span>
            </span>
          </label>
        </div>

        {/* GPT-4 Turbo with Vision */}
        <div className={styles.configSection}>
          <span className={styles.configLabel}>Model</span>

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={useGpt4Vision}
              onChange={(e) => setUseGpt4Vision(e.target.checked)}
            />
            <span className={styles.checkText}>
              <span>Use GPT-4 Turbo with Vision</span>
            </span>
          </label>

          <div className={styles.subGroup}>
            <span className={styles.configLabel} style={{ fontSize: "0.6875rem" }}>
              GPT-4 Turbo with Vision Inputs
            </span>

            <label className={styles.radioRow}>
              <input
                type="radio"
                name="vision-input"
                value="images_and_text"
                checked={visionInput === "images_and_text"}
                onChange={() => setVisionInput("images_and_text")}
                disabled={!useGpt4Vision}
              />
              <span className={styles.radioText}>Images and text from index</span>
            </label>

            <label className={styles.radioRow}>
              <input
                type="radio"
                name="vision-input"
                value="text_only"
                checked={visionInput === "text_only"}
                onChange={() => setVisionInput("text_only")}
                disabled={!useGpt4Vision}
              />
              <span className={styles.radioText}>Text from index</span>
            </label>

            <label className={styles.radioRow}>
              <input
                type="radio"
                name="vision-input"
                value="images_only"
                checked={visionInput === "images_only"}
                onChange={() => setVisionInput("images_only")}
                disabled={!useGpt4Vision}
              />
              <span className={styles.radioText}>Images from index</span>
            </label>
          </div>
        </div>

        {/* Retrieval mode */}
        <div className={styles.configSection}>
          <span className={styles.configLabel}>Retrieval mode</span>

          <label className={styles.radioRow}>
            <input
              type="radio"
              name="retrieval-mode"
              value="vectors"
              checked={retrievalMode === "vectors"}
              onChange={() => setRetrievalMode("vectors")}
            />
            <span className={styles.radioText}>Vectors</span>
          </label>

          <label className={styles.radioRow}>
            <input
              type="radio"
              name="retrieval-mode"
              value="text"
              checked={retrievalMode === "text"}
              onChange={() => setRetrievalMode("text")}
            />
            <span className={styles.radioText}>Text</span>
          </label>

          <label className={styles.radioRow}>
            <input
              type="radio"
              name="retrieval-mode"
              value="hybrid"
              checked={retrievalMode === "hybrid"}
              onChange={() => setRetrievalMode("hybrid")}
            />
            <span className={styles.radioText}>Vectors + Text (Hybrid)</span>
          </label>

          <div className={styles.subGroup}>
            <span className={styles.configLabel} style={{ fontSize: "0.6875rem" }}>
              Vector Fields
            </span>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={textVector}
                onChange={(e) => setTextVector(e.target.checked)}
              />
              <span className={styles.checkText}>Text Embeddings</span>
            </label>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={imageVector}
                onChange={(e) => setImageVector(e.target.checked)}
              />
              <span className={styles.checkText}>Image Embeddings</span>
            </label>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={textAndImageVector}
                onChange={(e) => setTextAndImageVector(e.target.checked)}
              />
              <span className={styles.checkText}>Text and Image embeddings</span>
            </label>
          </div>
        </div>

        {/* Stream */}
        <div className={styles.configSection}>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={streamChat}
              onChange={(e) => setStreamChat(e.target.checked)}
            />
            <span className={styles.checkText}>
              <span>Stream chat completion responses</span>
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}
