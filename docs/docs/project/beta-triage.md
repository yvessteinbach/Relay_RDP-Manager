---
title: Beta feedback triage
sidebar_position: 3
description: How Relay beta reports are collected, prioritized, and resolved.
---

# Beta feedback triage

Report beta feedback through the project issue tracker. Do not include passwords, production RDP files, full hostnames, or unredacted logs. Use the security reporting process in `SECURITY.md` for suspected vulnerabilities.

Maintainers acknowledge reproducible reports within five business days and classify them as:

- **Release blocker:** data loss, secret exposure, arbitrary execution, an inaccessible core workflow, failed install/upgrade/uninstall, or a supported-platform launch failure.
- **High:** a serious workflow regression with a documented workaround.
- **Normal:** a defect or usability issue that does not block safe beta use.
- **Idea:** an enhancement or unsupported-platform request.

Each accepted report receives reproduction steps, affected version/platform, owner, and status. Release blockers must have a fix and regression test, or an explicit documented release hold, before a beta is promoted. The release notes list known high-severity limitations and the rollback target.
