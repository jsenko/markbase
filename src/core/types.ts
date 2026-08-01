/** Supported field types for schema definitions. */
export type FieldType = 'string' | 'integer' | 'boolean' | 'enum' | 'date';

/** Defines a single field in a collection schema. */
export interface FieldDefinition {
  type: FieldType;
  /** When true, this field is the record identifier within the collection. */
  key?: boolean;
  /** Allowed values (enum type only). */
  values?: string[];
  /** Value format hint, e.g. "date" or "uri". */
  format?: string;
}

/** Declares how markdown files map to records. */
export interface SourceDefinition {
  /** Source strategy. "directory" = each .md file is one record. */
  type: 'directory';
  /** Glob pattern for matching source files, relative to config. */
  path: string;
}

/** Defines a collection's structure: name, source mapping, and field definitions. */
export interface Schema {
  name: string;
  source: SourceDefinition;
  /** Field definitions extracted from YAML frontmatter. */
  frontmatter: Record<string, FieldDefinition>;
}

/** A collection registration in the config file. */
export interface CollectionConfig {
  name: string;
  /** Glob pattern for markdown files, relative to config. */
  path: string;
  /** Path to the JSON Schema file, relative to config. */
  schema: string;
}

/** Top-level markbase configuration (markbase.config.json). */
export interface Config {
  collections: CollectionConfig[];
}

/** Tracks the source file for a record. */
export interface FileMeta {
  filePath: string;
  /** File modification time in milliseconds (Date.now() scale). */
  mtime: number;
}

/**
 * A typed, schema-aware record ready for indexing and querying.
 * Produced by the schema mapper from a MarkdownDocument + Schema.
 */
export interface MdRecord {
  /** Record identifier — from key field value, or file path as fallback. */
  id: string;
  collectionName: string;
  /** Typed field values extracted from the markdown file. */
  fields: RecordFields;
  meta: FileMeta;
}

export type RecordFieldValue = string | number | boolean | null;
export type RecordFields = { [fieldName: string]: RecordFieldValue };
