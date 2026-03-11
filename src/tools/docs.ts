import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "../client.js";

const DOCS: Record<string, string> = {
  action_types: `# Tracecat Action Types Reference

## Core Actions
| Type | Description | Key Inputs |
|------|-------------|------------|
| \`core.transform.reshape\` | Transform/reshape data | \`value\`: any expression |
| \`core.http_request\` | Make HTTP requests | \`url\`, \`method\`, \`headers\`, \`payload\` |
| \`core.send_email\` | Send email via SMTP | \`recipients\`, \`subject\`, \`body\` |
| \`core.workflow.execute\` | Execute another workflow | \`workflow_id\`, \`trigger_inputs\` |
| \`core.script.run_python\` | Run Python script | \`script\` (NOT \`code\`), \`inputs\`, \`dependencies\`, \`timeout_seconds\`, \`allow_network\` |
| \`core.cases.create_case\` | Create a case | \`workflow_id\`, \`case_title\`, \`payload\`, \`malice\`, \`status\`, \`priority\`, \`action\` |
| \`core.cases.update_case\` | Update a case | \`case_id\`, \`status\`, \`priority\`, \`malice\`, \`action\` |
| \`core.cases.create_comment\` | Add comment to case | \`case_id\`, \`content\` |

## Integration Actions (tools.*)
Format: \`tools.<provider>.<action>\`

Examples:
- \`tools.virustotal.get_file_report\` — VirusTotal file analysis
- \`tools.crowdstrike.list_detections\` — CrowdStrike detections
- \`tools.slack.post_message\` — Slack notification
- \`tools.abuseipdb.check_ip\` — AbuseIPDB lookup
- \`tools.greynoise.lookup_ip\` — GreyNoise IP context

## IMPORTANT
- HTTP request type is \`core.http_request\` (underscore, NOT \`core.http.request\`)
- Python script field is \`script\` (NOT \`code\`)
- Always use native action types (core.cases.*) before falling back to core.http_request`,

  expressions: `# Tracecat Expressions Reference

## Syntax
All expressions use: \`\${{ CONTEXT.path }}\`

## Contexts
| Context | Description | Example |
|---------|-------------|--------|
| \`TRIGGER\` | Webhook/schedule input data | \`\${{ TRIGGER.alert.source_ip }}\` |
| \`ACTIONS\` | Results from previous actions | \`\${{ ACTIONS.my_action.result }}\` |
| \`ACTIONS.*.error\` | Error from failed action | \`\${{ ACTIONS.my_action.error }}\` |
| \`SECRETS\` | Secret values | \`\${{ SECRETS.my_secret.API_KEY }}\` |
| \`ENV\` | Environment variables | \`\${{ ENV.MY_VAR }}\` |
| \`FN\` | Built-in functions | \`\${{ FN.is_empty(TRIGGER.data) }}\` |

## Nested Access
- Dot notation: \`\${{ ACTIONS.enrich.result.data.score }}\`
- Dynamic context: \`\${{ ACTIONS.enrich.result }}\` returns full result object

## In YAML Inputs
\`\`\`yaml
url: https://api.example.com/\${{ TRIGGER.ip }}
headers:
  Authorization: Bearer \${{ SECRETS.api_creds.TOKEN }}
payload:
  ip: \${{ TRIGGER.source_ip }}
  previous_score: \${{ ACTIONS.score_ip.result.score }}
\`\`\`

## In Control Flow (run_if)
\`\`\`yaml
# Truthy check (NOT == true)
run_if: \${{ ACTIONS.check_ip.result }}
# Falsy check (NOT == false)
run_if: \${{ not ACTIONS.check_ip.result }}
# Comparison
run_if: \${{ ACTIONS.score.result.score > 70 }}
# Logical operators: && and || (NOT 'and'/'or')
run_if: \${{ ACTIONS.is_malicious.result && ACTIONS.is_public.result }}
\`\`\``,

  functions: `# Tracecat Built-in Functions (FN.*)

## String Functions
| Function | Description | Example |
|----------|-------------|--------|
| \`FN.upper(s)\` | Uppercase | \`\${{ FN.upper(TRIGGER.name) }}\` |
| \`FN.lower(s)\` | Lowercase | \`\${{ FN.lower(TRIGGER.name) }}\` |
| \`FN.contains(s, sub)\` | Check substring | \`\${{ FN.contains(TRIGGER.url, "malware") }}\` |
| \`FN.format(fmt, ...)\` | Format string | \`\${{ FN.format("IP: {}", TRIGGER.ip) }}\` |
| \`FN.regex_match(pattern, s)\` | Regex match | \`\${{ FN.regex_match("\\\\d+", TRIGGER.text) }}\` |
| \`FN.regex_not_match(pattern, s)\` | Regex no match | \`\${{ FN.regex_not_match("safe", TRIGGER.text) }}\` |

## Type / Conversion Functions
| Function | Description | Example |
|----------|-------------|--------|
| \`FN.is_empty(v)\` | Check if null/empty | \`\${{ FN.is_empty(ACTIONS.x.result) }}\` |
| \`FN.is_not_empty(v)\` | Check if not empty | \`\${{ FN.is_not_empty(ACTIONS.x.result) }}\` |
| \`FN.serialize_json(v)\` | Object → JSON string | \`\${{ FN.serialize_json(ACTIONS.x.result) }}\` |
| \`FN.deserialize_json(s)\` | JSON string → object | \`\${{ FN.deserialize_json(TRIGGER.raw) }}\` |
| \`FN.to_int(v)\` | Convert to integer | \`\${{ FN.to_int(TRIGGER.count) }}\` |
| \`FN.to_float(v)\` | Convert to float | \`\${{ FN.to_float(TRIGGER.score) }}\` |

## Network Functions
| Function | Description | Example |
|----------|-------------|--------|
| \`FN.ipv4_is_public(ip)\` | Check if IPv4 is public | \`\${{ FN.ipv4_is_public(TRIGGER.ip) }}\` |
| \`FN.ipv4_in_subnet(ip, cidr)\` | Check if in subnet | \`\${{ FN.ipv4_in_subnet(TRIGGER.ip, "10.0.0.0/8") }}\` |

## Collection Functions
| Function | Description | Example |
|----------|-------------|--------|
| \`FN.length(list)\` | Length of list | \`\${{ FN.length(ACTIONS.x.result) }}\` |
| \`FN.flatten(list)\` | Flatten nested list | \`\${{ FN.flatten(ACTIONS.x.result) }}\` |
| \`FN.unique(list)\` | Deduplicate list | \`\${{ FN.unique(ACTIONS.x.result) }}\` |
| \`FN.join(list, sep)\` | Join list to string | \`\${{ FN.join(ACTIONS.x.result, ", ") }}\` |

## Math Functions
| Function | Description | Example |
|----------|-------------|--------|
| \`FN.add(a, b)\` | Addition | \`\${{ FN.add(ACTIONS.x.result, 1) }}\` |
| \`FN.sub(a, b)\` | Subtraction | \`\${{ FN.sub(ACTIONS.x.result, 1) }}\` |
| \`FN.less_than(a, b)\` | a < b | \`\${{ FN.less_than(ACTIONS.x.result, 50) }}\` |
| \`FN.greater_than(a, b)\` | a > b | \`\${{ FN.greater_than(ACTIONS.x.result, 50) }}\` |

## Conditional
| Function | Description | Example |
|----------|-------------|--------|
| \`FN.conditional(cond, a, b)\` | Ternary | \`\${{ FN.conditional(ACTIONS.x.result, "yes", "no") }}\` |`,

  control_flow: `# Tracecat Control Flow Reference

## Conditional Execution (run_if)
Only execute an action if the condition is truthy.

\`\`\`yaml
# In action update control_flow:
control_flow:
  run_if: \${{ ACTIONS.check_ip.result }}
\`\`\`

### Important Rules
- Do NOT use \`== true\` or \`== false\`
- Use truthy: \`\${{ ACTIONS.x.result }}\`
- Use falsy: \`\${{ not ACTIONS.x.result }}\`
- Logical AND: \`\${{ A && B }}\` (NOT \`and\`)
- Logical OR: \`\${{ A || B }}\` (NOT \`or\`)
- Comparisons: \`\${{ ACTIONS.score.result > 70 }}\`

## Loops (for_each)
Iterate over a list, executing the action once per item.

\`\`\`yaml
control_flow:
  for_each: \${{ ACTIONS.list_ips.result }}
\`\`\`

The current item is available as \`\${{ ACTIONS.current_action.result }}\` within the loop body.

## Join Strategy
When multiple parent actions converge, control when the child executes.

\`\`\`yaml
control_flow:
  join_strategy: all   # Wait for ALL parents (default)
  # or
  join_strategy: any   # Execute as soon as ANY parent completes
\`\`\`

## Retry Policy
Retry a failed action automatically.

\`\`\`yaml
control_flow:
  retry_policy:
    max_attempts: 3      # Total attempts (including first)
    timeout: 30          # Timeout per attempt in seconds
    retry_until: null    # Optional expression that stops retries when truthy
\`\`\`

## Start Delay
Delay execution by N seconds.

\`\`\`yaml
control_flow:
  start_delay: 5   # Wait 5 seconds before executing
\`\`\`

## Error Paths
Branch on action failure using source_handle in edges:

- \`success\` — execute when parent succeeds
- \`error\` — execute when parent fails

Access error data: \`\${{ ACTIONS.failed_action.error }}\`

## Complete Example
\`\`\`yaml
# Action with all control flow options
control_flow:
  run_if: \${{ ACTIONS.should_proceed.result }}
  for_each: \${{ ACTIONS.get_ips.result }}
  join_strategy: all
  retry_policy:
    max_attempts: 3
    timeout: 60
  start_delay: 2
\`\`\``,

  common_mistakes: `# Tracecat Common Mistakes — Top 15

## 1. Wrong HTTP request action type
- **Wrong:** \`core.http.request\` (dot)
- **Right:** \`core.http_request\` (underscore)

## 2. Python script field name
- **Wrong:** \`code: "def main()..."\`
- **Right:** \`script: "def main()..."\`

## 3. Boolean comparisons in run_if
- **Wrong:** \`run_if: \${{ ACTIONS.x.result == true }}\`
- **Right:** \`run_if: \${{ ACTIONS.x.result }}\`
- **Wrong:** \`run_if: \${{ ACTIONS.x.result == false }}\`
- **Right:** \`run_if: \${{ not ACTIONS.x.result }}\`

## 4. Logical operators in expressions
- **Wrong:** \`\${{ A and B }}\` / \`\${{ A or B }}\`
- **Right:** \`\${{ A && B }}\` / \`\${{ A || B }}\`

## 5. Action inputs format
- **Wrong:** Sending inputs as JSON object
- **Right:** Sending inputs as YAML string

## 6. Action update HTTP method
- **Wrong:** \`PATCH /actions/{id}\`
- **Right:** \`POST /actions/{id}\` (with workflow_id query param)

## 7. Listing actions endpoint
- **Wrong:** \`GET /workflows/{id}/actions\`
- **Right:** \`GET /actions?workflow_id={id}\`

## 8. Missing workspace_id
- Must be a **query parameter** on every request
- NOT a header
- MCP tools handle this automatically

## 9. Orphaned graph nodes
- Creating actions without adding edges = invisible in UI
- Always add edges AND position nodes after creating actions

## 10. Unclosed expressions
- **Wrong:** \`\${{ ACTIONS.x.result\`
- **Right:** \`\${{ ACTIONS.x.result }}\`

## 11. Using core.http_request for native operations
- **Wrong:** \`core.http_request\` to create a case
- **Right:** \`core.cases.create_case\`

## 12. Secret/Schedule update method
- **Wrong:** \`PATCH /secrets/{id}\` or \`PATCH /schedules/{id}\`
- **Right:** \`POST /secrets/{id}\` / \`POST /schedules/{id}\`

## 13. FN.serialize_json for Python inputs
- When passing objects to run_python, serialize them:
  \`\${{ FN.serialize_json(ACTIONS.x.result) }}\`

## 14. Trigger spacing in graph layout
- Trigger at y=0 takes ~200px height
- First action should be at y >= 300 (not y=200)

## 15. Batch insert rows format
- **Wrong:** \`{ data: [{...}] }\`
- **Right:** \`{ rows: [{...}] }\` (flat objects, keys = column names)`,
};

