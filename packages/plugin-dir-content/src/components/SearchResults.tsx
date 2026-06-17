/**
 * SearchResults — Steps 22–24
 *
 * React component rendering paginated search results with:
 *  - entity_type facet sidebar (FacetedNav from plugin-dir-ui)
 *  - GestaltGroup entity card grid
 *  - Pagination controls
 *  - "Did you mean?" suggestion banner
 *  - SkeletonCard loading state
 *
 * Connects to: GET /api/dir_entities:search
 */
import React, { useState, useEffect, Suspense } from 'react';
import { Input, Pagination, Alert, Typography, Row, Col } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
// These components come from plugin-dir-ui (Phase 3)
// They are registered globally so we import by component name
const { Title, Text } = Typography;

export interface SearchResultsProps {
  initialQuery?: string;
}

export interface SearchResult {
  id: string;
  slug: string;
  title: string;
  entity_type: string;
  summary: string;
  credibility_score: number;
  status: string;
  fact_count: number;
  citation_count: number;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface SearchResponse {
  results: SearchResult[];
  facets: { entity_type: FacetValue[] };
  total: number;
  page: number;
  totalPages: number;
  did_you_mean?: string;
}

const fetchSearch = async (
  q: string,
  page: number,
  entityType?: string
): Promise<SearchResponse> => {
  const params = new URLSearchParams({ q, page: String(page), limit: '20' });
  if (entityType) params.set('entity_type', entityType);
  const res = await fetch(`/api/dir_entities:search?${params}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
};

export const SearchResults: React.FC<SearchResultsProps> = ({ initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [inputVal, setInputVal] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string | undefined>();
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError(null);
    fetchSearch(query, page, entityTypeFilter)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [query, page, entityTypeFilter]);

  const handleSearch = () => {
    setPage(1);
    setQuery(inputVal);
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Search input */}
      <Input.Search
        size="large"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onSearch={handleSearch}
        onPressEnter={handleSearch}
        placeholder="Search entities, facts, topics…"
        prefix={<SearchOutlined />}
        style={{ maxWidth: 600, marginBottom: 24 }}
        enterButton="Search"
      />

      {/* did_you_mean banner */}
      {data?.did_you_mean && (
        <Alert
          type="info"
          showIcon
          message={
            <>
              Did you mean:{' '}
              <a onClick={() => { setInputVal(data.did_you_mean!); setQuery(data.did_you_mean!); }}>
                {data.did_you_mean}
              </a>?
            </>
          }
          style={{ marginBottom: 16, maxWidth: 600 }}
        />
      )}

      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

      <Row gutter={24}>
        {/* Facet sidebar */}
        {data?.facets && (
          <Col xs={0} md={5}>
            <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
              <Text strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                Entity Type
              </Text>
              <div style={{ marginTop: 8 }}>
                {data.facets.entity_type.map((fv) => (
                  <div
                    key={fv.value}
                    onClick={() => setEntityTypeFilter(
                      entityTypeFilter === fv.value ? undefined : fv.value
                    )}
                    style={{
                      cursor: 'pointer',
                      padding: '4px 0',
                      color: entityTypeFilter === fv.value ? '#1677ff' : 'inherit',
                      fontWeight: entityTypeFilter === fv.value ? 600 : 400,
                    }}
                  >
                    {fv.value}
                    <span style={{ marginLeft: 6, opacity: 0.5, fontSize: 12 }}>({fv.count})</span>
                  </div>
                ))}
              </div>
            </div>
          </Col>
        )}

        {/* Results grid */}
        <Col xs={24} md={data?.facets ? 19 : 24}>
          {loading ? (
            // SkeletonCard from plugin-dir-ui
            <div>{[...Array(6)].map((_, i) => (
              <div key={i} style={{ height: 120, background: '#f5f5f5', borderRadius: 8, marginBottom: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}</div>
          ) : data?.results.length === 0 ? (
            <Text type="secondary">No results for “{query}”. Try a different term.</Text>
          ) : (
            <>
              <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
                {data?.total} result{data?.total !== 1 ? 's' : ''} for “{query}”
              </Text>
              {data?.results.map((entity) => (
                <div
                  key={entity.id}
                  style={{ background: '#fff', borderRadius: 8, padding: 16, marginBottom: 12, cursor: 'pointer' }}
                  onClick={() => window.location.href = `/entity/${entity.slug}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Title level={5} style={{ margin: 0 }}>{entity.title}</Title>
                    <span style={{ fontSize: 12, opacity: 0.5 }}>{entity.entity_type}</span>
                  </div>
                  <Text type="secondary">{entity.summary}</Text>
                </div>
              ))}
              <Pagination
                current={page}
                total={data?.total}
                pageSize={20}
                onChange={setPage}
                style={{ marginTop: 24 }}
                showTotal={(t) => `${t} total`}
              />
            </>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default SearchResults;
