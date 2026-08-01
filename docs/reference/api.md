# REST API Reference

The markbase server exposes a REST API on `http://localhost:4824` (default).
All responses are JSON.

::: tip OpenAPI Spec
The full OpenAPI 3.0 specification is available at
[`/openapi.yaml`](/openapi.yaml) — use it with Swagger UI, Redoc,
or any OpenAPI-compatible tool.
:::

## Endpoints

### `GET /collections/:name/query`

Query records in a collection with optional filtering, projection, and sorting.

**Parameters:**

| Parameter | In | Required | Description |
|-----------|------|----------|-------------|
| `name` | path | yes | Collection name |
| `where` | query | no | Filter expression (e.g. `author=alice AND draft=false`) |
| `select` | query | no | Comma-separated fields to return (e.g. `pr,title,author`) |
| `sort` | query | no | Sort expression (e.g. `created:desc`) |

**Filter syntax:**
- `field=value` — equality
- `field!=value` — inequality
- Combine with `AND` (case-insensitive)

**Example:**
```bash
curl "http://localhost:4824/collections/prs/query?where=author%3Dalice&select=pr,title&sort=created:desc"
```

**Response:**
```json
{
  "records": [
    {
      "id": "103",
      "collectionName": "prs",
      "fields": { "pr": 103, "title": "Migrate to new auth provider" },
      "meta": { "filePath": "/path/to/103.md", "mtime": 1711929600000 }
    }
  ],
  "count": 1
}
```

---

### `GET /collections/:name/records/:id`

Fetch a single record by ID.

**Parameters:**

| Parameter | In | Required | Description |
|-----------|------|----------|-------------|
| `name` | path | yes | Collection name |
| `id` | path | yes | Record ID (key field value or file path) |

**Example:**
```bash
curl http://localhost:4824/collections/prs/records/101
```

**Response:** A single `MdRecord` object (same shape as query results).

---

### `POST /reindex`

Rebuild the index for all collections from their source files.

**Example:**
```bash
curl -X POST http://localhost:4824/reindex
```

**Response:**
```json
{ "status": "ok" }
```

## Error Responses

All errors return a JSON object with an `error` field:

```json
{ "error": "Unknown field \"nonexistent\" in collection \"prs\"" }
```

| Status | Meaning |
|--------|---------|
| 400 | Invalid filter expression or unknown field |
| 404 | Collection or record not found |
| 500 | Server error (e.g. reindex failure) |
