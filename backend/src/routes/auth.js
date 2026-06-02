/**
 * Authentication routes: signup, login, me,
 * forgot-password (emails 6-digit code), reset-password (validates code)
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
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
    ).run(username, email, passwordHash);

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
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
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
// Generates a 6-digit code and emails it. Always 200 to prevent account enumeration.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = db.prepare('SELECT id, username FROM users WHERE email = ?').get(email);

    if (user) {
      // Invalidate any previous unused codes for this user
      db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0')
        .run(user.id);

      // 6-digit code — cryptographically random
      const code = String(crypto.randomInt(100000, 1000000));
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

      db.prepare(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
      ).run(user.id, code, expiresAt);

      const { error: sendError } = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: `${code} — your QuickDrop reset code`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"/></head>
          <body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;">
              <tr><td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                  <tr>
                    <td style="background:#0A84FF;padding:28px 36px;">
                      <span style="color:white;font-size:20px;font-weight:700;letter-spacing:-0.3px;">QuickDrop</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:36px 36px 12px;">
                      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1d1d1f;letter-spacing:-0.4px;">Your reset code</h1>
                      <p style="margin:0 0 28px;font-size:15px;color:#6e6e73;line-height:1.6;">
                        Hi ${user.username}, enter this code in QuickDrop to reset your password.
                        It expires in <strong>15 minutes</strong>.
                      </p>
                      <div style="background:#f5f5f7;border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
                        <span style="font-size:48px;font-weight:800;letter-spacing:12px;color:#0A84FF;font-variant-numeric:tabular-nums;">${code}</span>
                      </div>
                      <p style="margin:0;font-size:13px;color:#6e6e73;line-height:1.6;">
                        If you didn't request this, ignore this email — your password won't change.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 36px 28px;border-top:1px solid #f0f0f5;margin-top:20px;">
                      <p style="margin:0;font-size:12px;color:#aeaeb2;text-align:center;">
                        QuickDrop · Instant file &amp; note sharing
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

      if (sendError) {
        // Log the error but don't block — code is already in the DB.
        // On Resend's free sandbox, delivery only works to the verified account email.
        console.error('Resend send error (sandbox limitation?):', sendError);
      }
    }

    res.json({ message: 'If an account with that email exists, a 6-digit code has been sent.' });
  } catch (err) {
    console.error('Forgot-password error:', err);
    res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
  }
});

// ── Reset password ────────────────────────────────────────────
// Takes email + 6-digit code + new password. All validated server-side.
router.post('/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code, and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(400).json({ error: 'Incorrect code. Please try again.' });
    }

    const row = db.prepare(
      'SELECT * FROM password_reset_tokens WHERE user_id = ? AND token = ? AND used = 0'
    ).get(user.id, code);

    if (!row) {
      return res.status(400).json({ error: 'Incorrect code. Please try again.' });
    }
    if (new Date(row.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This code has expired. Please request a new one.' });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(row.id);

    res.json({ message: 'Password updated successfully. You can now sign in.' });
  } catch (err) {
    console.error('Reset-password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
