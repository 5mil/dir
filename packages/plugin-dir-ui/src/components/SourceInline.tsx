/**
 * SourceInline — Step 28 (OOUX)
 *
 * Inline source reference with credibility tier badge.
 * Used inside entity body text and fact list items.
 * Renders as a compact pill: [source title · tier badge]
 */
import React from 'react';
import { Tag, Tooltip, Typography } from 'antd';
import { LinkOutlined } from '@ant-design/icons';

const { Link } = Typography;

export type CredibilityTier = 'primary' | 'secondary' | 'tertiary' | 'contested';

const tierColor: Record<CredibilityTier, string> = {
  primary: 'green',
  secondary: 'blue',
  tertiary: 'orange',
  contested: 'red',
};

export interface SourceInlineProps {
  title: string;
  url?: string;
  credibility_tier: CredibilityTier;
  publication_year?: number;
}

export const SourceInline: React.FC<SourceInlineProps> = ({
  title, url, credibility_tier, publication_year
}) => (
  <Tooltip title={`Credibility: ${credibility_tier}${publication_year ? ` · ${publication_year}` : ''}`}>
    <Tag
      icon={<LinkOutlined />}
      color={tierColor[credibility_tier]}
      style={{ cursor: url ? 'pointer' : 'default' }}
      onClick={() => url && window.open(url, '_blank')}
    >
      {title}
    </Tag>
  </Tooltip>
);

export default SourceInline;
