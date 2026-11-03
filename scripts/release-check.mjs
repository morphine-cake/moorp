#!/usr/bin/env node
// Everything that can be checked before publishing, without publishing:
// build + tests, pack the four packages, inspect the tarballs, then install them into a clean
// project and run `moorp init` and `moorp dev`. Prints the publish commands at the end.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'dist-release')
// Publish order: a package must exist on npm before something that depends on it.
const packages = [
  { dir: 'core', name: '@moorp/core', entry: 'dist/index.js' },
  { dir: 'vue', name: '@moorp/vue', entry: 'dist/index.js' },
  { dir: 'shell', name: '@moorp/shell', entry: 'dist/index.html' },
  { dir: 'moorp', name: 'moorp', entry: 'dist/cli.js', bin: 'dist/cli.js' },
]

const failures = []
const ok = (msg) => console.log(`  ok    ${msg}`)
const fail = (msg) => (failures.push(msg), console.log(`  FAIL  ${msg}`))
const check = (cond, msg) => (cond ? ok(msg) : fail(msg))

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', ...opts })
  if (r.status !== 0 && !opts.allowFail) {
    console.error(`\n$ ${cmd} ${args.join(' ')}\n${r.stdout ?? ''}${r.stderr ?? ''}`)
    throw new Error(`command failed: ${cmd} ${args.join(' ')}`)
  }
  return r
}

console.log('1. Build, typecheck, test')
for (const script of ['build', 'typecheck', 'test']) {
  run('pnpm', ['install', '--frozen-lockfile'], { stdio: 'ignore' })
  run('pnpm', [script], { stdio: 'ignore' })
  ok(`pnpm ${script}`)
}

console.log('2. Pack')
rmSync(out, { recursive: true, force: true })
mkdirSync(out)
const expected = JSON.parse(readFileSync(path.join(root, 'packages/core/package.json'), 'utf8')).version
for (const p of packages) {
  run('pnpm', ['pack', '--pack-destination', out], { cwd: path.join(root, 'packages', p.dir), stdio: 'ignore' })
}
const tarballs = Object.fromEntries(
  packages.map((p) => {
    const file = readdirSync(out).find((f) => f.endsWith(`-${expected}.tgz`) && f.startsWith(p.name.replace('@', '').replace('/', '-') + '-'))
    return [p.name, file && path.join(out, file)]
  }),
)

console.log('3. Inspect tarballs')
for (const p of packages) {
  const file = tarballs[p.name]
  if (!file) {
    fail(`${p.name}: tarball not found`)
    continue
  }
  const listing = run('tar', ['-tvzf', file]).stdout.trim().split('\n')
  const files = listing.map((l) => l.trim().split(/\s+/).pop())
  const pkg = JSON.parse(run('tar', ['-xzOf', file, 'package/package.json']).stdout)
  const deps = JSON.stringify({ ...pkg.dependencies, ...pkg.peerDependencies, ...pkg.optionalDependencies })
  console.log(` ${p.name}`)
  check(pkg.version === expected, `version ${pkg.version}`)
  check(pkg.license === 'MIT' && files.includes('package/LICENSE'), 'MIT license field and LICENSE file')
  check(!pkg.private, 'not private')
  check(pkg.publishConfig?.access === 'public' && pkg.publishConfig?.tag === 'alpha', 'publishConfig: public, tag alpha')
  check(!deps.includes('workspace:'), 'no workspace: protocol left in dependencies')
  check(files.includes(`package/${p.entry}`), `has ${p.entry}`)
  const stray = files.filter((f) => !/^package\/(dist\/|LICENSE$|README\.md$|package\.json$)/.test(f))
  check(stray.length === 0, stray.length ? `only dist, LICENSE, README, package.json (found ${stray.join(', ')})` : 'only dist, LICENSE, README, package.json')
  if (p.bin) {
    const line = listing.find((l) => l.endsWith(`package/${p.bin}`))
    check(pkg.bin?.moorp === `./${p.bin}` && /^-..x/.test(line ?? ''), 'bin target exists and is executable')
  }
  for (const [name, range] of Object.entries(pkg.dependencies ?? {})) if (name.startsWith('@moorp/')) check(range === expected, `${name} pinned to ${range}`)
}

