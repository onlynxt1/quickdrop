import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // In production builds VITE_API_URL is the Render URL.
  // In local dev it falls back to localhost:3001 (Express dev server).
  const apiTarget = env.VITE_API_URL || 'http://localhost:3001';

  return {
    plugins: [react()],
    optimizeDeps: {
      esbuildOptions: {
        loader: { '.js': 'jsx' }
      }
    },
    server: {
      port: 5000,
      host: '0.0.0.0',
      allowedHosts: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        },
        '/download': {
          target: apiTarget,
          changeOrigin: true
        },
        '/share': {
          bypass: () => '/index.html'
        },
        '/note': {
          bypass: () => '/index.html'
        }
      }
    }
  };
});
