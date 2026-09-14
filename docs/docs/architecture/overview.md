---
title: Architecture overview
sidebar_position: 1
description: Learn how the Relay frontend, native core, storage, secrets, and launch adapters fit together.
---

# Architecture overview

Relay separates presentation, application rules, persistence, credentials, and operating-system launching.

```text
React + TypeScript + Carbon
             │
             │ narrow typed Tauri commands
             ▼
       Rust application core
        │        │        │
        ▼        ▼        ▼
     SQLite   OS vault   RDP launcher adapter
```

## Frontend

The frontend renders routes, forms, view state, and accessible workflows. It uses official Carbon React components. It does not read SQLite, access stored passwords, or run processes directly.

## Rust core

Rust validates data and owns application use cases. Tauri commands should name specific actions such as `save_connection` or `launch_connection`; Relay must never expose generic SQL or shell execution to the frontend.

## Persistence

SQLite stores customer and connection metadata. It stores only opaque references to saved secrets. Schema changes use ordered, transactional migrations.

## Credentials

Passwords belong in macOS Keychain, Windows Credential Manager, or Linux Secret Service. If a compatible Linux secret store is unavailable, Relay disables password saving rather than falling back to plaintext.

## Launch adapters

Each operating system implements the same validated launcher contract:

- Windows: the built-in Remote Desktop Connection client.
- macOS: a compatible application registered or selected for `.rdp` files.
- Linux: FreeRDP or a selected compatible client.

No adapter may include a password in a command argument or generated `.rdp` file.

## Current structure

```text
src/                     React application
src-tauri/               Rust and Tauri desktop shell
docs/                    Docusaurus developer documentation
PLAN.md                  product and engineering decisions
CHECKLIST.md             execution source of truth
```

Feature-oriented frontend and layered Rust folders will be introduced as those modules gain real behavior. Avoid creating empty abstractions before a use case needs them.
