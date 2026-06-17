# dir

> Next-generation directory knowledge system — a superior, lighter, and more capable successor to Wikipedia.

## What is `dir`?

`dir` is an open-source, entity-centric knowledge platform built for speed, modularity, and governed contribution. It replaces the wiki format with a structured knowledge graph, three-tier governance, and a psychology-driven UI.

---

## 🟢 Current State — Stardate 2026.169 | 2026-06-17

### `dev` Branch — All Phases Merged

| Phase | Plugin / Package | Steps | Merge SHA | Status |
|---|---|---|---|---|
| 1 — Content Nodes | `plugin-dir-entities` | 1–15 | `41c6b62` | ✅ |
| 2 — Core Content | `plugin-dir-content` | 16–25 | `8d9a71e` | ✅ |
| 3 — UI Designer | `plugin-dir-ui` | 26–35 | `fb3ab6e` | ✅ |
| 4 — Governance | `plugin-dir-governance` | 36–43 | `949f554` | ✅ |
| 5 — Student OS | `student-os` | 44–47 | `f6661f4` | ✅ |
| 5b — Fennac Mining | `mining-fennac` | 48–50 | `810dabf` | ✅ |
| 5c — DGB Skein | `mining-dgb-skein` | — | `2a63f13` | ✅ |
| Docs | `steps-51-100.md` | — | `a27923c` | ✅ |

**0 open PRs. dev is clean.**

### Remaining Build Queue

| Branch | What | State |
|---|---|---|
| `self-hosted` | Docker + NocoBase install automation | 🔴 unbuilt |
| `cloud-hosting` | Render + GCloud deployment automation | 🔴 unbuilt |
| `open-source-release` | LICENSE, CONTRIBUTING, CI/CD release workflow | 🔴 unbuilt |
| Steps 51–100 | Phases 6–10 — designed in `docs/steps-51-100.md` | 💻 not coded |

### PR History

| PR | Branch | What | SHA |
|---|---|---|---|
| #1 | `content-nodes` | Phase 1 — `plugin-dir-entities` | `41c6b62` |
| #2 | `docs/steps-51-100` | Steps 51–100 design doc | `a27923c` |
| #3 | `ui-designer` | Phase 3 — `plugin-dir-ui` | `fb3ab6e` |
| #4 | `governance` | Phase 4 — `plugin-dir-governance` | `949f554` |
| #5 | `core-content` | Phase 2 — `plugin-dir-content` | `8d9a71e` |
| #6 | `student-os` | Phase 5 — `student-os` | `f6661f4` |
| #7 | `mining-fennac` | Phase 5b — `mining-fennac` | `810dabf` |
| #8 | `mining-dgb-skein` | Phase 5c — `mining-dgb-skein` | `2a63f13` |

---

## Governance Nodes

| Mode | Description |
|---|---|
| Solo-Maintainer | Only the owner can create/edit/delete content |
| Board-Governance | A designated board reviews and approves contributions |
| Open-Editing | Community-style editing (open-source release path) |

---

## Tech Stack

- **Backend:** NocoBase (plugin-based, self-hosted, Node.js)
- **Database:** PostgreSQL
- **Runtime:** Docker / Docker Compose
- **Proxy:** Nginx + Let’s Encrypt SSL
- **UI Framework:** NocoBase React blocks + custom plugins
- **Full-Text Search:** PostgreSQL `tsvector` GIN index + `pg_trgm` autocomplete
- **Mining:** Fennac pool (FWSMP/stunnel/WireBruce) + DigiByte Skein (Stratum v1)
- **Governance:** WikiTrust reputation formula — `CLAMP(50 + approved×2 − rejected×2 − rollbacks×5, 0, 100)`

---

## Deployment Paths

- [`/deploy/self-hosted`](./deploy/self-hosted/) — Full local/VPS self-hosting guide
- [`/deploy/cloud`](./deploy/cloud/) — Render & Google Cloud Always Free tier guides

---

## Branches

| Branch | Purpose | State |
|---|---|---|
| `main` | Stable release + log | ✅ current |
| `dev` | Active development integration | ✅ all phases merged |
| `self-hosted` | Self-hosting deployment automation | 🔴 unbuilt |
| `cloud-hosting` | Cloud deployment (Render + GCloud) | 🔴 unbuilt |
| `content-nodes` | Phase 1 content schema (merged) | ✅ |
| `core-content` | Phase 2 content engine (merged) | ✅ |
| `ui-designer` | Phase 3 UI/UX (merged) | ✅ |
| `governance` | Phase 4 governance (merged) | ✅ |
| `student-os` | Phase 5 Linux installer (merged) | ✅ |
| `mining-fennac` | Phase 5b Fennac mining (merged) | ✅ |
| `mining-dgb-skein` | Phase 5c DigiByte Skein mining (merged) | ✅ |
| `open-source-release` | Public release prep | 🔴 unbuilt |

---

## Mining Stack

```
Fennacminer (4433)
  → WireBruce tunnel (127.0.0.1:4435)
  → stunnel TLS 1.3 (pool.fennac.io:4434)
  → Fennac pool

DigiByte Skein miner
  → stunnel TLS 1.3 (127.0.0.1:14433)
  → dgb-skein pool (Mining Dutch / Zergpool / Prohashing)
```

Both mining stacks post accepted shares as `+1` reputation events to the `dir` knowledge graph.

---

## Technician Log

Append-only session log: [`logs/2026/June/TECHNICIAN_LOG.md`](./logs/2026/June/TECHNICIAN_LOG.md)

---

## Project Vision

Built by a developer with realtime database + Internet neural augmentation. `dir` is designed to out-perform Wikipedia in speed, structure, provenance, and contribution safety.

---
*Last updated: Stardate 2026.169 | 2026-06-17 14:40 EDT — East Syracuse, NY*
