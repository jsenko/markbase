# Configuration

markbase uses a `markbase.config.json` file in the working directory.

## Format

```json
{
  "collections": [
    {
      "name": "prs",
      "path": "./prs/**/*.md",
      "schema": "./schemas/prs.json"
    }
  ]
}
```

## Fields

### `collections`

Array of collection registrations. Each entry:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Collection name, used in queries and API |
| `path` | string | yes | Glob pattern for markdown files (relative to config file) |
| `schema` | string | yes | Path to the JSON Schema file (relative to config file) |
