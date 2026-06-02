/**
 * ResetPasswordPage — destination for emailed password reset links.
 * URL: /reset-password?token=<64-char-hex>
 */
import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './AuthPage.module.css';

export default function ResetPasswordPage() {
  const [searchParams]        = useSearchParams();
  const token                 = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  const navigate = useNavigate();

  // No token in URL — show an error right away
  if (!token) {
    return (
      <div className={styles.page}>
        <div className={`${styles.card} animate-slideUp`}>
          <div className={styles.logoRow}>
            <img src="/logo.png" alt="QuickDrop" height="36" style={{ borderRadius: 8 }} />
            <span className={styles.logoText}>QuickDrop</span>
          </div>
          <h2 className={styles.title}>Invalid link</h2>
          <p className={styles.subtitle}>
            This reset link is missing or broken. Please request a new one.
          </p>
          <button className={styles.submitBtn} onClick={() => navigate('/auth')}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/auth/reset-password', { token, newPassword: password });
      setSuccess('Password updated! Redirecting you to sign in…');
      setDone(true);
      setTimeout(() => navigate('/auth'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.card} animate-slideUp`}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <img src="/logo.png" alt="QuickDrop" height="36" style={{ borderRadius: 8 }} />
          <span className={styles.logoText}>QuickDrop</span>
        </div>

        <h2 className={styles.title}>Choose a new password</h2>
        <p className={styles.subtitle}>
          Pick something strong — at least 6 characters.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>New password</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="At least 6 characters"
              className={styles.input}
              required
              autoComplete="new-password"
              disabled={done}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(''); }}
              placeholder="Type it again"
              className={styles.input}
              required
              autoComplete="new-password"
              disabled={done}
            />
          </div>

          {error   && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.successMsg}>{success}</p>}

          {!done && (
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : null}
              Update password
            </button>
          )}
        </form>

        {!done && (
          <p className={styles.toggle}>
            Remembered it?{' '}
            <button className={styles.toggleBtn} onClick={() => navigate('/auth')}>
              Sign in instead
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
