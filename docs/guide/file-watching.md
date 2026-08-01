# File Watching and Validation

The markbase server watches your markdown files for changes and keeps
the index up to date automatically. When a file changes, markbase
validates it against the schema before updating the index.

## How it works

```
File change detected (chokidar)
    │
    ▼
Parse markdown → MarkdownDocument
    │
    ▼
Validate against schema
    │
    ├── Valid → upsert record in index
    │
    └── Invalid → keep old index entry, flag error
```

**Key principle:** markbase never silently reverts user writes. The file
belongs to the user. If a file doesn't conform to the schema, markbase
flags the error but leaves the file as-is.

## What gets watched

The server watches all paths declared in your collection config.
Watching starts automatically with `markbase serve`.

- **File added** — parse, validate, index if valid
- **File changed** — re-parse, re-validate, update index if valid
- **File deleted** — remove from index

## Validation

Validation checks:

- **Field types** — integer fields must be numbers, booleans must be
  true/false
- **Enum values** — enum fields must use one of the declared allowed values
- **Section structure** — section fields must match the `- **key:** value`
  pattern

What is **not** an error:

- **Missing fields** — become `null` in the index
- **Extra fields** — ignored (not declared in schema = not indexed)

## Checking status

### Online (server running)

```bash
markbase status
```

Shows collection stats and any files with validation errors:

```
Collections: 1  Records: 41  Errors: 0

  prs: 41 records, 0 errors
```

If there are errors:

```
  prs: 40 records, 1 errors
    /path/to/broken-file.md
      status: value "invalid" not in allowed values: open, closed, merged
```

### Offline (no server)

```bash
markbase lint --config markbase.config.json
```

Validates all files against their schemas without starting the server.
Exits with code 1 if any errors are found.

## MCP

The `markbase_status` MCP tool exposes the same status information
to AI agents, so they can detect validation issues programmatically.
