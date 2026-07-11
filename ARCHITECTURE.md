# Architecture

## System context

`pi-smart-edit` is a local TypeScript package with three entry surfaces:

```text
Pi smart_edit tool ─┐
CLI command ────────┼─> SmartEditSession ─> PiClient port ─> FilesystemPiClient
Library consumer ───┘          │                         (pi-anchor-edit-core)
                               └─> anchor parsing (pi-anchor-edit-core)
```

There is no service, database, background worker, network control plane, or runtime telemetry. The only production dependency owns shared hashline parsing and filesystem edit primitives.

## Module boundaries

| Module | Responsibility | Must not own |
|---|---|---|
| `src/smart-edit.ts` | Editing policy, semantic operations, one bounded stale-anchor retry | CLI parsing or Pi registration |
| `src/anchors.ts` | Public re-exports of shared anchor primitives | Filesystem I/O |
| `src/filesystem-client.ts` | Public filesystem adapter re-export | Recovery policy |
| `src/types.ts` | Public port and operation contracts | Runtime behavior |
| `src/extension.ts` | Translate Pi tool parameters/results | Duplicate editing policy |
| `src/cli.ts` | Parse CLI arguments, print results/errors, choose exit status | Direct filesystem mutation |

## Control flows

### Unique replacement

`replaceUnique` forwards one `replace_text` operation. The adapter rejects zero or multiple matches; the session does not broaden the match.

### Boundary replacement

`replaceBetween` reads a bounded snapshot, resolves exact start/end content to anchors, and sends one anchored replacement. Missing boundaries stop the operation.

### Stale-anchor retry

1. Submit the caller's anchored operation.
2. Return immediately when the response is not stale.
3. Parse only Pi-style stale-anchor suggestions.
4. Match the original position content exactly.
5. Retry once with the refreshed position (and refreshed end when available).
6. Stop with an actionable error if safe recovery is impossible.

The one-retry limit is intentional: repeated retries could hide concurrent edits.

## Extension points and invariants

- Implement `PiClient` to use the policy with another Pi-compatible adapter.
- Add semantic operations to `SmartEditSession`, then expose them through CLI/tool adapters.
- Keep result strings compatible with Pi-shaped read/edit output.
- Never silently choose among duplicate content matches.
- Never add network calls, telemetry, persistence, or multi-retry conflict resolution without an architecture decision and threat review.

## Validation map

- `test/anchors.test.ts`: shared output parsing contract.
- `test/filesystem-client.test.ts`: real temporary-file adapter behavior.
- `test/smart-edit.test.ts`: policy, retry, and error paths.
- `npm run coverage`: coverage budgets.
- `npm run benchmark`: in-process policy overhead budget.
- `npm run verify:release`: changelog and package-content contract.
