import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // three.js + phaser are inherently large; raise the default 500 kB
    // threshold so the build stays quiet for this 3D+2D-heavy bundle.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Phaser is dynamically imported by the 2D view — name its chunk so
        // it never sits in (or blocks) the main app bundle. NOTE: Vite 8
        // bundles with Rolldown, which supports only the FUNCTION form of
        // manualChunks (the classic `{ phaser: ['phaser'] }` object form is
        // Rollup-only and fails typecheck).
        manualChunks: (id: string) => {
          if (/node_modules[\\/]phaser[\\/]/.test(id)) return 'phaser';
        },
      },
    },
  },
})
