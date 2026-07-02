# pi-smart-edit

Smart editing helpers for Pi focused on frequent `[E_STALE_ANCHOR]` failures.

## What this repo now includes

1. **Real local hashline adapter**
   - `src/filesystem-client.ts`
   - Reads files in hashline format and applies anchored edits locally
   - Detects stale anchors and emits Pi-style `[E_STALE_ANCHOR]` errors

2. **Retry/session layer**
   - `src/smart-edit.ts`
   - `replaceAnchoredWithRetry()` retries using suggested `>>> LINE#HASH` anchors
   - `replaceBetween()` and `replaceUnique()` provide semantic helpers

3. **Pi extension tool**
   - `src/extension.ts`
   - Registers a `smart_edit` tool for Pi
   - Designed for use as a Pi package/extension

4. **CLI**
   - `pi-smart-edit`
   - Useful outside Pi too

5. **Tests**
   - `test/*.test.ts`
   - Covers stale parsing, retry behavior, and local filesystem adapter behavior

## Why this exists

A common Pi workflow is:

1. `read`
2. `edit`
3. `fmt` or another edit changes the file
4. a second `edit` uses old anchors
5. Pi returns `[E_STALE_ANCHOR]`

This repo reduces that friction with a smarter wrapper and a Pi-facing tool.

## CLI usage

### Replace unique text

```bash
pi-smart-edit replace-unique \
  --path src/file.ts \
  --old "const x = 1;" \
  --new "const x = 2;"
```

### Replace between two anchored contents

```bash
pi-smart-edit replace-between \
  --path src/file.ts \
  --start "fn start() {" \
  --end "}" \
  --lines-json '["fn start() {", "  return 42;", "}"]'
```

### Retry an anchored edit

```bash
pi-smart-edit anchored-retry \
  --path src/file.ts \
  --pos '12#ABCD1234:old line' \
  --op replace \
  --lines-json '["new line"]'
```

## Use from Pi

This package exposes a Pi extension entrypoint:

- `dist/extension.js`

The extension registers a tool named:

- `smart_edit`

### Tool modes

- `replace_unique`
- `replace_between`
- `anchored_retry`

### Example Pi usage intent

Ask Pi to use the `smart_edit` tool when:
- a normal anchored edit went stale
- you want boundary-based replacement
- you want a safer retry loop around hashline editing

## Install as a Pi package

Intended flow:

```bash
pi install git:github.com/T50-Systems/pi-smart-edit
```

Or load locally during development with an extension path after build.

## Development

```bash
npm install
npm run check
npm test
```

## Notes

- The local adapter is intentionally conservative and Pi-shaped.
- The extension is the Pi-facing integration point.
- This is aimed at practical editing ergonomics, not full diff/merge tooling.
