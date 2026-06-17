/**
 * plugin-dir-governance — Entry Point
 * Phase 4 — Steps 36–43
 *
 * Registers:
 *  - Three-node ACL system (solo / board / open)
 *  - board_members collection
 *  - WikiTrust reputation scoring action
 *  - Moderation queue collection + actions
 *  - Edit diff view action
 *  - Rollback action
 */
import { Plugin } from '@nocobase/server';
import { setGovernanceMode } from './actions/setGovernanceMode';
import { approveEdit } from './actions/approveEdit';
import { rejectEdit } from './actions/rejectEdit';
import { computeReputation } from './actions/computeReputation';
import { getDiff } from './actions/getDiff';
import { rollbackEntity } from './actions/rollbackEntity';

export class DirGovernancePlugin extends Plugin {
  async load() {
    // Register custom actions on dir_entities
    this.app.resourceManager.registerActionHandler(
      'dir_entities:setGovernanceMode', setGovernanceMode
    );
    this.app.resourceManager.registerActionHandler(
      'dir_entities:approveEdit', approveEdit
    );
    this.app.resourceManager.registerActionHandler(
      'dir_entities:rejectEdit', rejectEdit
    );
    this.app.resourceManager.registerActionHandler(
      'dir_entities:computeReputation', computeReputation
    );
    this.app.resourceManager.registerActionHandler(
      'dir_entities:diff', getDiff
    );
    this.app.resourceManager.registerActionHandler(
      'dir_entities:rollback', rollbackEntity
    );
  }
}

export default DirGovernancePlugin;
