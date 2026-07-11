# Contributing

Thanks for improving `pi-smart-edit`. Keep changes small, testable, and focused on conservative file editing behavior.

## Prerequisites

- Git
- Node.js 22 or 24 (the versions exercised in CI)
- npm, included with Node.js

The project does not require environment variables or external services for local development and tests.

## Clone to verified change

```bash
git clone https://github.com/T50-Systems/pi-smart-edit.git
cd pi-smart-edit
npm ci
npm run check
npm test
npm run coverage
npm run benchmark
npm run verify:release
```

`npm run check` performs a TypeScript typecheck without emitting files. `npm test` first builds into `dist/`, then runs the compiled `node:test` suite. Coverage, benchmark, and release-package checks are documented in [VISION.md](VISION.md) and [docs/RELEASING.md](docs/RELEASING.md).

## Development workflow

1. Create a branch from the current `main` branch.
2. Make one focused change and add or update tests when behavior changes.
3. Run `npm run check` and `npm test` locally.
4. Update the README or examples when a user-facing command, payload, or limitation changes.
5. Open a pull request that explains the reason for the change and the validation performed.

Do not commit generated `dist/`, `node_modules/`, local environment files, credentials, tokens, or npm debug logs.

## Project map

- `src/anchors.ts`: stale-anchor parsing helpers
- `src/filesystem-client.ts`: local Pi-shaped hashline adapter
- `src/smart-edit.ts`: retry and semantic edit operations
- `src/extension.ts`: Pi `smart_edit` tool registration
- `src/cli.ts`: command-line entrypoint
- `test/`: unit and integration-style tests using `node:test`
- `examples/`: copyable payloads and prompt patterns

Keep filesystem behavior in the adapter, editing policy in `smart-edit.ts`, and Pi-specific registration in `extension.ts`. Shared public types belong in `src/types.ts`.

## Testing guidance

Use temporary directories for filesystem tests and clean them up after each test. Cover both the successful path and actionable failure behavior, especially for uniqueness checks, stale anchors, and boundary matching.

Run an individual compiled test after building with:

```bash
npm run build
node --test dist/test/smart-edit.test.js
```

## Reporting security concerns

Do not open a public issue for a suspected vulnerability or include secrets in test fixtures. Follow [SECURITY.md](SECURITY.md) instead.
