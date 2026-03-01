import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "../client.js";

export function registerActionTools(server: McpServer, client: TracecatClient) {
  server.tool(
    "tracecat_list_actions",
    "List all actions for a given workflow",
    {
      workflow_id: z.string().describe("Workflow ID"),
    },
    async ({ workflow_id }) => {
      const actions = await client.get(`/actions`, { workflow_id });
      return { content: [{ type: "text", text: JSON.stringify(actions, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_create_action",
    "Create a new action in a workflow",
    {
      workflow_id: z.string().describe("Workflow ID"),
      type: z.string().describe("Action type (e.g. core.transform.reshape, core.http.request, core.script.run_python)"),
      title: z.string().describe("Action title"),
    },
    async ({ workflow_id, type, title }) => {
      const result = await client.post(`/actions`, { workflow_id, type, title });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_get_action",
    "Get details of a specific action by ID",
    {
      action_id: z.string().describe("Action ID"),
      workflow_id: z.string().describe("Workflow ID"),
    },
    async ({ action_id, workflow_id }) => {
      const action = await client.get(`/actions/${action_id}`, { workflow_id });
      return { content: [{ type: "text", text: JSON.stringify(action, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_update_action",
    "Update an existing action (title, description, inputs, control_flow). Note: inputs must be a YAML string, not a JSON object.",
    {
      action_id: z.string().describe("Action ID"),
      workflow_id: z.string().describe("Workflow ID"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      inputs: z.string().optional().describe("Action inputs as a YAML string (e.g. 'value: hello\\nurl: https://...')"),
      control_flow: z.object({
        run_if: z.string().nullable().optional().describe("Conditional expression"),
        for_each: z.string().nullable().optional().describe("Loop expression"),
        join_strategy: z.string().optional().describe("'all' or 'any'"),
        retry_policy: z.object({
          max_attempts: z.number().optional(),
          timeout: z.number().optional(),
          retry_until: z.string().nullable().optional(),
        }).optional(),
        start_delay: z.number().optional().describe("Delay in seconds before execution"),
      }).optional().describe("Control flow settings"),
    },
    async ({ action_id, workflow_id, ...updates }) => {
      const body = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      // Update uses POST, not PATCH
      const result = await client.post(`/actions/${action_id}`, body, { workflow_id });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_delete_action",
    "Delete an action from a workflow",
    {
      action_id: z.string().describe("Action ID"),
      workflow_id: z.string().describe("Workflow ID"),
    },
    async ({ action_id, workflow_id }) => {
      const result = await client.delete(`/actions/${action_id}`, { workflow_id });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
