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

  server.tool(
    "tracecat_validate_workflow",
    "Validate a workflow WITHOUT deploying it. Checks actions, inputs, expressions, graph connectivity, and trigger connections. Returns errors and warnings.",
    {
      workflow_id: z.string().describe("Workflow ID"),
    },
    async ({ workflow_id }) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // 1. Fetch workflow
      let workflow: Record<string, unknown>;
      try {
        workflow = await client.get(`/workflows/${workflow_id}`) as Record<string, unknown>;
      } catch (e) {
        return {
          content: [{ type: "text", text: JSON.stringify({ valid: false, errors: [`Workflow not found: ${e}`], warnings: [] }, null, 2) }],
          isError: true,
        };
      }

      // 2. Fetch actions
      const actions = await client.get(`/actions`, { workflow_id }) as Array<{
        id: string;
        title: string;
        ref?: string;
        inputs?: Record<string, unknown> | null;
        control_flow?: {
          run_if?: string | null;
          for_each?: string | null;
        } | null;
      }>;

      if (actions.length === 0) {
        errors.push("Workflow has no actions");
        return {
          content: [{ type: "text", text: JSON.stringify({ valid: false, errors, warnings }, null, 2) }],
        };
      }

      // Build slug set for cross-referencing
      const slugs = new Set(actions.map((a) => a.ref ?? a.title.toLowerCase().replace(/\s+/g, "_")));

      // 3. Check each action
      for (const action of actions) {
        const label = action.title || action.id;

        // Check inputs — inputs can be a YAML string or an object
        const rawInputs = action.inputs as unknown;
        const hasInputs = rawInputs &&
          (typeof rawInputs === "string"
            ? (rawInputs as string).trim().length > 0
            : typeof rawInputs === "object" && Object.keys(rawInputs as Record<string, unknown>).length > 0);

        if (!hasInputs) {
          warnings.push(`Action "${label}" has empty inputs`);
        } else {
          // Check for unclosed expressions in input values
          const inputStr = JSON.stringify(action.inputs);
          const openCount = (inputStr.match(/\$\{\{/g) || []).length;
          const closeCount = (inputStr.match(/\}\}/g) || []).length;
          if (openCount !== closeCount) {
            errors.push(`Action "${label}" has unclosed expression(s): ${openCount} opening vs ${closeCount} closing`);
          }
        }

        // Check run_if references
        if (action.control_flow?.run_if) {
          const runIf = action.control_flow.run_if;
          const refs = runIf.match(/ACTIONS\.([a-zA-Z0-9_]+)/g);
          if (refs) {
            for (const ref of refs) {
              const slug = ref.replace("ACTIONS.", "");
              if (!slugs.has(slug)) {
                errors.push(`Action "${label}" run_if references unknown slug "${slug}"`);
              }
            }
          }
        }

        // Check for_each references
        if (action.control_flow?.for_each) {
          const forEach = action.control_flow.for_each;
          const refs = forEach.match(/ACTIONS\.([a-zA-Z0-9_]+)/g);
          if (refs) {
            for (const ref of refs) {
              const slug = ref.replace("ACTIONS.", "");
              if (!slugs.has(slug)) {
                errors.push(`Action "${label}" for_each references unknown slug "${slug}"`);
              }
            }
          }
        }
      }

      // 4. Fetch graph
      let graph: {
        trigger?: { id?: string };
        edges?: Array<{ source_id: string; target_id: string }>;
      };
      try {
        graph = await client.get(`/workflows/${workflow_id}/graph`) as typeof graph;
      } catch (e) {
        errors.push(`Could not fetch graph: ${e}`);
        return {
          content: [{ type: "text", text: JSON.stringify({ valid: errors.length === 0, errors, warnings }, null, 2) }],
        };
      }

      const edges = graph.edges ?? [];

      if (edges.length === 0) {
        errors.push("Graph has no edges — actions are not connected");
      } else {
        // Check trigger connection
        const triggerId = graph.trigger?.id;
        if (triggerId) {
          const triggerEdges = edges.filter((e) => e.source_id === triggerId);
          if (triggerEdges.length === 0) {
            errors.push("Trigger is not connected to any action");
          }
        }

        // Check for orphan nodes (not source or target of any edge)
        const connectedIds = new Set<string>();
        for (const edge of edges) {
          connectedIds.add(edge.source_id);
          connectedIds.add(edge.target_id);
        }
        for (const action of actions) {
          if (!connectedIds.has(action.id)) {
            warnings.push(`Action "${action.title || action.id}" is orphaned (no edges)`);
          }
        }
      }

      const valid = errors.length === 0;
      return {
        content: [{ type: "text", text: JSON.stringify({ valid, errors, warnings }, null, 2) }],
      };
    }
  );

  server.tool(
    "tracecat_autofix_workflow",
    "Validate a workflow and automatically fix common issues: orphan nodes (position + connect), disconnected trigger (connect to first action), unclosed expressions (close }}). Returns a report of fixes applied.",
    {
      workflow_id: z.string().describe("Workflow ID"),
      dry_run: z.boolean().optional().describe("If true, only report what would be fixed without applying changes (default: false)"),
    },
    async ({ workflow_id, dry_run }) => {
      const fixes: string[] = [];
      const unfixable: string[] = [];
      const dryMode = dry_run ?? false;

      // 1. Fetch workflow, actions, graph
      let actions: Array<{
        id: string;
        title: string;
        ref?: string;
        type?: string;
        inputs?: Record<string, unknown> | null;
        control_flow?: {
          run_if?: string | null;
          for_each?: string | null;
        } | null;
      }>;
      let graph: {
        trigger?: { id?: string };
        edges?: Array<{ source_id: string; target_id: string }>;
        metadata?: { version?: number };
      };

      try {
        actions = await client.get(`/actions`, { workflow_id }) as typeof actions;
        graph = await client.get(`/workflows/${workflow_id}/graph`) as typeof graph;
      } catch (e) {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: false, error: `Failed to fetch workflow data: ${e}` }, null, 2) }],
          isError: true,
        };
      }

      if (actions.length === 0) {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, fixes: [], message: "No actions to fix" }, null, 2) }],
        };
      }

      const edges = graph.edges ?? [];
      const triggerId = graph.trigger?.id;
      const graphOps: Array<{ type: string; payload: Record<string, unknown> }> = [];

      // 2. Check trigger connection
      if (triggerId) {
        const triggerEdges = edges.filter((e) => e.source_id === triggerId);
        if (triggerEdges.length === 0 && actions.length > 0) {
          fixes.push(`FIX: Connect trigger to first action "${actions[0].title}"`);
          graphOps.push({
            type: "add_edge",
            payload: {
              source_id: triggerId,
              source_type: "trigger",
              target_id: actions[0].id,
              source_handle: null,
            },
          });
        }
      }

      // 3. Find orphan nodes
      const connectedIds = new Set<string>();
      for (const edge of edges) {
        connectedIds.add(edge.source_id);
        connectedIds.add(edge.target_id);
      }

      // Find last connected action (to chain orphans after it)
      const targetIds = new Set(edges.map((e) => e.target_id));
      const sourceIds = new Set(edges.map((e) => e.source_id));
      let lastNodeId = "";
      let lastNodeType: "trigger" | "udf" = "udf";

      // Find leaf node (connected but not a source of any edge, excluding trigger)
      for (const action of actions) {
        if (connectedIds.has(action.id) && !sourceIds.has(action.id)) {
          lastNodeId = action.id;
        }
      }
      if (!lastNodeId && triggerId && edges.length > 0) {
        // Fallback: use last target in edge list
        lastNodeId = edges[edges.length - 1].target_id;
      }
      if (!lastNodeId && triggerId) {
        lastNodeId = triggerId;
        lastNodeType = "trigger";
      }

      // Calculate next Y position based on connected actions count
      const connectedCount = actions.filter((a) => connectedIds.has(a.id)).length;
      let nextY = 300 + connectedCount * 160;
      const positions: Array<{ action_id: string; x: number; y: number }> = [];

      for (const action of actions) {
        if (!connectedIds.has(action.id)) {
          fixes.push(`FIX: Connect orphan "${action.title}" after last node, position at (500, ${nextY})`);

          if (lastNodeId) {
            graphOps.push({
              type: "add_edge",
              payload: {
                source_id: lastNodeId,
                source_type: lastNodeType,
                target_id: action.id,
                source_handle: null,
              },
            });
          }

          positions.push({ action_id: action.id, x: 500, y: nextY });
          lastNodeId = action.id;
          lastNodeType = "udf";
          nextY += 160;
        }
      }

      if (positions.length > 0) {
        graphOps.push({
          type: "move_nodes",
          payload: { positions },
        });
      }

      // 4. Check unclosed expressions in action inputs
      for (const action of actions) {
        if (!action.inputs) continue;
        const inputStr = JSON.stringify(action.inputs);
        const openCount = (inputStr.match(/\$\{\{/g) || []).length;
        const closeCount = (inputStr.match(/\}\}/g) || []).length;

        if (openCount > closeCount) {
          // Try to fix by adding missing closing braces
          const diff = openCount - closeCount;
          let fixedStr = inputStr;
          // Find unclosed ${{ and add }} before the next quote or end
          for (let i = 0; i < diff; i++) {
            fixedStr = fixedStr.replace(/(\$\{\{[^}]*?)(")/g, "$1 }}$2");
          }

          try {
            const fixedInputs = JSON.parse(fixedStr);
            // Rebuild as YAML string for update
            const yamlLines: string[] = [];
            for (const [key, val] of Object.entries(fixedInputs)) {
              yamlLines.push(`${key}: ${typeof val === "string" ? val : JSON.stringify(val)}`);
            }

            if (!dryMode) {
              await client.post(`/actions/${action.id}`, { inputs: yamlLines.join("\n") }, { workflow_id });
            }
            fixes.push(`FIX: Closed ${diff} unclosed expression(s) in "${action.title}"`);
          } catch {
            unfixable.push(`Cannot auto-fix unclosed expressions in "${action.title}" — manual fix needed`);
          }
        }
      }

      // 5. Apply graph operations
      if (graphOps.length > 0 && !dryMode) {
        try {
          await client.patchGraph(workflow_id, graphOps);
        } catch (e) {
          return {
            content: [{ type: "text", text: JSON.stringify({
              success: false,
              error: `Graph operations failed: ${e}`,
              planned_fixes: fixes,
            }, null, 2) }],
            isError: true,
          };
        }
      }

      return {
        content: [{ type: "text", text: JSON.stringify({
          success: true,
          dry_run: dryMode,
          fixes_applied: fixes.length,
          fixes,
          unfixable,
          message: dryMode
            ? `${fixes.length} fix(es) identified (dry run — no changes applied)`
            : `${fixes.length} fix(es) applied successfully`,
        }, null, 2) }],
      };
    }
  );
}
