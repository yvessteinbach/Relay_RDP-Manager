---
title: RDP import, export, and launch
sidebar_position: 2
description: Safely review RDP files, export sanitized profiles, and launch a supported RDP client.
---

# RDP import, export, and launch

Relay treats RDP files as untrusted configuration. It reads a small allowlist of connection settings, shows the mapped connection before it is saved, and warns about unknown settings. Passwords, credential blobs, certificate signatures, publisher data, and shell settings are discarded.

## Import

Choose **Import and export**, select the customer organization, and select one `.rdp` file. Review the proposed host, port, username, display mode, warnings, and duplicate notice before saving. A duplicate is a saved connection for the same client with the same normalized host, port, and username; accepting the review replaces it.

## Export

Use **Export RDP** from a connection’s detail page. The exported file contains only its target, optional username and domain, display mode, and a prompt to obtain credentials. Relay notes, credential references, passwords, and gateway secrets are never included.

## Launch adapters

| Platform | Adapter                   | Launch method                                    |
| -------- | ------------------------- | ------------------------------------------------ |
| Windows  | Remote Desktop Connection | `mstsc` with direct target and display arguments |
| macOS    | Windows App or a registered RDP client | Windows App direct link, or macOS `open` with a sanitized temporary RDP file |
| Linux    | FreeRDP                   | `xfreerdp` with direct non-secret arguments      |

Relay detects the available adapter and reports a clear unavailable state when it cannot find one. It never uses a shell to start a client. On Windows, Relay uses `mstsc`'s native arguments rather than a temporary RDP file, avoiding local RDP-file policy and handler failures. Temporary RDP files are owner-only on Unix and are removed after the launched process exits.

On macOS, Relay launches the current Microsoft **Windows App** directly when it is installed. Otherwise, it follows the application registered to open `.rdp` files. Install Windows App from the Mac App Store, or configure that association with the RDP client your organization supports before launching.
