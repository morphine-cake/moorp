# Releasing

All four packages are versioned together and published in dependency order. While the project is alpha, every version is `0.1.0-alpha.N` and published under the `alpha` dist-tag (set in each package's `publishConfig`), so `npm i moorp@alpha` works and `latest` stays untouched. `moorp@latest` is still the `0.0.0` name-reservation placeholder.

## Before publishing

```bash
pnpm release:check
```

This builds, typechecks and tests everything, packs the four packages into `dist-release/`, inspects each tarball, installs them into a clean temporary project and runs `moorp init` and `moorp dev` against it, once next to Vite 6 and once next to the newest Vite, with no peer-dependency overrides (a fresh `npm install vite` must be able to sit next to `moorp`). Inspected for each tarball: the version, the MIT license field and file, `private` absent, `publishConfig` (public, alpha tag), no leftover `workspace:` ranges, the entry file, only `dist`, `LICENSE`, `README.md` and `package.json` inside, and (for `moorp`) an executable bin. It ends by printing the publish commands.

CI (GitHub Actions) runs build, typecheck and tests on every push; it does not run the release check.

## Publishing

You need to be logged in (`npm login`) with 2FA on the account, and to be an owner of the `@moorp` organization. Publish the tarballs the check produced (not `npm publish` from a package folder: only `pnpm pack` rewrites `workspace:*` to real versions). Run these from the repository root. The path must start with `./`, otherwise npm reads `dist-release/...` as a GitHub `owner/repo` and fails with "Repository not found". Pass `--tag alpha` explicitly: for a tarball npm ignores `publishConfig.tag` and would publish under `latest`.

```bash
npm publish ./dist-release/moorp-core-0.1.0-alpha.1.tgz --tag alpha
npm publish ./dist-release/moorp-vue-0.1.0-alpha.1.tgz --tag alpha
npm publish ./dist-release/moorp-shell-0.1.0-alpha.1.tgz --tag alpha
npm publish ./dist-release/moorp-0.1.0-alpha.1.tgz --tag alpha
```

Order matters: `@moorp/vue` and `@moorp/shell` depend on `@moorp/core`, and `moorp` depends on `@moorp/core` and `@moorp/shell`, all pinned to the exact version. Each command asks you to confirm in the browser.

## After publishing

Check the registry, then install from it in a clean folder (a Vue 3 + Vite project):

```bash
npm view moorp@alpha version
npm i -D moorp@alpha @moorp/vue@alpha
npx moorp init && npx moorp dev
```

npm can take a few minutes to make a new version available. A version cannot be re-published once used, and unpublishing is limited, so fix problems by publishing the next `alpha.N`.

## Next version

Bump `version` in all four `package.json` files to the same value (for example `0.1.0-alpha.2`), run `pnpm install` (the lockfile follows), run `pnpm release:check`, commit, and publish again. For a stable release, change `publishConfig.tag` to `latest` and the version to `0.1.0`.

## Troubleshooting

- `Repository not found` from `git ls-remote ssh://git@github.com/dist-release/...`: the path did not start with `./`, so npm read it as a GitHub `owner/repo`.
- `E404 ... /-/v1/done?authId=...` right after "Press ENTER to open in the browser": the browser approval was not completed in time (or another command was started meanwhile), and nothing was published. Run the same command again, press Enter, approve straight away, and wait for the `+ name@version` line before the next one. `npm login` first if it keeps failing.
- A new version can return 404 from `npm view` for a few minutes after `+ name@version`; wait and retry.
- npm sets `latest` on a package's first publish even with `--tag alpha`, so the three `@moorp/*` packages show `latest` as the alpha. `moorp@latest` stays `0.0.0` until a stable release, which is why installs use `moorp@alpha`.

## History

- `0.1.0-alpha.0` (2026-11-03): first alpha. Published in the order vue, core, shell, moorp (the first core attempt hit the E404 above). Installed from the registry into a copy of a real Vue 3 + Vite 5 + Tailwind 3 project; `moorp init` and `moorp dev` worked, with light and dark design frames and a page frame of the app.
- `0.1.0-alpha.1`: fixes found by trying the published alpha in a fresh project. `moorp` now installs next to Vite 7 and 8 (the peer range was `^5 || ^6`, so a new project failed with `ERESOLVE`), `setup` in `.visual-canvas/preview.ts` receives `{ frameId, scenario, props }`, and design frames have a Scenario field. The release check now installs against the newest Vite too, so this cannot regress unnoticed.
