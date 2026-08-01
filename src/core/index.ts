export type {
  FieldType,
  FieldDefinition,
  SourceDefinition,
  Schema,
  CollectionConfig,
  Config,
  FileMeta,
  MdRecord,
  RecordFieldValue,
  RecordFields,
  SectionDefinition,
  StructuredSectionDefinition,
  FreetextSectionDefinition,
} from './types.js';

export type {
  MarkdownDocument,
  Frontmatter,
  Section,
  SectionField,
} from './document.js';

export { loadConfig, loadSchema } from './schema-loader.js';
export { parseMarkdownFile, parseMarkdownString } from './parser.js';
export type { ParsedFile } from './parser.js';
export { mapDocumentToRecord } from './schema-mapper.js';
export { getSchemaFieldNames, resolveFieldDef, isKnownField } from './schema-utils.js';
export { Indexer } from './indexer.js';
export { QueryEngine } from './query-engine.js';
export type { QueryOptions, QueryResult } from './query-engine.js';
