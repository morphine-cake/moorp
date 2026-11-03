# Phase 1 — canvas shell and `moorp` CLI

What replaced the spike code, how it fits together, and what was checked. The spike results are in [phase-0-spike.md](phase-0-spike.md).

## Packages

| Package | Role |
| --- | --- |
| `@moorp/core` | Manifest types and validation (`validateCanvas`), `duplicateFrame`, canvas path rules, the `moorp/1` preview protocol. No UI framework, runs in Node and the browser. |
| `@moorp/vue` | Vue adapter: `startPreview()` mounts a component in a preview iframe, applies frame presentation, reports size, errors and pinch zoom. |
| `@moorp/shell` | The canvas app (Vue 3 + Vite): sidebar, infinite canvas, frame toolbar, properties panel. Built to static files. |
| `moorp` | The CLI (`moorp init`, `moorp dev`) and the Vite plugin that serves the shell, the canvas API and the preview entry. `private` until the first real release. |
| `playground/` | A sample Vue + Vite project that runs on `moorp dev`; it replaces the spike's hand-written shell. |

## How it runs

`moorp dev` starts the project's own Vite dev server with the `moorp()` plugin added. The plugin serves, under `/__moorp/`:

- the built shell (`/__moorp/`), with path-traversal-safe static serving;
- `/__moorp/preview.html`: the iframe document for Design Frames. Its script is a virtual module that imports the adapter, the project's `.visual-canvas/preview.ts` (if present), and loads components by dev-server URL, so adding a component file needs no reload;
- `/__moorp/api/*`: list, read, write, create, rename and delete canvases; open a source file in the editor; check whether a URL can be embedded; a server-sent-events stream of canvas file changes.

Canvases are JSON files in `.visual-canvas/canvases/**.canvas.json`; folders are the sidebar tree. The shell edits them through the API, and anything else (Claude Code, Codex, an editor) can edit the same files directly. The file watcher tells the shell, which updates frames in place.

## What the shell does

