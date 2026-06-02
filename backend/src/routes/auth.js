/**
 * Authentication routes: signup, login, get current user,
 * forgot-password (sends email), reset-password (validates token)
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Resend } = require('resend');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'quickdrop-secret-key-change-in-production';
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Signup ────────────────────────────────────────────────────
router.post('/signup', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const passwordHash = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
    );
    const result = stmt.run(username, email, passwordHash);

    const user = { id: result.lastInsertRowid, username, email };
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      const field = err.message.includes('username') ? 'Username' : 'Email';
      return res.status(409).json({ error: `${field} is already taken` });
    }
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// ── Login ─────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── Me ────────────────────────────────────────────────────────
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// ── Forgot password ───────────────────────────────────────────
// Accepts an email, generates a one-time token, and mails a reset link.
// Always responds with 200 so we don't reveal whether the email exists.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = db.prepare('SELECT id, username FROM users WHERE email = ?').get(email);

    if (user) {
      // Invalidate any previous unused tokens for this user
      db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0')
        .run(user.id);

      // Generate a secure random 64-char hex token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

      db.prepare(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
      ).run(user.id, token, expiresAt);

      // Build the reset URL — works in both dev and prod
      const host = `${req.protocol}://${req.get('host')}`;
      const resetUrl = `${host}/reset-password?token=${token}`;

      // Send email via Resend
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'Reset your QuickDrop password',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;">
              <tr><td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                  <!-- Header -->
                  <tr>
                    <td style="background:#0A84FF;padding:28px 36px;">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-right:10px;">
                            <div style="width:32px;height:32px;background:rgba(255,255,255,0.2);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;">
                              <span style="color:white;font-size:18px;">↓</span>
                            </div>
                          </td>
                          <td>
                            <span style="color:white;font-size:18px;font-weight:700;letter-spacing:-0.3px;">QuickDrop</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:36px 36px 28px;">
                      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1d1d1f;letter-spacing:-0.4px;">Reset your password</h1>
                      <p style="margin:0 0 24px;font-size:15px;color:#6e6e73;line-height:1.6;">
                        Hi ${user.username}, we received a request to reset your QuickDrop password.
                        Click the button below to choose a new one.
                      </p>
                      <a href="${resetUrl}"
                         style="display:inline-block;background:#0A84FF;color:white;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:600;letter-spacing:-0.1px;">
                        Reset Password
                      </a>
                      <p style="margin:24px 0 0;font-size:13px;color:#6e6e73;line-height:1.6;">
                        This link expires in <strong>15 minutes</strong>. If you didn't request a
                        password reset, you can safely ignore this email — your password won't change.
                      </p>
                    </td>
                  </tr>
                  <!-- Link fallback -->
                  <tr>
                    <td style="padding:0 36px 28px;">
                      <p style="margin:0;font-size:12px;color:#aeaeb2;">
                        Or copy this link into your browser:<br/>
                        <a href="${resetUrl}" style="color:#0A84FF;word-break:break-all;">${resetUrl}</a>
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding:20px 36px;border-top:1px solid #f0f0f5;">
                      <p style="margin:0;font-size:12px;color:#aeaeb2;text-align:center;">
                        QuickDrop · Instant file & note sharing
                      </p>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>
          </body>
          </html>
        `,
      });
    }

    // Always 200 — don't reveal whether the email exists
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot-password error:', err);
    res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
  }
});

// ── Reset password ────────────────────────────────────────────
// Validates the token and updates the password.
router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const row = db.prepare(
      'SELECT * FROM password_reset_tokens WHERE token = ?'
    ).get(token);

    if (!row) {
      return res.status(400).json({ error: 'This reset link is invalid.' });
    }
    if (row.used) {
      return res.status(400).json({ error: 'This reset link has already been used.' });
    }
    if (new Date(row.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, row.user_id);

    // Invalidate the token immediately after use
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(row.id);

    res.json({ message: 'Password updated successfully. You can now sign in.' });
  } catch (err) {
    console.error('Reset-password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
