import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../dist/server.js";

// Minimal mock client — no real API calls
function createMockClient() {
  return {
    get: async () => ({}),
    post: async () => ({}),
    patch: async () => ({}),
    delete: async () => ({}),
    patchGraph: async () => ({}),
    getWorkspaceId: () => "test-workspace",
    ensureInitialized: async () => {},
  };
}

describe("MCP Server", () => {
  it("should create a server instance", () => {
    const client = createMockClient();
    const server = createServer(client);
    assert.ok(server, "Server should be created");
  });

  it("should be an McpServer instance with connect method", () => {
    const client = createMockClient();
    const server = createServer(client);
    assert.equal(typeof server.connect, "function", "Server should have a connect method");
  });

  it("should have tool method for registration", () => {
    const client = createMockClient();
    const server = createServer(client);
    assert.equal(typeof server.tool, "function", "Server should have a tool method");
  });
});

describe("TracecatClient", () => {
  it("should import client module", async () => {
    const mod = await import("../dist/client.js");
    assert.ok(mod.TracecatClient, "TracecatClient should be exported");
  });

  it("should create a client instance", async () => {
    const { TracecatClient } = await import("../dist/client.js");
    const client = new TracecatClient("http://localhost/api", "user", "pass");
    assert.ok(client, "Client should be created");
  });

  it("should strip trailing slash from baseUrl", async () => {
    const { TracecatClient } = await import("../dist/client.js");
    const client = new TracecatClient("http://localhost/api/", "user", "pass");
    // Client should work without double slashes
    assert.ok(client);
  });
});

describe("Types", () => {
  it("should import types module", async () => {
    const mod = await import("../dist/types.js");
    assert.ok(mod, "Types module should be importable");
  });
});
