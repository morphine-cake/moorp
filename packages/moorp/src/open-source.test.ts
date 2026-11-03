import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { resolveSourcePath } from './open-source.ts'

const base = mkdtempSync(path.join(tmpdir(), 'moorp-'))
const root = path.join(base, 'project')
mkdirSync(path.join(root, 'src'), { recursive: true })
mkdirSync(path.join(root, 'node_modules/x'), { recursive: true })
writeFileSync(path.join(root, 'src/A.vue'), '')
writeFileSync(path.join(root, 'src/notes.txt'), '')
writeFileSync(path.join(root, 'node_modules/x/i.js'), '')
writeFileSync(path.join(base, 'secret.ts'), '')
symlinkSync(path.join(base, 'secret.ts'), path.join(root, 'src/link.ts'))

const status = (f: unknown) => { const r = resolveSourcePath(root, f); return r.ok ? 200 : r.status }

test('valid project file', () => assert.equal(status('src/A.vue'), 200))
test('traversal is refused', () => assert.equal(status('../secret.ts'), 403))
test('absolute path is refused', () => assert.equal(status(path.join(base, 'secret.ts')), 403))
test('symlink out of the project is refused', () => assert.equal(status('src/link.ts'), 403))
test('node_modules is refused', () => assert.equal(status('node_modules/x/i.js'), 403))
test('unlisted extension is refused', () => assert.equal(status('src/notes.txt'), 403))
test('missing file is 404', () => assert.equal(status('src/nope.vue'), 404))
test('bad input is 400', () => { assert.equal(status(''), 400); assert.equal(status(42), 400); assert.equal(status('src/A.vue\0.txt'), 400) })
