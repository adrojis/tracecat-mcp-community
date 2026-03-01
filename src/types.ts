export interface Workflow {
  id: string;
  title: string;
  description: string;
  status: string;
  version: number | null;
  entrypoint: string | null;
  static_inputs: Record<string, unknown>;
  returns: unknown;
  config: Record<string, unknown>;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: string;
  start_time: string;
  end_time: string | null;
  result: unknown;
  error: string | null;
}

export interface Case {
  id: string;
  workflow_id: string;
  case_title: string;
  payload: Record<string, unknown>;
  malice: string;
  status: string;
  priority: string;
  action: string;
  context: Record<string, unknown>;
  suppression: Record<string, unknown>[];
  tags: Record<string, unknown>;
  assigned_to: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface CaseComment {
  id: string;
  case_id: string;
  content: string;
  created_by: string;
  created_at: string;
}

export interface Action {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  inputs: Record<string, unknown>;
  workflow_id: string;
}

export interface Secret {
  id: string;
  type: string;
  name: string;
  description: string | null;
  keys: string[];
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Table {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TracecatApiError {
  detail: string;
  status: number;
}
