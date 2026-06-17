/**
 * rollbackEntity — Step 43
 *
 * POST /api/dir_entities:rollback
 * Body: { entityId: string, revisionNumber: number }
 *
 * Restores entity to a prior revision snapshot.
 * ACL guard: only entity owner or board approver may rollback.
 *
 * On rollback:
 *  1. Load target revision snapshot
 *  2. Overwrite entity fields with snapshot values
 *  3. Create new revision marking it as a rollback
 *  4. Penalise reputation of editor whose edit is being rolled back
 *     (rollback_count +1, -5 reputation)
 */
import { Context, Next } from '@nocobase/server';

export async function rollbackEntity(ctx: Context, next: Next) {
  const { entityId, revisionNumber } = ctx.request.body as {
    entityId: string;
    revisionNumber: number;
  };
  const callerId = ctx.state.currentUser?.id;
  const db = ctx.db;

  // ACL: caller must be entity owner or board approver
  const entity = await db.getRepository('dir_entities').findOne({ filter: { id: entityId } });
  if (!entity) ctx.throw(404, 'Entity not found');

  const isOwner = entity.created_by === callerId;
  if (!isOwner) {
    const isBoardApprover = await db.getRepository('dir_board_members').findOne({
      filter: { entity_id: entityId, user_id: callerId, role: 'approver' },
    });
    if (!isBoardApprover) ctx.throw(403, 'Only entity owner or board approver can rollback');
  }

  // Load target revision
  const targetRevision = await db.getRepository('dir_revisions').findOne({
    filter: { entity_id: entityId, revision_number: revisionNumber },
  });
  if (!targetRevision) ctx.throw(404, `Revision ${revisionNumber} not found`);

  // Load current revision to find whose edit we are rolling back
  const currentRevisions = await db.getRepository('dir_revisions').find({
    filter: { entity_id: entityId },
    sort: ['-revision_number'],
    limit: 1,
  });
  const lastEditor = currentRevisions[0]?.created_by;

  // Apply rollback
  await db.getRepository('dir_entities').update({
    filter: { id: entityId },
    values: targetRevision.snapshot,
  });

  // Record rollback as new revision
  await db.getRepository('dir_revisions').create({
    values: {
      entity_id: entityId,
      edit_type: 'rollback',
      snapshot: targetRevision.snapshot,
      created_by: callerId,
      note: `Rolled back to revision ${revisionNumber}`,
    },
  });

  // Penalise last editor's reputation if different from caller
  if (lastEditor && lastEditor !== callerId) {
    await db.sequelize.query(
      `INSERT INTO dir_reputation_scores (user_id, rollback_count, reputation)
       VALUES (:userId, 1, 45)
       ON CONFLICT (user_id) DO UPDATE
       SET rollback_count = dir_reputation_scores.rollback_count + 1,
           reputation = GREATEST(0, dir_reputation_scores.reputation - 5),
           last_computed = NOW()`,
      { replacements: { userId: lastEditor } }
    );
  }

  ctx.body = { ok: true, entityId, rolledBackTo: revisionNumber };
  await next();
}
