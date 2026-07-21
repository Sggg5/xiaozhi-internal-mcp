# 小智 AI 内部远程 MCP 服务

基于 Node.js、TypeScript 和 MCP 官方 SDK。服务保留全部 12 个 tools（含 4 个伤寒论知识库工具），并同时支持：

- Cloudflare Worker：标准 Streamable HTTP，接入地址为 `https://<worker-domain>/mcp`
- Node.js HTTP Server：标准 Streamable HTTP，接入地址为 `http://<host>:3000/mcp`
- 本地 stdio：用于开发和兼容原有 MCP 客户端

健康检查地址为 `/health`。报价工具只允许携带有效 `MCP_TOKEN` 的调用。

## Tools

| 工具 | 用途 | 是否需要 Token |
|---|---|---|
| `query_pipe_size` | 查询管材尺寸 | 否 |
| `query_fitting_size` | 查询管件尺寸 | 否 |
| `calculate_pipe_weight` | 计算理论重量 | 否 |
| `estimate_pipe_quote` | 生成内部参考报价区间 | 是 |
| `generate_quote_draft` | 生成内部报价草稿 | 是 |
| `search_blog_articles` | 搜索内部博客 | 否 |
| `get_blog_article` | 读取博客详情 | 否 |
| `ask_blog_knowledge` | 检索供 AI 总结的资料 | 否 |
| `search_shanghan_articles` | 搜索伤寒论知识库（条文、方剂、药物等） | 否 |
| `search_shanghan_by_type` | 按类型筛选搜索伤寒论 | 否 |
| `get_shanghan_detail` | 获取条文/方剂/药物完整详情 | 否 |
| `ask_shanghan_knowledge` | 检索伤寒论资料供 AI 辨证参考 | 否 |

⚠️ 伤寒论知识库仅为中医辅助参考，不替代医师诊断，不提供处方与剂量。
报价结果仅供公司内部测算，正式报价必须人工确认。

## 安装与测试

要求 Node.js 20 或更高版本。

```powershell
cd F:\01.C\linshi\codex\xiaozhi-internal-mcp
npm install
npm test
```

## MCP_TOKEN

`MCP_TOKEN` 是本服务保护报价工具的内部 secret，不是小智后台生成的 `wss://api.xiaozhi.me/mcp/?token=...` 接入点 token。

生成一个独立的高强度随机值，并且不要提交到 Git：

```powershell
$env:MCP_TOKEN = "<long-random-secret>"
```

远程调用报价工具时添加：

```http
Authorization: Bearer <MCP_TOKEN>
```

未配置 `MCP_TOKEN` 时：

- `/health` 返回 HTTP 503 和 `status: degraded`
- 查询及知识库工具仍可用
- 两个报价工具拒绝调用

## Cloudflare Worker 部署

Worker 是推荐的远程 MCP 托管方式。配置位于 `wrangler.jsonc`，secret 不写入该文件。

```powershell
npx wrangler login
npx wrangler secret put MCP_TOKEN
npm run deploy
```

部署后检查：

```powershell
curl https://<worker-domain>/health
```

远程 MCP 地址：

```text
https://<worker-domain>/mcp
```

本地调试 Worker：

```powershell
Copy-Item .dev.vars.example .dev.vars
# 编辑 .dev.vars，设置本地 MCP_TOKEN
npm run dev:worker
```

## Node.js HTTP 部署

```powershell
$env:MCP_TOKEN = "<long-random-secret>"
$env:PORT = "3000"
npm run build
npm run start:http
```

接入地址：

```text
http://<host>:3000/mcp
```

生产环境必须放在 HTTPS 反向代理后，并限制网络访问、调用频率和日志中的敏感信息。

## 小智 AI 接入

小智后台生成的地址形如：

```text
wss://api.xiaozhi.me/mcp/?token=<xiaozhi-endpoint-token>
```

该地址是小智客户端/代理连接小智后台的 WebSocket 接入点，不是本 Worker 的公开 `/mcp` URL。不要把该完整地址提交到仓库；泄露后应立即在小智后台重置。

推荐使用 `xiaozhi-client` 将小智 WebSocket 接入点连接到本远程 MCP：

```powershell
npm install -g xiaozhi-client
xiaozhi create xiaozhi-internal-tools
cd xiaozhi-internal-tools
xiaozhi config set mcpEndpoint "<小智后台生成的 wss 接入点>"
```

然后在该项目的 `xiaozhi.config.json` 中添加远程 MCP。可参考本仓库的 `xiaozhi.config.example.json`。`url` 填 Worker 的 `/mcp` 地址；`apiKey` 会被当前 `xiaozhi-client` 转换为 Bearer Authorization 请求头：

```json
{
  "mcpEndpoint": "<小智后台生成的 wss 接入点>",
  "mcpServers": {
    "xiaozhi-internal-mcp": {
      "type": "http",
      "url": "https://<worker-domain>/mcp",
      "apiKey": "<MCP_TOKEN>"
    }
  }
}
```

启动小智客户端：

```powershell
xiaozhi start
```

不同版本的 `xiaozhi-client` 对远程 MCP 配置字段可能调整。建议使用当前版本并在 Web UI 的 MCP 配置页面确认传输类型为 Streamable HTTP、URL 指向 `/mcp`、请求头包含 `Authorization`。

## 健康检查

```http
GET /health
```

配置正确时返回：

```json
{
  "status": "ok",
  "service": "xiaozhi-internal-mcp",
  "version": "2.0.0",
  "transport": "streamable-http",
  "mcpEndpoint": "/mcp",
  "tokenConfigured": true
}
```

## 本地 stdio

stdio 模式继续保留：

```powershell
$env:MCP_TOKEN = "<long-random-secret>"
npm run build
npm start
```

stdio 没有 HTTP 请求头，因此只有在进程环境中设置了 `MCP_TOKEN` 时才允许报价工具。

## 数据维护

- 管材尺寸：`src/data/pipe-sizes.ts`
- 管件尺寸：`src/data/fitting-sizes.ts`
- 报价规则：`src/data/quote-rules.ts`
- 博客文章：`src/data/blog-articles.json`

当前数据和报价规则均为 mock 数据。系统不会自动写入 ERP，也不会自动向客户发送报价。

## 项目结构

```text
src/
  server.ts       共享的 8 个 MCP tools 注册
  httpApp.ts      Streamable HTTP、健康检查和请求鉴权
  worker.ts       Cloudflare Worker 入口
  http.ts         Node.js HTTP 入口
  index.ts        stdio 入口
  data/           mock 数据和报价规则
  tools/          业务实现
test/
  http.test.ts    远程 MCP、健康检查和鉴权测试
  mcp.test.ts     stdio MCP 端到端测试
  tools.test.ts   业务测试
```

## 安全说明

- 小智 WebSocket 接入点 token 与本服务 `MCP_TOKEN` 必须使用两个不同的 secret。
- 不要在源码、README、日志或截图中保存完整 token。
- Cloudflare 使用 `wrangler secret put MCP_TOKEN`，不要使用普通 `vars` 保存 secret。
- 特殊包装、特殊标准和非标尺寸必须人工复核，正式报价必须人工确认。
