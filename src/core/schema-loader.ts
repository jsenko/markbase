import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { Schema, FieldDefinition, FieldType, Config, CollectionConfig } from './types.js';

const VALID_FIELD_TYPES: FieldType[] = ['string', 'integer', 'boolean', 'enum', 'date'];
const VALID_SOURCE_TYPES = ['directory'] as const;

export function loadConfig(configPath: string): Config {
  const raw = JSON.parse(readFileSync(configPath, 'utf-8'));

  if (!Array.isArray(raw.collections)) {
    throw new Error(`Config at ${configPath}: "collections" must be an array`);
  }

  const collections: CollectionConfig[] = raw.collections.map(
    (c: Record<string, unknown>, i: number) => {
      if (typeof c.name !== 'string') {
        throw new Error(`Config collection[${i}]: "name" must be a string`);
      }
      if (typeof c.path !== 'string') {
        throw new Error(`Config collection[${i}]: "path" must be a string`);
      }
      if (typeof c.schema !== 'string') {
        throw new Error(`Config collection[${i}]: "schema" must be a string`);
      }
      return { name: c.name, path: c.path, schema: c.schema } as CollectionConfig;
    },
  );

  return { collections };
}

export function loadSchema(schemaPath: string): Schema {
  const raw = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  return parseSchema(raw, schemaPath);
}

function parseSchema(raw: Record<string, unknown>, filePath: string): Schema {
  if (typeof raw.name !== 'string') {
    throw new Error(`Schema at ${filePath}: "name" must be a string`);
  }

  const source = parseSource(raw.source, filePath);
  const frontmatter = parseFrontmatterDefs(raw.frontmatter, filePath);

  return { name: raw.name, source, frontmatter };
}

function parseSource(
  raw: unknown,
  filePath: string,
): Schema['source'] {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Schema at ${filePath}: "source" must be an object`);
  }
  const src = raw as Record<string, unknown>;

  if (!VALID_SOURCE_TYPES.includes(src.type as typeof VALID_SOURCE_TYPES[number])) {
    throw new Error(
      `Schema at ${filePath}: source.type must be one of: ${VALID_SOURCE_TYPES.join(', ')}`,
    );
  }
  if (typeof src.path !== 'string') {
    throw new Error(`Schema at ${filePath}: source.path must be a string`);
  }

  return { type: src.type as 'directory', path: src.path };
}

function parseFrontmatterDefs(
  raw: unknown,
  filePath: string,
): Record<string, FieldDefinition> {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Schema at ${filePath}: "frontmatter" must be an object`);
  }

  const defs: Record<string, FieldDefinition> = {};

  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') {
      throw new Error(`Schema at ${filePath}: frontmatter.${key} must be an object`);
    }
    const field = val as Record<string, unknown>;

    const type = field.type as string;
    if (!VALID_FIELD_TYPES.includes(type as FieldType)) {
      throw new Error(
        `Schema at ${filePath}: frontmatter.${key}.type must be one of: ${VALID_FIELD_TYPES.join(', ')}`,
      );
    }

    const def: FieldDefinition = { type: type as FieldType };

    if (field.key === true) {
      def.key = true;
    }
    if (type === 'enum') {
      if (!Array.isArray(field.values) || field.values.some((v: unknown) => typeof v !== 'string')) {
        throw new Error(
          `Schema at ${filePath}: frontmatter.${key} is enum but "values" is not a string array`,
        );
      }
      def.values = field.values as string[];
    }
    if (typeof field.format === 'string') {
      def.format = field.format;
    }

    defs[key] = def;
  }

  return defs;
}
