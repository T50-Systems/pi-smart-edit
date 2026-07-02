# pi-smart-edit

Smart editing helpers for Pi focused on the pain point behind frequent `[E_STALE_ANCHOR]` failures.

## Problem

Pi's hashline editing model is precise, but iterative workflows often do this:

1. `read`
2. `edit`
3. `cargo fmt` or another edit
4. try another `edit` with old anchors

That commonly produces stale-anchor failures.

## Goal

Provide a Pi-friendly wrapper that keeps the safety of hashline editing while reducing friction via:

- automatic retry on stale anchors
- anchor refresh after successful edits
- semantic helpers like `replaceBetween`, `replaceFunction`, and unique text replacement
- a reusable library layer for Pi extensions/tools

## Initial design

### `SmartEditSession`

A session wraps a Pi-compatible client with `read` and `edit` operations and offers:

- `readFresh(path)`
- `replaceAnchored(...)`
- `replaceUnique(...)`
- `replaceBetween(...)`
- `applyWithRetry(...)`

### Stale-anchor recovery

If `edit` returns `[E_STALE_ANCHOR]`, the wrapper can:

1. inspect the returned `>>> LINE#HASH` lines
2. refresh the nearby file region
3. rebuild the intended patch if enough context still matches
4. retry automatically

## Scope of this repo

This repo is intentionally Pi-oriented:

- input/output shapes match Pi's `read`/`edit` mental model
- good for future use as a Pi extension/tool
- focused on practical editing ergonomics, not generic diff tooling

## Status

Scaffolded. Core retry/session code lives in `src/`.

## Next steps

- add a real Pi transport adapter
- add parser for stale-anchor error payloads
- add end-to-end tests with mocked `read`/`edit`
- optionally expose a Pi extension wrapper
