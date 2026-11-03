import test from 'node:test'
import assert from 'node:assert/strict'
import { createEmptyCanvas, nextFrameId, validateCanvas } from './manifest.ts'

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
