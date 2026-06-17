/**
 * dir — Revision Collection
 * Full snapshot of an Entity at each edit.
 * Enables diff view, rollback, and WikiTrust-style reputation scoring.
 */
export function defineRevisions() {
  return {
    name: 'dir_revisions',
    title: 'Revisions',
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
      },
      {
        name: 'revision_number',
        type: 'integer',
        allowNull: false,
      },
      {
        name: 'snapshot',
        type: 'jsonb',
        comment: 'Full JSON snapshot of entity state at this revision',
      },
      {
        name: 'diff',
        type: 'jsonb',
        comment: 'JSON diff from previous revision',
      },
      {
        name: 'edit_summary',
        type: 'string',
        comment: 'Human-readable reason for the edit',
      },
      {
        name: 'edit_type',
        type: 'string',
        defaultValue: 'update',
        comment: 'create | update | revert | merge | auto-correct',
      },
      {
        name: 'governance_mode',
        type: 'string',
        comment: 'solo | board | open — mode active at time of edit',
      },
      {
        name: 'approved_by',
        type: 'integer',
        comment: 'User ID of approver (board mode) or null',
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
        name: 'entity',
        type: 'belongsTo',
        target: 'dir_entities',
        foreignKey: 'entity_id',
      },
    ],
  };
}
