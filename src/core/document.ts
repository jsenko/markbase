/**
 * Schema-agnostic representation of a parsed markdown file.
 *
 * This is the content model — it captures what's *in* the markdown,
 * independent of any collection schema. The schema mapper reads a
 * MarkdownDocument and produces typed MdRecords for indexing.
 *
 * Designed to grow: Phase 1 populates frontmatter + body only.
 * Later phases add sections, fields within sections, lists, tables.
 */

export interface MarkdownDocument {
  frontmatter: Frontmatter;
  sections: Section[];
  body: string;
}

export interface Frontmatter {
  raw: Record<string, unknown>;
}

export interface Section {
  heading: string;
  level: number;
  fields: SectionField[];
  content: string;
}

export interface SectionField {
  key: string;
  value: string;
}
