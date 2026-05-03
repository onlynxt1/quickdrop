/**
 * AnalyticsPanel — self-contained toggle button + inline expanded panel.
 * The button sits in the actions row; the panel renders as a full-width
 * block BELOW the file row (passed via the `open` prop from HistoryPage),
 * so it never overlaps other rows.
 */
import styles from './AnalyticsPanel.module.css';

// ── Toggle button (bar-chart icon) ──────────────────────────
// HistoryPage controls open/close; this just fires the callback.
export function AnalyticsToggleBtn({ active, loading, onClick }) {
  return (
    <button
      className={`${styles.toggleBtn} ${active ? styles.active : ''}`}
      onClick={onClick}
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
  );
}

// ── Panel body — rendered below the file row ─────────────────
export function AnalyticsPanelBody({ data, error }) {
  function timeAgo(dateStr) {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr);
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
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

          {/* Recent downloaders */}
          <div className={styles.logSection}>
            <p className={styles.logHeading}>Recent downloads</p>
            {data.recentDownloads.length === 0 ? (
              <p className={styles.empty}>No downloads yet</p>
            ) : (
              <div className={styles.logList}>
                {data.recentDownloads.map((d, i) => (
                  <div key={i} className={styles.logRow}>
                    <div className={`${styles.avatar} ${d.username === 'Guest' ? styles.guestAvatar : ''}`}>
                      {d.username[0].toUpperCase()}
                    </div>
                    <span className={styles.logName}>{d.username}</span>
                    <span className={styles.logTime}>{timeAgo(d.downloadedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className={styles.loadingRow}>
          <span className={styles.spinner} />
          <span>Loading analytics…</span>
        </div>
      )}
    </div>
  );
}
