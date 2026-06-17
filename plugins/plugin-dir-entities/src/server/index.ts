import { Plugin } from '@nocobase/server';
import { defineEntities } from './collections/entities';
import { defineFacts } from './collections/facts';
import { defineSources } from './collections/sources';
import { defineCitations } from './collections/citations';
import { defineRevisions } from './collections/revisions';
import { defineRelations } from './collections/relations';
import { defineTags } from './collections/tags';

export class DirEntitiesPlugin extends Plugin {
  async load() {
    this.db.collection(defineEntities());
    this.db.collection(defineFacts());
    this.db.collection(defineSources());
    this.db.collection(defineCitations());
    this.db.collection(defineRevisions());
    this.db.collection(defineRelations());
    this.db.collection(defineTags());

    await this.db.sync();
  }
}

export default DirEntitiesPlugin;
