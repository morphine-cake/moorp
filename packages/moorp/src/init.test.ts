import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { validateCanvas } from '@moorp/core'
import { runInit } from './init.ts'

const project = (deps: Record<string, string>) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'moorp-init-'))
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ devDependencies: deps }))
  return dir
}

test('creates preview setup and a valid sample canvas', () => {
  const dir = project({ vue: '^3', vite: '^6', '@vitejs/plugin-vue': '^5', '@moorp/vue': '*' })
  const r = runInit(dir)
  assert.deepEqual(r.created.sort(), ['.visual-canvas/canvases/Welcome.canvas.json', '.visual-canvas/preview.ts'])
  assert.deepEqual(validateCanvas(JSON.parse(readFileSync(path.join(dir, '.visual-canvas/canvases/Welcome.canvas.json'), 'utf8'))), [])
  assert.deepEqual(r.notes, [])
})

test('keeps existing files unless forced, and suggests missing packages', () => {
  const dir = project({ vue: '^3' })
  runInit(dir)
  writeFileSync(path.join(dir, '.visual-canvas/preview.ts'), '// mine')
  const again = runInit(dir)
  assert.equal(again.created.length, 0)
  assert.equal(again.skipped.length, 2)
  assert.equal(readFileSync(path.join(dir, '.visual-canvas/preview.ts'), 'utf8'), '// mine')
  assert.equal(again.notes.length, 3)
  assert.equal(runInit(dir, { force: true }).created.length, 2)
})

test('refuses unsupported or missing projects without writing anything', () => {
  const react = project({ react: '^18' })
  assert.throws(() => runInit(react), /React adapter is not available/)
  assert.equal(existsSync(path.join(react, '.visual-canvas')), false)
  assert.throws(() => runInit(project({})), /No "vue" dependency/)
  assert.throws(() => runInit(mkdtempSync(path.join(tmpdir(), 'moorp-empty-'))), /No package.json/)
})
