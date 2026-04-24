import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "../client.js";

export function registerIntegrationTools(server: McpServer, client: TracecatClient) {
  server.tool(
    "tracecat_list_integrations",
    "List all configured OAuth integrations for the current user",
    {},
    async () => {
      const integrations = await client.get("/integrations");
      return { content: [{ type: "text", text: JSON.stringify(integrations, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_get_integration",
    "Get integration details (provider config, connection status, grant type) for a specific provider",
    {
      provider_id: z.string().describe("Provider ID (e.g. 'microsoft_graph', 'slack', 'custom_myprovider')"),
    },
    async ({ provider_id }) => {
      const integration = await client.get(`/integrations/${provider_id}`);
      return { content: [{ type: "text", text: JSON.stringify(integration, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_test_integration",
    "Test a client_credentials integration's connection without consuming tokens. For authorization_code integrations this may not apply.",
    {
      provider_id: z.string().describe("Provider ID"),
    },
    async ({ provider_id }) => {
      const result = await client.post(`/integrations/${provider_id}/test`, {});
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_disconnect_integration",
    "Revoke an integration's OAuth tokens while preserving its configuration (reconnectable via UI)",
    {
      provider_id: z.string().describe("Provider ID"),
    },
    async ({ provider_id }) => {
      const result = await client.post(`/integrations/${provider_id}/disconnect`, {});
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_delete_integration",
    "Remove an integration entirely (configuration + tokens). Use disconnect if you only want to revoke tokens.",
    {
      provider_id: z.string().describe("Provider ID"),
    },
    async ({ provider_id }) => {
      const result = await client.delete(`/integrations/${provider_id}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_list_providers",
    "List all available OAuth providers (both built-in and custom) that can be used to create integrations",
    {},
    async () => {
      const providers = await client.get("/providers");
      return { content: [{ type: "text", text: JSON.stringify(providers, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_get_provider",
    "Get provider metadata — scopes, auth endpoints, schema — for building integration configuration",
    {
      provider_id: z.string().describe("Provider ID"),
    },
    async ({ provider_id }) => {
      const provider = await client.get(`/providers/${provider_id}`);
      return { content: [{ type: "text", text: JSON.stringify(provider, null, 2) }] };
    }
  );
}
