/**
 * setGovernanceMode — Step 36 / 37 / 38 / 39
 *
 * POST /api/dir_entities:setGovernanceMode
 * Body: { entityId: string, mode: 'solo' | 'board' | 'open' }
 *
 * - solo:  only the entity owner can submit edits (default)
 * - board: board members must approve edits before publish
 * - open:  anyone can submit edits; flagged to moderation queue
 *
 * ACL guard: only entity owner or board approver may change mode.
 */
import { Context, Next } from '@nocobase/server';

export async function setGovernanceMode(ctx: Context, next: Next) {
  const { entityId, mode } = ctx.request.body as { entityId: string; mode: string };
  const userId = ctx.state.currentUser?.id;

  if (!['solo', 'board', 'open'].includes(mode)) {
    ctx.throw(400, `Invalid mode "${mode}". Must be solo | board | open.`);
  }

  const db = ctx.db;

  // Verify caller is entity owner
  const entity = await db.getRepository('dir_entities').findOne({ filter: { id: entityId } });
  if (!entity) ctx.throw(404, 'Entity not found');
  if (entity.created_by !== userId) ctx.throw(403, 'Only the entity owner can change governance mode');

  // Upsert governance mode record
  const existing = await db.getRepository('dir_governance_modes').findOne({ filter: { entity_id: entityId } });
  if (existing) {
    await db.getRepository('dir_governance_modes').update({
      filter: { entity_id: entityId },
      values: { mode, updated_at: new Date() },
    });
  } else {
    await db.getRepository('dir_governance_modes').create({
      values: { entity_id: entityId, mode, created_by: userId },
    });
  }

  ctx.body = { ok: true, entityId, mode };
  await next();
}
