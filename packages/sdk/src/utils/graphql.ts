type Field = {
  name: string;
  children: Field[];
};

function parse(input: string): Field[] {
  const tokens = input.match(/[{}]|[^\s{}]+/g) ?? [];
  let i = 0;

  function parseFields(): Field[] {
    const fields: Field[] = [];

    while (i < tokens.length && tokens[i] !== '}') {
      let name = tokens[i++];
      let children: Field[] = [];

      // Inline fragment: ... on TypeName { fields }
      if (name === '...' && tokens[i] === 'on') {
        i++; // consume 'on'
        name = `... on ${tokens[i++]}`; // consume TypeName
      }

      if (tokens[i] === '{') {
        i++; // consume '{'
        children = parseFields();
        i++; // consume '}'
      }

      fields.push({ name, children });
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
    .map((f) => (f.children.length > 0 ? `${f.name} { ${print(f.children)} }` : f.name));
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
