import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadExternalData } from "./data/runtimeData.js";
import { createServer } from "./server.js";

async function main() {
  await loadExternalData();
  const server = createServer({ quoteAuthorized: Boolean(process.env.MCP_TOKEN) });
  await server.connect(new StdioServerTransport());
  console.error("xiaozhi-internal-mcp running on stdio");
}

main().catch((error) => {
  console.error("MCP server failed:", error);
  process.exit(1);
});
