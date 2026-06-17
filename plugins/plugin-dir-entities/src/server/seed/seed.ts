/**
 * dir — Seed Data
 * Bootstraps the database with example entities for development and testing.
 * Run: yarn nocobase db:seed
 */
export async function seed(db: any) {
  const entityRepo = db.getRepository('dir_entities');
  const factRepo = db.getRepository('dir_facts');
  const sourceRepo = db.getRepository('dir_sources');
  const citRepo = db.getRepository('dir_citations');
  const tagRepo = db.getRepository('dir_tags');

  // Seed tags
  const tagScience = await tagRepo.create({ values: { name: 'Science', slug: 'science', facet: 'domain', color: '#4A90E2' } });
  const tagHistory = await tagRepo.create({ values: { name: 'History', slug: 'history', facet: 'domain', color: '#E2844A' } });
  const tagPerson = await tagRepo.create({ values: { name: 'Person', slug: 'person', facet: 'topic', color: '#7ED321' } });

  // Seed a source
  const source = await sourceRepo.create({
    values: {
      title: 'Encyclopaedia Britannica — Albert Einstein',
      source_type: 'web',
      url: 'https://www.britannica.com/biography/Albert-Einstein',
      credibility_tier: 'established-news',
      credibility_score: 0.9,
      language: 'en',
    },
  });

  // Seed an entity
  const entity = await entityRepo.create({
    values: {
      slug: 'albert-einstein',
      title: 'Albert Einstein',
      summary: 'German-born theoretical physicist who developed the theory of relativity.',
      entity_type: 'person',
      status: 'published',
      credibility_score: 0.9,
    },
  });

  // Seed facts
  const fact1 = await factRepo.create({
    values: {
      entity_id: entity.id,
      claim: 'Albert Einstein was born on March 14, 1879, in Ulm, Germany.',
      fact_type: 'date',
      confidence: 1.0,
      status: 'active',
    },
  });

  const fact2 = await factRepo.create({
    values: {
      entity_id: entity.id,
      claim: 'Einstein developed the special theory of relativity in 1905.',
      fact_type: 'statement',
      confidence: 1.0,
      status: 'active',
    },
  });

  // Seed citations
  await citRepo.create({ values: { fact_id: fact1.id, source_id: source.id, relevance_score: 1.0 } });
  await citRepo.create({ values: { fact_id: fact2.id, source_id: source.id, relevance_score: 1.0 } });

  console.log('dir seed complete: entities, facts, sources, citations, tags loaded.');
}
