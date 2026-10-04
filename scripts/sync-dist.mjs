#!/usr/bin/env node
/**
 * Syncs examples/<cart>/ → dist/examples/<cart>/
 * and verifies  runtime/*.js  → dist/runtime/*.js
 *
 * dist/ is tracked and is what the npm tarball ships, so a runtime fix that is
 * not mirrored into dist/runtime/ never reaches anyone who installs the package.
 * That is not hypothetical: the studio-executor fix had to be re-shipped for
 * exactly this reason. Nothing used to check it, so the check lives here.
 *
 * Usage:
 *   node scripts/sync-dist.mjs           # sync all carts
 *   node scripts/sync-dist.mjs neon-snake # sync one cart
 *   node scripts/sync-dist.mjs --check   # verify sync without copying (exit 1 if drift)
 */

import { readdirSync, readFileSync, cpSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const examplesDir = join(root, 'examples')
const distDir = join(root, 'dist', 'examples')
const runtimeDir = join(root, 'runtime')
const distRuntimeDir = join(root, 'dist', 'runtime')

const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const targetCart = args.find(a => !a.startsWith('-'))

function getCartsWithCode() {
  return readdirSync(examplesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(name => existsSync(join(examplesDir, name, 'code.js')))
}

function filesDiffer(a, b) {
  if (!existsSync(b)) return true
  return readFileSync(a, 'utf8') !== readFileSync(b, 'utf8')
}

// --check only: a MISSING dist counterpart means "not built here", not "drifted".
// dist/ is gitignored with a subset force-added, so a fresh checkout legitimately
// lacks most dist/examples/ copies and every build artifact. Treating absence as
// drift made `pnpm test` fail on every clean clone. Real drift -- both files
// present, contents differ -- still fails.
function contentDiffers(a, b) {
  if (!existsSync(b)) return false
  return readFileSync(a, 'utf8') !== readFileSync(b, 'utf8')
}

/**
 * Every runtime/*.js that already has a dist/runtime/ counterpart must match it.
 * Only existing counterparts are compared, so adding a new runtime file does not
 * fail the check before a build has had a chance to copy it.
 * @returns {string[]} relative paths that drifted
 */
function runtimeDrift() {
  if (!existsSync(distRuntimeDir)) return []
  const drift = []
  const walk = rel => {
    for (const entry of readdirSync(join(runtimeDir, rel), { withFileTypes: true })) {
      const next = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(next)
      else if (entry.name.endsWith('.js')) {
        const dst = join(distRuntimeDir, next)
        if (existsSync(dst) && filesDiffer(join(runtimeDir, next), dst)) drift.push(next)
      }
    }
  }
  walk('')
  return drift
}

function runtimeFileCount() {
  if (!existsSync(distRuntimeDir)) return 0
  let n = 0
  const walk = rel => {
    for (const entry of readdirSync(join(runtimeDir, rel), { withFileTypes: true })) {
      const next = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(next)
      else if (entry.name.endsWith('.js') && existsSync(join(distRuntimeDir, next))) n++
    }
  }
  walk('')
  return n
}

const carts = targetCart ? [targetCart] : getCartsWithCode()
let drifted = 0
let synced = 0

for (const cart of carts) {
  const srcDir = join(examplesDir, cart)
  const dstDir = join(distDir, cart)

  if (!existsSync(srcDir)) {
    console.error(`ERROR: examples/${cart} not found`)
    process.exit(1)
  }

  const codeSrc = join(srcDir, 'code.js')
  const codeDst = join(dstDir, 'code.js')
  const metaSrc = join(srcDir, 'meta.json')
  const metaDst = join(dstDir, 'meta.json')

  const compare = checkOnly ? contentDiffers : filesDiffer
  const codesDiffer = compare(codeSrc, codeDst)
  const metaDiffers = existsSync(metaSrc) && compare(metaSrc, metaDst)
  const hasDrift = codesDiffer || metaDiffers

  if (!hasDrift) continue

  if (checkOnly) {
    if (codesDiffer) console.error(`DRIFT  examples/${cart}/code.js`)
    if (metaDiffers) console.error(`DRIFT  examples/${cart}/meta.json`)
    drifted++
  } else {
    mkdirSync(dstDir, { recursive: true })
    cpSync(srcDir, dstDir, { recursive: true, force: true })
    console.log(`synced ${cart}`)
    synced++
  }
}

if (checkOnly) {
  const rtDrift = runtimeDrift()
  for (const rel of rtDrift) console.error(`DRIFT  runtime/${rel} → dist/runtime/${rel}`)
  if (drifted > 0 || rtDrift.length > 0) {
    if (drifted > 0) console.error(`\n${drifted} cart(s) out of sync — run: pnpm sync:dist`)
    if (rtDrift.length > 0)
      console.error(
        `\n${rtDrift.length} runtime file(s) not mirrored into dist/ — run: pnpm build` +
          ` (dist/ ships in the npm package, so this would not reach users)`
      )
    process.exit(1)
  }
  const built = carts.filter(c => existsSync(join(distDir, c, 'code.js'))).length
  console.log(
    `Dist in sync (${built}/${carts.length} carts mirrored, ${runtimeFileCount()} runtime files verified)`
  )
} else {
  const skipped = carts.length - synced
  console.log(`\n${synced} synced, ${skipped} already current`)
}
