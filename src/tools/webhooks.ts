import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "../client.js";

export function registerWebhookTools(server: McpServer, client: TracecatClient) {
  server.tool(
    "tracecat_get_webhook",
    "Get webhook details for a workflow (URL, status, methods)",
    {
      workflow_id: z.string().describe("Workflow ID"),
    },
    async ({ workflow_id }) => {
      const result = await client.get(`/workflows/${workflow_id}/webhook`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_update_webhook",
    "Update webhook settings for a workflow (status, methods, entrypoint, CIDR allowlist)",
    {
      workflow_id: z.string().describe("Workflow ID"),
      status: z.enum(["online", "offline"]).optional().describe("Webhook status: 'online' or 'offline'"),
      methods: z.array(z.enum(["GET", "POST"])).optional().describe("Allowed HTTP methods"),
      entrypoint_ref: z.string().optional().describe("Entrypoint action ref"),
    },
    async ({ workflow_id, ...updates }) => {
      const body = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      const result = await client.patch(`/workflows/${workflow_id}/webhook`, body);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

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
