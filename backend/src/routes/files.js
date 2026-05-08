/**
 * File routes: upload, download, list, delete, QR code
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('../db');
const { optionalAuth, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Directory where uploaded files are stored
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// File expiry: 1 hour (in milliseconds)
const FILE_EXPIRY_MS = 60 * 60 * 1000;

// Max file size: 5GB
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;

// Multer storage: use UUID as filename to avoid conflicts
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    // Allow all file types
    cb(null, true);
  }
});

// POST /api/files/upload — upload a file
router.post('/upload', optionalAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const fileId = uuidv4();
  const expiresAt = new Date(Date.now() + FILE_EXPIRY_MS).toISOString();

  try {
    db.prepare(`
      INSERT INTO files (id, original_name, stored_name, mime_type, size, user_id, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      fileId,
      req.file.originalname,
      req.file.filename,
      req.file.mimetype,
      req.file.size,
      req.userId || null,
      expiresAt
    );

    // Build the share link (preview page) using the request host.
    // The actual file download lives at /download/:id (backend-only route).
    const host = `${req.protocol}://${req.get('host')}`;
    const downloadLink = `${host}/share/${fileId}`;

    res.status(201).json({
      id: fileId,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      downloadLink,
      expiresAt
    });
  } catch (err) {
    // Clean up uploaded file if DB insert fails
    fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// GET /api/files/:id/info — get file metadata (no download)
router.get('/:id/info', (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);

  if (!file) return res.status(404).json({ error: 'File not found' });

  const now = new Date();
  if (new Date(file.expires_at) < now) {
    return res.status(410).json({ error: 'This file has expired and been deleted' });
  }

  res.json({
    id: file.id,
    originalName: file.original_name,
    size: file.size,
    mimeType: file.mime_type,
    downloadCount: file.download_count,
    expiresAt: file.expires_at,
    createdAt: file.created_at
  });
});

// GET /api/files/:id/qr — generate QR code for download link
router.get('/:id/qr', async (req, res) => {
  const file = db.prepare('SELECT id FROM files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const host = `${req.protocol}://${req.get('host')}`;
  const downloadLink = `${host}/share/${file.id}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(downloadLink, {
      width: 256,
      margin: 2,
      color: { dark: '#FFFFFF', light: '#1C1C1E' }
    });
    res.json({ qrCode: qrDataUrl });
  } catch {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// GET /api/files/:id/stream — serve the file inline for in-browser preview
// Does NOT increment the download counter — only /download/:id does that.
router.get('/:id/stream', (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });

  if (new Date(file.expires_at) < new Date()) {
    return res.status(410).json({ error: 'File has expired' });
  }

  const filePath = path.join(UPLOADS_DIR, file.stored_name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

  // inline so the browser renders it rather than triggering a save dialog
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.original_name)}"`);
  res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
  res.setHeader('Accept-Ranges', 'bytes');
  res.sendFile(filePath);
});

// GET /api/files/:id/thumbnail — generate a JPEG thumbnail for video files
// Uses ffmpeg to extract one frame at the 1-second mark.
router.get('/:id/thumbnail', (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });
  if (!file.mime_type?.startsWith('video/')) {
    return res.status(400).json({ error: 'Not a video file' });
  }

  const filePath = path.join(UPLOADS_DIR, file.stored_name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

  const { spawn } = require('child_process');

  // Extract one frame at 00:00:01, output raw JPEG to stdout
  const ffmpeg = spawn('ffmpeg', [
    '-ss', '00:00:01',
    '-i', filePath,
    '-frames:v', '1',
    '-vf', 'scale=640:-1',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-q:v', '3',
    'pipe:1'
  ]);

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  ffmpeg.stdout.pipe(res);

  ffmpeg.stderr.on('data', () => {}); // suppress stderr noise

  ffmpeg.on('error', () => res.status(500).end());
  ffmpeg.on('close', code => {
    if (code !== 0 && !res.headersSent) res.status(500).end();
  });
});

// GET /api/files/my — list files for the logged-in user
router.get('/my', authenticateToken, (req, res) => {
  const files = db.prepare(`
    SELECT id, original_name, size, mime_type, download_count, expires_at, created_at
    FROM files
    WHERE user_id = ? AND expires_at > datetime('now')
    ORDER BY created_at DESC
    LIMIT 20
  `).all(req.userId);

  res.json({ files: files.map(f => ({
    id: f.id,
    originalName: f.original_name,
    size: f.size,
    mimeType: f.mime_type,
    downloadCount: f.download_count,
    expiresAt: f.expires_at,
    createdAt: f.created_at
  }))});
});

// DELETE /api/files/:id — delete a file (owner only)
router.delete('/:id', authenticateToken, (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);

  if (!file) return res.status(404).json({ error: 'File not found' });
  if (file.user_id !== req.userId) return res.status(403).json({ error: 'Not authorized' });

  try {
    const filePath = path.join(UPLOADS_DIR, file.stored_name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM files WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
