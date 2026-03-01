import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "../client.js";

export function registerWebhookTools(server: McpServer, client: TracecatClient) {
  server.tool(
    "tracecat_create_webhook_key",
    "Generate or rotate a webhook API key for a workflow",
    {
      workflow_id: z.string().describe("Workflow ID"),
    },
    async ({ workflow_id }) => {
      const result = await client.post(`/workflows/${workflow_id}/webhook/api-key`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
