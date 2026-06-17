/**
 * FactList — Step 28 (OOUX)
 *
 * Object-first list of facts for a dir entity.
 * Renders each fact as a labeled claim with source badge.
 * Cognitive load: groups facts by fact_type, collapses to top 3 by default.
 */
import React, { useState } from 'react';
import { List, Tag, Typography, Button, Tooltip } from 'antd';
import { CheckCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface Fact {
  id: string;
  fact_type: string;
  claim: string;
  is_verified: boolean;
  source_label?: string;
}

export interface FactListProps {
  facts: Fact[];
  defaultVisible?: number;
}

export const FactList: React.FC<FactListProps> = ({ facts, defaultVisible = 3 }) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? facts : facts.slice(0, defaultVisible);

  return (
    <div>
      <List
        size="small"
        dataSource={visible}
        renderItem={(fact) => (
          <List.Item
            key={fact.id}
            extra={
              fact.source_label
                ? <Tag color="geekblue">{fact.source_label}</Tag>
                : null
            }
          >
            <List.Item.Meta
              avatar={
                fact.is_verified
                  ? <Tooltip title="Verified"><CheckCircleOutlined style={{ color: 'green' }} /></Tooltip>
                  : <Tooltip title="Unverified"><QuestionCircleOutlined style={{ color: 'orange' }} /></Tooltip>
              }
              title={<Tag>{fact.fact_type}</Tag>}
              description={<Text>{fact.claim}</Text>}
            />
          </List.Item>
        )}
      />
      {facts.length > defaultVisible && (
        <Button type="link" size="small" onClick={() => setShowAll(!showAll)}>
          {showAll ? `Show less` : `Show all ${facts.length} facts`}
        </Button>
      )}
    </div>
  );
};

export default FactList;
