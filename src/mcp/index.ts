import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { MarkbaseClient, MarkbaseError } from '../sdk/index.js';
import { ensureServerRunning } from './server-manager.js';

export interface McpOptions {
  configPath: string;
  port: number;
}

export async function startMcpServer(options: McpOptions): Promise<void> {
  const { configPath, port } = options;
  const baseUrl = `http://localhost:${port}`;

  await ensureServerRunning(configPath, port);

  const client = new MarkbaseClient({ baseUrl });
  const server = new McpServer(
    { name: 'markbase', version: '0.1.0' },
    {
      instructions: 'markbase is a markdown database. Use these tools to query and retrieve records from indexed markdown file collections.',
    },
  );

  server.tool(
    'markbase_query',
    'Query a collection of indexed markdown records. Supports filtering by field values, selecting specific fields, and sorting.',
    {
      collection: z.string().describe('Collection name (e.g. "prs")'),
      where: z.string().optional().describe('Filter expression (e.g. "author=alice AND triage.importance=high")'),
      select: z.array(z.string()).optional().describe('Fields to return (e.g. ["pr", "title", "triage.importance"])'),
      sort: z.string().optional().describe('Sort expression (e.g. "created:desc")'),
    },
    async ({ collection, where, select, sort }) => {
      try {
        const result = await client.query(collection, { where, select, sort });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'markbase_get',
    'Get a single record by collection name and record ID.',
    {
      collection: z.string().describe('Collection name (e.g. "prs")'),
      id: z.string().describe('Record ID (e.g. "101")'),
    },
    async ({ collection, id }) => {
      try {
        const record = await client.get(collection, id);
        return { content: [{ type: 'text' as const, text: JSON.stringify(record, null, 2) }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.tool(
    'markbase_reindex',
    'Rebuild the index for all collections from their source markdown files.',
    {},
    async () => {
      try {
        await client.reindex();
        return { content: [{ type: 'text' as const, text: 'Reindex complete.' }] };
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function errorResult(err: unknown) {
  const message = err instanceof MarkbaseError ? err.message : String(err);
  return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
}
