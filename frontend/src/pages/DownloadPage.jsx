/**
 * DownloadPage — polished Apple/iCloud-style file preview page.
 * Shown when someone opens a shared /download/:id link.
 * Previews images, videos, audio, and PDFs inline.
 * The actual download only happens when the user clicks the Download button.
 */
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import styles from './DownloadPage.module.css';

// ── Helpers ─────────────────────────────────────────────────

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)                return `${bytes} B`;
  if (bytes < 1024 * 1024)         return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h left`;
}

// Map mime type → file category
function fileCategory(mimeType) {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/'))  return 'image';
  if (mimeType.startsWith('video/'))  return 'video';
  if (mimeType.startsWith('audio/'))  return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'other';
}

// Large icon for generic file types
function FileTypeIcon({ mimeType }) {
  const icons = {
    'application/zip':  { emoji: '📦', label: 'Archive' },
    'application/x-zip-compressed': { emoji: '📦', label: 'Archive' },
    'text/plain':       { emoji: '📝', label: 'Text' },
    'text/html':        { emoji: '🌐', label: 'HTML' },
    'application/json': { emoji: '🗂️', label: 'JSON' },
  };
  const match = icons[mimeType];
  const emoji = match?.emoji ?? '📄';
  const label = match?.label ?? (mimeType ? mimeType.split('/')[1]?.toUpperCase() : 'File');
  return (
    <div className={styles.genericIcon}>
      <span className={styles.genericEmoji}>{emoji}</span>
      <span className={styles.genericLabel}>{label}</span>
    </div>
  );
}

// ── Preview components ───────────────────────────────────────

function ImagePreview({ id, name }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={styles.previewArea}>
      {!loaded && <div className={styles.previewSkeleton} />}
      <img
        className={`${styles.imagePreview} ${loaded ? styles.previewVisible : ''}`}
        src={`/api/files/${id}/stream`}
        alt={name}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

function VideoPreview({ id }) {
  const [thumbError, setThumbError] = useState(false);
  return (
    <div className={`${styles.previewArea} ${styles.videoBg}`}>
      <video
        className={styles.videoPlayer}
        controls
        preload="metadata"
        poster={thumbError ? undefined : `/api/files/${id}/thumbnail`}
        playsInline
      >
        <source src={`/api/files/${id}/stream`} />
        Your browser does not support video playback.
      </video>
      {/* Hidden img just to detect thumbnail errors */}
      <img
        src={`/api/files/${id}/thumbnail`}
        style={{ display: 'none' }}
        onError={() => setThumbError(true)}
        alt=""
      />
    </div>
  );
}

function AudioPreview({ id, name }) {
  return (
    <div className={styles.audioPreviewArea}>
      <div className={styles.audioDisc}>
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <circle cx="26" cy="26" r="25" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>
          <circle cx="26" cy="26" r="18" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5"/>
          <circle cx="26" cy="26" r="4" fill="rgba(255,255,255,0.2)"/>
          <path d="M26 8 A18 18 0 0 1 44 26" stroke="var(--accent)" strokeWidth="2"
            strokeLinecap="round"/>
        </svg>
      </div>
      <p className={styles.audioTitle}>{name}</p>
      <audio
        className={styles.audioPlayer}
        controls
        preload="metadata"
        src={`/api/files/${id}/stream`}
      />
    </div>
  );
}

function PdfPreview({ id }) {
  const [supported, setSupported] = useState(true);
  if (!supported) return null;
  return (
    <div className={styles.pdfArea}>
      <iframe
        className={styles.pdfFrame}
        src={`/api/files/${id}/stream#toolbar=0&navpanes=0`}
        title="PDF preview"
        onError={() => setSupported(false)}
      />
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────

