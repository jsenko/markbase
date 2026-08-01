import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadSchema } from '../src/core/schema-loader.js';
import { parseMarkdownFile } from '../src/core/parser.js';
import { mapDocumentToRecord } from '../src/core/schema-mapper.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('mapDocumentToRecord', () => {
  const schema = loadSchema(resolve(FIXTURES, 'schemas/prs.json'));

  it('maps frontmatter to typed record fields', () => {
    const { document, meta } = parseMarkdownFile(resolve(FIXTURES, 'prs/101.md'));
    const record = mapDocumentToRecord(document, schema, 'prs', meta);

    expect(record.fields.pr).toBe(101);
    expect(record.fields.repo).toBe('acme/widgets');
    expect(record.fields.title).toBe('Add retry logic to API client');
    expect(record.fields.author).toBe('alice');
    expect(record.fields.draft).toBe(false);
    expect(record.fields.created).toBe('2025-03-15');
  });

  it('uses key field as record id', () => {
    const { document, meta } = parseMarkdownFile(resolve(FIXTURES, 'prs/101.md'));
    const record = mapDocumentToRecord(document, schema, 'prs', meta);
    expect(record.id).toBe('101');
  });

  it('falls back to file path when no key field has a value', () => {
    const { document, meta } = parseMarkdownFile(resolve(FIXTURES, 'prs/101.md'));
    document.frontmatter.raw.pr = undefined;
    const record = mapDocumentToRecord(document, schema, 'prs', meta);
    expect(record.id).toBe(meta.filePath);
  });

  it('sets missing fields to null', () => {
    const { document, meta } = parseMarkdownFile(resolve(FIXTURES, 'prs/101.md'));
    delete document.frontmatter.raw.assignee;
    const record = mapDocumentToRecord(document, schema, 'prs', meta);
    expect(record.fields.assignee).toBeNull();
  });

  it('preserves collection name and file metadata', () => {
    const { document, meta } = parseMarkdownFile(resolve(FIXTURES, 'prs/102.md'));
    const record = mapDocumentToRecord(document, schema, 'prs', meta);
    expect(record.collectionName).toBe('prs');
    expect(record.meta.filePath).toContain('102.md');
    expect(record.meta.mtime).toBeGreaterThan(0);
  });
});
