/**
 * plugin-dir-content — Entry Point
 * Phase 2 — Steps 16–25
 *
 * Registers:
 *  - Articles collection + Authors collection (Steps 16-18)
 *  - Faceted search API action (Steps 19-21)
 *  - Search results UI component (Steps 22-23)
 *  - Entity detail page template (Step 25)
 */
import { Plugin } from '@nocobase/server';
import { searchEntities } from './actions/searchEntities';
import { suggestEntities } from './actions/suggestEntities';
import { getEntityDetail } from './actions/getEntityDetail';

export class DirContentPlugin extends Plugin {
  async load() {
    // Register search actions
    this.app.resourceManager.registerActionHandler(
      'dir_entities:search', searchEntities
    );
    this.app.resourceManager.registerActionHandler(
      'dir_entities:suggest', suggestEntities
    );
    this.app.resourceManager.registerActionHandler(
      'dir_entities:detail', getEntityDetail
    );
  }
}

export default DirContentPlugin;
