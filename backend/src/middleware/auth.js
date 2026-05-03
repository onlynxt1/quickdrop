/**
 * JWT authentication middleware
 * Supports both required and optional authentication.
 * Attaches req.userId and req.username to the request when a valid token is present.
 */
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'quickdrop-secret-key-change-in-production';

// Require a valid JWT token — blocks the request with 401/403 if missing/invalid
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;

    // Look up username so routes can use it without an extra query
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(decoded.userId);
    req.username = user ? user.username : 'Unknown';

    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Optionally attach user info if token is present, but never block the request
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;

      // Look up username for the download log
      const user = db.prepare('SELECT username FROM users WHERE id = ?').get(decoded.userId);
      req.username = user ? user.username : 'Unknown';
    } catch {
      // Invalid token — treat request as guest, continue normally
    }
  }
  next();
}

module.exports = { authenticateToken, optionalAuth };
