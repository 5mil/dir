/**
 * dir — Tag Collection
 * Faceted classification labels applied to Entities.
 * Supports multi-dimensional filtering and index-hierarchy navigation.
 */
export function defineTags() {
  return {
    name: 'dir_tags',
    title: 'Tags',
    fields: [
      {
        name: 'id',
        type: 'integer',
        autoIncrement: true,
        primaryKey: true,
      },
      {
        name: 'name',
        type: 'string',
        unique: true,
        allowNull: false,
      },
      {
        name: 'slug',
        type: 'string',
        unique: true,
      },
      {
        name: 'facet',
        type: 'string',
        comment: 'The classification dimension: topic | era | region | domain | format | difficulty',
      },
      {
        name: 'parent_tag_id',
        type: 'integer',
        comment: 'For hierarchical tag trees (index hierarchy navigation)',
      },
      {
        name: 'description',
        type: 'text',
      },
      {
        name: 'color',
        type: 'string',
        comment: 'Hex color for UI display',
      },
      {
        name: 'entity_count',
        type: 'integer',
        defaultValue: 0,
        comment: 'Denormalized count for performance',
      },
      // Associations
      {
        name: 'parent',
        type: 'belongsTo',
        target: 'dir_tags',
        foreignKey: 'parent_tag_id',
      },
      {
        name: 'children',
        type: 'hasMany',
        target: 'dir_tags',
        foreignKey: 'parent_tag_id',
      },
      {
        name: 'entities',
        type: 'belongsToMany',
        target: 'dir_entities',
        through: 'dir_entity_tags',
      },
    ],
  };
}
