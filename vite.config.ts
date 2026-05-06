import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Frontend-only build configuration
// No backend proxy needed - uses Firebase + localStorage

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui': ['lucide-react', 'framer-motion'],
        },
      },
    },
  },
  server: {
    // No proxy needed for frontend-only build
  },
})
