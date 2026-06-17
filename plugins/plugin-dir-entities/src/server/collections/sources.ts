/**
 * dir — Source Collection
 * A citable reference: URL, DOI, ISBN, archival record, etc.
 * Sources are global (reusable across many facts/entities).
 */
export function defineSources() {
  return {
    name: 'dir_sources',
    title: 'Sources',
    fields: [
      {
        name: 'id',
        type: 'bigInt',
        autoIncrement: true,
        primaryKey: true,
      },
      {
        name: 'title',
        type: 'string',
        allowNull: false,
        comment: 'Human-readable title of the source',
      },
      {
        name: 'source_type',
        type: 'string',
        defaultValue: 'web',
        comment: 'web | journal | book | archive | government | dataset | news | other',
      },
      {
        name: 'url',
        type: 'string',
        comment: 'Primary URL if web-accessible',
      },
      {
        name: 'doi',
        type: 'string',
        comment: 'Digital Object Identifier for academic sources',
      },
      {
        name: 'isbn',
        type: 'string',
        comment: 'ISBN for book sources',
      },
      {
        name: 'author',
        type: 'string',
        comment: 'Author(s) name(s)',
      },
      {
        name: 'publisher',
        type: 'string',
      },
      {
        name: 'publication_date',
        type: 'dateOnly',
      },
      {
        name: 'archived_url',
        type: 'string',
        comment: 'Wayback Machine or other archive URL for link-rot prevention',
      },
      {
        name: 'credibility_tier',
        type: 'string',
        defaultValue: 'unverified',
        comment: 'primary | peer-reviewed | established-news | web | unverified | disputed',
      },
      {
        name: 'credibility_score',
        type: 'float',
        defaultValue: 0.5,
        comment: 'Computed 0.0-1.0 score based on tier and community signals',
      },
      {
        name: 'language',
        type: 'string',
        defaultValue: 'en',
      },
      {
        name: 'created_by',
        type: 'integer',
      },
      {
        name: 'created_at',
        type: 'date',
      },
      {
        name: 'updated_at',
        type: 'date',
      },
      // Associations
      {
        name: 'citations',
        type: 'hasMany',
        target: 'dir_citations',
        foreignKey: 'source_id',
      },
    ],
  };
}
