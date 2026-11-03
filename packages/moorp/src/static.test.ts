import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { serveStatic } from './static.ts'

const dir = path.join(mkdtempSync(path.join(tmpdir(), 'moorp-static-')), 'dist')
mkdirSync(path.join(dir, 'assets'), { recursive: true })
writeFileSync(path.join(dir, 'index.html'), '<p>hi</p>')
writeFileSync(path.join(dir, 'assets', 'a.js'), '1')
writeFileSync(path.join(dir, '..', 'secret.txt'), 'nope')

const run = (url: string) => {
  const res = { statusCode: 0, headers: {} as Record<string, string>, setHeader(k: string, v: string) { this.headers[k] = v }, end() {}, on() {}, once() {}, emit() {}, write() {} }
  return { handled: serveStatic(dir, url, { method: 'HEAD' } as never, res as never), res }
}

test('serves index and assets', () => {
  assert.equal(run('/').handled, true)
  assert.equal(run('/').res.headers['Content-Type'], 'text/html; charset=utf-8')
  assert.equal(run('/assets/a.js').handled, true)
})

test('traversal and missing files are not served', () => {
  for (const u of ['/../secret.txt', '/%2e%2e/secret.txt', '/assets/../../secret.txt', '/missing.js', '/%zz']) assert.equal(run(u).handled, false, u)
})
