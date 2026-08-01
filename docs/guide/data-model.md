# Data Model

This page explains how markbase turns markdown files into queryable data.
Understanding this model is key to designing your schemas and writing
effective queries.

## Core Concepts

markbase has three core concepts:

| Concept | What it is | Where it comes from |
|---------|-----------|---------------------|
| **Collection** | A named group of records with the same structure | Declared in your config and schema |
| **Record** | A single entity — one "row" of data | One markdown file (or one section of a multi-record file) |
| **Field** | A named, typed value on a record | Frontmatter key, section field, or section content |

These are the concepts you work with when querying. You don't need to
think about SQL, SQLite, or the index — those are implementation details.

```
Collection "prs"
├── Record 101
│   ├── pr: 101
│   ├── title: "Add retry logic"
│   ├── author: "alice"
│   ├── triage.importance: "high"
│   ├── lifecycle.state: "ready-for-review"
│   └── summary: "Adds exponential backoff..."
├── Record 102
│   ├── pr: 102
│   ├── title: "Fix null pointer"
│   └── ...
└── Record 103
    └── ...
```

## How Markdown Maps to the Data Model

### Collections

A collection is a set of markdown files that share the same structure.
You define a collection by pointing markbase at a directory of files
and giving it a schema that describes their structure.

```
Directory on disk              →  Collection
~/.fyi/work/prs/**/*.md        →  "prs"
~/.fyi/work/tasks/*.md         →  "tasks"
```

Each collection has:
- A **name** — used in queries (`markbase query prs`)
- A **path** — glob pattern that matches the source files
- A **schema** — defines what fields exist and where they come from

### Records

Each markdown file becomes one record in its collection. The record's
**ID** comes from the field marked `"key": true` in the schema. If no
key field exists, the file path is used as the ID.

```
File on disk                   →  Record
~/.fyi/work/prs/8686.md        →  Record with id "8686"
```

### Fields

Fields are the individual data points on a record. markbase extracts
them from three places in the markdown file:

#### 1. Frontmatter fields

YAML frontmatter at the top of the file. These become top-level fields
on the record, using the YAML key as the field name.

```markdown
---
pr: 8686
author: paoloantinori
assignee: jsenko
---
```

| Markdown | Field name | Value |
|----------|-----------|-------|
| `pr: 8686` | `pr` | `8686` |
| `author: paoloantinori` | `author` | `"paoloantinori"` |
| `assignee: jsenko` | `assignee` | `"jsenko"` |

#### 2. Section fields (structured)

Lines matching `- **key:** value` inside a `## Heading` section. These
become fields with dot-notation names: `section.field`.

```markdown
## Triage
- **importance:** high
- **reason:** Assigned to jsenko, operator area
```

| Markdown | Field name | Value |
|----------|-----------|-------|
| `- **importance:** high` | `triage.importance` | `"high"` |
| `- **reason:** Assigned...` | `triage.reason` | `"Assigned to jsenko, operator area"` |

The section name is lowercased in the field name. `## Automated Review`
with `- **auto-review:** reviewed` becomes `automated review.auto-review`.

#### 3. Section content (freetext)

The full text content of a section, stored as a single field named
after the section (lowercased). Useful for summaries, notes, history
logs — any content that isn't structured key-value pairs.

```markdown
## Summary

Introduces StrimziClusterWideInstaller to install Strimzi once
per cluster instead of 4x per kafka CI job.
```

| Markdown | Field name | Value |
|----------|-----------|-------|
| (section content) | `summary` | `"Introduces StrimziCluster..."` |

### Field Types

All field values are one of these types:

| Type | Example values | Schema declaration |
|------|---------------|-------------------|
| `string` | `"alice"`, `"some text"` | `{ "type": "string" }` |
| `integer` | `101`, `8686` | `{ "type": "integer" }` |
| `boolean` | `true`, `false` | `{ "type": "boolean" }` |
| `enum` | `"high"`, `"merged"` | `{ "type": "enum", "values": [...] }` |
| `date` | `"2025-03-15"` | `{ "type": "string", "format": "date" }` |

A field that is missing from the file has the value `null`.

## Querying the Data Model

Queries operate on collections and fields — the same concepts described
above. You don't need to know about the underlying storage.

```bash
# Find records in a collection where a field has a specific value
markbase query prs --where "assignee=jsenko"

# Filter by section fields using dot notation
markbase query prs --where "triage.importance=high AND lifecycle.state=ready-for-review"

# Select specific fields to return
markbase query prs --select "pr,title,triage.importance,lifecycle.state"

# Sort by any field
markbase query prs --sort "created:desc"

# Get a single record by ID
markbase get prs/8686
```

### Filter expressions

| Syntax | Meaning |
|--------|---------|
| `field=value` | Field equals value |
| `field!=value` | Field does not equal value |
| `expr AND expr` | Both conditions must match |

Field names in filters follow the same naming as described above:
bare names for frontmatter (`author`), dot notation for section fields
(`triage.importance`), and lowercased section names for freetext
(`summary`).

## Designing Your Schema

When modeling your data, think about:

1. **What is a record?** Each markdown file should represent one logical
   entity (a PR, a task, a contact). If a file contains multiple
   entities, it might need a different source type (future feature).

2. **What goes in frontmatter?** Core identity and metadata fields that
   every record has. These are the primary query targets.

3. **What goes in sections?** Group related fields under headings.
   Sections are a natural fit for categories of information
   (triage data, lifecycle state, review details).

4. **Structured vs. freetext?** If you'll query or filter by a field,
   make it structured (`- **key:** value`). If it's narrative content
   you just want to store and retrieve, make the section freetext.

5. **Field types** — use `string` as the default. Use `integer` for
   numeric IDs, `boolean` for flags, `enum` when you have a fixed set
   of values (validation coming in a future phase).

### Example: modeling a PR tracking file

```
Frontmatter (identity)     →  pr, repo, title, author, assignee, created
## Triage (structured)     →  triage.importance, triage.reason
## Lifecycle (structured)  →  lifecycle.state, lifecycle.flags
## Summary (freetext)      →  summary
## History (freetext)      →  history
```

## Advanced: SQL Mapping

::: details How the data model maps to SQLite (developer reference)

markbase stores the index in SQLite. This section documents how
the data model maps to SQL — useful for debugging or extending markbase,
but not needed for regular use.

### Collections → Tables

Each collection becomes a SQLite table with the collection name.

```sql
CREATE TABLE "prs" (
  _id TEXT PRIMARY KEY,      -- record ID
  _file_path TEXT NOT NULL,  -- source file path
  _mtime REAL NOT NULL,      -- file modification time
  ...                        -- one column per field
);
```

### Fields → Columns

Every field declared in the schema becomes a column. Column names
match the field names exactly (quoted to handle dots and spaces).

| Field | Column | SQLite type |
|-------|--------|-------------|
| `pr` (integer) | `"pr"` | INTEGER |
| `author` (string) | `"author"` | TEXT |
| `draft` (boolean) | `"draft"` | INTEGER (0/1) |
| `triage.importance` (string) | `"triage.importance"` | TEXT |
| `summary` (freetext) | `"summary"` | TEXT |

### Queries → SQL

Filter expressions are translated to parameterized SQL:

```
--where "author=alice AND triage.importance=high"
```
becomes:
```sql
SELECT * FROM "prs"
WHERE "author" = ? AND "triage.importance" = ?
-- params: ['alice', 'high']
```

Values are always passed as parameters, never interpolated into SQL.
Boolean values are converted to integers (0/1) for SQLite compatibility.

:::
