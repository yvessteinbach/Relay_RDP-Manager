---
sidebar_position: 5
---

# Publish an application update

Relay checks for signed updates from the latest GitHub Release. The Settings page downloads and installs a verified update in place; on macOS and Linux, the user reopens Relay after installation. Windows starts its installer automatically.

## One-time repository setup

The updater signing private key is stored outside the repository. Do not commit or share it. Add its full contents as the repository Actions secret named `TAURI_SIGNING_PRIVATE_KEY`. The generated key has no passphrase, so the workflow deliberately supplies an empty signing-key-password variable.

The corresponding public key is already included in the app configuration. Keep the private key backed up securely: losing it prevents future releases from updating existing installs.

## Publish

1. Change the version in `src-tauri/tauri.conf.json` and `package.json` to the same next semantic version, for example `0.2.0`.
2. Commit those changes and push a matching tag, such as `v0.2.0`.
3. GitHub Actions builds and signs macOS, Windows, and Linux installers, uploads them to a draft GitHub Release, and creates its `latest.json` update manifest.
4. Review the draft release and publish it. Existing Relay installs can then download the update from Settings.

The workflow is defined in `.github/workflows/publish.yml`.
