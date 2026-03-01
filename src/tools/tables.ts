import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "../client.js";

export function registerTableTools(server: McpServer, client: TracecatClient) {
  // --- Table metadata ---

  server.tool(
    "tracecat_list_tables",
    "List all tables in the current workspace",
    {},
    async () => {
      const tables = await client.get("/tables");
      return { content: [{ type: "text", text: JSON.stringify(tables, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_create_table",
    "Create a new table",
    {
      name: z.string().describe("Table name"),
      description: z.string().optional().describe("Table description"),
    },
    async ({ name, description }) => {
      const result = await client.post("/tables", { name, description: description ?? "" });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_get_table",
    "Get details of a specific table by ID (includes columns)",
    {
      table_id: z.string().describe("Table ID"),
    },
    async ({ table_id }) => {
      const table = await client.get(`/tables/${table_id}`);
      return { content: [{ type: "text", text: JSON.stringify(table, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_update_table",
    "Update a table's name or description",
    {
      table_id: z.string().describe("Table ID"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
    },
    async ({ table_id, ...updates }) => {
      const body = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      const result = await client.patch(`/tables/${table_id}`, body);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_delete_table",
    "Delete a table",
    {
      table_id: z.string().describe("Table ID"),
    },
    async ({ table_id }) => {
      const result = await client.delete(`/tables/${table_id}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // --- Table columns ---

  server.tool(
    "tracecat_create_column",
    "Create a new column in a table",
    {
      table_id: z.string().describe("Table ID"),
      name: z.string().describe("Column name"),
      type: z.string().describe("Column type: TEXT, INTEGER, NUMERIC, DATE, BOOLEAN, TIMESTAMP, TIMESTAMPTZ, JSONB, UUID, SELECT, MULTI_SELECT"),
    },
    async ({ table_id, name, type }) => {
      const result = await client.post(`/tables/${table_id}/columns`, { name, type });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_delete_column",
    "Delete a column from a table",
    {
      table_id: z.string().describe("Table ID"),
      column_id: z.string().describe("Column ID"),
    },
    async ({ table_id, column_id }) => {
      const result = await client.delete(`/tables/${table_id}/columns/${column_id}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // --- Table rows ---

  server.tool(
    "tracecat_list_rows",
    "List rows in a table with optional pagination",
    {
      table_id: z.string().describe("Table ID"),
      limit: z.number().optional().describe("Maximum number of rows to return"),
      offset: z.number().optional().describe("Number of rows to skip"),
    },
    async ({ table_id, limit, offset }) => {
      const params: Record<string, string> = {};
      if (limit) params.limit = limit.toString();
      if (offset) params.offset = offset.toString();
      const rows = await client.get(`/tables/${table_id}/rows`, params);
      return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_get_row",
    "Get a specific row by ID from a table",
    {
      table_id: z.string().describe("Table ID"),
      row_id: z.string().describe("Row ID"),
    },
    async ({ table_id, row_id }) => {
      const row = await client.get(`/tables/${table_id}/rows/${row_id}`);
      return { content: [{ type: "text", text: JSON.stringify(row, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_insert_row",
    "Insert a new row into a table. Data keys must match existing column names.",
    {
      table_id: z.string().describe("Table ID"),
      data: z.record(z.unknown()).describe("Row data as key-value pairs matching column names"),
    },
    async ({ table_id, data }) => {
      const result = await client.post(`/tables/${table_id}/rows`, { data });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_update_row",
    "Update an existing row in a table",
    {
      table_id: z.string().describe("Table ID"),
      row_id: z.string().describe("Row ID"),
      data: z.record(z.unknown()).describe("Updated row data as key-value pairs"),
    },
    async ({ table_id, row_id, data }) => {
      const result = await client.patch(`/tables/${table_id}/rows/${row_id}`, { data });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_delete_row",
    "Delete a row from a table",
    {
      table_id: z.string().describe("Table ID"),
      row_id: z.string().describe("Row ID"),
    },
    async ({ table_id, row_id }) => {
      const result = await client.delete(`/tables/${table_id}/rows/${row_id}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "tracecat_batch_insert_rows",
    "Insert multiple rows into a table at once. Each row is a flat object with keys matching column names.",
    {
      table_id: z.string().describe("Table ID"),
      rows: z.array(z.record(z.unknown())).describe("Array of row objects (flat, keys = column names)"),
    },
    async ({ table_id, rows }) => {
      const result = await client.post(`/tables/${table_id}/rows/batch`, { rows });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
