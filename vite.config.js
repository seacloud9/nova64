import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  define: {
    __NOVA64_VERSION__: JSON.stringify(version),
  },
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
        'hero-embed': resolve(__dirname, 'hero-embed.html'),
        'babylon-console': resolve(__dirname, 'babylon_console.html'),
        'demo-embed': resolve(__dirname, 'demo-embed.html'),
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
  plugins: [
    {
      name: 'static-directory-index',
      configureServer(server) {
        // Mimic GitHub Pages / static hosting: serve index.html for directory paths.
        // Return a function so the middleware runs AFTER Vite's internal transforms
        // but we also need a pre-middleware to prevent Vite from redirecting
        // /os9-shell/index.html → /os9-shell (which then hits SPA fallback).
        server.middlewares.use((req, res, next) => {
          const [url, query] = (req.url || '').split(/\?(.*)/s);
          if (url === '/os9-shell' || url === '/os9-shell/' || url === '/os9-shell/index') {
            res.writeHead(302, {
              // Keep the query: ?app=emu&cart=... deep links must survive the hop.
              Location: '/os9-shell/index.html' + (query ? `?${query}` : ''),
              'Cache-Control': 'no-store',
            });
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
  appType: 'mpa',

  // Resolve configuration
  resolve: {
    alias: {
      '@runtime': resolve(__dirname, 'runtime'),
      '@examples': resolve(__dirname, 'examples'),
    },
  },
});
