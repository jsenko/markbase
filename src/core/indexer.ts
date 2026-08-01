import Database from 'better-sqlite3';
import type { Schema, MdRecord, FieldDefinition } from './types.js';

export class Indexer {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  createTable(schema: Schema): void {
    const columns = [
      '_id TEXT PRIMARY KEY',
      '_file_path TEXT NOT NULL',
      '_mtime REAL NOT NULL',
    ];

    for (const [name, def] of Object.entries(schema.frontmatter)) {
      columns.push(`"${name}" ${sqliteType(def)}`);
    }

    this.db.exec(`DROP TABLE IF EXISTS "${schema.name}"`);
    this.db.exec(`CREATE TABLE "${schema.name}" (${columns.join(', ')})`);
  }

  insertRecords(collectionName: string, records: MdRecord[]): void {
    if (records.length === 0) return;

    const sample = records[0];
    const fieldNames = Object.keys(sample.fields);
    const allColumns = ['_id', '_file_path', '_mtime', ...fieldNames];
    const placeholders = allColumns.map(() => '?').join(', ');
    const quotedColumns = allColumns.map(c => `"${c}"`).join(', ');

    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO "${collectionName}" (${quotedColumns}) VALUES (${placeholders})`,
    );

    const insertMany = this.db.transaction((recs: MdRecord[]) => {
      for (const rec of recs) {
        const values = [
          rec.id,
          rec.meta.filePath,
          rec.meta.mtime,
          ...fieldNames.map(f => toSqliteValue(rec.fields[f])),
        ];
        stmt.run(...values);
      }
    });

    insertMany(records);
  }

  reindex(schema: Schema, records: MdRecord[]): void {
    this.createTable(schema);
    this.insertRecords(schema.name, records);
  }

  getDatabase(): Database.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }
}

function toSqliteValue(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value;
  return String(value);
}

function sqliteType(def: FieldDefinition): string {
  switch (def.type) {
    case 'integer':
      return 'INTEGER';
    case 'boolean':
      return 'INTEGER';
    case 'string':
    case 'enum':
    case 'date':
      return 'TEXT';
    default:
      return 'TEXT';
  }
}
