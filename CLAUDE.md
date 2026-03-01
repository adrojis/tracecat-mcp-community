# Tracecat MCP Server - Development Guide

## Purpose

MCP server connecting Claude Code to the Tracecat SOAR platform, providing 44 tools across 9 domains.

## Architecture

```
src/
├── index.ts          # Entry point - starts StdioTransport immediately
├── server.ts         # Creates McpServer and registers all tools
├── client.ts         # HTTP client with lazy init (login on first call)
├── types.ts          # TypeScript interfaces
└── tools/            # One file per domain
    ├── workflows.ts  # 7 tools
    ├── actions.ts    # 5 tools
    ├── cases.ts      # 7 tools
    ├── executions.ts # 5 tools
    ├── secrets.ts    # 5 tools
    ├── tables.ts     # 5 tables + 2 columns + 6 rows = 13 tools
    ├── webhooks.ts   # 1 tool
    ├── schedules.ts  # 5 tools
    └── system.ts     # 1 tool
```

## Auth

- Tracecat uses **session cookies** (`fastapiusersauth`), not API keys
- Login via `POST /auth/login` (form-urlencoded)
- Client uses **lazy init**: `ensureInitialized()` in `request()` - no login at startup

## Build & Run

```bash
npm install
npm run build        # tsc
node dist/index.js   # run directly
```

## Environment Variables (.env)

| Variable | Required | Default |
|---|---|---|
| `TRACECAT_API_URL` | No | `http://localhost/api` |
| `TRACECAT_USERNAME` | Yes | - |
| `TRACECAT_PASSWORD` | Yes | - |
| `TRACECAT_WORKSPACE_ID` | No | Auto-detected |

## API Quirks

- `workspace_id` must be a **query param**, not a header
- Action/Secret/Schedule updates use **POST**, not PATCH
- Action `inputs` must be a **YAML string**, not JSON
- Actions list: `GET /actions?workflow_id=...` (not nested under workflows)
