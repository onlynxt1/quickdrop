/**
 * Auth context and hook — manages login state across the app
 */
import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Point all axios calls at the deployed API.
// VITE_API_URL is set in Netlify environment variables.
// In local dev the Vite proxy forwards /api/* to localhost:3001, so this can be left empty.
if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on app load
  useEffect(() => {
    const token = localStorage.getItem('qd_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/api/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('qd_token');
          delete axios.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function setToken(token) {
    localStorage.setItem('qd_token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  async function login(email, password) {
    const res = await axios.post('/api/auth/login', { email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  }

  async function signup(username, email, password) {
    const res = await axios.post('/api/auth/signup', { username, email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  }

  function logout() {
    localStorage.removeItem('qd_token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
