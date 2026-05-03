/**
 * JWT authentication middleware
 * Supports both required and optional authentication
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'quickdrop-secret-key-change-in-production';

// Require a valid JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Optionally attach user if token is present but don't block
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
    } catch {
      // Token invalid — continue as guest
    }
  }
  next();
}

module.exports = { authenticateToken, optionalAuth };
