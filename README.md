# pi-smart-edit

Smart editing helpers for Pi workflows that frequently hit stale anchors or need a safer semantic edit wrapper.

`@t50-systems/pi-smart-edit` combines a local hashline filesystem adapter, retry helpers, a Pi extension tool, and a small CLI. It is designed to sit above anchor-based read/edit tooling and recover from common `[E_STALE_ANCHOR]` failures by re-reading suggested anchors and retrying carefully.

## Why this exists

A common Pi editing loop is:

1. `read` a file and receive `LINE#HASH:content` anchors.
2. `edit` one section.
3. Formatting, generation, or another edit changes the file.
4. A later edit uses stale anchors and Pi returns `[E_STALE_ANCHOR]`.

This package provides reusable helpers for retrying those edits and for expressing common semantic operations such as “replace the unique occurrence” or “replace between these boundaries.”

## Capabilities

- `replaceAnchoredWithRetry()` retries an anchored edit using Pi-style stale-anchor suggestions.
- `replaceBetween()` replaces a bounded region by matching start/end content.
- `replaceUnique()` replaces one exact unique occurrence.
- Local hashline adapter reads and edits files in Pi-shaped format.
- Pi extension entrypoint registers the `smart_edit` tool.
- CLI entrypoint `pi-smart-edit` exposes the same core operations outside Pi.

## Repository layout

```text
src/
  anchors.ts             stale-anchor parsing helpers
  cli.ts                 command-line interface
  extension.ts           Pi extension registration for smart_edit
  filesystem-client.ts   local hashline read/edit adapter
  smart-edit.ts          retry/session and semantic edit helpers
  types.ts               shared operation types
examples/                copyable smart_edit payloads and prompts
test/                    node:test coverage
tsconfig.json            TypeScript build config
```

## Install

As a Pi package:

```bash
pi install git:github.com/T50-Systems/pi-smart-edit
```

For local development:

```bash
git clone https://github.com/T50-Systems/pi-smart-edit
cd pi-smart-edit
npm install
npm run build
```

## CLI usage

Replace one unique text occurrence:

```bash
pi-smart-edit replace-unique \
  --path src/file.ts \
  --old "const x = 1;" \
  --new "const x = 2;"
```

Replace between two boundary lines:

```bash
pi-smart-edit replace-between \
  --path src/file.ts \
  --start "function build() {" \
  --end "}" \
  --lines-json '["function build() {", "  return 42;", "}"]'
```

Retry an anchored edit:

```bash
pi-smart-edit anchored-retry \
  --path src/file.ts \
  --pos '12#AB:old line' \
  --op replace \
  --lines-json '["new line"]'
```

## Pi tool modes

The extension registers `smart_edit` with these modes:

- `replace_unique`
- `replace_between`
- `anchored_retry`

See [`examples/smart_edit-examples.md`](examples/smart_edit-examples.md) for ready-to-copy payloads and prompt patterns.

## Development

```bash
npm install
npm run build
npm run check
npm test
```

`npm test` builds first through `pretest` and then runs the compiled `node:test` suite.

## Notes

- This is a conservative edit helper, not a full diff/merge system.
- The local adapter intentionally mirrors Pi-style hashline behavior.
- The package depends on [`pi-anchor-edit-core`](https://github.com/T50-Systems/pi-anchor-edit-core) for shared anchor/edit primitives.

## License

MIT
