/**
 * plugin-dir-ui — Dir UI Plugin Entry Point
 * Phase 3 — Steps 26–35
 *
 * Registers all OOUX components, Gestalt grouping, cognitive-load
 * minimization blocks, faceted navigation, index hierarchy, skeleton
 * loading, and breadcrumb trail into the NocoBase page editor.
 */
import { Plugin } from '@nocobase/client';
import { EntityCard } from './components/EntityCard';
import { FactList } from './components/FactList';
import { SourceInline } from './components/SourceInline';
import { GestaltGroup } from './components/GestaltGroup';
import { SkeletonCard } from './components/SkeletonCard';
import { FacetedNav } from './components/FacetedNav';
import { BreadcrumbTrail } from './components/BreadcrumbTrail';
import { IndexTree } from './components/IndexTree';
import { PageLayout } from './components/PageLayout';

export class DirUIPlugin extends Plugin {
  async load() {
    // Register OOUX object blocks
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
  }
}

export default DirUIPlugin;
