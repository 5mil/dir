/**
 * rejectEdit — Step 38 / 39
 *
 * POST /api/dir_entities:rejectEdit
 * Body: { pendingEditId: string, note: string }
 *
 * On rejection:
 *  1. Mark pending edit as rejected with reviewer note
 *  2. Update reputation score for submitter (+1 rejected, -2 reputation)
 *  3. Notify submitter (hook for future notification system)
 */
import { Context, Next } from '@nocobase/server';

export async function rejectEdit(ctx: Context, next: Next) {
  const { pendingEditId, note } = ctx.request.body as { pendingEditId: string; note?: string };
  const reviewerId = ctx.state.currentUser?.id;
  const db = ctx.db;

  const pending = await db.getRepository('dir_pending_edits').findOne({
    filter: { id: pendingEditId, status: 'pending' },
  });
  if (!pending) ctx.throw(404, 'Pending edit not found or already resolved');

  // Update reputation: +1 rejected, -2 score (floor 0)
  await db.sequelize.query(
    `INSERT INTO dir_reputation_scores (user_id, edit_count, rejected_count, reputation)
     VALUES (:userId, 1, 1, 48)
     ON CONFLICT (user_id) DO UPDATE
     SET edit_count = dir_reputation_scores.edit_count + 1,
         rejected_count = dir_reputation_scores.rejected_count + 1,
         reputation = GREATEST(0, dir_reputation_scores.reputation - 2),
         last_computed = NOW()`,
    { replacements: { userId: pending.submitted_by } }
  );

  // Mark resolved
  await db.getRepository('dir_pending_edits').update({
    filter: { id: pendingEditId },
    values: {
      status: 'rejected',
      reviewed_by: reviewerId,
      review_note: note ?? null,
      reviewed_at: new Date(),
    },
  });

  ctx.body = { ok: true, pendingEditId, status: 'rejected', note };
  await next();
}
