import { Migration } from '@nocobase/server';

/**
 * Initial migration: creates all dir core tables
 * Run order: entities → facts → sources → citations → revisions → relations → tags → entity_tags
 */
export default class CreateDirTables extends Migration {
  async up() {
    const queryInterface = this.context.db.sequelize.getQueryInterface();

    // dir_entities
    await queryInterface.createTable('dir_entities', {
      id: { type: 'BIGSERIAL', primaryKey: true },
      slug: { type: 'VARCHAR(255)', unique: true },
      title: { type: 'VARCHAR(255)', allowNull: false },
      summary: { type: 'TEXT' },
      body: { type: 'TEXT' },
      entity_type: { type: 'VARCHAR(64)', defaultValue: 'concept' },
      status: { type: 'VARCHAR(32)', defaultValue: 'draft' },
      credibility_score: { type: 'FLOAT', defaultValue: 0.0 },
      view_count: { type: 'BIGINT', defaultValue: 0 },
      created_by: { type: 'INTEGER' },
      created_at: { type: 'TIMESTAMP WITH TIME ZONE' },
      updated_at: { type: 'TIMESTAMP WITH TIME ZONE' },
    });

    // dir_facts
    await queryInterface.createTable('dir_facts', {
      id: { type: 'BIGSERIAL', primaryKey: true },
      entity_id: { type: 'BIGINT', allowNull: false, references: { model: 'dir_entities', key: 'id' }, onDelete: 'CASCADE' },
      claim: { type: 'TEXT', allowNull: false },
      fact_type: { type: 'VARCHAR(64)', defaultValue: 'statement' },
      confidence: { type: 'FLOAT', defaultValue: 1.0 },
      status: { type: 'VARCHAR(32)', defaultValue: 'active' },
      display_order: { type: 'INTEGER', defaultValue: 0 },
      created_by: { type: 'INTEGER' },
      created_at: { type: 'TIMESTAMP WITH TIME ZONE' },
      updated_at: { type: 'TIMESTAMP WITH TIME ZONE' },
    });

    // dir_sources
    await queryInterface.createTable('dir_sources', {
      id: { type: 'BIGSERIAL', primaryKey: true },
      title: { type: 'VARCHAR(512)', allowNull: false },
      source_type: { type: 'VARCHAR(64)', defaultValue: 'web' },
      url: { type: 'TEXT' },
      doi: { type: 'VARCHAR(255)' },
      isbn: { type: 'VARCHAR(32)' },
      author: { type: 'VARCHAR(512)' },
      publisher: { type: 'VARCHAR(255)' },
      publication_date: { type: 'DATE' },
      archived_url: { type: 'TEXT' },
      credibility_tier: { type: 'VARCHAR(64)', defaultValue: 'unverified' },
      credibility_score: { type: 'FLOAT', defaultValue: 0.5 },
      language: { type: 'VARCHAR(8)', defaultValue: 'en' },
      created_by: { type: 'INTEGER' },
      created_at: { type: 'TIMESTAMP WITH TIME ZONE' },
      updated_at: { type: 'TIMESTAMP WITH TIME ZONE' },
    });

    // dir_citations
    await queryInterface.createTable('dir_citations', {
      id: { type: 'BIGSERIAL', primaryKey: true },
      fact_id: { type: 'BIGINT', allowNull: false, references: { model: 'dir_facts', key: 'id' }, onDelete: 'CASCADE' },
      source_id: { type: 'BIGINT', allowNull: false, references: { model: 'dir_sources', key: 'id' } },
      quote: { type: 'TEXT' },
      page_number: { type: 'VARCHAR(64)' },
      access_date: { type: 'DATE' },
      relevance_score: { type: 'FLOAT', defaultValue: 1.0 },
      created_by: { type: 'INTEGER' },
      created_at: { type: 'TIMESTAMP WITH TIME ZONE' },
    });

    // dir_revisions
    await queryInterface.createTable('dir_revisions', {
      id: { type: 'BIGSERIAL', primaryKey: true },
      entity_id: { type: 'BIGINT', allowNull: false, references: { model: 'dir_entities', key: 'id' }, onDelete: 'CASCADE' },
      revision_number: { type: 'INTEGER', allowNull: false },
      snapshot: { type: 'JSONB' },
      diff: { type: 'JSONB' },
      edit_summary: { type: 'VARCHAR(512)' },
      edit_type: { type: 'VARCHAR(32)', defaultValue: 'update' },
      governance_mode: { type: 'VARCHAR(16)' },
      approved_by: { type: 'INTEGER' },
      created_by: { type: 'INTEGER' },
      created_at: { type: 'TIMESTAMP WITH TIME ZONE' },
    });

    // dir_relations
    await queryInterface.createTable('dir_relations', {
      id: { type: 'BIGSERIAL', primaryKey: true },
      source_entity_id: { type: 'BIGINT', allowNull: false, references: { model: 'dir_entities', key: 'id' }, onDelete: 'CASCADE' },
      target_entity_id: { type: 'BIGINT', allowNull: false, references: { model: 'dir_entities', key: 'id' }, onDelete: 'CASCADE' },
      relation_type: { type: 'VARCHAR(64)', allowNull: false },
      label: { type: 'VARCHAR(255)' },
      weight: { type: 'FLOAT', defaultValue: 1.0 },
      bidirectional: { type: 'BOOLEAN', defaultValue: false },
      created_by: { type: 'INTEGER' },
      created_at: { type: 'TIMESTAMP WITH TIME ZONE' },
    });

    // dir_tags
    await queryInterface.createTable('dir_tags', {
      id: { type: 'SERIAL', primaryKey: true },
      name: { type: 'VARCHAR(128)', unique: true, allowNull: false },
      slug: { type: 'VARCHAR(128)', unique: true },
      facet: { type: 'VARCHAR(64)' },
      parent_tag_id: { type: 'INTEGER', references: { model: 'dir_tags', key: 'id' } },
      description: { type: 'TEXT' },
      color: { type: 'VARCHAR(16)' },
      entity_count: { type: 'INTEGER', defaultValue: 0 },
    });

    // dir_entity_tags (junction)
    await queryInterface.createTable('dir_entity_tags', {
      entity_id: { type: 'BIGINT', allowNull: false, references: { model: 'dir_entities', key: 'id' }, onDelete: 'CASCADE' },
      tag_id: { type: 'INTEGER', allowNull: false, references: { model: 'dir_tags', key: 'id' }, onDelete: 'CASCADE' },
    });

    // Indexes for performance
    await queryInterface.addIndex('dir_entities', ['slug']);
    await queryInterface.addIndex('dir_entities', ['status']);
    await queryInterface.addIndex('dir_entities', ['entity_type']);
    await queryInterface.addIndex('dir_facts', ['entity_id']);
    await queryInterface.addIndex('dir_citations', ['fact_id']);
    await queryInterface.addIndex('dir_citations', ['source_id']);
    await queryInterface.addIndex('dir_revisions', ['entity_id', 'revision_number']);
    await queryInterface.addIndex('dir_relations', ['source_entity_id']);
    await queryInterface.addIndex('dir_relations', ['target_entity_id']);
    await queryInterface.addIndex('dir_entity_tags', ['entity_id']);
    await queryInterface.addIndex('dir_entity_tags', ['tag_id']);
  }

  async down() {
    const qi = this.context.db.sequelize.getQueryInterface();
    await qi.dropTable('dir_entity_tags');
    await qi.dropTable('dir_tags');
    await qi.dropTable('dir_relations');
    await qi.dropTable('dir_revisions');
    await qi.dropTable('dir_citations');
    await qi.dropTable('dir_sources');
    await qi.dropTable('dir_facts');
    await qi.dropTable('dir_entities');
  }
}
