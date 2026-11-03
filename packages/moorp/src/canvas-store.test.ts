import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readdirSync, symlinkSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createCanvasStore } from './canvas-store.ts'
import { HttpError } from './http.ts'

const fresh = () => createCanvasStore(mkdtempSync(path.join(tmpdir(), 'moorp-store-')))
const status = (fn: () => unknown) => {
  try {
    fn()
    return 200
  } catch (e) {
    return e instanceof HttpError ? e.status : -1
  }
}

test('create, list, read, write, rename, remove', () => {
  const s = fresh()
  s.create('Components/Buttons')
  s.create('Welcome')
  assert.deepEqual(s.list(), ['Components/Buttons', 'Welcome'])
  const { canvas, errors } = s.read('Welcome')
  assert.deepEqual(errors, [])
  const c = canvas as { version: 1; frames: unknown[] }
  c.frames.push({ id: 'frame-1', name: 'A', type: 'design', source: null, x: 1, y: 2, width: 'hug', height: 'hug' })
  s.write('Welcome', c)
  assert.equal((s.read('Welcome').canvas as { frames: unknown[] }).frames.length, 1)
  s.rename('Welcome', 'Docs/Intro')
  assert.deepEqual(s.list(), ['Components/Buttons', 'Docs/Intro'])
  s.remove('Docs/Intro')
  assert.deepEqual(s.list(), ['Components/Buttons'])
})

test('writes are atomic and leave no temp files', () => {
  const s = fresh()
  s.create('A')
  s.write('A', { version: 1, frames: [] })
  assert.deepEqual(readdirSync(s.dir), ['A.canvas.json'])
})

test('invalid manifests are rejected and the file is untouched', () => {
  const s = fresh()
  s.create('A')
  assert.equal(status(() => s.write('A', { version: 1, frames: [{ id: 'x' }] })), 422)
  assert.deepEqual(s.read('A').errors, [])
})

test('paths cannot escape and conflicts are reported', () => {
  const s = fresh()
  for (const bad of ['../x', 'a/../../x', '/abs', '', 'a\0b']) assert.equal(status(() => s.create(bad)), 400, bad)
  s.create('A')
  assert.equal(status(() => s.create('A')), 409)
  assert.equal(status(() => s.read('Missing')), 404)
  assert.equal(status(() => s.rename('A', 'A')), 409)
})

test('a symlinked folder cannot lead outside the canvases dir', () => {
  const s = fresh()
  mkdirSync(s.dir, { recursive: true })
  const outside = mkdtempSync(path.join(tmpdir(), 'moorp-outside-'))
  symlinkSync(outside, path.join(s.dir, 'evil'))
  assert.equal(status(() => s.create('evil/Stolen')), 403)
  assert.equal(existsSync(path.join(outside, 'Stolen.canvas.json')), false)
})

test('folders left empty by delete or rename are removed, the root stays', () => {
  const s = fresh()
  s.create('A/B/One')
  s.create('A/Two')
  s.remove('A/B/One')
  assert.equal(existsSync(path.join(s.dir, 'A', 'B')), false)
  assert.equal(existsSync(path.join(s.dir, 'A')), true)
  s.rename('A/Two', 'Two')
  assert.equal(existsSync(path.join(s.dir, 'A')), false)
  s.remove('Two')
  assert.equal(existsSync(s.dir), true)
})
