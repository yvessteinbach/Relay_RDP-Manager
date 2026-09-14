---
title: Install Relay
sidebar_position: 1
description: Install, upgrade, or remove Relay safely on a supported desktop platform.
---

# Install Relay

Download Relay only from an official release. Verify the published SHA-256 checksum before opening an installer. Windows releases use an installer, macOS releases are signed and notarized packages, and Linux releases provide AppImage and Debian packages.

Relay needs an installed RDP client; Settings identifies the adapters available on the computer. See the [adapter smoke-test matrix](./rdp-adapter-smoke-tests.md) for supported-client expectations.

## Upgrade and uninstall

Back up your library before an upgrade. Install the newer signed package over the existing installation, then open Relay and confirm clients and connections remain present. To uninstall, use the platform's normal application removal flow. Keep the local Relay data folder if you may reinstall or restore later; remove it only after retaining a verified backup.

If an update regresses a supported workflow, reinstall the prior signed release, restore the safety backup created before the upgrade, and report the issue through the beta triage process.
