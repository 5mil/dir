/**
 * Migration: core content schema
 * Steps 16–18 — Articles, Authors, many-to-many relationship
 *
 * Creates:
 *  - dir_articles     : simplified article entity type (Step 16)
 *  - dir_authors      : people managing entities (Step 17)
 *  - dir_article_authors : many-to-many join table (Step 18)
 *  - Full-text search indexes on dir_entities (Steps 19-21)
 */
import { Migration } from '@nocobase/server';

export default class ContentSchemaMigration extends Migration {
  async up() {
    const qi = this.db.sequelize.getQueryInterface();
    const s = this.db.sequelize;

    // Step 16 — Articles (simplified entity type)
    await qi.createTable('dir_articles', {
      id:            { type: 'UUID', primaryKey: true, defaultValue: s.literal('gen_random_uuid()') },
      entity_id:     { type: 'UUID', allowNull: false, references: { model: 'dir_entities', key: 'id' }, onDelete: 'CASCADE' },
      article_type:  { type: 'VARCHAR(30)', defaultValue: 'general' }, // general | biography | event | concept | place
      body:          { type: 'TEXT' },                  // full article body (Markdown / TipTap JSON)
      word_count:    { type: 'INTEGER', defaultValue: 0 },
      reading_time:  { type: 'INTEGER', defaultValue: 0 }, // minutes
      featured_image_url: { type: 'TEXT' },
      status:        { type: 'VARCHAR(20)', defaultValue: 'draft' }, // draft | review | published
      published_at:  { type: 'TIMESTAMPTZ' },
      created_by:    { type: 'UUID' },
      updated_by:    { type: 'UUID' },
      created_at:    { type: 'TIMESTAMPTZ', defaultValue: s.literal('NOW()') },
      updated_at:    { type: 'TIMESTAMPTZ', defaultValue: s.literal('NOW()') },
    });
    await qi.addIndex('dir_articles', ['entity_id'], { unique: true });
    await qi.addIndex('dir_articles', ['status', 'published_at']);
    await qi.addIndex('dir_articles', ['article_type']);

    // Step 17 — Authors
    await qi.createTable('dir_authors', {
      id:            { type: 'UUID', primaryKey: true, defaultValue: s.literal('gen_random_uuid()') },
      user_id:       { type: 'UUID', unique: true },    // linked to NocoBase user
      display_name:  { type: 'VARCHAR(120)', allowNull: false },
      bio:           { type: 'TEXT' },
      avatar_url:    { type: 'TEXT' },
      expertise_tags: { type: 'JSONB', defaultValue: '[]' }, // array of tag slugs
      article_count: { type: 'INTEGER', defaultValue: 0 },
      reputation:    { type: 'DECIMAL(5,2)', defaultValue: 50.00 }, // mirrors dir_reputation_scores
      is_verified:   { type: 'BOOLEAN', defaultValue: false },
      created_at:    { type: 'TIMESTAMPTZ', defaultValue: s.literal('NOW()') },
    });
    await qi.addIndex('dir_authors', ['display_name']);
    await qi.addIndex('dir_authors', ['is_verified']);

    // Step 18 — Articles ↔ Authors many-to-many
    await qi.createTable('dir_article_authors', {
      id:         { type: 'UUID', primaryKey: true, defaultValue: s.literal('gen_random_uuid()') },
      article_id: { type: 'UUID', allowNull: false, references: { model: 'dir_articles', key: 'id' }, onDelete: 'CASCADE' },
      author_id:  { type: 'UUID', allowNull: false, references: { model: 'dir_authors', key: 'id' }, onDelete: 'CASCADE' },
      role:       { type: 'VARCHAR(20)', defaultValue: 'author' }, // author | contributor | reviewer
      added_at:   { type: 'TIMESTAMPTZ', defaultValue: s.literal('NOW()') },
    });
    await qi.addIndex('dir_article_authors', ['article_id', 'author_id'], { unique: true });

    // Steps 19-21 — Full-text search indexes on dir_entities
    // Enable pg_trgm for fuzzy matching (Step 51 dependency too)
    await this.db.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

    // Full-text search vector index (GIN) on title + summary
    await this.db.sequelize.query(`
      ALTER TABLE dir_entities
      ADD COLUMN IF NOT EXISTS search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(slug, '')), 'C')
      ) STORED
    `);
    await this.db.sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_entities_search_vector ON dir_entities USING GIN(search_vector)`
    );

    // Trigram index for fuzzy/autocomplete (Step 51)
    await this.db.sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_entities_title_trgm ON dir_entities USING GIN(title gin_trgm_ops)`
    );
  }

  async down() {
    const qi = this.db.sequelize.getQueryInterface();
    await qi.dropTable('dir_article_authors');
    await qi.dropTable('dir_authors');
    await qi.dropTable('dir_articles');
    await this.db.sequelize.query('ALTER TABLE dir_entities DROP COLUMN IF EXISTS search_vector');
    await this.db.sequelize.query('DROP INDEX IF EXISTS idx_entities_search_vector');
    await this.db.sequelize.query('DROP INDEX IF EXISTS idx_entities_title_trgm');
  }
}
