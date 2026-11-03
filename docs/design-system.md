# Design system

The shell's interface uses the design system from the codeva repository (`apps/web`): the same tokens, the same component styles and the same class strings, ported from React/shadcn to Vue. Light and dark follow the system theme.

## Where things are

| Path (in `packages/shell/src`) | What |
| --- | --- |
| `styles/tokens.css` | The codeva `globals.css`, minus the Next-specific header: primitives (zinc neutrals), the Tailwind theme bridge, the type scale (`type-heading-*`, `type-body-*`, `type-code-*`), token utilities (`fg-*`, `bg-*`, `border-*`, status colours) and the semantic tokens for light (`:root`) and dark (`.dark`). Names are identical, so a codeva class string works here unchanged. |
| `styles/fonts.css` | Inter, Geist and Geist Mono (variable fonts from `@fontsource-variable`), Latin and Latin-Extended only (the latter covers Turkish). About 217 KB of font files in the shell. |
| `styles/canvas.css` | The canvas internals (pannable world, frames, toolbars, handles, overlays). These are positioned in canvas pixels and scaled by the zoom, so they stay plain CSS on tokens. |
| `components/ui/` | Core components: `Button`, `Input`, `Textarea`, `Label`, `Badge`, `Kbd`, `Separator`, `Card` (and its parts), `Select` (and trigger, content, item), `Tooltip`, `ThemeToggle`. |
| `theme.ts` | Puts the `dark` class on `<html>`. Default is the system setting; the sidebar button cycles system, light and dark and remembers it. A small script in `index.html` applies it before first paint. |
| `UiKit.vue` | The whole system on one page: open `#/__ui` in the shell. Use it to check any token or component change in both themes. |

Everything else (sidebar, canvas toolbar, frame toolbars, properties panel) is built from those components with token utility classes.

## Stack

Tailwind CSS 4.1 (`@tailwindcss/vite`), `class-variance-authority` and `tailwind-merge` (the `cn()` helper in `lib/cn.ts`), `reka-ui` (the Vue port of Radix, so `data-[state=open]` style classes carry over; used for Select and Tooltip), `lucide-vue-next` icons and `tw-animate-css`. All of it is bundled into the shell at build time; none of it is a runtime dependency (the shell package ships only `dist`). The `@/` alias points at `src/`, as in codeva.

## Porting a codeva component

1. Copy its class strings (and the `cva` variants) from `apps/web/components/ui/<name>.tsx`.
2. Write the Vue component with the same classes: merge the caller's `class` with `cn()`, keep the `data-slot` attributes, and use `reka-ui` where codeva uses a Radix primitive. Prefix changes: Radix CSS variables are `--radix-*` there and `--reka-*` here.
3. Add it to `UiKit.vue` and check it in both themes.

When codeva's tokens change, copy the new `globals.css` over `styles/tokens.css` (keep the header comment and drop the first lines up to `@custom-variant dark`).

## Differences from codeva

- **Kbd inside a tooltip.** codeva writes `bg-base/20` there, which is not a valid utility (a custom `@utility` takes no opacity modifier), so it does nothing and the key hint is unreadable on the inverted tooltip. The port uses `bg-background/20` and `dark:bg-background/10`, which is what was meant. Worth fixing in codeva too.
- **Button** sets `type="button"` by default (no forms here) and wraps plain-text children in `px-0.5` through a render function, like codeva's `wrapLabels`.
- **Select** is one composite component for the common case (a list of options and a `v-model`), built on the same trigger, content and item parts as codeva. Option values cannot be empty strings.
- **Iframes** are given `color-scheme: normal`. The shell sets `color-scheme: dark` in dark mode, and a mismatch with the light preview document makes the browser paint an opaque backdrop, which made design frames stop being transparent.
- **Fonts** are limited to two Unicode subsets instead of all of them.
- The shell's own colours come only from tokens; codeva-specific pieces (Clerk, charts, the product pages) are not ported.

## Not ported yet

Tabs, Switch, Checkbox, Radio group, Toggle group, Dialog and Alert dialog, Dropdown and Context menus, Popover, Sheet, Command, Table, Skeleton, Spinner, Progress, Sonner toasts and the rest of codeva's `components/ui`. The properties panel does not need them yet; the frame context menu and a confirm dialog (instead of `window.confirm` when deleting a canvas) would use Dropdown/Context menu and Alert dialog first.

## Checked

Light and dark, in the browser, on the UI-kit page (colour swatches, type scale, every button variant and size with disabled states, field states including invalid and disabled, both select sizes with the open menu and a chosen option, badges, kbd, card, menu and modal surfaces, separators, tooltips with key hints, the theme toggle cycling system, light and dark) and in the app itself with real clicks and typing: creating, renaming and deleting a canvas; adding a frame from the bottom toolbar; binding a source and choosing Fixed width in the panel; undo and redo from the toolbar; keyboard nudge; zoom to selection. `pnpm release:check` passes (tarballs install and run next to Vite 6 and 8).