console.log('4. Clean install and run')
const smoke = mkdtempSync(path.join(tmpdir(), 'moorp-smoke-'))
writeFileSync(
  path.join(smoke, 'package.json'),
  JSON.stringify({ name: 'smoke', private: true, type: 'module', devDependencies: { vue: '^3.5.0', vite: '^6.0.0', '@vitejs/plugin-vue': '^5.2.0' } }),
)
writeFileSync(path.join(smoke, 'vite.config.js'), "import vue from '@vitejs/plugin-vue'\nexport default { plugins: [vue()] }\n")
const install = run('npm', ['install', '--no-audit', '--no-fund', ...Object.values(tarballs).filter(Boolean)], { cwd: smoke, allowFail: true })
check(install.status === 0, 'npm install of the four tarballs (no registry copies of @moorp needed)')
if (install.status !== 0) console.log(install.stderr)
else {
  const bin = (...args) => run('npx', ['--no-install', 'moorp', ...args], { cwd: smoke, allowFail: true })
  check(bin('--version').stdout.trim() === expected, `moorp --version is ${expected}`)
  const init = bin('init')
  check(init.status === 0 && existsSync(path.join(smoke, '.visual-canvas/canvases/Welcome.canvas.json')), 'moorp init creates .visual-canvas/')

  const port = 5300 + Math.floor(Math.random() * 500)
  const dev = spawn('npx', ['--no-install', 'moorp', 'dev', '--port', String(port)], { cwd: smoke, detached: true, stdio: 'ignore' })
  const base = `http://localhost:${port}/__moorp`
  let ready = false
  for (let i = 0; i < 60 && !ready; i++) {
    await new Promise((r) => setTimeout(r, 500))
    ready = await fetch(`${base}/api/info`).then((r) => r.ok, () => false)
  }
  check(ready, 'moorp dev serves the API')
  if (ready) {
    const shell = await fetch(`${base}/`).then((r) => r.text(), () => '')
    check(shell.includes('<title>Moorp</title>'), 'the shell is served at /__moorp/')
    const asset = /src="(\/__moorp\/assets\/[^"]+\.js)"/.exec(shell)?.[1]
    check(!!asset && (await fetch(`http://localhost:${port}${asset}`).then((r) => r.ok, () => false)), 'shell assets load')
    const list = await fetch(`${base}/api/canvases`).then((r) => r.json(), () => ({}))
    check(Array.isArray(list.canvases) && list.canvases.includes('Welcome'), 'canvas API lists the sample canvas')
    const preview = await fetch(`${base}/preview.html`).then((r) => r.text(), () => '')
    check(preview.includes('virtual:moorp-preview'), 'preview document is served')
    const virt = await fetch(`http://localhost:${port}/@id/__x00__virtual:moorp-preview`).then((r) => r.text(), () => '')
    check(virt.includes('startPreview') && !virt.includes('Failed to resolve'), 'preview entry resolves @moorp/vue')
  }
  try {
    process.kill(-dev.pid)
  } catch {
    /* already gone */
  }
}
rmSync(smoke, { recursive: true, force: true })

console.log()
if (failures.length) {
  console.log(`${failures.length} check(s) failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log(`All checks passed for ${expected}. Tarballs are in dist-release/.\n`)
console.log(`Publish from ${root}, in this order (each asks for your 2FA):`)
// `./` so npm reads a file path, not a GitHub owner/repo; --tag because publishConfig.tag is ignored for tarballs.
for (const p of packages) console.log(`  npm publish ./${path.relative(root, tarballs[p.name])} --tag alpha`)
