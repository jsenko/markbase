# Architecture

## Data Flow

markbase processes markdown files through a pipeline with two distinct
data models: a **content model** that represents the markdown structure,
and a **record model** that represents typed, queryable data.

```
.md file
    │
    ▼
MarkdownParser        ← schema-agnostic, parses markdown structure
    │
    ▼
MarkdownDocument      ← content model: frontmatter, sections, body
    │
    ├──→ Validator    ← checks document against schema (future)
    │
    ▼
SchemaMapper          ← extracts and coerces fields using schema
    │
    ▼
MdRecord              ← record model: typed fields, file metadata
    │
    ▼
Indexer               ← persists records into SQLite
    │
    ▼
QueryEngine           ← filters, sorts, projects from the index
```

## Content Model (MarkdownDocument)

The content model captures what's *in* the markdown file, independent
of any schema. It's a structured representation of the file's
markdown features:

- **Frontmatter** — the raw YAML key-value pairs
- **Sections** — headings with their level, inline fields, and content
- **Body** — the full markdown content below the frontmatter

This model grows as markbase supports more markdown features (tables,
lists, nested sections), but it never depends on a schema.

## Record Model (MdRecord)

The record model is what gets indexed and queried. It's produced by
applying a schema to a MarkdownDocument:

- **id** — the record identifier (from a key field or file path)
- **fields** — typed values extracted from frontmatter and sections
- **meta** — file path and modification time

## Why Two Models?

Separating content from records enables:

1. **Validation** — check if a document matches a schema without indexing
2. **Write-back** — modify a field in the document structure, then
   serialize back to markdown without reformatting unrelated content
3. **Extensibility** — new markdown features extend the content model;
   new field types extend the record model; neither breaks the other

## Server Architecture

markbase runs as a server process that maintains the index:

```
markbase serve
    │
    ├── Config loader    ← reads markbase.config.json
    ├── Schema registry  ← loads and validates schema files
    ├── File scanner     ← finds files matching collection paths
    ├── Parser pipeline  ← MarkdownParser → SchemaMapper → MdRecord
    ├── SQLite indexer   ← builds and maintains the index
    ├── Query engine     ← executes queries against the index
    └── HTTP API         ← exposes endpoints for CLI and other clients
```

## Client Architecture

The markbase server is the single process that owns the index. All
clients communicate with it via the REST API, using the shared SDK
(a typed HTTP client).

```
markbase server (single index owner)
    ↑ REST API
    ├── CLI        (markbase query, get, reindex)
    ├── MCP server (markbase mcp — for AI agents)
    └── SDK        (MarkbaseClient — for custom integrations)
```

The MCP server auto-starts the markbase server if it's not running,
so a single `markbase mcp` command is sufficient for AI agent setups.