- Sidebar: folders (expand/collapse, remembered), canvases, create (also inside a folder, or with `Folder/Name`), rename by double click, delete from the properties panel (layout file only).
- Canvas: pan, zoom (clamped 10%–400%), per-canvas view remembered. Empty canvas shows how to start.
- Frames: add Design or Page frames, select by title bar, move by dragging the title bar, resize from edges and corner (a hug size becomes fixed), rename by double click, duplicate (reference only), delete (canvas only). The toolbar sits outside the preview and keeps a constant on-screen size at any zoom.
- Properties panel: canvas properties when nothing is selected; for a frame its name, source file or URL, size (Hug/Fixed for design frames, presets for page frames), props (JSON passed to the component), and presentation (background, padding, alignment, overflow, and a class on the preview's `<html>` for themes). Presentation is applied around the component, never inside its CSS; props and presentation update in place without remounting.
- Scenario: a free-text name per design frame, passed to `.visual-canvas/preview.ts` as `setup(app, { frameId, scenario, props })`, to pick a locale or seed a store per frame (see [providers-trial.md](providers-trial.md)).
- Navigation: Fit (all frames), Zoom to (one frame), zoom from 2% to 400%, back/forward between canvases.
- Previews: always interactive; a design frame without a source shows a placeholder; preview errors and "cannot embed" reasons show on the frame.
- Persistence: every change is saved after a short debounce; invalid or half-written files keep the last valid layout on screen with a banner naming the problem.

## Checked

Automated (`pnpm test`): manifest validation, `duplicateFrame` (including with a proxy), canvas path rules, the canvas store (create/list/read/write/rename/remove, atomic writes, invalid manifests rejected, traversal and symlink escape refused, empty folders pruned), source-path rules for open-in-editor, static serving (traversal refused), `moorp init`.

By hand in the Browser pane against `playground/` (real mouse where noted):

- Sidebar: create `Scratch/Test One` (typed, Enter), rename to `Test Two` (double click), delete from the panel; folder appears and disappears with it.
- Frames: select and drag with the mouse (position written to the file), add a frame, bind a source in the panel (renders), change padding (hug size follows: 47 → 79 → 111 px), resize with the corner handle, duplicate (copy renders, source kept), delete the copy, rename.
- External edits: a frame added to the file by another process appears without reloading the shell or other previews; a schema-invalid file and a syntactically broken file each show a banner and keep the layout; restoring the file clears it.
- API: requests without or with a foreign `Origin`, non-JSON content types, traversal and absolute paths, invalid manifests, missing canvases, and an oversized body were all refused with no files written.
- CLI: `--help`, `--version`, `init` (creates, then keeps existing files), `init` refusing React and non-Vue projects, `dev` refusing a folder without `.visual-canvas/` and a bad `--port`, unknown command exit code.

## Bugs found while testing

- Vue reactive proxies cannot go through `postMessage` (design frames never received `init`): frame data is converted to plain objects first.
- `ResizeObserver` watches the content box, so padding changes did not resize hug frames: the adapter observes the border box.
- `duplicateFrame` used `structuredClone`, which rejects a reactive proxy, so Duplicate silently did nothing: it now clones through JSON (the manifest is JSON), with a test using a proxy.
- A file-watcher echo of an older save could overwrite local edits that were not on disk yet: echoes of this tab's own saves are ignored, and incoming changes wait while a save is pending.
- Clicking away from the new-canvas field created a stray "Untitled Canvas": only Enter creates; clicking away cancels (it still applies a rename).

## Known limits

- Only Vue + Vite. `moorp init` refuses React projects; the adapter is selected by the plugin's `adapter` option (default `@moorp/vue`).
- `@moorp/shell` and `moorp` are not published. Publishing `moorp` needs `@moorp/shell` and `@moorp/core` published first, a license, and removing `private`.
- Concurrent edits are last-writer-wins at whole-file level: the shell ignores incoming changes while its own save is pending, and its save then replaces the file.
- Frame ids come from the highest existing number, so deleting the newest frame lets its id be reused. Ids are not yet unique across a canvas's history.
- The `frame-check` fetch and the editor command are limited as described in the Phase 0 notes (local origins or `MOORP_ALLOWED_ORIGINS`; editor from `MOORP_EDITOR`).
- Keyboard and undo (Figma's keymap, ⌘ is Ctrl on Windows and Linux): ⌘Z / ⇧⌘Z (or Ctrl+Y) undo and redo; ⌘D duplicate; ⌘C / ⌘V copy and paste a frame (across canvases, each paste offset); ⌘R rename; Delete or Backspace delete; Esc deselect; arrows nudge 1 px, ⇧+arrows 10 px; Tab / ⇧Tab next and previous frame; ⇧1 fit all, ⇧2 zoom to selection, ⇧0 zoom to 100%; ⌘+ / ⌘− zoom; Space+drag pan from anywhere; Alt+drag moves a frame and leaves a copy; ⇧ while dragging constrains to an axis, ⇧ on the corner handle keeps the proportions; ⌘\ hides the panels; F adds a design frame. The same actions are in the toolbar (Undo, Redo, Fit) and listed in the panel. Undo covers frame and property edits: a drag, resize, Alt+drag or run of arrow presses is one step. Undo history is cleared when the canvas file is changed from outside or another canvas is opened, so an undo never restores a stale copy over someone else's change. Shortcuts pressed while a component has focus are forwarded from the preview (⌘ combinations, ⇧0/1/2, and Esc/Delete when nothing inside is focused); arrows and Tab stay with the component, and nothing is intercepted while typing in a field.
- Presentation and props are validated when a canvas is saved or read (`validateCanvas`).
- Not built: select all and multi-selection (so no group move, align or distribute), lock and hide, z-order, drag-to-reorder or move canvases between folders, touch gestures, canvas properties beyond the name and a reset, a scenario picker (scenario is free text), nested-element source navigation, undo for canvas create, rename and delete (only frame and property edits are undoable).
- Hand-driven tests used synthetic wheel events for zoom; trackpad feel is unchecked.
