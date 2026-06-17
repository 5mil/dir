/**
 * SkeletonCard — Step 33 (Skeleton Loading)
 *
 * Placeholder card rendered while entity data loads.
 * Uses React Suspense-compatible pattern — renders a shimmer
 * skeleton matching the exact layout of EntityCard to prevent
 * layout shift (CLS) on data arrival.
 *
 * Usage:
 *   <Suspense fallback={<SkeletonCard count={6} />}>
 *     <EntityList />
 *   </Suspense>
 */
import React from 'react';
import { Card, Skeleton, Row, Col } from 'antd';

export interface SkeletonCardProps {
  count?: number;
}

const SingleSkeleton: React.FC = () => (
  <Card style={{ marginBottom: 16, borderRadius: 8 }}>
    <Skeleton active avatar={false} paragraph={{ rows: 3 }} />
  </Card>
);

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ count = 3 }) => (
  <Row gutter={[16, 16]}>
    {Array.from({ length: count }).map((_, i) => (
      <Col xs={24} sm={12} lg={8} key={i}>
        <SingleSkeleton />
      </Col>
    ))}
  </Row>
);

export default SkeletonCard;
