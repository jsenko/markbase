import { readFileSync, statSync } from 'node:fs';
import matter from 'gray-matter';
import type { MarkdownDocument } from './document.js';
import type { FileMeta } from './types.js';

export interface ParsedFile {
  document: MarkdownDocument;
  meta: FileMeta;
}

export function parseMarkdownFile(filePath: string): ParsedFile {
  const raw = readFileSync(filePath, 'utf-8');
  const stats = statSync(filePath);
  const document = parseMarkdownString(raw);
  return {
    document,
    meta: { filePath, mtime: stats.mtimeMs },
  };
}

export function parseMarkdownString(raw: string): MarkdownDocument {
  const { data, content } = matter(raw);
  return {
    frontmatter: { raw: data },
    sections: [],
    body: content,
  };
}
