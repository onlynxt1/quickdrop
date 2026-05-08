/**
 * History page — shows all files uploaded by the logged-in user.
 * Per-file download analytics expand inline below each row (no overlap).
 */
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { AnalyticsToggleBtn, AnalyticsPanelBody } from '../components/AnalyticsPanel';
import styles from './HistoryPage.module.css';

export default function HistoryPage() {
  const { user } = useAuth();
  const [files, setFiles]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [copied, setCopied]       = useState('');

  // analyticsState[fileId] = { open, loading, data, error }
  const [analyticsState, setAnalyticsState] = useState({});

  useEffect(() => {
    if (!user) return;
    axios.get('/api/files/my')
      .then(res => setFiles(res.data.files))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Toggle analytics panel for a given file
  const toggleAnalytics = useCallback(async (fileId) => {
    setAnalyticsState(prev => {
      const current = prev[fileId] || {};

      // If already open, just close it
      if (current.open) {
        return { ...prev, [fileId]: { ...current, open: false } };
      }

      // If we already have data cached, just reopen
      if (current.data || current.error) {
        return { ...prev, [fileId]: { ...current, open: true } };
      }

      // Otherwise kick off a fetch (handled below after state update)
      return { ...prev, [fileId]: { ...current, open: true, loading: true } };
    });

    // Check if we need to fetch (no data yet)
    setAnalyticsState(prev => {
      const current = prev[fileId] || {};
      if (current.data || current.error) return prev; // already fetched

      // Kick off async fetch
      axios.get(`/api/analytics/${fileId}`)
        .then(res => {
          setAnalyticsState(p => ({
            ...p,
            [fileId]: { ...p[fileId], loading: false, data: res.data }
          }));
        })
        .catch(err => {
          setAnalyticsState(p => ({
            ...p,
            [fileId]: {
              ...p[fileId],
              loading: false,
              error: err.response?.data?.error || 'Failed to load analytics'
            }
          }));
        });

      return prev; // state updated by fetch callbacks
    });
  }, []);

  async function deleteFile(id) {
    try {
      await axios.delete(`/api/files/${id}`);
      setFiles(prev => prev.filter(f => f.id !== id));
      setAnalyticsState(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch { /* silent */ }
  }

  function copyLink(id) {
    const link = `${window.location.origin}/share/${id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(''), 2000);
    });
  }

  function formatSize(bytes) {
    if (bytes < 1024)                return `${bytes} B`;
    if (bytes < 1024 * 1024)         return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr);
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  }

  function timeLeft(expiresAt) {
    const diff = new Date(expiresAt) - Date.now();
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m left`;
    return `${Math.floor(mins / 60)}h left`;
  }

  function getFileEmoji(mimeType) {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/'))  return '🖼️';
    if (mimeType.startsWith('video/'))  return '🎬';
    if (mimeType.startsWith('audio/'))  return '🎵';
    if (mimeType.includes('pdf'))       return '📋';
    if (mimeType.includes('zip'))       return '📦';
    if (mimeType.includes('text/'))     return '📝';
    return '📄';
  }

  if (!user) {
    return (
      <div className={styles.center}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔒</span>
          <h3>Sign in required</h3>
          <p>Sign in to view your upload history</p>
          <Link to="/auth" className={styles.signInBtn}>Sign in</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Your files</h2>
          <p className={styles.subtitle}>
            {files.length === 0
              ? 'No active uploads'
              : `${files.length} active upload${files.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {files.length > 0 && (
          <p className={styles.analyticsHint}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="1" y="8" width="2.5" height="4" rx="0.8" fill="currentColor"/>
              <rect x="5.25" y="5" width="2.5" height="7" rx="0.8" fill="currentColor"/>
              <rect x="9.5" y="2" width="2.5" height="10" rx="0.8" fill="currentColor"/>
            </svg>
            Tap the chart icon for analytics
          </p>
        )}
      </div>

      {files.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📂</span>
          <h3>Nothing here yet</h3>
          <p>Files you upload will appear here</p>
          <Link to="/" className={styles.uploadBtn}>Upload a file</Link>
        </div>
      ) : (
        <div className={styles.list}>
          {files.map(f => {
            const analytics = analyticsState[f.id] || {};
            const isOpen = !!analytics.open;

            return (
              // fileBlock groups the row + the analytics panel so they connect visually
              <div key={f.id} className={styles.fileBlock}>

                {/* ── File row ── */}
                <div className={`${styles.row} ${isOpen ? styles.rowOpen : ''} animate-fadeIn`}>
                  <span className={styles.fileEmoji}>{getFileEmoji(f.mimeType)}</span>

                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{f.originalName}</span>
                    <div className={styles.fileMeta}>
                      <span>{formatSize(f.size)}</span>
                      <span>·</span>
                      <span>{f.downloadCount} download{f.downloadCount !== 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span>{timeAgo(f.createdAt)}</span>
                      <span>·</span>
                      <span className={timeLeft(f.expiresAt) === 'Expired' ? styles.expired : styles.expiry}>
                        {timeLeft(f.expiresAt)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    {/* Copy link */}
                    <button
                      className={`${styles.actionBtn} ${copied === f.id ? styles.copiedBtn : ''}`}
                      onClick={() => copyLink(f.id)}
                      title="Copy link"
                    >
                      {copied === f.id ? (
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <path d="M3 7.5l3 3 6-6" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <rect x="4.5" y="4.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                          <path d="M10.5 4.5V3.5a1 1 0 00-1-1h-6a1 1 0 00-1 1v6a1 1 0 001 1h1"
                            stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      )}
                    </button>

                    {/* Open download page */}
                    <a
                      href={`/share/${f.id}`}
                      className={styles.actionBtn}
                      target="_blank"
                      rel="noreferrer"
                      title="Open preview page"
                    >
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path d="M7.5 2v8M7.5 10l-3-3M7.5 10l3-3" stroke="currentColor" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 13h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </a>

                    {/* Analytics toggle */}
                    <AnalyticsToggleBtn
                      active={isOpen}
                      loading={!!analytics.loading}
                      onClick={() => toggleAnalytics(f.id)}
                    />

                    {/* Delete */}
                    <button
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      onClick={() => deleteFile(f.id)}
                      title="Delete file"
                    >
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path d="M3 4h9M6 4V2.5h3V4M5 4v8a.5.5 0 00.5.5h4a.5.5 0 00.5-.5V4"
                          stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* ── Analytics panel — rendered BELOW the row, never floating ── */}
                {isOpen && (
                  <AnalyticsPanelBody
                    data={analytics.data}
                    error={analytics.error}
                  />
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
