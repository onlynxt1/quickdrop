/**
 * Vault — secure encrypted personal file storage
 * Files are encrypted with AES-256-CBC (per-user key) before storage on disk.
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// ── Storage directories ───────────────────────────────────────
const VAULT_DIR = path.join(__dirname, '../../vault');
const VAULT_TEMP_DIR = path.join(__dirname, '../../vault_temp');
[VAULT_DIR, VAULT_TEMP_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── Encryption ────────────────────────────────────────────────
const MASTER_SECRET = process.env.JWT_SECRET || 'quickdrop-secret-key-change-in-production';

function deriveKey(userId) {
  return crypto.pbkdf2Sync(MASTER_SECRET, `vault-user-${userId}`, 100_000, 32, 'sha256');
}

// ── Multer (temp disk → encrypt → vault dir) ──────────────────
const upload = multer({
  dest: VAULT_TEMP_DIR,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2 GB
});

// ═══════════════════════════════════════════════════════════════
// FOLDERS
// ═══════════════════════════════════════════════════════════════

// GET /api/vault/folders
router.get('/folders', authenticateToken, (req, res) => {
  const folders = db.prepare(
    'SELECT * FROM vault_folders WHERE user_id = ? ORDER BY name'
  ).all(req.userId);
  res.json({ folders });
});

// POST /api/vault/folders
router.post('/folders', authenticateToken, (req, res) => {
  const { name, parent_id = null, color = '#0A84FF' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Folder name required' });
  const id = uuidv4();
  db.prepare(
    'INSERT INTO vault_folders (id, name, user_id, parent_id, color) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name.trim(), req.userId, parent_id || null, color);
  res.json({ id, name: name.trim(), parent_id: parent_id || null, color, created_at: new Date().toISOString() });
});

// PUT /api/vault/folders/:id
router.put('/folders/:id', authenticateToken, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Folder name required' });
  const r = db.prepare('UPDATE vault_folders SET name = ? WHERE id = ? AND user_id = ?')
    .run(name.trim(), req.params.id, req.userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Folder not found' });
  res.json({ success: true });
});

// DELETE /api/vault/folders/:id
router.delete('/folders/:id', authenticateToken, (req, res) => {
  // Move files inside to root before deleting folder
  db.prepare('UPDATE vault_files SET folder_id = NULL WHERE folder_id = ? AND user_id = ?')
    .run(req.params.id, req.userId);
  db.prepare('DELETE FROM vault_folders WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.userId);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════
// FILES
// ═══════════════════════════════════════════════════════════════

// GET /api/vault/files
router.get('/files', authenticateToken, (req, res) => {
  const { folder_id, search } = req.query;
  let sql = 'SELECT * FROM vault_files WHERE user_id = ?';
  const params = [req.userId];

  if (folder_id !== undefined) {
    if (folder_id === 'null' || folder_id === '') {
      sql += ' AND folder_id IS NULL';
    } else {
      sql += ' AND folder_id = ?';
      params.push(folder_id);
    }
  }
  if (search) {
    sql += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }
  sql += ' ORDER BY created_at DESC';
  res.json({ files: db.prepare(sql).all(...params) });
});

// GET /api/vault/stats
router.get('/stats', authenticateToken, (req, res) => {
  const stats = db.prepare(
    'SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM vault_files WHERE user_id = ?'
  ).get(req.userId);
  res.json(stats);
});

// POST /api/vault/files/upload — encrypt & store
router.post('/files/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const { folder_id, name } = req.body;
  const displayName = name?.trim() || req.file.originalname;
  const storedName = uuidv4();
  const vaultPath = path.join(VAULT_DIR, storedName);
  const tmpPath = req.file.path;

  try {
    const key = deriveKey(req.userId);
    const iv = crypto.randomBytes(16);

    await new Promise((resolve, reject) => {
      const rd = fs.createReadStream(tmpPath);
      const wr = fs.createWriteStream(vaultPath);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      rd.pipe(cipher).pipe(wr);
      wr.on('finish', resolve);
      wr.on('error', reject);
      rd.on('error', reject);
    });

    fs.unlinkSync(tmpPath);

    const id = uuidv4();
    db.prepare(`
      INSERT INTO vault_files (id, name, stored_name, mime_type, size, user_id, folder_id, iv)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, displayName, storedName, req.file.mimetype, req.file.size,
           req.userId, folder_id || null, iv.toString('hex'));

    res.json({ file: db.prepare('SELECT * FROM vault_files WHERE id = ?').get(id) });
  } catch (err) {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    if (fs.existsSync(vaultPath)) fs.unlinkSync(vaultPath);
    console.error('[Vault] Upload error:', err.message);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// GET /api/vault/files/:id/download — decrypt & send as attachment
router.get('/files/:id/download', authenticateToken, (req, res) => {
  const file = db.prepare('SELECT * FROM vault_files WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const vaultPath = path.join(VAULT_DIR, file.stored_name);
  if (!fs.existsSync(vaultPath)) return res.status(404).json({ error: 'File missing from disk' });

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
  res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');

  const decipher = crypto.createDecipheriv('aes-256-cbc', deriveKey(req.userId), Buffer.from(file.iv, 'hex'));
  fs.createReadStream(vaultPath).pipe(decipher).pipe(res);
});

// GET /api/vault/files/:id/preview — decrypt & stream inline (no download header)
router.get('/files/:id/preview', authenticateToken, (req, res) => {
  const file = db.prepare('SELECT * FROM vault_files WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const vaultPath = path.join(VAULT_DIR, file.stored_name);
  if (!fs.existsSync(vaultPath)) return res.status(404).json({ error: 'File missing from disk' });

  res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');

  const decipher = crypto.createDecipheriv('aes-256-cbc', deriveKey(req.userId), Buffer.from(file.iv, 'hex'));
  fs.createReadStream(vaultPath).pipe(decipher).pipe(res);
});

// PUT /api/vault/files/:id — rename and/or move
router.put('/files/:id', authenticateToken, (req, res) => {
  const { name, folder_id } = req.body;
  const sets = [];
  const params = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name.trim()); }
  if (folder_id !== undefined) { sets.push('folder_id = ?'); params.push(folder_id || null); }
  if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  params.push(req.params.id, req.userId);
  const r = db.prepare(`UPDATE vault_files SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
  if (r.changes === 0) return res.status(404).json({ error: 'File not found' });
  res.json({ success: true });
});

// DELETE /api/vault/files/:id
router.delete('/files/:id', authenticateToken, (req, res) => {
  const file = db.prepare('SELECT * FROM vault_files WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);
  if (!file) return res.status(404).json({ error: 'File not found' });
  const vaultPath = path.join(VAULT_DIR, file.stored_name);
  if (fs.existsSync(vaultPath)) fs.unlinkSync(vaultPath);
  db.prepare('DELETE FROM vault_files WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

module.exports = router;
