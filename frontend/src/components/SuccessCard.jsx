/**
 * SuccessCard — shown after a successful upload
 * Displays download link, copy button, QR code, and expiry
 */
import { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './SuccessCard.module.css';

export default function SuccessCard({ fileInfo, onReset }) {
  const [copied, setCopied]   = useState(false);
  const [qrCode, setQrCode]   = useState('');
  const [showQr, setShowQr]   = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);

  // Format expiry countdown
  const expiresAt = new Date(fileInfo.expiresAt);
  const expiresIn = Math.round((expiresAt - Date.now()) / 1000 / 60); // minutes

  function copyLink() {
    navigator.clipboard.writeText(fileInfo.downloadLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  async function toggleQr() {
    if (showQr) { setShowQr(false); return; }
    if (qrCode)  { setShowQr(true);  return; }

    setLoadingQr(true);
    try {
      const res = await axios.get(`/api/files/${fileInfo.id}/qr`);
      setQrCode(res.data.qrCode);
      setShowQr(true);
    } catch {
      // Silent fail — QR is optional
    } finally {
      setLoadingQr(false);
    }
  }

  function formatSize(bytes) {
    if (bytes < 1024)            return `${bytes} B`;
    if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className={`${styles.card} animate-slideUp`}>
      {/* Success header */}
      <div className={styles.header}>
        <div className={styles.checkCircle}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M7 14l5 5 9-9" stroke="white" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h3 className={styles.title}>File ready to share!</h3>
          <p className={styles.subtitle}>
            {fileInfo.originalName} &nbsp;·&nbsp; {formatSize(fileInfo.size)}
          </p>
        </div>
      </div>

      {/* Link row */}
      <div className={styles.linkRow}>
        <div className={styles.linkBox}>
          <span className={styles.linkText}>{fileInfo.downloadLink}</span>
        </div>
        <button
          className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
          onClick={copyLink}
        >
          {copied ? (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8l3.5 3.5 6.5-6.5" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 5V4a2 2 0 00-2-2H4a2 2 0 00-2 2v5a2 2 0 002 2h1"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Copy link
            </>
          )}
        </button>
      </div>

      {/* Actions row */}
      <div className={styles.actions}>
        <button className={styles.qrBtn} onClick={toggleQr} disabled={loadingQr}>
          {loadingQr ? (
            <span className={styles.miniSpin} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="10" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="1" y="10" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="10" y="10" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          )}
          {showQr ? 'Hide QR' : 'QR Code'}
        </button>

        <a
          href={fileInfo.downloadLink}
          className={styles.downloadBtn}
          target="_blank"
          rel="noreferrer"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v8M8 10l-3-3M8 10l3-3" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 13h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Download
        </a>
      </div>

      {/* QR Code panel */}
      {showQr && qrCode && (
        <div className={`${styles.qrPanel} animate-fadeIn`}>
          <p className={styles.qrHint}>Scan with your phone to download</p>
          <img src={qrCode} alt="QR Code" className={styles.qrImage} />
        </div>
      )}

      {/* Expiry notice */}
      <p className={styles.expiry}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M7 4.5V7l1.5 1.5" stroke="currentColor" strokeWidth="1.3"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Expires in ~{expiresIn} minutes
      </p>

      {/* Upload another */}
      <button className={styles.resetBtn} onClick={onReset}>
        Upload another file
      </button>
    </div>
  );
}
