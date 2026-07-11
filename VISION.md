# Product vision

## Purpose

`pi-smart-edit` helps Pi users and extension authors make conservative text changes when exact hashline anchors may have gone stale. It favors explicit operations, bounded recovery, and actionable failures over hidden merge behavior.

## Who it serves

- Pi users repeatedly editing files through hashline tools.
- Extension authors who want a reusable stale-anchor recovery policy.
- Maintainers who need deterministic, locally testable editing behavior.

## Product principles

1. **Conservative by default:** never guess when text or boundaries are ambiguous.
2. **Local and inspectable:** editing requires no network service, credentials, or telemetry.
3. **Actionable recovery:** failures identify the failed assumption and the safe next step.
4. **One policy, multiple surfaces:** the library, Pi tool, and CLI share the same core session.

## Success measures

Review these indicators at each minor release. They are project targets, not collected telemetry.

| Indicator | Initial target | How to verify |
|---|---:|---|
| Supported-Node validation | Node 22 and 24 pass | CI matrix |
| Core line coverage | >= 90% | `npm run coverage` |
| Core branch coverage | >= 80% | `npm run coverage` |
| Benchmark budget | 20,000 no-op semantic edits in <= 1,000 ms | `npm run benchmark` |
| Release readiness | package/changelog checks pass | `npm run verify:release` |
| First verified local run | <= 5 commands after clone | README quickstart |
| Known roadmap work | every open roadmap item assigned to a milestone | `ROADMAP.md` release review |

The benchmark is a regression tripwire, not a claim about end-to-end filesystem latency. Maintainers should revise a target only in a reviewed change that includes before/after evidence.