const TOOLS_CATALOG: Record<string, Array<{ name: string; description: string; params: string; example: string }>> = {
  workflows: [
    { name: "tracecat_list_workflows", description: "List all workflows in the workspace", params: "(none)", example: "tracecat_list_workflows()" },
    { name: "tracecat_create_workflow", description: "Create a new workflow", params: "title (required), description", example: 'tracecat_create_workflow({ title: "Alert Triage" })' },
    { name: "tracecat_get_workflow", description: "Get workflow details by ID", params: "workflow_id (required)", example: 'tracecat_get_workflow({ workflow_id: "wf_xxx" })' },
    { name: "tracecat_update_workflow", description: "Update workflow title/description/status", params: "workflow_id (required), title, description, status", example: 'tracecat_update_workflow({ workflow_id: "wf_xxx", status: "online" })' },
    { name: "tracecat_deploy_workflow", description: "Deploy (commit) a workflow", params: "workflow_id (required)", example: 'tracecat_deploy_workflow({ workflow_id: "wf_xxx" })' },
    { name: "tracecat_export_workflow", description: "Export workflow as YAML", params: "workflow_id (required)", example: 'tracecat_export_workflow({ workflow_id: "wf_xxx" })' },
    { name: "tracecat_delete_workflow", description: "Delete a workflow permanently", params: "workflow_id (required)", example: 'tracecat_delete_workflow({ workflow_id: "wf_xxx" })' },
    { name: "tracecat_validate_workflow", description: "Validate workflow (actions, inputs, expressions, graph)", params: "workflow_id (required)", example: 'tracecat_validate_workflow({ workflow_id: "wf_xxx" })' },
    { name: "tracecat_autofix_workflow", description: "Validate + auto-fix common issues (orphans, disconnected trigger, unclosed expressions)", params: "workflow_id (required), dry_run", example: 'tracecat_autofix_workflow({ workflow_id: "wf_xxx" })' },
  ],
  actions: [
    { name: "tracecat_list_actions", description: "List all actions for a workflow", params: "workflow_id (required)", example: 'tracecat_list_actions({ workflow_id: "wf_xxx" })' },
    { name: "tracecat_create_action", description: "Create a new action in a workflow", params: "workflow_id (required), type (required), title (required)", example: 'tracecat_create_action({ workflow_id: "wf_xxx", type: "core.http_request", title: "Check IP" })' },
    { name: "tracecat_get_action", description: "Get action details", params: "action_id (required), workflow_id (required)", example: 'tracecat_get_action({ action_id: "act_xxx", workflow_id: "wf_xxx" })' },
    { name: "tracecat_update_action", description: "Update action inputs/control_flow. Inputs must be YAML string!", params: "action_id (required), workflow_id (required), title, description, inputs (YAML string), control_flow", example: 'tracecat_update_action({ action_id: "act_xxx", workflow_id: "wf_xxx", inputs: "url: https://...\\nmethod: GET" })' },
    { name: "tracecat_delete_action", description: "Delete an action", params: "action_id (required), workflow_id (required)", example: 'tracecat_delete_action({ action_id: "act_xxx", workflow_id: "wf_xxx" })' },
  ],
  executions: [
    { name: "tracecat_run_workflow", description: "Execute a workflow with optional payload", params: "workflow_id (required), payload", example: 'tracecat_run_workflow({ workflow_id: "wf_xxx", payload: { ip: "1.2.3.4" } })' },
    { name: "tracecat_list_executions", description: "List executions, optionally by workflow", params: "workflow_id, limit", example: 'tracecat_list_executions({ workflow_id: "wf_xxx", limit: 5 })' },
    { name: "tracecat_get_execution", description: "Get full execution details", params: "execution_id (required)", example: 'tracecat_get_execution({ execution_id: "exec_xxx" })' },
    { name: "tracecat_get_execution_compact", description: "Get compact execution (action status, inputs, results, errors)", params: "execution_id (required)", example: 'tracecat_get_execution_compact({ execution_id: "exec_xxx" })' },
    { name: "tracecat_cancel_execution", description: "Cancel a running execution", params: "execution_id (required)", example: 'tracecat_cancel_execution({ execution_id: "exec_xxx" })' },
  ],
  cases: [
    { name: "tracecat_list_cases", description: "List cases in workspace", params: "limit, status", example: 'tracecat_list_cases({ status: "new", limit: 10 })' },
    { name: "tracecat_create_case", description: "Create a new case", params: "workflow_id (required), case_title (required), payload, malice, status, priority, action", example: 'tracecat_create_case({ workflow_id: "wf_xxx", case_title: "Suspicious IP" })' },
    { name: "tracecat_get_case", description: "Get case details", params: "case_id (required)", example: 'tracecat_get_case({ case_id: "case_xxx" })' },
    { name: "tracecat_update_case", description: "Update case status/priority/malice", params: "case_id (required), case_title, status, priority, malice, action", example: 'tracecat_update_case({ case_id: "case_xxx", status: "resolved" })' },
    { name: "tracecat_delete_case", description: "Delete a case permanently", params: "case_id (required)", example: 'tracecat_delete_case({ case_id: "case_xxx" })' },
    { name: "tracecat_add_comment", description: "Add comment to a case", params: "case_id (required), content (required)", example: 'tracecat_add_comment({ case_id: "case_xxx", content: "Investigation started" })' },
    { name: "tracecat_list_comments", description: "List all comments on a case", params: "case_id (required)", example: 'tracecat_list_comments({ case_id: "case_xxx" })' },
  ],
  secrets: [
    { name: "tracecat_search_secrets", description: "Search secrets by name", params: "name", example: 'tracecat_search_secrets({ name: "virustotal" })' },
    { name: "tracecat_create_secret", description: "Create a new secret", params: "name (required), keys (required), type, description", example: 'tracecat_create_secret({ name: "virustotal", keys: [{ key: "API_KEY", value: "xxx" }] })' },
    { name: "tracecat_get_secret", description: "Get secret metadata (not values)", params: "secret_name (required)", example: 'tracecat_get_secret({ secret_name: "virustotal" })' },
    { name: "tracecat_update_secret", description: "Update secret keys/description", params: "secret_id (required), name, description, keys", example: 'tracecat_update_secret({ secret_id: "uuid", keys: [{ key: "API_KEY", value: "new" }] })' },
    { name: "tracecat_delete_secret", description: "Delete a secret", params: "secret_id (required)", example: 'tracecat_delete_secret({ secret_id: "uuid" })' },
  ],
  tables: [
    { name: "tracecat_list_tables", description: "List all tables", params: "(none)", example: "tracecat_list_tables()" },
    { name: "tracecat_create_table", description: "Create a new table", params: "name (required), description", example: 'tracecat_create_table({ name: "ioc_enrichment" })' },
    { name: "tracecat_get_table", description: "Get table details (includes columns)", params: "table_id (required)", example: 'tracecat_get_table({ table_id: "tbl_xxx" })' },
    { name: "tracecat_update_table", description: "Update table name/description", params: "table_id (required), name, description", example: 'tracecat_update_table({ table_id: "tbl_xxx", name: "new_name" })' },
    { name: "tracecat_delete_table", description: "Delete a table", params: "table_id (required)", example: 'tracecat_delete_table({ table_id: "tbl_xxx" })' },
    { name: "tracecat_create_column", description: "Add column to table", params: "table_id (required), name (required), type (required: TEXT, INTEGER, NUMERIC, DATE, BOOLEAN, TIMESTAMP, TIMESTAMPTZ, JSONB, UUID, SELECT, MULTI_SELECT)", example: 'tracecat_create_column({ table_id: "tbl_xxx", name: "ip_address", type: "TEXT" })' },
    { name: "tracecat_delete_column", description: "Delete column from table", params: "table_id (required), column_id (required)", example: 'tracecat_delete_column({ table_id: "tbl_xxx", column_id: "col_xxx" })' },
    { name: "tracecat_list_rows", description: "List rows with pagination", params: "table_id (required), limit, offset", example: 'tracecat_list_rows({ table_id: "tbl_xxx", limit: 50 })' },
    { name: "tracecat_get_row", description: "Get single row by ID", params: "table_id (required), row_id (required)", example: 'tracecat_get_row({ table_id: "tbl_xxx", row_id: "row_xxx" })' },
    { name: "tracecat_insert_row", description: "Insert a row (keys = column names)", params: "table_id (required), data (required)", example: 'tracecat_insert_row({ table_id: "tbl_xxx", data: { ip: "1.2.3.4", score: 85 } })' },
    { name: "tracecat_update_row", description: "Update a row", params: "table_id (required), row_id (required), data (required)", example: 'tracecat_update_row({ table_id: "tbl_xxx", row_id: "row_xxx", data: { score: 90 } })' },
    { name: "tracecat_delete_row", description: "Delete a row", params: "table_id (required), row_id (required)", example: 'tracecat_delete_row({ table_id: "tbl_xxx", row_id: "row_xxx" })' },
    { name: "tracecat_batch_insert_rows", description: "Insert multiple rows at once", params: "table_id (required), rows (required: array of flat objects)", example: 'tracecat_batch_insert_rows({ table_id: "tbl_xxx", rows: [{ ip: "1.2.3.4" }, { ip: "5.6.7.8" }] })' },
  ],
  graph: [
    { name: "tracecat_get_graph", description: "Get workflow graph (nodes, edges, positions, version)", params: "workflow_id (required)", example: 'tracecat_get_graph({ workflow_id: "wf_xxx" })' },
    { name: "tracecat_add_edges", description: "Connect actions in the graph", params: "workflow_id (required), edges (required: [{source_id, source_type, target_id, source_handle}])", example: 'tracecat_add_edges({ workflow_id: "wf_xxx", edges: [{ source_id: "trigger_id", source_type: "trigger", target_id: "act_xxx" }] })' },
    { name: "tracecat_delete_edges", description: "Remove edges from graph", params: "workflow_id (required), edges (required)", example: 'tracecat_delete_edges({ workflow_id: "wf_xxx", edges: [{ source_id: "act_1", source_type: "udf", target_id: "act_2" }] })' },
    { name: "tracecat_move_nodes", description: "Reposition nodes. Layout: trigger at (500,0), first action y>=300, 160px vertical spacing", params: "workflow_id (required), positions (required: [{action_id, x, y}])", example: 'tracecat_move_nodes({ workflow_id: "wf_xxx", positions: [{ action_id: "act_xxx", x: 500, y: 300 }] })' },
    { name: "tracecat_update_trigger_position", description: "Reposition the trigger node", params: "workflow_id (required), x (required), y (required)", example: 'tracecat_update_trigger_position({ workflow_id: "wf_xxx", x: 500, y: 0 })' },
  ],
  schedules: [
    { name: "tracecat_list_schedules", description: "List all schedules", params: "workflow_id", example: 'tracecat_list_schedules({ workflow_id: "wf_xxx" })' },
    { name: "tracecat_create_schedule", description: "Create schedule (cron or interval)", params: "workflow_id (required), cron, every, inputs", example: 'tracecat_create_schedule({ workflow_id: "wf_xxx", every: "1h" })' },
    { name: "tracecat_get_schedule", description: "Get schedule details", params: "schedule_id (required)", example: 'tracecat_get_schedule({ schedule_id: "sched_xxx" })' },
    { name: "tracecat_update_schedule", description: "Update schedule", params: "schedule_id (required), cron, every, inputs, status", example: 'tracecat_update_schedule({ schedule_id: "sched_xxx", status: "offline" })' },
    { name: "tracecat_delete_schedule", description: "Delete a schedule", params: "schedule_id (required)", example: 'tracecat_delete_schedule({ schedule_id: "sched_xxx" })' },
  ],
  webhooks: [
    { name: "tracecat_create_webhook_key", description: "Generate/rotate webhook API key", params: "workflow_id (required)", example: 'tracecat_create_webhook_key({ workflow_id: "wf_xxx" })' },
  ],
  system: [
    { name: "tracecat_health_check", description: "Check if Tracecat API is healthy", params: "(none)", example: "tracecat_health_check()" },
  ],
  docs: [
    { name: "tracecat_docs", description: "Get inline documentation", params: "topic (required: action_types, expressions, functions, control_flow, common_mistakes)", example: 'tracecat_docs({ topic: "expressions" })' },
    { name: "tracecat_tools_documentation", description: "Get documentation of all MCP tools grouped by category", params: "category (optional)", example: 'tracecat_tools_documentation({ category: "workflows" })' },
  ],
  templates: [
    { name: "tracecat_list_templates", description: "List available SOAR workflow templates", params: "(none)", example: "tracecat_list_templates()" },
    { name: "tracecat_get_template", description: "Get full YAML template for a workflow pattern", params: "template_id (required)", example: 'tracecat_get_template({ template_id: "alert_triage" })' },
  ],
};

