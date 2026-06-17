# Dir UI Design System

> `plugin-dir-ui` — Phase 3, Steps 26–35
> Branch: `ui-designer`

## Design Principles

All components are built on three frameworks applied simultaneously:

| Framework | Principle | Implementation |
|---|---|---|
| **OOUX** | Objects first, actions second | EntityCard, FactList, SourceInline are object-centric |
| **Gestalt** | Proximity + similarity = grouping | GestaltGroup auto-clusters by entity_type |
| **Cognitive Load** | Hide secondary info, show primary claim | EntityCard collapses details; FactList shows top 3 by default |

---

## Component Map

### Step 26 — Plugin Scaffold
- Entry: `src/index.ts` — registers all components into NocoBase page editor
- Package: `@dir/plugin-dir-ui`

### Step 27 — GestaltGroup
- **File:** `src/components/GestaltGroup.tsx`
- **What:** Auto-groups entities by `entity_type` (or any dimension) using proximity + similarity
- **Gestalt:** Larger groups rendered first (prominence = size); visual dividers create separation
- **Props:** `entities[]`, `groupBy`, `onEntityClick`

### Step 28 — OOUX Object Blocks
- **EntityCard** (`EntityCard.tsx`) — Primary object block. Title, type badge, credibility, summary
- **FactList** (`FactList.tsx`) — Fact object list. Groups by `fact_type`, shows source badge
- **SourceInline** (`SourceInline.tsx`) — Inline source pill. Credibility tier color-coded

### Step 29 — Cognitive Load Minimization
- EntityCard shows summary only (2 rows) by default; secondary info behind "Show more"
- FactList shows top 3 facts by default; remaining behind "Show all N facts"
- Credibility score rendered as color badge (green/orange/red), not raw number

### Step 30 — Information Scent
- BreadcrumbTrail shows full path from root → current entity
- FacetedNav chips show entity count per facet value (user predicts results before clicking)

### Step 31 — FacetedNav
- **File:** `src/components/FacetedNav.tsx`
- **What:** Sidebar filter chips grouped by dimension (topic, era, region, entity_type)
- **Props:** `facets[]`, `selected`, `onChange`
- **UX:** Chip shows count in grey — information scent at point of decision

### Step 32 — IndexTree
- **File:** `src/components/IndexTree.tsx`
- **What:** Parent→child tag hierarchy tree. Click node to filter entity list
- **Gestalt:** Tree lines + indentation signal hierarchy without labels

### Step 33 — SkeletonCard
- **File:** `src/components/SkeletonCard.tsx`
- **What:** Shimmer skeleton grid matching EntityCard layout exactly
- **Usage:** Wrap lazy-loaded lists in `<Suspense fallback={<SkeletonCard count={6} />}>`
- **CLS:** Same grid columns as EntityCard — zero layout shift on data arrival

### Step 34 — BreadcrumbTrail
- **File:** `src/components/BreadcrumbTrail.tsx`
- **What:** Sticky top-bar breadcrumb showing full hierarchy path
- **Sticky:** `position: sticky; top: 0; z-index: 100` — visible at all scroll depths

### Step 35 — PageLayout
- **File:** `src/components/PageLayout.tsx`
- **What:** Master layout composing all components into a single NocoBase page block
- **Structure:** Sticky breadcrumb header + collapsible sidebar (FacetedNav + IndexTree) + main content (GestaltGroup)
- **Responsive:** Sidebar collapses to width=0 on `lg` breakpoint

---

## Registering in NocoBase

All components are registered as named blocks in `src/index.ts`:

```ts
this.app.addComponents({
  DirEntityCard: EntityCard,
  DirFactList: FactList,
  DirSourceInline: SourceInline,
  DirGestaltGroup: GestaltGroup,
  DirSkeletonCard: SkeletonCard,
  DirFacetedNav: FacetedNav,
  DirBreadcrumbTrail: BreadcrumbTrail,
  DirIndexTree: IndexTree,
  DirPageLayout: PageLayout,
});
```

In the NocoBase page editor, drag `DirPageLayout` onto a page to get the full Dir UI experience.

---

*plugin-dir-ui v0.1.0 — Phase 3 complete (Steps 26–35)*
