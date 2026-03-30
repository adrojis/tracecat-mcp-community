import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "../client.js";

export function registerSecretTools(server: McpServer, client: TracecatClient) {
  server.tool(
    "tracecat_search_secrets",
    "Search for secrets by name or type",
    {
      name: z.string().optional().describe("Filter by secret name"),
      environment: z.string().optional().describe("Environment to search in (default: 'default')"),
    },
    async ({ name, environment }) => {
      const params: Record<string, string> = {
        environment: environment ?? "default",
      };
      if (name) params.name = name;
      const secrets = await client.get("/secrets/search", params);
      return { content: [{ type: "text", text: JSON.stringify(secrets, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_create_secret",
    "Create a new secret",
    {
      name: z.string().describe("Secret name"),
      type: z.string().optional().describe("Secret type (custom, token, oauth2, mtls, ca-cert)"),
      description: z.string().optional().describe("Secret description"),
      environment: z.string().optional().describe("Environment (default: 'default')"),
      keys: z.array(z.object({
        key: z.string().describe("Key name"),
        value: z.string().describe("Key value"),
      })).describe("Key-value pairs for the secret"),
    },
    async ({ name, type, description, environment, keys }) => {
      const body = {
        name,
        type: type ?? "custom",
        description: description ?? "",
        environment: environment ?? "default",
        keys,
      };
      const result = await client.post("/secrets", body);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_get_secret",
    "Get a secret by name (returns metadata, not decrypted values)",
    {
      secret_name: z.string().describe("Secret name"),
    },
    async ({ secret_name }) => {
      const secret = await client.get(`/secrets/${secret_name}`);
      return { content: [{ type: "text", text: JSON.stringify(secret, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_update_secret",
    "Update an existing secret's keys, description, or environment",
    {
      secret_id: z.string().describe("Secret ID (UUID)"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      environment: z.string().optional().describe("Environment (e.g. 'default')"),
      keys: z.array(z.object({
        key: z.string().describe("Key name"),
        value: z.string().describe("Key value"),
      })).optional().describe("New key-value pairs"),
    },
    async ({ secret_id, ...updates }) => {
      const body = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      const result = await client.post(`/secrets/${secret_id}`, body);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_delete_secret",
    "Delete a secret permanently",
    {
      secret_id: z.string().describe("Secret ID (UUID)"),
    },
    async ({ secret_id }) => {
      const result = await client.delete(`/secrets/${secret_id}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
