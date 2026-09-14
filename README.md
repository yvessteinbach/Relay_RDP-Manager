# Relay

> **AI-assisted development:** Relay has been developed with the help of AI. Human maintainers review the architecture, code, security decisions, documentation, and releases, and remain accountable for what the project publishes.

Relay is an open-source, local-first Remote Desktop connection manager for Windows, macOS, and Linux. It is intended for consultants, managed service providers, and IT teams that need a faster way to organize and launch RDP connections across multiple customer organizations.

Relay is currently in early development. The active work is tracked in the [execution checklist](./CHECKLIST.md), while the complete product and engineering direction lives in the [project plan](./PLAN.md).

## Current state

- Stage 3 — RDP import/export and launch adapters: **in progress**
- Carbon-based React application shell and connection-library prototype: available
- Tauri native shell and SQLite-backed library boundary: available
- Docusaurus developer documentation: scaffolded
- Client and connection persistence commands: available; the frontend is not wired to them yet
- Sanitized `.rdp` import/export and native RDP-client launch adapters: available
- Platform smoke tests against controlled Windows targets: pending

## Run the application frontend

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

The browser development server is useful for frontend work. To run Relay as a desktop application, install the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your operating system, including Rust, then run:

```bash
npm run tauri dev
```

## Run the documentation

```bash
npm run docs:dev
```

Create a production documentation build with:

```bash
npm run docs:build
```

## Design policy

Relay uses the official IBM Carbon Design System React implementation. Contributors must use documented Carbon components, tokens, icons, accessibility behavior, and patterns. Do not recreate an existing Carbon control with custom markup or styling. See the [Carbon contribution rules](./docs/docs/design/carbon-design-system.md).

## Project documents

- [Execution checklist](./CHECKLIST.md)
- [Product and engineering plan](./PLAN.md)
- [Developer documentation](./docs/docs/intro.md)

## License

Relay is licensed under the [Apache License 2.0](./LICENSE).
