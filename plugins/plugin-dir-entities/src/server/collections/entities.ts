/**
 * dir — Entity Collection
 * The top-level knowledge node. Each entity is a person, place, concept, event, or thing.
 */
export function defineEntities() {
  return {
    name: 'dir_entities',
    title: 'Entities',
    fields: [
      {
        name: 'id',
        type: 'bigInt',
        autoIncrement: true,
        primaryKey: true,
      },
      {
        name: 'slug',
        type: 'string',
        unique: true,
        comment: 'URL-safe unique identifier (e.g. albert-einstein)',
      },
      {
        name: 'title',
        type: 'string',
        allowNull: false,
      },
      {
        name: 'summary',
        type: 'text',
        comment: 'Short human-readable summary (1-3 sentences)',
      },
      {
        name: 'body',
        type: 'text',
        comment: 'Full rich-text content (Markdown/HTML)',
      },
      {
        name: 'entity_type',
        type: 'string',
        defaultValue: 'concept',
        comment: 'person | place | event | concept | organization | work | species | other',
      },
      {
        name: 'status',
        type: 'string',
        defaultValue: 'draft',
        comment: 'draft | review | published | archived',
      },
      {
        name: 'credibility_score',
        type: 'float',
        defaultValue: 0.0,
        comment: 'Computed score 0.0-1.0 based on source quality and contributor reputation',
      },
      {
        name: 'view_count',
        type: 'bigInt',
        defaultValue: 0,
      },
      {
        name: 'created_by',
        type: 'integer',
        comment: 'FK to users table',
      },
      {
        name: 'created_at',
        type: 'date',
      },
      {
        name: 'updated_at',
        type: 'date',
      },
      // Associations
      {
        name: 'facts',
        type: 'hasMany',
        target: 'dir_facts',
        foreignKey: 'entity_id',
      },
      {
        name: 'tags',
        type: 'belongsToMany',
        target: 'dir_tags',
        through: 'dir_entity_tags',
      },
      {
        name: 'relations_from',
        type: 'hasMany',
        target: 'dir_relations',
        foreignKey: 'source_entity_id',
      },
      {
        name: 'revisions',
        type: 'hasMany',
        target: 'dir_revisions',
        foreignKey: 'entity_id',
      },
    ],
  };
}
