# TradingPanda WebSocket Hub

Cloudflare Workers + Durable Objects 实时推送层，与 `docs/websocket-hub-design.md` 对齐。

## 架构

```
浏览器 ──WSS──► Router Worker (/ws)
                  │ JWT 校验 (HS256, 与 backend/frontend 共用 JWT_SECRET)
                  └──► UserHub DO (id = user:{user_id})
                         ├── WebSocket 连接池（单用户最多 3 条）
                         ├── subscribe.simulation / subscribe.market
                         └── @upstash/redis subscribe → 转发到浏览器
```

- **不**直连 `market-monitor`；行情与 `panda:*` 均来自 **Upstash Redis**
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
npx wrangler secret put JWT_SECRET
npx wrangler secret put UPSTASH_REDIS_REST_URL
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN
npm run deploy
```

将 Workers URL 填入前端 `NEXT_PUBLIC_WS_URL`（完整 `wss://` 基址，path 为 `/ws`）。

## 客户端命令

| command | 说明 |
|---------|------|
| `subscribe.simulation` | `payload: { panda_id, simulation_id }` |
| `unsubscribe.simulation` | `payload: { panda_id }` |
| `subscribe.market` | `payload: { assets: ['BTC','SUI'], interval: '1m' }` |
| `unsubscribe.market` | 取消行情订阅 |
| `pong` | 响应服务端 `ping` |

成功订阅后返回 `subscribed` 事件（含当前 Redis 频道列表）。

## 测试

```bash
npm test
npm run typecheck
```
