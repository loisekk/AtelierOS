import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // three.js is inherently large; raise the default 500 kB threshold so the
    // build stays quiet for this 3D-heavy bundle.
    chunkSizeWarningLimit: 1500,
  },
})
