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

Run on 2026-11-03 against `playground/` (Vue 3.5 + Vite 6), shell at `/`, per-frame preview at `/preview.html`.

| # | Experiment | Result |
| --- | --- | --- |
| 2 | Design Frame, one component | Pass. `Counter.vue` mounts through `@moorp/vue` in an iframe with global CSS (`--accent`) and a router from `.visual-canvas/preview.ts`; frames report `ready` and `size`. |
| 3 | HMR with many frames | Pass. Editing `Counter.vue` updated all 5 iframes in about 2 s, with no iframe reload (same document, `timeOrigin` unchanged) and per-frame state kept. |
| 4 | Independent state | Pass. Clicking frame 1 left frame 2 and the others unchanged. |
| 5 | Manifest round trip | Pass (agent step simulated by a direct file edit). Editing the manifest to bind blank `frame-6` to `Counter.vue` rendered it live with no restart, and the other frames kept their state and were not reloaded. A malformed edit (`type: "blob"`) showed a banner naming the field while the last valid layout stayed on screen; fixing it cleared the banner. Not yet tested with Claude Code actually generating the component and writing the binding. |

Findings:

- **Hug sizing fixed.** `init` now carries `hug`; the preview root is `inline-block` for hug frames, and the shell starts hug iframes at 2000 px and shrinks them to the reported size (Counter: 93 × 35 px). Known limit: content sized with `%`/`vw` depends on the iframe size, so it can feed back; not yet tested at other canvas zoom levels (experiment 6).
- **Frame presentation is not applied yet.** `padding`, `alignment` and `overflow` are in the manifest but only `background` is used by the spike shell.
- **Manifest reconcile.** The shell keeps frames across manifest edits and only recreates a frame when its type, source, scenario or hug mode changes, so unrelated frames keep their state.

### Experiment 7 — gesture arbitration (synthetic events)

| Gesture | Result |
| --- | --- |
| Wheel on empty canvas | Pans the canvas. |
| Ctrl/pinch wheel on empty canvas | Zooms around the cursor (scale clamped to 0.1–4). |
| Plain wheel inside a frame | Stays with the frame; the canvas does not move. |
| Ctrl/pinch wheel inside a frame | Forwarded to the shell as a `zoom` message (iframe coordinates, converted using the iframe rect and canvas scale) and zooms the canvas. |
| Drag on empty canvas | Pans. |
| Drag a frame's toolbar | Moves the frame by `dx / scale`, correct at 0.1×. |
| Iframes during a drag | `pointer-events: none` while dragging and restored afterwards, so the pointer is never swallowed. |

Chosen approach: the shell owns wheel and drag on the canvas and toolbars; each iframe keeps its own scroll, clicks and typing, and only forwards pinch / ctrl+wheel. The canvas is a CSS-transformed layer (`translate` + `scale`).

Limits: all checks used dispatched events, not a real trackpad or mouse, so wheel sensitivity is unverified. A mouse-wheel notch (deltaY ±100) zooms about 2.7× with the current `exp(-deltaY * 0.01)`, which is too coarse; the delta needs normalising (line vs pixel mode, clamp) before it feels right. Frame moves are not persisted back to the manifest yet, and a manifest edit resets a moved frame to its saved `x`/`y`. Keyboard modifiers (space-drag, middle button) and touch are untested.

### Experiment 1 — Page Frame fidelity

The same `demo.html` (media queries at 600/1000 px, a `position: fixed` header, a `position: sticky` heading inside a scroll container) embedded as `type: "page"` frames at 375, 768 and 1280 px wide.

| Check | Result |
| --- | --- |
| Viewport units / media queries follow the iframe width | Pass. `innerWidth` was 375 / 768 / 1280 and the three breakpoints gave three different backgrounds. |
| `position: fixed` follows the iframe viewport | Pass. After scrolling the page 200 px the header stayed at `top: 0`, full frame width. |
| `position: sticky` follows its scroll container | Pass. After scrolling the container 100 px the heading stayed at the container's top. |
| Canvas zoom does not change the page's viewport | Pass. At 0.135× the 375 px frame still reported `innerWidth` 375 and no 600 px media query. |
| Embedding blocked by headers | Pass for `X-Frame-Options: DENY`: the frame shows "Cannot embed /blocked: X-Frame-Options: DENY". |

How blocking is detected: a browser cannot read why a cross-origin iframe stayed blank, so the dev server exposes `/__moorp/frame-check?url=`, which fetches the URL and reads `X-Frame-Options` and CSP `frame-ancestors` (DENY blocks everyone; SAMEORIGIN and a restrictive `frame-ancestors` block cross-origin embedders). Only `http(s)` URLs are fetched.

