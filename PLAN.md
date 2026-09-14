# Relay — Product and Engineering Plan

Status: proposed implementation plan  
Product type: open-source desktop application  
Target platforms: Windows, macOS, and Linux  
Primary users: consultants, managed service providers, and internal IT teams that manage Remote Desktop connections across multiple customer organizations

## 1. Product summary

Relay is a local-first Remote Desktop connection manager. It gives an IT professional one fast, searchable place to organize customer companies, sites, servers, workstations, usernames, gateways, and RDP preferences, then launch the appropriate installed RDP client.

The first stable release is a **manager and launcher**, not a new RDP rendering engine. Relay owns the library, security model, import/export, and launch configuration while a native or installed RDP client owns the remote session. This keeps the first release achievable on all three desktop platforms. A directly embedded session powered by FreeRDP can be investigated after the manager is stable.

### Product promise

> Find the correct computer, with the correct customer context and connection settings, and start a safe RDP session in a few seconds.

### Core principles

1. Local-first: no account or hosted service is required.
2. Safe by default: connection metadata and secrets are treated differently.
3. Fast for keyboard users: global search, predictable focus, and a short path to Connect.
4. Multi-customer by design: customer boundaries are visible everywhere.
5. Portable: import, export, and backups prevent lock-in.
6. Carbon-native: use official Carbon components, patterns, tokens, icons, spacing, and typography rather than imitating or inventing controls.
7. Honest cross-platform behavior: each supported operating system has an explicit, tested launch adapter.

## 2. Scope decisions

### Version 1 includes

- Customer/client organizations, sites, folders, and tags.
- RDP connection create, read, update, duplicate, archive, and delete.
- Favorites, recently used connections, and launch history.
- Fast search and filters across customer, site, host, tags, and username.
- Import of standard `.rdp` files and a review step before saving.
- Export of one or more connections as sanitized `.rdp` files.
- Local encrypted credential references using operating-system secret storage.
- External RDP client detection, configuration, launch, and actionable errors.
- Light and dark Carbon themes.
- Backup and restore of Relay data, with an explicit choice about including encrypted secrets.
- Signed releases and application updates when project funding permits signing certificates.

### Explicitly deferred

- A Relay cloud account, subscription, or required server.
- Team synchronization, permissions, approval flows, and a shared audit service.
- An embedded RDP viewport.
- SSH, VNC, WinRM, file transfer, and remote monitoring.
- Password rotation or privileged-access-management features.
- Mobile applications.
- Automatic network discovery or scanning.

The data model should leave room for team sync, but version 1 must not quietly become a SaaS project.

## 3. Users and primary jobs

### Solo consultant

- Keep connections for many customer companies clearly separated.
- Search by customer, host name, person, role, or tag.
- Launch with the correct gateway, domain, display, and redirection settings.
- Move the library to a new computer without reconstructing it.

### Managed service provider technician

- See customer and site context before connecting.
- Use shared naming conventions and reusable connection profiles.
- Avoid accidentally connecting to a production server under the wrong customer.
- Record enough local history to answer “what did I connect to recently?”

### Internal IT administrator

- Manage servers and employee workstations in folders or functional groups.
- Import existing `.rdp` files in bulk.
- Apply safe defaults for clipboard, drive, printer, audio, and multi-monitor redirection.

## 4. Success criteria

The first stable release is successful when:

- A new user can create a customer and launch a first connection without documentation.
- An experienced user can locate and start any saved connection from the keyboard in under 10 seconds.
- A library of at least 10,000 connections remains responsive during search, filtering, and pagination.
- Passwords never appear in SQLite, logs, exported `.rdp` files, process arguments, crash reports, or frontend state longer than necessary.
- Windows, macOS, and the supported Linux distributions pass the same core acceptance suite.
- Every interactive UI element is an official Carbon component or a native semantic element explicitly permitted by Carbon guidance.
- The app works fully offline.

Useful opt-in, privacy-preserving local metrics for development are launch success/failure counts, search-to-launch time, import errors, and crash-free sessions. Version 1 should not send telemetry by default.

## 5. Recommended technology stack

