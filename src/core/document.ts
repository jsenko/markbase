/**
 * Schema-agnostic representation of a parsed markdown file.
 *
 * This is the content model — it captures what's in the markdown,
 * independent of any collection schema. The schema mapper reads a
 * MarkdownDocument and produces typed MdRecords for indexing.
 *
 * Phase 1 populates frontmatter + body only. Later phases add
 * sections, fields within sections, lists, and tables.
 */
export interface MarkdownDocument {
  frontmatter: Frontmatter;
  /** Parsed heading-delimited sections (populated in Phase 2+). */
  sections: Section[];
  /** Raw markdown content below the frontmatter. */
  body: string;
}

/** Raw YAML frontmatter key-value pairs, before schema mapping. */
export interface Frontmatter {
  raw: Record<string, unknown>;
}

/** A heading-delimited section of the document (Phase 2+). */
export interface Section {
  heading: string;
  /** Heading level (1 for #, 2 for ##, etc.). */
  level: number;
  /** Structured fields found as `- **key:** value` in the section. */
  fields: SectionField[];
  /** Raw markdown content of the section body. */
  content: string;
}

/** A key-value field extracted from a section's bullet list. */
export interface SectionField {
  key: string;
  value: string;
}
