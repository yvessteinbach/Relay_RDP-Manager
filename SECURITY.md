# Relay security policy

Relay is in early development and does not yet have a supported production release.

## Reporting a vulnerability

Do not open a public issue containing exploit details, credentials, customer information, or sensitive logs.

A private vulnerability-reporting channel will be published before the public beta. Until then, contact the project owner privately through an established channel. Include the affected version or commit, platform, impact, minimal reproduction, and any suggested mitigation. Remove all real customer and credential data.

Maintainers will acknowledge a report when a private channel is available, validate the issue, coordinate a fix and disclosure, and credit the reporter if requested and appropriate. Response-time commitments will be added when the project has a public maintenance team.

## Supported versions

No version is supported yet. This table will be updated for the first public beta.

| Version                  | Supported     |
| ------------------------ | ------------- |
| Development branch       | Best effort   |
| Published stable release | Not available |

## Security boundaries

- Connection metadata belongs in SQLite; password values do not.
- Passwords must use the operating system credential store.
- Imported `.rdp` files are untrusted and are never executed directly.
- Passwords must not enter exported files, command arguments, logs, diagnostics, crash output, or ordinary backups.
- The frontend receives narrow, typed native commands rather than generic shell, SQL, filesystem, or secret-store access.
- Update artifacts require cryptographic signatures before stable release.

Read the [credential and trust model](./docs/docs/security/credential-model.md) and the security section of [PLAN.md](./PLAN.md) for the complete intended design.
