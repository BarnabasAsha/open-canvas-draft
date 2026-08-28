import { useState } from "react";
import { ArrowUpIcon, SparkleIcon, XIcon } from "@phosphor-icons/react";
import styles from "./AiComposerThread.module.css";

interface AiComposerThreadProps {
  scopeLabel: string;
  onClose: () => void;
  onReply: (message: string) => void;
  onKeep: () => void;
  onUndo: () => void;
  onTryAgain: () => void;
}

// Expanded thread state of the AI composer (variant "1b") — generation
// "receipts" (a summary card with Keep/Undo/Try again) inline in the
// conversation, rather than a silent apply. Standalone and NOT mounted
// anywhere yet — same as AiComposerPill/AiComposerSelection, matching
// CLAUDE.md's "AI is deferred until the canvas itself is solid." The
// transcript below is the redesign's own sample conversation, not live
// data — there's no real chat history to render yet.
export function AiComposerThread({ scopeLabel, onClose, onReply, onKeep, onUndo, onTryAgain }: AiComposerThreadProps) {
  const [reply, setReply] = useState("");

  function handleReply(): void {
    const trimmed = reply.trim();
    if (!trimmed) return;
    onReply(trimmed);
    setReply("");
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <SparkleIcon size={14} weight="light" />
          Assistant
        </div>
        <div className={styles.headerActions}>
          <span className={styles.scopeChip}>{scopeLabel}</span>
          <button type="button" className={styles.closeButton} aria-label="Close" onClick={onClose}>
            <XIcon size={13} />
          </button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.userBubble}>
          Build a hero for a wellness studio — cream ground, serif headline, photo on the right.
        </div>
        <div className={styles.assistantBlock}>
          <p className={styles.assistantText}>
            Added a hero section with a two-column layout, an eyebrow, headline, body copy, and a photo frame.
          </p>
          <div className={styles.receipt}>
            <div className={styles.receiptHeader}>
              <span className={styles.receiptName}>Hero Section</span>
              <span className={styles.receiptMeta}>+12 layers</span>
            </div>
            <div className={styles.receiptActions}>
              <button type="button" className={styles.keepButton} onClick={onKeep}>
                Keep
              </button>
              <button type="button" className={styles.undoButton} onClick={onUndo}>
                Undo
              </button>
              <button type="button" className={styles.tryAgainButton} onClick={onTryAgain}>
                Try again
              </button>
            </div>
          </div>
        </div>
        <div className={styles.userBubble}>Make this headline tighter and 56px.</div>
        <div className={styles.statusLine}>
          <span className={styles.statusDot} />
          Editing <strong>{scopeLabel}</strong> — size, line height
        </div>
      </div>

      <div className={styles.footer}>
        <input
          className={styles.footerInput}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply, or describe the next change…"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleReply();
          }}
        />
        <button type="button" className={styles.footerSend} aria-label="Send" onClick={handleReply}>
          <ArrowUpIcon size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}