| Area                 | Choice                                                                                              | Why                                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop shell        | Tauri 2                                                                                             | Supports Windows, macOS, and Linux; uses the OS webview; provides a Rust security boundary and native packaging without bundling a full browser engine.                       |
| Frontend             | React + TypeScript + Vite                                                                           | Carbon has an officially supported React implementation; Vite is a simple fit for a local desktop SPA.                                                                        |
| Design system        | `@carbon/react` and the official Carbon icon entrypoint/package for the pinned version              | Uses shipped behavior, accessibility, tokens, and icons instead of copied components.                                                                                         |
| Native/core layer    | Rust                                                                                                | Handles database access, validation, secret-store access, file parsing, temporary files, process launching, and OS integration.                                               |
| Local database       | SQLite via Rust `sqlx` migrations                                                                   | Reliable, portable, transactional, searchable, and easy to back up. Database access stays behind the Rust command boundary rather than being exposed directly to the webview. |
| Secret storage       | Platform credential store through maintained Rust adapters                                          | macOS Keychain, Windows Credential Manager, and Linux Secret Service/keyring. SQLite stores only an opaque secret reference.                                                  |
| Validation/contracts | Shared JSON-compatible DTOs generated or mirrored between Rust and TypeScript; Zod at UI boundaries | Rejects malformed imported data and protects the frontend/native boundary.                                                                                                    |
| Frontend testing     | Vitest + React Testing Library + axe-core                                                           | Component, behavior, and automated accessibility checks.                                                                                                                      |
| Native testing       | Rust unit/integration tests + fixture-based `.rdp` parsing tests                                    | Verifies security-sensitive logic independently of the UI.                                                                                                                    |
| End-to-end testing   | Playwright driving the web UI plus adapter contract tests                                           | Tests workflows without requiring a real remote server in every CI run.                                                                                                       |
| Formatting/linting   | ESLint, Prettier, Stylelint where needed, `rustfmt`, and Clippy                                     | Consistent contributor experience.                                                                                                                                            |
| CI/CD                | GitHub Actions matrix with native runners                                                           | Build and test on each operating system; do not pretend one cross-compiled artifact proves platform support.                                                                  |
| License              | Apache-2.0, subject to final legal review                                                           | Permissive, contributor-friendly, patent grant, and aligned with Carbon and FreeRDP licensing.                                                                                |

### Why not Electron

Electron would also work and may simplify a few Node integrations, but it bundles Chromium and generally produces a larger application. Relay does not need a browser runtime or Node backend. Tauri plus Rust better matches the local security, process-launching, and small-distribution goals.

### Why not build the UI in Rust

Carbon officially supports React and Web Components. A React frontend lets Relay use Carbon directly. Re-creating Carbon in a Rust UI toolkit would violate the goal of following the system rather than approximating it.

## 6. Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│ React + TypeScript                                          │
│ Carbon UI, routes, forms, view state, accessible workflows  │
└─────────────────────────────┬───────────────────────────────┘
                              │ narrow typed Tauri commands/events
┌─────────────────────────────▼───────────────────────────────┐
│ Rust application core                                       │
│ validation · use cases · import/export · search · auditing  │
├──────────────────┬───────────────────┬──────────────────────┤
│ SQLite repository│ Secret-store port │ RDP launcher port    │
└─────────┬────────┴─────────┬─────────┴──────────┬───────────┘
          │                  │                    │
       SQLite         OS credential store    OS adapter
                                            Windows: mstsc
                                            macOS: chosen .rdp client
                                            Linux: FreeRDP/chosen client
