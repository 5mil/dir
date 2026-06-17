/**
 * searchEntities — Steps 19–24
 *
 * GET /api/dir_entities:search
 * Query params:
 *   q          string   — search query (required)
 *   facet[]    string[] — facet dimensions e.g. facet[]=topic&facet[]=era
 *   topic      string   — filter by tag slug
 *   era        string   — filter by era tag
 *   region     string   — filter by region tag
 *   entity_type string  — filter by entity type
 *   status     string   — default: 'published'
 *   page       number   — default: 1
 *   limit      number   — default: 20, max: 100
 *
 * Returns:
 *   { results[], facets{}, total, page, totalPages, did_you_mean? }
 *
 * Search strategy:
 *   1. Full-text search via tsvector (GIN index, ranked by ts_rank)
 *   2. Facet counts computed via sub-queries per active dimension
 *   3. did_you_mean via pg_trgm similarity when results < 3
 */
import { Context, Next } from '@nocobase/server';

export async function searchEntities(ctx: Context, next: Next) {
  const {
    q = '',
    entity_type,
    status = 'published',
    page = '1',
    limit = '20',
  } = ctx.query as Record<string, string>;

  const db = ctx.db;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  // --- Full-text search query ---
  const whereClause: string[] = [`e.status = :status`];
  const replacements: Record<string, unknown> = { status, offset, limit: limitNum };

  let orderBy = 'e.credibility_score DESC';

  if (q.trim()) {
    whereClause.push(`e.search_vector @@ plainto_tsquery('english', :q)`);
    replacements.q = q.trim();
    orderBy = `ts_rank(e.search_vector, plainto_tsquery('english', :q)) DESC, e.credibility_score DESC`;
  }

  if (entity_type) {
    whereClause.push(`e.entity_type = :entity_type`);
    replacements.entity_type = entity_type;
  }

  const where = whereClause.join(' AND ');

  // --- Main results query ---
  const [results]: any = await db.sequelize.query(
    `SELECT
       e.id, e.slug, e.title, e.entity_type, e.summary,
       e.credibility_score, e.status,
       COUNT(f.id)::int AS fact_count,
       COUNT(c.id)::int AS citation_count
     FROM dir_entities e
     LEFT JOIN dir_facts f ON f.entity_id = e.id
     LEFT JOIN dir_citations c ON c.entity_id = e.id
     WHERE ${where}
     GROUP BY e.id
     ORDER BY ${orderBy}
     LIMIT :limit OFFSET :offset`,
    { replacements }
  );

  // --- Total count ---
  const [countRows]: any = await db.sequelize.query(
    `SELECT COUNT(*)::int AS total FROM dir_entities e WHERE ${where}`,
    { replacements }
  );
  const total = countRows[0]?.total ?? 0;

  // --- Facet counts (entity_type dimension always included) ---
  const [typeFacets]: any = await db.sequelize.query(
    `SELECT entity_type AS value, COUNT(*)::int AS count
     FROM dir_entities WHERE status = :status
     GROUP BY entity_type ORDER BY count DESC`,
    { replacements: { status } }
  );

  // --- did_you_mean (Step 59): trigger when few results and query given ---
  let did_you_mean: string | null = null;
  if (q.trim() && results.length < 3) {
    const [similar]: any = await db.sequelize.query(
      `SELECT title, similarity(title, :q) AS sim
       FROM dir_entities
       WHERE similarity(title, :q) > 0.2 AND status = :status
       ORDER BY sim DESC LIMIT 1`,
      { replacements: { q: q.trim(), status } }
    );
    did_you_mean = similar[0]?.title ?? null;
  }

  ctx.body = {
    results,
    facets: {
      entity_type: typeFacets,
    },
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    ...(did_you_mean ? { did_you_mean } : {}),
  };

  await next();
}
