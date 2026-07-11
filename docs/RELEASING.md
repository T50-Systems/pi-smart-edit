# Release process

The project follows Semantic Versioning and Keep a Changelog. Tag pushes automate verified GitHub releases and package artifacts; the workflow never publishes to npm.

## Version policy

- Patch: compatible fixes or documentation corrections.
- Minor: backward-compatible operations or public API additions.
- Major: incompatible CLI, tool schema, package API, or behavior changes.

## Tested release matrix

Pull-request CI validates Node.js 22 and 24 on the latest Ubuntu, Windows, and macOS GitHub-hosted runners. Release package verification runs on Node.js 22 in each OS job; tests and coverage run across the full matrix. POSIX permission enforcement is capability-based and skipped on Windows, while path, process invocation, and CRLF fixtures run everywhere.

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
npm run verify:dependencies
npm run verify:policy
npm run verify:workflows
npm audit --omit=dev --audit-level=high
npm run verify:release
```

`verify:release` checks dependency immutability, changelog structure/version history, and the dry-run package manifest. `prepare-release.mjs vX.Y.Z` additionally requires the tag, package version, lockfile versions, and dated changelog section to agree, then extracts only that version's notes.

## Verify, tag, and create the release

For a no-side-effect remote verification, run the **Release** workflow manually with an existing tag and leave `create_release` false. The workflow checks out that tag, reruns typecheck, tests, coverage, benchmark, policy, workflow YAML, audit, and package verification, then uploads a short-lived package artifact without creating a release.

After review and merge, a maintainer creates and pushes an annotated `vX.Y.Z` tag from `main`. A tag push runs the same gates, extracts notes from the matching changelog section, packs the npm tarball without publishing it, and creates one GitHub release with those notes and the tarball attached. The release job has `contents: write`; all earlier jobs remain read-only. Existing releases are never replaced.

## Failure recovery and rollback

A metadata mismatch or failed check stops before release creation. Fix the release commit through the normal pull-request process. If the original tag still points to the intended immutable release commit and no release exists, rerun verification. If the tagged commit itself is wrong, increment the package version and create a new tag after the fix. Never move, force-update, delete, or recreate an existing release tag.

Consumers roll back by pinning the previous package/tag; no data migration is required because the package owns no persistent state. npm publication remains a separate explicit maintainer action and is never performed by these workflows.
