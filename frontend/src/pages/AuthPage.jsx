/**
 * Auth page — Login, Signup, and Reset Password forms (toggled)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import styles from './AuthPage.module.css';

export default function AuthPage() {
  const [mode, setMode]       = useState('login'); // 'login' | 'signup' | 'reset'
  const [form, setForm]       = useState({ username: '', email: '', password: '', newPassword: '' });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        navigate('/');
      } else if (mode === 'signup') {
        await signup(form.username, form.email, form.password);
        navigate('/');
      } else if (mode === 'reset') {
        await axios.post('/api/auth/reset-password', {
          email: form.email,
          newPassword: form.newPassword,
        });
        setSuccess('Password reset! You can now sign in with your new password.');
        setForm(prev => ({ ...prev, newPassword: '' }));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError('');
    setSuccess('');
    setForm({ username: '', email: '', password: '', newPassword: '' });
  }

  const titles = {
    login:  'Welcome back',
    signup: 'Create account',
    reset:  'Reset password',
  };
  const subtitles = {
    login:  'Sign in to track your file history',
    signup: 'Sign up to save your file history',
    reset:  'Enter your email and choose a new password',
  };

  return (
    <div className={styles.page}>
      <div className={`${styles.card} animate-slideUp`}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <img src="/logo.png" alt="QuickDrop" height="36" style={{ borderRadius: 8 }} />
          <span className={styles.logoText}>QuickDrop</span>
        </div>

        <h2 className={styles.title}>{titles[mode]}</h2>
        <p className={styles.subtitle}>{subtitles[mode]}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === 'signup' && (
            <div className={styles.field}>
              <label className={styles.label}>Username</label>
              <input
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                placeholder="yourname"
                className={styles.input}
                required
                autoComplete="username"
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={styles.input}
              required
              autoComplete="email"
            />
          </div>

          {mode === 'login' && (
            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={styles.input}
                required
                autoComplete="current-password"
              />
            </div>
          )}

          {mode === 'signup' && (
            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className={styles.input}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {mode === 'reset' && (
            <div className={styles.field}>
              <label className={styles.label}>New Password</label>
              <input
                name="newPassword"
                type="password"
                value={form.newPassword}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className={styles.input}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {error   && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.successMsg}>{success}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : null}
            {mode === 'login'  ? 'Sign in'        : null}
            {mode === 'signup' ? 'Create account' : null}
            {mode === 'reset'  ? 'Reset password' : null}
          </button>
        </form>

        {/* Forgot password link — only on login */}
        {mode === 'login' && (
          <p className={styles.toggle}>
            <button className={styles.toggleBtn} onClick={() => switchMode('reset')}>
              Forgot password?
            </button>
          </p>
        )}

        {/* Switch between login and signup */}
        {(mode === 'login' || mode === 'signup') && (
          <p className={styles.toggle}>
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            {' '}
            <button className={styles.toggleBtn} onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        )}

        {/* Back to sign in — on reset */}
        {mode === 'reset' && (
          <p className={styles.toggle}>
            Remember your password?{' '}
            <button className={styles.toggleBtn} onClick={() => switchMode('login')}>
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
