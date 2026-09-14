---
title: Development setup
sidebar_position: 1
description: Install Relay's development requirements and run the app and documentation.
---

# Development setup

Relay contains a React frontend, a Tauri/Rust native shell, and a Docusaurus documentation site.

## Requirements

- Node.js 20 or newer
- npm
- Rust stable for desktop builds
- The operating-system dependencies listed in the [official Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

Windows development also needs Microsoft C++ Build Tools and WebView2. macOS development needs Xcode Command Line Tools. Linux packages vary by distribution.

## Install dependencies

From the repository root:

```bash
npm install
```

The root npm workspace installs both Relay and the Docusaurus site.

## Run the frontend

```bash
npm run dev
```

This starts the Vite frontend in a browser. It is the quickest loop for interface work, but it cannot prove native behavior.

## Run the desktop app

After installing Rust and the platform-specific Tauri prerequisites:

```bash
npm run tauri dev
```

## Run the documentation

```bash
npm run docs:dev
```

## Verify production builds

```bash
npm run check
```

This builds the frontend and documentation. A native release build is a separate platform-specific check:

```bash
npm run tauri build
```

## Current development limitations

The desktop app persists its library locally and can use the installed platform RDP adapter. Browser development mode remains a frontend-only fallback: it intentionally cannot verify native persistence, credential storage, import/export, or RDP launching. Run the desktop command above for those workflows.
