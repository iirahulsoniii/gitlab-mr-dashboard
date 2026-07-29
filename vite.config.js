import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/jira-api': {
        target: 'https://omantel-om.atlassian.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/jira-api/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Jira Cloud blocks cross-origin POST requests with 403 Forbidden.
            // By removing these headers, the request looks like a standard server-side 
            // request (like the old Python script) rather than a browser request.
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            proxyReq.removeHeader('sec-fetch-dest');
            proxyReq.removeHeader('sec-fetch-mode');
            proxyReq.removeHeader('sec-fetch-site');
            proxyReq.setHeader('user-agent', 'Python-urllib/3.10');
            proxyReq.setHeader('x-atlassian-token', 'no-check');
          });
        }
      },
      '/db-api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/db-api/, ''),
      },
    }
  }
})
