import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { parseMarkdownFile, parseMarkdownString } from '../src/core/parser.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('parseMarkdownString', () => {
  it('extracts frontmatter into raw object', () => {
    const doc = parseMarkdownString(`---
pr: 101
title: Test PR
draft: false
---

# Body content
`);
    expect(doc.frontmatter.raw.pr).toBe(101);
    expect(doc.frontmatter.raw.title).toBe('Test PR');
    expect(doc.frontmatter.raw.draft).toBe(false);
  });

  it('captures body content after frontmatter', () => {
    const doc = parseMarkdownString(`---
title: Hello
---

# Body content

Some text here.
`);
    expect(doc.body).toContain('# Body content');
    expect(doc.body).toContain('Some text here.');
  });

  it('returns empty frontmatter for files without it', () => {
    const doc = parseMarkdownString('# Just a heading\n\nSome text.');
    expect(doc.frontmatter.raw).toEqual({});
    expect(doc.body).toContain('# Just a heading');
  });

  it('initializes sections as empty array', () => {
    const doc = parseMarkdownString('---\ntitle: Test\n---\n# Content');
    expect(doc.sections).toEqual([]);
  });
});

describe('parseMarkdownFile', () => {
  it('parses a fixture file with metadata', () => {
    const { document, meta } = parseMarkdownFile(resolve(FIXTURES, 'prs/101.md'));
    expect(document.frontmatter.raw.pr).toBe(101);
    expect(document.frontmatter.raw.author).toBe('alice');
    expect(meta.filePath).toContain('101.md');
    expect(meta.mtime).toBeGreaterThan(0);
  });
});
