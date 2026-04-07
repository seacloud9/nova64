import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base path for deployment
  base: './',

  // Build configuration
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,

    // Optimize output
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for debugging
        drop_debugger: true,
      },
    },

    // Chunk size warnings
    chunkSizeWarningLimit: 1000,

    // Rollup options
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        console: resolve(__dirname, 'console.html'),
        'cart-runner': resolve(__dirname, 'cart-runner.html'),
      },
    },
  },

  // Dev server configuration
  server: {
    port: 3000,
    open: true,
    host: true, // Allow network access

    // Hot module replacement
    hmr: {
      overlay: true,
    },
  },

  // Optimizations
  optimizeDeps: {
    include: ['three', 'zustand'],
  },

  // Plugin configuration
  plugins: [],

  // Resolve configuration
  resolve: {
    alias: {
      '@runtime': resolve(__dirname, 'runtime'),
      '@examples': resolve(__dirname, 'examples'),
    },
  },
});
