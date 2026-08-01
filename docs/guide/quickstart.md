# Quick Start

::: warning
markbase is in early development. APIs and configuration formats may change.
:::

## Prerequisites

Install markbase following the [Installation](./installation) guide.
Verify it works:

```bash
markbase --version
```

## Your first collection

### 1. Create some markdown files

Create a directory with markdown files that share a common structure:

```bash
mkdir -p prs
```

Create `prs/101.md`:

```markdown
---
pr: 101
repo: acme/widgets
title: Add retry logic to API client
author: alice
assignee: bob
created: 2025-03-15
---

# Add retry logic to API client

This PR adds exponential backoff retry logic to the HTTP client.
```

### 2. Define a schema

Create `schemas/prs.json`:

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
    "assignee": { "type": "string" },
    "created": { "type": "string", "format": "date" }
  }
}
```

### 3. Create a configuration file

Create `markbase.config.json`:

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

### 4. Start the server and query

```bash
# Start the server
markbase serve

# In another terminal, query your collection
markbase query prs --where "author=alice"
markbase query prs --select "pr,title,author" --sort "created:desc"
markbase get prs/101
```
