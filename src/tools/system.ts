import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "../client.js";

export function registerSystemTools(server: McpServer, client: TracecatClient) {
  server.tool(
    "tracecat_health_check",
    "Check if the Tracecat API is running and healthy",
    {},
    async () => {
      try {
        const result = await client.get("/ready");
        return {
          content: [{ type: "text", text: `Tracecat is healthy: ${JSON.stringify(result)}` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Tracecat health check failed: ${error}` }],
          isError: true,
        };
      }
    }
  );
}
