import type { Schema, FieldDefinition } from './types.js';

/**
 * Get all queryable field names from a schema (frontmatter + sections).
 * Section fields use dot notation (e.g. "triage.importance").
 * Freetext sections use the lowercased section name.
 */
export function getSchemaFieldNames(schema: Schema): string[] {
  const names = Object.keys(schema.frontmatter);

  if (schema.sections) {
    for (const [sectionName, sectionDef] of Object.entries(schema.sections)) {
      if ('_type' in sectionDef && sectionDef._type === 'freetext') {
        names.push(sectionName.toLowerCase());
      } else {
        for (const fieldName of Object.keys(sectionDef)) {
          if (sectionDef[fieldName]) {
            names.push(`${sectionName.toLowerCase()}.${fieldName}`);
          }
        }
      }
    }
  }

  return names;
}

/**
 * Resolve a field name to its FieldDefinition from the schema.
 * Handles both frontmatter fields and dot-notation section fields.
 * Returns null for freetext section names (they're just TEXT columns).
 */
export function resolveFieldDef(
  schema: Schema,
  fieldName: string,
): FieldDefinition | null {
  if (fieldName in schema.frontmatter) {
    return schema.frontmatter[fieldName];
  }

  if (schema.sections) {
    const dotIndex = fieldName.indexOf('.');
    if (dotIndex > 0) {
      const sectionKey = fieldName.slice(0, dotIndex);
      const field = fieldName.slice(dotIndex + 1);
      for (const [sectionName, sectionDef] of Object.entries(schema.sections)) {
        if (sectionName.toLowerCase() === sectionKey && !('_type' in sectionDef)) {
          const def = sectionDef[field];
          if (def) return def;
        }
      }
    } else {
      for (const [sectionName, sectionDef] of Object.entries(schema.sections)) {
        if (sectionName.toLowerCase() === fieldName && '_type' in sectionDef) {
          return { type: 'string' };
        }
      }
    }
  }

  return null;
}

/** Check if a field name exists in the schema. */
export function isKnownField(schema: Schema, fieldName: string): boolean {
  return resolveFieldDef(schema, fieldName) !== null;
}
