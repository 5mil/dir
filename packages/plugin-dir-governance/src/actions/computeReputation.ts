/**
 * computeReputation — Step 40 (WikiTrust Reputation Scoring)
 *
 * POST /api/dir_entities:computeReputation
 * Body: { userId: string }
 *
 * WikiTrust-inspired formula:
 *
 *   reputation = 50
 *     + (approved_count * 2)
 *     - (rejected_count * 2)
 *     - (rollback_count * 5)
 *     clamped to [0, 100]
 *
 * Score meaning:
 *   0–30   : Low trust — edits always go to moderation queue
 *   31–69  : Medium trust — standard flow
 *   70–100 : High trust — in open mode, edits may auto-publish
 */
import { Context, Next } from '@nocobase/server';

export async function computeReputation(ctx: Context, next: Next) {
  const { userId } = ctx.request.body as { userId: string };
  const db = ctx.db;

  const [rows]: any = await db.sequelize.query(
    `SELECT edit_count, approved_count, rejected_count, rollback_count
     FROM dir_reputation_scores WHERE user_id = :userId`,
    { replacements: { userId } }
  );

  if (!rows?.length) {
    ctx.body = { userId, reputation: 50, level: 'medium', message: 'No edit history — default score' };
    await next();
    return;
  }

  const { approved_count, rejected_count, rollback_count } = rows[0];
  const raw = 50 + (approved_count * 2) - (rejected_count * 2) - (rollback_count * 5);
  const reputation = Math.max(0, Math.min(100, raw));
  const level = reputation >= 70 ? 'high' : reputation >= 31 ? 'medium' : 'low';

  await db.sequelize.query(
    `UPDATE dir_reputation_scores SET reputation = :reputation, last_computed = NOW() WHERE user_id = :userId`,
    { replacements: { reputation, userId } }
  );

  ctx.body = { userId, reputation, level, approved_count, rejected_count, rollback_count };
  await next();
}
