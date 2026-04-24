import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TracecatClient } from "./client.js";
import { registerWorkflowTools } from "./tools/workflows.js";
import { registerExecutionTools } from "./tools/executions.js";
import { registerCaseTools } from "./tools/cases.js";
import { registerActionTools } from "./tools/actions.js";
import { registerSecretTools } from "./tools/secrets.js";
import { registerTableTools } from "./tools/tables.js";
import { registerWebhookTools } from "./tools/webhooks.js";
import { registerSystemTools } from "./tools/system.js";
import { registerScheduleTools } from "./tools/schedules.js";
import { registerGraphTools } from "./tools/graph.js";
import { registerDocTools } from "./tools/docs.js";
import { registerTemplateTools } from "./tools/templates.js";
import { registerFolderTools } from "./tools/folders.js";
import { registerWorkspaceTools } from "./tools/workspaces.js";

export function createServer(client: TracecatClient): McpServer {
  const server = new McpServer({
    name: "tracecat",
    version: "1.0.0",
  });

  registerWorkflowTools(server, client);
  registerExecutionTools(server, client);
  registerCaseTools(server, client);
  registerActionTools(server, client);
  registerSecretTools(server, client);
  registerTableTools(server, client);
  registerWebhookTools(server, client);
  registerScheduleTools(server, client);
  registerSystemTools(server, client);
  registerGraphTools(server, client);
  registerDocTools(server, client);
  registerTemplateTools(server, client);
  registerFolderTools(server, client);
  registerWorkspaceTools(server, client);

  return server;
}
