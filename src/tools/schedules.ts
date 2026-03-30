import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "../client.js";

export function registerScheduleTools(server: McpServer, client: TracecatClient) {
  server.tool(
    "tracecat_list_schedules",
    "List all schedules in the current workspace",
    {
      workflow_id: z.string().optional().describe("Filter by workflow ID"),
    },
    async ({ workflow_id }) => {
      const params: Record<string, string> = {};
      if (workflow_id) params.workflow_id = workflow_id;
      const schedules = await client.get("/schedules", params);
      return { content: [{ type: "text", text: JSON.stringify(schedules, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_create_schedule",
    "Create a new schedule for a workflow (cron or interval)",
    {
      workflow_id: z.string().describe("Workflow ID to schedule"),
      cron: z.string().optional().describe("Cron expression (e.g. '*/5 * * * *' for every 5 minutes, '0 */2 * * *' for every 2 hours)"),
      every: z.string().optional().describe("ISO 8601 duration string (e.g. 'PT5M' for 5 minutes, 'PT1H' for 1 hour, 'P1D' for 1 day). NOT shorthand like '5m'."),
      inputs: z.record(z.unknown()).optional().describe("Input payload for each scheduled run"),
    },
    async ({ workflow_id, cron, every, inputs }) => {
      const body: Record<string, unknown> = { workflow_id };
      if (cron) body.cron = cron;
      if (every) body.every = every;
      if (inputs) body.inputs = inputs;
      const result = await client.post("/schedules", body);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_get_schedule",
    "Get details of a specific schedule",
    {
      schedule_id: z.string().describe("Schedule ID"),
    },
    async ({ schedule_id }) => {
      const schedule = await client.get(`/schedules/${schedule_id}`);
      return { content: [{ type: "text", text: JSON.stringify(schedule, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_update_schedule",
    "Update a schedule (cron, interval, status, inputs)",
    {
      schedule_id: z.string().describe("Schedule ID"),
      cron: z.string().optional().describe("New cron expression (e.g. '*/5 * * * *')"),
      every: z.string().optional().describe("ISO 8601 duration (e.g. 'PT5M' for 5 minutes, 'PT1H' for 1 hour)"),
      inputs: z.record(z.unknown()).optional().describe("New input payload"),
      status: z.string().optional().describe("New status (online/offline)"),
    },
    async ({ schedule_id, ...updates }) => {
      const body = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      // Update uses POST, not PATCH
      const result = await client.post(`/schedules/${schedule_id}`, body);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_delete_schedule",
    "Delete a schedule",
    {
      schedule_id: z.string().describe("Schedule ID"),
    },
    async ({ schedule_id }) => {
      const result = await client.delete(`/schedules/${schedule_id}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
