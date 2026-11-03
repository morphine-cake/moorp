# Moorp

A local-first, open-source visual workspace for code-driven frontend design: an infinite canvas of live Page and Design frames. Code stays the source of truth; Claude Code, Codex or a developer edits real source files and frames update through HMR.

Status: Phase 0 (technical spike). See [docs/phase-0-spike.md](docs/phase-0-spike.md).

## Packages

- `@moorp/core` — frame/canvas manifest types, validation and the preview protocol (no UI framework dependency).
- `@moorp/vue` — Vue adapter: preview entrypoint that mounts a component and speaks the preview protocol.

The package scope is provisional; the product spec uses `@visual-canvas/*`.
