# TradingPanda WebSocket Hub

Cloudflare Workers + Durable Objects 实时推送层，与 `docs/websocket-hub-design.md` 对齐。

## 架构

```
浏览器 ──WSS──► Router Worker (/ws)
                  │ JWT 校验 (HS256, 与 backend/frontend 共用 JWT_SECRET)
                  └──► UserHub DO (id = user:{user_id})
                         ├── WebSocket 连接池（单用户最多 3 条）
                         ├── subscribe.simulation（必须）
                         └── @upstash/redis subscribe panda:* → 转发到浏览器
```

- **不**直连 `market-monitor` HTTP；消费 Redis **`market:tick:*` + `panda:*`**（方案甲）
- **`subscribe.market`**：转发 `market:tick` → 前端 K 线（与 DE 同源）
- DO 命名：`user:{user_id}`（禁止用 `panda_id` 作 DO id）

## 本地开发

```bash
cd websocket
npm install
cp .dev.vars.example .dev.vars
# 填写 JWT_SECRET、UPSTASH_REDIS_REST_*（与 backend REDIS_URL 同一 Upstash 库）
npm run dev
```

连接示例（与 `docs/api-specification.md` §4.1 一致）：

```
wss://127.0.0.1:8787/ws?token={JWT}
```

健康检查：`GET /health`

## 部署

```bash
# 1. 登录 Cloudflare（浏览器 OAuth）
npx wrangler login

# 2. 配置本地 secrets（与 backend 同一 Upstash + JWT_SECRET）
cp .dev.vars.example .dev.vars

# 3. 一键部署（上传 Secrets + deploy）
bash scripts/deploy.sh
```

或手动：

```bash
npx wrangler secret put JWT_SECRET --env=""
npx wrangler secret put UPSTASH_REDIS_REST_URL --env=""
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN --env=""
npx wrangler deploy --env=""
```

**Free plan 注意**：`wrangler.toml` 须使用 `new_sqlite_classes`（非 `new_classes`）创建 Durable Object。

生产 URL（2026-06-20）：

- HTTP：`https://trading-panda-ws.502488946.workers.dev`
- WSS：`wss://trading-panda-ws.502488946.workers.dev/ws?token={JWT}`

将 WSS 基址填入 Vercel `NEXT_PUBLIC_WS_URL`（path 含 `/ws`）。

## 客户端命令

| command | 说明 |
|---------|------|
| `subscribe.simulation` | `payload: { panda_id, simulation_id }` |
| `unsubscribe.simulation` | `payload: { panda_id }` |
| `subscribe.market` | Redis `market:tick:*` → WS `market.tick`（**MVP 前端 K 线**） |
| `unsubscribe.market` | 取消行情订阅 |
| `pong` | 响应服务端 `ping` |

成功订阅后返回 `subscribed` 事件（含当前 Redis 频道列表）。

## 测试

```bash
npm test
npm run typecheck
```
