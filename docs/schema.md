# dir — Database Schema Reference

## Entity Relationship Diagram

```
dir_entities (1) ──── (many) dir_facts
                              │
                        (many) dir_citations
                              │
                        (many:1) dir_sources

dir_entities (1) ──── (many) dir_revisions
dir_entities (1) ──── (many) dir_relations ──── (many:1) dir_entities
dir_entities (many) ─ (many) dir_tags  [via dir_entity_tags]
```

## Table Summary

### dir_entities
| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| slug | VARCHAR(255) UNIQUE | URL-safe identifier |
| title | VARCHAR(255) NOT NULL | |
| summary | TEXT | 1-3 sentence overview |
| body | TEXT | Full rich-text content |
| entity_type | VARCHAR(64) | person/place/event/concept/org/work/species/other |
| status | VARCHAR(32) | draft/review/published/archived |
| credibility_score | FLOAT | Computed 0.0-1.0 |
| view_count | BIGINT | |
| created_by | INTEGER | FK users |

### dir_facts
| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| entity_id | BIGINT FK | → dir_entities, CASCADE |
| claim | TEXT NOT NULL | Atomic verifiable statement |
| fact_type | VARCHAR(64) | statement/date/measurement/classification/relationship/quote |
| confidence | FLOAT | 0.0 (disputed) – 1.0 (confirmed) |
| status | VARCHAR(32) | active/disputed/retracted/superseded |

### dir_sources
| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| title | VARCHAR(512) NOT NULL | |
| source_type | VARCHAR(64) | web/journal/book/archive/government/dataset/news/other |
| url | TEXT | |
| doi | VARCHAR(255) | |
| isbn | VARCHAR(32) | |
| credibility_tier | VARCHAR(64) | primary/peer-reviewed/established-news/web/unverified/disputed |
| credibility_score | FLOAT | 0.0-1.0 |
| archived_url | TEXT | Link-rot prevention |

### dir_citations
| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| fact_id | BIGINT FK | → dir_facts, CASCADE |
| source_id | BIGINT FK | → dir_sources |
| quote | TEXT | Exact excerpt supporting the fact |
| page_number | VARCHAR(64) | Page, section, or timestamp |
| access_date | DATE | For web sources |
| relevance_score | FLOAT | 0.0-1.0 |

### dir_revisions
| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| entity_id | BIGINT FK | → dir_entities, CASCADE |
| revision_number | INTEGER NOT NULL | |
| snapshot | JSONB | Full entity state at revision |
| diff | JSONB | Delta from previous revision |
| edit_summary | VARCHAR(512) | |
| governance_mode | VARCHAR(16) | solo/board/open |
| approved_by | INTEGER | Board approver user ID |

### dir_relations
| Column | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| source_entity_id | BIGINT FK | → dir_entities, CASCADE |
| target_entity_id | BIGINT FK | → dir_entities, CASCADE |
| relation_type | VARCHAR(64) NOT NULL | is-a, part-of, created-by, etc. |
| weight | FLOAT | Graph traversal weight |
| bidirectional | BOOLEAN | |

### dir_tags
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| name | VARCHAR(128) UNIQUE NOT NULL | |
| slug | VARCHAR(128) UNIQUE | |
| facet | VARCHAR(64) | topic/era/region/domain/format/difficulty |
| parent_tag_id | INTEGER FK | Self-referential for hierarchy |
| entity_count | INTEGER | Denormalized for performance |
