import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { Indexer } from '../src/core/indexer.js';
import { QueryEngine } from '../src/core/query-engine.js';
import { loadSchema } from '../src/core/schema-loader.js';
import { parseMarkdownFile } from '../src/core/parser.js';
import { mapDocumentToRecord } from '../src/core/schema-mapper.js';
import type { Schema, MdRecord } from '../src/core/types.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('QueryEngine', () => {
  let indexer: Indexer;
  let engine: QueryEngine;
  let schema: Schema;

  beforeEach(() => {
    indexer = new Indexer();
    schema = loadSchema(resolve(FIXTURES, 'schemas/prs.json'));

    const files = ['101.md', '102.md', '103.md', '104.md', '105.md'];
    const records = files.map(f => {
      const { document, meta } = parseMarkdownFile(resolve(FIXTURES, 'prs', f));
      return mapDocumentToRecord(document, schema, 'prs', meta);
    });

    indexer.reindex(schema, records);
    engine = new QueryEngine(indexer.getDatabase());
  });

  afterEach(() => {
    indexer.close();
  });

  describe('query', () => {
    it('returns all records when no filters', () => {
      const result = engine.query('prs', schema);
      expect(result.count).toBe(5);
    });

    it('filters by equality', () => {
      const result = engine.query('prs', schema, { where: 'author=alice' });
      expect(result.count).toBe(2);
      expect(result.records.every(r => r.fields.author === 'alice')).toBe(true);
    });

    it('filters by inequality', () => {
      const result = engine.query('prs', schema, { where: 'repo!=acme/widgets' });
      expect(result.count).toBe(2);
      expect(result.records.every(r => r.fields.repo === 'acme/gizmos')).toBe(true);
    });

    it('filters with AND', () => {
      const result = engine.query('prs', schema, {
        where: 'author=alice AND repo=acme/widgets',
      });
      expect(result.count).toBe(1);
      expect(result.records[0].fields.pr).toBe(101);
    });

    it('filters by boolean field', () => {
      const result = engine.query('prs', schema, { where: 'draft=true' });
      expect(result.count).toBe(1);
      expect(result.records[0].fields.pr).toBe(103);
    });

    it('selects specific fields', () => {
      const result = engine.query('prs', schema, { select: ['pr', 'title'] });
      expect(result.count).toBe(5);
      const rec = result.records[0];
      expect(rec.fields.pr).toBeDefined();
      expect(rec.fields.title).toBeDefined();
    });

    it('sorts ascending', () => {
      const result = engine.query('prs', schema, { sort: 'pr:asc' });
      const prs = result.records.map(r => r.fields.pr);
      expect(prs).toEqual([101, 102, 103, 104, 105]);
    });

    it('sorts descending', () => {
      const result = engine.query('prs', schema, { sort: 'pr:desc' });
      const prs = result.records.map(r => r.fields.pr);
      expect(prs).toEqual([105, 104, 103, 102, 101]);
    });

    it('combines where, select, and sort', () => {
      const result = engine.query('prs', schema, {
        where: 'repo=acme/widgets',
        select: ['pr', 'title', 'author'],
        sort: 'created:desc',
      });
      expect(result.count).toBe(3);
      expect(result.records[0].fields.pr).toBe(104);
    });

    it('throws on unknown field', () => {
      expect(() => engine.query('prs', schema, { where: 'nonexistent=value' })).toThrow(
        /Unknown field/,
      );
    });

    it('throws on invalid filter syntax', () => {
      expect(() => engine.query('prs', schema, { where: 'bad filter' })).toThrow(
        /Invalid filter/,
      );
    });
  });

  describe('getById', () => {
    it('returns a record by id', () => {
      const record = engine.getById('prs', schema, '101');
      expect(record).not.toBeNull();
      expect(record!.fields.pr).toBe(101);
      expect(record!.fields.author).toBe('alice');
    });

    it('returns null for unknown id', () => {
      const record = engine.getById('prs', schema, '999');
      expect(record).toBeNull();
    });

    it('converts boolean fields back from integer', () => {
      const record = engine.getById('prs', schema, '103');
      expect(record!.fields.draft).toBe(true);
    });
  });
});
