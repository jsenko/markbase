# Supported Markdown

markbase operates on a subset of standard markdown. All supported features
are fully compatible with [CommonMark](https://commonmark.org) and
[GFM](https://github.github.com/gfm/) — nothing renders oddly in GitHub,
VS Code, Obsidian, or any other viewer.

This page lists every markdown feature and whether markbase understands it
for data extraction. Features are added incrementally; this page is updated
with each release.

## Feature Matrix

| Markdown feature | CommonMark/GFM spec | markbase support | Used for |
|-----------------|---------------------|------------------|----------|
| YAML frontmatter | `---` delimiters | **Phase 1** | Record fields |
| Headings (`#`, `##`, ...) | CommonMark §4.2 | **Phase 2** | Section boundaries |
| Bold key-value (`- **key:** value`) | CommonMark §6.4 + §5.3 | **Phase 2** | Section fields |
| Paragraphs / freetext | CommonMark §4.8 | **Phase 2** | Freetext section content |
| Horizontal rules (`---`) | CommonMark §4.1 | Planned (future) | Record delimiters |
| Bullet lists (`- item`) | CommonMark §5.3 | Planned (future) | Array fields |
| GFM tables | GFM §4.10 | Planned (future) | Embedded structured data |
| Inline formatting (bold, italic, code) | CommonMark §6 | Not extracted | Preserved in content |
| Links | CommonMark §6.5 | Not extracted | Preserved in content |
| Images | CommonMark §6.6 | Not extracted | Preserved in content |
| Code blocks (fenced, indented) | CommonMark §4.4–4.5 | Not extracted | Preserved in content |
| Block quotes | CommonMark §5.1 | Not extracted | Preserved in content |
| HTML comments (`<!-- -->`) | CommonMark §6.7 | Planned (future) | Metadata annotations |
| Ordered lists | CommonMark §5.3 | Not extracted | Preserved in content |

**Legend:**
- **Phase N** — supported in that phase, available now if phase is released
- **Planned** — will be supported in a future phase
- **Not extracted** — markbase does not extract data from this feature, but
  preserves it when reading and writing files

## Phase 1 — YAML Frontmatter

The initial release extracts structured data from YAML frontmatter only.
Everything below the frontmatter is treated as opaque content (preserved
but not parsed for fields).

### Format

YAML frontmatter is delimited by `---` at the very start of the file:

```markdown
---
pr: 101
repo: acme/widgets
title: Add retry logic
author: alice
assignee: bob
draft: false
created: 2025-03-15
---

# Document content here

This content is preserved but not parsed for fields in Phase 1.
```

### Supported value types

| Type | YAML example | Schema type | Notes |
|------|-------------|-------------|-------|
| Text | `title: Add retry logic` | `string` | Any text value |
| Number | `pr: 101` | `integer` | Whole numbers |
| Boolean | `draft: true` | `boolean` | `true` / `false` |
| Enumeration | `status: open` | `enum` | Validated against allowed values |
| Date | `created: 2025-03-15` | `string` with `format: "date"` | ISO 8601 date |

### Constraints

- Frontmatter must be the very first thing in the file (no leading whitespace or blank lines)
- Nested YAML objects and arrays in frontmatter are not supported in Phase 1
- All values are scalar (no lists or maps)

## Phase 2 — Sections

Phase 2 adds section parsing. Headings split the document into sections,
and structured fields within sections become queryable.

### Heading-delimited sections

Headings (`#`, `##`, etc.) define section boundaries. Each section runs
from one heading to the next heading of the same or higher level.

```markdown
## Triage
- **importance:** high
- **reason:** Critical bug in production

## Lifecycle
- **state:** ready-for-review
- **flags:** tested, approved
```

### Structured fields in sections

Lines matching `- **key:** value` inside a section are extracted as
structured fields. These are queryable with dot notation:

```bash
markbase query prs --where "triage.importance=high"
markbase query prs --select "pr,title,triage.importance,lifecycle.state"
```

### Freetext sections

Sections declared with `"_type": "freetext"` in the schema store
their entire content as a single text field. Any content that is not
a `- **key:** value` field is captured as freetext.

```markdown
## Summary

This PR adds retry logic with exponential backoff.
It includes unit tests for all timeout scenarios.
```

The content above becomes queryable as the field `summary`:

```bash
markbase query prs --select "pr,title,summary"
```

### Mixed sections

A section can have both structured fields and freetext content.
Fields are extracted, and everything else becomes the section's
freetext content.
