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
const { optionalAuth } = require('./middleware/auth');

const app = express();
// PORT is set by Render in production. Falls back to 3001 for local dev.
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────
// Only accept requests from the Netlify frontend and local dev.
const ALLOWED_ORIGINS = [
  'https://quickdropfiles.netlify.app',
  'http://localhost:5000',
  'http://localhost:3000',
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API Routes ──────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/files',     require('./routes/files'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/snippets',  require('./routes/snippets'));
app.use('/api/vault',     require('./routes/vault'));

// ── File Download Route ─────────────────────────────────────
// optionalAuth attaches req.userId + req.username if a valid JWT is present,
// but doesn't block the request if there's no token (guest downloads are fine).
app.get('/download/:id', optionalAuth, (req, res) => {
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

  // ── Analytics: record this download ──────────────────────
  // Determine who is downloading (logged-in user or guest)
  const downloaderId = req.userId || null;
  const downloaderName = req.username || 'Guest';

  // Increment total download count and set last_downloaded_at timestamp
  db.prepare(`
    UPDATE files
    SET download_count = download_count + 1,
        last_downloaded_at = datetime('now')
    WHERE id = ?
  `).run(file.id);

  // Insert a row into the download log (no IP — privacy-first)
  db.prepare(`
    INSERT INTO download_logs (file_id, user_id, username)
    VALUES (?, ?, ?)
  `).run(file.id, downloaderId, downloaderName);

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
