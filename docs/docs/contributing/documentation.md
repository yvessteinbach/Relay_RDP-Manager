---
title: Writing documentation
sidebar_position: 1
description: Keep Relay's Docusaurus documentation accurate, direct, and useful.
---

# Writing documentation

Documentation changes belong in the same pull request as behavior changes. If the code and docs disagree, contributors should treat that as a defect.

## Where content belongs

- `docs/docs/getting-started`: installation and first contribution paths.
- `docs/docs/architecture`: boundaries and durable technical decisions.
- `docs/docs/design`: Carbon and product-interface rules.
- `docs/docs/security`: threat boundaries and safe implementation guidance.
- `docs/docs/contributing`: contributor workflows.
- `docs/docs/project`: current status and roadmap links.

## Writing style

- Begin with what the reader will accomplish or understand.
- Use the exact names shown in the interface.
- Separate current behavior from planned behavior.
- Prefer short examples that a contributor can verify.
- State platform differences next to the affected workflow.
- Do not publish customer names, hosts, usernames, credentials, or realistic secret values in examples.
- Link to primary documentation for Carbon, Tauri, Rust, and RDP behavior.

## Preview and verify

Run a local editing server:

```bash
npm run docs:dev
```

Before opening a pull request, verify links and the production bundle:

```bash
npm run docs:build
```

Check the affected page in light and dark mode, at a narrow width, and with keyboard navigation.

## Keep project status synchronized

When a checklist item changes, update both the root `CHECKLIST.md` and the Docusaurus [Project status](../project/status.md) page. Never mark a stage complete until its exit gate has been demonstrated.
