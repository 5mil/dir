/**
 * dir — Relation Collection
 * Directed, typed links between Entities.
 * Builds the knowledge graph layer.
 */
export function defineRelations() {
  return {
    name: 'dir_relations',
    title: 'Relations',
    fields: [
      {
        name: 'id',
        type: 'bigInt',
        autoIncrement: true,
        primaryKey: true,
      },
      {
        name: 'source_entity_id',
        type: 'bigInt',
        allowNull: false,
        comment: 'The entity this relation originates from',
      },
      {
        name: 'target_entity_id',
        type: 'bigInt',
        allowNull: false,
        comment: 'The entity this relation points to',
      },
      {
        name: 'relation_type',
        type: 'string',
        allowNull: false,
        comment: 'is-a | part-of | created-by | located-in | associated-with | preceded-by | followed-by | instance-of | see-also | contradicts',
      },
      {
        name: 'label',
        type: 'string',
        comment: 'Optional human-readable label for the relation',
      },
      {
        name: 'weight',
        type: 'float',
        defaultValue: 1.0,
        comment: 'Strength or importance of the relation (used in graph traversal)',
      },
      {
        name: 'bidirectional',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'created_by',
        type: 'integer',
      },
      {
        name: 'created_at',
        type: 'date',
      },
      // Associations
      {
        name: 'source_entity',
        type: 'belongsTo',
        target: 'dir_entities',
        foreignKey: 'source_entity_id',
      },
      {
        name: 'target_entity',
        type: 'belongsTo',
        target: 'dir_entities',
        foreignKey: 'target_entity_id',
      },
    ],
  };
}
