import type { QueryOptions, Section } from '../types';
import { resolveOptions, buildRef } from '../utils/graphql';
import type { PagesResource } from './pages';

const DEFAULT_FIELDS = `id slug name`;

export class SectionsResource {
  constructor(private readonly pages: PagesResource) { }

  async *list<T = Section>(pageRef: string, options?: QueryOptions): AsyncIterable<T> {
    const { nodeFields } = resolveOptions(options, { fields: DEFAULT_FIELDS, operationName: 'ListSections' });
    const page = await this.pages.get<{ sections: { edges: Array<{ node: T }> } }>(pageRef, {
      operationName: 'ListSections',
      fields: `sections { edges { node { ${nodeFields} } } }`,
    });
    for (const edge of page.sections.edges) {
      yield edge.node;
    }
  }

  async get<T = Section>(pageRef: string, sectionRef: string, options?: QueryOptions): Promise<T> {
    const { nodeFields } = resolveOptions(options, { fields: DEFAULT_FIELDS, operationName: 'GetSection' });
    const sectionRefVar = buildRef(sectionRef, 'sct_');
    const page = await this.pages.get<{ section: T | null }>(pageRef, {
      operationName: 'GetSection',
      fields: `section(ref: $sectionRef) { ${nodeFields} }`,
      variables: { sectionRef: { type: 'SlugOrId!', value: sectionRefVar } },
    });

    if (!page.section) {
      throw new Error(`Section not found: ${pageRef}/${sectionRef}`);
    }

    return page.section;
  }
}
