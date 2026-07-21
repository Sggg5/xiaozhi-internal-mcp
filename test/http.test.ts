import assert from "node:assert/strict";
import test from "node:test";
import { createHttpApp } from "../src/httpApp.js";

const app = createHttpApp();
const token = "test-mcp-token";

function mcpRequest(name: string, argumentsValue: Record<string, unknown>, authorization?: string) {
  return new Request("https://example.test/mcp", {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      ...(authorization ? { authorization } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: argumentsValue },
    }),
  });
}

test("health validates MCP_TOKEN configuration", async () => {
  const healthy = await app.fetch(new Request("https://example.test/health"), { MCP_TOKEN: token });
  assert.equal(healthy.status, 200);
  assert.equal((await healthy.json()).tokenConfigured, true);

  const degraded = await app.fetch(new Request("https://example.test/health"), {});
  assert.equal(degraded.status, 503);
});

test("remote MCP keeps public tools available without token", async () => {
  const response = await app.fetch(mcpRequest("query_pipe_size", { keyword: "DN25" }), {
    MCP_TOKEN: token,
  });
  assert.equal(response.status, 200);
  const result = await response.json() as { result: { structuredContent: { dn: string } } };
  assert.equal(result.result.structuredContent.dn, "DN25");
});

test("remote MCP allows quote tools without token by default", async () => {
  const input = {
    dn: "DN25",
    material: "304",
    wallThickness: 1,
    length: 10,
    surface: "抛光",
    taxIncluded: true,
  };
  const allowed = await app.fetch(mcpRequest("estimate_pipe_quote", input), { MCP_TOKEN: token });
  const allowedResult = await allowed.json() as {
    result: { structuredContent: { disclaimer: string } };
  };
  assert.match(allowedResult.result.structuredContent.disclaimer, /正式报价需人工确认/);
});

test("remote MCP can require token for quote tools", async () => {
  const input = {
    dn: "DN25",
    material: "304",
    wallThickness: 1,
    length: 10,
    surface: "抛光",
    taxIncluded: true,
  };
  const denied = await app.fetch(mcpRequest("estimate_pipe_quote", input), {
    MCP_TOKEN: token,
    QUOTE_REQUIRES_TOKEN: "true",
  });
  const deniedResult = await denied.json() as { result: { isError?: boolean } };
  assert.equal(deniedResult.result.isError, true);

  const allowed = await app.fetch(mcpRequest("estimate_pipe_quote", input, `Bearer ${token}`), {
    MCP_TOKEN: token,
    QUOTE_REQUIRES_TOKEN: "true",
  });
  const allowedResult = await allowed.json() as {
    result: { structuredContent: { disclaimer: string } };
  };
  assert.match(allowedResult.result.structuredContent.disclaimer, /正式报价需人工确认/);
});
