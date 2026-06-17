/**
 * dir — Citation Collection
 * Junction between a Fact and a Source.
 * Carries the specific page, timestamp, or quote that supports the fact.
 */
export function defineCitations() {
  return {
    name: 'dir_citations',
    title: 'Citations',
    fields: [
      {
        name: 'id',
        type: 'bigInt',
        autoIncrement: true,
        primaryKey: true,
      },
      {
        name: 'fact_id',
        type: 'bigInt',
        allowNull: false,
      },
      {
        name: 'source_id',
        type: 'bigInt',
        allowNull: false,
      },
      {
        name: 'quote',
        type: 'text',
        comment: 'Exact quote or excerpt from the source supporting the fact',
      },
      {
        name: 'page_number',
        type: 'string',
        comment: 'Page, section, or timestamp reference within the source',
      },
      {
        name: 'access_date',
        type: 'dateOnly',
        comment: 'Date the URL was last accessed (for web sources)',
      },
      {
        name: 'relevance_score',
        type: 'float',
        defaultValue: 1.0,
        comment: 'How directly the source supports the fact (0.0-1.0)',
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
        name: 'fact',
        type: 'belongsTo',
        target: 'dir_facts',
        foreignKey: 'fact_id',
      },
      {
        name: 'source',
        type: 'belongsTo',
        target: 'dir_sources',
        foreignKey: 'source_id',
      },
    ],
  };
}
