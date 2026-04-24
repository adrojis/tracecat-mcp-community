import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "../client.js";

export function registerFolderTools(server: McpServer, client: TracecatClient) {
  server.tool(
    "tracecat_list_folders",
    "List all workflow folders in the current workspace",
    {
      parent_path: z.string().optional().describe("Parent folder path (default: '/')"),
    },
    async ({ parent_path }) => {
      const folders = await client.get("/folders", { parent_path: parent_path ?? "/" });
      return { content: [{ type: "text", text: JSON.stringify(folders, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_create_folder",
    "Create a new workflow folder",
    {
      name: z.string().describe("Folder name"),
      parent_path: z.string().optional().describe("Parent folder path (default: '/')"),
    },
    async ({ name, parent_path }) => {
      const folder = await client.post("/folders", { name, parent_path: parent_path ?? "/" });
      return { content: [{ type: "text", text: JSON.stringify(folder, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_update_folder",
    "Rename a workflow folder",
    {
      folder_id: z.string().describe("Folder ID (UUID)"),
      name: z.string().describe("New folder name"),
    },
    async ({ folder_id, name }) => {
      const result = await client.patch(`/folders/${folder_id}`, { name });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_delete_folder",
    "Delete a workflow folder",
    {
      folder_id: z.string().describe("Folder ID (UUID)"),
      recursive: z.boolean().optional().describe("Delete folder and all contents recursively (default: false)"),
    },
    async ({ folder_id, recursive }) => {
      const result = await client.deleteWithBody(`/folders/${folder_id}`, { recursive: recursive ?? false });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_move_workflow_to_folder",
    "Move a workflow into a folder (or to root with '/')",
    {
      workflow_id: z.string().describe("Workflow ID"),
      folder_path: z.string().describe("Target folder path (e.g. '/Remediations' or '/' for root)"),
    },
    async ({ workflow_id, folder_path }) => {
      const result = await client.post(`/workflows/${workflow_id}/move`, { folder_path });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
