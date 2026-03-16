#!/usr/bin/env node
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TracecatClient } from "./client.js";
import { createServer } from "./server.js";

// Load .env from the mcp_server directory (not cwd)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "..", ".env") });

const apiUrl = process.env.TRACECAT_API_URL ?? "http://localhost/api";
const username = process.env.TRACECAT_USERNAME ?? "";
const password = process.env.TRACECAT_PASSWORD ?? "";
const workspaceId = process.env.TRACECAT_WORKSPACE_ID ?? "";

if (!username || !password) {
  process.stderr.write(
    "TRACECAT_USERNAME and TRACECAT_PASSWORD environment variables are required\n"
  );
  process.exit(1);
}

const client = new TracecatClient(apiUrl, username, password, workspaceId);
const server = createServer(client);
const transport = new StdioServerTransport();

// Start MCP transport immediately - login happens lazily on first tool call
server.connect(transport).then(() => {
  process.stderr.write("[tracecat-mcp-community] MCP server ready (login will happen on first request)\n");
}).catch((error) => {
  process.stderr.write(`[tracecat-mcp-community] Fatal error: ${error}\n`);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
