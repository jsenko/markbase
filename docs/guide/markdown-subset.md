# Supported Markdown

markbase operates on a subset of standard markdown (CommonMark + GFM).
All supported features render cleanly in any markdown viewer — GitHub,
VS Code, Obsidian, or a plain text editor.

This page documents which markdown features markbase understands and
how they map to the data model.

## Phase 1 — Frontmatter

The initial release supports YAML frontmatter as the source of structured
data.

### YAML frontmatter

Delimited by `---` at the start of the file. Contains key-value pairs
that become record fields.

```markdown
---
pr: 101
repo: acme/widgets
title: Add retry logic
author: alice
assignee: bob
created: 2025-03-15
---

# Document content below...
```

**Supported field types:**

| Type | YAML example | Notes |
|------|-------------|-------|
| `string` | `title: Add retry logic` | Any text value |
| `integer` | `pr: 101` | Whole numbers |
| `boolean` | `draft: true` | `true` / `false` |
| `enum` | `status: open` | String validated against allowed values |
| `date` | `created: 2025-03-15` | ISO 8601 date string |

### What's not yet supported

The following markdown features are planned for future phases:

- **Section fields** (`- **key:** value` within `## Heading` sections)
- **Tables** (GFM tables as embedded structured data)
- **Lists** (bullet lists as array fields)
- **Record delimiters** (`---` horizontal rules splitting multi-record files)
- **Full-text search** (indexing body content for text search)

Each feature will be documented here as it becomes available.
