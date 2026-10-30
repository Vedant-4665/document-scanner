import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Bind to all interfaces so the IDE port-forwarder and LAN devices can
    // reach the dev server. The browser still hits localhost:5173 as normal.
    host: true,
    port: 5173,
    // The browser only ever talks to the Vite dev server. Any request whose
    // path starts with /api is forwarded to the Flask backend on port 5001.
    // This avoids CORS problems, and later lets a phone reach the backend
    // through the same HTTPS address it uses for the page.
    proxy: {
      '/api': 'http://127.0.0.1:5001',
    },
  },
})
