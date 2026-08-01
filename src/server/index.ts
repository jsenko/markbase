import express from 'express';
import { resolve, dirname } from 'node:path';
import { glob } from 'glob';
import {
  loadConfig,
  loadSchema,
  parseMarkdownFile,
  mapDocumentToRecord,
  Indexer,
  QueryEngine,
} from '../core/index.js';
import type { Schema, MdRecord } from '../core/index.js';

export interface ServerOptions {
  configPath: string;
  port: number;
}

/**
 * Start the markbase HTTP server.
 *
 * Loads the config, parses all registered collections into a SQLite index,
 * and exposes REST endpoints for querying, fetching, and reindexing.
 */
export async function startServer(options: ServerOptions): Promise<void> {
  const { configPath, port } = options;
  const configDir = dirname(resolve(configPath));

  const config = loadConfig(resolve(configPath));
  const indexer = new Indexer();
  const schemas = new Map<string, Schema>();

  for (const col of config.collections) {
    const schemaPath = resolve(configDir, col.schema);
    const schema = loadSchema(schemaPath);
    schemas.set(col.name, schema);

    const records = await scanCollection(configDir, col.path, schema, col.name);
    indexer.reindex(schema, records);
    console.log(`Indexed collection "${col.name}": ${records.length} records`);
  }

  const engine = new QueryEngine(indexer.getDatabase());
  const app = express();

  /** Query a collection with optional where/select/sort parameters. */
  app.get('/collections/:name/query', (req, res) => {
    const { name } = req.params;
    const schema = schemas.get(name);
    if (!schema) {
      res.status(404).json({ error: `Collection "${name}" not found` });
      return;
    }

    try {
      const where = req.query.where as string | undefined;
      const select = req.query.select
        ? (req.query.select as string).split(',')
        : undefined;
      const sort = req.query.sort as string | undefined;

      const result = engine.query(name, schema, { where, select, sort });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  /** Fetch a single record by collection name and record ID. */
  app.get('/collections/:name/records/:id', (req, res) => {
    const { name, id } = req.params;
    const schema = schemas.get(name);
    if (!schema) {
      res.status(404).json({ error: `Collection "${name}" not found` });
      return;
    }

    const record = engine.getById(name, schema, id);
    if (!record) {
      res.status(404).json({ error: `Record "${id}" not found in collection "${name}"` });
      return;
    }
    res.json(record);
  });

  /** Rebuild the index for all collections from their source files. */
  app.post('/reindex', async (req, res) => {
    try {
      for (const col of config.collections) {
        const schema = schemas.get(col.name)!;
        const records = await scanCollection(configDir, col.path, schema, col.name);
        indexer.reindex(schema, records);
        console.log(`Reindexed collection "${col.name}": ${records.length} records`);
      }
      res.json({ status: 'ok' });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.listen(port, () => {
    console.log(`markbase server listening on http://localhost:${port}`);
  });
}

/** Scan all markdown files matching a collection's path pattern and produce records. */
async function scanCollection(
  baseDir: string,
  pathPattern: string,
  schema: Schema,
  collectionName: string,
): Promise<MdRecord[]> {
  const pattern = resolve(baseDir, pathPattern);
  const files = await glob(pattern);
  const records: MdRecord[] = [];

  for (const filePath of files) {
    const { document, meta } = parseMarkdownFile(filePath);
    const record = mapDocumentToRecord(document, schema, collectionName, meta);
    records.push(record);
  }

  return records;
}
