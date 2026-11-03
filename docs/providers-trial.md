# Trial with Pinia, vue-i18n and vue-router

A small Vue 3 app (a cart summary component that uses a Pinia store, vue-i18n and a `router-link`), installed with the published `0.1.0-alpha.0` packages and run with `moorp dev`. The aim was to check that `.visual-canvas/preview.ts` really covers application providers, which the earlier trials did not.

## What worked

- **Providers in design frames.** `setup(app)` installing Pinia, vue-i18n and a memory router was enough: the component rendered with its translations, store state and a working `router-link`.
- **Independent state.** Each frame is its own iframe with its own app and store. Adding items in one frame left the other frames untouched.
- **Router isolation.** With a memory history, clicking a link in a frame did not change the shell's URL or any other frame.
- **Vite versions.** Moorp ran on Vite 5, 6 (earlier trials), 7 and 8 (this one).

## Gaps found, and what was done

1. **`moorp` would not install next to a new Vite.** A fresh `npm install vite` gives Vite 8, and the peer range was `^5 || ^6`, so `npm i -D moorp@alpha` failed with `ERESOLVE`. The range is now `^5 || ^6 || ^7 || ^8`, after running the same project on Vite 8 and 7. *This is the first thing a new user of the published alpha hits; it needs a new alpha to ship (see below).*
2. **No way to vary a frame's providers.** `setup(app)` got no frame information, and a frame's `scenario` was ignored, so a Turkish and an English frame of one component looked the same. `setup` now receives `(app, { frameId, scenario, props })`, and the properties panel has a **Scenario** field (changing it reloads the frame). A `preview.ts` can then do `createI18n({ locale: context.scenario ?? 'en' })` or seed a store. `scenario` is validated as a string.

## Limits

- Frames mount the component directly, not the app's router outlet, so a route change does not change what a frame shows. To show a component at a given route, use a Page Frame of the real app.
- A scenario change reloads the frame (store state in it is lost); props and presentation changes update in place.
- Only one provider combination was tried. Nuxt-style auto-imports, global component registration through plugins that need the DOM, and SSR frameworks were not.
