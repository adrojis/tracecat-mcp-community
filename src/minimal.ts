import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "tracecat", version: "1.0.0" });

server.tool("ping", "Returns pong", {}, async () => {
  return { content: [{ type: "text", text: "pong" }] };
});

const transport = new StdioServerTransport();
server.connect(transport);
