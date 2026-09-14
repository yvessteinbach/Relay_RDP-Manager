# Contributing to Relay

Thank you for helping build Relay. The project is early, so a clear problem statement and a small, reviewable change are more valuable than a large speculative implementation.

## Before starting

1. Read the [project status](./CHECKLIST.md) and [product plan](./PLAN.md).
2. Choose work inside the active stage unless an issue explicitly says otherwise.
3. For interface work, read the [Carbon rules](./docs/docs/design/carbon-design-system.md) and link the relevant official Carbon guidance in the pull request.
4. For credentials, imports, process launching, backups, updates, logging, or native permissions, read the [credential and trust model](./docs/docs/security/credential-model.md).

## Local checks

Install dependencies and verify the web artifacts:

```bash
npm install
npm run check
```

After installing the platform-specific Tauri prerequisites, verify the desktop application:

```bash
npm run tauri dev
```

Additional lint, unit, integration, and accessibility checks will be added during Stage 0 and must pass once available.

## Pull requests

- Keep one user outcome or infrastructure concern per pull request.
- Describe current behavior, the change, failure states, and verification.
- Add or update documentation with behavior changes.
- Include light/dark screenshots for visual changes.
- Do not include customer identifiers, hosts, usernames, credentials, production `.rdp` files, or sensitive logs.
- Do not mark checklist items complete without demonstrating their exit condition.

## AI-assisted contributions

AI tools may help with code, tests, or writing. Contributors remain responsible for understanding and reviewing everything they submit. State material AI assistance in the pull request, verify generated claims against primary sources, and never give confidential customer data or credentials to an AI service.

## Design contributions

Relay does not accept replacements for controls already provided by the pinned Carbon release. Domain components may compose official Carbon components without altering their interaction contract or internal styles.

## Documentation

The developer site uses Docusaurus. Follow [Writing documentation](./docs/docs/contributing/documentation.md) and verify a production build with `npm run docs:build`.
