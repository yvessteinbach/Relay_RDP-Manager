---
title: Credential and trust model
sidebar_position: 1
description: Understand how Relay separates connection data, secrets, imports, and external RDP clients.
---

# Credential and trust model

Relay assumes that its database, backup files, imported `.rdp` files, frontend, logs, clipboard, and external RDP clients have different trust properties.

## Secret boundary

- SQLite stores credential labels, usernames, domains, and opaque secret references.
- Password values go only to the operating system credential store. Backup archives retain credential labels and references only; they never include password values.
- Passwords must not appear in logs, backups, `.rdp` exports, process arguments, crash reports, or long-lived frontend state.
- Saving a password remains optional.

## External client boundary

Version 1 launches an installed RDP client. Relay never puts a stored password in command-line arguments or `.rdp` files. On Windows, just before launching Remote Desktop Connection, it writes the saved credential to that user's native `TERMSRV/<host>` Credential Manager entry, which `mstsc` reads itself. Other platforms authenticate in the external client; a separate deliberate copy action may be offered later with timed clipboard clearing.

## Import boundary

An imported `.rdp` file is untrusted input. Relay parses a strict allowlist, validates every mapped value, shows redirection and security warnings, and asks the user to review the destination before saving. Relay never executes an imported file directly.

## Native command boundary

The frontend calls small, typed Tauri commands. It never receives a generic shell, filesystem, credential-store, or SQL capability. Native launch adapters use direct process APIs and argument arrays rather than a shell command string.

## Security changes

Any change involving credentials, imported files, process launching, updates, backups, logging, or Tauri permissions requires tests that prove secrets and untrusted values do not cross the wrong boundary.
