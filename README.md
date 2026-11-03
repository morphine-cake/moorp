# Moorp

A local-first, open-source visual workspace for code-driven frontend design: an infinite canvas of live Page and Design frames. Code stays the source of truth; Claude Code, Codex or a developer edits real source files and frames update through HMR.

Status: early. Phase 0 (technical spike) is done and the Phase 1 shell and CLI work for Vue + Vite projects. See [docs/phase-0-spike.md](docs/phase-0-spike.md), [docs/phase-1-shell.md](docs/phase-1-shell.md) and [docs/real-project-trial.md](docs/real-project-trial.md).

## Try it

```bash
pnpm install
pnpm build
pnpm --filter @moorp/playground dev
```

Then open http://localhost:5173/__moorp/. The playground is a small Vue + Vite project with a few components and canvases.

In your own Vue 3 + Vite project, install the alpha and run:

```bash
npm i -D moorp@alpha @moorp/vue@alpha
npx moorp init   # creates .visual-canvas/ with a preview setup and a sample canvas
npx moorp dev    # starts your Vite dev server with the canvas at /__moorp/
```

Use the `@alpha` tag: `moorp@latest` is still a name-reservation placeholder without a CLI. Then import your global CSS in `.visual-canvas/preview.ts` (the generated file shows where), and add frames in the canvas or by editing `.visual-canvas/canvases/*.canvas.json`.

## Packages

- `@moorp/core`: manifest types, validation and the preview protocol (no UI framework dependency).
- `@moorp/vue`: Vue adapter, the preview entry that mounts a component and talks to the shell.
- `@moorp/shell`: the canvas app (sidebar, canvas, properties panel), built to static files.
- `moorp`: the CLI and Vite plugin.
- `playground/`: a sample project that runs on `moorp dev`.

Versions move together (`0.1.0-alpha.N`). The `@moorp` npm organization is reserved. See [docs/releasing.md](docs/releasing.md) for how a release is checked and published.

## Development

```bash
pnpm build       # core, adapter, shell, then the CLI (in dependency order)
pnpm typecheck
pnpm test
pnpm release:check   # full pre-publish check: build, tests, tarballs, clean install, moorp dev
```

## License

[MIT](LICENSE)
