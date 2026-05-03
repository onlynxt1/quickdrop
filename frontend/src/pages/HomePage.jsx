/**
 * Home page — upload area + recent uploads list
 */
import { useState } from 'react';
import UploadZone from '../components/UploadZone';
import SuccessCard from '../components/SuccessCard';
import RecentUploads from '../components/RecentUploads';
import styles from './HomePage.module.css';

export default function HomePage() {
  const [uploadedFile, setUploadedFile] = useState(null);
  // Keep a session-local list of recent uploads (not logged-in users)
  const [sessionUploads, setSessionUploads] = useState([]);

  function handleSuccess(fileInfo) {
    setUploadedFile(fileInfo);
    setSessionUploads(prev => [fileInfo, ...prev].slice(0, 5));
  }

  function handleReset() {
    setUploadedFile(null);
  }

  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={styles.hero}>
        <h1 className={styles.heading}>
          Drop a file.<br />Share a link.
        </h1>
        <p className={styles.subheading}>
          Instant file transfers — no accounts needed. Files expire after 1 hour.
        </p>
      </div>

      {/* Upload / Success area */}
      <div className={styles.uploadArea}>
        {uploadedFile ? (
          <SuccessCard fileInfo={uploadedFile} onReset={handleReset} />
        ) : (
          <UploadZone onSuccess={handleSuccess} />
        )}
      </div>

      {/* Recent uploads this session */}
      {!uploadedFile && sessionUploads.length > 0 && (
        <div className={styles.recentSection}>
          <RecentUploads uploads={sessionUploads} />
        </div>
      )}

      {/* Feature pills */}
      <div className={styles.features}>
        {[
          { icon: '⚡', label: 'Instant sharing' },
          { icon: '🔒', label: 'Auto-deleted in 1h' },
          { icon: '📱', label: 'Works on any device' },
          { icon: '🎬', label: 'Videos supported' },
          { icon: '📦', label: 'Up to 500 MB' },
        ].map(f => (
          <div key={f.label} className={styles.pill}>
            <span>{f.icon}</span>
            <span>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