```

### Required boundaries

- The frontend never runs arbitrary processes, composes shell command strings, reads the database directly, or receives stored passwords unless the user explicitly requests a reveal/copy action.
- Rust exposes small commands such as `list_connections`, `save_connection`, `import_rdp`, and `launch_connection`, not a generic SQL or shell API.
- Domain logic does not depend on Tauri. This keeps it testable and makes a future CLI or sync service possible.
- Launch adapters receive a validated `LaunchProfile`, not raw UI input.
- Use argument arrays with direct process APIs; never invoke a shell to launch an RDP client.

### Suggested repository layout

```text
/
├── src/                         React application
│   ├── app/                     routing, providers, shell
│   ├── features/                clients, connections, vault, import, settings
│   ├── components/              Carbon compositions only
│   ├── contracts/               frontend DTOs and validation
│   └── styles/                  Carbon configuration and minimal layout styles
├── src-tauri/
│   ├── src/
│   │   ├── domain/              entities and policies
│   │   ├── application/         use cases
│   │   ├── infrastructure/      SQLite, keyring, filesystem
│   │   ├── launchers/           Windows, macOS, Linux adapters
│   │   └── commands/            narrow Tauri command surface
│   ├── migrations/
│   └── capabilities/            least-privilege Tauri capabilities
├── tests/fixtures/              safe `.rdp` and backup fixtures
├── docs/                        decisions, security model, contributor docs
└── .github/workflows/           checks and release matrix
```

## 7. Information model

Relay uses **client** to mean a customer organization. “Team member” or “user” should be used for people to avoid ambiguity.

### Hierarchy

```text
Library
└── Client organization
    ├── Site (optional)
    │   └── Folder (nesting optional, maximum depth initially 3)
    │       └── Connection
    └── Connection
