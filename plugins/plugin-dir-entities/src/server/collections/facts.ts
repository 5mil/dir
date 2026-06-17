/**
 * dir — Fact Collection
 * Atomic, verifiable claims attached to an Entity.
 * Each fact must have at least one Citation.
 */
export function defineFacts() {
  return {
    name: 'dir_facts',
    title: 'Facts',
    fields: [
      {
        name: 'id',
        type: 'bigInt',
        autoIncrement: true,
        primaryKey: true,
      },
      {
        name: 'entity_id',
        type: 'bigInt',
        allowNull: false,
        comment: 'FK to dir_entities',
      },
      {
        name: 'claim',
        type: 'text',
        allowNull: false,
        comment: 'The atomic, verifiable statement',
      },
      {
        name: 'fact_type',
        type: 'string',
        defaultValue: 'statement',
        comment: 'statement | date | measurement | classification | relationship | quote',
      },
      {
        name: 'confidence',
        type: 'float',
        defaultValue: 1.0,
        comment: '0.0 (disputed) to 1.0 (confirmed)',
      },
      {
        name: 'status',
        type: 'string',
        defaultValue: 'active',
        comment: 'active | disputed | retracted | superseded',
      },
      {
        name: 'display_order',
        type: 'integer',
        defaultValue: 0,
      },
      {
        name: 'created_by',
        type: 'integer',
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
        name: 'entity',
        type: 'belongsTo',
        target: 'dir_entities',
        foreignKey: 'entity_id',
      },
      {
        name: 'citations',
        type: 'hasMany',
        target: 'dir_citations',
        foreignKey: 'fact_id',
      },
    ],
  };
}
