# Personal Context Manager

An MCP (Model Context Protocol) server that provides persistent personal context storage across AI conversations. It allows AI assistants to remember user preferences, project conventions, and other personal information between sessions.

## Features

- **Persistent Storage** — Context entries are saved to a local JSON file and survive across conversations
- **Upsert by Key** — Automatically creates or updates entries based on key, avoiding duplicates
- **Keyword Search** — Search across keys, values, and tags to find relevant context
- **Tagging** — Organize entries with optional tags for easier retrieval
- **Atomic Writes** — Uses tmp-file + rename to prevent data corruption

## Tools

| Tool | Description |
|------|-------------|
| `update_context` | Add or update a context entry by key |
| `get_context` | Search entries by keyword |
| `list_contexts` | List all stored entries |
| `delete_context` | Delete an entry by ID |

## Setup

### Install

```bash
npm install
npm run build
```

### Configure in Claude Code

Add to your MCP settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "personal-context-manager": {
      "command": "node",
      "args": ["/path/to/personal-context-manager/dist/index.js"]
    }
  }
}
```

### Data Location

Context data is stored at `~/.personal-context-manager/contexts.json` by default.

Override with the `CONTEXT_MANAGER_DATA_DIR` environment variable:

```json
{
  "mcpServers": {
    "personal-context-manager": {
      "command": "node",
      "args": ["/path/to/personal-context-manager/dist/index.js"],
      "env": {
        "CONTEXT_MANAGER_DATA_DIR": "/custom/path"
      }
    }
  }
}
```

## License

MIT
