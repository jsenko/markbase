import { readFileSync, statSync } from 'node:fs';
import matter from 'gray-matter';
import type { MarkdownDocument, Section, SectionField } from './document.js';
import type { FileMeta } from './types.js';

/** Result of parsing a markdown file: the content model plus file metadata. */
export interface ParsedFile {
  document: MarkdownDocument;
  meta: FileMeta;
}

/** Parse a markdown file from disk into a MarkdownDocument with file metadata. */
export function parseMarkdownFile(filePath: string): ParsedFile {
  const raw = readFileSync(filePath, 'utf-8');
  const stats = statSync(filePath);
  const document = parseMarkdownString(raw);
  return {
    document,
    meta: { filePath, mtime: stats.mtimeMs },
  };
}

/** Parse a raw markdown string into a MarkdownDocument (schema-agnostic). */
export function parseMarkdownString(raw: string): MarkdownDocument {
  const { data, content } = matter(raw);
  const sections = parseSections(content);
  return {
    frontmatter: { raw: data },
    sections,
    body: content,
  };
}

const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const FIELD_RE = /^- \*\*(.+?):\*\*\s*(.*)$/;

/**
 * Split markdown content into sections at heading boundaries.
 * Each section captures its heading, level, structured fields
 * (- **key:** value), and remaining freetext content.
 */
function parseSections(body: string): Section[] {
  const lines = body.split('\n');
  const sections: Section[] = [];
  let current: { heading: string; level: number; lines: string[] } | null = null;

  for (const line of lines) {
    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      if (current) {
        sections.push(buildSection(current));
      }
      current = {
        heading: headingMatch[2].trim(),
        level: headingMatch[1].length,
        lines: [],
      };
    } else if (current) {
      current.lines.push(line);
    }
  }

  if (current) {
    sections.push(buildSection(current));
  }

  return sections;
}

/** Extract structured fields and freetext content from a section's lines. */
function buildSection(raw: { heading: string; level: number; lines: string[] }): Section {
  const fields: SectionField[] = [];
  const contentLines: string[] = [];

  for (const line of raw.lines) {
    const fieldMatch = line.match(FIELD_RE);
    if (fieldMatch) {
      fields.push({ key: fieldMatch[1], value: fieldMatch[2].trim() });
    } else {
      contentLines.push(line);
    }
  }

  const content = contentLines.join('\n').trim();

  return {
    heading: raw.heading,
    level: raw.level,
    fields,
    content,
  };
}
