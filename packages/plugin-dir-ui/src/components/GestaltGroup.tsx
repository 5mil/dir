/**
 * GestaltGroup — Step 27 (Gestalt Grouping)
 *
 * Auto-groups a list of entities by a shared dimension (entity_type,
 * tag, era, region) using Gestalt proximity + similarity principles.
 *
 * Each group is rendered in a visually separated panel with a group
 * label. Groups are sorted by size (largest first) to surface the
 * most prominent clusters to the reader.
 *
 * Usage:
 *   <GestaltGroup entities={entities} groupBy="entity_type" />
 */
import React from 'react';
import { Divider, Typography, Row, Col } from 'antd';
import { EntityCard, EntityCardProps } from './EntityCard';

const { Title } = Typography;

export interface GestaltGroupProps {
  entities: EntityCardProps[];
  groupBy: keyof Pick<EntityCardProps, 'entity_type'>;
  onEntityClick?: (slug: string) => void;
}

const groupEntities = (
  entities: EntityCardProps[],
  groupBy: keyof EntityCardProps
): Map<string, EntityCardProps[]> => {
  const map = new Map<string, EntityCardProps[]>();
  for (const entity of entities) {
    const key = String(entity[groupBy] ?? 'Other');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entity);
  }
  // Sort groups by size descending (Gestalt: larger groups = higher prominence)
  return new Map([...map.entries()].sort((a, b) => b[1].length - a[1].length));
};

export const GestaltGroup: React.FC<GestaltGroupProps> = ({
  entities, groupBy, onEntityClick
}) => {
  const groups = groupEntities(entities, groupBy);

  return (
    <div>
      {[...groups.entries()].map(([groupLabel, groupEntities]) => (
        <div key={groupLabel} style={{ marginBottom: 32 }}>
          <Divider orientation="left">
            <Title level={5} style={{ margin: 0 }}>
              {groupLabel}
              <span style={{ fontWeight: 400, fontSize: 13, marginLeft: 8, color: '#888' }}>
                ({groupEntities.length})
              </span>
            </Title>
          </Divider>
          <Row gutter={[16, 16]}>
            {groupEntities.map((entity) => (
              <Col xs={24} sm={12} lg={8} key={entity.id}>
                <EntityCard {...entity} onClick={onEntityClick} />
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </div>
  );
};

export default GestaltGroup;
