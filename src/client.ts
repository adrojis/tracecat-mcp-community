export class TracecatClient {
  private baseUrl: string;
  private workspaceId: string;
  private sessionCookie: string = "";
  private username: string;
  private password: string;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(
    baseUrl: string,
    username: string,
    password: string,
    workspaceId: string = ""
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.username = username;
    this.password = password;
    this.workspaceId = workspaceId;
  }

  /** Ensures the client is logged in and workspace is set. Safe to call multiple times. */
  async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        await this.login();
        await this.initWorkspaceId();
        this.initialized = true;
        console.error("[tracecat-mcp-community] Login successful");
        console.error(`[tracecat-mcp-community] Workspace: ${this.workspaceId || "(none)"}`);
      })();
    }
    await this.initPromise;
  }

  async login(): Promise<void> {
    const formData = new URLSearchParams();
    formData.append("username", this.username);
    formData.append("password", this.password);

    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      redirect: "manual",
    });

    if (!response.ok && response.status !== 204 && response.status !== 302) {
      throw new Error(`Login failed (${response.status}). Check your TRACECAT_USERNAME and TRACECAT_PASSWORD in .env`);
    }

    // Extract session cookie from set-cookie header
    const setCookie = response.headers.getSetCookie?.() ?? [];
    for (const cookie of setCookie) {
      const match = cookie.match(/fastapiusersauth=([^;]+)/);
      if (match) {
        this.sessionCookie = match[1];
        return;
      }
    }

    // Fallback: try raw header
    const rawSetCookie = response.headers.get("set-cookie") ?? "";
    const match = rawSetCookie.match(/fastapiusersauth=([^;]+)/);
    if (match) {
      this.sessionCookie = match[1];
      return;
    }

    throw new Error(
      "Login succeeded but no session cookie received. " +
        "Check that the Tracecat API is returning a 'fastapiusersauth' cookie."
    );
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Cookie: `fastapiusersauth=${this.sessionCookie}`,
    };
  }

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string>
  ): Promise<T> {
    await this.ensureInitialized();

    // Auto-inject workspace_id on every request (skip auth/workspaces endpoints)
    const params = new URLSearchParams(queryParams);
    if (this.workspaceId && !path.startsWith("/auth") && path !== "/workspaces" && path !== "/ready") {
      if (!params.has("workspace_id")) {
        params.set("workspace_id", this.workspaceId);
      }
    }

    let url = `${this.baseUrl}${path}`;
    const qs = params.toString();
    if (qs) {
      url += `?${qs}`;
    }

    const options: RequestInit = {
      method,
      headers: this.headers(),
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Tracecat API error ${response.status}: ${errorText}`
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  }

  async get<T = unknown>(
    path: string,
    queryParams?: Record<string, string>
  ): Promise<T> {
    return this.request<T>("GET", path, undefined, queryParams);
  }

  async post<T = unknown>(path: string, body?: unknown, queryParams?: Record<string, string>): Promise<T> {
    return this.request<T>("POST", path, body, queryParams);
  }

  async patch<T = unknown>(path: string, body: unknown, queryParams?: Record<string, string>): Promise<T> {
    return this.request<T>("PATCH", path, body, queryParams);
  }

  async delete<T = unknown>(path: string, queryParams?: Record<string, string>): Promise<T> {
    return this.request<T>("DELETE", path, undefined, queryParams);
  }

  async initWorkspaceId(): Promise<void> {
    if (this.workspaceId) return;
    try {
      // /workspaces doesn't need workspace_id
      const response = await fetch(`${this.baseUrl}/workspaces`, {
        headers: {
          Cookie: `fastapiusersauth=${this.sessionCookie}`,
        },
      });
      if (response.ok) {
        const workspaces = (await response.json()) as Array<{ id: string }>;
        if (workspaces.length > 0) {
          this.workspaceId = workspaces[0].id;
        }
      }
    } catch {
      // Workspace ID will remain empty; some endpoints may not require it
    }
  }

  getWorkspaceId(): string {
    return this.workspaceId;
  }

  /** Fetch current graph then apply operations with optimistic locking */
  async patchGraph(workflowId: string, operations: Array<{ type: string; payload: Record<string, unknown> }>): Promise<unknown> {
    // 1. Get current graph to read base_version (version is at root level)
    const graph = await this.get<{ version: number }>(`/workflows/${workflowId}/graph`);
    const baseVersion = graph.version;

    // 2. Patch with operations
    return this.patch(`/workflows/${workflowId}/graph`, {
      base_version: baseVersion,
      operations,
    });
  }
}
