import { serve } from "@hono/node-server";
import { loadExternalData } from "./data/runtimeData.js";
import { createHttpApp } from "./httpApp.js";

const port = Number(process.env.PORT ?? 3000);
await loadExternalData();
const app = createHttpApp();

serve({
  fetch: async (request) => {
    await loadExternalData();
    return app.fetch(request, {
      MCP_TOKEN: process.env.MCP_TOKEN,
    });
  },
  port,
});

console.log(`Remote MCP listening at http://localhost:${port}/mcp`);
console.log(`Health check at http://localhost:${port}/health`);
