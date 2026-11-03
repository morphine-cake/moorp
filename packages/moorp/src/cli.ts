#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { runInit } from './init.ts'
import { moorp } from './plugin.ts'

const HELP = `moorp — a visual canvas for code-driven frontend design

Usage:
  moorp init [--force]      Create .visual-canvas/ (preview setup and a sample canvas)
  moorp dev [--port <n>]    Start your Vite dev server with the Moorp canvas at /__moorp/

Options:
  -h, --help       Show this help
  -v, --version    Show the version
`

function flag(args: string[], name: string): string | true | undefined {
  const i = args.indexOf(name)
  if (i === -1) return undefined
  const next = args[i + 1]
  return next && !next.startsWith('-') ? next : true
}

async function main(argv: string[]): Promise<number> {
  const [cmd, ...args] = argv
  const root = process.cwd()

  if (!cmd || cmd === '-h' || cmd === '--help' || cmd === 'help') return console.log(HELP), 0
  if (cmd === '-v' || cmd === '--version') {
    const pkg = JSON.parse(readFileSync(createRequire(import.meta.url).resolve('../package.json'), 'utf8')) as { version: string }
    return console.log(pkg.version), 0
  }

  if (cmd === 'init') {
    const r = runInit(root, { force: args.includes('--force') })
    for (const f of r.created) console.log(`created  ${f}`)
    for (const f of r.skipped) console.log(`kept     ${f} (already exists; use --force to overwrite)`)
    for (const n of r.notes) console.log(`note     ${n}`)
    console.log('\nNext: run `moorp dev`, then open /__moorp/ on the printed address.')
    return 0
  }

  if (cmd === 'dev') {
    if (!existsSync(path.join(root, '.visual-canvas'))) throw new Error('No .visual-canvas/ folder here. Run `moorp init` first.')
    const portFlag = flag(args, '--port')
    const port = typeof portFlag === 'string' ? Number(portFlag) : undefined
    if (portFlag !== undefined && (!Number.isInteger(port) || port! < 1 || port! > 65535)) throw new Error('--port needs a number between 1 and 65535')
    const { createServer } = await import('vite')
    const server = await createServer({ root, plugins: [moorp()], server: { port } })
    await server.listen()
    server.printUrls()
    const base = server.resolvedUrls?.local[0] ?? `http://localhost:${server.config.server.port}/`
    console.log(`\n  Moorp: ${base}__moorp/\n`)
    process.on('SIGINT', () => void server.close().then(() => process.exit(0)))
    return -1 // keep running
  }

  console.error(`Unknown command "${cmd}".\n\n${HELP}`)
  return 1
}

main(process.argv.slice(2)).then(
  (code) => code >= 0 && process.exit(code),
  (err: unknown) => {
    console.error(`moorp: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  },
)
