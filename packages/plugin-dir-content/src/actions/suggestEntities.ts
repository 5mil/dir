/**
 * suggestEntities — Step 21 / Step 51
 *
 * GET /api/dir_entities:suggest?q=eins
 *
 * Fast autocomplete using pg_trgm trigram similarity.
 * Returns up to 10 matching entity titles + slugs.
 * Used by the global search bar and entity link picker.
 *
 * Index: idx_entities_title_trgm (GIN, gin_trgm_ops)
 * Threshold: similarity > 0.15 (tuned for short prefix queries)
 */
import { Context, Next } from '@nocobase/server';

export async function suggestEntities(ctx: Context, next: Next) {
  const { q = '' } = ctx.query as Record<string, string>;
  const db = ctx.db;

  if (!q.trim() || q.trim().length < 2) {
    ctx.body = { suggestions: [] };
    await next();
    return;
  }

  const [rows]: any = await db.sequelize.query(
    `SELECT slug, title, entity_type,
            similarity(title, :q) AS score
     FROM dir_entities
     WHERE title % :q
       AND status = 'published'
     ORDER BY score DESC
     LIMIT 10`,
    { replacements: { q: q.trim() } }
  );

  ctx.body = { suggestions: rows };
  await next();
}
