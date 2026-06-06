/**
 * Auth page — Login and Signup forms (toggled)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './AuthPage.module.css';

export default function AuthPage() {
  const [mode, setMode]       = useState('login'); // 'login' | 'signup'
  const [form, setForm]       = useState({ username: '', email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await signup(form.username, form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError('');
    setForm({ username: '', email: '', password: '' });
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.card} animate-slideUp`}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <img src="/logo.png" alt="QuickDrop" height="36" style={{ borderRadius: 8 }} />
          <span className={styles.logoText}>QuickDrop</span>
        </div>

        <h2 className={styles.title}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p className={styles.subtitle}>
          {mode === 'login'
            ? 'Sign in to track your file history'
            : 'Sign up to save your file history'}
        </p>

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

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
              className={styles.input}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : null}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className={styles.toggle}>
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          {' '}
          <button className={styles.toggleBtn} onClick={toggle}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
