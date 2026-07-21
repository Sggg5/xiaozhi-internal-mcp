import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import { askBlogKnowledge } from "./tools/askBlogKnowledge.js";
import { calculatePipeWeight } from "./tools/calculatePipeWeight.js";
import { estimatePipeQuote } from "./tools/estimatePipeQuote.js";
import { generateQuoteDraft } from "./tools/generateQuoteDraft.js";
import { getBlogArticle } from "./tools/getBlogArticle.js";
import { queryFittingSize } from "./tools/queryFittingSize.js";
import { queryPipeSize } from "./tools/queryPipeSize.js";
import { searchBlogArticles } from "./tools/searchBlogArticles.js";
import { searchShanghanArticles, searchShanghanByType } from "./tools/searchShanghanArticles.js";
import { getShanghanDetail } from "./tools/getShanghanDetail.js";
import { askShanghanKnowledge } from "./tools/askShanghanKnowledge.js";

export interface ServerOptions {
  quoteAuthorized: boolean;
}

function jsonResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: value as Record<string, unknown>,
  };
}

function quoteUnauthorizedResult() {
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        error: "unauthorized",
        message: "报价工具需要有效的 MCP_TOKEN。",
      }),
    }],
    isError: true,
  };
}

export function createServer(options: ServerOptions) {
  const server = new McpServer({
    name: "xiaozhi-internal-mcp",
    version: "2.0.0",
  });

  server.registerTool("query_pipe_size", {
    description: "根据 DN、外径或关键词查询不锈钢管材尺寸。",
    inputSchema: { keyword: z.string().min(1) },
  }, async ({ keyword }) => jsonResult(queryPipeSize(keyword)));

  server.registerTool("query_fitting_size", {
    description: "根据 DN/外径和管件类型查询不锈钢管件尺寸。",
    inputSchema: { keyword: z.string().min(1) },
  }, async ({ keyword }) => jsonResult(queryFittingSize(keyword)));

  server.registerTool("calculate_pipe_weight", {
    description: "计算不锈钢管理论重量。",
    inputSchema: {
      outerDiameter: z.number().positive(),
      wallThickness: z.number().positive(),
      length: z.number().positive(),
      material: z.enum(["304", "316L"]),
    },
  }, async (input) => jsonResult(calculatePipeWeight(input)));

  server.registerTool("estimate_pipe_quote", {
    description: "生成公司内部使用的不锈钢管参考报价区间。需要 MCP_TOKEN，正式报价必须人工确认。",
    inputSchema: {
      dn: z.string().min(1),
      material: z.enum(["304", "316L"]),
      wallThickness: z.number().positive(),
      length: z.number().positive(),
      surface: z.enum(["酸洗", "抛光", "喷砂", "定制"]),
      taxIncluded: z.boolean(),
      customerType: z.enum(["普通客户", "工程客户", "经销商"]).optional(),
    },
  }, async (input) =>
    options.quoteAuthorized ? jsonResult(estimatePipeQuote(input)) : quoteUnauthorizedResult());

  server.registerTool("generate_quote_draft", {
    description: "把内部报价测算结果整理成报价草稿与人工核对清单。需要 MCP_TOKEN。",
    inputSchema: { quoteData: z.record(z.string(), z.unknown()) },
  }, async ({ quoteData }) =>
    options.quoteAuthorized ? jsonResult(generateQuoteDraft(quoteData)) : quoteUnauthorizedResult());

  server.registerTool("search_blog_articles", {
    description: "按关键词搜索内部博客文章。",
    inputSchema: {
      keyword: z.string().min(1),
      limit: z.number().int().min(1).max(20).default(5),
    },
  }, async ({ keyword, limit }) => jsonResult(searchBlogArticles(keyword, limit)));

  server.registerTool("get_blog_article", {
    description: "根据文章 ID 读取内部博客文章详情。",
    inputSchema: { id: z.string().min(1) },
  }, async ({ id }) => jsonResult(getBlogArticle(id)));

  server.registerTool("ask_blog_knowledge", {
    description: "检索与问题相关的内部博客资料，供 AI 总结；本工具自身不调用模型。",
    inputSchema: {
      question: z.string().min(1),
      limit: z.number().int().min(1).max(10).default(3),
    },
  }, async ({ question, limit }) => jsonResult(askBlogKnowledge(question, limit)));

  server.registerTool("search_shanghan_articles", {
    description: "按关键词搜索伤寒论知识库（条文、方剂、药物、证型等）。",
    inputSchema: {
      keyword: z.string().min(1),
      limit: z.number().int().min(1).max(50).default(10),
    },
  }, async ({ keyword, limit }) => jsonResult(searchShanghanArticles(keyword, limit)));

  server.registerTool("search_shanghan_by_type", {
    description: "按类型和关键词搜索伤寒论知识库。类型可选：条文、方剂、药物、证型、体质、解读。",
    inputSchema: {
      type: z.string().min(1),
      keyword: z.string().min(1),
      limit: z.number().int().min(1).max(50).default(10),
    },
  }, async ({ type, keyword, limit }) => jsonResult(searchShanghanByType(type, keyword, limit)));

  server.registerTool("get_shanghan_detail", {
    description: "根据条目 ID 获取伤寒论知识库的完整内容（条文/方剂/药物详情）。",
    inputSchema: { id: z.string().min(1) },
  }, async ({ id }) => jsonResult(getShanghanDetail(id)));

  server.registerTool("ask_shanghan_knowledge", {
    description: "检索与问题相关的伤寒论资料，供 AI 总结回答。本工具自身不调用模型。",
    inputSchema: {
      question: z.string().min(1),
      limit: z.number().int().min(1).max(10).default(5),
    },
  }, async ({ question, limit }) => jsonResult(askShanghanKnowledge(question, limit)));

  return server;
}
