export type FieldType = 'string' | 'integer' | 'boolean' | 'enum' | 'date';

export interface FieldDefinition {
  type: FieldType;
  key?: boolean;
  values?: string[];
  format?: string;
}

export interface SourceDefinition {
  type: 'directory';
  path: string;
}

export interface Schema {
  name: string;
  source: SourceDefinition;
  frontmatter: Record<string, FieldDefinition>;
}

export interface CollectionConfig {
  name: string;
  path: string;
  schema: string;
}

export interface Config {
  collections: CollectionConfig[];
}

export interface FileMeta {
  filePath: string;
  mtime: number;
}

export interface MdRecord {
  id: string;
  collectionName: string;
  fields: RecordFields;
  meta: FileMeta;
}

export type RecordFieldValue = string | number | boolean | null;
export type RecordFields = { [fieldName: string]: RecordFieldValue };
