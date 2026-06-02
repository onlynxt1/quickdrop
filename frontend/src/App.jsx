/**
 * App root — sets up routing and auth context
 */
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import DownloadPage from './pages/DownloadPage';
import SnippetPage from './pages/SnippetPage';
import AuthPage from './pages/AuthPage';
import HistoryPage from './pages/HistoryPage';
import VaultPage from './pages/VaultPage';

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/"              element={<HomePage />} />
          <Route path="/share/:id"     element={<DownloadPage />} />
          <Route path="/note/:id"      element={<SnippetPage />} />
          <Route path="/auth"          element={<AuthPage />} />
          <Route path="/history"       element={<HistoryPage />} />
          <Route path="/vault"         element={<VaultPage />} />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}