export function registerDocTools(server: McpServer, _client: TracecatClient) {
  server.tool(
    "tracecat_docs",
    "Get inline documentation about Tracecat concepts. Topics: action_types, expressions, functions, control_flow, common_mistakes.",
    {
      topic: z.enum(["action_types", "expressions", "functions", "control_flow", "common_mistakes"])
        .describe("Documentation topic to retrieve"),
    },
    async ({ topic }) => {
      const doc = DOCS[topic];
      if (!doc) {
        return {
          content: [{ type: "text", text: `Unknown topic: ${topic}. Available: ${Object.keys(DOCS).join(", ")}` }],
          isError: true,
        };
      }
      return { content: [{ type: "text", text: doc }] };
    }
  );

  const categoryEnum = z.enum([
    "workflows", "actions", "executions", "cases", "secrets",
    "tables", "graph", "schedules", "webhooks", "system", "docs", "templates",
  ]);

  server.tool(
    "tracecat_tools_documentation",
    "Get documentation of ALL Tracecat MCP tools grouped by category. Use this to discover available tools and learn how to use them. Optionally filter by category.",
    {
      category: categoryEnum.optional().describe("Filter by category. Omit to get all tools."),
    },
    async ({ category }) => {
      const categories = category ? [category] : Object.keys(TOOLS_CATALOG);
      const lines: string[] = ["# Tracecat MCP Tools Reference\n"];

      for (const cat of categories) {
        const tools = TOOLS_CATALOG[cat];
        if (!tools) continue;
        lines.push(`## ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${tools.length} tools)\n`);
        for (const t of tools) {
          lines.push(`### ${t.name}`);
          lines.push(`${t.description}`);
          lines.push(`**Parameters:** ${t.params}`);
          lines.push(`**Example:** \`${t.example}\`\n`);
        }
      }

      const total = Object.values(TOOLS_CATALOG).reduce((sum, arr) => sum + arr.length, 0);
      if (!category) {
        lines.push(`---\n**Total: ${total} tools across ${Object.keys(TOOLS_CATALOG).length} categories**`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}