Limits: only same-origin pages and one blocked header were tested, not a real third-party site or a framework dev server. The check endpoint is an open fetch proxy on the dev server (server-side request forgery risk if it were ever exposed beyond localhost), so it needs an allow-list of the project's own origins before it ships. A page that blocks embedding with JavaScript frame-busting is not detected. The core validator now requires `url` on page frames.

### Experiment 8 — source navigation round trip

An "Open source" button on the toolbar of every frame with a bound source calls `POST /__moorp/open-source { file }` on the dev server, which opens the file in the editor named by `MOORP_EDITOR` (default `code`). Code is in `playground/open-source.ts`.

| Case | Result |
| --- | --- |
| Valid project file | Pass. The editor was started with the absolute path; one invocation per click, also from the real button (6 bound design frames show it, page and blank frames do not). |
| `../package.json` | Refused, 403. |
| Absolute path (`/etc/hosts`) | Refused, 403. |
| Symlink pointing outside the project | Refused, 403 (unit test; the path is resolved with `realpath` before the check). |
| `node_modules/...` | Refused (pnpm's links resolve outside the project, and the path is also blocked by name). |
| Extension not on the allow-list (`.vue .ts .tsx .js .jsx .css .json .html .svelte`) | Refused, 403. |
| Missing file, bad JSON, non-string `file` | 404, 400, 400. |
| Request from another origin, or with no `Origin` header | Refused, 403: any web page can send requests to localhost, so the `Origin` host must equal the server's own. |
| Non-JSON content type, or GET | 415, 405. |

The editor is started with `execFile` (no shell) and the path as a single argument, so a file name cannot inject commands.

Limits: the editor is a command string from an environment variable split on spaces, so editors that need arguments with spaces are not supported. Line/column navigation and editor detection (VS Code, Cursor, JetBrains) are not implemented. The `Origin` check protects against other websites, not against other local processes. This endpoint belongs in the future CLI package rather than the playground.

### Experiment 6 — hug sizing across canvas zoom

`Counter` hug frames on the main canvas, zoomed 1× → 0.25× → 4× → 0.1× → 1×.

| Check | Result |
| --- | --- |
| Hug size at each zoom | Pass. 93 × 35 px every time; zoom is a CSS transform on the canvas layer and does not change what the iframe measures. |
| Feedback loop | Pass. No further `size` messages in the 3 s after zooming stopped. |
| Content change | Pass. Text growing to `Count: 1000000000` widened the frame to 121 px; resetting it returned 93 px. |

Limits: content sized relative to its container (`width: 100%`, `vw` units) was not tested; with an `inline-block` root such content can collapse or depend on the 2000 px start size, so hug needs a documented rule for it. Fixed-size frames were not re-checked at extreme zoom.

### Experiment 9 — 20 live frames

Same shell, `?canvas=Perf/Design20` (20 hug Counter frames) and `?canvas=Perf/Page20` (20 page frames of `demo.html`, 280 × 220 px), in the Browser pane, 4 s after load. Frame time was measured with `requestAnimationFrame` while synthetic wheel events panned the canvas for 2 s.

| | 20 Design Frames | 20 Page Frames |
| --- | --- | --- |
| All frames ready | 238 ms | all 20 loaded within 4 s |
| JS heap (shared isolate) | 15.5 MB | 25.3 MB |
| Frame time panning at 100% | avg 8.3 ms, p95 9.2 ms | avg 8.3 ms, p95 8.4 ms |
| Frame time with all 20 visible (~0.17×) | avg 8.3 ms, p95 9.2 ms | avg 8.3 ms, p95 9.3 ms |

8.3 ms is the display's refresh interval (120 Hz), so panning was not limited by 20 frames of this size.

Findings and limits:

- The test components are tiny. A real app page or a component with heavy providers and images will cost much more per frame, so this shows the canvas and iframe overhead is small, not that 20 real frames are cheap. Re-run against a real project before fixing a budget.
- Synthetic wheel events do not exercise layout inside the frames; frames were idle while panning.
- `frame-check` fetches every Page Frame URL once more, so each page is requested twice (40 requests for 20 frames). Cache the result per URL, and only re-check on URL change or on a failed load.
- Suspending or snapshotting offscreen frames is not needed at this scale; revisit with real content.

Not run: none. Exit gate status: 2, 3, 4 and 5 pass, with the caveat above on 5. All nine experiments now have a recorded result.
