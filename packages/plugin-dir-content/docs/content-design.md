# Dir Core Content System Design

> `plugin-dir-content` — Phase 2, Steps 16–25  
> Branch: `core-content`

---

## Overview

Phase 2 builds the primary content delivery layer on top of Phase 1’s entity schema. It introduces:

- **Articles** — full-text documents linked to entities
- **Authors** — verified contributors with reputation scores
- **Faceted search** — full-text + filter-based entity discovery
- **Entity detail page** — fully assembled page template

---

## Database Schema

### `dir_articles` (Step 16)

```sql
id                UUID PRIMARY KEY
entity_id         UUID REFERENCES dir_entities(id) ON DELETE CASCADE -- UNIQUE
article_type      VARCHAR(30)   -- general | biography | event | concept | place
body              TEXT          -- Markdown or TipTap JSON
word_count        INTEGER
reading_time      INTEGER       -- minutes
featured_image_url TEXT
status            VARCHAR(20)   -- draft | review | published
published_at      TIMESTAMPTZ
created_by        UUID
updated_by        UUID
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
-- INDEX (status, published_at)
-- INDEX (article_type)
```

### `dir_authors` (Step 17)

```sql
id              UUID PRIMARY KEY
user_id         UUID UNIQUE         -- linked to NocoBase user
display_name    VARCHAR(120)
bio             TEXT
avatar_url      TEXT
expertise_tags  JSONB               -- array of tag slugs
article_count   INTEGER
reputation      DECIMAL(5,2)        -- mirrors dir_reputation_scores
is_verified     BOOLEAN
created_at      TIMESTAMPTZ
-- INDEX (display_name)
-- INDEX (is_verified)
```

### `dir_article_authors` (Step 18) — Many-to-Many

```sql
id          UUID PRIMARY KEY
article_id  UUID REFERENCES dir_articles(id) ON DELETE CASCADE
author_id   UUID REFERENCES dir_authors(id)  ON DELETE CASCADE
role        VARCHAR(20)   -- author | contributor | reviewer
added_at    TIMESTAMPTZ
-- UNIQUE (article_id, author_id)
```

---

## Full-Text Search Architecture (Steps 19–21)

### Index Strategy

```sql
-- Generated stored column (auto-updated on row change)
ALTER TABLE dir_entities
ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')),   'A') ||
  setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(slug, '')),    'C')
) STORED;

-- GIN index for fast tsvector search
CREATE INDEX idx_entities_search_vector ON dir_entities USING GIN(search_vector);

-- Trigram index for fuzzy/autocomplete
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_entities_title_trgm ON dir_entities USING GIN(title gin_trgm_ops);
```

### Weighting
| Field | Weight | Effect |
|---|---|---|
| `title` | A (highest) | Title matches rank first |
| `summary` | B | Summary matches rank second |
| `slug` | C | Slug matches rank third |

### Ranking
`ts_rank(search_vector, plainto_tsquery('english', :q))` — normalized by document length.

---

## Search API (Steps 19–24)

### Endpoint
`GET /api/dir_entities:search`

### Parameters
| Param | Type | Default | Description |
|---|---|---|---|
| `q` | string | — | Search query |
| `entity_type` | string | — | Filter by entity type |
| `status` | string | `published` | Filter by publish status |
| `page` | number | 1 | Pagination |
| `limit` | number | 20 | Results per page (max 100) |

### Response
```json
{
  "results": [
    { "id": "...", "slug": "albert-einstein", "title": "Albert Einstein",
      "entity_type": "person", "summary": "...", "credibility_score": 95,
      "fact_count": 12, "citation_count": 8 }
  ],
  "facets": {
    "entity_type": [ { "value": "person", "count": 42 }, { "value": "concept", "count": 31 } ]
  },
  "total": 73,
  "page": 1,
  "totalPages": 4,
  "did_you_mean": "Albert Einstein"
}
```

---

## Suggest API (Step 21 / Step 51)

`GET /api/dir_entities:suggest?q=eins`

```json
{
  "suggestions": [
    { "slug": "albert-einstein", "title": "Albert Einstein", "entity_type": "person", "score": 0.87 },
    { "slug": "einstein-field-equations", "title": "Einstein Field Equations", "entity_type": "concept", "score": 0.71 }
  ]
}
```

---

## Entity Detail API (Step 25)

`GET /api/dir_entities:detail?slug=albert-einstein`

Returns full entity payload:
```json
{
  "entity":          { ...core fields... },
  "article":         { "body": "...", "authors": [...], "reading_time": 4 },
  "facts":           [ { "fact_type": "birthdate", "claim": "14 March 1879", "is_verified": true } ],
  "sources":         [ { "title": "Princeton Press", "credibility_tier": "primary", "url": "..." } ],
  "relations":       [ { "relation_type": "student_of", "related_title": "Max Planck" } ],
  "tags":            [ { "slug": "physics", "label": "Physics" } ],
  "governance_mode": "solo",
  "latest_revision": { "revision_number": 7, "created_at": "2026-06-15T..." }
}
```

---

*plugin-dir-content v0.1.0 — Phase 2 complete (Steps 16–25)*
