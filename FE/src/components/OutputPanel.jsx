'use client';

import ReactMarkdown from 'react-markdown';
import styles from './OutputPanel.module.css';

export default function OutputPanel({ content, isStreaming, error }) {
  if (!content && !error) return null;

  return (
    <div className="output-panel">
      {error && <div className={styles.error}>{error}</div>}
      {content && (
        <ReactMarkdown>{content}</ReactMarkdown>
      )}
      {isStreaming && <span className="cursor-blink" />}
    </div>
  );
}