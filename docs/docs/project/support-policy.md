---
title: Support policy
sidebar_position: 2
description: Relay's supported desktop platforms, processor architectures, and RDP-client expectations.
---

# Support policy

Relay 1.0 supports these desktop environments:

| Platform | Minimum version                                               | Architectures           | Supported launch path                                |
| -------- | ------------------------------------------------------------- | ----------------------- | ---------------------------------------------------- |
| Windows  | Windows 10 22H2                                               | x86-64                  | Built-in Remote Desktop Connection (`mstsc`)         |
| macOS    | macOS 13 Ventura                                              | Apple silicon and Intel | A registered RDP application that opens `.rdp` files |
| Linux    | Ubuntu 22.04 LTS or a compatible current desktop distribution | x86-64                  | FreeRDP (`xfreerdp`) on `PATH`                       |

Relay requires an installed RDP client; it does not render RDP sessions itself. A platform is supported only after the release smoke test passes against a controlled target using the launch path above.

Newer operating-system releases are tested in continuous integration as they become available. Unsupported or end-of-life operating systems may work, but do not receive release-blocking compatibility fixes.
