/**
 * Analytics routes
 * All endpoints here are restricted to the file owner only.
 */
const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/analytics/:fileId
 * Returns download stats + recent download log for one file.
 * Only the user who uploaded the file can access this.
 */
router.get('/:fileId', authenticateToken, (req, res) => {
  const { fileId } = req.params;

  // Fetch the file and verify ownership
  const file = db.prepare(`
    SELECT id, original_name, download_count, last_downloaded_at, user_id, expires_at
    FROM files WHERE id = ?
  `).get(fileId);

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Reject if the requester is not the file owner
  if (file.user_id !== req.userId) {
    return res.status(403).json({ error: 'Not authorized to view analytics for this file' });
  }

  // Fetch the 20 most recent download log entries for this file
  const logs = db.prepare(`
    SELECT username, created_at
    FROM download_logs
    WHERE file_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(fileId);

  res.json({
    fileId: file.id,
    fileName: file.original_name,
    totalDownloads: file.download_count,
    lastDownloadedAt: file.last_downloaded_at,
    recentDownloads: logs.map(l => ({
      username: l.username,
      downloadedAt: l.created_at
    }))
  });
});

module.exports = router;
