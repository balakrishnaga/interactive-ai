import EnterpriseChatPanel from "@/components/EnterpriseChatPanel";
import EnterpriseConfigPanel from "@/components/EnterpriseConfigPanel";
import { Database, RefreshCw } from "lucide-react";
import styles from "./enterprise_search.module.css";

export const metadata = {
  title: "GPT + Enterprise data | Sample",
  description:
    "Azure-style sample UI showing GPT-4 with vision grounded in enterprise data.",
};

export default function EnterpriseSearchPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>
          <Database size={18} />
          GPT + Enterprise data
          <span className={styles.headerBadge}>Sample</span>
        </h1>
        <div className={styles.headerActions}>
          <button type="button" className={styles.headerBtn} aria-label="Refresh">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.grid}>
          <EnterpriseChatPanel />
          <EnterpriseConfigPanel />
        </div>
      </div>

      <div className={styles.bottomBar}>
        <input
          type="text"
          className={styles.bottomInput}
          placeholder="Ask a new question (e.g. does my plan cover annual eye exams?)"
          aria-label="Ask a new question"
        />
        <button type="button" className={styles.closeBtn}>
          Close
        </button>
      </div>
    </main>
  );
}
