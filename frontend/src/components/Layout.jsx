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
          <img src="/logo.png" alt="QuickDrop" height="64" style={{ display: 'block' }} />
        </Link>

        <div className={styles.navRight}>
          {user ? (
            <>
              <Link
                to="/vault"
                className={`${styles.navLink} ${location.pathname === '/vault' ? styles.active : ''}`}
              >
                🔒 Vault
              </Link>
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
        <p>Files auto-delete after 1 hour &nbsp;·&nbsp; Max 5 GB &nbsp;·&nbsp; Videos supported</p>
      </footer>
    </div>
  );
}
