import test from 'node:test'
import assert from 'node:assert/strict'
import { matchShortcut, type KeyLike } from './shortcuts.ts'

const k = (key: string, o: Partial<KeyLike> = {}): KeyLike => ({ key, code: '', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...o })
const type = (e: KeyLike) => matchShortcut(e)?.type ?? null

test('undo and redo, on Mac and on Windows/Linux', () => {
  assert.equal(type(k('z', { metaKey: true })), 'undo')
  assert.equal(type(k('z', { ctrlKey: true })), 'undo')
  assert.equal(type(k('Z', { metaKey: true, shiftKey: true })), 'redo')
  assert.equal(type(k('y', { ctrlKey: true })), 'redo')
})

test('modifier shortcuts', () => {
  assert.equal(type(k('d', { metaKey: true })), 'duplicate')
  assert.equal(type(k('c', { ctrlKey: true })), 'copy')
  assert.equal(type(k('v', { ctrlKey: true })), 'paste')
  assert.equal(type(k('r', { metaKey: true })), 'rename')
  assert.equal(type(k('=', { code: 'Equal', metaKey: true })), 'zoomIn')
  assert.equal(type(k('+', { code: 'Equal', metaKey: true, shiftKey: true })), null) // shift+mod is not a zoom shortcut here
  assert.equal(type(k('-', { code: 'Minus', ctrlKey: true })), 'zoomOut')
  assert.equal(type(k('\\', { code: 'Backslash', metaKey: true })), 'toggleUI')
})

test('shift+digit zoom shortcuts use the physical key', () => {
  assert.equal(type(k('!', { code: 'Digit1', shiftKey: true })), 'zoomFit')
  assert.equal(type(k('@', { code: 'Digit2', shiftKey: true })), 'zoomSelection')
  assert.equal(type(k(')', { code: 'Digit0', shiftKey: true })), 'zoom100')
  assert.equal(type(k('1', { code: 'Digit1' })), null)
})

test('arrows nudge by 1, shift by 10', () => {
  assert.deepEqual(matchShortcut(k('ArrowLeft')), { type: 'nudge', dx: -1, dy: 0 })
  assert.deepEqual(matchShortcut(k('ArrowDown', { shiftKey: true })), { type: 'nudge', dx: 0, dy: 10 })
  assert.deepEqual(matchShortcut(k('ArrowUp')), { type: 'nudge', dx: 0, dy: -1 })
  assert.deepEqual(matchShortcut(k('ArrowRight', { shiftKey: true })), { type: 'nudge', dx: 10, dy: 0 })
})

test('delete, escape, tab, add frame', () => {
  assert.equal(type(k('Delete')), 'delete')
  assert.equal(type(k('Backspace')), 'delete')
  assert.equal(type(k('Escape')), 'deselect')
  assert.equal(type(k('Tab')), 'next')
  assert.equal(type(k('Tab', { shiftKey: true })), 'previous')
  assert.equal(type(k('f')), 'addFrame')
  assert.equal(type(k('F', { shiftKey: true })), null)
})

test('alt combinations and unknown keys are left alone', () => {
  assert.equal(type(k('d', { metaKey: true, altKey: true })), null)
  assert.equal(type(k('ArrowLeft', { altKey: true })), null)
  assert.equal(type(k('a', { metaKey: true })), null) // select all: no multi-select yet
  assert.equal(type(k('x')), null)
})
