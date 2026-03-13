# Contributing to tracecat-mcp

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/adrojis/tracecat-mcp.git
cd tracecat-mcp
npm install
cp .env.example .env
# Edit .env with your Tracecat credentials
npm run dev
```

## Project Structure

```
src/
├── index.ts      # Entry point
├── server.ts     # Tool registration
├── client.ts     # HTTP client with auth
├── types.ts      # TypeScript interfaces
└── tools/        # One file per domain (12 files)
```

## Adding a New Tool

1. Find the appropriate file in `src/tools/` (or create one for a new domain)
2. Register the tool using `server.tool()` with:
   - A unique name prefixed with `tracecat_`
   - A clear description
   - Zod input schema
   - Handler function using `client.get/post/patch/delete`
3. If creating a new domain file, import and call its register function in `server.ts`
4. Build with `npm run build` and test manually

## Code Style

- TypeScript strict mode
- ES modules (`import`/`export`)
- Keep tool descriptions concise but informative — they're shown to AI assistants
- Follow existing patterns in `src/tools/` for consistency

## Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Build and test locally
5. Commit with a clear message
6. Open a PR against `main`

## Reporting Issues

- Use [GitHub Issues](https://github.com/adrojis/tracecat-mcp/issues)
- Include your Tracecat version and Node.js version
- Provide steps to reproduce the problem
- Redact any credentials or sensitive data from logs
