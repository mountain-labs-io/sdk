import { describe, it, expect } from 'vitest';
import { merge } from '../utils/graphql';

describe('merge', () => {
  it('concatenates disjoint fields', () => {
    expect(merge('slug title', 'publishedAt')).toBe('slug title publishedAt __typename');
  });

  it('deduplicates scalar fields', () => {
    expect(merge('slug title', 'title publishedAt')).toBe('slug title publishedAt __typename');
  });

  it('concatenates disjoint nested fields', () => {
    expect(merge('slug title', 'pageInfo { hasNextPage endCursor }')).toBe(
      'slug title pageInfo { hasNextPage endCursor __typename } __typename',
    );
  });

  it('merges overlapping nested fields', () => {
    expect(merge('author { email }', 'author { name }')).toBe('author { email name __typename } __typename');
  });

  it('deduplicates nested fields', () => {
    expect(merge('author { email name }', 'author { name }')).toBe('author { email name __typename } __typename');
  });

  it('merges deeply nested fields', () => {
    expect(merge('a { b { c } }', 'a { b { d } }')).toBe('a { b { c d __typename } __typename } __typename');
  });

  it('handles empty left side', () => {
    expect(merge('', 'slug title')).toBe('slug title __typename');
  });

  it('handles empty right side', () => {
    expect(merge('slug title', '')).toBe('slug title __typename');
  });

  it('deduplicates __typename when already present', () => {
    expect(merge('slug __typename', '')).toBe('slug __typename');
  });

  it('adds __typename recursively into nested selections', () => {
    expect(merge('slug author { email }', '')).toBe('slug author { email __typename } __typename');
  });

  it('deduplicates __typename in nested selections', () => {
    expect(merge('author { email __typename }', '')).toBe('author { email __typename } __typename');
  });

  describe('named fragment spreads', () => {
    it('includes a named fragment spread', () => {
      expect(merge('slug', '...PageFields')).toBe('slug ...PageFields __typename');
    });

    it('deduplicates named fragment spreads', () => {
      expect(merge('slug ...PageFields', '...PageFields')).toBe('slug ...PageFields __typename');
    });
  });

  describe('inline fragments', () => {
    it('includes an inline fragment', () => {
      expect(merge('slug', '... on Page { title }')).toBe('slug ... on Page { title __typename } __typename');
    });

    it('merges inline fragments with the same type', () => {
      expect(merge('... on Page { slug }', '... on Page { title }')).toBe('... on Page { slug title __typename } __typename');
    });

    it('keeps inline fragments with different types separate', () => {
      expect(merge('... on Page { slug }', '... on Post { title }')).toBe(
        '... on Page { slug __typename } ... on Post { title __typename } __typename',
      );
    });
  });

  describe('field arguments', () => {
    it('preserves a simple field argument', () => {
      expect(merge('section(ref: {slug: "intro"}) { slug }', '')).toBe(
        'section(ref: { slug: "intro" }) { slug __typename } __typename',
      );
    });

    it('merges children of fields with the same name and arguments', () => {
      expect(merge('section(ref: {slug: "intro"}) { slug }', 'section(ref: {slug: "intro"}) { name }')).toBe(
        'section(ref: { slug: "intro" }) { slug name __typename } __typename',
      );
    });

    it('preserves arguments on leaf fields', () => {
      expect(merge('image(width: 800)', '')).toBe('image(width: 800) __typename');
    });
  });

  it('matches the example from the spec', () => {
    expect(merge('slug title author { email }', 'pageInfo { hasNextPage endCursor }')).toBe(
      'slug title author { email __typename } pageInfo { hasNextPage endCursor __typename } __typename',
    );
  });
});
