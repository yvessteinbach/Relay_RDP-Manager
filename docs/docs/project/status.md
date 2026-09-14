---
title: Project status
sidebar_position: 1
description: See Relay's active delivery stage, completed foundation, and next work.
---

# Project status

Relay is in **Stage 3: RDP import, export, and launch adapters**.

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

## In progress

- Cross-platform adapter smoke tests against controlled targets

## Foundation follow-up

- Native CI matrix results on Windows and Linux after the first push

## Pending decisions

- Final project name and repository identity
- Open-source copyright ownership details
- Officially supported macOS RDP client

The detailed, checkable source of truth is the repository's `CHECKLIST.md`. Product scope, architecture, stages, and acceptance gates are defined in `PLAN.md`.

## Next exit gate

Stage 3 requires the documented adapter smoke-test matrix to pass on Windows, macOS, and Linux. The code, native unit coverage, and Stage 4 security hardening are complete; the remaining evidence requires controlled hosts with installed RDP clients.
