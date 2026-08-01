# What is markbase?

markbase is a thin database layer over markdown files. It provides database
semantics — schema, indexing, querying, updates — while keeping your
markdown files as the source of truth.

## Why?

Markdown has become the standard format for documentation, notes, AI agent
state, and structured knowledge. But working with markdown at scale hits
three walls:

- **No schema** — format specs are freeform prose, not machine-enforceable
- **No query language** — finding records requires grep, not a query
- **No atomic updates** — changing a field means sed/awk or custom scripts

Databases solve all three but sacrifice what makes markdown great:
human-readable, git-trackable, editable with any text editor, browsable
as files on disk.

markbase bridges this gap. Your files stay as plain markdown. The index is
derived, disposable, and rebuildable. Any editor can modify the files — the
index catches up.

## How it works

```
Markdown files ──→ Parser ──→ Records ──→ SQLite index
       ↑                         ↑              │
       │                      Schema             │
       │                                         ▼
       └──── Update ←── Validate ←──── Query results
```

1. **Define a schema** for your markdown files (JSON Schema)
2. **Register a collection** — tell markbase where the files are and which schema they use
3. **Start the server** — markbase parses the files, builds a SQLite index
4. **Query** — find, filter, sort, and aggregate using the CLI or API
5. **Update** — modify fields with schema validation; markbase writes back to the file

## Use cases

- AI agent workflows that store state in markdown files
- Knowledge bases and documentation with structured metadata
- Personal CRM, research notes, task tracking
- Any system where markdown files need database-like queries
