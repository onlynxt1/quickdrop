/**
 * QuickDrop Backend Server
 * Express app handling file uploads, downloads, and auth
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const db = require('./db');

const app = express();
// In production PORT=5000 (set by Replit). In dev, Express uses 3001 and Vite proxies to it.
const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 5000 : 3001);

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API Routes ──────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/files', require('./routes/files'));

// ── File Download Route ─────────────────────────────────────
// This handles /download/:id — the shareable link destination
app.get('/download/:id', (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);

  if (!file) {
    return res.status(404).send('File not found');
  }

  const now = new Date();
  if (new Date(file.expires_at) < now) {
    return res.status(410).send('This file has expired and been deleted');
  }

  const filePath = path.join(__dirname, '..', 'uploads', file.stored_name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found on server');
  }

  // Increment download counter
  db.prepare('UPDATE files SET download_count = download_count + 1 WHERE id = ?').run(file.id);

  // Send the file with the original filename
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
  res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
  res.sendFile(filePath);
});

// ── Auto-delete Expired Files ───────────────────────────────
// Runs every 5 minutes — deletes files past their expiry time
cron.schedule('*/5 * * * *', () => {
  try {
    const expiredFiles = db.prepare(
      "SELECT stored_name FROM files WHERE expires_at <= datetime('now')"
    ).all();

    expiredFiles.forEach(({ stored_name }) => {
      const filePath = path.join(__dirname, '..', 'uploads', stored_name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    const deleted = db.prepare(
      "DELETE FROM files WHERE expires_at <= datetime('now')"
    ).run();

    if (deleted.changes > 0) {
      console.log(`[Cleanup] Deleted ${deleted.changes} expired file(s)`);
    }
  } catch (err) {
    console.error('[Cleanup] Error during cleanup:', err.message);
  }
});

// ── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Serve Built Frontend in Production ──────────────────────
// In production the Vite build outputs to frontend/dist.
// Express serves those static files and falls back to index.html
// so that React Router's client-side routes work correctly.
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  // Catch-all: return index.html for any non-API route (SPA routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// ── Start Server ────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`QuickDrop API running on port ${PORT}`);
});
