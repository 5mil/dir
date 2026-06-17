/**
 * EntityDetailPage — Step 25
 *
 * Full entity detail page template.
 * Assembles all Dir UI components into a single entity view.
 *
 * Sections (in order):
 *  1. BreadcrumbTrail (sticky)
 *  2. Entity header: title, type badge, credibility score, governance mode
 *  3. Article body (if exists): reading time, featured image, body text
 *  4. Authors strip: avatar + display name
 *  5. FactList: grouped by fact_type, verified badge
 *  6. Sources: SourceInline pills grouped by credibility_tier
 *  7. Relations: related entity cards (mini EntityCard)
 *  8. Tags: tag chips linking to faceted search
 *  9. Revision footer: last edited timestamp + revision number
 *
 * Data fetched from: GET /api/dir_entities:detail?slug=...
 */
import React, { useEffect, useState } from 'react';
import {
  Layout, Typography, Tag, Badge, Avatar, Divider,
  Spin, Alert, Space, Tooltip, Row, Col
} from 'antd';
import {
  ClockCircleOutlined, EditOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

interface EntityDetailPageProps {
  slug: string;
}

const credColor = (score: number) => score >= 80 ? 'green' : score >= 50 ? 'orange' : 'red';

const tierColors: Record<string, string> = {
  primary: 'green', secondary: 'blue', tertiary: 'orange', contested: 'red'
};

export const EntityDetailPage: React.FC<EntityDetailPageProps> = ({ slug }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/dir_entities:detail?slug=${slug}`)
      .then((r) => r.ok ? r.json() : Promise.reject('Not found'))
      .then(setData)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (error)   return <Alert type="error" message={error} style={{ margin: 24 }} />;
  if (!data)   return null;

  const { entity, article, facts, sources, relations, tags, governance_mode, latest_revision } = data;

  // Group facts by fact_type
  const factsByType = facts.reduce((acc: Record<string, any[]>, f: any) => {
    (acc[f.fact_type] = acc[f.fact_type] || []).push(f);
    return acc;
  }, {});

  // Group sources by credibility_tier
  const sourcesByTier = sources.reduce((acc: Record<string, any[]>, s: any) => {
    (acc[s.credibility_tier] = acc[s.credibility_tier] || []).push(s);
    return acc;
  }, {});

  return (
    <Layout style={{ background: '#fafafa', minHeight: '100vh' }}>
      {/* Sticky breadcrumb */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff',
        borderBottom: '1px solid #f0f0f0', padding: '10px 24px' }}>
        <Text type="secondary">
          <a href="/">Home</a> › <a href="/search">Entities</a> › {entity.entity_type} › {entity.title}
        </Text>
      </div>

      <Content style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <Space style={{ marginBottom: 8 }}>
            <Tag color="blue">{entity.entity_type}</Tag>
            <Badge color={credColor(entity.credibility_score)}
              text={`${entity.credibility_score}% credibility`} />
            <Tag color={governance_mode === 'open' ? 'green' : governance_mode === 'board' ? 'blue' : 'default'}>
              {governance_mode} governance
            </Tag>
          </Space>
          <Title level={1} style={{ marginBottom: 8 }}>{entity.title}</Title>
          <Paragraph style={{ fontSize: 16, color: '#555' }}>{entity.summary}</Paragraph>
        </div>

        {/* Article body */}
        {article && (
          <>
            <Divider />
            <div style={{ marginBottom: 24 }}>
              <Space style={{ marginBottom: 16 }}>
                <Text type="secondary"><ClockCircleOutlined /> {article.reading_time} min read</Text>
                <Text type="secondary">{article.word_count} words</Text>
              </Space>
              {article.featured_image_url && (
                <img src={article.featured_image_url} alt={entity.title}
                  style={{ width: '100%', borderRadius: 8, marginBottom: 16 }} />
              )}
              {/* Authors */}
              {article.authors?.length > 0 && (
                <Space style={{ marginBottom: 16 }}>
                  {article.authors.map((a: any, i: number) => (
                    <Space key={i}>
                      <Avatar src={a.avatar_url} size="small">{a.display_name[0]}</Avatar>
                      <Text>{a.display_name}</Text>
                      {a.is_verified && (
                        <Tooltip title="Verified author">
                          <SafetyCertificateOutlined style={{ color: 'green' }} />
                        </Tooltip>
                      )}
                    </Space>
                  ))}
                </Space>
              )}
              <Paragraph style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                {article.body}
              </Paragraph>
            </div>
          </>
        )}

        {/* Facts */}
        {facts.length > 0 && (
          <>
            <Divider />
            <Title level={4}>Facts</Title>
            {Object.entries(factsByType).map(([type, typeFacts]: any) => (
              <div key={type} style={{ marginBottom: 16 }}>
                <Text strong style={{ textTransform: 'capitalize' }}>{type.replace(/_/g, ' ')}</Text>
                {typeFacts.map((f: any) => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <Text>{f.claim}</Text>
                    {f.source_title && (
                      <Tag color={tierColors[f.credibility_tier] ?? 'default'} style={{ cursor: 'pointer' }}
                        onClick={() => f.url && window.open(f.url, '_blank')}>
                        {f.source_title}
                      </Tag>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {/* Sources */}
        {sources.length > 0 && (
          <>
            <Divider />
            <Title level={4}>Sources</Title>
            {Object.entries(sourcesByTier).map(([tier, tierSources]: any) => (
              <div key={tier} style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>{tier}</Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {tierSources.map((s: any) => (
                    <Tag key={s.id} color={tierColors[tier] ?? 'default'}
                      style={{ cursor: s.url ? 'pointer' : 'default' }}
                      onClick={() => s.url && window.open(s.url, '_blank')}>
                      {s.title}{s.publication_year ? ` (${s.publication_year})` : ''}
                    </Tag>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Relations */}
        {relations.length > 0 && (
          <>
            <Divider />
            <Title level={4}>Related Entities</Title>
            <Row gutter={[12, 12]}>
              {relations.map((r: any) => (
                <Col xs={24} sm={12} md={8} key={r.id}>
                  <div
                    style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 8,
                      padding: 12, cursor: 'pointer' }}
                    onClick={() => window.location.href = `/entity/${r.related_slug}`}
                  >
                    <Tag color="blue">{r.related_type}</Tag>
                    <Text strong style={{ display: 'block', marginTop: 4 }}>{r.related_title}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{r.relation_type} · {r.direction}</Text>
                  </div>
                </Col>
              ))}
            </Row>
          </>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <>
            <Divider />
            <Title level={4}>Topics</Title>
            <Space wrap>
              {tags.map((t: any) => (
                <Tag key={t.slug} style={{ cursor: 'pointer' }}
                  onClick={() => window.location.href = `/search?topic=${t.slug}`}>
                  {t.label}
                </Tag>
              ))}
            </Space>
          </>
        )}

        {/* Revision footer */}
        {latest_revision && (
          <div style={{ marginTop: 48, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <EditOutlined style={{ marginRight: 4 }} />
              Revision {latest_revision.revision_number} ·
              Last edited {new Date(latest_revision.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
              })}
            </Text>
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default EntityDetailPage;
