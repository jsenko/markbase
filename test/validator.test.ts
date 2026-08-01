import { describe, it, expect } from 'vitest';
import { validateDocument } from '../src/core/validator.js';
import { parseMarkdownString } from '../src/core/parser.js';
import type { Schema } from '../src/core/types.js';

const schema: Schema = {
  name: 'test',
  source: { type: 'directory', path: './**/*.md' },
  frontmatter: {
    id: { type: 'integer', key: true },
    title: { type: 'string' },
    draft: { type: 'boolean' },
    status: { type: 'enum', values: ['open', 'closed', 'merged'] },
    created: { type: 'string', format: 'date' },
  },
  sections: {
    'Triage': {
      importance: { type: 'enum', values: ['low', 'medium', 'high', 'critical'] },
    },
    'Summary': { _type: 'freetext' as const },
  },
};

describe('validateDocument', () => {
  it('accepts a valid document', () => {
    const doc = parseMarkdownString(`---
id: 1
title: Test
draft: false
status: open
created: 2025-01-01
---

## Triage
- **importance:** high

## Summary

Some text.
`);
    const result = validateDocument(doc, schema);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts missing fields (they become null)', () => {
    const doc = parseMarkdownString(`---
id: 1
---
`);
    const result = validateDocument(doc, schema);
    expect(result.valid).toBe(true);
  });

  it('ignores extra fields not in schema', () => {
    const doc = parseMarkdownString(`---
id: 1
extra_field: hello
---
`);
    const result = validateDocument(doc, schema);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid integer', () => {
    const doc = parseMarkdownString(`---
id: not-a-number
---
`);
    const result = validateDocument(doc, schema);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('id');
    expect(result.errors[0].message).toContain('expected integer');
  });

  it('rejects invalid boolean', () => {
    const doc = parseMarkdownString(`---
id: 1
draft: maybe
---
`);
    const result = validateDocument(doc, schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('draft');
    expect(result.errors[0].message).toContain('expected boolean');
  });

  it('rejects invalid enum value', () => {
    const doc = parseMarkdownString(`---
id: 1
status: invalid
---
`);
    const result = validateDocument(doc, schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('status');
    expect(result.errors[0].message).toContain('not in allowed values');
  });

  it('rejects invalid section field enum value', () => {
    const doc = parseMarkdownString(`---
id: 1
---

## Triage
- **importance:** urgent
`);
    const result = validateDocument(doc, schema);
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('triage.importance');
    expect(result.errors[0].message).toContain('not in allowed values');
  });

  it('accepts valid section field enum value', () => {
    const doc = parseMarkdownString(`---
id: 1
---

## Triage
- **importance:** critical
`);
    const result = validateDocument(doc, schema);
    expect(result.valid).toBe(true);
  });

  it('collects multiple errors', () => {
    const doc = parseMarkdownString(`---
id: not-a-number
draft: maybe
status: invalid
---
`);
    const result = validateDocument(doc, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('skips freetext sections', () => {
    const doc = parseMarkdownString(`---
id: 1
---

## Summary

Anything goes here, no validation.
`);
    const result = validateDocument(doc, schema);
    expect(result.valid).toBe(true);
  });
});
