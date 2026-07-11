# Security Policy

## Reporting a vulnerability

Report suspected vulnerabilities privately through the repository's **Security** tab using a GitHub private vulnerability report. Do not open a public issue containing exploit details, credentials, tokens, private file contents, or sensitive logs.

Include the affected revision, a minimal reproduction, impact, and any suggested mitigation. Remove real secrets and personal data from all examples.

## Scope and support

Security fixes are evaluated against the current `main` branch. Older revisions may require upgrading to a corrected release or commit. This policy does not promise a response or release timeline.

## Secret and local-file handling

`pi-smart-edit` operates on caller-selected local files. Contributors and users should:

- grant access only to paths the process needs;
- review paths and replacement payloads before execution;
- never place credentials or tokens in examples, fixtures, CLI arguments, or issue logs;
- treat stale-anchor diagnostics and file excerpts as potentially sensitive;
- keep `.env` files, npm debug logs, generated output, and local dependencies untracked; and
- use synthetic values in tests and documentation.

The project does not require application secrets or environment variables for its build and test workflow.

## Dependency checks

Continuous integration installs the committed lockfile with `npm ci` and audits production dependencies for high or critical known vulnerabilities. Contributors can run the same check locally:

```bash
npm audit --omit=dev --audit-level=high
```

Runtime git dependencies must be pinned to a full reviewed commit. `npm run verify:dependencies` and release verification reject mutable git specifications and lockfile drift. The reviewed `pi-anchor-edit-core` revision is `fa10abb76aee5e745ad291aff4448b09fd1cb47d`.

## Alert triage and repository controls

The T50-Systems repository maintainers own security alert triage. They review private vulnerability reports and GitHub dependency/security alerts at least weekly, acknowledge reproducible reports privately, assess affected supported revisions, and coordinate a fix and advisory without moving exploit details to public issues.

Repository administrators must keep private vulnerability reporting, Dependabot security updates, secret scanning, and push protection enabled wherever the GitHub plan makes them available. [`.github/dependabot.yml`](.github/dependabot.yml) provides a weekly dependency and workflow-action review cadence even when native security-update automation is unavailable. Settings are verified after administrative changes through the repository Security settings and GitHub API metadata; configuration drift is treated as a release blocker.
