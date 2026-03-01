# tracecat-mcp

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tracecat Compatible](https://img.shields.io/badge/Tracecat-v1.0.0--beta.9-purple.svg)](https://github.com/TracecatHQ/tracecat)
[![MCP](https://img.shields.io/badge/MCP-Server-green.svg)](https://modelcontextprotocol.io)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for the [Tracecat](https://tracecat.com) SOAR platform. Provides **44 tools** across 9 domains, enabling AI assistants to manage workflows, cases, actions, secrets, tables, and more through natural language.

## Tools

| Domain | Tools | Description |
|---|---|---|
| **Workflows** | 7 | List, create, get, update, deploy, export, delete workflows |
| **Actions** | 5 | List, create, get, update, delete workflow actions |
| **Executions** | 5 | Run workflows, list/get/cancel executions, compact view |
| **Cases** | 7 | List, create, get, update, delete cases; add/list comments |
| **Secrets** | 5 | Search, create, get, update, delete secrets |
| **Tables** | 5 | List, create, get, update, delete tables |
| **Columns** | 2 | Create, delete table columns |
| **Rows** | 6 | List, get, insert, update, delete, batch insert rows |
| **Schedules** | 5 | List, create, get, update, delete schedules |
| **Webhooks** | 1 | Generate/rotate webhook API keys |
| **System** | 1 | Health check |

> **Total: 44 tools** covering the full Tracecat API surface.

## Quick Start

```bash
# Clone
git clone https://github.com/adrojis/tracecat-mcp.git
cd tracecat-mcp

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Tracecat credentials

# Build
npm run build
```

Add to your Claude Code `.mcp.json`:

```json
{
  "mcpServers": {
    "tracecat": {
      "command": "node",
      "args": ["/absolute/path/to/tracecat-mcp/dist/index.js"]
    }
  }
}
```

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `TRACECAT_API_URL` | No | `http://localhost/api` | Tracecat API base URL |
| `TRACECAT_USERNAME` | **Yes** | - | Login email |
| `TRACECAT_PASSWORD` | **Yes** | - | Login password |
| `TRACECAT_WORKSPACE_ID` | No | Auto-detected | Workspace ID (uses first workspace if omitted) |

Credentials are loaded from `.env` in the project root via [dotenv](https://github.com/motdotla/dotenv).

## Architecture

```
src/
├── index.ts          # Entry point — StdioTransport + env loading
├── server.ts         # McpServer creation + tool registration
├── client.ts         # HTTP client with lazy auth
├── types.ts          # TypeScript interfaces
└── tools/
    ├── workflows.ts  # Workflow CRUD + deploy/export
    ├── actions.ts    # Action CRUD with YAML inputs
    ├── cases.ts      # Case management + comments
    ├── executions.ts # Run, list, cancel, inspect executions
    ├── secrets.ts    # Secret management
    ├── tables.ts     # Tables, columns, and rows
    ├── webhooks.ts   # Webhook key rotation
    ├── schedules.ts  # Cron/interval scheduling
    └── system.ts     # Health check
```

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Lazy initialization** | MCP transport starts immediately; login happens on first tool call. Avoids blocking Claude Code startup. |
| **Session cookies** | Tracecat uses `fastapiusersauth` cookies, not API keys. The client handles login and cookie extraction automatically. |
| **YAML string inputs** | Action `inputs` are sent as YAML strings per the Tracecat API contract, not JSON objects. |
| **POST for updates** | Actions, secrets, and schedules use `POST` for updates instead of the conventional `PATCH`. |
| **Auto workspace injection** | `workspace_id` is auto-detected and injected as a query parameter on every request. |

## API Quirks

These behaviors differ from typical REST conventions and are handled by the server:

| Quirk | Details |
|---|---|
| `workspace_id` as query param | Must be `?workspace_id=...`, not a header |
| POST for updates | `/actions/{id}`, `/secrets/{id}`, `/schedules/{id}` use POST |
| Actions list endpoint | `GET /actions?workflow_id=...` (not nested under `/workflows`) |
| Action inputs format | YAML string, not JSON object |
| Workflow list pagination | Returns `{ items: [...], next_cursor }`, not a plain array |

## Development

```bash
# Watch mode (auto-reload)
npm run dev

# Build TypeScript
npm run build

# Run directly
node dist/index.js
```

## Related Projects

- [Tracecat](https://github.com/TracecatHQ/tracecat) - The open-source SOAR platform
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Model Context Protocol TypeScript SDK

## License

[MIT](LICENSE)
