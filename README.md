# tracecat-mcp

**A Model Context Protocol (MCP) server for the [Tracecat](https://tracecat.com) SOAR platform — 49 tools across 12 domains.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/tracecat-mcp.svg)](https://www.npmjs.com/package/tracecat-mcp)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![Tests](https://img.shields.io/badge/tests-7%20passing-brightgreen.svg)](#testing)
[![Tracecat](https://img.shields.io/badge/Tracecat-v1.0.0--beta.31-purple.svg)](https://github.com/TracecatHQ/tracecat)
[![MCP](https://img.shields.io/badge/MCP-Server-green.svg)](https://modelcontextprotocol.io)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](#docker)

---

## What is this?

An [MCP server](https://modelcontextprotocol.io) that gives AI assistants (Claude Code, Claude Desktop, etc.) full control over a [Tracecat](https://github.com/TracecatHQ/tracecat) instance through natural language. Manage workflows, actions, cases, secrets, tables, schedules, and more — without leaving your editor.

- **49 tools** covering the full Tracecat API surface
- **Lazy authentication** — MCP transport starts instantly, login happens on first tool call
- **Auto workspace detection** — no manual workspace ID needed
- **Session cookie auth** — handles Tracecat's cookie-based auth transparently

---

## Tools

| Domain | Tools | Description |
|---|---|---|
| **Workflows** | 9 | List, create, get, update, deploy, export, delete, validate, autofix |
| **Actions** | 5 | List, create, get, update, delete workflow actions |
| **Executions** | 5 | Run workflows, list/get/cancel executions, compact view |
| **Cases** | 7 | List, create, get, update, delete cases; add/list comments |
| **Secrets** | 5 | Search, create, get, update, delete secrets |
| **Tables** | 5 | List, create, get, update, delete tables |
| **Columns** | 2 | Create, delete table columns |
| **Rows** | 6 | List, get, insert, update, delete, batch insert rows |
| **Schedules** | 5 | List, create, get, update, delete schedules |
| **Graph** | 3 | Add edges, move nodes, update trigger position |
| **Webhooks** | 1 | Generate/rotate webhook API keys |
| **Docs** | 2 | Search Tracecat docs, list available tool documentation |
| **Templates** | 2 | List and get community workflow templates |
| **System** | 1 | Health check |

> **Total: 49 tools** for complete Tracecat automation.

---

## Quick Start

### Option A: npx (fastest)

```bash
# Install globally
npm install -g tracecat-mcp
```

Create a `.env` file wherever you run from (or in the package directory):

```env
TRACECAT_API_URL=http://localhost/api
TRACECAT_USERNAME=your-email@example.com
TRACECAT_PASSWORD=your-password-here
TRACECAT_WORKSPACE_ID=              # Optional — auto-detected if omitted
```

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "tracecat": {
      "command": "npx",
      "args": ["-y", "tracecat-mcp"]
    }
  }
}
```

### Option B: From source

```bash
git clone https://github.com/adrojis/tracecat-mcp.git
cd tracecat-mcp
npm install
cp .env.example .env    # Edit with your credentials
npm run build
```

Add to your `.mcp.json`:

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

### Option C: Docker

```bash
git clone https://github.com/adrojis/tracecat-mcp.git
cd tracecat-mcp
docker build -t tracecat-mcp .
```

```json
{
  "mcpServers": {
    "tracecat": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "--env-file", "/path/to/.env", "tracecat-mcp"]
    }
  }
}
```

> **Security:** `.env` is gitignored and never committed. Never hardcode credentials in source files. See [SECURITY.md](SECURITY.md).

Then restart Claude Code and verify with `/mcp` — you should see the `tracecat` server with 49 tools.

---

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `TRACECAT_API_URL` | No | `http://localhost/api` | Tracecat API base URL |
| `TRACECAT_USERNAME` | **Yes** | — | Login email |
| `TRACECAT_PASSWORD` | **Yes** | — | Login password |
| `TRACECAT_WORKSPACE_ID` | No | Auto-detected | Workspace ID (uses first workspace if omitted) |

Credentials are loaded from `.env` via [dotenv](https://github.com/motdotla/dotenv). The `.env` file must be in the project root (next to `package.json`).

---

## Architecture

```
src/
├── index.ts          # Entry point — StdioTransport + env loading
├── server.ts         # McpServer creation + tool registration
├── client.ts         # HTTP client with lazy auth + auto workspace injection
├── types.ts          # TypeScript interfaces
└── tools/
    ├── workflows.ts  # Workflow CRUD + deploy/export/validate/autofix
    ├── actions.ts    # Action CRUD with YAML inputs
    ├── cases.ts      # Case management + comments
    ├── executions.ts # Run, list, cancel, inspect executions
    ├── secrets.ts    # Secret management
    ├── tables.ts     # Tables, columns, and rows
    ├── graph.ts      # Graph operations (edges, node positions)
    ├── webhooks.ts   # Webhook key rotation
    ├── schedules.ts  # Cron/interval scheduling
    ├── docs.ts       # Documentation search
    ├── templates.ts  # Community workflow templates
    └── system.ts     # Health check
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Lazy initialization** | MCP transport starts immediately; login happens on first tool call. Avoids blocking Claude Code startup. |
| **Session cookies** | Tracecat uses `fastapiusersauth` cookies, not API keys. The client handles login and cookie extraction automatically. |
| **YAML string inputs** | Action `inputs` are sent as YAML strings per the Tracecat API contract, not JSON objects. |
| **POST for updates** | Actions, secrets, and schedules use `POST` for updates instead of the conventional `PATCH`. |
| **Auto workspace injection** | `workspace_id` is auto-detected and injected as a query parameter on every request. |
| **Optimistic locking** | Graph operations read `base_version` before patching to prevent concurrent edit conflicts. |

---

## API Quirks

These behaviors differ from typical REST conventions and are handled transparently by the server:

| Quirk | Details |
|---|---|
| `workspace_id` as query param | Must be `?workspace_id=...`, not a header |
| POST for updates | `/actions/{id}`, `/secrets/{id}`, `/schedules/{id}` use POST |
| Actions list endpoint | `GET /actions?workflow_id=...` (not nested under `/workflows`) |
| Action inputs format | YAML string, not JSON object |
| Workflow list pagination | Returns `{ items: [...], next_cursor }`, not a plain array |

---

## Development

```bash
# Watch mode (auto-reload)
npm run dev

# Build TypeScript
npm run build

# Run directly
node dist/index.js
```

## Testing

```bash
npm run build
npm test
```

Tests use Node.js built-in test runner (no extra dependencies). See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Roadmap

This project is under active development. Tracecat's API surface evolves fast, and we intend to keep up — expect new tools, refinements, and breaking-change adaptations as the platform matures.

Planned areas of improvement:

- **More tools** — covering new Tracecat API endpoints as they ship
- **Better error handling** — structured error responses with actionable hints
- **OAuth/OIDC support** — for Tracecat instances using SSO instead of basic auth
- **npx one-liner** — `npx tracecat-mcp` for zero-install usage
- **Test suite** — automated integration tests against a live Tracecat instance

Contributions, issues, and feature requests are welcome.

---

## Related Projects

- [tracecat-skills](https://github.com/adrojis/tracecat-skills) — Claude Code skills for Tracecat workflow building
- [Tracecat](https://github.com/TracecatHQ/tracecat) — The open-source SOAR platform
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) — Model Context Protocol TypeScript SDK

---

## License

[MIT](LICENSE)
