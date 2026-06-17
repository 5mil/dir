/**
 * dir — Entity-Tags junction table
 */
export function defineEntityTags() {
  return {
    name: 'dir_entity_tags',
    title: 'Entity Tags',
    fields: [
      {
        name: 'entity_id',
        type: 'bigInt',
        allowNull: false,
      },
      {
        name: 'tag_id',
        type: 'integer',
        allowNull: false,
      },
    ],
  };
}
