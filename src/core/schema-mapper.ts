import type { MarkdownDocument } from './document.js';
import type { Schema, MdRecord, RecordFieldValue, FieldDefinition, FileMeta } from './types.js';

/**
 * Map a MarkdownDocument to a typed MdRecord using a collection schema.
 *
 * Extracts frontmatter values declared in the schema, coerces them to
 * the declared types, and assigns the record ID from the key field
 * (falls back to file path if no key field has a value).
 */
export function mapDocumentToRecord(
  document: MarkdownDocument,
  schema: Schema,
  collectionName: string,
  meta: FileMeta,
): MdRecord {
  const fields: Record<string, RecordFieldValue> = {};
  let id: string | undefined;

  for (const [fieldName, fieldDef] of Object.entries(schema.frontmatter)) {
    const rawValue = document.frontmatter.raw[fieldName];
    const coerced = coerceValue(rawValue, fieldDef, fieldName);
    fields[fieldName] = coerced;

    if (fieldDef.key && coerced !== null) {
      id = String(coerced);
    }
  }

  if (id === undefined) {
    id = meta.filePath;
  }

  return { id, collectionName, fields, meta };
}

/**
 * Coerce a raw frontmatter value to the type declared in the schema.
 * gray-matter parses YAML dates as Date objects, so we normalize those to ISO strings.
 */
function coerceValue(
  raw: unknown,
  fieldDef: FieldDefinition,
  fieldName: string,
): RecordFieldValue {
  if (raw === undefined || raw === null) {
    return null;
  }

  // gray-matter parses YAML dates (e.g. 2025-03-15) as JS Date objects
  if (raw instanceof Date) {
    return raw.toISOString().slice(0, 10);
  }

  switch (fieldDef.type) {
    case 'string':
    case 'enum':
    case 'date':
      return String(raw);

    case 'integer': {
      const n = Number(raw);
      if (!Number.isInteger(n)) {
        throw new Error(`Field "${fieldName}": expected integer, got ${JSON.stringify(raw)}`);
      }
      return n;
    }

    case 'boolean':
      if (typeof raw === 'boolean') return raw;
      if (raw === 'true') return true;
      if (raw === 'false') return false;
      throw new Error(`Field "${fieldName}": expected boolean, got ${JSON.stringify(raw)}`);

    default:
      return String(raw);
  }
}
