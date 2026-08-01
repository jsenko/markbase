import type { MarkdownDocument } from './document.js';
import type { Schema, MdRecord, RecordFieldValue, FieldDefinition, FileMeta } from './types.js';

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

function coerceValue(
  raw: unknown,
  fieldDef: FieldDefinition,
  fieldName: string,
): RecordFieldValue {
  if (raw === undefined || raw === null) {
    return null;
  }

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
