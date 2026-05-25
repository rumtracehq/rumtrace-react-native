# Release Flow

This package uses [Changesets](https://github.com/changesets/changesets) to collect release notes, version the package, and publish to npm. After the initial local step, everything is automated by GitHub Actions.

## Authoring a change

1. Make the code change on a feature branch.
2. Run `pnpm changeset`.
3. Select `@rumtrace/rumtrace-rn-ios` and the semver bump (`patch`, `minor`, or `major`).
4. Write a short user-facing summary for the changelog.
5. Commit the generated `.changeset/*.md` file alongside the code change.
6. Open a pull request against `main`.

Use `patch` for fixes, `minor` for backwards-compatible features, and `major` for breaking changes.

> **Native SDK pin.** The version of `RumtraceIosSdk` consumed by the CocoaPod is pinned in `package.json` → `rumtrace.iosSdkVersion`. When a release upgrades the native SDK, bump that field and write a `minor` (or `major` for breaking native changes) changeset describing the upgrade.

Pull requests run the `CI` workflow (typecheck, lint, build via `react-native-builder-bob`).

## Publishing (automated)

On every push to `main`, the `Publish Package` workflow runs:

1. Installs deps, runs typecheck and lint.
2. Invokes the Changesets action:
   - If pending changesets exist, it opens or updates a `chore: version packages` PR that bumps `package.json`, updates `CHANGELOG.md`, and consumes the changeset files.
   - If that PR has already been merged (no pending changesets, but new version on `main`), it runs `pnpm release`: builds the package via `bob build`, publishes to npm with provenance via OIDC, creates the git tag, and creates a GitHub Release containing the changelog entry.

So the only human step after authoring is reviewing and merging the version PR. No workflow dispatch, no tag creation by hand, no manual GitHub release.

The published artifact contains the build outputs declared in `package.json` → `files` (`lib/`, `src/`, `ios/`, the podspec, README). When `RumtraceRnIos` is consumed via CocoaPods, it picks up the matching `RumtraceIosSdk` version automatically.

## Security

- The workflow is restricted to `rumtracehq/rumtrace-react-native` via a `github.repository` guard.
- It runs inside the `npm-publish` GitHub environment. Configure that environment with required reviewers so publishes wait for maintainer approval.
- External contributor PRs only trigger the `CI` workflow on `pull_request`; they never run the publish job because publishing only runs on `push` to `main` (which requires merge access).
- npm publishing uses [trusted publishing via GitHub Actions OIDC](https://docs.npmjs.com/trusted-publishers). Configure npm to trust this repository and `.github/workflows/publish.yml`.
- Action versions are pinned to commit SHAs.

## Local commands

- `pnpm changeset` creates a changeset file.
- `pnpm version-packages` applies pending changesets locally (normally CI does this).
- `pnpm release` builds and publishes (normally CI does this).
- `pnpm build` runs `bob build` to produce `lib/{commonjs,module,typescript}` for inspection.
