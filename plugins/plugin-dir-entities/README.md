# plugin-dir-entities

Core data engine for `dir`. Defines and manages all knowledge collections.

## Collections

| Collection | Description |
|---|---|
| `dir_entities` | Top-level knowledge nodes (people, places, events, concepts) |
| `dir_facts` | Atomic, verifiable claims attached to entities |
| `dir_sources` | Citable references (URL, DOI, ISBN, archive) |
| `dir_citations` | Junction between facts and sources; carries quote/page/access metadata |
| `dir_revisions` | Full entity snapshots for history, diff, and rollback |
| `dir_relations` | Directed, typed links between entities (knowledge graph) |
| `dir_tags` | Hierarchical faceted classification labels |
| `dir_entity_tags` | Junction between entities and tags |

## Data Flow

```
Entity
  └── Facts (1:many)
        └── Citations (1:many)
              └── Sources (many:1, global reuse)
  └── Revisions (1:many, full snapshot)
  └── Relations (1:many, directed graph edges)
  └── Tags (many:many via dir_entity_tags)
```

## Server Actions

| Action | Endpoint | Description |
|---|---|---|
| `publishEntity` | `POST /api/dir_entities:publish` | Validates citations, sets status to published |
| `recordRevision` | `POST /api/dir_entities:revise` | Snapshots current state to revisions table |
| `computeCredibility` | `POST /api/dir_entities:credibility` | Scores entity based on source quality |

## Migration

```bash
# Apply schema
yarn nocobase db:migrate

# Seed development data
yarn nocobase db:seed
```

## Credibility Scoring

Scores are computed as the weighted average of:
`source.credibility_score × citation.relevance_score`
across all facts and citations for the entity.

## Relation Types

`is-a` · `part-of` · `created-by` · `located-in` · `associated-with` · `preceded-by` · `followed-by` · `instance-of` · `see-also` · `contradicts`

## Tag Facets

`topic` · `era` · `region` · `domain` · `format` · `difficulty`
