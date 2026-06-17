/**
 * Migration: governance schema
 * Step 36–39 — ACL tables + moderation queue
 *
 * Creates:
 *  - dir_governance_modes  : per-entity governance mode setting
 *  - dir_board_members     : board members for board-mode entities
 *  - dir_pending_edits     : moderation queue for open/board mode
 *  - dir_reputation_scores : WikiTrust reputation per editor
 */
import { Migration } from '@nocobase/server';

export default class GovernanceSchemaMigration extends Migration {
  async up() {
    const queryInterface = this.db.sequelize.getQueryInterface();

    // Step 37 — solo/board/open mode config per entity
    await queryInterface.createTable('dir_governance_modes', {
      id:              { type: 'UUID', primaryKey: true, defaultValue: this.db.sequelize.literal('gen_random_uuid()') },
      entity_id:       { type: 'UUID', allowNull: false, references: { model: 'dir_entities', key: 'id' }, onDelete: 'CASCADE' },
      mode:            { type: 'VARCHAR(10)', allowNull: false, defaultValue: 'solo' }, // solo | board | open
      created_by:      { type: 'UUID' },
      updated_at:      { type: 'TIMESTAMPTZ', defaultValue: this.db.sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('dir_governance_modes', ['entity_id'], { unique: true });

    // Step 38 — board members table for board mode
    await queryInterface.createTable('dir_board_members', {
      id:              { type: 'UUID', primaryKey: true, defaultValue: this.db.sequelize.literal('gen_random_uuid()') },
      entity_id:       { type: 'UUID', allowNull: false, references: { model: 'dir_entities', key: 'id' }, onDelete: 'CASCADE' },
      user_id:         { type: 'UUID', allowNull: false },
      role:            { type: 'VARCHAR(20)', defaultValue: 'reviewer' }, // reviewer | approver
      added_at:        { type: 'TIMESTAMPTZ', defaultValue: this.db.sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('dir_board_members', ['entity_id', 'user_id'], { unique: true });

    // Step 39 — pending edits moderation queue for open/board mode
    await queryInterface.createTable('dir_pending_edits', {
      id:              { type: 'UUID', primaryKey: true, defaultValue: this.db.sequelize.literal('gen_random_uuid()') },
      entity_id:       { type: 'UUID', allowNull: false, references: { model: 'dir_entities', key: 'id' }, onDelete: 'CASCADE' },
      submitted_by:    { type: 'UUID', allowNull: false },
      edit_type:       { type: 'VARCHAR(30)', allowNull: false }, // fact_add | fact_edit | body_edit | source_add | translation
      proposed_data:   { type: 'JSONB', allowNull: false },       // full proposed snapshot
      status:          { type: 'VARCHAR(20)', defaultValue: 'pending' }, // pending | approved | rejected
      reviewed_by:     { type: 'UUID' },
      review_note:     { type: 'TEXT' },
      submitted_at:    { type: 'TIMESTAMPTZ', defaultValue: this.db.sequelize.literal('NOW()') },
      reviewed_at:     { type: 'TIMESTAMPTZ' },
    });
    await queryInterface.addIndex('dir_pending_edits', ['entity_id', 'status']);
    await queryInterface.addIndex('dir_pending_edits', ['submitted_by']);

    // Step 40 — WikiTrust reputation scores per editor
    await queryInterface.createTable('dir_reputation_scores', {
      id:              { type: 'UUID', primaryKey: true, defaultValue: this.db.sequelize.literal('gen_random_uuid()') },
      user_id:         { type: 'UUID', allowNull: false, unique: true },
      edit_count:      { type: 'INTEGER', defaultValue: 0 },
      approved_count:  { type: 'INTEGER', defaultValue: 0 },
      rejected_count:  { type: 'INTEGER', defaultValue: 0 },
      rollback_count:  { type: 'INTEGER', defaultValue: 0 },   // times their edits were rolled back
      reputation:      { type: 'DECIMAL(5,2)', defaultValue: 50.00 }, // 0–100 score
      last_computed:   { type: 'TIMESTAMPTZ', defaultValue: this.db.sequelize.literal('NOW()') },
    });
  }

  async down() {
    const qi = this.db.sequelize.getQueryInterface();
    await qi.dropTable('dir_reputation_scores');
    await qi.dropTable('dir_pending_edits');
    await qi.dropTable('dir_board_members');
    await qi.dropTable('dir_governance_modes');
  }
}
