import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "../client.js";

export function registerExecutionTools(server: McpServer, client: TracecatClient) {
  server.tool(
    "tracecat_run_workflow",
    "Execute a workflow by ID with optional input payload",
    {
      workflow_id: z.string().describe("Workflow ID"),
      payload: z.record(z.unknown()).optional().describe("Input payload for the workflow execution"),
    },
    async ({ workflow_id, payload }) => {
      const result = await client.post(`/workflows/${workflow_id}/execute`, payload ?? {});
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_list_executions",
    "List workflow executions, optionally filtered by workflow ID",
    {
      workflow_id: z.string().optional().describe("Filter by workflow ID"),
      limit: z.number().optional().describe("Maximum number of results"),
    },
    async ({ workflow_id, limit }) => {
      const params: Record<string, string> = {};
      if (workflow_id) params.workflow_id = workflow_id;
      if (limit) params.limit = limit.toString();
      const executions = await client.get("/workflow-executions", params);
      return { content: [{ type: "text", text: JSON.stringify(executions, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_get_execution",
    "Get details of a specific workflow execution",
    {
      execution_id: z.string().describe("Execution ID"),
    },
    async ({ execution_id }) => {
      const execution = await client.get(`/workflow-executions/${execution_id}`);
      return { content: [{ type: "text", text: JSON.stringify(execution, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_cancel_execution",
    "Cancel a running workflow execution",
    {
      execution_id: z.string().describe("Execution ID"),
    },
    async ({ execution_id }) => {
      const result = await client.post(`/workflow-executions/${execution_id}/cancel`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_get_execution_compact",
    "Get compact execution details (lighter response with action-level status, inputs, results, errors)",
    {
      execution_id: z.string().describe("Execution ID"),
    },
    async ({ execution_id }) => {
      const execution = await client.get(`/workflow-executions/${execution_id}/compact`);
      return { content: [{ type: "text", text: JSON.stringify(execution, null, 2) }] };
    }
  );
}
