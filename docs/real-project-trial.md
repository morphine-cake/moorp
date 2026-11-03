# Trial on a real project

The first run of Moorp outside the playground, on a copy of `JC-Design-System`: Vue 3.4, Vite 5, Tailwind 3 (PostCSS), plain JavaScript, no router or store, one component of about 10,000 px tall. The original folder was not touched.

## How it was installed

`pnpm pack` produced tarballs for `@moorp/core`, `@moorp/vue`, `@moorp/shell` and `moorp`, and all four were installed together with `npm install --save-dev <tarballs>`, the way a user would after publishing. Then `npx moorp init` and `npx moorp dev --port 5174`. npm resolved the inter-package versions from the tarballs, so nothing was fetched from the registry (the packages are not published except the `moorp@0.0.0` placeholder).

`init` needed one manual step, as designed: `.visual-canvas/preview.ts` imports the project's global stylesheet (`import '../src/style.css'`), which is where Tailwind and the design-token CSS variables come from.

## What was checked

| Check | Result |
| --- | --- |
| Install from tarballs, `init`, `dev` | Worked first time on Vite 5 and a JS project. No errors in the server log. |
| Fidelity | Real components render in design frames with the project's Tailwind CSS: the `--bg-neutral-base` variable resolves, headings are 30 px and the same color as in the running app, shown next to a page frame of the real app (`/`). |
| HMR | Editing a heading in `ColorPalette.vue` updated the frame with no reload of any frame or of the shell. |
| 20 heavy frames | `DesignTokens.vue` (about 10,000 px tall) in 20 frames of 900 × 600: all rendered, JS heap 28.5 MB, panning at the display refresh rate (8.3 ms average, 9.2 ms p95), also zoomed out to 10%. 20 page frames of the real app: all rendered, one `frame-check` request, 8.4 ms average. |
| Edit with 20 frames open | Changing the heading in the heavy component reached all 20 frames in 321 ms (measured from just before the file write), with no frame reloaded. |
| Per-frame props | A JSON `props` field on a frame passes props to the component; saved to the manifest, applied without a remount, invalid JSON and non-objects rejected in the panel. |
| Dark theme next to light | Duplicating the tokens frame and setting `Class on <html>` to `dark` on the copy gave `html.dark` and the dark CSS variables in that frame only (`--bg-neutral-base` `13 43 70` vs `255 255 255`, heading `rgb(255, 255, 255)` vs `rgb(13, 43, 70)`). |
| Zoom to fit | The Fit button fits all five frames, with the 6,300 px component, into a narrow canvas. |

## Gaps this exposed, and what was done

- **Props alone cannot show a theme.** This project's `isDark` prop barely changes anything; its dark mode is the `dark` class on `<html>` plus CSS variables. Added `presentation.htmlAttributes` (for example `{ "class": "dark" }` or `{ "data-theme": "dark" }`), applied to the preview document's `<html>` element, with a "Class on `<html>`" field in the panel. Other attributes are set in the canvas file. Attribute names are validated (letters, digits, `_ : . -`; no `on*` event attributes) and values must be strings.
- **Presentation fields were not validated.** `validateCanvas` now checks background, padding, alignment, overflow and `htmlAttributes`.
- **No way to navigate a large canvas.** Added Fit (all frames), Zoom to (one frame) and a 2% minimum zoom.
- **Hash navigation.** Back/forward and edited URLs now switch canvases.
- **Package contents.** `@moorp/core` and `@moorp/vue` tarballs contained source and test files; they now ship only `dist`.

## Still open

- **Hug with wrapping content.** A hug frame starts 2,000 px wide, so content that wraps to the available width (the colour palette's card grid) hugs to 1,531 px, not to a size anyone chose. For layout-driven components a fixed width is the right setting; the panel does not yet say so.
- **Dark frames need a background.** The preview document is transparent, so a dark frame shows the canvas behind it unless the frame's background is set.
- **No router, store or i18n was involved.** `preview.ts` for providers is still only exercised in the playground (vue-router). A project with Pinia or i18n is the next real test.
- **Only one project, one framework.** React and Nuxt/Next projects on this machine could not be tried.
- **Frame ids** are numbered from the highest existing one, so a duplicate after deleting the newest frame can reuse an id.
