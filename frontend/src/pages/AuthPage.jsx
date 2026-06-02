/**
 * Auth page — Login, Signup, and 2-step Password Reset
 *
 * Reset flow:
 *   'forgot'  → user enters email → we send a 6-digit code
 *   'verify'  → user enters the code + new password → done
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import styles from './AuthPage.module.css';

export default function AuthPage() {
  const [mode, setMode]         = useState('login'); // 'login' | 'signup' | 'forgot' | 'verify'
  const [email, setEmail]       = useState('');
  const [form, setForm]         = useState({ username: '', password: '' });
  const [code, setCode]         = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);

  const codeRefs = useRef([]);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  function handleFormChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  // ── Code digit input handlers ─────────────────────────────
  function handleCodeChange(i, val) {
    // Accept only digits
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[i] = digit;
    setCode(next);
    setError('');
    // Auto-advance
    if (digit && i < 5) codeRefs.current[i + 1]?.focus();
  }

  function handleCodeKeyDown(i, e) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      codeRefs.current[i - 1]?.focus();
    }
  }

  function handleCodePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      codeRefs.current[5]?.focus();
      e.preventDefault();
    }
  }

  // ── Submit handlers ───────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password');
    } finally { setLoading(false); }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await signup(form.username, email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally { setLoading(false); }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await axios.post('/api/auth/forgot-password', { email });
      setMode('verify');
      setCode(['', '', '', '', '', '']);
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send code. Try again.');
    } finally { setLoading(false); }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (newPassword !== confirmPw) { setError("Passwords don't match."); return; }
    setLoading(true); setError('');
    try {
      await axios.post('/api/auth/reset-password', {
        email,
        code: code.join(''),
        newPassword,
      });
      setSuccess('Password updated! Taking you to sign in…');
      setTimeout(() => { switchMode('login'); }, 2200);
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect code or it has expired.');
    } finally { setLoading(false); }
  }

  function switchMode(next) {
    setMode(next);
    setError(''); setSuccess('');
    setForm({ username: '', password: '' });
    setCode(['', '', '', '', '', '']);
    setNewPassword(''); setConfirmPw('');
    if (next === 'login' || next === 'signup') setEmail('');
  }

  // ── Shared logo header ────────────────────────────────────
  const Logo = () => (
    <div className={styles.logoRow}>
      <img src="/logo.png" alt="QuickDrop" height="36" style={{ borderRadius: 8 }} />
      <span className={styles.logoText}>QuickDrop</span>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // LOGIN
  // ════════════════════════════════════════════════════════════
  if (mode === 'login') return (
    <div className={styles.page}>
      <div className={`${styles.card} animate-slideUp`}>
        <Logo />
        <h2 className={styles.title}>Welcome back</h2>
        <p className={styles.subtitle}>Sign in to track your file history</p>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="you@example.com" className={styles.input} required autoComplete="email" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input name="password" type="password" value={form.password} onChange={handleFormChange}
              placeholder="••••••••" className={styles.input} required autoComplete="current-password" />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading && <span className={styles.spinner} />} Sign in
          </button>
        </form>

        <p className={styles.toggle}>
          <button className={styles.toggleBtn} onClick={() => switchMode('forgot')}>Forgot password?</button>
        </p>
        <p className={styles.toggle}>
          Don't have an account?{' '}
          <button className={styles.toggleBtn} onClick={() => switchMode('signup')}>Sign up</button>
        </p>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // SIGNUP
  // ════════════════════════════════════════════════════════════
  if (mode === 'signup') return (
    <div className={styles.page}>
      <div className={`${styles.card} animate-slideUp`}>
        <Logo />
        <h2 className={styles.title}>Create account</h2>
        <p className={styles.subtitle}>Sign up to save your file history</p>

        <form onSubmit={handleSignup} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Username</label>
            <input name="username" type="text" value={form.username} onChange={handleFormChange}
              placeholder="yourname" className={styles.input} required autoComplete="username" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="you@example.com" className={styles.input} required autoComplete="email" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input name="password" type="password" value={form.password} onChange={handleFormChange}
              placeholder="At least 6 characters" className={styles.input} required autoComplete="new-password" />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading && <span className={styles.spinner} />} Create account
          </button>
        </form>

        <p className={styles.toggle}>
          Already have an account?{' '}
          <button className={styles.toggleBtn} onClick={() => switchMode('login')}>Sign in</button>
        </p>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // FORGOT — step 1: enter email to receive code
  // ════════════════════════════════════════════════════════════
  if (mode === 'forgot') return (
    <div className={styles.page}>
      <div className={`${styles.card} animate-slideUp`}>
        <Logo />
        <h2 className={styles.title}>Forgot password?</h2>
        <p className={styles.subtitle}>We'll email you a 6-digit code to reset it</p>

        <form onSubmit={handleForgot} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="you@example.com" className={styles.input} required autoComplete="email" />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading && <span className={styles.spinner} />} Send code
          </button>
        </form>

        <p className={styles.toggle}>
          Remember it?{' '}
          <button className={styles.toggleBtn} onClick={() => switchMode('login')}>Sign in</button>
        </p>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // VERIFY — step 2: enter code + new password
  // ════════════════════════════════════════════════════════════
  return (
    <div className={styles.page}>
      <div className={`${styles.card} animate-slideUp`}>
        <Logo />
        <h2 className={styles.title}>Check your email</h2>
        <p className={styles.subtitle}>
          We sent a 6-digit code to <strong>{email}</strong>
        </p>

        <form onSubmit={handleVerify} className={styles.form}>
          {/* ── 6-digit code boxes ── */}
          <div className={styles.field}>
            <label className={styles.label}>Reset code</label>
            <div className={styles.codeRow} onPaste={handleCodePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => codeRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleCodeChange(i, e.target.value)}
                  onKeyDown={e => handleCodeKeyDown(i, e)}
                  className={styles.codeBox}
                  required
                />
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>New password</label>
            <input type="password" value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setError(''); }}
              placeholder="At least 6 characters" className={styles.input}
              required autoComplete="new-password" />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Confirm password</label>
            <input type="password" value={confirmPw}
              onChange={e => { setConfirmPw(e.target.value); setError(''); }}
              placeholder="Type it again" className={styles.input}
              required autoComplete="new-password" />
          </div>

          {error   && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.successMsg}>{success}</p>}

          {!success && (
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading && <span className={styles.spinner} />} Reset password
            </button>
          )}
        </form>

        <p className={styles.toggle}>
          Didn't get a code?{' '}
          <button className={styles.toggleBtn} onClick={() => switchMode('forgot')}>Resend</button>
          {' · '}
          <button className={styles.toggleBtn} onClick={() => switchMode('login')}>Sign in</button>
        </p>
      </div>
    </div>
  );
}
