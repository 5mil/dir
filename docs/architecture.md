# dir — System Architecture

## Entity Model

```
Entity
  ├── Facts (claims)
  │     └── Citations → Sources
  ├── Relations (links to other Entities)
  ├── Tags / Facets
  └── Revision History

Source
  ├── URL / DOI / ISBN
  ├── Credibility Score
  └── Provenance Metadata
```

## Governance Logic

```
GovernanceNode
  ├── mode: solo | board | open
  ├── board_members[]
  ├── edit_permissions{}
  └── moderation_queue[]
```

## Plugin Architecture (NocoBase)

- `plugin-dir-entities` — Core entity/fact/source collections
- `plugin-dir-governance` — Governance node switching
- `plugin-dir-ui` — Custom UI blocks (gestalt/OOUX framework)
- `plugin-dir-search` — Advanced faceted search
- `plugin-dir-reputation` — Contributor reputation scoring
- `plugin-dir-mining` — Fennac pool mining integration
- `plugin-dir-student-os` — Student OS installer management console

## UI Design Principles

- Gestalt psychology (proximity, similarity, continuity)
- Cognitive Load Theory — minimize extraneous load
- OOUX — object-first UI semantics
- Information Scent — clear navigation affordances
- Faceted Classification — multi-dimensional filtering
- Index Hierarchy — structured drill-down navigation
- Nielsen's 10 Heuristics — behavioral dynamic feedback
- Skeleton Loading — perceived performance
- Persistent Location Mapping — always-visible breadcrumb/context
