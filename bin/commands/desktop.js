import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { stat, cp, rm, mkdir } from 'fs/promises';
import { createServer } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const NOVA64_ROOT = resolve(__dirname, '..', '..');
const DESKTOP_DIR = resolve(NOVA64_ROOT, 'apps', 'desktop');
const OS_SHELL_SRC = resolve(NOVA64_ROOT, 'public', 'os9-shell');
const OS_STAGE_DIR = resolve(DESKTOP_DIR, 'build', 'os');

const c = {
  err: s => `\x1b[31m${s}\x1b[0m`,
  ok: s => `\x1b[32m${s}\x1b[0m`,
  dim: s => `\x1b[2m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
};

async function dirExists(p) {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

function resolveElectronBinary() {
  try {
    const requireFromDesktop = createRequire(join(DESKTOP_DIR, 'package.json'));
    // The `electron` module's main export is the path to the binary.
    return requireFromDesktop('electron');
  } catch {
    return null;
  }
}

/** nova64 desktop dev — start a local server + launch Electron against it. */
async function desktopDev(opts = {}) {
  if (!(await dirExists(DESKTOP_DIR))) {
    console.error(c.err('\n  apps/desktop not found. Are you in the Nova64 repo?\n'));
    process.exit(1);
  }
  const electronPath = resolveElectronBinary();
  if (!electronPath) {
    console.error(c.err('\n  Electron is not installed.'));
    console.error(`  Run ${c.bold('pnpm install')} (adds electron to apps/desktop).\n`);
    process.exit(1);
  }
  if (!(await dirExists(OS_SHELL_SRC))) {
    console.error(c.err('\n  public/os9-shell is missing.'));
    console.error(`  Build the OS shell first: ${c.bold('pnpm osBuild')}\n`);
    process.exit(1);
  }

  const port = opts.port && opts.port !== 3000 ? opts.port : 4173;
  const server = await createServer({
    root: NOVA64_ROOT,
    server: { port, strictPort: true, host: '127.0.0.1', open: false },
  });
  await server.listen();
  const url = `http://127.0.0.1:${port}`;

  console.log(`
  ${c.bold('\x1b[35m🎮 Nova64 Desktop (dev)\x1b[0m')}

  ${c.ok('➜')}  Server:   ${url}
  ${c.ok('➜')}  OS shell: ${url}/os9-shell/index.html
  ${c.dim('Launching Electron… close the window to stop.')}
`);

  const env = { ...process.env, NOVA64_DESKTOP_DEV_URL: url };
  if (opts.devtools) env.NOVA64_DESKTOP_DEVTOOLS = '1';
  const child = spawn(electronPath, [DESKTOP_DIR], { stdio: 'inherit', env });

  const shutdown = async () => {
    try {
      await server.close();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  child.on('close', shutdown);
  process.on('SIGINT', () => child.kill());
  process.on('SIGTERM', () => child.kill());
}

/**
 * nova64 desktop build [--dir] — stage web assets so the app runs serverless.
 * Full installer packaging (electron-builder) arrives in a later phase; this
 * stages the OS shell into apps/desktop/build/os for the nova64-app:// protocol.
 */
async function desktopBuild(opts = {}) {
  if (!(await dirExists(OS_SHELL_SRC))) {
    console.error(c.err('\n  public/os9-shell is missing.'));
    console.error(`  Build the OS shell first: ${c.bold('pnpm osBuild')}\n`);
    process.exit(1);
  }
  await rm(OS_STAGE_DIR, { recursive: true, force: true });
  await mkdir(OS_STAGE_DIR, { recursive: true });
  await cp(OS_SHELL_SRC, OS_STAGE_DIR, { recursive: true });

  console.log(`
  ${c.bold('\x1b[35m🎮 Nova64 Desktop build\x1b[0m')}

  ${c.ok('✓')} Staged OS shell → ${c.dim(OS_STAGE_DIR)}

  Run it serverless:
    ${c.bold('pnpm --filter @nova64/desktop start')}
  ${c.dim('(loads OS over nova64-app:// — no localhost, no server)')}

  ${c.dim('Installer packaging (electron-builder: deb / AppImage / nsis / dmg) is a later phase.')}
`);
  if (opts.dir) console.log(c.dim('  --dir: unpacked staging complete.\n'));
}

export async function desktopCommand(sub, opts = {}) {
  switch (sub) {
    case 'dev':
      return desktopDev(opts);
    case 'build':
      return desktopBuild(opts);
    default:
      console.log(`
  ${c.bold('nova64 desktop')} — standalone Electron app

  ${c.bold('Commands:')}
    dev            Start a local server and launch the desktop app
    build [--dir]  Stage assets so the app runs serverless

  ${c.dim('Example: nova64 desktop dev')}
`);
  }
}
