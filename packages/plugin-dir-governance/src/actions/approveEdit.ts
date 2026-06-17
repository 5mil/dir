/**
 * approveEdit — Step 38 / 39
 *
 * POST /api/dir_entities:approveEdit
 * Body: { pendingEditId: string }
 *
 * Board mode: only board approvers may approve.
 * Open mode:  any registered moderator may approve.
 *
 * On approval:
 *  1. Apply proposed_data to the entity
 *  2. Create a dir_revision snapshot
 *  3. Update reputation score for submitter (+1 approved)
 *  4. Mark pending edit as approved
 */
import { Context, Next } from '@nocobase/server';

export async function approveEdit(ctx: Context, next: Next) {
  const { pendingEditId } = ctx.request.body as { pendingEditId: string };
  const reviewerId = ctx.state.currentUser?.id;
  const db = ctx.db;

  const pending = await db.getRepository('dir_pending_edits').findOne({
    filter: { id: pendingEditId, status: 'pending' },
  });
  if (!pending) ctx.throw(404, 'Pending edit not found or already resolved');

  // Verify board membership in board mode
  const govMode = await db.getRepository('dir_governance_modes').findOne({
    filter: { entity_id: pending.entity_id },
  });
  if (govMode?.mode === 'board') {
    const isMember = await db.getRepository('dir_board_members').findOne({
      filter: { entity_id: pending.entity_id, user_id: reviewerId, role: 'approver' },
    });
    if (!isMember) ctx.throw(403, 'Only board approvers can approve edits in board mode');
  }

  // Apply proposed_data to entity
  await db.getRepository('dir_entities').update({
    filter: { id: pending.entity_id },
    values: pending.proposed_data,
  });

  // Record revision snapshot
  await db.getRepository('dir_revisions').create({
    values: {
      entity_id: pending.entity_id,
      edit_type: pending.edit_type,
      snapshot: pending.proposed_data,
      created_by: pending.submitted_by,
    },
  });

  // Update reputation: +1 approved
  await db.sequelize.query(
    `INSERT INTO dir_reputation_scores (user_id, edit_count, approved_count, reputation)
     VALUES (:userId, 1, 1, 55)
     ON CONFLICT (user_id) DO UPDATE
     SET edit_count = dir_reputation_scores.edit_count + 1,
         approved_count = dir_reputation_scores.approved_count + 1,
         reputation = LEAST(100, dir_reputation_scores.reputation + 2),
         last_computed = NOW()`,
    { replacements: { userId: pending.submitted_by } }
  );

  // Mark resolved
  await db.getRepository('dir_pending_edits').update({
    filter: { id: pendingEditId },
    values: { status: 'approved', reviewed_by: reviewerId, reviewed_at: new Date() },
  });

  ctx.body = { ok: true, pendingEditId, status: 'approved' };
  await next();
}
