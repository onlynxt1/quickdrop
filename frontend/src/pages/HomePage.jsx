/**
 * Home page — file upload + text sharing, with a tab switcher between the two.
 */
import { useState } from 'react';
import UploadZone from '../components/UploadZone';
import SuccessCard from '../components/SuccessCard';
import TextShare from '../components/TextShare';
import SnippetSuccessCard from '../components/SnippetSuccessCard';
import RecentUploads from '../components/RecentUploads';
import styles from './HomePage.module.css';

export default function HomePage() {
  // Which tab is active: 'file' or 'text'
  const [tab, setTab] = useState('file');

  // File upload state
  const [uploadedFile, setUploadedFile]     = useState(null);
  const [sessionUploads, setSessionUploads] = useState([]);

  // Text/snippet state
  const [sharedSnippet, setSharedSnippet] = useState(null);

  function handleFileSuccess(fileInfo) {
    setUploadedFile(fileInfo);
    setSessionUploads(prev => [fileInfo, ...prev].slice(0, 5));
  }

  function handleSnippetSuccess(snippetInfo) {
    setSharedSnippet(snippetInfo);
  }

  function resetFile()    { setUploadedFile(null); }
  function resetSnippet() { setSharedSnippet(null); }

  const showSuccess = tab === 'file' ? !!uploadedFile : !!sharedSnippet;

  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <div className={styles.hero}>
        <h1 className={styles.heading}>
          Drop a file.<br />Share a link.
        </h1>
        <p className={styles.subheading}>
          Instant transfers — no accounts needed. Files and notes expire after 1 hour.
        </p>
      </div>

      {/* ── Tab switcher ── */}
      {!showSuccess && (
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${tab === 'file' ? styles.tabActive : ''}`}
            onClick={() => setTab('file')}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M8.5 1H4a1 1 0 00-1 1v11a1 1 0 001 1h7a1 1 0 001-1V5.5L8.5 1z"
                stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M8.5 1v4.5H13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            File
          </button>
          <button
            className={`${styles.tab} ${tab === 'text' ? styles.tabActive : ''}`}
            onClick={() => setTab('text')}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M2 4h11M2 7.5h8M2 11h6" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round"/>
            </svg>
            Text
          </button>
        </div>
      )}

      {/* ── Main area ── */}
      <div className={styles.uploadArea}>
        {tab === 'file' ? (
          uploadedFile ? (
            <SuccessCard fileInfo={uploadedFile} onReset={resetFile} />
          ) : (
            <UploadZone onSuccess={handleFileSuccess} />
          )
        ) : (
          sharedSnippet ? (
            <SnippetSuccessCard snippetInfo={sharedSnippet} onReset={resetSnippet} />
          ) : (
            <TextShare onSuccess={handleSnippetSuccess} />
          )
        )}
      </div>

      {/* ── Recent file uploads (file tab only, no success card shown) ── */}
      {tab === 'file' && !uploadedFile && sessionUploads.length > 0 && (
        <div className={styles.recentSection}>
          <RecentUploads uploads={sessionUploads} />
        </div>
      )}

      {/* ── Feature pills ── */}
      {!showSuccess && (
        <div className={styles.features}>
          {[
            { icon: '⚡', label: 'Instant sharing' },
            { icon: '🔒', label: 'Auto-deleted in 1h' },
            { icon: '📱', label: 'Works on any device' },
            { icon: '🎬', label: 'Videos supported' },
            { icon: '📦', label: 'Up to 5 GB' },
          ].map(f => (
            <div key={f.label} className={styles.pill}>
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
