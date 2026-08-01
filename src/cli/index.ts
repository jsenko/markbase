#!/usr/bin/env node

import { Command } from 'commander';
import { startServer } from '../server/index.js';

const DEFAULT_PORT = 4824;
const DEFAULT_CONFIG = 'markbase.config.json';

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
    const params = new URLSearchParams();
    if (options.where) params.set('where', options.where);
    if (options.select) params.set('select', options.select);
    if (options.sort) params.set('sort', options.sort);

    const url = `http://localhost:${DEFAULT_PORT}/collections/${collection}/query?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.json();
      console.error(`Error: ${body.error}`);
      process.exit(1);
    }

    const result = await response.json();
    console.log(JSON.stringify(result, null, 2));
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

    const url = `http://localhost:${DEFAULT_PORT}/collections/${collection}/records/${id}`;
    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.json();
      console.error(`Error: ${body.error}`);
      process.exit(1);
    }

    const result = await response.json();
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('reindex')
  .description('Rebuild the index from files')
  .action(async () => {
    const url = `http://localhost:${DEFAULT_PORT}/reindex`;
    const response = await fetch(url, { method: 'POST' });

    if (!response.ok) {
      const body = await response.json();
      console.error(`Error: ${body.error}`);
      process.exit(1);
    }

    console.log('Reindex complete.');
  });

program.parse();
