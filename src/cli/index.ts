#!/usr/bin/env node

import { Command } from 'commander';
import { startServer } from '../server/index.js';
import { MarkbaseClient, MarkbaseError } from '../sdk/index.js';

const DEFAULT_PORT = 4824;
const DEFAULT_CONFIG = 'markbase.config.json';

const client = new MarkbaseClient({ baseUrl: `http://localhost:${DEFAULT_PORT}` });

const program = new Command();

program
  .name('markbase')
  .description('A markdown database')
  .version('0.1.0');

program
  .command('serve')
  .description('Start the markbase server')
  .option('-p, --port <port>', 'Port to listen on', String(DEFAULT_PORT))
  .option('-c, --config <path>', 'Path to config file', DEFAULT_CONFIG)
  .action(async (options) => {
    await startServer({
      configPath: options.config,
      port: parseInt(options.port, 10),
    });
  });

program
  .command('query <collection>')
  .description('Query a collection')
  .option('-w, --where <filter>', 'Filter expression')
  .option('-s, --select <fields>', 'Comma-separated fields to return')
  .option('--sort <field:order>', 'Sort by field (e.g. created:desc)')
  .action(async (collection, options) => {
    try {
      const result = await client.query(collection, {
        where: options.where,
        select: options.select?.split(','),
        sort: options.sort,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  });

program
  .command('get <path>')
  .description('Get a single record (e.g. prs/101)')
  .action(async (path) => {
    const [collection, id] = path.split('/');
    if (!collection || !id) {
      console.error('Usage: markbase get <collection>/<id>');
      process.exit(1);
    }

    try {
      const result = await client.get(collection, id);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err);
    }
  });

program
  .command('reindex')
  .description('Rebuild the index from files')
  .action(async () => {
    try {
      await client.reindex();
      console.log('Reindex complete.');
    } catch (err) {
      handleError(err);
    }
  });

function handleError(err: unknown): void {
  if (err instanceof MarkbaseError) {
    console.error(`Error: ${err.message}`);
  } else {
    console.error(`Error: ${err}`);
  }
  process.exit(1);
}

program.parse();
