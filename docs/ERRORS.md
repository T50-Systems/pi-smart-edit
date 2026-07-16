# Structured error contract

`@t50-systems/pi-smart-edit` exposes one stable error contract across its library, filesystem adapter, CLI, and Pi tool.

## Public API

```ts
import {
  SmartEditError,
  SmartEditErrorCode,
  type SmartEditErrorCode as SmartEditErrorCodeValue,
} from '@t50-systems/pi-smart-edit';
```

Owned failures reject with `SmartEditError`. Its stable fields are:

- `code: SmartEditErrorCodeValue` — machine-readable classification.
- `category: 'input' | 'policy' | 'filesystem' | 'queue' | 'core'` — broad routing classification.
- `details: { code, category }` — redacted structured metadata suitable for adapters.
- `message` — human-readable diagnostic text. Do not parse it for control flow.

Success return values are unchanged.

## Taxonomy

Codes are stable: existing meanings will not be repurposed. Future releases may add codes, so consumers should include an unknown/default branch.

| Code | Category | Meaning |
|---|---|---|
| `E_INVALID_INPUT` | input | CLI command or argument is missing or invalid. |
| `E_SCHEMA_INVALID` | input | Pi tool parameters do not match the public schema. |
| `E_BOUNDARY_NOT_FOUND` | policy | Exact `replace_between` boundaries were not found. |
| `E_STALE_RECOVERY_FAILED` | policy | A stale edit could not be recovered safely. |
| `E_FILESYSTEM_NOT_FOUND` | filesystem | An owned filesystem operation reported `ENOENT`. |
| `E_FILESYSTEM_PERMISSION` | filesystem | An owned filesystem operation reported `EACCES` or `EPERM`. |
| `E_FILESYSTEM_IO` | filesystem | Another filesystem read/write failure occurred. |
| `E_QUEUE_FAILURE` | queue | Pi's file mutation queue failed outside the edit callback. |
| `E_STALE_ANCHOR` | core | An anchor no longer matches. The session may consume this once for its existing bounded retry. |
| `E_INVALID_PATCH` | core | A patch or exact replacement is invalid or non-unique. |
| `E_BAD_REF` | core | A hashline reference is invalid. |
| `E_RANGE_OOB` | core | An edit range is outside the file. |
| `E_BAD_OP` | core | The core does not support the edit operation. |
| `E_EDIT_CONFLICT` | core | Edits conflict. |
| `E_NO_MATCH` | core | Required content did not match. |
| `E_MULTI_MATCH` | core | Content matched more than once. |
| `E_WOULD_EMPTY` | core | A guarded operation would empty the file. |
| `E_CORE_FAILURE` | core | An unknown core `[E_*]` code or unclassified core failure occurred. |

## Surface behavior

### Library and filesystem adapter

Failures reject; they are not returned as successful strings.

```ts
try {
  await session.replaceUnique(path, oldText, newText);
} catch (error) {
  if (error instanceof SmartEditError && error.code === SmartEditErrorCode.InvalidPatch) {
    // Missing or ambiguous exact match; the file was not changed.
  }
}
```

The one-attempt stale-anchor recovery policy is unchanged. The first `E_STALE_ANCHOR` is consumed only when an exact suggested anchor can safely recover the request. An unsafe recovery rejects with `E_STALE_RECOVERY_FAILED`; a failed retry rejects with its core code.

### CLI

Failures write deterministic coded stderr and exit nonzero:

```text
[E_INVALID_INPUT] Missing --new
```

Multiline diagnostics retain their readable body. Successful output remains on stdout.

### Pi tool

The extension throws the same `SmartEditError`. Pi hosts that preserve error properties can inspect `code`, `category`, or `details`; other hosts still display the coded/readable failure. Host schema validation may reject malformed calls before extension execution, in which case the host owns the outer error envelope.

## Redaction decision

Structured details intentionally contain only `code` and `category`. They never copy:

- file paths;
- anchor text or hashes;
- searched or replacement content;
- raw Node.js/Pi error objects;
- queue keys or host internals.

Readable messages remain compatible and actionable and may contain the same path or stale suggestions they contained before this contract. Treat messages as operator-facing data and redact them before forwarding to an external log. The package emits no telemetry.

## Compatibility and migration

Before this contract, some core failures (for example `[E_INVALID_PATCH]`) resolved as strings. They now reject with `SmartEditError` so failures cannot be mistaken for success.

Migrate from text matching:

```ts
const result = await session.replaceUnique(path, oldText, newText);
if (result.startsWith('[E_INVALID_PATCH]')) handleInvalidPatch();
```

To code matching:

```ts
try {
  await session.replaceUnique(path, oldText, newText);
} catch (error) {
  if (error instanceof SmartEditError && error.code === SmartEditErrorCode.InvalidPatch) {
    handleInvalidPatch();
  }
}
```

During migration, readable message text is preserved, but it is not a versioned machine contract. Never broaden retries based on a code: only `SmartEditSession` owns stale recovery, and it still retries at most once.
