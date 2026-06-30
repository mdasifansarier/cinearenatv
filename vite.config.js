import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'hls.js', 'plyr', 'shaka-player']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          players: ['hls.js', 'plyr', 'shaka-player']
        }
      }
    }
  }
});