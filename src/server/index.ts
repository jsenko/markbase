import express from 'express';
import { resolve, dirname } from 'node:path';
import { glob } from 'glob';
import chokidar from 'chokidar';
import {
  loadConfig,
  loadSchema,
  parseMarkdownFile,
  mapDocumentToRecord,
  validateDocument,
  Indexer,
  QueryEngine,
} from '../core/index.js';
import type { Schema, MdRecord } from '../core/index.js';
import { StatusTracker } from './status-tracker.js';

export interface ServerOptions {
  configPath: string;
  port: number;
}

/**
 * Start the markbase HTTP server.
 *
 * Loads the config, parses all registered collections into a SQLite index,
 * watches for file changes, validates on change, and exposes REST endpoints
 * for querying, fetching, reindexing, and status.
 */
export async function startServer(options: ServerOptions): Promise<void> {
  const { configPath, port } = options;
  const configDir = dirname(resolve(configPath));

  const config = loadConfig(resolve(configPath));
  const indexer = new Indexer();
  const schemas = new Map<string, Schema>();
  const collectionPaths = new Map<string, string>();
  const status = new StatusTracker();

  for (const col of config.collections) {
    const schemaPath = resolve(configDir, col.schema);
    const schema = loadSchema(schemaPath);
    schemas.set(col.name, schema);
    collectionPaths.set(col.name, resolve(configDir, col.path));

    const records = await scanAndIndex(indexer, status, configDir, col.path, schema, col.name);
    console.log(`Indexed collection "${col.name}": ${records} records`);
  }

  startWatchers(indexer, status, schemas, collectionPaths);

  const engine = new QueryEngine(indexer.getDatabase());
  const app = express();

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

  app.post('/reindex', async (req, res) => {
    try {
      for (const col of config.collections) {
        const schema = schemas.get(col.name)!;
        const records = await scanAndIndex(indexer, status, configDir, col.path, schema, col.name);
        console.log(`Reindexed collection "${col.name}": ${records} records`);
      }
      res.json({ status: 'ok' });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /** Return current server and validation status. */
  app.get('/status', (_req, res) => {
    res.json(status.getStatus());
  });

  app.listen(port, () => {
    console.log(`markbase server listening on http://localhost:${port}`);
  });
}

/**
 * Scan all files matching a collection path, validate, and index.
 * Returns the number of valid records indexed.
 */
async function scanAndIndex(
  indexer: Indexer,
  status: StatusTracker,
  baseDir: string,
  pathPattern: string,
  schema: Schema,
  collectionName: string,
): Promise<number> {
  const pattern = resolve(baseDir, pathPattern);
  const files = await glob(pattern);
  const records: MdRecord[] = [];

  for (const filePath of files) {
    const record = processFile(filePath, schema, collectionName, status);
    if (record) records.push(record);
  }

  indexer.reindex(schema, records);
  status.setRecordCount(collectionName, records.length);
  return records.length;
}

/** Parse, validate, and map a single file. Returns null if invalid. */
function processFile(
  filePath: string,
  schema: Schema,
  collectionName: string,
  status: StatusTracker,
): MdRecord | null {
  try {
    const { document, meta } = parseMarkdownFile(filePath);
    const validation = validateDocument(document, schema);

    status.setFileStatus(filePath, collectionName, validation.valid, validation.errors);

    if (!validation.valid) {
      console.warn(`Validation errors in ${filePath}: ${validation.errors.map(e => e.message).join('; ')}`);
      return null;
    }

    return mapDocumentToRecord(document, schema, collectionName, meta);
  } catch (err) {
    status.setFileStatus(filePath, collectionName, false, [
      { field: '_parse', message: (err as Error).message },
    ]);
    return null;
  }
}

/** Start chokidar watchers for all collection paths. */
function startWatchers(
  indexer: Indexer,
  status: StatusTracker,
  schemas: Map<string, Schema>,
  collectionPaths: Map<string, string>,
): void {
  for (const [collectionName, pattern] of collectionPaths) {
    const schema = schemas.get(collectionName)!;

    const watcher = chokidar.watch(pattern, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });

    watcher.on('add', (filePath) => {
      handleFileChange(filePath, schema, collectionName, indexer, status);
    });

    watcher.on('change', (filePath) => {
      handleFileChange(filePath, schema, collectionName, indexer, status);
    });

    watcher.on('unlink', (filePath) => {
      indexer.deleteByFilePath(collectionName, filePath);
      status.removeFile(filePath);
      console.log(`Removed ${filePath} from "${collectionName}"`);
    });

    console.log(`Watching collection "${collectionName}"`);
  }
}

/** Handle a file add or change: validate, then upsert or skip. */
function handleFileChange(
  filePath: string,
  schema: Schema,
  collectionName: string,
  indexer: Indexer,
  status: StatusTracker,
): void {
  const record = processFile(filePath, schema, collectionName, status);
  if (record) {
    indexer.upsertRecord(schema, record);
    console.log(`Updated ${filePath} in "${collectionName}"`);
  }
}
