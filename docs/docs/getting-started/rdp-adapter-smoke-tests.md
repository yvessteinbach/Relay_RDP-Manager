---
title: RDP adapter smoke tests
sidebar_position: 3
description: Run and record the required Stage 3 launch checks on each supported desktop platform.
---

# RDP adapter smoke tests

Run these checks on a controlled test target that accepts a non-production test account. Do not enter a real password in Relay or place it in the `.rdp` fixture. Record the operating-system version, client version, Relay build identifier, and pass/fail result for every platform before closing Stage 3.

## Shared preparation

1. Create a client and save one connection with the controlled target's hostname, port, optional username, and display setting.
2. Import an `.rdp` file for the same target that includes a password field and one unsupported setting. Confirm the review warns about both and the saved connection contains neither secret data nor the unsupported setting.
3. Export the saved connection. Inspect the export and confirm it has the target, optional username/domain, display setting, and `prompt for credentials`, but no password, notes, credential reference, gateway secret, or unsupported setting.
4. Start the connection and authenticate only in the external RDP client. Confirm Relay records a successful launch without showing a password.

## Windows

- Use a supported Windows build with **Remote Desktop Connection** (`mstsc`) available on `PATH`.
- Select the connection's **Connect** action and confirm `mstsc` opens the controlled target using the saved display setting and username.
- While the client is open, locate the temporary `relay-*.rdp` file in the user's temporary directory. Confirm it contains only the sanitized export. After the client exits, confirm the file is gone.
- Temporarily remove `mstsc` from `PATH` or test a machine without it. Confirm Relay shows the clear no-supported-client state and records a categorized failed launch.

## macOS

- Install and register the organization-approved RDP client as the handler for `.rdp` files.
- Select **Connect** and confirm the registered client opens the controlled target using the saved display setting and username.
- Keep the registered client open briefly, then exit it. Confirm the temporary `relay-*.rdp` profile persists while the client is open and is removed after it exits.
- Remove the `.rdp` file association or use a machine without a registered handler. Confirm Relay reports a launch failure without displaying secret data.

## Linux

- Install `xfreerdp` and confirm it resolves on `PATH`.
- Select **Connect** and confirm FreeRDP opens the controlled target using the saved host, port, username/domain, and display setting.
- Inspect the running process arguments. Confirm they contain no password, credential reference, or Relay notes.
- Run once without `xfreerdp` on `PATH`. Confirm Relay shows the no-supported-client state and records a categorized failed launch.

## Completion record

| Platform | OS version | RDP client/version | Controlled target reached | Sanitization checked | Cleanup/arguments checked | Result | Evidence link |
| -------- | ---------- | ------------------ | ------------------------- | -------------------- | ------------------------- | ------ | ------------- |
| Windows  |            |                    |                           |                      |                           |        |               |
| macOS    |            |                    |                           |                      |                           |        |               |
| Linux    |            |                    |                           |                      |                           |        |               |

Attach this completed record to the release evidence. Any failure is a Stage 3 blocker; include the command category and redacted client diagnostic in the associated issue.
