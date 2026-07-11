# pi-smart-edit

Conservative smart editing for Pi workflows that hit stale hashline anchors or need exact semantic replacements.

`@t50-systems/pi-smart-edit` provides one editing policy through a library, the Pi `smart_edit` tool, and a CLI. It retries a stale anchored edit at most once and refuses ambiguous recovery.

## Quickstart

Prerequisites: Node.js 22 or 24 and Pi.

```bash
pi install git:github.com/T50-Systems/pi-smart-edit
```

Restart Pi if required, then ask it to use the installed tool:

```text
Use smart_edit in replace_unique mode to change "const x = 1;" to "const x = 2;" in src/file.ts.
```

Inspect `git diff` after the operation. A successful edit changes exactly one occurrence; a missing or duplicated match fails rather than guessing. See [copyable tool and CLI recipes](examples/smart_edit-examples.md) and the [recovery guide](docs/OPERATIONS.md).

For a verified contributor setup:

```bash
git clone https://github.com/T50-Systems/pi-smart-edit.git
cd pi-smart-edit
npm ci
npm test
```

## Why this exists

A common Pi editing loop reads a file, receives `LINE#HASH:content` anchors, and later finds those anchors stale because another operation changed the file. This package centralizes conservative retry and semantic-replacement behavior instead of duplicating it across prompts and extensions.

## Capabilities

- Retry one anchored edit using exact Pi-style stale-anchor suggestions.
- Replace one exact unique occurrence.
- Replace a region between exact content boundaries.
- Use a local Pi-compatible filesystem adapter.
- Invoke the same policy from a Pi tool, CLI, or TypeScript library.

## CLI

```bash
pi-smart-edit replace-unique --path src/file.ts --old "const x = 1;" --new "const x = 2;"

pi-smart-edit replace-between --path src/file.ts --start "function build() {" --end "}" --lines-json '["function build() {","  return 42;","}"]'

pi-smart-edit anchored-retry --path src/file.ts --pos '12#AB:old line' --op replace --lines-json '["new line"]'
```

Run `npm install -g git+https://github.com/T50-Systems/pi-smart-edit.git` if you want the CLI executable globally rather than the Pi package.

## Pi tool

The extension registers `smart_edit` with these modes:

- `replace_unique`
- `replace_between`
- `anchored_retry`

See [`examples/smart_edit-examples.md`](examples/smart_edit-examples.md) for complete payloads, expected outcomes, CLI equivalents, and library integration.

## Project documentation

- [Vision and measurable success targets](VISION.md)
- [Architecture and module boundaries](ARCHITECTURE.md)
- [Configuration, diagnostics, and recovery](docs/OPERATIONS.md)
- [Release process](docs/RELEASING.md)
- [Roadmap governance](ROADMAP.md)
- [Changelog](CHANGELOG.md)
- [Contributing](CONTRIBUTING.md) and [security policy](SECURITY.md)

## Repository layout

```text
src/          core policy, public contracts, CLI, and Pi adapter
test/         node:test unit and integration tests
benchmark/    reproducible core-policy performance baseline
examples/     copyable adoption recipes
docs/         operator and release guidance
scripts/      repository verification tooling
```

Keep filesystem behavior in the adapter, editing policy in `smart-edit.ts`, and surface translation in `cli.ts`/`extension.ts`. See [ARCHITECTURE.md](ARCHITECTURE.md) before adding a new operation.

## Validation

```bash
npm ci
npm run check
npm test
npm run coverage
npm run benchmark
npm audit --omit=dev --audit-level=high
npm run verify:release
```

`npm run verify:release` builds the package, checks changelog/version structure, and inspects `npm pack --dry-run` contents. The benchmark is a regression budget for in-process policy overhead, not filesystem throughput.

## Limits

- This is a conservative edit helper, not a diff or merge system.
- Boundary lookup reads the first 400 lines by default.
- Automatic stale-anchor recovery retries once only.
- The package emits no telemetry and requires no secrets or remote service.
- Shared anchor/edit primitives come from [`pi-anchor-edit-core`](https://github.com/T50-Systems/pi-anchor-edit-core).

## License

MIT
