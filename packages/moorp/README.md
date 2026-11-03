# moorp

A local-first visual workspace for code-driven frontend design: an infinite canvas of live Page and Design frames, where code stays the source of truth.

Alpha, for Vue 3 + Vite projects.

```bash
npm i -D moorp@alpha @moorp/vue@alpha
npx moorp init           # creates .visual-canvas/ with a preview.ts and a sample canvas
npx moorp dev --port 5173  # starts your Vite dev server with the canvas at /__moorp/
```

Use the `@alpha` tag; `moorp@latest` is a name-reservation placeholder. Import your global CSS in `.visual-canvas/preview.ts`.

Repository, docs and issues: https://github.com/morphine-cake/moorp
