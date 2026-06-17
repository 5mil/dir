/**
 * PageLayout — Step 35 (Master Page Layout)
 *
 * Wires all plugin-dir-ui components into a single composable
 * NocoBase page layout. Registered as DirPageLayout in the
 * NocoBase page editor.
 *
 * Layout:
 *   ┌────────────────────────────────────────┐
 *   │  BreadcrumbTrail (sticky)              │
 *   ├──────────────┬─────────────────────────┤
 *   │  FacetedNav  │  GestaltGroup           │
 *   │  IndexTree   │  (EntityCard grid)      │
 *   │  (sidebar)   │                         │
 *   └──────────────┴─────────────────────────┘
 *
 * Cognitive load principle: sidebar is collapsible on mobile,
 * hidden by default on small screens.
 */
import React, { Suspense } from 'react';
import { Layout, Row, Col } from 'antd';
import { BreadcrumbTrail, Crumb } from './BreadcrumbTrail';
import { FacetedNav, Facet } from './FacetedNav';
import { IndexTree, TagNode } from './IndexTree';
import { GestaltGroup } from './GestaltGroup';
import { SkeletonCard } from './SkeletonCard';
import { EntityCardProps } from './EntityCard';

const { Content, Sider } = Layout;

export interface PageLayoutProps {
  crumbs: Crumb[];
  facets: Facet[];
  tagTree: TagNode[];
  entities: EntityCardProps[];
  selectedFacets: Record<string, string[]>;
  onFacetChange: (selected: Record<string, string[]>) => void;
  onTagSelect: (tagKey: string) => void;
  onEntityClick: (slug: string) => void;
  loading?: boolean;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  crumbs, facets, tagTree, entities,
  selectedFacets, onFacetChange, onTagSelect,
  onEntityClick, loading = false
}) => (
  <Layout style={{ minHeight: '100vh', background: '#fafafa' }}>
    <BreadcrumbTrail crumbs={crumbs} sticky />
    <Layout style={{ background: '#fafafa' }}>
      <Sider
        width={260}
        breakpoint="lg"
        collapsedWidth={0}
        style={{ background: '#fff', borderRight: '1px solid #f0f0f0', padding: 16 }}
      >
        <FacetedNav facets={facets} selected={selectedFacets} onChange={onFacetChange} />
        <IndexTree nodes={tagTree} onSelect={onTagSelect} />
      </Sider>
      <Content style={{ padding: 24 }}>
        <Suspense fallback={<SkeletonCard count={6} />}>
          {loading
            ? <SkeletonCard count={6} />
            : <GestaltGroup entities={entities} groupBy="entity_type" onEntityClick={onEntityClick} />
          }
        </Suspense>
      </Content>
    </Layout>
  </Layout>
);

export default PageLayout;
