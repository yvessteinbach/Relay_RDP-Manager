---
id: intro
title: Welcome to Relay
slug: /
sidebar_position: 1
description: Understand Relay, its current state, and where to begin as a contributor.
---

:::info AI-assisted development
Relay has been developed with the help of AI. Human maintainers review the architecture, code, security decisions, documentation, and releases, and remain accountable for what the project publishes.
:::

Relay is an open-source, local-first Remote Desktop connection manager for Windows, macOS, and Linux. It is designed for consultants, managed service providers, and IT teams that organize connections across multiple customer organizations.

## What Relay will do

Relay will store connection metadata, keep customer environments clearly separated, search a large connection library, import and export sanitized `.rdp` files, protect optional credentials with the operating system credential store, and launch a compatible installed RDP client.

The first stable release is a manager and launcher. It will not implement a new RDP rendering engine or require a cloud account.

## Project state

Relay has completed the repository-controlled work through **Stage 4: Credential vault and security hardening**. The remaining release gate is Stage 3's live adapter smoke-test matrix on controlled Windows, macOS, and Linux hosts. The native library persists data locally; the desktop interface uses typed native commands for credentials, import/export, and launching.

Read [Project status](./project/status.md) before choosing work so that documentation and implementation stay aligned.

## Choose your path

- **Run Relay locally:** follow [Development setup](./getting-started/development-setup.md).
- **Understand the codebase:** read [Architecture overview](./architecture/overview.md).
- **Build interface work:** read [Carbon Design System rules](./design/carbon-design-system.md) first.
- **Work near credentials or launching:** read [Credential and trust model](./security/credential-model.md).
- **Improve these docs:** read [Writing documentation](./contributing/documentation.md).

## Guiding principles

1. Relay works offline and does not require an account.
2. Passwords are not ordinary application data.
3. Customer context remains visible before a connection starts.
4. Cross-platform support is proven on each operating system.
5. The interface uses official Carbon components and patterns.
6. Import, export, and backups prevent lock-in.
