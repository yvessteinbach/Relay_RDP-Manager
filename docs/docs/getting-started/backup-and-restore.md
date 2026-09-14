---
title: Backup and restore
sidebar_position: 3
description: Create, validate, and restore a Relay library backup safely.
---

# Backup and restore

Open **Settings → Backup and restore** and choose **Download backup**. Relay downloads a portable `.relay-backup.json` archive containing saved library data, tags, and launch history.

Backups use a versioned format and a SHA-256 checksum. Relay validates both before it changes the library. Passwords are deliberately excluded. Restoring creates fresh local credential references, so passwords must be entered again, even when restoring on the same computer.

## Restore safely

1. Make a current backup and keep it somewhere separate.
2. In **Settings → Backup and restore**, choose **Restore backup** and select a Relay backup file.
3. Confirm the replacement warning. Relay validates the archive and downloads a pre-restore safety backup before replacing the library.
4. Verify your clients and connections, then re-enter their passwords.

Relay rejects altered, damaged, newer-format, or relationship-invalid backups without changing the current library. Keep backups private: they do not contain passwords, but they do contain customer names, hosts, usernames, and notes.
