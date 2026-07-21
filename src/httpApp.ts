import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bearerToken, tokensEqual } from "./auth.js";
import { createServer } from "./server.js";

export interface Bindings {
  MCP_TOKEN?: string;
  QUOTE_REQUIRES_TOKEN?: string;
}

export function createHttpApp() {
  const app = new Hono<{ Bindings: Bindings }>();

  app.use("/mcp", cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Authorization",
      "Content-Type",
      "Mcp-Session-Id",
      "Mcp-Protocol-Version",
      "Last-Event-ID",
    ],
    exposeHeaders: ["Mcp-Session-Id", "Mcp-Protocol-Version"],
  }));

  app.get("/health", (c) => {
    const tokenConfigured = Boolean(c.env.MCP_TOKEN);
    return c.json({
      status: tokenConfigured ? "ok" : "degraded",
      service: "xiaozhi-internal-mcp",
      version: "2.0.0",
      transport: "streamable-http",
      mcpEndpoint: "/mcp",
      tokenConfigured,
    }, tokenConfigured ? 200 : 503);
  });

  app.all("/mcp", async (c) => {
    const quoteRequiresToken = c.env.QUOTE_REQUIRES_TOKEN === "true";
    const quoteAuthorized = !quoteRequiresToken ||
      await tokensEqual(bearerToken(c.req.raw), c.env.MCP_TOKEN);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    const server = createServer({ quoteAuthorized });
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
  });

  app.notFound((c) => c.json({
    error: "not_found",
    message: "Use /health or /mcp.",
  }, 404));

  app.onError((error, c) => {
    console.error(JSON.stringify({
      level: "error",
      message: "Unhandled remote MCP request error",
      error: error.message,
    }));
    return c.json({
      error: "internal_server_error",
      message: "Remote MCP request failed.",
    }, 500);
  });

  return app;
}
