import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "../client.js";

export function registerGraphTools(server: McpServer, client: TracecatClient) {
  server.tool(
    "tracecat_get_graph",
    "Get the workflow graph (nodes, edges, positions, version). Use this to inspect the visual layout and connections between actions.",
    {
      workflow_id: z.string().describe("Workflow ID"),
    },
    async ({ workflow_id }) => {
      const graph = await client.get(`/workflows/${workflow_id}/graph`);
      return { content: [{ type: "text", text: JSON.stringify(graph, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_add_edges",
    "Add connections (edges) between actions in a workflow graph. source_type is 'trigger' for the trigger node or 'udf' for actions. source_handle can be 'success', 'error', or null (default).",
    {
      workflow_id: z.string().describe("Workflow ID"),
      edges: z.array(z.object({
        source_id: z.string().describe("Source node ID (trigger ID or action ID)"),
        source_type: z.enum(["trigger", "udf"]).describe("'trigger' for trigger node, 'udf' for action nodes"),
        target_id: z.string().describe("Target action ID"),
        source_handle: z.string().nullable().optional().describe("'success', 'error', or null (default)"),
      })).describe("Array of edges to add"),
    },
    async ({ workflow_id, edges }) => {
      const operations = edges.map((edge) => ({
        type: "add_edge" as const,
        payload: {
          source_id: edge.source_id,
          source_type: edge.source_type,
          target_id: edge.target_id,
          source_handle: edge.source_handle ?? null,
        } as Record<string, unknown>,
      }));
      const result = await client.patchGraph(workflow_id, operations);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_delete_edges",
    "Remove connections (edges) between actions in a workflow graph.",
    {
      workflow_id: z.string().describe("Workflow ID"),
      edges: z.array(z.object({
        source_id: z.string().describe("Source node ID"),
        source_type: z.enum(["trigger", "udf"]).describe("'trigger' or 'udf'"),
        target_id: z.string().describe("Target action ID"),
      })).describe("Array of edges to delete"),
    },
    async ({ workflow_id, edges }) => {
      const operations = edges.map((edge) => ({
        type: "delete_edge" as const,
        payload: {
          source_id: edge.source_id,
          source_type: edge.source_type,
          target_id: edge.target_id,
        } as Record<string, unknown>,
      }));
      const result = await client.patchGraph(workflow_id, operations);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_move_nodes",
    "Reposition action nodes in the workflow graph. Recommended layout: trigger at (500,0), first action at y>=300, 160px vertical spacing, 320px horizontal spacing for parallel nodes.",
    {
      workflow_id: z.string().describe("Workflow ID"),
      positions: z.array(z.object({
        action_id: z.string().describe("Action ID to reposition"),
        x: z.number().describe("X coordinate"),
        y: z.number().describe("Y coordinate"),
      })).describe("Array of node positions"),
    },
    async ({ workflow_id, positions }) => {
      const operations = [{
        type: "move_nodes" as const,
        payload: {
          positions: positions.map((p) => ({
            action_id: p.action_id,
            x: p.x,
            y: p.y,
          })),
        } as Record<string, unknown>,
      }];
      const result = await client.patchGraph(workflow_id, operations);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_update_trigger_position",
    "Reposition the trigger node in the workflow graph. Default recommended position is (500, 0).",
    {
      workflow_id: z.string().describe("Workflow ID"),
      x: z.number().describe("X coordinate"),
      y: z.number().describe("Y coordinate"),
    },
    async ({ workflow_id, x, y }) => {
      const operations = [{
        type: "update_trigger_position" as const,
        payload: { x, y } as Record<string, unknown>,
      }];
      const result = await client.patchGraph(workflow_id, operations);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
