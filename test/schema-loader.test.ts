import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadSchema, loadConfig } from '../src/core/schema-loader.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('loadConfig', () => {
  it('loads a valid config file', () => {
    const config = loadConfig(resolve(FIXTURES, 'markbase.config.json'));
    expect(config.collections).toHaveLength(1);
    expect(config.collections[0].name).toBe('prs');
    expect(config.collections[0].path).toBe('./prs/**/*.md');
    expect(config.collections[0].schema).toBe('./schemas/prs.json');
  });
});

describe('loadSchema', () => {
  it('loads a valid schema file', () => {
    const schema = loadSchema(resolve(FIXTURES, 'schemas/prs.json'));
    expect(schema.name).toBe('prs');
    expect(schema.source.type).toBe('directory');
    expect(schema.source.path).toBe('./prs/**/*.md');
  });

  it('parses frontmatter field definitions', () => {
    const schema = loadSchema(resolve(FIXTURES, 'schemas/prs.json'));
    expect(schema.frontmatter.pr).toEqual({ type: 'integer', key: true });
    expect(schema.frontmatter.repo).toEqual({ type: 'string' });
    expect(schema.frontmatter.draft).toEqual({ type: 'boolean' });
    expect(schema.frontmatter.created).toEqual({ type: 'string', format: 'date' });
  });

  it('identifies the key field', () => {
    const schema = loadSchema(resolve(FIXTURES, 'schemas/prs.json'));
    const keyField = Object.entries(schema.frontmatter).find(([, def]) => def.key);
    expect(keyField).toBeDefined();
    expect(keyField![0]).toBe('pr');
  });
});
