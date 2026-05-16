# TradingPanda — 开发规则（每次开发必须先读）

> **这是最高优先级文档。开始任何工作之前，必须读完本文件并确认理解。**

---

## 第一条规则：维护 DEV_CONTEXT.md

**每次开发会话结束前，必须更新 `dev-docs/DEV_CONTEXT.md`。**

格式要求：
- 在「变更日志」表格末尾**追加一行**（只追加，不改写历史行）
- 格式：`| 日期 | 做了什么 | 影响/验收结果 |`
- 若改动了部署事实（环境变量、端口、数据库结构、API 路径），同步更新 DEV_CONTEXT.md 对应段落
- 任何仅在本地/外部系统完成的配置变更，也必须记录在日志中

违反此规则 = 工作未完成。

---

## 项目概览

**TradingPanda**：Sui 链上 AI 交易宠物养成系统。用户铸造熊猫 NFT，喂给它交易策略，熊猫在模拟盘自主交易并成长。

**一句话**：养一只会交易的 AI 熊猫。

### 服务拓扑

```
用户浏览器
    │ HTTPS                    WSS（实时）
    │   │                         │
    ▼   ▼                         ▼
frontend/   ← Next.js 14，Vercel（仅 HTTP API Gateway）
    │ Internal HTTP
    │                         Cloudflare Workers + Durable Objects
    │                         （WebSocket Hub，独立部署，规划中）
    │                              │ Upstash：CF 侧 REST 订阅，与 DE 同库
    ▼                              │
backend/    ← Python FastAPI，Render（SUBSCRIBE 行情 + PUBLISH panda 事件）
    │
market-monitor/ ← 独立 Render 服务（DeepBook v3 → PUBLISH market:tick:*）
    │
    ├── PostgreSQL (Supabase 或 Render PostgreSQL)
    ├── Upstash Redis（Pub/Sub + 缓存；见 docs/redis-architecture.md）
    └── Sui Testnet (合约 + DeepBook 只读 RPC)

contracts/  ← Sui Move，部署在 Sui Testnet
```

---

## 文档地图

| 文档 | 职责 |
|------|------|
| `docs/PRD.md` | 产品需求（统一版，含18项冲突修正） |
| `docs/agent-design.md` | 8步决策引擎设计 |
| `docs/backend-design.md` | Python 服务与边缘层架构 |
| `docs/redis-architecture.md` | Redis 部署（Upstash）、Pub/Sub 频道、DE/CF 双端接入 |
| `docs/market-monitor-design.md` | 独立市场监听（DeepBook v3）、`market:tick:*` 契约 |
| `docs/websocket-hub-design.md` | WebSocket Hub（Cloudflare Workers + DO）契约与存储边界 |
| `docs/frontend-design.md` | Next.js 页面设计 |
| `docs/database-schema.md` | PostgreSQL 表设计 |
| `docs/api-specification.md` | REST + WS + RPC 接口契约 |
| `docs/contract-design.md` | Sui Move 合约设计 |
| `docs/testing-strategy.md` | 测试策略 |
| **`dev-docs/DEV_CONTEXT.md`** | **当前部署事实 + 变更日志（唯一真相）** |

---

## 技术栈速查

### Frontend (Vercel)
- Next.js 14 App Router + TypeScript
- @mysten/dapp-kit (Sui 钱包)、@mysten/zklogin
- Zustand (状态管理)、@tanstack/react-query (数据请求)
- Tailwind CSS、Radix UI、Rive (熊猫动画)、lightweight-charts (K线)
- 浏览器原生 WebSocket（`NEXT_PUBLIC_WS_URL`）→ Cloudflare Workers + Durable Objects 实时推送

### Backend (Render)
- Python 3.11 + FastAPI + uvicorn
- asyncio + **Upstash** Redis Pub/Sub（Actor 模型，最多100个 PandaActor）；`REDIS_URL` 使用 `rediss://`
- SQLAlchemy 2.0 async + asyncpg (PostgreSQL)
- DeepSeek V3 API (策略解析 + Agent Coordinator，3s 超时)
- pysui / sui-py SDK (链上交互)

### Blockchain (Sui Testnet)
- Sui Move 合约（8个模块，见 contracts/sources/）
- DeepBook（模拟执行数据源）
- Walrus（经验数据备份，每50笔或NFT转让前强制同步）

---

## 关键业务规则（编码时必须遵守）

1. **执行阈值**：`final_score > 0.65` 执行 / `0.40-0.65` 观望 / `< 0.40` 忽视（PRD §C12）
2. **情绪稳定性**：`emotion_stability ≈ patience`，不是独立字段（PRD §C9）
3. **所有计算在服务端**：前端只展示，不做决策计算（PRD §C4）
4. **Merkle Root**：每50笔交易计算一次并提交链上（PRD §C1）
5. **胜率**：链下 PostgreSQL 计算，不上链（PRD §C11）
6. **策略残影**：换策后旧策略影响通过 `ghost_weight` 衰减（PRD §C7）
7. **经验存 PostgreSQL**：无本地 SQLite（PRD §C2）
8. **MVP 无实盘**：DeepBook 仅作数据源 + 模拟执行，无真实下单（PRD §C5）
9. **情绪展示半透明**：表情/颜色/动作间接展示情绪，不暴露数值系数给用户

---

## MVP 验收标准

- [ ] 新用户：问卷 → 铸造熊猫 → 喂策略 → 模拟盘 全流程通畅
- [ ] 决策链可视化（8步展开）正确展示
- [ ] 情绪通过表情/颜色间接展示，不暴露数值
- [ ] 策略残影在换策后可感知（熊猫行为有旧策略干扰）
- [ ] Merkle Root 每50笔交易上链
- [ ] NFT 市场买卖通过 Sui Kiosk 完成
- [ ] DeepBook 数据正确拉取并构建 K线
- [ ] 排行榜/成就/签到功能完整
- [ ] Battle Case 4个回归用例通过
- [ ] 决策引擎测试覆盖率 ≥ 80%

---

## 代码规范

- 函数 < 50 行，文件 < 800 行
- 永不原地修改传入对象（immutable 优先）
- 系统边界（用户输入、外部 API、链上数据）必须做输入校验（用 zod / pydantic）
- 错误必须显式处理，不能静默吞掉
- 不写超出当前任务范围的功能（YAGNI）
- 写代码前先写测试（TDD：RED → GREEN → IMPROVE）
- 命名：变量/函数用 camelCase，布尔用 is/has/should 前缀，常量用 UPPER_SNAKE_CASE

---

## 开发流程

```
1. 读本文件（CLAUDE.md）
2. 读 dev-docs/DEV_CONTEXT.md（了解当前部署事实）
3. 了解任务，制定实现计划
4. 先写测试（RED）
5. 写最小实现（GREEN）
6. 重构（IMPROVE）
7. 追加一行到 dev-docs/DEV_CONTEXT.md 变更日志
```
