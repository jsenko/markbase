import type { MarkdownDocument, Section } from './document.js';
import type {
  Schema,
  MdRecord,
  RecordFieldValue,
  FieldDefinition,
  FileMeta,
  SectionDefinition,
} from './types.js';

/**
 * Map a MarkdownDocument to a typed MdRecord using a collection schema.
 *
 * Extracts frontmatter values and section fields declared in the schema,
 * coerces them to the declared types. Section fields use dot notation
 * (e.g. "triage.importance"). Freetext sections become a single text field
 * named after the section (lowercased).
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

  if (schema.sections) {
    mapSectionFields(document.sections, schema.sections, fields);
  }

  if (id === undefined) {
    id = meta.filePath;
  }

  return { id, collectionName, fields, meta };
}

/** Extract section fields from parsed sections into the flat fields map. */
function mapSectionFields(
  sections: Section[],
  sectionDefs: Record<string, SectionDefinition>,
  fields: Record<string, RecordFieldValue>,
): void {
  for (const [sectionName, sectionDef] of Object.entries(sectionDefs)) {
    const section = sections.find(
      s => s.heading.toLowerCase() === sectionName.toLowerCase(),
    );

    if (isFreetext(sectionDef)) {
      const key = sectionName.toLowerCase();
      fields[key] = section?.content || null;
    } else {
      const prefix = sectionName.toLowerCase();
      for (const [fieldName, fieldDef] of Object.entries(sectionDef)) {
        if (!fieldDef) continue;
        const qualifiedName = `${prefix}.${fieldName}`;
        const sectionField = section?.fields.find(f => f.key === fieldName);
        const coerced = coerceValue(
          sectionField?.value ?? null,
          fieldDef,
          qualifiedName,
        );
        fields[qualifiedName] = coerced;
      }
    }
  }
}

function isFreetext(def: SectionDefinition): def is { _type: 'freetext' } {
  return '_type' in def && def._type === 'freetext';
}

/**
 * Coerce a raw value to the type declared in the schema.
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
