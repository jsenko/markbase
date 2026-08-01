import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { glob } from 'glob';
import {
  loadConfig,
  loadSchema,
  parseMarkdownFile,
  mapDocumentToRecord,
  Indexer,
  QueryEngine,
} from '../src/core/index.js';
import type { Schema, MdRecord } from '../src/core/index.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('end-to-end pipeline', () => {
  let indexer: Indexer;
  let engine: QueryEngine;
  let schema: Schema;

  beforeAll(async () => {
    const config = loadConfig(resolve(FIXTURES, 'markbase.config.json'));
    indexer = new Indexer();

    const col = config.collections[0];
    schema = loadSchema(resolve(FIXTURES, col.schema));

    const pattern = resolve(FIXTURES, col.path);
    const files = await glob(pattern);
    const records = files.map(f => {
      const { document, meta } = parseMarkdownFile(f);
      return mapDocumentToRecord(document, schema, col.name, meta);
    });

    indexer.reindex(schema, records);
    engine = new QueryEngine(indexer.getDatabase());
  });

  afterAll(() => {
    indexer.close();
  });

  it('indexes all fixture files', () => {
    const result = engine.query('prs', schema);
    expect(result.count).toBe(5);
  });

  it('filters by string field', () => {
    const result = engine.query('prs', schema, { where: 'author=alice' });
    expect(result.count).toBe(2);
    const ids = result.records.map(r => r.id).sort();
    expect(ids).toEqual(['101', '103']);
  });

  it('filters by integer field', () => {
    const result = engine.query('prs', schema, { where: 'pr=104' });
    expect(result.count).toBe(1);
    expect(result.records[0].fields.title).toBe('Add OpenAPI spec for v2 endpoints');
  });

  it('filters by boolean field', () => {
    const result = engine.query('prs', schema, { where: 'draft=true' });
    expect(result.count).toBe(1);
    expect(result.records[0].id).toBe('103');
    expect(result.records[0].fields.draft).toBe(true);
  });

  it('combines filters with AND', () => {
    const result = engine.query('prs', schema, {
      where: 'author=bob AND repo=acme/widgets',
    });
    expect(result.count).toBe(1);
    expect(result.records[0].id).toBe('102');
  });

  it('projects selected fields', () => {
    const result = engine.query('prs', schema, {
      select: ['pr', 'title'],
    });
    expect(result.count).toBe(5);
    for (const rec of result.records) {
      expect(rec.fields.pr).toBeDefined();
      expect(rec.fields.title).toBeDefined();
    }
  });

  it('sorts by date ascending', () => {
    const result = engine.query('prs', schema, { sort: 'created:asc' });
    const dates = result.records.map(r => r.fields.created as string);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] >= dates[i - 1]).toBe(true);
    }
  });

  it('sorts by date descending', () => {
    const result = engine.query('prs', schema, { sort: 'created:desc' });
    const dates = result.records.map(r => r.fields.created as string);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] <= dates[i - 1]).toBe(true);
    }
  });

  it('gets a single record by id', () => {
    const record = engine.getById('prs', schema, '101');
    expect(record).not.toBeNull();
    expect(record!.fields.pr).toBe(101);
    expect(record!.fields.repo).toBe('acme/widgets');
    expect(record!.fields.title).toBe('Add retry logic to API client');
    expect(record!.fields.author).toBe('alice');
    expect(record!.fields.assignee).toBe('bob');
    expect(record!.fields.draft).toBe(false);
    expect(record!.fields.created).toBe('2025-03-15');
  });

  it('returns null for non-existent record', () => {
    const record = engine.getById('prs', schema, '999');
    expect(record).toBeNull();
  });

  it('reindexes correctly', async () => {
    const config = loadConfig(resolve(FIXTURES, 'markbase.config.json'));
    const col = config.collections[0];
    const pattern = resolve(FIXTURES, col.path);
    const files = await glob(pattern);
    const records = files.map(f => {
      const { document, meta } = parseMarkdownFile(f);
      return mapDocumentToRecord(document, schema, col.name, meta);
    });

    indexer.reindex(schema, records);
    const result = engine.query('prs', schema);
    expect(result.count).toBe(5);
  });
});
