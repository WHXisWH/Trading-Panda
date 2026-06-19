<div align="center">

# 🐼 TradingPanda

**Sui-native autonomous agent wallet · Sui Overflow 2026**

**[English](#english) · [中文](#中文)**

</div>

---

<a id="english"></a>

## English

> **[中文版本 →](#中文)**

### What is TradingPanda?

TradingPanda is a **Sui-native autonomous agent wallet training system**. You mint a Panda NFT as agent identity, sign a Move-enforced **TradingPolicy** and **PandaVault**, and train the Panda on **real DeepBook mainnet market data**. The Panda watches markets, decides autonomously, and every action passes your on-chain rules—leaving an inspectable evidence trail.

> *You are not using an AI trading bot—you are training a Move-constrained autonomous trading wallet. The Panda is your agent's face: collectible and emotionally legible, but the product is bounded autonomy under your control.*

**Two-track model (PRD v3.1):**

```text
Track A — Training Truth
DeepBook mainnet → Panda decision → Training Ledger (paper) → PnL / Review / Skill Memory

Track B — Chain Execution Proof
Same decision intent → testnet PTB → PandaCoin / PandaVault → TradingPolicy gate → tx digest
```

Mainnet market data determines whether the Panda was right. Testnet PTBs prove the Panda can act autonomously under Move-enforced rules.

→ Product story for judges & partners: **[docs/product-description.md](docs/product-description.md)**  
→ Full requirements: **[docs/PRD.md](docs/PRD.md)**

---

### Core Objects

| Object | Role |
|---|---|
| **Panda NFT** | Agent identity; mint-time personality via `sui::random` |
| **TradingPolicy** | Risk collar—pairs, size caps, loss limits, pause/revoke |
| **PandaVault** | Bounded execution container; spends stay inside the vault |
| **Agent Signer** | Authorized automated signer (not your owner wallet) |
| **Training Ledger** | Mainnet-priced paper execution truth |
| **Trade Fact** | Evidence record for every decision |
| **Skill Memory** | Learned instinct from reviewed outcomes |
| **Chain Proof** | Selected Trade Fact submitted as a real testnet PTB |

---

### Architecture

```text
Browser
 │ HTTPS (REST + BFF) ──────────────► frontend/          Next.js 14 · Vercel-ready
 │ WSS (single connection) ─────────► websocket/           CF Workers + Durable Objects
 │                                      │ subscribe Redis: market:tick:* + panda:*
 │                                      ▼
 │                                 Upstash Redis
 │                                      ▲
 │                                      │ PUBLISH
 ├──────────────────────────────────────┤
 │                                      │
market-monitor/                    backend/
DeepBook mainnet Indexer           FastAPI · PandaActor · DecisionPipeline
→ PUBLISH market:tick:*            → PUBLISH panda:*
→ GET /candles (REST history)      → Training Ledger · Trade Facts · Merkle

Blockchain → Sui Testnet (identity, policy, vault, PandaCoin, proofs)
Database   → PostgreSQL (Supabase)
```

Real-time K-line uses **Plan A**: one WebSocket Hub connection (`NEXT_PUBLIC_WS_URL`). Plan B (standalone K-line WSS on `:9009`) is **not deployed for MVP**.

→ **[docs/architecture.md](docs/architecture.md)** · **[docs/websocket-hub-design.md](docs/websocket-hub-design.md)** · **[docs/market-monitor-design.md](docs/market-monitor-design.md)**

---

### User Journey

| Step | Screen | What happens |
|---|---|---|
| 1 | Landing `/` | Understand bounded autonomy vs blind-trust agents |
| 2 | Mint `/mint` | Mint Panda NFT; on-chain personality is fixed |
| 3 | Agent Wallet `/agent-wallet` | Create PandaVault + TradingPolicy (owner-signed PTB) |
| 4 | Strategy `/strategy/[id]` | Feed strategy via rule blocks (+ optional LLM parse) |
| 5 | Training Ledger `/training-ledger/[id]` | Panda watches DeepBook; paper execution + live K-line |
| 6 | Review `/review` | Inspect wins/losses; Skill Memory updates |
| 7 | Chain Proof `/chain-proof` | Optional testnet PTB proof for selected Trade Facts |
| 8 | Safety `/safety/[id]` | Pause, revoke, or tighten policy |

→ **[docs/user-journey.md](docs/user-journey.md)** · **[docs/design/README.md](docs/design/README.md)**

---

### Project Status (MVP)

| Area | Status |
|---|---|
| Mint flow | ✅ Done |
| Agent Wallet (vault + policy) | ✅ Done |
| Strategy builder + ghost decay | ✅ Done |
| 8-step decision engine + PandaActor | 🟡 MVP (~90%) |
| Training Ledger UI + WSS | 🟡 In progress (~70%) |
| Merkle Root worker | 🟡 ~95% |
| Chain Proof (Mode 2) | 🟡 Config-dependent |
| NFT Kiosk market | 🟡 UI mock (~40%) |
| Leaderboard / achievements / checkin | 🟡 Off-chain done (~80%) |

Deployment URLs are not published yet. See **[dev-docs/DEV_CONTEXT.md](dev-docs/DEV_CONTEXT.md)** for the live development truth.

---

### Deployed Contracts (Sui Testnet v4)

| | |
|---|---|
| Network | Sui Testnet |
| Package ID (original-id, event lineage) | `0x595087bb3e5f6c5011585797e4eb4db513b55d39ce84f984bb357e9375c11465` |
| Package published-at (v4 — **use for PTB moveCall**) | `0x00d500fb909a63177ae0f88812a06b0ba071e151dd5cb80e9f51af250d6a6339` |
| PandaRegistry | `0x5cbf822c3fe346d7001125ff0ad52d675611148b2c4734d1e200ebf23d53baa5` |
| AchievementRegistry | `0x53c879bc3560a54548219f0a1f44dff471792c585a7b666829cfa08e722c8f8b` |
| AdminCap | `0xf6ff3f496b7471353dc2ea3c7732cd822f596cdb62d27bdb0362171862b60a00` |
| PandaCoin TreasuryCap | `0x3286e67193c94b1a46fbcc2d08632c30cc6c30dd5b4f31a8787942d8a04b98f6` |

---

### Repository Structure

```text
Trading-Panda/
├── contracts/          # Sui Move (15 modules, Testnet v4)
│   └── sources/
│       ├── panda.move · panda_registry.move · mint.move
│       ├── trading_policy.move · panda_vault.move · agent_wallet.move
│       ├── panda_coin.move · chain_proof_executor.move
│       ├── strategy.move · experience.move · trust_proof.move
│       ├── achievement.move · checkin.move · market.move · deepbook_adapter.move
│
├── backend/            # Python 3.11 · FastAPI · PandaActor · DecisionPipeline
├── frontend/           # Next.js 14 · TypeScript · BFF API routes · App Router UI
├── market-monitor/     # DeepBook mainnet → Redis ticks + REST /candles
├── websocket/          # Cloudflare WebSocket Hub (market.tick + panda events)
├── docs/               # PRD, architecture, API spec, design/, …
└── dev-docs/
    └── DEV_CONTEXT.md  # Deployment facts + changelog (source of truth)
```

---

### Running Locally

**Prerequisites:** Node.js 18+, Python 3.11+, PostgreSQL, Upstash Redis (`rediss://`), Sui Testnet wallet (~0.1 SUI for mint/setup)

Run **four services** in four terminals:

| Terminal | Directory | Command | Port |
|---|---|---|---|
| T1 | `backend/` | `uvicorn main:app --reload` | 8000 |
| T2 | `market-monitor/` | `uvicorn main:app --reload --port 8001` | 8001 |
| T3 | `websocket/` | `npm run dev` | 8787 |
| T4 | `frontend/` | `npm run dev` | 3000 |

**Setup (first time):**

```bash
# Backend
cd backend && cp .env.example .env
pip install -r requirements.txt

# Market monitor
cd market-monitor && cp .env.example .env
pip install -r requirements.txt

# WebSocket Hub
cd websocket && cp .dev.vars.example .dev.vars && npm install

# Frontend
cd frontend && cp .env.example .env.local && npm install
```

Copy contract IDs from `frontend/.env.example`. `JWT_SECRET` must match across frontend, backend, and websocket. Full env checklist: **[dev-docs/DEV_CONTEXT.md](dev-docs/DEV_CONTEXT.md)** §4.

**Smoke checks:**

```bash
curl http://localhost:8000/health
curl http://localhost:8001/health
curl "http://localhost:8001/candles/SUI_USDC?interval=1m&limit=10"
```

**Manual test path:** connect wallet → `/mint` → `/agent-wallet` → `/strategy/[id]` → `/training-ledger/[id]` → review / chain proof / safety.

→ Step-by-step guide: **[docs/local-manual-test-guide.md](docs/local-manual-test-guide.md)**

---

### Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Sui Move v4 — `sui::random`, Dynamic Fields, Kiosk, PandaCoin |
| Frontend | Next.js 14 App Router, TypeScript, Tailwind, @mysten/dapp-kit, zkLogin, lightweight-charts, Rive |
| Backend | Python 3.11, FastAPI, asyncio, SQLAlchemy 2.0 async, PandaActor |
| Real-time | Upstash Redis Pub/Sub + Cloudflare WebSocket Hub |
| Market data | `market-monitor/` → DeepBook mainnet Indexer |
| AI | DeepSeek V3 — strategy parsing + Agent Coordinator |
| Storage | PostgreSQL (Supabase) + Walrus (skill/review archive) |

---

### Documentation Map

| Document | Purpose |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Product requirements v3.1 |
| [docs/product-description.md](docs/product-description.md) | External product story (judges, partners) |
| [docs/architecture.md](docs/architecture.md) | System architecture |
| [docs/user-journey.md](docs/user-journey.md) | Screen-level user journeys |
| [docs/local-manual-test-guide.md](docs/local-manual-test-guide.md) | Four-service local verification |
| [docs/api-specification.md](docs/api-specification.md) | REST + WebSocket contracts |
| [docs/agent-design.md](docs/agent-design.md) | 8-step decision engine |
| [docs/contract-design.md](docs/contract-design.md) | Move module design |
| [docs/design/README.md](docs/design/README.md) | Page design specs |
| [dev-docs/DEV_CONTEXT.md](dev-docs/DEV_CONTEXT.md) | Deployment facts + changelog |

---

<a id="中文"></a>

## 中文

> **[English Version →](#english)**

### TradingPanda 是什么？

TradingPanda 是 **Sui 链上的自主 Agent 钱包训练系统**。你铸造 Panda NFT 作为 Agent 身份，签署 Move 强制的 **TradingPolicy** 与 **PandaVault**，并在 **DeepBook 主网真实行情**上训练熊猫自主交易。熊猫自主盯盘、决策，每笔动作都经过你设定的链上规则，并留下可审计的证据链。

> *你不是在用 AI 炒币机器人——你在训练一只受 Move 约束的自主交易钱包。熊猫是 Agent 的面孔：可收藏、有情绪，但产品核心是「有边界的自主性」。*

**双轨模型（PRD v3.1）：**

```text
Track A — 训练真相
DeepBook 主网 → 熊猫决策 → Training Ledger（纸面）→ 盈亏 / 复盘 / Skill Memory

Track B — 链上执行证明
同一决策意图 → Testnet PTB → PandaCoin / PandaVault → TradingPolicy 校验 → tx digest
```

主网行情决定熊猫对不对；Testnet PTB 证明熊猫能在 Move 规则下自主行动。

→ 对外产品故事：**[docs/product-description.md](docs/product-description.md)**  
→ 完整需求：**[docs/PRD.md](docs/PRD.md)**

---

### 核心对象

| 对象 | 作用 |
|---|---|
| **Panda NFT** | Agent 身份；铸造时 `sui::random` 生成性格 |
| **TradingPolicy** | 风险项圈：交易对、单笔上限、亏损上限、暂停/撤销 |
| **PandaVault** | 有边界的执行容器；资金只在 Vault 内流转 |
| **Agent Signer** | 授权的自动化签名地址（非你的 Owner 钱包） |
| **Training Ledger** | 以主网价格计价的纸面执行真相 |
| **Trade Fact** | 每笔决策的证据记录 |
| **Skill Memory** | 复盘后的交易本能 |
| **Chain Proof** | 选定 Trade Fact 提交为真实 Testnet PTB |

---

### 架构

```text
浏览器
 │ HTTPS（REST + BFF）──────────────► frontend/          Next.js 14
 │ WSS（单连接）────────────────────► websocket/           CF Workers + Durable Objects
 │                                      │ 订阅 Redis：market:tick:* + panda:*
 │                                      ▼
 │                                 Upstash Redis
 │                                      ▲
 │                                      │ PUBLISH
 ├──────────────────────────────────────┤
 │                                      │
market-monitor/                    backend/
DeepBook 主网 Indexer              FastAPI · PandaActor · 决策引擎
→ PUBLISH market:tick:*            → PUBLISH panda:*
→ GET /candles（历史 K 线）         → Training Ledger · Trade Facts · Merkle

链上 → Sui Testnet（身份、策略、Vault、PandaCoin、证明）
数据库 → PostgreSQL（Supabase）
```

实时 K 线采用 **方案甲**：浏览器单连 WebSocket Hub（`NEXT_PUBLIC_WS_URL`）。方案乙（独立 K 线 WSS `:9009`）**MVP 不部署**。

→ **[docs/architecture.md](docs/architecture.md)** · **[docs/websocket-hub-design.md](docs/websocket-hub-design.md)** · **[docs/market-monitor-design.md](docs/market-monitor-design.md)**

---

### 用户旅程

| 步骤 | 页面 | 说明 |
|---|---|---|
| 1 | 首页 `/` | 理解「有边界自主」vs「盲信 Agent」 |
| 2 | 铸造 `/mint` | 铸造 Panda NFT；链上性格不可改 |
| 3 | Agent Wallet `/agent-wallet` | 创建 PandaVault + TradingPolicy（Owner 签名 PTB） |
| 4 | 策略 `/strategy/[id]` | 规则积木喂策略（可选 LLM 解析） |
| 5 | Training Ledger `/training-ledger/[id]` | 盯 DeepBook 主网；纸面执行 + 实时 K 线 |
| 6 | 复盘 `/review` | 查看盈亏；更新 Skill Memory |
| 7 | Chain Proof `/chain-proof` | 可选：将选定 Trade Fact 提交 Testnet PTB |
| 8 | 安全 `/safety/[id]` | 暂停、撤销、收紧策略 |

→ **[docs/user-journey.md](docs/user-journey.md)** · **[docs/design/README.md](docs/design/README.md)**

---

### 项目状态（MVP）

| 模块 | 状态 |
|---|---|
| 铸造流程 | ✅ 完成 |
| Agent Wallet（Vault + Policy） | ✅ 完成 |
| 策略积木 + 残影衰减 | ✅ 完成 |
| 8 步决策引擎 + PandaActor | 🟡 MVP（~90%） |
| Training Ledger UI + WSS | 🟡 进行中（~70%） |
| Merkle Root Worker | 🟡 ~95% |
| Chain Proof（Mode 2） | 🟡 依赖配置 |
| NFT Kiosk 市场 | 🟡 UI Mock（~40%） |
| 排行榜 / 成就 / 签到 | 🟡 链下完成（~80%） |

线上 Demo URL 暂未发布。开发事实以 **[dev-docs/DEV_CONTEXT.md](dev-docs/DEV_CONTEXT.md)** 为准。

---

### 已部署合约（Sui Testnet v4）

| | |
|---|---|
| 网络 | Sui Testnet |
| Package ID（original-id，事件 lineage） | `0x595087bb3e5f6c5011585797e4eb4db513b55d39ce84f984bb357e9375c11465` |
| Package published-at（v4，**PTB moveCall 须用此地址**） | `0x00d500fb909a63177ae0f88812a06b0ba071e151dd5cb80e9f51af250d6a6339` |
| PandaRegistry | `0x5cbf822c3fe346d7001125ff0ad52d675611148b2c4734d1e200ebf23d53baa5` |
| AchievementRegistry | `0x53c879bc3560a54548219f0a1f44dff471792c585a7b666829cfa08e722c8f8b` |
| AdminCap | `0xf6ff3f496b7471353dc2ea3c7732cd822f596cdb62d27bdb0362171862b60a00` |
| PandaCoin TreasuryCap | `0x3286e67193c94b1a46fbcc2d08632c30cc6c30dd5b4f31a8787942d8a04b98f6` |

---

### 目录结构

```text
Trading-Panda/
├── contracts/          # Sui Move（15 个模块，Testnet v4）
│   └── sources/
│       ├── panda.move · panda_registry.move · mint.move
│       ├── trading_policy.move · panda_vault.move · agent_wallet.move
│       ├── panda_coin.move · chain_proof_executor.move
│       ├── strategy.move · experience.move · trust_proof.move
│       ├── achievement.move · checkin.move · market.move · deepbook_adapter.move
│
├── backend/            # Python 3.11 · FastAPI · PandaActor · 决策引擎
├── frontend/           # Next.js 14 · TypeScript · BFF · App Router
├── market-monitor/     # DeepBook 主网 → Redis tick + REST /candles
├── websocket/          # Cloudflare WebSocket Hub
├── docs/               # PRD、架构、API、design/ 等
└── dev-docs/
    └── DEV_CONTEXT.md  # 部署事实 + 变更日志（唯一真相）
```

---

### 本地运行

**前置条件：** Node.js 18+、Python 3.11+、PostgreSQL、Upstash Redis（`rediss://`）、Sui Testnet 钱包（铸造/Setup 约需 0.1 SUI）

在四个终端分别启动：

| 终端 | 目录 | 命令 | 端口 |
|---|---|---|---|
| T1 | `backend/` | `uvicorn main:app --reload` | 8000 |
| T2 | `market-monitor/` | `uvicorn main:app --reload --port 8001` | 8001 |
| T3 | `websocket/` | `npm run dev` | 8787 |
| T4 | `frontend/` | `npm run dev` | 3000 |

**首次配置：**

```bash
# 后端
cd backend && cp .env.example .env
pip install -r requirements.txt

# 行情服务
cd market-monitor && cp .env.example .env
pip install -r requirements.txt

# WebSocket Hub
cd websocket && cp .dev.vars.example .dev.vars && npm install

# 前端
cd frontend && cp .env.example .env.local && npm install
```

合约地址见 `frontend/.env.example`。`JWT_SECRET` 须在 frontend、backend、websocket 三处一致。完整环境变量：**[dev-docs/DEV_CONTEXT.md](dev-docs/DEV_CONTEXT.md)** §4。

**健康检查：**

```bash
curl http://localhost:8000/health
curl http://localhost:8001/health
curl "http://localhost:8001/candles/SUI_USDC?interval=1m&limit=10"
```

**手测路径：** 连接钱包 → `/mint` → `/agent-wallet` → `/strategy/[id]` → `/training-ledger/[id]` → 复盘 / Chain Proof / 安全页。

→ 详细步骤：**[docs/local-manual-test-guide.md](docs/local-manual-test-guide.md)**

---

### 技术栈

| 层级 | 技术 |
|---|---|
| 区块链 | Sui Move v4 — `sui::random`、Dynamic Fields、Kiosk、PandaCoin |
| 前端 | Next.js 14 App Router、TypeScript、Tailwind、@mysten/dapp-kit、zkLogin、lightweight-charts、Rive |
| 后端 | Python 3.11、FastAPI、asyncio、SQLAlchemy 2.0 async、PandaActor |
| 实时 | Upstash Redis Pub/Sub + Cloudflare WebSocket Hub |
| 行情 | `market-monitor/` → DeepBook 主网 Indexer |
| AI | DeepSeek V3 — 策略解析 + Agent Coordinator |
| 存储 | PostgreSQL（Supabase）+ Walrus（skill/复盘归档） |

---

### 文档地图

| 文档 | 用途 |
|---|---|
| [docs/PRD.md](docs/PRD.md) | 产品需求 v3.1 |
| [docs/product-description.md](docs/product-description.md) | 对外产品故事（评委、合作方） |
| [docs/architecture.md](docs/architecture.md) | 系统架构 |
| [docs/user-journey.md](docs/user-journey.md) | 屏幕级用户旅程 |
| [docs/local-manual-test-guide.md](docs/local-manual-test-guide.md) | 四服务本地联调 |
| [docs/api-specification.md](docs/api-specification.md) | REST + WebSocket 契约 |
| [docs/agent-design.md](docs/agent-design.md) | 8 步决策引擎 |
| [docs/contract-design.md](docs/contract-design.md) | Move 模块设计 |
| [docs/design/README.md](docs/design/README.md) | 页面设计规范 |
| [dev-docs/DEV_CONTEXT.md](dev-docs/DEV_CONTEXT.md) | 部署事实 + 变更日志 |
