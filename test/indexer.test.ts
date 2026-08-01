import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { Indexer } from '../src/core/indexer.js';
import { loadSchema } from '../src/core/schema-loader.js';
import { parseMarkdownFile } from '../src/core/parser.js';
import { mapDocumentToRecord } from '../src/core/schema-mapper.js';
import type { MdRecord } from '../src/core/types.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('Indexer', () => {
  let indexer: Indexer;
  let schema: ReturnType<typeof loadSchema>;
  let records: MdRecord[];

  beforeEach(() => {
    indexer = new Indexer();
    schema = loadSchema(resolve(FIXTURES, 'schemas/prs.json'));

    const files = ['101.md', '102.md', '103.md', '104.md', '105.md'];
    records = files.map(f => {
      const { document, meta } = parseMarkdownFile(resolve(FIXTURES, 'prs', f));
      return mapDocumentToRecord(document, schema, 'prs', meta);
    });

    indexer.reindex(schema, records);
  });

  afterEach(() => {
    indexer.close();
  });

  it('creates a table with correct columns', () => {
    const db = indexer.getDatabase();
    const info = db.pragma(`table_info("prs")`) as Array<{ name: string; type: string }>;
    const columns = info.map(c => c.name);

    expect(columns).toContain('_id');
    expect(columns).toContain('_file_path');
    expect(columns).toContain('_mtime');
    expect(columns).toContain('pr');
    expect(columns).toContain('repo');
    expect(columns).toContain('author');
    expect(columns).toContain('draft');
  });

  it('inserts all records', () => {
    const db = indexer.getDatabase();
    const count = db.prepare('SELECT COUNT(*) as cnt FROM "prs"').get() as { cnt: number };
    expect(count.cnt).toBe(5);
  });

  it('stores correct field values', () => {
    const db = indexer.getDatabase();
    const row = db.prepare('SELECT * FROM "prs" WHERE _id = ?').get('101') as Record<string, unknown>;
    expect(row.pr).toBe(101);
    expect(row.repo).toBe('acme/widgets');
    expect(row.author).toBe('alice');
    expect(row.draft).toBe(0); // boolean → 0/1
  });

  it('reindex replaces existing data', () => {
    const subset = records.slice(0, 2);
    indexer.reindex(schema, subset);

    const db = indexer.getDatabase();
    const count = db.prepare('SELECT COUNT(*) as cnt FROM "prs"').get() as { cnt: number };
    expect(count.cnt).toBe(2);
  });
});
