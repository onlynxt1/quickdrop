/**
 * App root — sets up routing and auth context
 */
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import DownloadPage from './pages/DownloadPage';
import AuthPage from './pages/AuthPage';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/"              element={<HomePage />} />
          <Route path="/download/:id"  element={<DownloadPage />} />
          <Route path="/auth"          element={<AuthPage />} />
          <Route path="/history"       element={<HistoryPage />} />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}
