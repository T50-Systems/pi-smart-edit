# Release process

The project follows Semantic Versioning and Keep a Changelog. Releases are maintainer-triggered; CI never publishes packages.

## Version policy

- Patch: compatible fixes or documentation corrections.
- Minor: backward-compatible operations or public API additions.
- Major: incompatible CLI, tool schema, package API, or behavior changes.

## Prepare

1. Start from current `main` with a clean tree.
2. Move relevant `CHANGELOG.md` entries from `[Unreleased]` to a dated version section.
3. Set the same version in `package.json` and `package-lock.json`.
4. Document migration or rollback notes for behavior changes.
5. Run:

```bash
npm ci
npm run check
npm test
npm run coverage
npm run benchmark
npm audit --omit=dev --audit-level=high
npm run verify:release
```

`verify:release` checks changelog structure/version history and the dry-run package manifest. Inspect the displayed tarball contents before publishing.

## Tag and publish

After review and merge, a maintainer creates an annotated `vX.Y.Z` tag from `main`, publishes the GitHub release from the matching changelog section, and publishes only if the npm distribution is intended. Never publish from an unreviewed working tree.

## Upgrade and rollback

Consumers should read every version section between their current and target versions, update in a branch, and rerun their editing smoke tests. Roll back by pinning the previous package/tag; no data migration is required because the package owns no persistent state.
