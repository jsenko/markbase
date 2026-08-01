# Schema Reference

Schemas define the structure of markdown files in a collection. markbase
uses JSON Schema files with additional properties for source configuration.

## Format

```json
{
  "name": "prs",
  "source": {
    "type": "directory",
    "path": "./prs/**/*.md"
  },
  "frontmatter": {
    "pr": { "type": "integer", "key": true },
    "repo": { "type": "string" },
    "title": { "type": "string" },
    "author": { "type": "string" },
    "status": { "type": "enum", "values": ["open", "closed", "merged"] },
    "created": { "type": "string", "format": "date" }
  }
}
```

## Top-level fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Schema name |
| `source` | object | yes | How files map to records |
| `frontmatter` | object | yes | Field definitions for YAML frontmatter |

## Source types

### `directory`

Each `.md` file in the path is one record.

```json
{
  "source": {
    "type": "directory",
    "path": "./prs/**/*.md"
  }
}
```

## Field types

| Type | SQLite mapping | Description |
|------|---------------|-------------|
| `string` | TEXT | Any text value |
| `integer` | INTEGER | Whole numbers |
| `boolean` | INTEGER (0/1) | Boolean values |
| `enum` | TEXT | String validated against `values` array |
| `date` | TEXT | ISO 8601 date string (`format: "date"`) |

## Field options

| Option | Type | Description |
|--------|------|-------------|
| `key` | boolean | Marks this field as the record identifier |
| `values` | string[] | Allowed values (for `enum` type) |
| `format` | string | Value format hint (e.g. `"date"`, `"uri"`) |
