# markbase

A markdown database — schema, index, query, and update markdown files while
keeping them as the source of truth.

**Status:** Early development (Phase 1 — PoC)

## What it does

markbase adds database semantics to markdown files:

- **Schema** — define the structure of your markdown files with JSON Schema
- **Index** — automatically index files into a queryable SQLite store
- **Query** — find files by field values, filter, sort, aggregate
- **Update** — modify fields with validation, atomic writes

Your files stay as plain markdown. The index is derived, disposable,
rebuildable. Any editor can modify the files — the index catches up.

## Quick start

```bash
# Install
git clone https://github.com/jsenko/markbase.git
cd markbase
npm install
npm run build
npm link        # makes 'markbase' command available

# Start server (in a directory with markbase.config.json)
markbase serve

# Query (in another terminal)
markbase query prs --where "author=alice" --select "pr,title"
markbase get prs/101
```

## Documentation

See the [full documentation](https://jsenko.github.io/markbase/) for
installation, guides, API reference, and examples.

To run docs locally:

```bash
npm run docs:dev
```

## Uninstall

```bash
npm unlink -g markbase
```

## Development

```bash
npm install
npm run build
npm test
```

## License

[Apache-2.0](LICENSE)
