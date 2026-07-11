# Changelog

All notable changes to this project are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Product vision, measurable success targets, architecture, operations, release, and roadmap governance documentation.
- Coverage, performance benchmark, and release-package verification commands.
- Additional policy and failure-path tests plus adoption recipes.
- End-to-end CLI and Pi extension adapter coverage, cross-platform CI fixtures, repository policy checks, and verified tag-release automation.

### Changed

- Tightened the `smart_edit` schema to discriminated mode and operation contracts with incompatible fields rejected before execution.
- Expanded CI to Node.js 22 and 24 on Ubuntu, Windows, and macOS with stable required-check names.

### Security

- Pinned `pi-anchor-edit-core` to reviewed commit `fa10abb76aee5e745ad291aff4448b09fd1cb47d` and added immutable dependency verification.
- Documented weekly alert triage, private reporting, scanning controls, and Dependabot update cadence.

## [0.2.0] - 2026-07-02

### Changed

- Reused `pi-anchor-edit-core` for shared anchor and filesystem edit primitives.

### Added

- Pi extension, CLI, semantic edit session, filesystem adapter, tests, and examples.

[Unreleased]: https://github.com/T50-Systems/pi-smart-edit/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/T50-Systems/pi-smart-edit/releases/tag/v0.2.0
