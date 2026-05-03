/**
 * UploadZone — drag-and-drop file upload with progress bar
 * Accepts a single file, shows upload progress, then calls onSuccess with file info
 */
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import styles from './UploadZone.module.css';

const MAX_SIZE = 500 * 1024 * 1024; // 500 MB

export default function UploadZone({ onSuccess }) {
  const [progress, setProgress]   = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');

  const uploadFile = useCallback(async (file) => {
    if (file.size > MAX_SIZE) {
      setError('File is too large. Maximum size is 500 MB.');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [onSuccess]);

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) uploadFile(accepted[0]);
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled: uploading
  });

  const zoneClass = [
    styles.zone,
    isDragActive  ? styles.active  : '',
    isDragReject  ? styles.reject  : '',
    uploading     ? styles.busy    : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.wrapper}>
      <div {...getRootProps({ className: zoneClass })}>
        <input {...getInputProps()} />

        {uploading ? (
          <div className={styles.uploadingState}>
            <div className={styles.spinnerRing} />
            <p className={styles.uploadingLabel}>Uploading…</p>
            <p className={styles.progressLabel}>{progress}%</p>
          </div>
        ) : (
          <div className={styles.idleState}>
            <div className={styles.iconWrap}>
              {isDragActive ? (
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M24 8v24M24 32l-8-8M24 32l8-8" stroke="#0A84FF" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 40h32" stroke="#0A84FF" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M24 30V14M24 14l-7 7M24 14l7 7" stroke="rgba(255,255,255,0.5)"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 34c-3.3-1.2-6-4.3-6-8 0-4.4 3.2-8 7.3-8.7A12 12 0 0136 22c0 .4 0 .8-.1 1.2C38.4 24.2 40 26.5 40 29.3c0 3.2-2.4 5.8-5.5 5.8H13.6" 
                    stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              )}
            </div>

            {isDragActive ? (
              <p className={styles.dragLabel}>Drop it here</p>
            ) : (
              <>
                <p className={styles.mainLabel}>
                  Drag &amp; drop your file here
                </p>
                <p className={styles.subLabel}>or click to browse</p>
                <p className={styles.limitLabel}>Up to 500 MB · Videos, images &amp; more</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className={styles.progressTrack}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && <p className={styles.errorMsg}>{error}</p>}
    </div>
  );
}
