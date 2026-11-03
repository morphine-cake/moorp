# Phase 0 — Technical spike plan

Goal: prove that the accepted architecture (isolated iframe previews, framework adapters, JSON manifests, source binding by plain file edits) works against a real project before building the full canvas shell. Exit criteria from the spec: real application/component fidelity and live reload demonstrated.

Working defaults (not yet approved, chosen so the spike can start): TypeScript, pnpm workspace, Vue 3 + Vite for both the shell and the first adapter.

## Decisions the spike must lock

| Decision | Draft | How the spike settles it |
| --- | --- | --- |
| Manifest schema | `Canvas { version, frames[] }`, `Frame.source` is `{ file, export? } \| null`, `width/height` number or `'hug'` | Implemented in `@moorp/core` with a validator; Claude Code binds a source by editing the JSON (experiment 5). |
| Source binding write path | Plain file edits to `.visual-canvas/canvases/**.canvas.json`; no agent API | Check that invalid or partial edits are detected and surfaced, not crashed on. |
| Preview protocol | postMessage, `moorp/1`: `init`, `update`, `dispose` down; `ready`, `size`, `error`, `hmr` up | Used by every experiment below. |
| Design Frame entry | Adapter-provided entry served by the user's Vite dev server, loads `.visual-canvas/preview.ts` | Experiment 2. |

## Experiments

Each has a pass/fail result recorded at the bottom of this file.

1. **Page Frame fidelity.** Embed a running local app route in an iframe at 375/768/1280 px. Pass: media queries follow iframe width, `position: fixed` follows the iframe viewport, sticky works in the right scroll container, and `X-Frame-Options`/CSP blocks are detected with a readable message.
2. **Design Frame, one component.** Mount a real Vue component through `@moorp/vue` in an iframe, with global CSS, fonts, a router and one provider from `preview.ts`. Pass: matches the same component rendered in the app.
3. **HMR with many frames.** The same component in 5 frames, then edit the source. Pass: all 5 update without a full reload, state in other frames is kept, and no frame is left stale.
4. **Independent state.** Two frames of one component, different props/scenario. Pass: interacting with one does not affect the other.
5. **Manifest round trip with an AI agent.** Create a blank frame (`source: null`), have Claude Code generate a component and bind it by editing the manifest. Pass: the preview renders without a restart; a malformed edit shows an error on the frame and the previous layout survives.
6. **Hug sizing.** Auto-size via `ResizeObserver` plus `size` messages. Pass: no layout feedback loops at 25%/100%/400% canvas zoom; fixed sizing is stable.
7. **Gesture arbitration.** Canvas pan/zoom around interactive iframes. Pass: wheel, drag and pinch on empty canvas navigate; the same gestures inside a frame go to the frame; the toolbar drags the frame. Document the chosen hit-testing approach.
8. **Source navigation round trip.** Open source in the editor from the toolbar. Pass: opens the right file from an allow-listed path, and refuses paths outside the project.
9. **Scale.** 20 live Page Frames vs 20 Design Frames. Record memory and frame times; decide whether offscreen frames need suspend or lazy-load in the MVP.

## Order and exit gate

Experiments 2 and 3 first: if Design Frames cannot be mounted reliably with HMR across several iframes, the architecture changes (for example, one iframe per component instead of per frame, or native mounting), so everything else waits on that result. Then 5 (it fixes the manifest schema), then 1, 4, 6, 7, 8, 9.

Exit gate: experiments 2, 3, 4 and 5 pass. Others may be recorded as known risks with a mitigation.

## Deliverables

- Approved manifest schema and preview protocol in `@moorp/core`.
- Working `@moorp/vue` preview entry and a playground app that exercises it.
- A short results section below, and the decisions above written back to the Notion pages (shell stack, first adapter, CLI name).

## Results

_Not started._
