import test from 'node:test'
import assert from 'node:assert/strict'
import { createEmptyCanvas, duplicateFrame, isValidCanvasPath, nextFrameId, validateCanvas } from './manifest.ts'

test('empty canvas is valid', () => {
  assert.deepEqual(validateCanvas(createEmptyCanvas()), [])
})

test('blank frame with null source is valid; ids increment', () => {
  const canvas = createEmptyCanvas()
  canvas.frames.push({ id: nextFrameId(canvas), name: 'Untitled', type: 'design', source: null, x: 0, y: 0, width: 'hug', height: 'hug' })
  assert.deepEqual(validateCanvas(canvas), [])
  assert.equal(nextFrameId(canvas), 'frame-2')
})

test('hand-edited mistakes are reported', () => {
  const errors = validateCanvas({ version: 1, frames: [{ id: 'x', name: 1, type: 'blob', source: 'a', x: 'no', y: 0, width: 1, height: 1 }] })
  assert.ok(errors.length >= 5)
})

test('page frames need a url', () => {
  const canvas = createEmptyCanvas()
  canvas.frames.push({ id: 'frame-1', name: 'Home', type: 'page', source: null, x: 0, y: 0, width: 375, height: 600 })
  assert.deepEqual(validateCanvas(canvas), ['frames[0].url is required for page frames'])
  canvas.frames[0]!.url = '/demo.html'
  assert.deepEqual(validateCanvas(canvas), [])
})

test('duplicateFrame copies presentation and source reference with a new id', () => {
  const canvas = createEmptyCanvas()
  canvas.frames.push({ id: 'frame-1', name: 'Card', type: 'design', source: { file: 'a.vue' }, x: 0, y: 0, width: 'hug', height: 'hug', presentation: { padding: 8 } })
  const copy = duplicateFrame(canvas, 'frame-1')!
  assert.equal(copy.id, 'frame-2')
  assert.deepEqual(copy.source, { file: 'a.vue' })
  assert.deepEqual(copy.presentation, { padding: 8 })
  assert.notEqual(copy.presentation, canvas.frames[0]!.presentation)
  assert.equal(duplicateFrame(canvas, 'nope'), null)
})

test('canvas paths', () => {
  for (const ok of ['Welcome', 'Components/Buttons', 'A b/C-d_1']) assert.equal(isValidCanvasPath(ok), true, ok)
  for (const bad of ['', '../x', 'a/../b', '/abs', 'a//b', 'a/', '.hidden', 'x\\y', 'a\0b', 42]) assert.equal(isValidCanvasPath(bad), false, String(bad))
})

test('duplicateFrame accepts a proxy (as a reactive store would pass)', () => {
  const canvas = createEmptyCanvas()
  canvas.frames.push({ id: 'frame-1', name: 'Card', type: 'design', source: { file: 'a.vue' }, x: 0, y: 0, width: 'hug', height: 'hug' })
  const proxied = { ...canvas, frames: canvas.frames.map((f) => new Proxy(f, {})) }
  assert.equal(duplicateFrame(proxied, 'frame-1')!.id, 'frame-2')
})

test('props must be an object when present', () => {
  const frame = { id: 'frame-1', name: 'A', type: 'design', source: null, x: 0, y: 0, width: 'hug', height: 'hug' }
  assert.deepEqual(validateCanvas({ version: 1, frames: [{ ...frame, props: { isDark: true } }] }), [])
  for (const bad of [[], 'x', 3, null]) assert.equal(validateCanvas({ version: 1, frames: [{ ...frame, props: bad }] }).length, 1, String(bad))
})

test('presentation fields are validated', () => {
  const frame = { id: 'frame-1', name: 'A', type: 'design', source: null, x: 0, y: 0, width: 'hug', height: 'hug' }
  const check = (presentation: unknown) => validateCanvas({ version: 1, frames: [{ ...frame, presentation }] })
  assert.deepEqual(check({ background: '#fff', padding: 16, alignment: 'center', overflow: 'hidden', htmlAttributes: { class: 'dark', 'data-theme': 'dark' } }), [])
  assert.equal(check({ padding: -1 }).length, 1)
  assert.equal(check({ alignment: 'left' }).length, 1)
  assert.equal(check({ overflow: 'auto' }).length, 1)
  assert.equal(check({ htmlAttributes: { onclick: 'x()' } }).length, 1)
  assert.equal(check({ htmlAttributes: { 'bad name': 'x' } }).length, 1)
  assert.equal(check({ htmlAttributes: { class: 3 } }).length, 1)
  assert.equal(check([]).length, 1)
})
