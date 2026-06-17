/**
 * FacetedNav — Step 31 (Faceted Navigation)
 *
 * Sidebar navigation component that renders filter chips grouped
 * by facet dimension (topic, era, region, entity_type).
 *
 * Information scent principle (Step 30): each chip shows the count
 * of matching entities so the user can predict what they'll find.
 *
 * Usage:
 *   <FacetedNav facets={facets} selected={selected} onChange={setSelected} />
 */
import React from 'react';
import { Tag, Typography, Space, Divider } from 'antd';

const { Text } = Typography;

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export interface Facet {
  key: string;
  label: string;
  values: FacetValue[];
}

export interface FacetedNavProps {
  facets: Facet[];
  selected: Record<string, string[]>; // { topic: ['science'], era: ['modern'] }
  onChange: (selected: Record<string, string[]>) => void;
}

export const FacetedNav: React.FC<FacetedNavProps> = ({ facets, selected, onChange }) => {
  const toggle = (facetKey: string, value: string) => {
    const current = selected[facetKey] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...selected, [facetKey]: next });
  };

  return (
    <div style={{ padding: '0 8px' }}>
      {facets.map((facet) => (
        <div key={facet.key} style={{ marginBottom: 20 }}>
          <Divider orientation="left" plain>
            <Text strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              {facet.label}
            </Text>
          </Divider>
          <Space size={[6, 8]} wrap>
            {facet.values.map((fv) => {
              const isSelected = (selected[facet.key] ?? []).includes(fv.value);
              return (
                <Tag.CheckableTag
                  key={fv.value}
                  checked={isSelected}
                  onChange={() => toggle(facet.key, fv.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {fv.label}
                  <span style={{ marginLeft: 4, opacity: 0.6, fontSize: 11 }}>
                    ({fv.count})
                  </span>
                </Tag.CheckableTag>
              );
            })}
          </Space>
        </div>
      ))}
    </div>
  );
};

export default FacetedNav;
