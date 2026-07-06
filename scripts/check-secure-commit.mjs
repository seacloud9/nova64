#!/usr/bin/env node
// check-secure-commit.mjs — pre-commit secret guard.
//
// Wired as a Claude Code PreToolUse(Bash) hook AND usable as a git pre-commit
// step. It scans STAGED changes for likely secrets and blocks the commit if any
// are found. Placeholders (YOUR_..., example, <redacted>, xxxx) are allowed.
//
// As a Claude hook it reads the tool call from stdin ({tool_input:{command}});
// it only acts when the command is a `git commit`. Exit 2 = block (stderr shown
// to the model). As a git hook (no stdin / not a commit) it just scans staged.
//
// Run manually:  node scripts/check-secure-commit.mjs --scan

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function readStdin() {
  // Synchronously drain fd 0. No stdin (interactive / no pipe) throws EAGAIN/
  // ENXIO on some platforms — treat that as "no event data".
  try { return readFileSync(0, 'utf8'); } catch { return ''; }
}

// Decide whether we should run. For the Claude hook, only guard real commits.
function shouldScan() {
  if (process.argv.includes('--scan')) return true;
  let raw = '';
  try { raw = readStdin(); } catch { /* no stdin */ }
  if (!raw.trim()) return true; // git-hook / manual context → scan
  try {
    const evt = JSON.parse(raw);
    const cmd = evt?.tool_input?.command || '';
    if (!/\bgit\b[^\n]*\bcommit\b/.test(cmd)) return false; // not a commit → skip
    if (/--no-verify|-n\b/.test(cmd)) {
      console.error('⛔ Secret guard: refusing `git commit --no-verify` (bypasses checks).');
      process.exit(2);
    }
    return true;
  } catch { return true; }
}

// Secret patterns. Each: {re, name}. Kept pragmatic to avoid noise.
const RULES = [
  { re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP |DSA )?PRIVATE KEY-----/, name: 'private key block' },
  { re: /\bAKIA[0-9A-Z]{16}\b/, name: 'AWS access key id' },
  { re: /\baws_secret_access_key\s*=\s*[^\s"']{20,}/i, name: 'AWS secret access key' },
  { re: /\bsk_(?:live|test)_[0-9a-zA-Z]{16,}\b/, name: 'Stripe secret key' },
  { re: /\bghp_[0-9A-Za-z]{30,}\b/, name: 'GitHub personal access token' },
  { re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/, name: 'Slack token' },
  { re: /\bey[JI][0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}/, name: 'JWT / bearer token' },
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/, name: 'Google API key' },
  { re: /(?:lemonsqueezy|LEMONSQUEEZY)[_-]?API[_-]?KEY\s*[:=]\s*[^\s"']{16,}/, name: 'Lemon Squeezy API key' },
  // Generic: KEY/SECRET/TOKEN/PASSWORD = a long non-placeholder value.
  { re: /\b(?:api[_-]?key|secret|token|password|passwd|client[_-]?secret)\b\s*[:=]\s*["']?(?!YOUR_|xxx|<|example|changeme|placeholder|\$\{)[0-9A-Za-z._\-\/+]{20,}/i, name: 'hardcoded credential' },
];
// Lines matching these are ignored (docs/placeholders/examples).
const ALLOW = /YOUR_|<redacted>|example\.com|placeholder|dummy|CHANGEME|process\.env|import\.meta\.env|\$\{|\.env\.example/i;

function scanStaged() {
  let diff = '';
  try { diff = execSync('git diff --cached -U0 --no-color', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch { return []; }
  const findings = [];
  let file = '';
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) { file = line.slice(6); continue; }
    if (!line.startsWith('+') || line.startsWith('+++')) continue; // added lines only
    const added = line.slice(1);
    if (ALLOW.test(added)) continue;
    for (const { re, name } of RULES) {
      if (re.test(added)) { findings.push({ file, name, snippet: added.trim().slice(0, 80) }); break; }
    }
  }
  return findings;
}

// Also flag staging a real .env (values), but allow *.env.example / templates.
function scanEnvFiles() {
  let names = '';
  try { names = execSync('git diff --cached --name-only --diff-filter=AM', { encoding: 'utf8' }); } catch { return []; }
  return names.split('\n').filter(Boolean)
    .filter((f) => /(^|\/)\.env(\.local|\.production|\.development)?$/.test(f) && !/example|sample|template/.test(f))
    .map((f) => ({ file: f, name: 'committing a .env file', snippet: '(env files usually hold secrets — is this intended?)' }));
}

if (!shouldScan()) process.exit(0);

const findings = [...scanStaged(), ...scanEnvFiles()];
if (findings.length === 0) {
  if (process.argv.includes('--scan')) console.log('✓ Secret guard: staged changes look clean.');
  process.exit(0);
}

console.error('\n⛔ Secret guard blocked this commit — possible secrets in staged changes:\n');
for (const f of findings) console.error(`   • ${f.name}\n     ${f.file}: ${f.snippet}`);
console.error('\n   Remove the secret (use env vars / .env.local, which is gitignored),');
console.error('   or if this is a false positive, unstage the file and commit intentionally.');
console.error('   Placeholders like YOUR_KEY / <redacted> / *.env.example are allowed.\n');
process.exit(2);
