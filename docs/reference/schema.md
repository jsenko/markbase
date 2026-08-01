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
    "created": { "type": "string", "format": "date" }
  },
  "sections": {
    "Triage": {
      "importance": { "type": "string" },
      "reason": { "type": "string" }
    },
    "Summary": { "_type": "freetext" }
  }
}
```

## Top-level fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Schema name |
| `source` | object | yes | How files map to records |
| `frontmatter` | object | yes | Field definitions for YAML frontmatter |
| `sections` | object | no | Section definitions keyed by heading name |

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

## Section definitions

Sections are keyed by their heading text (e.g. `"Triage"` matches `## Triage`).
Heading matching is case-insensitive.

### Structured sections

Declare field definitions, same as frontmatter fields. Fields are extracted
from `- **key:** value` lines within the section.

```json
{
  "Triage": {
    "importance": { "type": "string" },
    "reason": { "type": "string" }
  }
}
```

Queried with dot notation: `triage.importance`, `triage.reason`.

### Freetext sections

The entire section content is stored as a single TEXT column.

```json
{
  "Summary": { "_type": "freetext" }
}
```

Queried by lowercased section name: `summary`.

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

## Field naming

| Source | Field name pattern | Example |
|--------|-------------------|---------|
| Frontmatter | `fieldname` | `author`, `pr`, `created` |
| Structured section | `section.field` | `triage.importance`, `lifecycle.state` |
| Freetext section | `section` | `summary`, `history` |
