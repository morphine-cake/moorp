# Releasing

All four packages are versioned together and published in dependency order. While the project is alpha, every version is `0.1.0-alpha.N` and published under the `alpha` dist-tag (set in each package's `publishConfig`), so `npm i moorp@alpha` works and `latest` stays untouched. `moorp@latest` is still the `0.0.0` name-reservation placeholder.

## Before publishing

```bash
pnpm release:check
```

This builds, typechecks and tests everything, packs the four packages into `dist-release/`, inspects each tarball, installs them into a clean temporary project and runs `moorp init` and `moorp dev` against it. Inspected for each tarball: the version, the MIT license field and file, `private` absent, `publishConfig` (public, alpha tag), no leftover `workspace:` ranges, the entry file, only `dist`, `LICENSE`, `README.md` and `package.json` inside, and (for `moorp`) an executable bin. It ends by printing the publish commands.

CI (GitHub Actions) runs build, typecheck and tests on every push; it does not run the release check.

## Publishing

You need to be logged in (`npm login`) with 2FA on the account, and to be an owner of the `@moorp` organization. Publish the tarballs the check produced (not `npm publish` from a package folder: only `pnpm pack` rewrites `workspace:*` to real versions). Run these from the repository root. The path must start with `./`, otherwise npm reads `dist-release/...` as a GitHub `owner/repo` and fails with "Repository not found". Pass `--tag alpha` explicitly: for a tarball npm ignores `publishConfig.tag` and would publish under `latest`.

```bash
npm publish ./dist-release/moorp-core-0.1.0-alpha.0.tgz --tag alpha
npm publish ./dist-release/moorp-vue-0.1.0-alpha.0.tgz --tag alpha
npm publish ./dist-release/moorp-shell-0.1.0-alpha.0.tgz --tag alpha
npm publish ./dist-release/moorp-0.1.0-alpha.0.tgz --tag alpha
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

Bump `version` in all four `package.json` files to the same value (for example `0.1.0-alpha.1`), run `pnpm install` (the lockfile follows), run `pnpm release:check`, commit, and publish again. For a stable release, change `publishConfig.tag` to `latest` and the version to `0.1.0`.
