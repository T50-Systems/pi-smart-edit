# `smart_edit` recipes

The Pi extension registers the `smart_edit` tool with `replace_unique`, `replace_between`, and `anchored_retry` modes. Run these recipes in a disposable or version-controlled file and inspect `git diff` afterward.

## Replace one unique occurrence

Use this for a small, exact semantic change:

```json
{
  "path": "src/file.ts",
  "mode": "replace_unique",
  "oldText": "const x = 1;",
  "newText": "const x = 2;"
}
```

Expected result: one occurrence changes. Zero or multiple occurrences fail instead of guessing.

Equivalent CLI:

```bash
pi-smart-edit replace-unique --path src/file.ts --old "const x = 1;" --new "const x = 2;"
```

## Replace an exact bounded block

```json
{
  "path": "src/file.ts",
  "mode": "replace_between",
  "startContent": "function demo() {",
  "endContent": "}",
  "lines": ["function demo() {", "  return 42;", "}"]
}
```

The boundaries must appear in the first 400 lines returned by the session read. If either is missing, use fresh anchored lines rather than broadening the boundaries.

Equivalent CLI:

```bash
pi-smart-edit replace-between --path src/file.ts --start "function demo() {" --end "}" --lines-json '["function demo() {","  return 42;","}"]'
```

## Recover one stale anchored edit

```json
{
  "path": "src/file.ts",
  "mode": "anchored_retry",
  "op": "replace",
  "pos": "12#ABCD1234:old line",
  "lines": ["new line"]
}
```

The helper retries at most once and only when a suggested fresh anchor has the exact original content. If it cannot identify that content, re-read and inspect the file.

Equivalent CLI:

```bash
pi-smart-edit anchored-retry --path src/file.ts --op replace --pos '12#ABCD1234:old line' --lines-json '["new line"]'
```

## Extension-author integration

The same policy is available as a library:

```ts
import { FilesystemPiClient, SmartEditSession } from '@t50-systems/pi-smart-edit';

const edits = new SmartEditSession(new FilesystemPiClient());
await edits.replaceUnique('src/file.ts', 'const x = 1;', 'const x = 2;');
```

See [configuration and recovery guidance](../docs/OPERATIONS.md) before wrapping errors or adding retries.