export default function DownloadPage() {
  // Route is /share/:id — the actual file download lives at /download/:id
  const { id } = useParams();
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [copied, setCopied]     = useState(false);
  const [qrCode, setQrCode]     = useState('');
  const [showQr, setShowQr]     = useState(false);

  useEffect(() => {
    axios.get(`/api/files/${id}/info`)
      .then(res => setFile(res.data))
      .catch(err => setError(err.response?.data?.error || 'File not found'))
      .finally(() => setLoading(false));
  }, [id]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* silent */ }
  }

  async function toggleQr() {
    if (showQr) { setShowQr(false); return; }
    if (!qrCode) {
      const res = await axios.get(`/api/files/${id}/qr`);
      setQrCode(res.data.qrCode);
    }
    setShowQr(true);
  }

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingCard}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading preview…</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────
  if (error) {
    const isExpired = error.toLowerCase().includes('expir');
    return (
      <div className={styles.page}>
        <div className={`${styles.card} animate-slideUp`}>
          <div className={styles.errorZone}>
            <div className={styles.errorIconWrap}>
              {isExpired ? (
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="2"/>
                  <path d="M18 10v9l5 3" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <path d="M18 13v7M18 24v1" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round"/>
                  <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="2"/>
                </svg>
              )}
            </div>
            <h2 className={styles.errorTitle}>
              {isExpired ? 'Link expired' : 'File not found'}
            </h2>
            <p className={styles.errorDesc}>{error}</p>
            <a href="/" className={styles.homeBtn}>Back to QuickDrop</a>
          </div>
        </div>
      </div>
    );
  }

  const category = fileCategory(file.mimeType);
  const expiry   = timeLeft(file.expiresAt);
  const expired  = expiry === 'Expired';

  return (
    <div className={styles.page}>
      <div className={`${styles.card} animate-slideUp`}>

        {/* ── Preview zone ───────────────────────────── */}
        {category === 'image' && <ImagePreview id={id} name={file.originalName} />}
        {category === 'video' && <VideoPreview id={id} />}
        {category === 'audio' && <AudioPreview id={id} name={file.originalName} />}
        {category === 'pdf'   && <PdfPreview   id={id} />}
        {category === 'other' && (
          <div className={styles.genericPreviewArea}>
            <FileTypeIcon mimeType={file.mimeType} />
          </div>
        )}

        {/* ── File info ──────────────────────────────── */}
        <div className={styles.info}>

          {/* File name */}
          <h1 className={styles.fileName}>{file.originalName}</h1>

          {/* Meta strip */}
          <div className={styles.metaStrip}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Size</span>
              <span className={styles.metaValue}>{formatSize(file.size)}</span>
            </div>
            <div className={styles.metaDot} />
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Uploaded</span>
              <span className={styles.metaValue}>{formatDate(file.createdAt)}</span>
            </div>
            <div className={styles.metaDot} />
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Expires</span>
              <span className={`${styles.metaValue} ${expired ? styles.expired : styles.expiry}`}>
                {expiry}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className={styles.actions}>
            {/* Primary: Download */}
            <a
              href={`/download/${id}`}
              className={styles.downloadBtn}
              download={file.originalName}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2v9M9 11l-3.5-3.5M9 11l3.5-3.5"
                  stroke="white" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 15.5h14" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Download
            </a>

            {/* Secondary: Copy link */}
            <button
              className={`${styles.copyBtn} ${copied ? styles.copiedBtn : ''}`}
              onClick={copyLink}
            >
              {copied ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3.5 3.5 6.5-7"
                      stroke="currentColor" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="5" y="5" width="8.5" height="8.5" rx="1.5"
                      stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M11 5V3.5a1 1 0 00-1-1H3.5a1 1 0 00-1 1V10a1 1 0 001 1H5"
                      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  Copy link
                </>
              )}
            </button>
          </div>

          {/* QR code toggle */}
          <button className={styles.qrToggle} onClick={toggleQr}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="8.5" y="1" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="1" y="8.5" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="9.5" y="9.5" width="1" height="1" rx="0.3" fill="currentColor"/>
              <rect x="8.5" y="8.5" width="1" height="1" rx="0.3" fill="currentColor"/>
              <rect x="11.5" y="8.5" width="1" height="1" rx="0.3" fill="currentColor"/>
              <rect x="8.5" y="11.5" width="1" height="1" rx="0.3" fill="currentColor"/>
              <rect x="11.5" y="11.5" width="1" height="1" rx="0.3" fill="currentColor"/>
            </svg>
            {showQr ? 'Hide QR code' : 'Scan QR to share'}
          </button>

          {showQr && qrCode && (
            <div className={`${styles.qrPanel} animate-fadeIn`}>
              <p className={styles.qrHint}>Point your camera to open on another device</p>
              <img src={qrCode} alt="QR code" className={styles.qrImg} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
