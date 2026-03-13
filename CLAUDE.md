# Tracecat MCP Server - Development Guide

## Architecture

```
src/
├── index.ts          # Entry point - starts StdioTransport immediately
├── server.ts         # Creates McpServer and registers all tools
├── client.ts         # HTTP client with lazy init (login on first call)
├── types.ts          # TypeScript interfaces
└── tools/            # One file per domain (12 files, 49 tools)
```

## Auth

- Tracecat uses **session cookies** (`fastapiusersauth`), not API keys
- Login via `POST /auth/login` (form-urlencoded)
- Client uses **lazy init**: `ensureInitialized()` in `request()` — no login at startup

## Build & Run

```bash
npm install
npm run build        # tsc
node dist/index.js   # run directly
npm run dev          # watch mode with tsx
```

## Environment Variables (.env)

| Variable | Required | Default |
|---|---|---|
| `TRACECAT_API_URL` | No | `http://localhost/api` |
| `TRACECAT_USERNAME` | Yes | — |
| `TRACECAT_PASSWORD` | Yes | — |
| `TRACECAT_WORKSPACE_ID` | No | Auto-detected |

## API Quirks

- `workspace_id` must be a **query param**, not a header
- Action/Secret/Schedule updates use **POST**, not PATCH
- Action `inputs` must be a **YAML string**, not JSON
- Actions list: `GET /actions?workflow_id=...` (not nested under workflows)
- Graph operations use optimistic locking (`base_version`)
