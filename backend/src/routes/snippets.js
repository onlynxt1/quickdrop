/**
 * Snippet routes — create and retrieve shared text snippets
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// How long snippets live, keyed by the expiry option the user picks
const EXPIRY_OPTIONS = {
  '1h':  1  * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d':  7  * 24 * 60 * 60 * 1000,
};

const MAX_CONTENT_LENGTH = 50_000; // ~50 KB of text

// POST /api/snippets — create a new text snippet
router.post('/', optionalAuth, (req, res) => {
  const { content, expiry = '24h' } = req.body;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Content is required' });
  }
  if (content.trim().length === 0) {
    return res.status(400).json({ error: 'Content cannot be empty' });
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return res.status(400).json({ error: `Content exceeds ${MAX_CONTENT_LENGTH} character limit` });
  }
  if (!EXPIRY_OPTIONS[expiry]) {
    return res.status(400).json({ error: 'Invalid expiry option. Use: 1h, 24h, or 7d' });
  }

  const id = uuidv4();
  const expiresAt = new Date(Date.now() + EXPIRY_OPTIONS[expiry]).toISOString();

  db.prepare(`
    INSERT INTO snippets (id, content, user_id, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(id, content, req.userId || null, expiresAt);

  const host = `${req.protocol}://${req.get('host')}`;

  res.status(201).json({
    id,
    shareLink: `${host}/note/${id}`,
    expiresAt,
    characterCount: content.length
  });
});

// GET /api/snippets/:id/qr — QR code for a snippet's share link
router.get('/:id/qr', async (req, res) => {
  const snippet = db.prepare('SELECT id, expires_at FROM snippets WHERE id = ?').get(req.params.id);
  if (!snippet) return res.status(404).json({ error: 'Snippet not found' });
  if (new Date(snippet.expires_at) < new Date()) {
    return res.status(410).json({ error: 'This snippet has expired' });
  }

  const url = `${req.protocol}://${req.get('host')}/note/${snippet.id}`;
  try {
    const qrCode = await QRCode.toDataURL(url, {
      width: 256,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
    res.json({ qrCode });
  } catch {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// GET /api/snippets/:id — retrieve a snippet by ID
router.get('/:id', (req, res) => {
  const snippet = db.prepare(`
    SELECT id, content, expires_at, created_at
    FROM snippets WHERE id = ?
  `).get(req.params.id);

  if (!snippet) {
    return res.status(404).json({ error: 'Snippet not found' });
  }

  if (new Date(snippet.expires_at) < new Date()) {
    return res.status(410).json({ error: 'This snippet has expired' });
  }

  res.json({
    id: snippet.id,
    content: snippet.content,
    expiresAt: snippet.expires_at,
    createdAt: snippet.created_at,
    characterCount: snippet.content.length
  });
});

module.exports = router;
