/**
 * SnippetSuccessCard — shown after a text snippet is successfully created.
 * Mirrors the SuccessCard aesthetic but tailored for text sharing.
 */
import { useState } from 'react';
import styles from './SnippetSuccessCard.module.css';

export default function SnippetSuccessCard({ snippetInfo, onReset }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(snippetInfo.shareLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    });
  }

  function copyText() {
    navigator.clipboard.writeText(snippetInfo.content).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2200);
    });
  }

  const expiresAt  = new Date(snippetInfo.expiresAt);
  const expiresIn  = Math.round((expiresAt - Date.now()) / 1000 / 60);
  const expiryText = expiresIn >= 60 * 24
    ? `${Math.round(expiresIn / 60 / 24)}d`
    : expiresIn >= 60
      ? `${Math.round(expiresIn / 60)}h`
      : `${expiresIn}m`;

  // Preview: first 120 chars, truncated
  const preview = snippetInfo.content.length > 120
    ? snippetInfo.content.slice(0, 120) + '…'
    : snippetInfo.content;

  return (
    <div className={`${styles.card} animate-slideUp`}>
      {/* Success header */}
      <div className={styles.header}>
        <div className={styles.checkCircle}>
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <path d="M6 13l5 5 9-9" stroke="white" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h3 className={styles.title}>Note ready to share!</h3>
          <p className={styles.subtitle}>
            {snippetInfo.characterCount?.toLocaleString()} characters &nbsp;·&nbsp; expires in {expiryText}
          </p>
        </div>
      </div>

      {/* Text preview */}
      <div className={styles.preview}>{preview}</div>

      {/* Share link row */}
      <div className={styles.linkRow}>
        <div className={styles.linkBox}>
          <span className={styles.linkText}>{snippetInfo.shareLink}</span>
        </div>
        <button
          className={`${styles.copyBtn} ${copiedLink ? styles.copied : ''}`}
          onClick={copyLink}
        >
          {copiedLink ? (
            <>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M3 7.5l3 3 6-6" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <rect x="4.5" y="4.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M10.5 4.5V3.5a1 1 0 00-1-1h-6a1 1 0 00-1 1v6a1 1 0 001 1h1"
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Copy link
            </>
          )}
        </button>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={`${styles.actionBtn} ${copiedText ? styles.copiedText : ''}`}
          onClick={copyText}
        >
          {copiedText ? 'Copied!' : 'Copy text'}
        </button>
        <a
          href={snippetInfo.shareLink}
          className={styles.viewBtn}
          target="_blank"
          rel="noreferrer"
        >
          Preview
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2.5 6.5H11M7 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>

      {/* Share another */}
      <button className={styles.resetBtn} onClick={onReset}>
        Share another note
      </button>
    </div>
  );
}
