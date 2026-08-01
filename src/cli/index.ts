#!/usr/bin/env node

import { resolve, dirname } from 'node:path';
import { Command } from 'commander';
import { glob } from 'glob';
import { startServer } from '../server/index.js';
import { startMcpServer } from '../mcp/index.js';
import { MarkbaseClient, MarkbaseError } from '../sdk/index.js';
import { loadConfig, loadSchema, parseMarkdownFile, validateDocument } from '../core/index.js';

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
  .command('mcp')
  .description('Start the MCP server (auto-starts markbase server if needed)')
  .option('-p, --port <port>', 'markbase server port', String(DEFAULT_PORT))
  .option('-c, --config <path>', 'Path to config file', DEFAULT_CONFIG)
  .action(async (options) => {
    await startMcpServer({
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

program
  .command('status')
  .description('Show collection stats and validation errors')
  .action(async () => {
    try {
      const result = await client.status();
      console.log(`Collections: ${result.collections.length}  Records: ${result.totalRecords}  Errors: ${result.totalErrors}`);
      for (const col of result.collections) {
        console.log(`\n  ${col.name}: ${col.recordCount} records, ${col.errorCount} errors`);
        for (const file of col.files) {
          console.log(`    ${file.filePath}`);
          for (const err of file.errors) {
            console.log(`      ${err.field}: ${err.message}`);
          }
        }
      }
    } catch (err) {
      handleError(err);
    }
  });

program
  .command('lint')
  .description('Validate files against their schemas (offline, no server needed)')
  .option('-c, --config <path>', 'Path to config file', DEFAULT_CONFIG)
  .action(async (options) => {
    const configPath = resolve(options.config);
    const configDir = dirname(configPath);
    const config = loadConfig(configPath);
    let totalErrors = 0;

    for (const col of config.collections) {
      const schema = loadSchema(resolve(configDir, col.schema));
      const pattern = resolve(configDir, col.path);
      const files = await glob(pattern);

      for (const filePath of files) {
        try {
          const { document } = parseMarkdownFile(filePath);
          const result = validateDocument(document, schema);
          if (!result.valid) {
            console.log(filePath);
            for (const err of result.errors) {
              console.log(`  ${err.field}: ${err.message}`);
            }
            totalErrors += result.errors.length;
          }
        } catch (err) {
          console.log(filePath);
          console.log(`  parse error: ${(err as Error).message}`);
          totalErrors++;
        }
      }
    }

    if (totalErrors > 0) {
      console.log(`\n${totalErrors} error(s) found.`);
      process.exit(1);
    } else {
      console.log('All files valid.');
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
