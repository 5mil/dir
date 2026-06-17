/**
 * BreadcrumbTrail — Steps 30 & 34 (Information Scent + Persistent Location)
 *
 * Sticky header breadcrumb trail that shows the user exactly where they
 * are in the dir knowledge hierarchy at all times.
 *
 * Information scent (Step 30): each crumb is a navigable link with
 * meaningful label — user always knows the path to root.
 *
 * Persistent location mapping (Step 34): rendered in a sticky
 * top bar so location context never disappears on scroll.
 *
 * Usage:
 *   <BreadcrumbTrail crumbs={[
 *     { label: 'Home', href: '/' },
 *     { label: 'People', href: '/people' },
 *     { label: 'Albert Einstein' }
 *   ]} />
 */
import React from 'react';
import { Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

export interface Crumb {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbTrailProps {
  crumbs: Crumb[];
  sticky?: boolean;
}

export const BreadcrumbTrail: React.FC<BreadcrumbTrailProps> = ({ crumbs, sticky = true }) => (
  <div
    style={{
      position: sticky ? 'sticky' : 'relative',
      top: 0,
      zIndex: 100,
      background: '#fff',
      borderBottom: '1px solid #f0f0f0',
      padding: '10px 24px',
      boxShadow: sticky ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
    }}
  >
    <Breadcrumb>
      <Breadcrumb.Item href="/">
        <HomeOutlined />
      </Breadcrumb.Item>
      {crumbs.map((crumb, i) => (
        <Breadcrumb.Item key={i} href={crumb.href}>
          {crumb.icon && <span style={{ marginRight: 4 }}>{crumb.icon}</span>}
          {crumb.label}
        </Breadcrumb.Item>
      ))}
    </Breadcrumb>
  </div>
);

export default BreadcrumbTrail;
