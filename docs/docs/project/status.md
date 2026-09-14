---
title: Project status
sidebar_position: 1
description: See Relay's active delivery stage, completed foundation, and next work.
---

# Project status

Relay is in **Stage 6: Stable 1.0**.

## Complete

- Product and engineering plan
- Stage-based execution checklist
- React, TypeScript, Vite, Carbon, and Tauri project scaffold
- Initial Carbon application shell and honest empty-library state
- Docusaurus developer documentation foundation
- AI-assistance disclosure in the README and documentation introduction
- Initial setup, architecture, design, security, contribution, and status documentation
- Frontend and Docusaurus production builds
- Browser verification of the initial application shell, navigation, documentation structure, and console output
- Contribution guide, code of conduct, and early-development security policy
- Apache-2.0 license and local Git repository
- Linting, formatting, application-shell unit tests, and automated accessibility checks
- Native SQLite library boundary for clients, sites, folders, gateways, credential references, tags, connections, and redacted launch history
- Strict RDP parser and sanitized serializer with native tests
- Import review, duplicate replacement, sanitized RDP export, and explicit unsupported-setting warnings
- Windows `mstsc`, macOS registered-client, and Linux FreeRDP launch adapters with direct argument execution
- Native OS credential-store integration with an explicit Linux unavailable state, credential copy clearing, reassignment API, and secret-canary coverage
- Stage 4 threat model, release security-review checklist, and SBOM/license reporting procedure
- Versioned, SHA-256-checked secret-free backups, restore validation, and pre-restore safety backups
- Public-beta installation, backup/recovery, and feedback-triage documentation
- Cross-platform release packaging workflow with checksum generation and protected signing inputs

## In progress

- Resolve beta blockers, freeze the version 1 schema and command API, and prepare stable-release documentation and artifacts
- Clean-machine install, upgrade, uninstall, screen-reader, and controlled adapter smoke tests

## Foundation follow-up

- Native CI matrix results on Windows and Linux after the first push

## Pending decisions

- Final project name and repository identity
- Open-source copyright ownership details
- Officially supported macOS RDP client

The detailed, checkable source of truth is the repository's `CHECKLIST.md`. Product scope, architecture, stages, and acceptance gates are defined in `PLAN.md`.

## Next exit gate

Stage 6 cannot close until the version 1 success criteria are measured and met. This includes the carried-forward clean-machine evidence on Windows, macOS, and Linux, controlled adapter smoke tests, and protected signing/notarization credentials; those require controlled hosts, installed RDP clients, and release-key owners.
