import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("stdio MCP exposes and calls all tools", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["dist/src/index.js"],
    cwd: process.cwd(),
    stderr: "pipe",
  });
  const client = new Client({ name: "xiaozhi-test-client", version: "1.0.0" });
  await client.connect(transport);
  try {
    const tools = await client.listTools();
    assert.equal(tools.tools.length, 12);
    const result = await client.callTool({
      name: "query_pipe_size",
      arguments: { keyword: "DN50管子" },
    });
    assert.equal(result.isError, undefined);
    assert.equal((result.structuredContent as { dn: string }).dn, "DN50");
  } finally {
    await client.close();
  }
});
