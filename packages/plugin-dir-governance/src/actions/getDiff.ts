/**
 * getDiff — Step 42 (Edit Diff View)
 *
 * GET /api/dir_entities/:id/diff?from=3&to=7
 *
 * Returns a structured diff between two revision snapshots.
 * Each field change is returned as { field, before, after, changed: bool }.
 *
 * Consumers render this as a side-by-side colored diff view in the UI.
 * Fields with no change are included with changed: false for context.
 */
import { Context, Next } from '@nocobase/server';

type SnapshotDiff = {
  field: string;
  before: unknown;
  after: unknown;
  changed: boolean;
};

function diffSnapshots(before: Record<string, unknown>, after: Record<string, unknown>): SnapshotDiff[] {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const result: SnapshotDiff[] = [];
  for (const key of allKeys) {
    const b = before[key];
    const a = after[key];
    result.push({
      field: key,
      before: b ?? null,
      after: a ?? null,
      changed: JSON.stringify(b) !== JSON.stringify(a),
    });
  }
  return result.sort((a, b) => (b.changed ? 1 : 0) - (a.changed ? 1 : 0)); // changed fields first
}

export async function getDiff(ctx: Context, next: Next) {
  const entityId = ctx.params?.resourceIndex;
  const from = parseInt(ctx.query?.from as string);
  const to = parseInt(ctx.query?.to as string);
  const db = ctx.db;

  if (!from || !to || from >= to) ctx.throw(400, 'Provide valid from and to revision numbers (from < to)');

  const revisions = await db.getRepository('dir_revisions').find({
    filter: { entity_id: entityId },
    sort: ['revision_number'],
  });

  const fromRev = revisions.find((r: any) => r.revision_number === from);
  const toRev   = revisions.find((r: any) => r.revision_number === to);

  if (!fromRev || !toRev) ctx.throw(404, `Revision ${!fromRev ? from : to} not found for entity ${entityId}`);

  const diff = diffSnapshots(fromRev.snapshot, toRev.snapshot);

  ctx.body = {
    entityId,
    from: { revision_number: from, created_at: fromRev.created_at, created_by: fromRev.created_by },
    to:   { revision_number: to,   created_at: toRev.created_at,   created_by: toRev.created_by },
    diff,
    changed_fields: diff.filter((d) => d.changed).length,
  };
  await next();
}
