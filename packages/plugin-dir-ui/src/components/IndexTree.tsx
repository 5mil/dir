/**
 * IndexTree — Step 32 (Index Hierarchy Navigation)
 *
 * Parent → child drill-down tree for navigating the dir tag
 * and category hierarchy. Clicking a node expands its children
 * and filters the main entity list by that tag.
 *
 * Gestalt principle (Step 27): indentation + connecting lines
 * communicate proximity and hierarchy without extra labels.
 *
 * Usage:
 *   <IndexTree nodes={tagTree} onSelect={handleTagSelect} />
 */
import React from 'react';
import { Tree, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { TagOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface TagNode {
  key: string;
  label: string;
  count: number;
  children?: TagNode[];
}

const toDataNode = (node: TagNode): DataNode => ({
  key: node.key,
  title: (
    <span>
      <Text>{node.label}</Text>
      <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>({node.count})</Text>
    </span>
  ),
  icon: <TagOutlined />,
  children: node.children?.map(toDataNode),
});

export interface IndexTreeProps {
  nodes: TagNode[];
  onSelect: (tagKey: string) => void;
}

export const IndexTree: React.FC<IndexTreeProps> = ({ nodes, onSelect }) => (
  <Tree
    showIcon
    showLine={{ showLeafIcon: false }}
    treeData={nodes.map(toDataNode)}
    onSelect={(keys) => keys.length > 0 && onSelect(String(keys[0]))}
    style={{ background: 'transparent' }}
  />
);

export default IndexTree;
