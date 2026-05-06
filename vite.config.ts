import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Frontend-only build configuration
// No backend proxy needed - all data stored in localStorage

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
  server: {
    // No proxy needed for frontend-only build
  },
})
