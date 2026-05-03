/**
 * App shell — top nav + page content
 */
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './Layout.module.css';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="#0A84FF"/>
            <path d="M14 7v10M14 17l-4-4M14 17l4-4" stroke="white" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 21h14" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
          <span>QuickDrop</span>
        </Link>

        <div className={styles.navRight}>
          {user ? (
            <>
              <Link
                to="/history"
                className={`${styles.navLink} ${location.pathname === '/history' ? styles.active : ''}`}
              >
                History
              </Link>
              <div className={styles.userBadge}>
                <span className={styles.avatar}>{user.username[0].toUpperCase()}</span>
                <span className={styles.username}>{user.username}</span>
              </div>
              <button className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
            </>
          ) : (
            <Link to="/auth" className={styles.signInBtn}>Sign in</Link>
          )}
        </div>
      </nav>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <p>Files auto-delete after 1 hour &nbsp;·&nbsp; Max 50 MB</p>
      </footer>
    </div>
  );
}
