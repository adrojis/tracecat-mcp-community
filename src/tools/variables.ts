import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "../client.js";

export function registerVariableTools(server: McpServer, client: TracecatClient) {
  server.tool(
    "tracecat_list_variables",
    "List non-sensitive workspace variables (names + environments). For secret values use secrets tools instead.",
    {
      environment: z.string().optional().describe("Filter by environment (default: all environments)"),
    },
    async ({ environment }) => {
      const params: Record<string, string> = {};
      if (environment) params.environment = environment;
      const variables = await client.get("/variables", params);
      return { content: [{ type: "text", text: JSON.stringify(variables, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_search_variables",
    "Search variables by names, ids, or environment — returns full variable objects with values",
    {
      environment: z.string().optional().describe("Environment to search (default: 'default')"),
      names: z.array(z.string()).optional().describe("Variable names to match"),
      ids: z.array(z.string()).optional().describe("Variable UUIDs to match"),
    },
    async ({ environment, names, ids }) => {
      const params: Record<string, string> = {
        environment: environment ?? "default",
      };
      if (names?.length) params.names = names.join(",");
      if (ids?.length) params.ids = ids.join(",");
      const variables = await client.get("/variables/search", params);
      return { content: [{ type: "text", text: JSON.stringify(variables, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_get_variable",
    "Get a variable by name (returns full object including values)",
    {
      variable_name: z.string().describe("Variable name (snake_case)"),
      environment: z.string().optional().describe("Environment (default: 'default')"),
    },
    async ({ variable_name, environment }) => {
      const params: Record<string, string> = {};
      if (environment) params.environment = environment;
      const variable = await client.get(`/variables/${variable_name}`, params);
      return { content: [{ type: "text", text: JSON.stringify(variable, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_create_variable",
    "Create a non-sensitive variable (base URLs, project IDs, tenant defaults). For secrets use tracecat_create_secret.",
    {
      name: z.string().describe("Variable name (lowercase snake_case, e.g. 'jira', 'api_config')"),
      values: z.record(z.unknown()).describe("Key-value pairs, e.g. { base_url: 'https://...', tenant: 'foo' }"),
      environment: z.string().optional().describe("Environment (default: 'default')"),
      description: z.string().optional().describe("Description"),
    },
    async ({ name, values, environment, description }) => {
      const body: Record<string, unknown> = {
        name,
        values,
        environment: environment ?? "default",
      };
      if (description !== undefined) body.description = description;
      const result = await client.post("/variables", body);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_update_variable",
    "Update a variable's values, description, or environment",
    {
      variable_id: z.string().describe("Variable UUID"),
      name: z.string().optional().describe("New name"),
      values: z.record(z.unknown()).optional().describe("New key-value pairs (replaces existing)"),
      environment: z.string().optional().describe("New environment"),
      description: z.string().optional().describe("New description"),
    },
    async ({ variable_id, ...updates }) => {
      const body = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      const result = await client.post(`/variables/${variable_id}`, body);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_delete_variable",
    "Delete a variable permanently",
    {
      variable_id: z.string().describe("Variable UUID"),
    },
    async ({ variable_id }) => {
      const result = await client.delete(`/variables/${variable_id}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
