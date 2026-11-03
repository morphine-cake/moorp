# Moorp

A local-first, open-source visual workspace for code-driven frontend design: an infinite canvas of live Page and Design frames. Code stays the source of truth; Claude Code, Codex or a developer edits real source files and frames update through HMR.

Status: early. Phase 0 (technical spike) is done and the Phase 1 shell and CLI work for Vue + Vite projects. See [docs/phase-0-spike.md](docs/phase-0-spike.md) and [docs/phase-1-shell.md](docs/phase-1-shell.md).

## Try it

```bash
pnpm install
pnpm build
pnpm --filter @moorp/playground dev
```

Then open http://localhost:5173/__moorp/. The playground is a small Vue + Vite project with a few components and canvases.

In your own Vue + Vite project (once published), the flow is:

```bash
moorp init   # creates .visual-canvas/ with a preview setup and a sample canvas
moorp dev    # starts your Vite dev server with the canvas at /__moorp/
```

## Packages

- `@moorp/core`: manifest types, validation and the preview protocol (no UI framework dependency).
- `@moorp/vue`: Vue adapter, the preview entry that mounts a component and talks to the shell.
- `@moorp/shell`: the canvas app (sidebar, canvas, properties panel), built to static files.
- `moorp`: the CLI and Vite plugin. Not published yet; `moorp@0.0.0` on npm is a name-reservation placeholder.
- `playground/`: a sample project that runs on `moorp dev`.

The `@moorp` npm organization is reserved.

## Development

```bash
pnpm build       # core, adapter, shell, then the CLI (in dependency order)
pnpm typecheck
pnpm test
```
