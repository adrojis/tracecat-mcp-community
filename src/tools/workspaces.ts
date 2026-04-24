import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "../client.js";

export function registerWorkspaceTools(server: McpServer, client: TracecatClient) {
  server.tool(
    "tracecat_get_workspace",
    "Get the current workspace ID and base UI URL (useful for building workflow links)",
    {},
    async () => {
      const workspaceId = client.getWorkspaceId();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                workspace_id: workspaceId,
                ui_base_url: `http://localhost/workspaces/${workspaceId}`,
                workflow_url_pattern: `http://localhost/workspaces/${workspaceId}/workflows/{workflow_id}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "tracecat_list_workspaces",
    "List all workspaces accessible to the current user",
    {},
    async () => {
      const workspaces = await client.get("/workspaces");
      return { content: [{ type: "text", text: JSON.stringify(workspaces, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_create_workspace",
    "Create a new workspace",
    {
      name: z.string().describe("Workspace name"),
    },
    async ({ name }) => {
      const workspace = await client.post("/workspaces", { name });
      return { content: [{ type: "text", text: JSON.stringify(workspace, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_update_workspace",
    "Update a workspace (rename)",
    {
      workspace_id: z.string().describe("Workspace ID (UUID)"),
      name: z.string().describe("New workspace name"),
    },
    async ({ workspace_id, name }) => {
      const result = await client.patch(`/workspaces/${workspace_id}`, { name });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_delete_workspace",
    "Delete a workspace (IRREVERSIBLE — deletes all workflows, cases, and data inside)",
    {
      workspace_id: z.string().describe("Workspace ID (UUID)"),
    },
    async ({ workspace_id }) => {
      const result = await client.delete(`/workspaces/${workspace_id}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
