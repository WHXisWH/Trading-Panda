# WebSocket Hub — Cloudflare Workers + Durable Objects

> 将「实时推送层」从 Vercel（无长连接）迁出，由 **Cloudflare Workers + Durable Objects（DO）** 承载；与既有 **Python Decision Engine（Render）+ Redis Pub/Sub** 对齐。  
> **最后更新**：2026-05-13

---

## 1. 目标

| 目标 | 说明 |
|------|------|
| 长连接 | WebSocket 升级与保持由 Edge 完成，不依赖 Vercel Serverless |
| 与 DE 解耦 | 决策/情绪等事件仍由 Python 发布到 Redis；Hub 只消费与转发 |
| 成本与休眠 | 利用 WebSocket **Hibernation**，无消息时降低 CPU 计费 |
| 水平扩展 | 按 `hash(user_id)` 路由到多个 DO 实例，避免单点内存上限 |

---

## 2. 拓扑（逻辑）

```
浏览器 ──WSS──► Cloudflare Worker（升级 WS）
                    │
                    └──► Durable Object（每用户或每分片）
                              │
                              │  订阅 Redis（与 Render 上 DE 同一 Redis）
                              │  channels: panda:{id}, panda:{id}:emotion, …
                              ▼
                    推送到该用户已订阅的 WebSocket

浏览器 ──HTTPS──► Vercel Next.js（REST / JWT 签发 / 业务代理）
                    │
                    └──► Render FastAPI（Decision Engine）
                              │
                              └──► Redis PUBLISH（事件源）
```

**原则**：PostgreSQL 与链上仍为权威数据；Redis 为消息总线 + 缓存；DO 仅存连接与推送相关的**短时、小体量**状态（见下文）。

---

## 3. 组件职责

### 3.1 Router Worker

- 校验 JWT（与 Next 签发算法一致；密钥通过 Worker Secret / 或短时 introspection）
- 连接级限流（例如每连接 10 msg/s）
- `fetch` 中完成 WebSocket 升级，将 socket 交给对应 DO

### 3.2 Durable Object（每分片）

- 维护该分片内用户的 **WebSocket 句柄**、**订阅频道**（如 `user:{addr}` / `panda:{id}`）
- 使用 **alarms** 做心跳检测与清理僵死连接
- 从 Redis **SUBSCRIBE**（或轮询 + Stream，视实现选型）读取消息，写入已连接客户端
- 可选：**小队列**（有界）在客户端背压时暂存；满则按策略丢弃最旧（与 `backend-design` 背压一致）

---

## 4. Redis 与 Python 的契约（不变）

Decision Engine 在产生事件后 **PUBLISH** 到既有 channel（如 `panda:{id}`）；Hub **不**改写业务消息格式。事件类型仍以 `docs/api-specification.md`「WebSocket Events」为准。

---

## 5. DO 存储边界（必须遵守）

| 适合放在 DO | 不适合放在 DO |
|-------------|----------------|
| 连接 id、订阅列表、最近心跳时间 | 用户画像、熊猫完整状态、交易历史 |
| 可选：短 TTL 展示用快照（从 DE HTTP 拉取） | Merkle、胜率、权威策略 JSON |
| 有界未送达队列（背压） | 主业务持久化（应在 PostgreSQL） |

---

## 6. 前端与环境变量

- 浏览器连接：`{NEXT_PUBLIC_WS_URL}` 为完整 **`wss://…`** 基址，再拼接 path 与 query（与 `docs/api-specification.md` 同步）
- JWT 仍由 Next.js API Route 签发；WS 握手携带 `?token=` 或与 `Sec-WebSocket-Protocol` 约定一致（实现时二选一并在 api-spec 中写死）

---

## 7. 与 Vercel / Render 的关系

| 层 | 部署 | 职责 |
|----|------|------|
| HTTP API Gateway | Vercel · Next.js | REST、鉴权、转发 FastAPI、静态与 SSR |
| WebSocket Hub | Cloudflare Workers + DO | 长连接、订阅、推送 |
| Decision Engine | Render · FastAPI | 决策、Actor、**发布** Redis 事件 |

---

## 8. 扩展阅读（仓库外原文）

个人调研笔记（Obsidian，**不随仓库版本管理**）：  
`/Users/Murphywuwu/Documents/Obsidian Vault/Artifact-Registry/sui-ai-trading-pet/research/websocket-cloudflare-feasibility.md`  

若路径不同，以负责人本地副本为准；**以本文 + `api-specification.md` 为仓库内唯一契约来源**。
