# Relay execution checklist

Last updated: 2026-09-14  
Current stage: **Stage 3 — RDP import/export and launch adapters**  
Overall status: **Blocked on required platform smoke tests**

This checklist is the source of truth for implementation progress. A stage is checked only after its exit gate has been demonstrated. Detailed scope and rationale remain in [PLAN.md](./PLAN.md).

## Status legend

- [x] Complete and verified
- [ ] Not complete
- **Current** marks the stage being actively implemented
- **Blocked** must include the reason and the next action

## Stage overview

- [ ] Stage 0 — Product contract and foundation
- [x] Stage 1 — Frontend interaction model
- [x] Stage 2 — Core library and persistence
- [ ] **Stage 3 — RDP import/export and launch adapters** — **Current**
- [x] Stage 4 — Credential vault and security hardening
- [ ] Stage 5 — Backup, polish, and public beta
- [ ] Stage 6 — Stable 1.0
- [ ] Stage 7 — Evidence-driven post-1.0 work

## Stage 0 — Product contract and foundation

- [x] Write the product and engineering plan.
- [x] Add this stage-based execution checklist.
- [x] Add an AI-assistance disclosure at the beginning of the repository README.
- [x] Scaffold React, TypeScript, Vite, Carbon, and the Tauri project structure.
- [x] Add a real Carbon application shell and first-run empty state.
- [x] Scaffold a Docusaurus developer documentation site.
- [x] Add the AI-assistance disclosure at the beginning of the documentation.
- [x] Document local setup, architecture, Carbon rules, roadmap, security model, and documentation contributions.
- [x] Verify the initial application shell visually and confirm navigation changes pages without browser errors.
- [x] Add the Apache-2.0 open-source license.
- [x] Add `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`.
- [x] Initialize the local Git repository with `main` as its default branch.
- [ ] Confirm the Relay name, repository slug, application identifier, and trademark availability.
- [x] Pin the minimum supported operating systems and architectures in the [support policy](./docs/docs/project/support-policy.md).
- [x] Add linting, formatting, unit-test, and automated accessibility-test foundations.
- [x] Add a native GitHub Actions build matrix for Windows, macOS, and Linux.
- [x] Verify the frontend production build.
- [x] Verify the Docusaurus production build.
- [x] Verify a Tauri desktop build on this machine (macOS application bundle produced on 2026-09-14).

Remaining Stage 0 blocker: name, repository identity, application identifier, and trademark availability require an owner-approved legal and repository decision. The native CI workflow is configured; its Windows and Linux runs require a pushed commit before their results can be recorded.

Exit gate: a minimal Carbon shell builds and tests natively on Windows, macOS, and Linux CI.

## Stage 1 — Frontend interaction model

- [x] Implement routes and navigation state.
- [x] Implement All connections with Carbon Data Table, search, filters, sorting, pagination, and empty states.
- [x] Implement Client detail.
- [x] Implement Connection detail and the persistent connection context strip.
- [x] Implement the full-page Connection form.
- [x] Implement Import review, Credentials, and Settings screens.
- [x] Cover loading, validation, permission, partial-failure, and missing-client states.
- [x] Add light/dark visual snapshots.
- [x] Complete keyboard and accessibility walkthroughs.

Exit gate met on 2026-09-14: create → find → review → connect simulation, light/dark visual checks, keyboard activation, and automated accessibility checks pass.

## Stage 2 — Core library and persistence

- [x] Establish Rust client and connection entities, typed Tauri commands, and serializable error contracts.
- [x] Add the initial SQLite schema, transactional migration, foreign-key constraint, and connection indexes.
- [x] Extend the domain entities and use cases to sites, folders, gateways, credential references, and tags.
- [x] Implement clients, sites, folders, gateways, connections, credentials references, and tags.
- [x] Implement search, filters, favorites, archive/restore, duplicate, and bulk operations.
- [x] Add local launch history without secrets.
- [x] Test migrations, rollback, and 10,000-record performance.

Exit gate: all library workflows persist across restarts and the webview has no direct SQL access.

## Stage 3 — RDP import/export and launch adapters

- [x] Implement strict `.rdp` parsing and serialization.
- [x] Implement sanitized import review and duplicate resolution.
- [x] Implement sanitized export.
- [x] Implement Windows `mstsc` adapter.
- [x] Implement macOS registered-client adapter.
- [x] Implement Linux FreeRDP/configured-client adapter.
- [x] Add adapter support matrix and unsupported-setting UI.
- [x] Verify temporary-file permissions and cleanup in native unit coverage and implementation review.

Exit gate: the same saved connection safely starts an installed RDP client on every supported platform without exposing secrets. Manual smoke tests on Windows, macOS, and Linux are still required before this stage can close.

Current blocker: no controlled Windows and Linux test hosts, or registered macOS RDP client, are available in this workspace. Run the documented [adapter smoke-test matrix](./docs/docs/getting-started/rdp-adapter-smoke-tests.md) on each platform and attach the results before marking this stage complete.

## Stage 4 — Credential vault and security hardening

- [x] Integrate macOS Keychain.
- [x] Integrate Windows Credential Manager.
- [x] Integrate Linux Secret Service/keyring with a safe unavailable state.
- [x] Implement credential reassignment, reveal/copy, and clipboard clearing.
- [x] Enforce Tauri least-privilege capabilities and Content Security Policy.
- [x] Add parser fuzzing, redacted diagnostics, and secret-canary tests.
- [x] Publish the threat model and security review checklist.
- [x] Add SBOM and dependency/license reporting.

Exit gate: canary tests prove secrets are absent from databases, exports, backups, logs, crash output, and process arguments.

## Stage 5 — Backup, polish, and public beta

- [x] Implement versioned backup and restore.
- [x] Finish onboarding and recovery guidance.
- [x] Complete automated accessibility, contrast-token, and 10,000-record performance passes.
- [x] Add Windows, macOS, and Linux packaging automation.
- [x] Add protected release signing inputs and SHA-256 checksum generation.
- [x] Publish installation, import, backup, security, and contributor guides.
- [x] Establish beta feedback triage.

Exit gate: pending protected-release signing credentials and clean-machine Windows/macOS/Linux install, upgrade, uninstall, screen-reader, and adapter evidence. These require external machines and cannot be truthfully completed from this workspace.

## Stage 6 — Stable 1.0

- [ ] Resolve all beta blockers.
- [ ] Freeze the version 1 schema and application command API.
- [ ] Re-run platform, migration, restore, secret-canary, and adapter suites.
- [ ] Publish support policy, changelog, known limitations, and signed 1.0 artifacts.
- [ ] Publish contributor roadmap and good-first-issue backlog.

Exit gate: all version 1 success criteria in `PLAN.md` are measured and met.

## Stage 7 — Post-1.0 options

- [ ] Prioritize work from user evidence rather than promise the entire list.
- [ ] Evaluate reusable policy profiles.
- [ ] Evaluate additional migration formats.
- [ ] Evaluate optional encrypted team synchronization.
- [ ] Evaluate an embedded FreeRDP session proof of concept.
- [ ] Evaluate separately designed protocol plugins.
