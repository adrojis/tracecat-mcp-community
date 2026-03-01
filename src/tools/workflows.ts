import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "../client.js";

export function registerWorkflowTools(server: McpServer, client: TracecatClient) {
  server.tool(
    "tracecat_list_workflows",
    "List all workflows in the current workspace",
    {},
    async () => {
      const workflows = await client.get("/workflows");
      return { content: [{ type: "text", text: JSON.stringify(workflows, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_create_workflow",
    "Create a new workflow",
    {
      title: z.string().describe("Workflow title"),
      description: z.string().optional().describe("Workflow description"),
    },
    async ({ title, description }) => {
      const workflow = await client.post("/workflows", { title, description: description ?? "" });
      return { content: [{ type: "text", text: JSON.stringify(workflow, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_get_workflow",
    "Get details of a specific workflow by ID",
    {
      workflow_id: z.string().describe("Workflow ID"),
    },
    async ({ workflow_id }) => {
      const workflow = await client.get(`/workflows/${workflow_id}`);
      return { content: [{ type: "text", text: JSON.stringify(workflow, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_update_workflow",
    "Update an existing workflow",
    {
      workflow_id: z.string().describe("Workflow ID"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      status: z.string().optional().describe("New status (online/offline)"),
    },
    async ({ workflow_id, ...updates }) => {
      const body = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      const workflow = await client.patch(`/workflows/${workflow_id}`, body);
      return { content: [{ type: "text", text: JSON.stringify(workflow, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_deploy_workflow",
    "Deploy (commit) a workflow to make it active",
    {
      workflow_id: z.string().describe("Workflow ID"),
    },
    async ({ workflow_id }) => {
      const result = await client.post(`/workflows/${workflow_id}/commit`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_export_workflow",
    "Export a workflow as YAML definition",
    {
      workflow_id: z.string().describe("Workflow ID"),
    },
    async ({ workflow_id }) => {
      const result = await client.get(`/workflows/${workflow_id}/definition`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_delete_workflow",
    "Delete a workflow permanently",
    {
      workflow_id: z.string().describe("Workflow ID"),
    },
    async ({ workflow_id }) => {
      const result = await client.delete(`/workflows/${workflow_id}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
