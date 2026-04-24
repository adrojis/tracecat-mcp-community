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

  server.tool(
    "tracecat_list_case_tasks",
    "List all tasks attached to a case",
    {
      case_id: z.string().describe("Case ID"),
    },
    async ({ case_id }) => {
      const tasks = await client.get(`/cases/${case_id}/tasks`);
      return { content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_create_case_task",
    "Create a task on a case (checklist item / investigative step)",
    {
      case_id: z.string().describe("Case ID"),
      title: z.string().describe("Task title"),
      description: z.string().optional().describe("Task description (markdown supported)"),
      status: z.string().optional().describe("Initial status (e.g. 'pending', 'in_progress', 'done')"),
      assignee_id: z.string().optional().describe("User UUID to assign"),
      due_date: z.string().optional().describe("ISO 8601 datetime"),
    },
    async ({ case_id, ...fields }) => {
      const body = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== undefined)
      );
      const result = await client.post(`/cases/${case_id}/tasks`, body);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_update_case_task",
    "Update a case task (status, title, assignee, etc.)",
    {
      case_id: z.string().describe("Case ID"),
      task_id: z.string().describe("Task ID"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      status: z.string().optional().describe("New status"),
      assignee_id: z.string().optional().describe("New assignee UUID"),
      due_date: z.string().optional().describe("New due date (ISO 8601)"),
    },
    async ({ case_id, task_id, ...updates }) => {
      const body = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      const result = await client.patch(`/cases/${case_id}/tasks/${task_id}`, body);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_delete_case_task",
    "Delete a task from a case",
    {
      case_id: z.string().describe("Case ID"),
      task_id: z.string().describe("Task ID"),
    },
    async ({ case_id, task_id }) => {
      const result = await client.delete(`/cases/${case_id}/tasks/${task_id}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_list_case_fields",
    "List all custom case field definitions (workspace-scoped schema for case extras)",
    {},
    async () => {
      const fields = await client.get("/case-fields");
      return { content: [{ type: "text", text: JSON.stringify(fields, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_create_case_field",
    "Define a new custom case field (appears on every case). Common types: text, number, boolean, date, long_text, url, select.",
    {
      name: z.string().describe("Field name (snake_case)"),
      field_type: z.string().describe("Field type: text, number, boolean, date, long_text, url, select"),
      required: z.boolean().optional().describe("Whether this field is required on case closure"),
      default_value: z.unknown().optional().describe("Default value"),
      options: z.array(z.string()).optional().describe("Options for 'select' field type"),
      description: z.string().optional().describe("Field description / help text"),
    },
    async ({ name, field_type, required, default_value, options, description }) => {
      const body: Record<string, unknown> = { name, field_type };
      if (required !== undefined) body.required = required;
      if (default_value !== undefined) body.default_value = default_value;
      if (options !== undefined) body.options = options;
      if (description !== undefined) body.description = description;
      const result = await client.post("/case-fields", body);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_update_case_field",
    "Update a custom case field definition",
    {
      field_id: z.string().describe("Field ID (UUID)"),
      name: z.string().optional().describe("New name"),
      required: z.boolean().optional().describe("Required on closure"),
      default_value: z.unknown().optional().describe("New default value"),
      options: z.array(z.string()).optional().describe("New options (select type)"),
      description: z.string().optional().describe("New description"),
    },
    async ({ field_id, ...updates }) => {
      const body = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      const result = await client.patch(`/case-fields/${field_id}`, body);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_delete_case_field",
    "Delete a custom case field definition (IRREVERSIBLE — drops the field from all cases)",
    {
      field_id: z.string().describe("Field ID (UUID)"),
    },
    async ({ field_id }) => {
      const result = await client.delete(`/case-fields/${field_id}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