```

Tags cut across the hierarchy. A connection belongs to exactly one client, may belong to one site and folder, and may have many tags.

### Core tables

| Table               | Important fields                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `clients`           | `id`, `name`, `notes`, `color_token`, timestamps, `archived_at`, `deleted_at`                                                                                            |
| `sites`             | `id`, `client_id`, `name`, `location`, `notes`, timestamps                                                                                                               |
| `folders`           | `id`, `client_id`, `site_id`, `parent_id`, `name`, `sort_order`                                                                                                          |
| `connections`       | `id`, ownership IDs, `name`, `host`, `port`, `username`, `domain`, `gateway_id`, display/security/redirection settings, `notes`, favorite flag, timestamps, `deleted_at` |
| `gateways`          | `id`, `client_id`, `name`, `host`, `port`, `username`, `credential_ref`                                                                                                  |
| `credentials`       | `id`, `client_id`, label, username/domain metadata, opaque `secret_ref`, timestamps; never the password                                                                  |
| `tags`              | `id`, `name`, permitted Carbon color token                                                                                                                               |
| `connection_tags`   | connection/tag join keys                                                                                                                                                 |
| `launch_history`    | connection ID, timestamp, adapter, success/failure category; no secret or full command line                                                                              |
| `settings`          | non-secret app and per-platform adapter preferences                                                                                                                      |
| `schema_migrations` | migration version and checksum                                                                                                                                           |

Use stable UUIDs, `created_at`, `updated_at`, and tombstones from the beginning so an optional future sync engine does not require replacing every identity.

### RDP profile fields

Start with settings that are useful and can be mapped reliably:

- Identity: display name, customer, site, folder, tags, notes.
- Target: host/IP, port, username, domain.
- Gateway: gateway host, username, and credential reference.
- Display: windowed/full screen, resolution, multi-monitor, color depth where supported.
- Local resources: clipboard, audio playback/input, printers, smart cards, and selected drive redirection.
- Experience: connection-speed profile and wallpaper/animation preferences where supported.
- Security: NLA requirement, certificate behavior, admin session, and read-only warning metadata.

Every setting needs a support matrix. When an external client cannot represent a setting, Relay must say “not supported by this client” rather than silently ignore it.

## 8. Core functionality

### Library management

- Create, edit, archive, restore, duplicate, and delete clients, sites, folders, gateways, credentials, and connections.
- Bulk move, tag, archive, export, and delete selected connections.
- Favorites and recent connections.
- Optional notes with plain text only in version 1.
- Duplicate detection based on normalized host, port, username, and customer.
- Undo for reversible list operations; confirmation modal for destructive or secret-affecting actions.

### Search and filters

- One global search entry point with a keyboard shortcut.
- Prefix/substring search across connection name, host, username, customer, site, folder, and tags.
- Filters for client, site, tags, favorite, archived, and recently used.
- Sort by name, customer, host, last used, and last edited.
- Search terms and filters remain visible; empty states explain how to clear them.

SQLite FTS can be introduced only if measured performance requires it. Begin with indexed normalized columns and a well-tested query.

### Import

- Open or drag in one or multiple `.rdp` files through Carbon's File Uploader flow.
- Parse known keys with a strict allowlist.
- Show filename, mapped fields, warnings, unsupported keys, and proposed customer before committing.
- Never execute an imported file directly.
- Never import embedded secrets or trust publisher/security flags automatically.
- Preserve unknown non-sensitive keys only in a quarantined metadata structure if a later round-trip requirement justifies it.
- Report partial failures per file rather than failing the whole batch.

### Export and backup

- Export a sanitized `.rdp` file containing only settings supported by the chosen target client.
- Exclude passwords and Relay-only notes by default.
- Bulk export to an explicit directory with safe filenames and collision handling.
- Backup the database as a versioned, checksummed archive.
- Default backup excludes secrets. A secret-inclusive backup is a separate encrypted flow requiring a passphrase, explicit warning, and restore test before release.
- Restore always validates version/checksum and offers a pre-restore backup.

### Credentials

- Saving a password is optional.
- Store password values only in the OS credential store. Store an opaque lookup reference in SQLite.
- Reveal/copy requires an explicit user action and is never done on hover.
- Clear copied passwords from the clipboard after a configurable short interval when the OS permits, while warning that clipboard managers may retain history.
- Launching an external RDP client must not put a password in command-line arguments or a generated `.rdp` file.
- For version 1, send supported username/domain settings and let the external client prompt for the password; optional Copy password remains a separate deliberate action.
- Linux startup checks whether a compatible Secret Service/keyring is available. If not, password saving is disabled with a clear explanation; Relay must not fall back to plaintext.

### Connection launching

#### Windows

- Detect and use the built-in Remote Desktop Connection client (`mstsc.exe`).
- Generate a validated temporary `.rdp` file for settings that cannot be expressed safely as arguments.
- Apply restrictive permissions, exclude secrets, track cleanup, and remove stale Relay temp files on next startup.
- Let Windows display its normal certificate/publisher prompts; never weaken OS policy.

#### macOS

- Detect applications registered to open `.rdp` files and allow the user to choose a compatible installed client.
- Generate a sanitized temporary `.rdp` file and open it through the configured adapter.
- If no client is installed, show setup guidance instead of a generic launch failure.
- Maintain adapter contract tests for every client Relay officially claims to support.

#### Linux

- Prefer a detected FreeRDP executable or a user-selected compatible client.
- Map the profile to a direct executable plus argument array; never include a password.
- Detect X11/Wayland or client limitations only where they affect a supported option.
- Explain missing packages generically and link from documentation to distribution-specific installation guidance.

#### Common behavior

- A preflight summary shows customer, host, username, gateway, and enabled redirections when risk-relevant settings are present.
- Connect errors identify the category: client missing, invalid profile, launch rejected, executable unavailable, or operating-system error.
- “Launch succeeded” means the OS accepted the process start, not that authentication or the remote session succeeded.

## 9. Carbon Design System contract

Use the current supported `@carbon/react` release and pin it. Upgrade deliberately with visual regression and accessibility testing.

### Application shell

- `Header`, `HeaderName`, `HeaderGlobalBar`, `HeaderGlobalAction`, `SideNav`, `SideNavItems`, and `Content` for the shell.
- Navigation destinations: All connections, Clients, Favorites, Recent, Import/Export, Credentials, and Settings.
- Use Carbon Grid and Stack for page composition and spacing.
- Use Carbon type tokens and IBM Plex; do not choose a separate product typeface.
- Support Carbon `g10` light and `g90` or `g100` dark themes through the official theme mechanism.

### Screen-to-component map

| Product need                   | Carbon component/pattern                                                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connection library             | Data Table with toolbar, Search, filtering controls, Pagination, Overflow Menu, Checkbox                                                                                           |
| Client/folder hierarchy        | Tree View only if the installed stable Carbon version meets keyboard and scale requirements; otherwise use Side Nav/List pages, not a handmade tree                                |
| Customer and connection labels | Tag with documented color kinds                                                                                                                                                    |
| Empty library/results          | Carbon empty-state pattern using documented typography, icon/pictogram, and Button                                                                                                 |
| Connection create/edit         | Dedicated full-page Form using Text Input, Number Input, Dropdown, Combo Box, Checkbox, Toggle, Radio Button, Password Input, Tabs only when the content model truly requires them |
| Simple rename/create           | Modal only when the flow has a small number of fields and no scrolling                                                                                                             |
| Delete/irreversible action     | Danger Modal                                                                                                                                                                       |
| Import files                   | File Uploader, Progress Indicator/Inline Loading, Structured List or Data Table for review                                                                                         |
| Validation and launch feedback | Inline Notification, Toast Notification, Inline Loading, Loading                                                                                                                   |
| Secondary actions              | Overflow Menu with clear text labels                                                                                                                                               |
| Breadcrumb context             | Breadcrumb                                                                                                                                                                         |
| Optional explanatory detail    | Tooltip only for supplemental information, never as the sole accessible label                                                                                                      |

### Non-negotiable rules

1. Before adding UI, link the relevant Carbon usage page in the pull request or decision note.
2. Do not copy Carbon markup or recreate a control with CSS when a shipped component exists.
3. Do not create custom button, input, modal, dropdown, tooltip, table, pagination, tag, toast, or navigation components.
4. Domain-specific React components may **compose** Carbon components, but may not replace their behavior or visual states.
5. Use Carbon spacing, color, motion, elevation/layer, breakpoint, and typography tokens. No arbitrary hex colors or pixel spacing except documented layout exceptions.
6. Use only Carbon icons. Do not mix icon libraries.
7. Do not use experimental/Labs or Carbon for IBM Products components unless they are added as an explicit, documented dependency and accepted as a stability risk.
8. Custom CSS is limited to page layout and platform window concerns. It must not restyle Carbon internals.
9. Prefer a full page for the detailed connection form. Do not invent a slide-over panel because it looks convenient.
10. A visual-regression story is required for each major screen in light/dark theme and common window sizes.

### Accessibility requirements

- Target WCAG 2.2 AA at the application level.
- Full keyboard operation with visible focus and logical order.
- Restore focus after dialogs and keep focus trapped while a modal is open.
- Visible labels and helper text for every field; do not rely on placeholders.
- Announce validation, import progress, launch errors, and destructive outcomes.
- Data tables use correct headers, captions/accessible names, selection announcements, and row action labels.
- Respect reduced motion, OS scaling, zoom, high contrast, and screen-reader semantics.
- Test VoiceOver on macOS, NVDA on Windows, and Orca on at least one supported Linux environment before stable release.

## 10. Screen plan

### First run

- Short welcome message explaining local storage and external RDP client behavior.
- Detected RDP client status for the current OS.
- Primary action: Create client. Secondary action: Import `.rdp` files.
- No account wall and no fake sample customer data.

### All connections

- Page title and primary New connection action.
- Global table toolbar with search, client/site/tag filters, and bulk actions.
- Columns: favorite, name, client, site, host, username, tags, last used, row actions.
- Double-click must not be the only way to connect; each row has an accessible Connect action.
- Empty, filtered-empty, loading, and error states are distinct.

### Client detail

- Breadcrumb, client identity, notes, sites/folders, gateways, and connections.
- Counts come from real data; do not add decorative dashboard charts.
- Archive client is separated from normal editing and explains its effect on child records.

### Connection view

- Strong customer label before host details.
- Primary Connect action.
- Secondary Edit, Duplicate, Export, Favorite, Archive, and Delete actions.
- Security/redirection summary is visible before launch.
- Credential is shown by label/username, never by secret value.

### Connection form

- Sections: Identity, Target, Gateway, Display, Local resources, Experience, Security, Notes.
- Required fields: connection name, client, host. Port defaults to 3389 but remains editable.
- Inline validation after blur and on submit; preserve values after an error.
- Unsaved-change confirmation on navigation/close.

### Credentials

- List credential labels, associated client, username/domain, usage count, and last updated.
- Add/edit metadata, replace secret, reveal/copy, and remove.
- Removing a used credential requires showing affected connections and selecting reassignment or leaving them without a saved credential.

### Import/export

- Select files, parse, review warnings, resolve client mapping/duplicates, import, then show results.
- Export lets users select scope and target-client compatibility.
- Backup and restore are clearly separate from `.rdp` interoperability.

### Settings

- Appearance, default launch behavior, per-OS RDP client, clipboard timeout, backup, updates, diagnostics, and About/licenses.
- Diagnostics export redacts hosts, usernames, file paths, and secrets by default.

## 11. Security and privacy plan

### Threats to design for

- A stolen database or backup.
- Malicious `.rdp` imports enabling unsafe redirection or deceptive destinations.
- Command/argument injection through hostnames, paths, usernames, or imported values.
- Password disclosure through logs, command lines, generated files, clipboard history, UI state, or crash reports.
- Cross-customer mistakes caused by weak context.
- A compromised frontend invoking overly broad native commands.
- Malicious or replaced update artifacts.

### Required controls

- Strict import schema, size limits, encoding limits, and per-key validation.
- Normalize hosts but retain user-facing values; reject control characters and ambiguous executable input.
- No shell execution and no user-supplied executable arguments outside the typed adapter configuration.
- Content Security Policy and least-privilege Tauri capabilities.
- Parameterized SQL only, transactional migrations, and database integrity checks.
- Structured redacted logging with field-level allowlists.
- Temporary files in the OS temp directory with restrictive permissions and predictable cleanup.
- Native secret store with memory zeroization where practical.
- Secure defaults: clipboard/printer/drive/microphone redirection off until chosen; do not suppress certificate warnings.
- Signed update artifacts over HTTPS. Tauri's updater signature verification remains enabled.
- Dependency scanning, secret scanning, lockfile review, SBOM generation, and published checksums.
- A `SECURITY.md` with private vulnerability-reporting instructions before public beta.

### Privacy position

- No sign-in, analytics, advertising, or network calls are required for core operation.
- Update checks are disclosed and configurable.
- Relay never connects to managed hosts itself in version 1; it starts the configured RDP client.
- Logs and diagnostics are local, bounded, and redact customer data.

## 12. Delivery stages

Stages are gated by working outcomes, not only completed code. Rough timing assumes one focused experienced developer and is planning guidance, not a commitment.

### Stage 0 — Product contract and foundation (about 1 week)

Deliver:

- Confirm the product name after repository/package/domain/trademark checks; “Relay” is common and must not be assumed available.
- Create Apache-2.0 license, README, contribution guide, code of conduct, security policy draft, and architecture decision records.
- Scaffold Tauri 2, React, TypeScript, Vite, Carbon, tests, linting, and GitHub Actions.
- Pin supported OS versions and architectures in a support policy.
- Define typed domain contracts and `.rdp` fixtures.
- Record an explicit Carbon component inventory for the first screens.

Exit gate: a minimal Carbon shell builds and tests natively on Windows, macOS, and Linux CI.

### Stage 1 — Frontend interaction model (about 2 weeks)

Deliver:

- Carbon UI Shell, routes, theme switching, responsive desktop layouts, and keyboard navigation.
- All Connections, Client detail, Connection view/form, Import review, Credentials, and Settings screens using an in-memory repository.
- Empty, loading, validation, permission, partial failure, and missing-client states.
- Storybook or equivalent isolated screen stories with light/dark visual snapshots.
- Accessibility checks plus manual keyboard walkthrough.

Do not build decorative dashboards or custom design-system controls.

Exit gate: a user can complete the full create → find → review → connect simulation and every UI element maps to a documented Carbon component/pattern.

### Stage 2 — Core library and persistence (about 2–3 weeks)

Deliver:

- Rust domain entities, repositories, use cases, typed Tauri commands, and error taxonomy.
- SQLite schema, migrations, indexes, transactions, backup primitive, and seed-free first run.
- Client/site/folder/gateway/connection/tag CRUD.
- Search, filters, sorting, favorites, archive/restore, duplicate, bulk operations, and local launch history.
- Unit, migration, repository, and 10,000-record performance tests.

Exit gate: all library workflows persist across restarts, migration rollback is tested, and the webview has no direct SQL access.

### Stage 3 — RDP import/export and launch adapters (about 3 weeks)

Deliver:

- Strict `.rdp` parser/serializer with fixture coverage and sanitized export.
- Import review, duplicate resolution, unknown-setting warnings, and partial results.
- Windows `mstsc` adapter, macOS registered-client adapter, and Linux FreeRDP/configured-client adapter.
- Capability matrix per adapter and UI handling for unsupported settings.
- Safe temporary-file lifecycle, executable detection, error categorization, and launch history.
- Manual smoke-test matrix against controlled Windows targets.

Exit gate: the same saved connection imports, displays, exports, and starts an installed RDP client on all supported platforms without secrets in files or process arguments.

### Stage 4 — Credential vault and security hardening (about 2 weeks)

Deliver:

- Native credential-store integration and explicit Linux unavailable state.
- Credential CRUD, reassignment, reveal/copy controls, timed clipboard clearing, and redacted diagnostics.
- Tauri capability audit, Content Security Policy, input/fuzz tests for `.rdp` parsing, SQL/logging review, and temp-file attack tests.
- Threat model and security review checklist.
- Dependency/SBOM/license reporting.

Exit gate: secret-canary tests prove a test password is absent from the database, backup, export, logs, crash output, and process arguments.

### Stage 5 — Backup, polish, and public beta (about 2–3 weeks)

Deliver:

- Versioned backup/restore, restore validation, and pre-restore safety backup.
- Onboarding, settings, missing-client guidance, accessible notifications, and recovery flows.
- Cross-platform E2E runs, screen-reader passes, scaling/high-contrast checks, and performance profiling.
- Windows installer, notarized macOS package, and initial Linux AppImage plus Debian package.
- Signed artifacts, checksums, release notes, updater feed, and rollback procedure.
- Documentation with install, import, backup, security, and contribution guides.

Exit gate: no open release-blocking security/accessibility defects, clean-machine install/upgrade/uninstall tests pass, and beta feedback has a documented triage process.

### Stage 6 — Stable 1.0 (about 1–2 weeks after beta stabilization)

Deliver:

- Resolve beta blockers and freeze the version 1 schema/API.
- Re-run platform, migration, backup/restore, secret-canary, and adapter suites.
- Publish support policy, changelog, known limitations, and signed 1.0 artifacts.
- Create a contributor roadmap and “good first issue” backlog.

Exit gate: version 1 success criteria in section 4 are measured and met.

### Stage 7 — Post-1.0 options, prioritized by evidence

Consider separately rather than promising all at once:

1. Reusable policy profiles for display/redirection/security settings.
2. CSV/JSON migration tools and imports from specific competing tools where formats are legally and technically documented.
3. Command palette and tray/quick-connect experience using documented Carbon patterns.
4. Optional encrypted peer/team synchronization with workspaces, roles, conflict handling, and an auditable server protocol.
5. FreeRDP library proof of concept for embedded sessions, including accessibility, keyboard routing, clipboard, GPU, audio, licensing, and sandbox review.
6. Additional protocols as separately designed plugins, not fields bolted onto the RDP model.

## 13. Test strategy

### Unit tests

- Host/port/domain validation and normalization.
- Domain ownership and archive/delete rules.
- Search/filter/sort behavior.
- Every supported `.rdp` key in parse and serialization directions.
- Unsafe characters, oversized files, malformed encodings, duplicate keys, and adversarial paths.
- Adapter profile-to-argument/file mappings.
- Log redaction and secret zeroization helpers.

### Integration tests

- Every SQLite migration from an empty and previous-version database.
- Transaction rollback and corrupted-backup handling.
- OS secret store create/read/update/delete using test namespaces.
- Temp-file permissions and cleanup.
- RDP executable discovery with controlled fake executables.
- Typed command authorization and invalid frontend payload rejection.

### End-to-end journeys

1. First run → create client → create connection → launch.
2. Import multiple `.rdp` files → resolve duplicates → search → launch.
3. Create credential → associate connection → copy → clear clipboard → remove/reassign.
4. Archive/restore client and affected connections.
5. Back up → modify data → restore → verify integrity.
6. Upgrade a prior schema and retain all supported settings.
7. Missing RDP client and unavailable Linux keyring recovery.

### Platform release matrix

- Windows 11 x64 and arm64 where dependencies permit; document Windows 10 status separately.
- Current and previous major macOS releases on Apple Silicon; Intel only if CI, maintainers, and dependencies can support it honestly.
- Ubuntu LTS as the primary Linux target plus one additional packaging/runtime family after beta evidence.
- Test 100%, 150%, and 200% scaling, small desktop windows, dark theme, high contrast, and keyboard-only use.

Do not publish a platform badge until a clean-machine installation and launch test passes on that platform.

## 14. Release and open-source operations

- Use semantic versioning and conventional, human-readable release notes.
- Protect the default branch; require format, lint, type, unit, integration, security, and build checks.
- Build each artifact on its native runner.
- Sign and notarize macOS releases; sign Windows installers; sign Linux AppImages/packages where applicable.
- Use Tauri signed updater artifacts. Keep the updater private key outside the repository with documented recovery/rotation constraints.
- Publish SHA-256 checksums and an SBOM with every release.
- Include third-party notices and comply with Carbon/FreeRDP attribution and license terms.
- Use issue templates for bugs, security-adjacent reports, feature requests, and adapter compatibility.
- Require screenshots plus Carbon documentation links for UI pull requests.
- Establish a lightweight RFC/decision-record process for sync, embedded RDP, new protocols, or design-system exceptions.

## 15. Decisions that must be made before implementation

1. Final project/package identifiers after name and trademark checks.
2. Exact minimum supported OS versions and CPU architectures.
3. Which macOS RDP clients and Linux FreeRDP executable variants receive official support in version 1.
4. Whether Intel macOS is supportable with available CI hardware.
5. Whether nested folders are truly needed; if yes, cap depth initially.
6. Whether version 1 needs secret-inclusive encrypted backups or can defer them.
7. Code-signing budget and ownership of long-lived signing/updater keys.

Recommended defaults: keep the name as a working title, support one folder level until users prove nesting is necessary, exclude secrets from version 1 backups, and officially support only adapters that have repeatable automated and manual tests.

## 16. First implementation backlog

The first issues should be small and independently reviewable:

1. Scaffold Tauri/React/TypeScript/Vite and the CI platform matrix.
2. Add pinned Carbon dependencies, themes, IBM Plex, and the UI Shell.
3. Add routing and page-level empty states.
4. Define Rust domain IDs, client, site, connection, gateway, tag, and credential-reference types.
5. Define TypeScript DTO validation and typed command conventions.
6. Add the initial SQLite migration and Rust repository interface.
7. Implement client and connection CRUD end to end.
8. Implement the Carbon Data Table library with search/filter/sort.
9. Implement the full-page connection form and validation.
10. Add `.rdp` parser fixtures before writing the importer UI.
11. Build a fake launcher adapter and contract suite.
12. Implement Windows, macOS, and Linux adapters one at a time behind that contract.
13. Add secret-store integration and secret-canary tests.
14. Add backup/restore, packaging, signing, and updater only after core data behavior is stable.

## 17. Definition of done for any feature

A Relay feature is done only when:

- Its intended user outcome and failure states are documented.
- UI uses documented Carbon components/tokens and passes light/dark visual checks.
- Keyboard and screen-reader behavior is tested.
- TypeScript and Rust validation agree at the native boundary.
- Unit/integration tests cover the happy path, malformed input, and recoverable failure.
- Secrets and customer identifiers are absent from logs and diagnostics.
- Windows, macOS, and Linux behavior is implemented or the UI truthfully marks a documented limitation.
- User documentation and migration/backup impact are updated.

## 18. Reference foundations

- [Carbon React framework guidance](https://carbondesignsystem.com/developing/frameworks/react/)
- [Carbon component overview](https://carbondesignsystem.com/components/overview/)
- [Carbon patterns](https://carbondesignsystem.com/patterns/overview/)
- [Carbon form pattern](https://carbondesignsystem.com/patterns/forms-pattern/)
- [Carbon accessibility guidance](https://carbondesignsystem.com/guidelines/accessibility/developers/)
- [Tauri 2 overview](https://v2.tauri.app/start/)
- [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/)
- [Tauri updater and update signatures](https://v2.tauri.app/plugin/updater/)
- [Tauri distribution guidance](https://v2.tauri.app/distribute/)
- [FreeRDP project](https://github.com/FreeRDP/FreeRDP)
- [Microsoft `.rdp` file security guidance](https://learn.microsoft.com/windows-server/remote/remote-desktop-services/remotepc/manage-rdp-file-security-settings-with-group-policy)
