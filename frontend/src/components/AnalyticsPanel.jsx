/**
 * AnalyticsPanel — expandable analytics view for a single file
 * Shown only inside the owner's dashboard (HistoryPage).
 * Fetches data on first open, then caches it for the session.
 */
import { useState } from 'react';
import axios from 'axios';
import styles from './AnalyticsPanel.module.css';

export default function AnalyticsPanel({ fileId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [open, setOpen]       = useState(false);

  async function toggle() {
    if (open) { setOpen(false); return; }

    // Only fetch once — reuse cached data on subsequent opens
    if (!data) {
      setLoading(true);
      try {
        const res = await axios.get(`/api/analytics/${fileId}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    setOpen(true);
  }

  // Format a UTC date string into a human-readable relative time
  function timeAgo(dateStr) {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr);
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs  < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className={styles.wrap}>
      {/* Toggle button */}
      <button
        className={`${styles.toggleBtn} ${open ? styles.active : ''}`}
        onClick={toggle}
        title="View download analytics"
      >
        {loading ? (
          <span className={styles.spinner} />
        ) : (
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <rect x="1" y="9" width="3" height="5" rx="1" fill="currentColor"/>
            <rect x="6" y="5" width="3" height="9" rx="1" fill="currentColor"/>
            <rect x="11" y="2" width="3" height="12" rx="1" fill="currentColor"/>
          </svg>
        )}
      </button>

      {/* Analytics drawer — slides open below the file row */}
      {open && (
        <div className={`${styles.panel} animate-fadeIn`}>
          {error ? (
            <p className={styles.error}>{error}</p>
          ) : data ? (
            <>
              {/* Summary stats */}
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{data.totalDownloads}</span>
                  <span className={styles.statLabel}>Total downloads</span>
                </div>
                <div className={styles.statDivider} />
                <div className={styles.stat}>
                  <span className={styles.statValue}>{timeAgo(data.lastDownloadedAt)}</span>
                  <span className={styles.statLabel}>Last downloaded</span>
                </div>
              </div>

              {/* Recent download log */}
              {data.recentDownloads.length === 0 ? (
                <p className={styles.empty}>No downloads yet</p>
              ) : (
                <div className={styles.logSection}>
                  <p className={styles.logHeading}>Recent downloads</p>
                  <div className={styles.logList}>
                    {data.recentDownloads.map((d, i) => (
                      <div key={i} className={styles.logRow}>
                        {/* Avatar circle with first letter */}
                        <div className={`${styles.avatar} ${d.username === 'Guest' ? styles.guestAvatar : ''}`}>
                          {d.username[0].toUpperCase()}
                        </div>
                        <span className={styles.logName}>{d.username}</span>
                        <span className={styles.logTime}>{timeAgo(d.downloadedAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
