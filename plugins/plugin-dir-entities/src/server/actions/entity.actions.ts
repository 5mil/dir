import { Context, Next } from '@nocobase/actions';

/**
 * Custom server actions for dir entity operations
 */

// Publish an entity (set status to 'published', validate facts have citations)
export async function publishEntity(ctx: Context, next: Next) {
  const { entityId } = ctx.action.params;
  const repo = ctx.db.getRepository('dir_entities');
  const factRepo = ctx.db.getRepository('dir_facts');

  const entity = await repo.findOne({ filter: { id: entityId } });
  if (!entity) {
    ctx.throw(404, 'Entity not found');
  }

  const facts = await factRepo.find({ filter: { entity_id: entityId } });
  const uncitedFacts = facts.filter((f: any) => !f.citations || f.citations.length === 0);

  if (uncitedFacts.length > 0) {
    ctx.body = {
      ok: false,
      error: `${uncitedFacts.length} fact(s) have no citations. All facts must be cited before publishing.`,
      uncited: uncitedFacts.map((f: any) => ({ id: f.id, claim: f.claim })),
    };
    return;
  }

  await repo.update({ filter: { id: entityId }, values: { status: 'published' } });
  ctx.body = { ok: true, message: 'Entity published.' };
  await next();
}

// Record a revision snapshot when an entity is updated
export async function recordRevision(ctx: Context, next: Next) {
  const { entityId, editSummary, governanceMode } = ctx.action.params;
  const repo = ctx.db.getRepository('dir_entities');
  const revRepo = ctx.db.getRepository('dir_revisions');

  const entity = await repo.findOne({ filter: { id: entityId } });
  if (!entity) ctx.throw(404, 'Entity not found');

  const lastRev = await revRepo.findOne({
    filter: { entity_id: entityId },
    sort: ['-revision_number'],
  });

  const nextRevNum = lastRev ? lastRev.revision_number + 1 : 1;

  await revRepo.create({
    values: {
      entity_id: entityId,
      revision_number: nextRevNum,
      snapshot: entity,
      edit_summary: editSummary || '',
      edit_type: 'update',
      governance_mode: governanceMode || 'solo',
      created_by: ctx.state.currentUser?.id,
    },
  });

  ctx.body = { ok: true, revision: nextRevNum };
  await next();
}

// Compute credibility score for an entity based on its source quality
export async function computeCredibility(ctx: Context, next: Next) {
  const { entityId } = ctx.action.params;
  const factRepo = ctx.db.getRepository('dir_facts');
  const citRepo = ctx.db.getRepository('dir_citations');
  const srcRepo = ctx.db.getRepository('dir_sources');
  const entityRepo = ctx.db.getRepository('dir_entities');

  const facts = await factRepo.find({ filter: { entity_id: entityId } });
  if (!facts.length) {
    ctx.body = { ok: true, score: 0 };
    return;
  }

  let totalScore = 0;
  let count = 0;

  for (const fact of facts) {
    const citations = await citRepo.find({ filter: { fact_id: fact.id } });
    for (const cit of citations) {
      const source = await srcRepo.findOne({ filter: { id: cit.source_id } });
      if (source) {
        totalScore += source.credibility_score * cit.relevance_score;
        count++;
      }
    }
  }

  const score = count > 0 ? parseFloat((totalScore / count).toFixed(4)) : 0;

  await entityRepo.update({ filter: { id: entityId }, values: { credibility_score: score } });
  ctx.body = { ok: true, score };
  await next();
}
