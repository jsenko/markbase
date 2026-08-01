import type Database from 'better-sqlite3';
import type { Schema, MdRecord, RecordFields } from './types.js';

export interface QueryOptions {
  where?: string;
  select?: string[];
  sort?: string;
}

export interface QueryResult {
  records: MdRecord[];
  count: number;
}

export class QueryEngine {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  query(collectionName: string, schema: Schema, options: QueryOptions = {}): QueryResult {
    const selectClause = buildSelectClause(options.select);
    const { whereClause, params } = buildWhereClause(options.where, schema);
    const orderClause = buildOrderClause(options.sort);

    const sql = `SELECT ${selectClause} FROM "${collectionName}" ${whereClause} ${orderClause}`;
    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];

    const records = rows.map(row => rowToRecord(row, collectionName, schema));
    return { records, count: records.length };
  }

  getById(collectionName: string, schema: Schema, id: string): MdRecord | null {
    const row = this.db.prepare(`SELECT * FROM "${collectionName}" WHERE _id = ?`).get(id) as
      | Record<string, unknown>
      | undefined;

    if (!row) return null;
    return rowToRecord(row, collectionName, schema);
  }
}

function buildSelectClause(select?: string[]): string {
  if (!select || select.length === 0) return '*';
  const columns = ['_id', '_file_path', '_mtime', ...select];
  return [...new Set(columns)].map(c => `"${c}"`).join(', ');
}

function buildWhereClause(
  where: string | undefined,
  schema: Schema,
): { whereClause: string; params: (string | number)[] } {
  if (!where) return { whereClause: '', params: [] };

  const params: (string | number)[] = [];
  const conditions: string[] = [];

  const parts = where.split(/\s+AND\s+/i);
  for (const part of parts) {
    const match = part.match(/^(\w+)\s*(!=|=)\s*(.+)$/);
    if (!match) {
      throw new Error(`Invalid filter expression: "${part}"`);
    }

    const [, field, op, value] = match;
    const fieldDef = schema.frontmatter[field];
    if (!fieldDef) {
      throw new Error(`Unknown field "${field}" in collection "${schema.name}"`);
    }

    const sqlOp = op === '!=' ? '!=' : '=';
    const coerced = coerceFilterValue(value, fieldDef.type);
    conditions.push(`"${field}" ${sqlOp} ?`);
    params.push(coerced);
  }

  return {
    whereClause: `WHERE ${conditions.join(' AND ')}`,
    params,
  };
}

function buildOrderClause(sort?: string): string {
  if (!sort) return '';
  const [field, dir] = sort.split(':');
  const direction = dir?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  return `ORDER BY "${field}" ${direction}`;
}

function coerceFilterValue(value: string, type: string): string | number {
  switch (type) {
    case 'integer':
      return parseInt(value, 10);
    case 'boolean':
      return value === 'true' ? 1 : 0;
    default:
      return value;
  }
}

function rowToRecord(
  row: Record<string, unknown>,
  collectionName: string,
  schema: Schema,
): MdRecord {
  const fields: RecordFields = {};

  for (const fieldName of Object.keys(schema.frontmatter)) {
    if (fieldName in row) {
      const val = row[fieldName];
      if (schema.frontmatter[fieldName].type === 'boolean') {
        fields[fieldName] = val === 1 ? true : val === 0 ? false : val as boolean;
      } else {
        fields[fieldName] = val as string | number | boolean | null;
      }
    }
  }

  return {
    id: row._id as string,
    collectionName,
    fields,
    meta: {
      filePath: row._file_path as string,
      mtime: row._mtime as number,
    },
  };
}
