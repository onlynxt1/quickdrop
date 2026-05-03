/**
 * Download page — shown when someone opens a shared download link
 * Displays file info and a download button
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import styles from './DownloadPage.module.css';

export default function DownloadPage() {
  const { id } = useParams();
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [qrCode, setQrCode]   = useState('');
  const [showQr, setShowQr]   = useState(false);

  useEffect(() => {
    axios.get(`/api/files/${id}/info`)
      .then(res => setFile(res.data))
      .catch(err => {
        const msg = err.response?.data?.error || 'File not found';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleQr() {
    if (showQr) { setShowQr(false); return; }
    if (qrCode)  { setShowQr(true);  return; }
    try {
      const res = await axios.get(`/api/files/${id}/qr`);
      setQrCode(res.data.qrCode);
      setShowQr(true);
    } catch { /* silent */ }
  }

  function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function timeLeft(expiresAt) {
    const diff = new Date(expiresAt) - Date.now();
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} minutes`;
    const hrs = Math.floor(mins / 60);
    return `${hrs} hour${hrs > 1 ? 's' : ''}`;
  }

  function getFileEmoji(mimeType) {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/'))  return '🖼️';
    if (mimeType.startsWith('video/'))  return '🎬';
    if (mimeType.startsWith('audio/'))  return '🎵';
    if (mimeType.includes('pdf'))       return '📋';
    if (mimeType.includes('zip') || mimeType.includes('tar')) return '📦';
    if (mimeType.includes('text/'))     return '📝';
    return '📄';
  }

  if (loading) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.center}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 10v8M16 22v1" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round"/>
              <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <h2>{error.includes('expired') ? 'File Expired' : 'File Not Found'}</h2>
          <p>{error}</p>
          <a href="/" className={styles.homeLink}>Go back home</a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.center}>
      <div className={`${styles.card} animate-slideUp`}>
        {/* File icon + name */}
        <div className={styles.fileIcon}>
          <span>{getFileEmoji(file.mimeType)}</span>
        </div>
        <h2 className={styles.fileName}>{file.originalName}</h2>

        {/* Meta */}
        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Size</span>
            <span className={styles.metaValue}>{formatSize(file.size)}</span>
          </div>
          <div className={styles.metaDivider} />
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Downloads</span>
            <span className={styles.metaValue}>{file.downloadCount}</span>
          </div>
          <div className={styles.metaDivider} />
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Expires in</span>
            <span className={styles.metaValue}>{timeLeft(file.expiresAt)}</span>
          </div>
        </div>

        {/* Download button */}
        <a
          href={`/download/${id}`}
          className={styles.downloadBtn}
          download={file.originalName}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3v10M10 13l-4-4M10 13l4-4" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 17h14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Download File
        </a>

        {/* QR toggle */}
        <button className={styles.qrBtn} onClick={toggleQr}>
          {showQr ? 'Hide QR Code' : 'Show QR Code'}
        </button>

        {showQr && qrCode && (
          <div className={`${styles.qrPanel} animate-fadeIn`}>
            <p>Scan to download on another device</p>
            <img src={qrCode} alt="QR code" className={styles.qrImg} />
          </div>
        )}
      </div>
    </div>
  );
}
