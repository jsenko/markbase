import type { MdRecord } from '../core/types.js';

/** Query options matching the server's REST API parameters. */
export interface QueryOptions {
  where?: string;
  select?: string[];
  sort?: string;
}

export interface QueryResult {
  records: MdRecord[];
  count: number;
}

export interface MarkbaseClientOptions {
  /** Server base URL. Defaults to http://localhost:4824. */
  baseUrl?: string;
}

/**
 * Typed REST client for the markbase server API.
 *
 * All interaction with the markbase index goes through the server.
 * This client is used by the CLI, MCP server, and any future clients.
 */
export class MarkbaseClient {
  private baseUrl: string;

  constructor(options: MarkbaseClientOptions = {}) {
    this.baseUrl = (options.baseUrl || 'http://localhost:4824').replace(/\/$/, '');
  }

  /** Query a collection with optional filtering, projection, and sorting. */
  async query(collection: string, options: QueryOptions = {}): Promise<QueryResult> {
    const params = new URLSearchParams();
    if (options.where) params.set('where', options.where);
    if (options.select) params.set('select', options.select.join(','));
    if (options.sort) params.set('sort', options.sort);

    const url = `${this.baseUrl}/collections/${collection}/query?${params}`;
    return this.fetchJson(url);
  }

  /** Get a single record by collection and ID. */
  async get(collection: string, id: string): Promise<MdRecord> {
    const url = `${this.baseUrl}/collections/${collection}/records/${id}`;
    return this.fetchJson(url);
  }

  /** Trigger a full reindex of all collections. */
  async reindex(): Promise<{ status: string }> {
    const url = `${this.baseUrl}/reindex`;
    return this.fetchJson(url, { method: 'POST' });
  }

  private async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const body = await response.json() as T | { error: string };

    if (!response.ok) {
      const message = (body && typeof body === 'object' && 'error' in body)
        ? (body as { error: string }).error
        : `HTTP ${response.status}`;
      throw new MarkbaseError(message, response.status);
    }

    return body as T;
  }
}

export class MarkbaseError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'MarkbaseError';
  }
}
