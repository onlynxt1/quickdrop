/**
 * TextShare — textarea input for sharing text snippets and links.
 * Lives on the home page next to the file upload zone.
 */
import { useState, useRef } from 'react';
import axios from 'axios';
import styles from './TextShare.module.css';

const MAX_CHARS = 50_000;

const EXPIRY_OPTIONS = [
  { value: '1h',  label: '1 hour' },
  { value: '24h', label: '24 hours' },
  { value: '7d',  label: '7 days' },
];

export default function TextShare({ onSuccess }) {
  const [text, setText]       = useState('');
  const [expiry, setExpiry]   = useState('24h');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const textareaRef           = useRef(null);

  const charCount = text.length;
  const nearLimit = charCount > MAX_CHARS * 0.9;
  const atLimit   = charCount >= MAX_CHARS;

  async function handleShare() {
    if (!text.trim()) {
      setError('Please enter some text to share.');
      textareaRef.current?.focus();
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/snippets', { content: text, expiry });
      onSuccess({ ...res.data, content: text });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create snippet. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    // Cmd/Ctrl+Enter submits
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleShare();
  }

  return (
    <div className={styles.wrap}>
      {/* Textarea */}
      <div className={`${styles.textareaWrap} ${text ? styles.hasText : ''}`}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder="Paste a link, type a note, or share a code snippet…"
          value={text}
          onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKeyDown}
          rows={7}
          spellCheck
          autoFocus
        />
        {/* Character counter — only shown once the user starts typing */}
        {charCount > 0 && (
          <span className={`${styles.charCount} ${nearLimit ? styles.charWarn : ''} ${atLimit ? styles.charOver : ''}`}>
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {/* Footer: expiry selector + share button */}
      <div className={styles.footer}>
        {/* Expiry segmented control */}
        <div className={styles.expiry}>
          <span className={styles.expiryLabel}>Expires in</span>
          <div className={styles.expiryPills}>
            {EXPIRY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`${styles.expiryPill} ${expiry === opt.value ? styles.expiryActive : ''}`}
                onClick={() => setExpiry(opt.value)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Share button */}
        <button
          className={styles.shareBtn}
          onClick={handleShare}
          disabled={loading || !text.trim()}
          type="button"
        >
          {loading ? (
            <span className={styles.spinner} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8h12M10 4l4 4-4 4" stroke="white" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {loading ? 'Sharing…' : 'Share'}
        </button>
      </div>

      <p className={styles.hint}>⌘ + Enter to share</p>
    </div>
  );
}
