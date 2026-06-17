# Changelog

All notable changes to dir are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- MIT License
- CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
- GitHub issue templates (bug, feature, mining hardware)
- PR template
- CI workflow (lint, docker-compose validate, secret scan)
- Release workflow (tag → GitHub Release + install.sh asset)

---

## [0.2.0] — 2026-06-17

### Added
- `packages/mining-wallet`: integrated DGB HD wallet (BIP39/BIP44, AES-256-GCM)
- Solana payout bridge (4 payout modes: DGB integrated, DGB external, SOL, custom)
- USB ASIC plug-and-play: lsusb VID:PID + serial + cgminer API detection
- Mining Tab React UI (`MiningTab.tsx`): Overview / Wallet / Payout / ASICs

---

## [0.1.1] — 2026-06-17

### Added
- `deploy/cloud`: Render.com Blueprint (`render.yaml`), GCloud e2-micro deploy script
- GCS backup sync, GCloud status check
- Cloud hosting guide

---

## [0.1.0] — 2026-06-17

### Added
- `deploy/self-hosted`: Docker Compose stack (PostgreSQL 16 + Redis 7 + NocoBase + Watchtower)
- `install.sh`: OS-detect (apt/dnf/pacman), Docker install, .env auto-generate, Nginx config, systemd backup timer
- `backup.sh`, `restore.sh`, `upgrade.sh`, `health.sh`
- systemd units: `dir-stack.service`, `dir-backup.service`, `dir-backup.timer`
- Self-hosted guide

### Added (pre-v0.1.0, dev branch)
- NocoBase plugin phases 1–5 (core data model, collections, views, permissions, API)
- Student OS plugin
- Fennac mining integration (CPU + GPU Skein pool miner)
- DGB Skein miner (cpuminer-multi)

---

*dir — Stardate 2026.169*
