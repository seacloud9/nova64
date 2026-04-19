import { resolve } from 'path';
import { stat, readdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { createServer } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const NOVA64_ROOT = resolve(__dirname, '..', '..');

async function fileExists(p) {
  try { const s = await stat(p); return s.isFile(); } catch { return false; }
}

export async function devCommand(opts = {}) {
  const userDir = resolve(process.cwd());
  const cartFile = resolve(userDir, 'code.js');

  if (!(await fileExists(cartFile))) {
    console.error(`\n  \x1b[31mError:\x1b[0m No code.js found in current directory.`);
    console.error(`  Run \x1b[1mnova64 init\x1b[0m to create a new project first.\n`);
    process.exit(1);
  }

  const port = opts.port || 3000;

  // Serve from the Nova64 package root (where all runtime files live)
  // but allow access to the user's project directory via /@fs/
  const cartUrl = `/@fs/${cartFile}`;

  const server = await createServer({
    root: NOVA64_ROOT,
    server: {
      port,
      strictPort: true,
      host: true,
      open: false,
      fs: {
        allow: [NOVA64_ROOT, userDir],
      },
    },
    plugins: [
      {
        name: 'nova64-dev-cart',
        configureServer(server) {
          // Redirect / to cart-runner.html with the user's cart path
          server.middlewares.use((req, _res, next) => {
            if (req.url === '/' || req.url === '/index.html') {
              req.url = `/cart-runner.html?path=${encodeURIComponent(cartUrl)}`;
            }
            next();
          });
        },
      },
    ],
  });

  await server.listen();

  console.log(`
  \x1b[1m\x1b[35m🎮 Nova64 Dev Server\x1b[0m

  \x1b[32m➜\x1b[0m  Cart:   \x1b[36m${cartFile}\x1b[0m
  \x1b[32m➜\x1b[0m  Local:  \x1b[36mhttp://localhost:${port}/\x1b[0m

  \x1b[2mEdits to code.js will hot-reload automatically.\x1b[0m
  Press \x1b[1mCtrl+C\x1b[0m to stop
`);

  if (opts.open !== false) {
    const { exec } = await import('child_process');
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} "http://localhost:${port}/"`);
  }
}
