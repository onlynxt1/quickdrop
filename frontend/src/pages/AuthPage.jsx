/**
 * Auth page — Login, Signup, and Forgot Password forms (toggled)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import styles from './AuthPage.module.css';

export default function AuthPage() {
  const [mode, setMode]       = useState('login'); // 'login' | 'signup' | 'forgot'
  const [form, setForm]       = useState({ username: '', email: '', password: '' });
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
      } else if (mode === 'forgot') {
        await axios.post('/api/auth/forgot-password', { email: form.email });
        setSuccess("If that email is registered, you'll receive a reset link shortly. Check your inbox.");
        setForm(prev => ({ ...prev, email: '' }));
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
    setForm({ username: '', email: '', password: '' });
  }

  const titles = {
    login:  'Welcome back',
    signup: 'Create account',
    forgot: 'Forgot password?',
  };
  const subtitles = {
    login:  'Sign in to track your file history',
    signup: 'Sign up to save your file history',
    forgot: "Enter your email and we'll send you a reset link",
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

          {(mode === 'login' || mode === 'signup') && (
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
          )}

          {error   && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.successMsg}>{success}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : null}
            {mode === 'login'  && 'Sign in'}
            {mode === 'signup' && 'Create account'}
            {mode === 'forgot' && 'Send reset link'}
          </button>
        </form>

        {/* Forgot password link — only on login */}
        {mode === 'login' && (
          <p className={styles.toggle}>
            <button className={styles.toggleBtn} onClick={() => switchMode('forgot')}>
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

        {/* Back to sign in — on forgot */}
        {mode === 'forgot' && (
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
