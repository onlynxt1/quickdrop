/**
 * SnippetPage — displays a shared text note or link.
 * Accessed via /note/:id
 * Light Apple/iCloud-inspired design with its own colour palette.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import styles from './SnippetPage.module.css';

// ── Helpers ─────────────────────────────────────────────────

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}

function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const mins = Math.floor(diff / 60000);
  if (mins < 60)       return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)        return `${hrs}h left`;
  return `${Math.floor(hrs / 24)}d left`;
}

/**
 * Render text with clickable links.
 * Splits on URL-like patterns and wraps them in <a> tags.
 */
function LinkedText({ text }) {
  // Match http/https URLs and bare www.* domains
  const URL_RE = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/g;
  const parts = [];
  let last = 0;
  let match;

  while ((match = URL_RE.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', value: text.slice(last, match.index) });
    }
    const url = match[0];
    const href = url.startsWith('http') ? url : `https://${url}`;
    parts.push({ type: 'link', value: url, href });
    last = match.index + url.length;
  }
  if (last < text.length) {
    parts.push({ type: 'text', value: text.slice(last) });
  }

  return (
    <>
      {parts.map((p, i) =>
        p.type === 'link' ? (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer"
            className={styles.link}>
            {p.value}
          </a>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </>
  );
}

// ── Main component ───────────────────────────────────────────

export default function SnippetPage() {
  const { id } = useParams();
  const [snippet, setSnippet]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [qrCode, setQrCode]         = useState('');
  const [showQr, setShowQr]         = useState(false);

  useEffect(() => {
    axios.get(`/api/snippets/${id}`)
      .then(res => setSnippet(res.data))
      .catch(err => setError(err.response?.data?.error || 'Snippet not found'))
      .finally(() => setLoading(false));
  }, [id]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    });
  }

  function copyText() {
    navigator.clipboard.writeText(snippet.content).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2200);
    });
  }

  async function toggleQr() {
    if (showQr) { setShowQr(false); return; }
    if (!qrCode) {
      const res = await axios.get(`/api/snippets/${id}/qr`);
      setQrCode(res.data.qrCode);
    }
    setShowQr(true);
  }

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading note…</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────
  if (error) {
    const isExpired = error.toLowerCase().includes('expir');
    return (
      <div className={styles.page}>
        <div className={`${styles.card} ${styles.errorCard} animate-slideUp`}>
          <div className={styles.errorIcon}>
            {isExpired ? (
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="17" stroke="#6e6e73" strokeWidth="2"/>
                <path d="M20 12v10l5.5 3.5" stroke="#6e6e73" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="17" stroke="#6e6e73" strokeWidth="2"/>
                <path d="M20 14v9M20 27v1" stroke="#6e6e73" strokeWidth="2.5"
                  strokeLinecap="round"/>
              </svg>
            )}
          </div>
          <h2 className={styles.errorTitle}>{isExpired ? 'Note expired' : 'Note not found'}</h2>
          <p className={styles.errorDesc}>{error}</p>
          <a href="/" className={styles.homeBtn}>Back to QuickDrop</a>
        </div>
      </div>
    );
  }

  const expiry  = timeLeft(snippet.expiresAt);
  const expired = expiry === 'Expired';

  // Detect if the content is purely a single URL
  const isSingleUrl = /^https?:\/\/[^\s]+$/.test(snippet.content.trim());

  return (
    <div className={styles.page}>
      <div className={`${styles.card} animate-slideUp`}>

        {/* ── Header ── */}
        <div className={styles.cardHeader}>
          {/* QuickDrop wordmark */}
          <a href="/" className={styles.brand}>
            <svg width="20" height="20" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="8" fill="#0A84FF"/>
              <path d="M18 8v14M18 22l-6-6M18 22l6-6" stroke="white" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 29h16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span>QuickDrop</span>
          </a>

          {/* Expiry badge */}
          <span className={`${styles.expiryBadge} ${expired ? styles.expiredBadge : ''}`}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M5.5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2"
                strokeLinecap="round"/>
            </svg>
            {expiry}
          </span>
        </div>

        {/* ── Main text area ── */}
        <div className={`${styles.contentWrap} ${isSingleUrl ? styles.urlContent : ''}`}>
          {isSingleUrl ? (
            /* Single URL — render as a big tappable link card */
            <a
              href={snippet.content.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.urlCard}
            >
              <span className={styles.urlIcon}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M9 13l9-9M18 4H12M18 4v6" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 5H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                    strokeLinejoin="round"/>
                </svg>
              </span>
              <span className={styles.urlText}>{snippet.content.trim()}</span>
            </a>
          ) : (
            /* Regular text / note */
            <p className={styles.content}>
              <LinkedText text={snippet.content} />
            </p>
          )}
        </div>

        {/* ── Meta ── */}
        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.2"
                strokeLinecap="round"/>
            </svg>
            Shared {formatDate(snippet.createdAt)}
          </span>
          <span className={styles.metaDot} />
          <span className={styles.metaItem}>
            {snippet.characterCount?.toLocaleString() ?? snippet.content.length.toLocaleString()} characters
          </span>
        </div>

        {/* ── Actions ── */}
        <div className={styles.actions}>
          {/* Copy text */}
          <button
            className={`${styles.actionBtn} ${copiedText ? styles.copiedBtn : ''}`}
            onClick={copyText}
          >
            {copiedText ? (
              <>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M3 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <rect x="4.5" y="4.5" width="8" height="8" rx="1.5"
                    stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M10.5 4.5V3.5a1 1 0 00-1-1h-6a1 1 0 00-1 1v6a1 1 0 001 1h1"
                    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Copy text
              </>
            )}
          </button>

          {/* Copy link */}
          <button
            className={`${styles.actionBtn} ${copiedLink ? styles.copiedBtn : ''}`}
            onClick={copyLink}
          >
            {copiedLink ? (
              <>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M3 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Link copied!
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M5.5 8.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5l-1 1"
                    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M9.5 6.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5l1-1"
                    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Copy link
              </>
            )}
          </button>

          {/* QR code */}
          <button
            className={`${styles.actionBtn} ${showQr ? styles.activeBtn : ''}`}
            onClick={toggleQr}
          >
            <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="8.5" y="1" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="1" y="8.5" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="9.5" y="9.5" width="1" height="1" rx="0.3" fill="currentColor"/>
              <rect x="8.5" y="8.5" width="1" height="1" rx="0.3" fill="currentColor"/>
              <rect x="11.5" y="8.5" width="1" height="1" rx="0.3" fill="currentColor"/>
              <rect x="8.5" y="11.5" width="1" height="1" rx="0.3" fill="currentColor"/>
              <rect x="11.5" y="11.5" width="1" height="1" rx="0.3" fill="currentColor"/>
            </svg>
            {showQr ? 'Hide QR' : 'QR code'}
          </button>
        </div>

        {/* ── QR panel ── */}
        {showQr && qrCode && (
          <div className={styles.qrPanel}>
            <p className={styles.qrHint}>Point your camera to open on another device</p>
            <img src={qrCode} alt="QR code" className={styles.qrImg} />
          </div>
        )}

        {/* ── Footer: QuickDrop CTA ── */}
        <div className={styles.cta}>
          <span>Share your own text or files — </span>
          <a href="/" className={styles.ctaLink}>try QuickDrop</a>
        </div>
      </div>
    </div>
  );
}
