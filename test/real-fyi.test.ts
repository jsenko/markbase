import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { glob } from 'glob';
import {
  loadSchema,
  parseMarkdownFile,
  mapDocumentToRecord,
  Indexer,
  QueryEngine,
} from '../src/core/index.js';
import type { Schema } from '../src/core/index.js';
import { existsSync } from 'node:fs';

const FYI_PRS = resolve(process.env.HOME || '', '.fyi/work/prs');
const SKIP = !existsSync(FYI_PRS);

describe.skipIf(SKIP)('real FYI PR tracking files', () => {
  let indexer: Indexer;
  let engine: QueryEngine;
  let schema: Schema;
  let recordCount: number;

  beforeAll(async () => {
    schema = {
      name: 'prs',
      source: { type: 'directory', path: `${FYI_PRS}/**/*.md` },
      frontmatter: {
        pr: { type: 'integer', key: true },
        repo: { type: 'string' },
        title: { type: 'string' },
        author: { type: 'string' },
        assignee: { type: 'string' },
        url: { type: 'string' },
        created: { type: 'string', format: 'date' },
      },
      sections: {
        'Triage': {
          importance: { type: 'string' },
          reason: { type: 'string' },
        },
        'Lifecycle': {
          state: { type: 'string' },
          flags: { type: 'string' },
        },
        'Automated Review': {
          'auto-review': { type: 'string' },
          findings: { type: 'string' },
          complexity: { type: 'string' },
        },
        'Summary': { _type: 'freetext' as const },
        'Attention': { _type: 'freetext' as const },
        'History': { _type: 'freetext' as const },
      },
    };

    const files = await glob(`${FYI_PRS}/**/*.md`);
    indexer = new Indexer();

    const records = files.map(f => {
      const { document, meta } = parseMarkdownFile(f);
      return mapDocumentToRecord(document, schema, 'prs', meta);
    });

    recordCount = records.length;
    indexer.reindex(schema, records);
    engine = new QueryEngine(indexer.getDatabase());
  });

  afterAll(() => {
    indexer?.close();
  });

  it('indexes all PR files', () => {
    const result = engine.query('prs', schema);
    expect(result.count).toBe(recordCount);
    expect(result.count).toBeGreaterThan(0);
    console.log(`Indexed ${result.count} real PR files`);
  });

  it('filters by assignee', () => {
    const result = engine.query('prs', schema, { where: 'assignee=jsenko' });
    expect(result.count).toBeGreaterThan(0);
    for (const rec of result.records) {
      expect(rec.fields.assignee).toBe('jsenko');
    }
  });

  it('filters by triage importance', () => {
    const result = engine.query('prs', schema, { where: 'triage.importance=high' });
    expect(result.count).toBeGreaterThan(0);
    for (const rec of result.records) {
      expect(rec.fields['triage.importance']).toBe('high');
    }
  });

  it('filters by lifecycle state', () => {
    const result = engine.query('prs', schema, {
      where: 'lifecycle.state=ready-for-review',
    });
    for (const rec of result.records) {
      expect(rec.fields['lifecycle.state']).toBe('ready-for-review');
    }
  });

  it('combines frontmatter and section field filters', () => {
    const result = engine.query('prs', schema, {
      where: 'assignee=jsenko AND triage.importance=high',
    });
    for (const rec of result.records) {
      expect(rec.fields.assignee).toBe('jsenko');
      expect(rec.fields['triage.importance']).toBe('high');
    }
  });

  it('extracts summary freetext', () => {
    const result = engine.query('prs', schema);
    const withSummary = result.records.filter(r => r.fields['summary'] !== null);
    expect(withSummary.length).toBeGreaterThan(0);
    for (const rec of withSummary) {
      expect(typeof rec.fields['summary']).toBe('string');
      expect((rec.fields['summary'] as string).length).toBeGreaterThan(10);
    }
  });

  it('sorts by creation date', () => {
    const result = engine.query('prs', schema, { sort: 'created:desc' });
    const dates = result.records.map(r => r.fields.created as string);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] <= dates[i - 1]).toBe(true);
    }
  });
});
