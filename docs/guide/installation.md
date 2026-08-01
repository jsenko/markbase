# Installation

## Prerequisites

- **Node.js** 18 or later
- **npm** 8 or later

## Install from source

Clone the repository, install dependencies, build, and link globally:

```bash
git clone https://github.com/jsenko/markbase.git
cd markbase
npm install
npm run build
npm link
```

This makes the `markbase` command available system-wide:

```bash
markbase --version
# 0.1.0
```

## Install from tarball

If you have a `.tgz` package (e.g. from `npm pack`):

```bash
npm install -g markbase-0.1.0.tgz
```

## Verify installation

```bash
markbase --help
```

You should see the available commands: `serve`, `query`, `get`, `reindex`.

## What gets installed

| Artifact | Description |
|----------|-------------|
| `markbase` | CLI executable (Node.js script) |
| `dist/` | Compiled JavaScript modules |
| `node_modules/` | Runtime dependencies (better-sqlite3, express, etc.) |

The `markbase` command is a thin Node.js script. It requires Node.js
to be available on the system.

## Uninstall

```bash
npm unlink -g markbase
# or, if installed from tarball:
npm uninstall -g markbase
```
