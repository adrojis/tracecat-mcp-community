import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "../client.js";

export function registerCaseTools(server: McpServer, client: TracecatClient) {
  server.tool(
    "tracecat_list_cases",
    "List all cases in the current workspace",
    {
      limit: z.number().optional().describe("Maximum number of results"),
      status: z.string().optional().describe("Filter by status (new, in_progress, resolved, closed)"),
    },
    async ({ limit, status }) => {
      const params: Record<string, string> = {};
      if (limit) params.limit = limit.toString();
      if (status) params.status = status;
      const cases = await client.get("/cases", params);
      return { content: [{ type: "text", text: JSON.stringify(cases, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_create_case",
    "Create a new case",
    {
      workflow_id: z.string().describe("Workflow ID to associate with"),
      case_title: z.string().describe("Title of the case"),
      payload: z.record(z.unknown()).optional().describe("Case payload data"),
      malice: z.string().optional().describe("Malice level (benign, malicious, unknown)"),
      status: z.string().optional().describe("Initial status"),
      priority: z.string().optional().describe("Priority level (low, medium, high, critical)"),
      action: z.string().optional().describe("Recommended action"),
    },
    async ({ workflow_id, case_title, payload, malice, status, priority, action }) => {
      const body: Record<string, unknown> = {
        workflow_id,
        case_title,
        payload: payload ?? {},
        malice: malice ?? "unknown",
        status: status ?? "new",
        priority: priority ?? "medium",
        action: action ?? "",
      };
      const result = await client.post("/cases", body);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_update_case",
    "Update an existing case",
    {
      case_id: z.string().describe("Case ID"),
      case_title: z.string().optional().describe("New title"),
      status: z.string().optional().describe("New status"),
      priority: z.string().optional().describe("New priority"),
      malice: z.string().optional().describe("New malice level"),
      action: z.string().optional().describe("New action"),
    },
    async ({ case_id, ...updates }) => {
      const body = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      const result = await client.patch(`/cases/${case_id}`, body);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_add_comment",
    "Add a comment to a case",
    {
      case_id: z.string().describe("Case ID"),
      content: z.string().describe("Comment content"),
    },
    async ({ case_id, content }) => {
      const result = await client.post(`/cases/${case_id}/comments`, { content });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_get_case",
    "Get details of a specific case by ID",
    {
      case_id: z.string().describe("Case ID"),
    },
    async ({ case_id }) => {
      const caseData = await client.get(`/cases/${case_id}`);
      return { content: [{ type: "text", text: JSON.stringify(caseData, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_delete_case",
    "Delete a case permanently",
    {
      case_id: z.string().describe("Case ID"),
    },
    async ({ case_id }) => {
      const result = await client.delete(`/cases/${case_id}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_list_comments",
    "List all comments on a case",
    {
      case_id: z.string().describe("Case ID"),
    },
    async ({ case_id }) => {
      const comments = await client.get(`/cases/${case_id}/comments`);
      return { content: [{ type: "text", text: JSON.stringify(comments, null, 2) }] };
    }
  );
}
