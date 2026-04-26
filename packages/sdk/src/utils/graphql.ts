type Field = {
  name: string;
  args?: string;
  children: Field[];
};

function parse(input: string): Field[] {
  const tokens = input.match(/[{}()]|[^\s{}()]+/g) ?? [];
  let i = 0;

  function parseArgs(): string {
    i++; // consume '('
    let depth = 1;
    const parts: string[] = [];
    while (i < tokens.length && depth > 0) {
      const tok = tokens[i++];
      if (tok === '(') depth++;
      else if (tok === ')') { depth--; if (depth === 0) break; }
      parts.push(tok);
    }
    return parts.join(' ');
  }

  function parseFields(): Field[] {
    const fields: Field[] = [];

    while (i < tokens.length && tokens[i] !== '}') {
      let name = tokens[i++];
      let args: string | undefined;
      let children: Field[] = [];

      // Inline fragment: ... on TypeName { fields }
      if (name === '...' && tokens[i] === 'on') {
        i++; // consume 'on'
        name = `... on ${tokens[i++]}`; // consume TypeName
      }

      // Field arguments
      if (tokens[i] === '(') {
        args = parseArgs();
      }

      if (tokens[i] === '{') {
        i++; // consume '{'
        children = parseFields();
        i++; // consume '}'
      }

      fields.push({ name, args, children });
    }

    return fields;
  }

  return parseFields();
}

function mergeFields(a: Field[], b: Field[]): Field[] {
  const map = new Map(a.map((f) => [f.name, { ...f }]));

  for (const field of b) {
    const existing = map.get(field.name);
    if (existing) {
      existing.children = mergeFields(existing.children, field.children);
    } else {
      map.set(field.name, field);
    }
  }

  return [...map.values()];
}

function print(fields: Field[]): string {
  const parts = fields
    .filter((f) => f.name !== '__typename')
    .map((f) => {
      const head = f.args !== undefined ? `${f.name}(${f.args})` : f.name;
      return f.children.length > 0 ? `${head} { ${print(f.children)} }` : head;
    });
  parts.push('__typename');
  return parts.join(' ');
}

/**
 * Merges two GraphQL selection set strings into one, deduplicating fields by
 * name and recursively merging nested selection sets. `__typename` is always
 * appended at every level so polymorphic types resolve correctly.
 *
 * @example
 * merge('slug title author { email }', 'pageInfo { hasNextPage endCursor }')
 * // → 'slug title author { email __typename } pageInfo { hasNextPage endCursor __typename } __typename'
 */
export function merge(a: string, b: string): string {
  return print(mergeFields(parse(a), parse(b)));
}

/**
 * Processes a single selection set string: deduplicates fields and injects
 * `__typename` at every level. Use this in resource methods to normalise
 * caller-supplied field strings before embedding them in a query.
 */
export function fields(input: string): string {
  return merge(input, '');
}

/**
 * Builds a SlugOrId input object from a string, using the given ID prefix to
 * distinguish IDs from slugs.
 */
export function buildRef(value: string, idPrefix: string): { id: string } | { slug: string } {
  return value.startsWith(idPrefix) ? { id: value } : { slug: value };
}

/**
 * Extracts variable declarations and values from a QueryOptions-style variables
 * map, ready to splice into a query string and variables object respectively.
 */
export function buildExtraVars(variables: Record<string, { type: string; value: unknown }> = {}): {
  decls: string;
  values: Record<string, unknown>;
} {
  const entries = Object.entries(variables);
  return {
    decls: entries.map(([name, { type }]) => `, $${name}: ${type}`).join(''),
    values: Object.fromEntries(entries.map(([name, { value }]) => [name, value])),
  };
}
