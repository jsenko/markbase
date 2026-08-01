import type { MarkdownDocument } from './document.js';
import type { Schema, FieldDefinition } from './types.js';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate a MarkdownDocument against a Schema.
 *
 * Checks frontmatter field types, enum values, and section field types.
 * Missing fields are not errors (they become null). Extra fields not
 * declared in the schema are silently ignored.
 */
export function validateDocument(document: MarkdownDocument, schema: Schema): ValidationResult {
  const errors: ValidationError[] = [];

  validateFrontmatter(document, schema, errors);
  validateSections(document, schema, errors);

  return { valid: errors.length === 0, errors };
}

function validateFrontmatter(
  document: MarkdownDocument,
  schema: Schema,
  errors: ValidationError[],
): void {
  for (const [fieldName, fieldDef] of Object.entries(schema.frontmatter)) {
    const raw = document.frontmatter.raw[fieldName];
    if (raw === undefined || raw === null) continue;
    validateFieldValue(raw, fieldDef, fieldName, errors);
  }
}

function validateSections(
  document: MarkdownDocument,
  schema: Schema,
  errors: ValidationError[],
): void {
  if (!schema.sections) return;

  for (const [sectionName, sectionDef] of Object.entries(schema.sections)) {
    if ('_type' in sectionDef && sectionDef._type === 'freetext') continue;

    const section = document.sections.find(
      s => s.heading.toLowerCase() === sectionName.toLowerCase(),
    );
    if (!section) continue;

    for (const [fieldName, fieldDef] of Object.entries(sectionDef)) {
      if (!fieldDef) continue;
      const sectionField = section.fields.find(f => f.key === fieldName);
      if (!sectionField) continue;

      const qualifiedName = `${sectionName.toLowerCase()}.${fieldName}`;
      validateFieldValue(sectionField.value, fieldDef, qualifiedName, errors);
    }
  }
}

function validateFieldValue(
  raw: unknown,
  fieldDef: FieldDefinition,
  fieldName: string,
  errors: ValidationError[],
): void {
  // gray-matter parses dates as Date objects — always valid
  if (raw instanceof Date) return;

  switch (fieldDef.type) {
    case 'integer': {
      const n = Number(raw);
      if (!Number.isInteger(n)) {
        errors.push({ field: fieldName, message: `expected integer, got ${JSON.stringify(raw)}` });
      }
      break;
    }

    case 'boolean': {
      if (typeof raw !== 'boolean' && raw !== 'true' && raw !== 'false') {
        errors.push({ field: fieldName, message: `expected boolean, got ${JSON.stringify(raw)}` });
      }
      break;
    }

    case 'enum': {
      if (fieldDef.values && !fieldDef.values.includes(String(raw))) {
        errors.push({
          field: fieldName,
          message: `value "${raw}" not in allowed values: ${fieldDef.values.join(', ')}`,
        });
      }
      break;
    }
  }
}
