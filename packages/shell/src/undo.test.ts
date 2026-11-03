import test from 'node:test'
import assert from 'node:assert/strict'
import { createUndoStack } from './undo.ts'

test('undo and redo walk through recorded states', () => {
  const h = createUndoStack<string>()
  h.record('a') // state before change 1
  h.record('b') // state before change 2; current is now 'c'
  assert.equal(h.undo('c'), 'b')
  assert.equal(h.undo('b'), 'a')
  assert.equal(h.undo('a'), undefined)
  assert.equal(h.redo('a'), 'b')
  assert.equal(h.redo('b'), 'c')
  assert.equal(h.redo('c'), undefined)
})

test('recording after an undo drops the redo branch', () => {
  const h = createUndoStack<string>()
  h.record('a')
  assert.equal(h.undo('b'), 'a')
  assert.equal(h.canRedo, true)
  h.record('a')
  assert.equal(h.canRedo, false)
})

test('a snapshot equal to the last one is not recorded twice', () => {
  const h = createUndoStack<string>()
  h.record('a')
  h.record('a')
  assert.equal(h.undo('b'), 'a')
  assert.equal(h.undo('a'), undefined)
})

test('history is capped, oldest first', () => {
  const h = createUndoStack<number>(3)
  for (let i = 0; i < 10; i++) h.record(i)
  const seen: number[] = []
  let cur = 10
  for (let v = h.undo(cur); v !== undefined; v = h.undo(cur)) (seen.push(v), (cur = v))
  assert.deepEqual(seen, [9, 8, 7])
})

test('clear forgets everything', () => {
  const h = createUndoStack<string>()
  h.record('a')
  h.undo('b')
  h.clear()
  assert.equal(h.canUndo, false)
  assert.equal(h.canRedo, false)
})

test('a snapshot equal to the current state is skipped', () => {
  const h = createUndoStack<string>()
  h.record('a')
  h.record('b')
  h.record('b2')
  // The gesture that recorded 'b2' changed nothing: the current state is still 'b2'.
  assert.equal(h.undo('b2'), 'b')
  assert.equal(h.undo('b'), 'a')
  assert.equal(h.redo('a'), 'b')
  assert.equal(h.redo('b'), 'b2')
})
