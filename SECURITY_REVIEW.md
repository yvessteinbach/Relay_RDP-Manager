# Stage 4 security review

## Threat model

| Asset             | Primary threat                                        | Boundary and mitigation                                                                                                                           | Evidence                                       |
| ----------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Password          | SQLite, export, log, or argument disclosure           | Passwords are sent only to the native OS credential store. SQLite holds an opaque `vault:<id>` locator; launch adapters never receive a password. | `secret_canary_never_enters_library_or_export` |
| Imported RDP file | Malformed or hostile settings changing trust behavior | The parser has a size limit and strict allowlist; password, credential, signature, and publisher settings are discarded.                          | Parser and adversarial-input tests             |
| Temporary profile | Other local users reading a launch file               | Only sanitized settings are written; Unix files are mode `0600` and are removed after the client exits.                                           | Adapter implementation review                  |
| Tauri webview     | Privileged command or network access                  | Commands are typed and limited; capabilities contain only `core:default`; CSP allows only self, IPC, and local IPC transport.                     | `tauri.conf.json`, capability manifest         |
| Clipboard         | Accidental secret persistence                         | Copy is explicit and Relay clears its clipboard value after 30 seconds.                                                                           | Credential UI behavior                         |

## Release review checklist

- [ ] Run native tests on macOS, Windows, and a Linux host with and without Secret Service.
- [ ] Verify a canary is absent from SQLite, backups, RDP exports, app logs, crash artifacts, and process arguments.
- [ ] Test create, overwrite, reveal/copy, timed clearing, reassignment, and removal in each platform vault.
- [ ] Review generated Tauri capability manifests and CSP after every plugin or command change.
- [ ] Fuzz the RDP parser with malformed, large, encoded, and duplicate-key inputs before release.
- [ ] Confirm temporary profile mode and cleanup while a client is launched and after it exits or fails.
- [ ] Generate and archive the SBOM and license report for the exact release lockfiles.

This is a pre-release review record, not a claim of a completed independent security audit.
