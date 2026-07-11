# Roadmap governance

This file assigns open roadmap issues to a current milestone and records reviewable follow-ups. It does not replace GitHub as the source of issue status and does not imply that any issue is closed.

## Foundation — current

Goal: make the product direction, boundaries, adoption path, and verification contract explicit.

| Issue | Area | Foundation deliverable |
|---:|---|---|
| #2 | Vision and metrics | `VISION.md` targets and review cadence |
| #3 | README/quickstart | Verified clone and first-use path |
| #4 | Architecture | Context, boundaries, flows, invariants |
| #6 | Tests | Error-path tests and enforceable coverage command |
| #8 | Releases | Changelog, release guide, package verification |
| #10 | Configuration | Explicit no-secret/no-service configuration model |
| #11 | Recovery | Symptom-to-recovery matrix |
| #12 | Observability | Local signals and diagnostic reporting guidance |
| #13 | Performance | Reproducible core-policy benchmark and budget |
| #14 | User workflows | Clear first-use expectations and recovery paths |
| #15 | Examples | Tool and CLI recipes with expected outcomes |
| #16 | Governance | This milestone/triage policy |

## Reliability — next

- #6: expand integration coverage for CLI and Pi tool adapters.
- #10–#12: evaluate typed error codes and opt-in diagnostic callbacks without adding telemetry.
- #13: record benchmark history across supported Node versions before tightening budgets.
- Workflow feedback: review first-run and failure journeys before changing schemas or messages.

## Adoption — later

- #3 and #15: add platform-specific installation troubleshooting and a complete extension integration example.
- Surface polish: simplify schemas and messages only where reliability evidence identifies friction.

## Triage policy

During each minor-release review:

1. Confirm every open roadmap issue has exactly one current milestone assignment.
2. Promote work by user impact, safety risk, and dependency order—not issue age alone.
3. Label bounded, low-risk documentation/tests as `good first issue`; reserve `help wanted` for work with an acceptance test.
4. Split items that cannot be reviewed independently; link the follow-up from the parent.
5. Defer speculative infrastructure, telemetry, or generalized merge behavior until evidence and an architecture decision exist.
6. Close an issue only after maintainers verify its acceptance criteria; a roadmap-foundation commit alone is not closure evidence.
