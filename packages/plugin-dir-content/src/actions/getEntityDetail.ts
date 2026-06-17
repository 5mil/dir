/**
 * getEntityDetail — Step 25
 *
 * GET /api/dir_entities:detail?slug=albert-einstein
 *
 * Returns the full entity detail payload used to render
 * the entity detail page template (EntityDetailPage component).
 *
 * Joins:
 *  - dir_facts (grouped by fact_type)
 *  - dir_sources + dir_citations
 *  - dir_relations (with related entity titles)
 *  - dir_entity_tags (with tag labels)
 *  - dir_articles (article body if exists)
 *  - dir_authors (via dir_article_authors)
 *  - governance mode
 *  - latest revision metadata
 */
import { Context, Next } from '@nocobase/server';

export async function getEntityDetail(ctx: Context, next: Next) {
  const { slug } = ctx.query as Record<string, string>;
  const db = ctx.db;

  if (!slug) ctx.throw(400, 'slug is required');

  // Core entity
  const entity = await db.getRepository('dir_entities').findOne({
    filter: { slug, status: 'published' },
  });
  if (!entity) ctx.throw(404, `Entity "${slug}" not found`);

  const entityId = entity.id;

  // Facts grouped by fact_type
  const [facts]: any = await db.sequelize.query(
    `SELECT f.id, f.fact_type, f.claim, f.is_verified,
            s.title AS source_title, s.credibility_tier
     FROM dir_facts f
     LEFT JOIN dir_citations ci ON ci.fact_id = f.id
     LEFT JOIN dir_sources s ON s.id = ci.source_id
     WHERE f.entity_id = :entityId
     ORDER BY f.fact_type, f.is_verified DESC`,
    { replacements: { entityId } }
  );

  // Sources
  const [sources]: any = await db.sequelize.query(
    `SELECT DISTINCT s.id, s.title, s.url, s.source_type,
            s.credibility_tier, s.publication_year
     FROM dir_sources s
     JOIN dir_citations ci ON ci.source_id = s.id
     WHERE ci.entity_id = :entityId
     ORDER BY s.credibility_tier, s.publication_year DESC`,
    { replacements: { entityId } }
  );

  // Relations
  const [relations]: any = await db.sequelize.query(
    `SELECT r.id, r.relation_type, r.direction, r.weight,
            e2.slug AS related_slug, e2.title AS related_title,
            e2.entity_type AS related_type
     FROM dir_relations r
     JOIN dir_entities e2 ON e2.id = r.related_entity_id
     WHERE r.entity_id = :entityId
     ORDER BY r.weight DESC`,
    { replacements: { entityId } }
  );

  // Tags
  const [tags]: any = await db.sequelize.query(
    `SELECT t.slug, t.label, t.tag_type
     FROM dir_tags t
     JOIN dir_entity_tags et ON et.tag_id = t.id
     WHERE et.entity_id = :entityId
     ORDER BY t.tag_type, t.label`,
    { replacements: { entityId } }
  );

  // Article body + authors
  const [articleRows]: any = await db.sequelize.query(
    `SELECT a.body, a.article_type, a.word_count, a.reading_time,
            a.featured_image_url, a.published_at,
            json_agg(json_build_object(
              'display_name', au.display_name,
              'avatar_url', au.avatar_url,
              'is_verified', au.is_verified
            )) FILTER (WHERE au.id IS NOT NULL) AS authors
     FROM dir_articles a
     LEFT JOIN dir_article_authors aa ON aa.article_id = a.id
     LEFT JOIN dir_authors au ON au.id = aa.author_id
     WHERE a.entity_id = :entityId
     GROUP BY a.id`,
    { replacements: { entityId } }
  );
  const article = articleRows[0] ?? null;

  // Governance mode
  const [govRows]: any = await db.sequelize.query(
    `SELECT mode FROM dir_governance_modes WHERE entity_id = :entityId`,
    { replacements: { entityId } }
  );
  const governance_mode = govRows[0]?.mode ?? 'solo';

  // Latest revision metadata
  const [revRows]: any = await db.sequelize.query(
    `SELECT revision_number, created_at, created_by
     FROM dir_revisions
     WHERE entity_id = :entityId
     ORDER BY revision_number DESC LIMIT 1`,
    { replacements: { entityId } }
  );
  const latest_revision = revRows[0] ?? null;

  ctx.body = {
    entity,
    article,
    facts,
    sources,
    relations,
    tags,
    governance_mode,
    latest_revision,
  };

  await next();
}
