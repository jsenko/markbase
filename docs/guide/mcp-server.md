# MCP Server

markbase includes an [MCP](https://modelcontextprotocol.io/) server
that exposes its query capabilities to AI agents. The MCP server is a
thin wrapper — it uses the same SDK client as the CLI to talk to the
markbase server.

## Setup

### Claude Code

Add to your Claude Code MCP configuration
(`~/.claude/settings.json` or project `.claude/settings.json`):

```json
{
  "mcpServers": {
    "markbase": {
      "command": "markbase",
      "args": ["mcp", "--config", "/path/to/markbase.config.json"]
    }
  }
}
```

The `markbase mcp` command automatically starts the markbase server
if it's not already running.

### Manual

Start the markbase server, then run the MCP server separately:

```bash
# Terminal 1: start the server
markbase serve --config markbase.config.json

# Terminal 2: start MCP server (connects to running server)
markbase mcp --config markbase.config.json
```

## Available Tools

### `markbase_query`

Query a collection with filtering, field selection, and sorting.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `collection` | string | yes | Collection name |
| `where` | string | no | Filter expression |
| `select` | string[] | no | Fields to return |
| `sort` | string | no | Sort expression |

**Example prompt:** "Find all PRs assigned to jsenko with high importance"

The AI agent would call:
```json
{
  "name": "markbase_query",
  "arguments": {
    "collection": "prs",
    "where": "assignee=jsenko AND triage.importance=high",
    "select": ["pr", "title", "triage.importance", "lifecycle.state"]
  }
}
```

### `markbase_get`

Get a single record by collection and ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `collection` | string | yes | Collection name |
| `id` | string | yes | Record ID |

### `markbase_reindex`

Rebuild the index from source files. No parameters.

## Architecture

```
AI Agent (Claude, etc.)
    ↕ MCP protocol (stdio)
MCP Server (markbase mcp)
    ↕ REST API (SDK client)
markbase Server (markbase serve)
    ↕ SQLite index
Markdown Files (source of truth)
```

The MCP server never accesses the index directly — all queries go
through the markbase server's REST API via the shared SDK client.
