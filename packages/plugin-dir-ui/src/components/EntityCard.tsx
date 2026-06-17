/**
 * EntityCard — Step 28 (OOUX)
 *
 * Object-first card for a dir entity. Implements OOUX semantics:
 * the entity IS the object — title, type badge, credibility score,
 * summary (primary claim only), and action links are all first-class.
 *
 * Cognitive load minimization (Step 29):
 * - Only primary claim (summary) shown by default
 * - Secondary facts hidden behind "Show more" toggle
 * - Credibility score rendered as coloured badge, not raw number
 */
import React, { useState } from 'react';
import { Card, Tag, Badge, Button, Typography } from 'antd';
import { StarOutlined, FileTextOutlined } from '@ant-design/icons';

const { Text, Paragraph, Title } = Typography;

export interface EntityCardProps {
  id: string;
  slug: string;
  title: string;
  entity_type: string;
  summary: string;
  credibility_score: number; // 0–100
  fact_count: number;
  citation_count: number;
  status: 'draft' | 'published' | 'archived';
  onClick?: (slug: string) => void;
}

const credibilityColor = (score: number): string => {
  if (score >= 80) return 'green';
  if (score >= 50) return 'orange';
  return 'red';
};

export const EntityCard: React.FC<EntityCardProps> = ({
  slug, title, entity_type, summary, credibility_score,
  fact_count, citation_count, status, onClick
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      hoverable
      onClick={() => onClick?.(slug)}
      style={{ marginBottom: 16, borderRadius: 8 }}
      extra={
        <Badge
          color={credibilityColor(credibility_score)}
          text={`${credibility_score}%`}
          title="Credibility score"
        />
      }
      title={
        <>
          <Tag color="blue" style={{ marginRight: 8 }}>{entity_type}</Tag>
          <Title level={5} style={{ display: 'inline', margin: 0 }}>{title}</Title>
        </>
      }
    >
      {/* Primary claim — always visible (cognitive load min.) */}
      <Paragraph
        ellipsis={!expanded ? { rows: 2 } : false}
        style={{ marginBottom: 8 }}
      >
        {summary}
      </Paragraph>

      {/* Secondary info — hidden by default */}
      {expanded && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
          <Text type="secondary"><FileTextOutlined /> {fact_count} facts</Text>
          <Text type="secondary"><StarOutlined /> {citation_count} citations</Text>
          <Tag color={status === 'published' ? 'green' : 'default'}>{status}</Tag>
        </div>
      )}

      <Button
        type="link"
        size="small"
        style={{ padding: 0 }}
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
      >
        {expanded ? 'Show less' : 'Show more'}
      </Button>
    </Card>
  );
};

export default EntityCard;
