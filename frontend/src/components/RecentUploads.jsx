/**
 * RecentUploads — shows the list of files uploaded this session
 */
import styles from './RecentUploads.module.css';

export default function RecentUploads({ uploads }) {
  function formatSize(bytes) {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function copyLink(link) {
    navigator.clipboard.writeText(link);
  }

  return (
    <div className={styles.section}>
      <h4 className={styles.heading}>Recent uploads</h4>
      <div className={styles.list}>
        {uploads.map(f => (
          <div key={f.id} className={styles.row}>
            <div className={styles.fileIcon}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V6L9 1z"
                  stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                <path d="M9 1v5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <div className={styles.info}>
              <span className={styles.name}>{f.originalName}</span>
              <span className={styles.meta}>{formatSize(f.size)}</span>
            </div>
            <button
              className={styles.copyBtn}
              onClick={() => copyLink(f.downloadLink)}
              title="Copy link"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M10 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v6a1 1 0 001 1h1"
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
