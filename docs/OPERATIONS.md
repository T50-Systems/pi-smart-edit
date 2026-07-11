# Configuration, diagnostics, and recovery

## Configuration model

The package has no required environment variables, secrets, remote endpoints, or environment-specific configuration. Behavior is explicit in each library call, CLI flag, or `smart_edit` payload. Local development and CI therefore use the same defaults.

| Setting | Surface | Default | Guidance |
|---|---|---|---|
| File path | all | required | Prefer repository-relative paths in examples and logs. |
| Read offset | library `readFresh` | `1` | Override only for direct reads. |
| Read limit | library `readFresh` / boundary lookup | `400` | Boundary replacement currently searches the first 400 lines; use anchored operations for later regions. |
| Retry count | anchored retry | exactly `1` | Not configurable by design; re-read after another conflict. |
| Replacement lines | CLI/tool | `[]` when omitted by adapters | Supply explicitly for clarity; an empty array may delete content. |
| Benchmark budget | benchmark only | `1000` ms | Override with `PI_SMART_EDIT_BENCHMARK_BUDGET_MS` on unusually slow CI hosts; record the reason. |

Do not put secrets in paths, replacement text, fixtures, command history, issue reports, or diagnostic output.

## Observable signals

The package emits no telemetry. Operators can inspect deterministic local signals:

- CLI: result text on stdout, actionable failure on stderr, exit `0`/`1`.
- Pi tool: result text plus `details.mode` and `details.path`.
- Library: resolved result string or a rejected `Error`.
- Adapter: Pi-style codes such as `[E_STALE_ANCHOR]` and suggested `>>> LINE#HASH:content` anchors.
- Validation: test, coverage, benchmark, audit, and package-check command exit status.

For a bug report, include Node/npm versions, command or tool mode, sanitized error code/message, whether the file changed concurrently, and a minimal non-sensitive reproduction. Do not include full private file contents.

## Recovery guide

| Symptom | Meaning | Safe recovery |
|---|---|---|
| `[E_STALE_ANCHOR]` | File content changed after the anchor was read. | Use `anchored_retry` once or re-read and submit fresh anchors. |
| `no matching recovery anchor` | Suggested anchors do not contain the original position content. | Re-read the target region and inspect the concurrent change; do not force the edit. |
| `without a position anchor` | Automatic recovery has no stable point to refresh. | Provide `pos` from a fresh read. |
| `Unable to find boundary anchors` | A boundary is absent or outside the 400-line snapshot. | Confirm exact content; use a narrower anchored edit for later regions. |
| Unique replacement failure | Old text is missing or occurs more than once. | Make `oldText` uniquely identifying; never broaden it automatically. |
| Invalid `--lines-json` | CLI input is not a JSON string array. | Quote a valid JSON array and retry. |
| Permission/path error | Local adapter cannot access the target. | Verify the path, working directory, permissions, and that the target is a text file. |

After any uncertain failure, inspect `git diff` before retrying. The package is not a merge engine and does not resolve competing semantic changes.
