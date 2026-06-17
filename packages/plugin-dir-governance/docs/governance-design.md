# Dir Governance System Design

> `plugin-dir-governance` — Phase 4, Steps 36–43  
> Branch: `governance`

---

## Overview

Dir uses a **three-node governance model** inspired by Wikipedia's editorial hierarchy but simplified for self-hosted deployments. Any entity can independently be configured in one of three modes:

| Mode | Who Can Edit | Review Required | Default |
|---|---|---|---|
| **solo** | Entity owner only | No | ✅ Yes |
| **board** | Anyone, but board must approve | Yes — board approvers | No |
| **open** | Anyone | Yes — moderation queue | No |

---

## Database Schema

### `dir_governance_modes` (Step 37)

One row per entity. Stores the current governance mode.

```sql
id          UUID PRIMARY KEY
entity_id   UUID REFERENCES dir_entities(id) ON DELETE CASCADE  -- UNIQUE
mode        VARCHAR(10)  -- 'solo' | 'board' | 'open'
created_by  UUID
updated_at  TIMESTAMPTZ
```

### `dir_board_members` (Step 38)

List of users with board privileges on a specific entity.

```sql
id          UUID PRIMARY KEY
entity_id   UUID REFERENCES dir_entities(id) ON DELETE CASCADE
user_id     UUID
role        VARCHAR(20)  -- 'reviewer' | 'approver'
added_at    TIMESTAMPTZ
-- UNIQUE (entity_id, user_id)
```

### `dir_pending_edits` (Step 39)

Moderation queue. All edits in board/open mode land here before going live.

```sql
id             UUID PRIMARY KEY
entity_id      UUID REFERENCES dir_entities(id) ON DELETE CASCADE
submitted_by   UUID
edit_type      VARCHAR(30)  -- 'fact_add' | 'fact_edit' | 'body_edit' | 'source_add' | 'translation'
proposed_data  JSONB        -- full proposed entity snapshot
status         VARCHAR(20)  -- 'pending' | 'approved' | 'rejected'
reviewed_by    UUID
review_note    TEXT
submitted_at   TIMESTAMPTZ
reviewed_at    TIMESTAMPTZ
-- INDEX (entity_id, status)
-- INDEX (submitted_by)
```

### `dir_reputation_scores` (Step 40)

WikiTrust-inspired per-editor reputation tracking.

```sql
id              UUID PRIMARY KEY
user_id         UUID UNIQUE
edit_count      INTEGER   -- total edits submitted
approved_count  INTEGER   -- edits approved by board/moderators
rejected_count  INTEGER   -- edits rejected
rollback_count  INTEGER   -- times their edits were rolled back
reputation      DECIMAL(5,2)  -- 0.00 – 100.00
last_computed   TIMESTAMPTZ
```

---

## Reputation Formula (Step 40)

```
reputation = CLAMP(
  50
  + (approved_count × 2)
  - (rejected_count × 2)
  - (rollback_count × 5),
  min=0, max=100
)
```

| Score Range | Trust Level | Effect in open mode |
|---|---|---|
| 70 – 100 | **High** | Edits may auto-publish (configurable) |
| 31 – 69 | **Medium** | Standard moderation queue |
| 0 – 30 | **Low** | Edits always queued, flagged for priority review |

---

## Server Actions

| Action | Endpoint | Step | Who Can Call |
|---|---|---|---|
| `setGovernanceMode` | `POST /api/dir_entities:setGovernanceMode` | 36–39 | Entity owner |
| `approveEdit` | `POST /api/dir_entities:approveEdit` | 38–39 | Board approver / moderator |
| `rejectEdit` | `POST /api/dir_entities:rejectEdit` | 38–39 | Board approver / moderator |
| `computeReputation` | `POST /api/dir_entities:computeReputation` | 40 | System / admin |
| `diff` | `GET /api/dir_entities/:id/diff?from=N&to=M` | 42 | Any authenticated user |
| `rollback` | `POST /api/dir_entities:rollback` | 43 | Entity owner / board approver |

---

## Edit Flow by Mode

### Solo Mode (default)
```
Owner submits edit
  → Directly applied to entity
  → Revision snapshot created
  → No queue, no approval
```

### Board Mode
```
Any user submits edit
  → dir_pending_edits created (status: pending)
  → Board approvers notified
  → Board approver calls approveEdit or rejectEdit
  → On approve: entity updated + revision snapshot + reputation +2
  → On reject:  pending edit marked rejected + reputation -2
```

### Open Mode
```
Any user submits edit
  → dir_pending_edits created (status: pending)
  → Moderation queue visible to all moderators
  → High-reputation editors (≥70) may auto-approve (configurable)
  → Same approve/reject flow as board mode
```

---

## Rollback Flow (Step 43)

```
Owner or board approver calls rollback(entityId, revisionNumber)
  → Load target revision snapshot from dir_revisions
  → Overwrite entity with snapshot
  → Create new revision (edit_type: 'rollback')
  → Penalise last editor: rollback_count +1, reputation -5
```

---

*plugin-dir-governance v0.1.0 — Phase 4 complete (Steps 36–43)*
