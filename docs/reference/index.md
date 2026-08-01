# CLI Reference

## `markbase serve`

Start the markbase server. Loads the configuration file, parses all
registered collections, builds the SQLite index, and listens for
HTTP requests.

```bash
markbase serve [--port <port>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--port` | `4824` | Port to listen on |
| `--config` | `markbase.config.json` | Path to config file |

## `markbase mcp`

Start the MCP server for AI agent integration. Communicates with the
markbase server via REST API. Auto-starts the markbase server if not
already running.

```bash
markbase mcp [--port <port>] [--config <path>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--port` | `4824` | markbase server port to connect to |
| `--config` | `markbase.config.json` | Config file (used if auto-starting server) |

The MCP server uses stdio transport (JSON-RPC over stdin/stdout).

## `markbase query`

Query a collection with filters, field selection, and sorting.

```bash
markbase query <collection> [--where <filter>] [--select <fields>] [--sort <field:order>]
```

| Option | Description | Example |
|--------|-------------|---------|
| `--where` | Filter expression | `"author=alice AND status!=closed"` |
| `--select` | Comma-separated fields to return | `"pr,title,author"` |
| `--sort` | Field and direction | `"created:desc"` |

Output: JSON array of matching records.

## `markbase get`

Get a single record by collection and ID.

```bash
markbase get <collection>/<id>
```

Output: JSON object of the matching record.

## `markbase reindex`

Rebuild the index from files.

```bash
markbase reindex [<collection>]
```

Reindexes all collections, or a specific one if named.
