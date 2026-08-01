# markbase — Developer Guidelines

## Project Overview

markbase is a markdown database — it adds schema, indexing, querying, and
updates to markdown files while keeping them as the source of truth.

- **Docs:** `docs/` (VitePress) — run `npm run docs:dev` to preview
- **Design doc:** `~/.fyi/design/markdowndb/design.md`
- **Project tracking:** `~/.fyi/work/projects/markbase/`

## Architecture

The markbase server is the single process that owns the index. All clients
talk to it via REST API.

```
src/core/       — Data model, parsing, indexing, querying
src/server/     — HTTP server (owns the index, runs the pipeline)
src/sdk/        — REST client library (typed HTTP client for the server API)
src/cli/        — CLI (uses SDK to talk to server)
src/mcp/        — MCP server (uses SDK to talk to server)
```

Key data flow inside the server:
`.md file → MarkdownParser → MarkdownDocument → SchemaMapper → MdRecord → Indexer → SQLite`

Client architecture:
```
markbase server (single index owner)
    ↑ REST API
    ├── CLI        (uses SDK)
    ├── MCP server (uses SDK)
    └── any future client
```

See `docs/guide/architecture.md` and `docs/guide/data-model.md` for details.

## Development Guidelines

### CLI and MCP server parity
The CLI and MCP server must expose the same functionality and evolve
together. When adding a new capability (e.g. a new query feature),
it should be available through both interfaces. The SDK (REST client)
is the shared implementation — CLI and MCP server are thin wrappers
that translate their interface (CLI args, MCP tool calls) into SDK calls.

### Docs-alongside-code
Update documentation in the same commit as the code change. Every new
feature, field type, or query capability should be reflected in:
- `docs/guide/markdown-subset.md` (if new markdown features)
- `docs/guide/data-model.md` (if new data model concepts)
- `docs/reference/` (CLI, API, schema, config changes)

### Test strategy
- Unit tests per core module (`test/<module>.test.ts`)
- Integration test for the full pipeline (`test/integration.test.ts`)
- Real FYI validation test (`test/real-fyi.test.ts` — skipped if `~/.fyi` absent)
- Run `npm test` before committing

### Code style
- TypeScript with strict mode, ESM modules
- JSDoc on all public types, interfaces, and exported functions
- No comments explaining *what* — only *why* when non-obvious
- Prefer small, focused modules over large files

### Git workflow
- Commit and push directly to main (no PRs for now — PoC phase)
- One logical change per commit
- Commit message: imperative, first line summarizes the change

## Build & Test

```bash
npm install       # install dependencies
npm run build     # compile TypeScript
npm test          # run all tests
npm run docs:dev  # preview docs locally
```
