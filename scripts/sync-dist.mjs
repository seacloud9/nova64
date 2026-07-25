#!/usr/bin/env node
/**
 * Syncs examples/<cart>/ → dist/examples/<cart>/
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

  const codesDiffer = filesDiffer(codeSrc, codeDst)
  const metaDiffers = existsSync(metaSrc) && filesDiffer(metaSrc, metaDst)
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
  if (drifted > 0) {
    console.error(`\n${drifted} cart(s) out of sync — run: pnpm sync:dist`)
    process.exit(1)
  }
  console.log(`Dist in sync (${carts.length} carts verified)`)
} else {
  const skipped = carts.length - synced
  console.log(`\n${synced} synced, ${skipped} already current`)
}
