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
});

describe('section parsing', () => {
  it('splits body into sections at ## headings', () => {
    const doc = parseMarkdownString(`---
title: Test
---

## Section One

Some content.

## Section Two

More content.
`);
    expect(doc.sections).toHaveLength(2);
    expect(doc.sections[0].heading).toBe('Section One');
    expect(doc.sections[0].level).toBe(2);
    expect(doc.sections[1].heading).toBe('Section Two');
  });

  it('extracts - **key:** value fields from sections', () => {
    const doc = parseMarkdownString(`---
title: Test
---

## Triage
- **importance:** high
- **reason:** Something important
`);
    expect(doc.sections).toHaveLength(1);
    const triage = doc.sections[0];
    expect(triage.fields).toHaveLength(2);
    expect(triage.fields[0]).toEqual({ key: 'importance', value: 'high' });
    expect(triage.fields[1]).toEqual({ key: 'reason', value: 'Something important' });
  });

  it('separates fields from freetext content', () => {
    const doc = parseMarkdownString(`---
title: Test
---

## Lifecycle
- **state:** merged
- **flags:** tested

## Summary

This is a summary paragraph.
It spans multiple lines.
`);
    const lifecycle = doc.sections[0];
    expect(lifecycle.fields).toHaveLength(2);
    expect(lifecycle.content).toBe('');

    const summary = doc.sections[1];
    expect(summary.fields).toHaveLength(0);
    expect(summary.content).toContain('This is a summary paragraph.');
    expect(summary.content).toContain('It spans multiple lines.');
  });

  it('handles empty sections', () => {
    const doc = parseMarkdownString(`---
title: Test
---

## Attention

## History
- 2025-01-01 -- Something happened
`);
    const attention = doc.sections[0];
    expect(attention.fields).toHaveLength(0);
    expect(attention.content).toBe('');

    const history = doc.sections[1];
    expect(history.content).toContain('2025-01-01 -- Something happened');
  });

  it('handles sections with mixed fields and freetext', () => {
    const doc = parseMarkdownString(`---
title: Test
---

## Automated Review
- **auto-review:** reviewed
- **findings:** 1 must-fix, 0 should-fix

The must-fix is about missing input validation.
`);
    const section = doc.sections[0];
    expect(section.fields).toHaveLength(2);
    expect(section.fields[0]).toEqual({ key: 'auto-review', value: 'reviewed' });
    expect(section.content).toContain('The must-fix is about missing input validation.');
  });

  it('handles different heading levels', () => {
    const doc = parseMarkdownString(`# H1 Section

## H2 Section

### H3 Section
`);
    expect(doc.sections).toHaveLength(3);
    expect(doc.sections[0].level).toBe(1);
    expect(doc.sections[1].level).toBe(2);
    expect(doc.sections[2].level).toBe(3);
  });
});

describe('parseMarkdownFile', () => {
  it('parses a fixture file with sections', () => {
    const { document, meta } = parseMarkdownFile(resolve(FIXTURES, 'prs/101.md'));
    expect(document.frontmatter.raw.pr).toBe(101);
    expect(document.frontmatter.raw.author).toBe('alice');
    expect(meta.filePath).toContain('101.md');

    const triage = document.sections.find(s => s.heading === 'Triage');
    expect(triage).toBeDefined();
    expect(triage!.fields.find(f => f.key === 'importance')?.value).toBe('high');

    const summary = document.sections.find(s => s.heading === 'Summary');
    expect(summary).toBeDefined();
    expect(summary!.content).toContain('exponential backoff');
  });
});
