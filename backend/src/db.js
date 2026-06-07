/**
 * Database setup using SQLite (better-sqlite3)
 * Creates tables for users, uploaded files, and download logs
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists.
// On Render free tier we use the local data folder. If a paid disk is attached later, we can set DB_PATH=/data.
const dataDir = process.env.DB_PATH || path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'quickdrop.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create files table (with last_downloaded_at for analytics)
db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER NOT NULL,
    user_id INTEGER,
    download_count INTEGER DEFAULT 0,
    last_downloaded_at DATETIME,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )
`);

// Migrate: add last_downloaded_at to existing databases that don't have it yet
try {
  db.exec(`ALTER TABLE files ADD COLUMN last_downloaded_at DATETIME`);
} catch {
  // Column already exists — safe to ignore
}

/**
 * download_logs — one row per download event
 *   file_id   : which file was downloaded
 *   user_id   : NULL if the downloader was not logged in
 *   username  : display name, "Guest" if not logged in
 *   created_at: when it happened
 *
 * We deliberately do NOT store IP addresses or any other
 * sensitive personal data.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS download_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id TEXT NOT NULL,
    user_id INTEGER,
    username TEXT NOT NULL DEFAULT 'Guest',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
  )
`);

/**
 * snippets — stores shared text notes and links
 *   id         : UUID primary key (used in the shareable URL)
 *   content    : the text, note, or URL the user shared
 *   user_id    : NULL if the author was not logged in
 *   expires_at : when the snippet should be auto-deleted
 *   created_at : when it was created
 *
 * We deliberately keep this table minimal — no tracking, no IP storage.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS snippets (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    user_id INTEGER,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )
`);

// ── Vault: encrypted personal file storage ────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS vault_folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    parent_id TEXT,
    color TEXT DEFAULT '#0A84FF',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES vault_folders(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS vault_files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    folder_id TEXT,
    iv TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES vault_folders(id) ON DELETE SET NULL
  )
`);

// ── Password reset tokens ─────────────────────────────────────
// Each row is a one-time-use link emailed to the user.
// token  : 64-char hex string, randomly generated
// used   : 1 once the password has been changed
// expires_at: 15 minutes from creation
db.exec(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

module.exports = db;
