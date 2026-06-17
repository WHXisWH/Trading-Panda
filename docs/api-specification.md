# TradingPanda 接口定义文档

> 版本 1.0 · 2026-05-08
> 适用于 Sui Overflow 2026 黑客松 — AI 交易宠物养成系统

> **PRD v3.1 对齐说明（2026-06-17）**：本文件仍包含早期 `simulation` API 作为兼容接口。新实现语义以 `docs/PRD.md` v3.1、`docs/architecture.md`、`spec.md` 为准：`simulation/start|stop|status` 表示 Training Ledger agent session；新增实现应围绕 `OrderIntent`、`TradeFact`、`TradingPolicy`、`PandaVault`、`Chain Proof Moment` 设计。Mode 2 不为每笔 paper trade 上链，只为 selected/manual Chain Proof Moment 提交 testnet PandaCoin PTB。

### v3.1 API Addendum

| Surface | Required behavior |
|---|---|
| Agent setup | User signs PTBs to create shared `PandaVault` and standalone shared `TradingPolicy`. |
| Session start | Backend starts `PandaActor`; actor consumes `market:tick:*` and writes Training Ledger facts. |
| Policy controls | Pause/revoke must block both backend PolicyGate and Mode 2 Move execution. |
| Chain proof panel | API should expose Trade Fact proof status and support manual proof request. |
| Durable async | Chain proof/review/skill/merkle/walrus tasks should be visible through `async_jobs`-backed status. |

#### v3.1 REST 端点（2026-06-17 实现）

路径前缀均为 `/api/panda`（经 Next.js BFF 代理至 backend `/panda`）。`simulation/*` 为 **Training Ledger 会话兼容包装**，新前端应优先使用 `training/*` 读路径。

| 方法 | 路径 | 简述 | 认证 |
|------|------|------|------|
| GET | `/api/panda/:id/agent-wallet` | Agent Wallet 设置状态（vault/policy mirror） | JWT |
| POST | `/api/panda/:id/agent-wallet/validate-policy` | 校验 policy draft（不落库） | JWT |
| POST | `/api/panda/:id/agent-wallet/sync` | 链上 setup PTB 后 mirror vault + policy | JWT |
| POST | `/api/panda/:id/agent-wallet/owner-action` | 链上 owner action mirror（兼容；首选 `/safety/owner-action`） | JWT |
| POST | `/api/panda/:id/simulation/start` | **兼容** 启动 Training Ledger 会话（`PandaActor`） | JWT |
| POST | `/api/panda/:id/simulation/stop` | **兼容** 停止 Training Ledger 会话 | JWT |
| GET | `/api/panda/:id/simulation/status` | **兼容** 会话状态 + actor 摘要 | JWT |
| GET | `/api/panda/:id/training/ledger` | Training Ledger 账户快照（cash/positions/PnL） | JWT |
| GET | `/api/panda/:id/training/order-intents` | `OrderIntent` 时间线（含 policy 拒绝） | JWT |
| GET | `/api/panda/:id/training/trade-facts` | `TradeFact` 时间线 | JWT |
| GET | `/api/panda/:id/chain-proof/:tradeFactId` | Chain Proof Moment 资格与 job 状态 | JWT |
| POST | `/api/panda/:id/chain-proof/:tradeFactId/request` | 手动请求 Mode 2 testnet PandaCoin PTB | JWT |
| GET | `/api/panda/:id/reviews` | Review 列表 | JWT |
| GET | `/api/panda/:id/reviews/:reviewId` | 单条 Review 详情 | JWT |
| GET | `/api/panda/:id/trade-facts/:tradeFactId/review` | Trade Fact 关联 Review | JWT |
| POST | `/api/panda/:id/trade-facts/:tradeFactId/review` | 手动触发 Review job | JWT |
| GET | `/api/panda/:id/skill-memories` | Skill Memory 列表 | JWT |
| GET | `/api/panda/:id/skill-versions/latest` | 最新 skill version + digest 状态 | JWT |
| GET | `/api/panda/:id/safety` | 安全态（policy pause/revoke、pending jobs） | JWT |
| POST | `/api/panda/:id/safety/owner-action` | 链上 pause/revoke/tighten mirror | JWT |
| GET | `/api/panda/:id/trust/merkle` | 最新 Merkle batch 状态 | JWT |
| GET | `/api/panda/:id/trust/merkle/history` | Merkle batch 历史 | JWT |
| GET | `/api/panda/:id/trust/skill-digest` | 最新 skill digest 链上状态 | JWT |

**v3.1 错误码**（与 `backend/app/schemas/errors.py` 对齐）：`VAULT_*` · `POLICY_*` · `LEDGER_*` · `TRADE_FACT_*` · `CHAIN_PROOF_*` · `AGENT_SIGNER_*` · `REVIEW_*` · `SKILL_*`。

**v3.1 WebSocket 事件**（Hub 频道 `panda:{id}:*`）：`decision` · `order_intent` · `execution` · `policy_rejected` · `market_stale` · `review` · `skill`（后两者由 async worker 发出）。

---

## 一、接口总览

### REST API 端点

| 方法 | 路径 | 简述 | 认证 |
|------|------|------|------|
| POST | `/api/auth/connect` | 钱包/zkLogin 连接 | 无 |
| POST | `/api/auth/refresh` | 刷新 Token | Refresh Token |
| GET | `/api/auth/me` | 获取当前用户信息 | JWT |
| POST | `/api/panda/mint` | 铸造熊猫 NFT | JWT |
| GET | `/api/panda/:id` | 获取熊猫详情 | JWT |
| GET | `/api/panda/my` | 获取我的所有熊猫 | JWT |
| PUT | `/api/panda/:id/name` | 给熊猫命名 | JWT |
| GET | `/api/panda/:id/personality` | 获取性格雷达图数据 | JWT |
| POST | `/api/panda/:id/strategy` | 喂策略（`parsed` 直传或 `raw_text`+LLM） | JWT |
| POST | `/api/panda/:id/strategy/validate` | 校验策略（不存库，积木预览） | JWT |
| GET | `/api/panda/:id/strategy` | 获取当前策略 | JWT |
| GET | `/api/panda/:id/strategy/history` | 策略变更历史 | JWT |
| GET | `/api/panda/:id/strategy/match` | 策略-性格匹配度 | JWT |
| POST | `/api/panda/:id/simulation/start` | 开始 Training Ledger 会话（**兼容路径**） | JWT |
| POST | `/api/panda/:id/simulation/stop` | 停止 Training Ledger 会话（**兼容路径**） | JWT |
| GET | `/api/panda/:id/simulation/status` | 当前 Training Ledger 会话状态（**兼容路径**） | JWT |
| GET | `/api/panda/:id/simulation/history` | 历史会话列表 | JWT |
| GET | `/api/panda/:id/agent-wallet` | Agent Wallet 设置状态 | JWT |
| POST | `/api/panda/:id/agent-wallet/validate-policy` | 校验 TradingPolicy draft | JWT |
| POST | `/api/panda/:id/agent-wallet/sync` | 链上 vault/policy 创建后 mirror | JWT |
| GET | `/api/panda/:id/training/ledger` | Training Ledger 账户与持仓 | JWT |
| GET | `/api/panda/:id/training/order-intents` | OrderIntent 时间线 | JWT |
| GET | `/api/panda/:id/training/trade-facts` | Trade Fact 时间线 | JWT |
| GET | `/api/panda/:id/chain-proof/:tradeFactId` | Chain Proof Moment 状态 | JWT |
| POST | `/api/panda/:id/chain-proof/:tradeFactId/request` | 请求 Chain Proof PTB | JWT |
| GET | `/api/panda/:id/reviews` | Review 列表 | JWT |
| GET | `/api/panda/:id/trade-facts/:tradeFactId/review` | Trade Fact Review | JWT |
| POST | `/api/panda/:id/trade-facts/:tradeFactId/review` | 触发 Review | JWT |
| GET | `/api/panda/:id/skill-memories` | Skill Memory 列表 | JWT |
| GET | `/api/panda/:id/skill-versions/latest` | 最新 Skill version | JWT |
| GET | `/api/panda/:id/safety` | 安全控制状态 | JWT |
| POST | `/api/panda/:id/safety/owner-action` | Owner pause/revoke/tighten | JWT |
| GET | `/api/panda/:id/trust/merkle` | 最新 Merkle root 状态 | JWT |
| GET | `/api/panda/:id/trust/merkle/history` | Merkle 历史 | JWT |
| GET | `/api/panda/:id/trust/skill-digest` | Skill digest 链上状态 | JWT |
| GET | `/api/panda/:id/trades` | 交易历史 | JWT |
| GET | `/api/panda/:id/trades/:tradeId/decision` | 单笔交易决策链 | JWT |
| GET | `/api/panda/:id/experience` | 经验总览 | JWT |
| GET | `/api/panda/:id/experience/patterns` | 模式记忆 | JWT |
| GET | `/api/panda/:id/experience/mastery` | 资产专精度 | JWT |
| GET | `/api/panda/:id/experience/mistakes` | 错误反省日志 | JWT |
| GET | `/api/panda/:id/emotion` | 当前情绪状态 | JWT |
| GET | `/api/panda/:id/diary` | 熊猫日记 | JWT |
| GET | `/api/market/listings` | 市场列表 | 可选 |
| GET | `/api/market/listings/:id` | 上架详情 | 可选 |
| POST | `/api/market/list` | 上架 NFT | JWT |
| POST | `/api/market/delist` | 下架 NFT | JWT |
| POST | `/api/market/buy` | 购买 NFT | JWT |
| GET | `/api/leaderboard` | 排行榜 | 可选 |
| GET | `/api/leaderboard/my-rank` | 我的排名 | JWT |
| GET | `/api/achievements` | 所有成就定义 | 可选 |
| GET | `/api/achievements/my` | 我已解锁的成就 | JWT |
| POST | `/api/checkin` | 签到 | JWT |
| GET | `/api/checkin/status` | 签到状态 | JWT |
| GET | `/api/market-data/:asset/kline` | K线数据 | JWT |
| GET | `/api/market-data/:asset/current` | 当前价格 | JWT |
| GET | `/api/market-data/correlation` | 资产相关性矩阵 | JWT |

### Internal RPC 端点（API Gateway ↔ Decision Engine）

| 方法 | 路径 | 简述 | 认证 |
|------|------|------|------|
| POST | `/internal/strategy/parse` | 策略解析（调 LLM） | API Key |
| POST | `/internal/simulation/start` | 启动模拟 Actor | API Key |
| POST | `/internal/simulation/stop` | 停止模拟 Actor | API Key |
| GET | `/internal/panda/:id/state` | 获取 Actor 状态 | API Key |
| POST | `/internal/panda/:id/ask` | 用户提问 | API Key |

### WebSocket

| 端点 | 简述 |
|------|------|
| `wss://…`（完整基址 = `NEXT_PUBLIC_WS_URL`）`{PATH}?token=JWT` | 实时推送；**Cloudflare Workers + DO**，非 Vercel。`PATH` 以实现为准。见 `docs/websocket-hub-design.md`。 |

---

## 二、认证与授权

### 2.1 双认证方案

TradingPanda 支持两种认证方式，均最终产出统一的 JWT Token：

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────┐
│  Sui Wallet     │────▶│  POST /api/auth  │────▶│  JWT Token │
│  (签名验证)      │     │    /connect      │     │  签发       │
└─────────────────┘     └──────────────────┘     └────────────┘

┌─────────────────┐     ┌──────────────────┐     ┌────────────┐
│  zkLogin        │────▶│  POST /api/auth  │────▶│  JWT Token │
│  (Google/Apple) │     │    /connect      │     │  签发       │
└─────────────────┘     └──────────────────┘     └────────────┘
```

### 2.2 JWT Token 结构

```typescript
interface JWTPayload {
  sub: string;           // 用户 UUID
  wallet: string;        // Sui 钱包地址 (0x...)
  auth_method: 'wallet' | 'zklogin';
  iat: number;           // 签发时间 (Unix timestamp)
  exp: number;           // 过期时间 (签发后 24h)
}
```

### 2.3 Token 签发与验证流程

1. **Sui Wallet 认证流程**：
   - 前端调用 `signPersonalMessage` 签名随机 nonce
   - 后端验证签名 + nonce 有效性
   - 签发 JWT Access Token（24h）+ Refresh Token（7d）

2. **zkLogin 认证流程**：
   - 前端通过 Google/Apple OAuth 获取 `id_token`
   - 后端验证 `id_token`，提取 `sub` 作为用户标识
   - 通过 zkLogin 派生 Sui 地址
   - 签发 JWT Access Token（24h）+ Refresh Token（7d）

3. **Token 验证**：
   - 每个需认证的请求在 `Authorization: Bearer <token>` 中携带 JWT
   - 中间件验证签名、过期时间、用户存在性
   - 过期后使用 Refresh Token 刷新

### 2.4 Internal API Key

API Gateway 与 Decision Engine 之间使用共享 API Key 认证：

```
Authorization: X-Internal-Key <INTERNAL_API_KEY>
```

- 密钥通过环境变量注入，不硬编码
- 仅允许来自 Vercel → Render 的内部调用

---

## 三、REST API 详细定义

### 3.1 认证模块

---

#### `POST /api/auth/connect`

钱包/zkLogin 连接，签发 JWT Token。

**请求参数（Body）**：

```typescript
interface AuthConnectRequest {
  method: 'wallet' | 'zklogin';

  // method = 'wallet' 时必填
  wallet_address?: string;       // Sui 钱包地址 (0x...)
  signature?: string;            // 签名（base64）
  nonce?: string;                // 签名的随机 nonce
  public_key?: string;           // 公钥（base64）

  // method = 'zklogin' 时必填
  id_token?: string;             // Google/Apple OAuth id_token
  provider?: 'google' | 'apple'; // OAuth 提供商
  salt?: string;                 // zkLogin salt
}
```

**成功响应**：

```typescript
interface AuthConnectResponse {
  success: true;
  data: {
    access_token: string;        // JWT Access Token (24h)
    refresh_token: string;       // Refresh Token (7d)
    expires_in: number;          // Access Token 剩余秒数
    user: {
      id: string;               // UUID
      wallet_address: string;    // Sui 钱包地址
      display_name: string | null;
      avatar_url: string | null;
      created_at: string;        // ISO 8601
    };
  };
}
```

**错误响应**：

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

**请求示例**：

```json
{
  "method": "wallet",
  "wallet_address": "0x1a2b3c4d5e6f...",
  "signature": "AGFiY2RlZmdo...",
  "nonce": "rnd_abc123def456",
  "public_key": "AHVzZXIgcHVibGlj..."
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "dG9rZW4gcmVmcmVzaA...",
    "expires_in": 86400,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "wallet_address": "0x1a2b3c4d5e6f...",
      "display_name": null,
      "avatar_url": null,
      "created_at": "2026-05-08T12:00:00Z"
    }
  }
}
```

**错误码**：

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `AUTH_INVALID_SIGNATURE` | 401 | 钱包签名验证失败 |
| `AUTH_INVALID_NONCE` | 401 | Nonce 无效或已过期 |
| `AUTH_INVALID_ID_TOKEN` | 401 | zkLogin id_token 验证失败 |
| `AUTH_PROVIDER_NOT_SUPPORTED` | 400 | 不支持的 OAuth 提供商 |
| `AUTH_MISSING_PARAMS` | 400 | 缺少必要参数 |

**业务逻辑**：
- 首次连接时自动创建用户记录
- 同一钱包地址重复连接时更新 Token
- zkLogin 用户首次连接时派生 Sui 地址并绑定
- 首次连接成功后，前端应检查用户是否已完成 onboarding 问卷（`GET /api/auth/me` 中 `onboarding_survey` 字段），未完成则跳转问卷页

---

#### `POST /api/auth/onboarding-survey`

新用户初次登录问卷提交。问卷结果影响 UI 推荐与引导深度，**不影响决策引擎公式**。

**请求参数（Body）**：

```typescript
{
  trading_exp: 'none' | 'beginner' | 'intermediate' | 'advanced';  // 交易经验
  style: ('trend' | 'swing' | 'scalp' | 'value' | 'grid')[];       // 偏好风格（多选）
  max_loss: 5 | 10 | 20 | 30;                                      // 单笔最大亏损容忍度 %
  indicators: ('ma' | 'rsi' | 'macd' | 'bollinger' | 'volume' | 'none')[];  // 熟悉指标
  panda_autonomy: 1 | 2 | 3 | 4 | 5;                               // 希望熊猫自主程度 1-5
}
```

**成功响应 200**：

```typescript
{
  success: true;
  data: {
    experience_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';  // 推导等级
    recommended_strategy_tags: string[];   // 推荐策略标签
    ui_complexity: 'simple' | 'standard' | 'advanced';  // UI 深度
  }
}
```

**推导规则**：

| trading_exp | indicators 数量 | → experience_level |
|-------------|-----------------|-------------------|
| none | 任意 | beginner |
| beginner | ≤2 | beginner |
| beginner | >2 | intermediate |
| intermediate | 任意 | intermediate |
| advanced | ≤3 | advanced |
| advanced | >3 | expert |

**UI 深度映射**：

| experience_level | ui_complexity | 差异 |
|-----------------|---------------|------|
| beginner | simple | 隐藏高级指标、简化 K 线、更多引导提示 |
| intermediate | standard | 标准界面 |
| advanced/expert | advanced | 显示全部指标、完整订单簿、深度图 |

**错误码**：

| 错误码 | HTTP | 说明 |
|--------|------|------|
| `SURVEY_ALREADY_SUBMITTED` | 409 | 问卷已提交过（不可重复） |
| `SURVEY_INVALID_FIELD` | 400 | 字段值不合法 |

**业务逻辑**：
- 问卷仅提交一次，已提交则返回 409
- 结果存储到 `users.onboarding_survey` (JSONB) 和 `users.experience_level`
- 问卷结果影响：铸造页推荐策略、Dashboard UI 深度、引导提示密度
- 问卷结果 **不** 影响：决策引擎 8 步管线公式、性格生成、经验计算

---

#### `POST /api/auth/refresh`

刷新 Access Token。

**请求参数（Body）**：

```typescript
interface AuthRefreshRequest {
  refresh_token: string;
}
```

**成功响应**：

```typescript
interface AuthRefreshResponse {
  success: true;
  data: {
    access_token: string;
    refresh_token: string;       // 新的 Refresh Token（轮转）
    expires_in: number;
  };
}
```

**请求示例**：

```json
{
  "refresh_token": "dG9rZW4gcmVmcmVzaA..."
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "bmV3IHJlZnJlc2ggdG9r...",
    "expires_in": 86400
  }
}
```

**错误码**：

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `AUTH_REFRESH_EXPIRED` | 401 | Refresh Token 已过期 |
| `AUTH_REFRESH_INVALID` | 401 | Refresh Token 无效 |
| `AUTH_REFRESH_REVOKED` | 401 | Refresh Token 已被撤销 |

---

#### `GET /api/auth/me`

获取当前登录用户信息。

**请求参数**：无

**成功响应**：

```typescript
interface AuthMeResponse {
  success: true;
  data: {
    id: string;
    wallet_address: string;
    zk_login_subject: string | null;
    display_name: string | null;
    avatar_url: string | null;
    auth_method: 'wallet' | 'zklogin';
    panda_count: number;            // 拥有的熊猫数量
    created_at: string;
    updated_at: string;
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "wallet_address": "0x1a2b3c4d5e6f...",
    "zk_login_subject": null,
    "display_name": "PandaMaster",
    "avatar_url": null,
    "auth_method": "wallet",
    "panda_count": 2,
    "created_at": "2026-05-08T12:00:00Z",
    "updated_at": "2026-05-08T12:00:00Z"
  }
}
```

**错误码**：

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `AUTH_UNAUTHORIZED` | 401 | 未提供或无效的 Token |
| `AUTH_USER_NOT_FOUND` | 404 | 用户不存在 |

---

### 3.2 熊猫模块

---

#### `POST /api/panda/mint`

铸造熊猫 NFT。调用链上合约 `mint::mint`（含铸造时 dynamic_field 初始化），由 `sui::random` 生成性格五轴和天赋。

**请求参数（Body）**：

```typescript
interface PandaMintRequest {
  name?: string;                 // 可选，初始名称（1-20 字符）
}
```

**成功响应**：

```typescript
interface PandaMintResponse {
  success: true;
  data: {
    id: string;                  // 熊猫 UUID（链下）
    sui_object_id: string;       // 链上 NFT 对象 ID
    sui_tx_digest: string;       // 铸造交易哈希
    name: string | null;
    personality: {
      boldness: number;          // 胆识 0-100
      patience: number;          // 耐性 0-100
      intuition: number;         // 直觉 0-100
      focus: number;             // 专注 0-100
      contrarian: number;        // 逆向性 0-100
    };
    talent: {
      id: number;                // 0=无, 1-6 对应六种天赋
      name: string;              // 天赋名称
      description: string;       // 天赋描述
    };
    generation: number;          // 全局铸造序号
    created_at: string;
  };
}
```

**请求示例**：

```json
{
  "name": "小竹"
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "sui_object_id": "0xabc123...",
    "sui_tx_digest": "7Jf8kL2m...",
    "name": "小竹",
    "personality": {
      "boldness": 72,
      "patience": 45,
      "intuition": 88,
      "focus": 61,
      "contrarian": 33
    },
    "talent": {
      "id": 5,
      "name": "镜像思维",
      "description": "反向信号额外加权，逆向交易更有优势"
    },
    "generation": 42,
    "created_at": "2026-05-08T12:30:00Z"
  }
}
```

**错误码**：

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `PANDA_MINT_DISABLED` | 403 | 铸造功能已关闭 |
| `PANDA_MAX_SUPPLY` | 403 | 已达最大铸造上限 |
| `PANDA_MINT_RATE_LIMIT` | 429 | 铸造频率超限（3次/分钟） |
| `PANDA_TX_FAILED` | 500 | 链上交易执行失败 |
| `PANDA_NAME_INVALID` | 400 | 名称格式不合法 |

**业务逻辑**：
- 调用 Sui Move 合约 `mint::mint(registry, r, clock, ctx)`（含铸造时 dynamic_field 初始化）
- 性格五轴和天赋由链上 `sui::random` 生成，不可预测
- 天赋概率：85% 无天赋，15% 触发（6种等概率）
- 铸造成功后在 PostgreSQL 创建镜像记录
- 触发 `generation` 全局计数器递增

---

#### `GET /api/panda/:id`

获取熊猫详情，包含性格、状态、经验等综合信息。

**请求参数（Path）**：

```typescript
interface PandaDetailParams {
  id: string;                    // 熊猫 UUID
}
```

**成功响应**：

```typescript
interface PandaDetailResponse {
  success: true;
  data: {
    id: string;
    sui_object_id: string;
    owner_id: string;
    name: string | null;
    personality: {
      boldness: number;
      patience: number;
      intuition: number;
      focus: number;
      contrarian: number;
    };
    talent: {
      id: number;
      name: string;
      description: string;
    };
    experience_level: number;      // 经验等级 0-100
    growth_stage: string;          // 成长阶段：newborn / learning / experienced / master / legend
    emotion_state: 'focused' | 'excited' | 'greedy' | 'cautious' | 'panicking' | 'numb';
    emotion_stability: number;     // 情绪稳定性 0-100
    is_trading: boolean;           // 是否正在交易
    current_strategy: {
      philosophy: string;
      proficiency: number;
    } | null;
    total_trades: number;
    win_rate: number | null;       // 胜率 0-1
    walrus_sync_status: 'pending' | 'synced' | 'failed';
    generation: number;
    created_at: string;
    updated_at: string;
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "sui_object_id": "0xabc123...",
    "owner_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "小竹",
    "personality": {
      "boldness": 72,
      "patience": 45,
      "intuition": 88,
      "focus": 61,
      "contrarian": 33
    },
    "talent": {
      "id": 5,
      "name": "镜像思维",
      "description": "反向信号额外加权，逆向交易更有优势"
    },
    "experience_level": 15,
    "growth_stage": "learning",
    "emotion_state": "focused",
    "emotion_stability": 62,
    "is_trading": false,
    "current_strategy": {
      "philosophy": "trend_following",
      "proficiency": 35
    },
    "total_trades": 128,
    "win_rate": 0.5547,
    "walrus_sync_status": "synced",
    "generation": 42,
    "created_at": "2026-05-08T12:30:00Z",
    "updated_at": "2026-05-09T08:15:00Z"
  }
}
```

**错误码**：

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `PANDA_NOT_FOUND` | 404 | 熊猫不存在 |
| `PANDA_NOT_OWNER` | 403 | 非该熊猫的主人（仅限某些敏感操作） |

---

#### `GET /api/panda/my`

获取当前用户拥有的所有熊猫列表。

**请求参数**：无

**成功响应**：

```typescript
interface PandaMyListResponse {
  success: true;
  data: Array<{
    id: string;
    sui_object_id: string;
    name: string | null;
    personality: {
      boldness: number;
      patience: number;
      intuition: number;
      focus: number;
      contrarian: number;
    };
    talent: {
      id: number;
      name: string;
    };
    experience_level: number;
    growth_stage: string;
    emotion_state: string;
    is_trading: boolean;
    total_trades: number;
    win_rate: number | null;
    created_at: string;
  }>;
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "sui_object_id": "0xabc123...",
      "name": "小竹",
      "personality": { "boldness": 72, "patience": 45, "intuition": 88, "focus": 61, "contrarian": 33 },
      "talent": { "id": 5, "name": "镜像思维" },
      "experience_level": 15,
      "growth_stage": "learning",
      "emotion_state": "focused",
      "is_trading": false,
      "total_trades": 128,
      "win_rate": 0.5547,
      "created_at": "2026-05-08T12:30:00Z"
    }
  ]
}
```

---

#### `PUT /api/panda/:id/name`

给熊猫命名或修改名称。

**请求参数（Path + Body）**：

```typescript
interface PandaRenameParams {
  id: string;                    // 熊猫 UUID
}

interface PandaRenameRequest {
  name: string;                  // 1-20 字符，支持中英文、数字、emoji
}
```

**成功响应**：

```typescript
interface PandaRenameResponse {
  success: true;
  data: {
    id: string;
    name: string;
    updated_at: string;
  };
}
```

**请求示例**：

```json
{
  "name": "竹林大师"
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "竹林大师",
    "updated_at": "2026-05-09T10:00:00Z"
  }
}
```

**错误码**：

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `PANDA_NAME_INVALID` | 400 | 名称为空或超过 20 字符 |
| `PANDA_NAME_PROFANITY` | 400 | 名称包含违禁词 |
| `PANDA_NOT_OWNER` | 403 | 非该熊猫的主人 |

---

#### `GET /api/panda/:id/personality`

获取性格雷达图数据，包含性格五轴、天赋效果、情绪稳定性等可视化所需的完整数据。

**请求参数（Path）**：

```typescript
interface PandaPersonalityParams {
  id: string;
}
```

**成功响应**：

```typescript
interface PandaPersonalityResponse {
  success: true;
  data: {
    personality: {
      boldness: number;          // 胆识 0-100
      patience: number;          // 耐性 0-100
      intuition: number;         // 直觉 0-100
      focus: number;             // 专注 0-100
      contrarian: number;        // 逆向性 0-100
    };
    talent: {
      id: number;
      name: string;
      description: string;
      effect: string;            // 天赋机制描述
    };
    derived_traits: {
      emotion_stability: number;  // 情绪稳定性 = f(patience, focus, experience)
      risk_tolerance: number;     // 风险承受力 = f(boldness, contrarian)
      decision_speed: number;     // 决策速度 = f(boldness, intuition)
      max_positions: number;      // 最大持仓数 = f(focus)
    };
    rarity_score: number;         // 性格稀缺度评分 0-100
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "personality": {
      "boldness": 72,
      "patience": 45,
      "intuition": 88,
      "focus": 61,
      "contrarian": 33
    },
    "talent": {
      "id": 5,
      "name": "镜像思维",
      "description": "反向信号额外加权，逆向交易更有优势",
      "effect": "contrarian 信号权重 +0.15，逆向交易胜率额外 +5%"
    },
    "derived_traits": {
      "emotion_stability": 62,
      "risk_tolerance": 55,
      "decision_speed": 80,
      "max_positions": 2
    },
    "rarity_score": 78
  }
}
```

---

### 3.3 策略模块

---

#### `POST /api/panda/:id/strategy`

喂策略（猎手）：支持 **结构化 JSON 直传**（积木编辑器，默认）或 **自然语言 + LLM 解析**（进阶）。  
`parsed` 与 `raw_text` 至少提供其一；**同时提供时以 `parsed` 为准**，跳过 LLM。

**请求参数（Path + Body）**：

```typescript
interface StrategyFeedParams {
  id: string;                    // 熊猫 UUID
}

interface SignalRule {
  indicator: 'RSI' | 'MA20' | 'MACD' | 'PRICE';
  condition: string;             // 如 "< 30", "cross_above", "death_cross"
  threshold?: number;            // RSI/PRICE 等数值条件
  action: 'BUY' | 'SELL';
  weight?: number;               // 预留；MVP RuleEngine 不参与计分
}

interface ParsedStrategyLayers {
  philosophy: 'trend_following' | 'contrarian' | 'intuition_driven' | 'grid' | 'custom';
  position_sizing: {
    type?: 'fixed' | 'kelly' | 'grid';
    value?: number;              // 单笔仓位占比 0.01–0.25
    max_position_pct?: number;
    scale_in?: boolean;
  };
  signal_rules: SignalRule[];    // 1–8 条，至少 1 条须被 RuleEngine 编译成功
  risk_management: {
    stop_loss_pct: number;
    take_profit_pct?: number;
    max_drawdown_pct: number;
  };
}

interface StrategyFeedRequest {
  /** 自然语言（10-2000 字符）；仅文本且 parse_with_llm=true 时调 LLM */
  raw_text?: string;
  /** 积木 / 高级用户直传；有则优先，不调 LLM */
  parsed?: ParsedStrategyLayers;
  /** 默认：仅有 raw_text 时为 true；有 parsed 时为 false */
  parse_with_llm?: boolean;
}
```

**成功响应**：

```typescript
interface StrategyFeedResponse {
  success: true;
  data: {
    strategy_id: string;         // 策略 UUID
    raw_text: string;            // 原始输入
    parsed: {
      philosophy: 'trend_following' | 'contrarian' | 'intuition_driven' | 'grid' | 'custom';
      position_sizing: {
        max_position_pct: number;  // 最大单笔仓位占比
        scale_in: boolean;         // 是否分批建仓
      };
      signal_rules: Array<SignalRule>;
      risk_management: {
        stop_loss_pct: number;     // 止损百分比
        take_profit_pct: number;   // 止盈百分比
        max_drawdown_pct: number;  // 最大回撤阈值
      };
    };
    strategy_hash: string;       // SHA256 哈希
    proficiency: number;         // 初始熟练度（0，除非与前策略相近）
    personality_match: number;   // 策略-性格匹配度 0-100
    previous_strategy_shadow: {
      ghost_weight: number;      // 前策略残影权重
      expected_decay_trades: number; // 预计衰减所需交易笔数
    } | null;
    panda_reaction: string;      // 熊猫对新策略的反应语（模板或 LLM 生成）
  };
}
```

**请求示例（路径 A · 积木直传，推荐）**：

```json
{
  "parsed": {
    "philosophy": "trend_following",
    "position_sizing": { "type": "fixed", "value": 0.1, "scale_in": false },
    "signal_rules": [
      { "indicator": "RSI", "condition": "< 30", "threshold": 30, "action": "BUY" },
      { "indicator": "RSI", "condition": "> 70", "threshold": 70, "action": "SELL" }
    ],
    "risk_management": {
      "stop_loss_pct": 0.05,
      "take_profit_pct": 0.15,
      "max_drawdown_pct": 0.20
    }
  }
}
```

**请求示例（路径 B · 自然语言）**：

```json
{
  "raw_text": "当RSI低于30时买入，高于70时卖出。仓位不超过总资金的20%。止损5%，止盈15%。趋势跟踪为主。",
  "parse_with_llm": true
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "strategy_id": "770e8400-e29b-41d4-a716-446655440002",
    "raw_text": "当RSI低于30时买入，高于70时卖出。仓位不超过总资金的20%。止损5%，止盈15%。趋势跟踪为主。",
    "parsed": {
      "philosophy": "trend_following",
      "position_sizing": {
        "max_position_pct": 0.20,
        "scale_in": false
      },
      "signal_rules": [
        { "indicator": "RSI", "condition": "< 30", "threshold": 30, "action": "BUY" },
        { "indicator": "RSI", "condition": "> 70", "threshold": 70, "action": "SELL" }
      ],
      "risk_management": {
        "stop_loss_pct": 0.05,
        "take_profit_pct": 0.15,
        "max_drawdown_pct": 0.20
      }
    },
    "strategy_hash": "a1b2c3d4e5f6...",
    "proficiency": 0,
    "personality_match": 72,
    "previous_strategy_shadow": {
      "ghost_weight": 0.40,
      "expected_decay_trades": 50
    },
    "panda_reaction": "嗯...趋势跟踪？虽然我的直觉想法更多，但试试看吧！RSI 我之前见过，给我时间练练。"
  }
}
```

**错误码**：

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `STRATEGY_TEXT_TOO_SHORT` | 400 | 策略文本过短（< 10 字符） |
| `STRATEGY_TEXT_TOO_LONG` | 400 | 策略文本过长（> 2000 字符） |
| `STRATEGY_BODY_EMPTY` | 400 | `raw_text` 与 `parsed` 均未提供 |
| `STRATEGY_NO_VALID_RULES` | 422 | `signal_rules` 为空或无一可编译 |
| `STRATEGY_RULE_INVALID` | 422 | 部分规则无法编译（见 `invalid_rules[]`） |
| `STRATEGY_PARSE_FAILED` | 422 | LLM 无法解析为有效策略 |
| `STRATEGY_RATE_LIMIT` | 429 | **LLM 解析**频率超限（5次/分钟）；纯 `parsed` 提交不计 |
| `PANDA_IS_TRADING` | 409 | 熊猫正在训练中，无法更换策略 |
| `PANDA_NOT_OWNER` | 403 | 非该熊猫的主人 |

**`STRATEGY_RULE_INVALID` 响应示例**：

```json
{
  "success": false,
  "error": {
    "code": "STRATEGY_RULE_INVALID",
    "message": "部分规则无法被规则引擎编译",
    "invalid_rules": [
      { "index": 2, "reason": "unsupported_indicator", "indicator": "VOLUME" }
    ]
  }
}
```

**业务逻辑**：
- **`parsed` 存在**：Pydantic 校验 → `RuleEngine` 试编译每条规则 → 至少 1 条有效 → 存库；**不调用** DeepSeek
- **仅 `raw_text`**：调用 Internal RPC `/internal/strategy/parse`（DeepSeek V3）→ 再校验编译
- 若无用户 `raw_text`，服务端生成摘要写入 `strategies.raw_text`（如 `RSI<30→BUY; RSI>70→SELL; 仓位10%`）
- 解析/校验结果存入 `strategies` 表，旧策略 `is_active = false`
- 创建策略残影（`strategy_history`），新策略激活时前策略 `ghost_weight = 0.40`
- 计算策略-性格匹配度（哲学 + 规则风格；积木路径可用规则表，不必 LLM）
- `strategy_hash = SHA256(parsed_json)`；更新链上 dynamic_field
- 新策略熟练度重置为 0（除非新旧哈希相近保留部分熟练度）

---

#### `POST /api/panda/:id/strategy/validate`

校验策略 **不存库**（积木实时预览、提交前干跑）。

**请求 Body**：与 `StrategyFeedRequest` 相同（通常只传 `parsed`）。

**成功响应**：

```typescript
interface StrategyValidateResponse {
  success: true;
  data: {
    valid: boolean;
    compiled_count: number;
    invalid_rules: Array<{ index: number; reason: string; indicator?: string }>;
    preview_signal?: {
      /** 使用最新 market tick 或请求体 optional market_snapshot 干跑 Step 1 */
      signed_score: number;
      buy_hits: number;
      sell_hits: number;
      total_rules: number;
      matched_rule_indexes: number[];
    };
    warnings: string[];   // 如「仅有 BUY 无 SELL」「哲学与规则风格不一致」
  };
}
```

**错误码**：与 feed 相同的 `STRATEGY_*` 校验错误（422）。

---

#### `GET /api/panda/:id/strategy`

获取当前激活策略。

**请求参数（Path）**：

```typescript
interface StrategyGetParams {
  id: string;
}
```

**成功响应**：

```typescript
interface StrategyGetResponse {
  success: true;
  data: {
    strategy_id: string;
    raw_text: string;
    parsed: {
      philosophy: string;
      position_sizing: {
        max_position_pct: number;
        scale_in: boolean;
      };
      signal_rules: Array<SignalRule>;
      risk_management: {
        stop_loss_pct: number;
        take_profit_pct: number;
        max_drawdown_pct: number;
      };
    };
    strategy_hash: string;
    proficiency: number;
    is_active: boolean;
    personality_match: number;
    created_at: string;
  } | null;                      // 未设置策略时为 null
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "strategy_id": "770e8400-e29b-41d4-a716-446655440002",
    "raw_text": "当RSI低于30时买入，高于70时卖出...",
    "parsed": {
      "philosophy": "trend_following",
      "position_sizing": { "max_position_pct": 0.20, "scale_in": false },
      "signal_rules": [
        { "indicator": "RSI", "condition": "< 30", "threshold": 30, "action": "BUY" },
        { "indicator": "RSI", "condition": "> 70", "threshold": 70, "action": "SELL" }
      ],
      "risk_management": { "stop_loss_pct": 0.05, "take_profit_pct": 0.15, "max_drawdown_pct": 0.20 }
    },
    "strategy_hash": "a1b2c3d4e5f6...",
    "proficiency": 35,
    "is_active": true,
    "personality_match": 72,
    "created_at": "2026-05-08T13:00:00Z"
  }
}
```

---

#### `GET /api/panda/:id/strategy/history`

获取策略变更历史，包含残影状态。

**请求参数（Path + Query）**：

```typescript
interface StrategyHistoryParams {
  id: string;
}

interface StrategyHistoryQuery {
  page?: number;                 // 默认 1
  limit?: number;                // 默认 20，最大 50
}
```

**成功响应**：

```typescript
interface StrategyHistoryResponse {
  success: true;
  data: Array<{
    strategy_hash: string;
    philosophy: string;
    proficiency_at_switch: number;   // 切换时的熟练度
    ghost_weight: number;            // 当前残影权重（实时计算）
    trades_since_switch: number;     // 换策后已执行交易笔数
    switched_at: string;             // 切换时间
    is_active_shadow: boolean;       // 残影是否仍在影响决策（ghost_weight > 0.01）
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    total_switches: number;          // 累计策略切换次数
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "strategy_hash": "old_hash_1...",
      "philosophy": "contrarian",
      "proficiency_at_switch": 65,
      "ghost_weight": 0.12,
      "trades_since_switch": 38,
      "switched_at": "2026-05-07T10:00:00Z",
      "is_active_shadow": true
    },
    {
      "strategy_hash": "old_hash_2...",
      "philosophy": "grid",
      "proficiency_at_switch": 20,
      "ghost_weight": 0.0,
      "trades_since_switch": 120,
      "switched_at": "2026-05-01T08:00:00Z",
      "is_active_shadow": false
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 2, "total_switches": 3 }
}
```

---

#### `GET /api/panda/:id/strategy/match`

获取当前策略与熊猫性格的匹配度评分。

**请求参数（Path）**：

```typescript
interface StrategyMatchParams {
  id: string;
}
```

**成功响应**：

```typescript
interface StrategyMatchResponse {
  success: true;
  data: {
    overall_match: number;           // 总体匹配度 0-100
    breakdown: {
      philosophy_fit: number;        // 哲学适配度 0-100
      risk_tolerance_fit: number;    // 风险承受匹配 0-100
      patience_fit: number;          // 耐性匹配 0-100
      intuition_usage: number;       // 直觉利用度 0-100
      contrarian_alignment: number;  // 逆向性对齐度 0-100
    };
    recommendations: string[];       // 优化建议
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "overall_match": 72,
    "breakdown": {
      "philosophy_fit": 80,
      "risk_tolerance_fit": 65,
      "patience_fit": 55,
      "intuition_usage": 90,
      "contrarian_alignment": 70
    },
    "recommendations": [
      "你的熊猫耐性较低(45)，建议缩短持仓周期",
      "直觉值很高(88)，可以增加直觉信号的权重",
      "逆向性偏低(33)，趋势跟踪策略比逆向策略更适合"
    ]
  }
}
```

---

### 3.4 模拟交易模块

---

#### `POST /api/panda/:id/simulation/start`

开始模拟交易。

**请求参数（Path + Body）**：

```typescript
interface SimulationStartParams {
  id: string;
}

interface SimulationStartRequest {
  speed: '1x' | '10x' | '100x' | 'instant';  // 模拟速度
  asset: 'BTC' | 'ETH' | 'SUI';               // 交易资产
  initial_capital?: number;                     // 初始资金，默认 10000
  data_source?: 'csv' | 'deepbook';            // 数据源，默认 csv
  duration_hours?: number;                      // 模拟时长（小时），默认 24
}
```

**成功响应**：

```typescript
interface SimulationStartResponse {
  success: true;
  data: {
    simulation_id: string;
    panda_id: string;
    status: 'running';
    speed: string;
    asset: string;
    initial_capital: number;
    data_source: string;
    started_at: string;
    estimated_completion: string | null;  // instant 模式可预估完成时间
  };
}
```

**请求示例**：

```json
{
  "speed": "10x",
  "asset": "BTC",
  "initial_capital": 10000,
  "data_source": "csv"
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "simulation_id": "880e8400-e29b-41d4-a716-446655440003",
    "panda_id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "running",
    "speed": "10x",
    "asset": "BTC",
    "initial_capital": 10000,
    "data_source": "csv",
    "started_at": "2026-05-09T14:00:00Z",
    "estimated_completion": null
  }
}
```

**错误码**：

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `SIM_ALREADY_RUNNING` | 409 | 该熊猫已有运行中的模拟 |
| `SIM_NO_STRATEGY` | 400 | 熊猫尚未设置策略 |
| `SIM_INVALID_SPEED` | 400 | 无效的模拟速度 |
| `SIM_INVALID_ASSET` | 400 | 不支持的交易资产 |
| `PANDA_NOT_OWNER` | 403 | 非该熊猫的主人 |

**业务逻辑**：
- 调用 Internal RPC `/internal/simulation/start` 启动 Python Actor
- 设置熊猫 `is_trading = true`（链上交易锁）
- 1x 速度为实时模拟，10x/100x 为加速模拟（纯规则引擎），instant 为瞬时回测
- 快进模式（10x/100x/instant）不调用 LLM，纯规则引擎决策
- 模拟完成后生成 AI 日记总结

---

#### `POST /api/panda/:id/simulation/stop`

手动停止正在运行的模拟。

**请求参数（Path）**：

```typescript
interface SimulationStopParams {
  id: string;
}
```

**成功响应**：

```typescript
interface SimulationStopResponse {
  success: true;
  data: {
    simulation_id: string;
    status: 'stopped';
    total_trades: number;
    final_equity: number;
    win_rate: number;
    max_drawdown: number;
    pnl_pct: number;             // 总盈亏百分比
    completed_at: string;
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "simulation_id": "880e8400-e29b-41d4-a716-446655440003",
    "status": "stopped",
    "total_trades": 47,
    "final_equity": 10523.50,
    "win_rate": 0.5532,
    "max_drawdown": 0.0834,
    "pnl_pct": 0.0524,
    "completed_at": "2026-05-09T16:30:00Z"
  }
}
```

**错误码**：

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `SIM_NOT_RUNNING` | 400 | 没有正在运行的模拟 |
| `PANDA_NOT_OWNER` | 403 | 非该熊猫的主人 |

---

#### `GET /api/panda/:id/simulation/status`

获取当前模拟的实时状态。

**请求参数（Path）**：

```typescript
interface SimulationStatusParams {
  id: string;
}
```

**成功响应**：

```typescript
interface SimulationStatusResponse {
  success: true;
  data: {
    simulation_id: string | null;  // 无运行中模拟时为 null
    status: 'running' | 'completed' | 'stopped' | null;
    speed: string | null;
    asset: string | null;
    current_equity: number | null;
    initial_capital: number | null;
    pnl_pct: number | null;
    total_trades: number | null;
    win_rate: number | null;
    max_drawdown: number | null;
    current_position: {
      asset: string;
      action: 'LONG' | 'SHORT' | 'NONE';
      entry_price: number;
      quantity: number;
      unrealized_pnl_pct: number;
    } | null;
    started_at: string | null;
    elapsed_seconds: number | null;
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "simulation_id": "880e8400-e29b-41d4-a716-446655440003",
    "status": "running",
    "speed": "10x",
    "asset": "BTC",
    "current_equity": 10234.80,
    "initial_capital": 10000,
    "pnl_pct": 0.0235,
    "total_trades": 23,
    "win_rate": 0.5652,
    "max_drawdown": 0.0412,
    "current_position": {
      "asset": "BTC",
      "action": "LONG",
      "entry_price": 68542.50,
      "quantity": 0.015,
      "unrealized_pnl_pct": 0.0089
    },
    "started_at": "2026-05-09T14:00:00Z",
    "elapsed_seconds": 9000
  }
}
```

---

#### `GET /api/panda/:id/simulation/history`

获取历史模拟列表。

**请求参数（Path + Query）**：

```typescript
interface SimulationHistoryParams {
  id: string;
}

interface SimulationHistoryQuery {
  page?: number;                 // 默认 1
  limit?: number;                // 默认 20，最大 50
  status?: 'completed' | 'stopped';  // 可选筛选
}
```

**成功响应**：

```typescript
interface SimulationHistoryResponse {
  success: true;
  data: Array<{
    simulation_id: string;
    status: 'completed' | 'stopped';
    speed: string;
    asset: string;
    initial_capital: number;
    final_equity: number;
    total_trades: number;
    win_rate: number;
    max_drawdown: number;
    pnl_pct: number;
    data_source: string;
    started_at: string;
    completed_at: string;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "simulation_id": "880e8400-e29b-41d4-a716-446655440003",
      "status": "completed",
      "speed": "10x",
      "asset": "BTC",
      "initial_capital": 10000,
      "final_equity": 10523.50,
      "total_trades": 47,
      "win_rate": 0.5532,
      "max_drawdown": 0.0834,
      "pnl_pct": 0.0524,
      "data_source": "csv",
      "started_at": "2026-05-09T14:00:00Z",
      "completed_at": "2026-05-09T16:30:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5 }
}
```

---

#### `GET /api/panda/:id/trades`

获取交易历史（分页）。

**请求参数（Path + Query）**：

```typescript
interface TradesListParams {
  id: string;                    // 熊猫 UUID
}

interface TradesListQuery {
  page?: number;                 // 默认 1
  limit?: number;                // 默认 20，最大 100
  simulation_id?: string;        // 可选：按模拟会话筛选
  asset?: 'BTC' | 'ETH' | 'SUI'; // 可选：按资产筛选
  action?: 'BUY' | 'SELL' | 'HOLD'; // 可选：按动作筛选
  sort_by?: 'created_at' | 'pnl_pct'; // 排序字段，默认 created_at
  sort_order?: 'asc' | 'desc';  // 排序方向，默认 desc
}
```

**成功响应**：

```typescript
interface TradesListResponse {
  success: true;
  data: Array<{
    trade_id: string;
    simulation_id: string;
    asset: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    price: number;
    quantity: number;
    position_size_pct: number;
    final_score: number;
    emotion_at_trade: string;
    proficiency_at_trade: number;
    pnl_pct: number | null;
    created_at: string;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "trade_id": "990e8400-e29b-41d4-a716-446655440004",
      "simulation_id": "880e8400-e29b-41d4-a716-446655440003",
      "asset": "BTC",
      "action": "BUY",
      "price": 68542.50,
      "quantity": 0.015,
      "position_size_pct": 0.1028,
      "final_score": 0.7234,
      "emotion_at_trade": "focused",
      "proficiency_at_trade": 35,
      "pnl_pct": null,
      "created_at": "2026-05-09T14:15:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 47 }
}
```

---

#### `GET /api/panda/:id/trades/:tradeId/decision`

获取单笔交易的 8 步决策链完整数据，用于决策链可视化。

**请求参数（Path）**：

```typescript
interface TradeDecisionParams {
  id: string;                    // 熊猫 UUID
  tradeId: string;               // 交易 UUID
}
```

**成功响应**：

```typescript
interface TradeDecisionResponse {
  success: true;
  data: {
    trade_id: string;
    asset: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    price: number;
    decision_chain: {
      step1_raw_signal: {
        label: '策略原始信号';
        value: number;           // -1 ~ 1
        details: {
          indicators_triggered: Array<{
            indicator: string;
            value: number;
            threshold: string;
            signal: number;
          }>;
        };
      };
      step2_proficiency_noise: {
        label: '熟练度噪声';
        value: number;           // 偏差幅度
        details: {
          proficiency: number;
          noise_range: string;   // 如 "±15%"
          actual_noise: number;
        };
      };
      step3_experience: {
        label: '经验修正';
        value: number;           // 修正量
        details: {
          pattern_match: boolean;
          pattern_win_rate: number | null;
          mistake_vigilance: number;
          cycle_awareness: number;
        };
      };
      step4_fusion: {
        label: '信号融合';
        value: number;           // 融合后信号
        details: {
          raw_weight: number;
          experience_weight: number;
          fusion_method: string;
        };
      };
      step5_personality: {
        label: '性格过滤';
        value: number;           // 过滤后信号
        details: {
          boldness_effect: number;
          patience_effect: number;
          contrarian_effect: number;
          talent_effect: number | null;
        };
      };
      step6_environment: {
        label: '环境感知';
        value: number;           // 环境修正后信号
        details: {
          market_condition: 'bull' | 'bear' | 'sideways';
          volatility: number;
          correlation_signal: number | null;
        };
      };
      step7_social: {
        label: '社交信号';
        value: number;           // 社交修正后信号
        details: {
          crowd_sentiment: number;
          contrarian_adjustment: number;
        };
      };
      step8_emotion: {
        label: '情绪调制';
        value: number;           // 最终执行分
        details: {
          emotion_state: string;
          emotion_modifier: number;
          final_action: 'BUY' | 'SELL' | 'HOLD';
          confidence: number;
        };
      };
    };
    shadow_influence: {
      active_shadows: number;    // 当前活跃残影数
      total_shadow_weight: number; // 残影总权重
      deviation_applied: number;   // 残影导致的偏差
    };
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "trade_id": "990e8400-e29b-41d4-a716-446655440004",
    "asset": "BTC",
    "action": "BUY",
    "price": 68542.50,
    "decision_chain": {
      "step1_raw_signal": {
        "label": "策略原始信号",
        "value": 0.72,
        "details": {
          "indicators_triggered": [
            { "indicator": "RSI", "value": 28.5, "threshold": "< 30", "signal": 0.85 },
            { "indicator": "MA20", "value": 67800.00, "threshold": "price > MA20", "signal": 0.60 }
          ]
        }
      },
      "step2_proficiency_noise": {
        "label": "熟练度噪声",
        "value": -0.08,
        "details": { "proficiency": 35, "noise_range": "±15%", "actual_noise": -0.08 }
      },
      "step3_experience": {
        "label": "经验修正",
        "value": 0.05,
        "details": { "pattern_match": true, "pattern_win_rate": 0.62, "mistake_vigilance": 0.0, "cycle_awareness": 0.0 }
      },
      "step4_fusion": {
        "label": "信号融合",
        "value": 0.69,
        "details": { "raw_weight": 0.7, "experience_weight": 0.3, "fusion_method": "weighted_average" }
      },
      "step5_personality": {
        "label": "性格过滤",
        "value": 0.74,
        "details": { "boldness_effect": 0.05, "patience_effect": -0.02, "contrarian_effect": 0.0, "talent_effect": 0.02 }
      },
      "step6_environment": {
        "label": "环境感知",
        "value": 0.72,
        "details": { "market_condition": "sideways", "volatility": 0.035, "correlation_signal": null }
      },
      "step7_social": {
        "label": "社交信号",
        "value": 0.72,
        "details": { "crowd_sentiment": 0.55, "contrarian_adjustment": 0.0 }
      },
      "step8_emotion": {
        "label": "情绪调制",
        "value": 0.7234,
        "details": { "emotion_state": "focused", "emotion_modifier": 1.0, "final_action": "BUY", "confidence": 0.72 }
      }
    },
    "shadow_influence": {
      "active_shadows": 1,
      "total_shadow_weight": 0.12,
      "deviation_applied": -0.03
    }
  }
}
```

---

### 3.5 经验与成长模块

---

#### `GET /api/panda/:id/experience`

获取经验总览，包含等级、成长阶段、总交易统计。

**请求参数（Path）**：

```typescript
interface ExperienceParams {
  id: string;
}
```

**成功响应**：

```typescript
interface ExperienceResponse {
  success: true;
  data: {
    level: number;                   // 经验等级 0-100
    growth_stage: 'newborn' | 'learning' | 'experienced' | 'master' | 'legend';
    stage_thresholds: {
      newborn: string;               // "Lv.0-4"
      learning: string;             // "Lv.5-19"
      experienced: string;          // "Lv.20-49"
      master: string;               // "Lv.50-79"
      legend: string;               // "Lv.80-100"
    };
    total_trades: number;
    win_rate: number;
    total_pnl_pct: number;          // 累计盈亏百分比
    best_trade_pnl_pct: number;     // 最佳单笔盈亏
    worst_trade_pnl_pct: number;    // 最差单笔盈亏
    walrus_blob_id: string | null;  // Walrus 经验数据备份 ID
    walrus_last_synced_at: string | null;
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "level": 15,
    "growth_stage": "learning",
    "stage_thresholds": {
      "newborn": "Lv.0-4",
      "learning": "Lv.5-19",
      "experienced": "Lv.20-49",
      "master": "Lv.50-79",
      "legend": "Lv.80-100"
    },
    "total_trades": 128,
    "win_rate": 0.5547,
    "total_pnl_pct": 0.0823,
    "best_trade_pnl_pct": 0.1245,
    "worst_trade_pnl_pct": -0.0678,
    "walrus_blob_id": "blob_abc123...",
    "walrus_last_synced_at": "2026-05-09T08:00:00Z"
  }
}
```

---

#### `GET /api/panda/:id/experience/patterns`

获取熊猫的模式记忆列表。

**请求参数（Path + Query）**：

```typescript
interface PatternsParams {
  id: string;
}

interface PatternsQuery {
  asset?: 'BTC' | 'ETH' | 'SUI';
  market_condition?: 'bull' | 'bear' | 'sideways';
  sort_by?: 'win_rate' | 'occurrences' | 'last_seen_at';
  limit?: number;                // 默认 20，最大 50
}
```

**成功响应**：

```typescript
interface PatternsResponse {
  success: true;
  data: Array<{
    pattern_hash: string;
    asset: string;
    market_condition: 'bull' | 'bear' | 'sideways';
    occurrences: number;
    win_rate: number;
    last_seen_at: string;
    description: string;         // 模式的人可读描述
  }>;
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "pattern_hash": "pat_doji_reversal_001",
      "asset": "BTC",
      "market_condition": "bear",
      "occurrences": 8,
      "win_rate": 0.7500,
      "last_seen_at": "2026-05-09T12:00:00Z",
      "description": "下跌趋势中的十字星反转，RSI 超卖区域"
    }
  ]
}
```

---

#### `GET /api/panda/:id/experience/mastery`

获取各资产的专精度。

**请求参数（Path）**：

```typescript
interface MasteryParams {
  id: string;
}
```

**成功响应**：

```typescript
interface MasteryResponse {
  success: true;
  data: Array<{
    asset: 'BTC' | 'ETH' | 'SUI';
    mastery_score: number;       // 0-100
    total_trades: number;
    signal_modifier: number;     // (mastery-50)/200 作为信号修正系数
    updated_at: string;
  }>;
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": [
    { "asset": "BTC", "mastery_score": 62, "total_trades": 85, "signal_modifier": 0.06, "updated_at": "2026-05-09T12:00:00Z" },
    { "asset": "ETH", "mastery_score": 35, "total_trades": 30, "signal_modifier": -0.075, "updated_at": "2026-05-09T10:00:00Z" },
    { "asset": "SUI", "mastery_score": 20, "total_trades": 13, "signal_modifier": -0.15, "updated_at": "2026-05-08T18:00:00Z" }
  ]
}
```

---

#### `GET /api/panda/:id/experience/mistakes`

获取错误反省日志。

**请求参数（Path）**：

```typescript
interface MistakesParams {
  id: string;
}
```

**成功响应**：

```typescript
interface MistakesResponse {
  success: true;
  data: Array<{
    mistake_type: string;            // 如 chase_high, panic_sell, fomo_entry
    display_name: string;            // 人可读名称
    occurrences: number;
    vigilance_coefficient: number;   // 警惕系数 0-1
    last_occurred_at: string;
    decay_status: string;            // 衰减状态描述
    signal_effect: string;           // 对信号的影响描述
  }>;
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "mistake_type": "chase_high",
      "display_name": "追高入场",
      "occurrences": 3,
      "vigilance_coefficient": 0.66,
      "last_occurred_at": "2026-05-09T10:30:00Z",
      "decay_status": "活跃警惕中",
      "signal_effect": "同类信号 × (-0.066) 修正"
    },
    {
      "mistake_type": "panic_sell",
      "display_name": "恐慌抛售",
      "occurrences": 1,
      "vigilance_coefficient": 0.33,
      "last_occurred_at": "2026-05-07T15:00:00Z",
      "decay_status": "2天未犯，衰减中",
      "signal_effect": "同类信号 × (-0.033) 修正"
    }
  ]
}
```

---

#### `GET /api/panda/:id/emotion`

获取当前情绪状态及情绪变更历史。

**请求参数（Path + Query）**：

```typescript
interface EmotionParams {
  id: string;
}

interface EmotionQuery {
  history_limit?: number;        // 历史记录条数，默认 10
}
```

**成功响应**：

```typescript
interface EmotionResponse {
  success: true;
  data: {
    current: {
      state: 'focused' | 'excited' | 'greedy' | 'cautious' | 'panicking' | 'numb';
      stability: number;         // 情绪稳定性 0-100
      since: string;             // 进入当前情绪的时间
      description: string;       // 情绪状态描述
      trading_effect: string;    // 对交易的影响描述
    };
    history: Array<{
      from_state: string;
      to_state: string;
      trigger: string;           // 触发原因
      trigger_display: string;   // 人可读触发原因
      created_at: string;
    }>;
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "current": {
      "state": "focused",
      "stability": 62,
      "since": "2026-05-09T08:00:00Z",
      "description": "专注冷静，决策清晰",
      "trading_effect": "情绪调制系数 ×1.0，无偏差"
    },
    "history": [
      {
        "from_state": "excited",
        "to_state": "focused",
        "trigger": "idle_30",
        "trigger_display": "30 分钟无交易，情绪回归平静",
        "created_at": "2026-05-09T08:00:00Z"
      },
      {
        "from_state": "focused",
        "to_state": "excited",
        "trigger": "win_streak_3",
        "trigger_display": "连续盈利 3 笔",
        "created_at": "2026-05-09T07:30:00Z"
      }
    ]
  }
}
```

---

#### `GET /api/panda/:id/diary`

获取熊猫日记（分页），由 LLM 或模板生成的自语记录。

**请求参数（Path + Query）**：

```typescript
interface DiaryParams {
  id: string;
}

interface DiaryQuery {
  page?: number;                 // 默认 1
  limit?: number;                // 默认 10，最大 30
  type?: 'trade' | 'emotion' | 'milestone' | 'daily_summary'; // 日记类型筛选
}
```

**成功响应**：

```typescript
interface DiaryResponse {
  success: true;
  data: Array<{
    diary_id: string;
    type: 'trade' | 'emotion' | 'milestone' | 'daily_summary';
    content: string;             // 日记正文（熊猫视角）
    context: {
      simulation_id?: string;
      trade_id?: string;
      emotion_state?: string;
      pnl_pct?: number;
    };
    generated_by: 'template' | 'llm';  // 生成方式
    created_at: string;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "diary_id": "diary_001",
      "type": "trade",
      "content": "今天在BTC上看到了一个熟悉的十字星反转形态！上次见到它是在三天前的熊市里，那次赚了 +6.2%。这次我毫不犹豫地买入了。虽然熟练度还不够高，手有点抖，但我相信自己的经验！",
      "context": {
        "simulation_id": "880e8400-e29b-41d4-a716-446655440003",
        "trade_id": "990e8400-e29b-41d4-a716-446655440004",
        "emotion_state": "excited",
        "pnl_pct": null
      },
      "generated_by": "llm",
      "created_at": "2026-05-09T14:15:30Z"
    },
    {
      "diary_id": "diary_002",
      "type": "daily_summary",
      "content": "今日总结：完成了 23 笔交易，胜率 56.5%。最大的收获是在 BTC 熊市反转中把握住了机会。不过追高那一笔让我吃了 -4.2% 的亏，下次要注意。明天继续加油！",
      "context": {
        "simulation_id": "880e8400-e29b-41d4-a716-446655440003"
      },
      "generated_by": "llm",
      "created_at": "2026-05-09T18:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 15 }
}
```

---

### 3.6 市场模块

---

#### `GET /api/market/listings`

获取 NFT 市场列表（分页 + 筛选 + 排序）。

**请求参数（Query）**：

```typescript
interface MarketListingsQuery {
  page?: number;                   // 默认 1
  limit?: number;                  // 默认 20，最大 50
  sort_by?: 'price' | 'level' | 'win_rate' | 'listed_at';  // 默认 listed_at
  sort_order?: 'asc' | 'desc';    // 默认 desc
  min_price?: number;              // 最低价格（SUI）
  max_price?: number;              // 最高价格（SUI）
  min_level?: number;              // 最低等级
  max_level?: number;              // 最高等级
  talent?: number;                 // 按天赋筛选（0-6）
  philosophy?: string;             // 按策略哲学筛选
}
```

**成功响应**：

```typescript
interface MarketListingsResponse {
  success: true;
  data: Array<{
    listing_id: string;
    panda: {
      id: string;
      sui_object_id: string;
      name: string | null;
      personality: {
        boldness: number;
        patience: number;
        intuition: number;
        focus: number;
        contrarian: number;
      };
      talent: {
        id: number;
        name: string;
      };
      experience_level: number;
      growth_stage: string;
      total_trades: number;
      win_rate: number | null;
    };
    price_sui: number;             // 价格（SUI）
    seller: {
      id: string;
      wallet_address: string;
      display_name: string | null;
    };
    listed_at: string;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "listing_id": "list_001",
      "panda": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "sui_object_id": "0xabc123...",
        "name": "小竹",
        "personality": { "boldness": 72, "patience": 45, "intuition": 88, "focus": 61, "contrarian": 33 },
        "talent": { "id": 5, "name": "镜像思维" },
        "experience_level": 15,
        "growth_stage": "learning",
        "total_trades": 128,
        "win_rate": 0.5547
      },
      "price_sui": 50.0,
      "seller": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "wallet_address": "0x1a2b3c...",
        "display_name": "PandaMaster"
      },
      "listed_at": "2026-05-09T12:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 3 }
}
```

---

#### `GET /api/market/listings/:id`

获取单个上架详情。

**请求参数（Path）**：

```typescript
interface MarketListingDetailParams {
  id: string;                    // listing ID
}
```

**成功响应**：

```typescript
interface MarketListingDetailResponse {
  success: true;
  data: {
    listing_id: string;
    panda: {
      id: string;
      sui_object_id: string;
      name: string | null;
      personality: {
        boldness: number;
        patience: number;
        intuition: number;
        focus: number;
        contrarian: number;
      };
      talent: {
        id: number;
        name: string;
        description: string;
      };
      experience_level: number;
      growth_stage: string;
      emotion_state: string;
      total_trades: number;
      win_rate: number | null;
      generation: number;
      rarity_score: number;
      current_strategy: {
        philosophy: string;
        proficiency: number;
      } | null;
    };
    price_sui: number;
    seller: {
      id: string;
      wallet_address: string;
      display_name: string | null;
    };
    kiosk_id: string;            // Sui Kiosk 对象 ID
    listed_at: string;
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "listing_id": "list_001",
    "panda": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "sui_object_id": "0xabc123...",
      "name": "小竹",
      "personality": { "boldness": 72, "patience": 45, "intuition": 88, "focus": 61, "contrarian": 33 },
      "talent": { "id": 5, "name": "镜像思维", "description": "反向信号额外加权" },
      "experience_level": 15,
      "growth_stage": "learning",
      "emotion_state": "focused",
      "total_trades": 128,
      "win_rate": 0.5547,
      "generation": 42,
      "rarity_score": 78,
      "current_strategy": { "philosophy": "trend_following", "proficiency": 35 }
    },
    "price_sui": 50.0,
    "seller": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "wallet_address": "0x1a2b3c...",
      "display_name": "PandaMaster"
    },
    "kiosk_id": "0xkiosk123...",
    "listed_at": "2026-05-09T12:00:00Z"
  }
}
```

**错误码**：

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `MARKET_LISTING_NOT_FOUND` | 404 | 上架记录不存在 |

---

#### `POST /api/market/list`

上架 NFT 到市场（将熊猫放入 Kiosk 并设置价格）。

**请求参数（Body）**：

```typescript
interface MarketListRequest {
  panda_id: string;              // 熊猫 UUID
  price_sui: number;             // 价格（SUI），最低 0.1
}
```

**成功响应**：

```typescript
interface MarketListResponse {
  success: true;
  data: {
    listing_id: string;
    panda_id: string;
    price_sui: number;
    kiosk_id: string;
    sui_tx_digest: string;       // 上架交易哈希
    listed_at: string;
  };
}
```

**请求示例**：

```json
{
  "panda_id": "660e8400-e29b-41d4-a716-446655440001",
  "price_sui": 50.0
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "listing_id": "list_001",
    "panda_id": "660e8400-e29b-41d4-a716-446655440001",
    "price_sui": 50.0,
    "kiosk_id": "0xkiosk123...",
    "sui_tx_digest": "8Kf9mL3n...",
    "listed_at": "2026-05-09T12:00:00Z"
  }
}
```

**错误码**：

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `MARKET_PANDA_IS_TRADING` | 409 | 熊猫正在交易中，无法上架 |
| `MARKET_PANDA_ALREADY_LISTED` | 409 | 熊猫已在市场上架 |
| `MARKET_PRICE_TOO_LOW` | 400 | 价格低于最低限额（0.1 SUI） |
| `PANDA_NOT_OWNER` | 403 | 非该熊猫的主人 |
| `MARKET_TX_FAILED` | 500 | 链上交易执行失败 |

**业务逻辑**：
- 检查熊猫 `is_trading = false`（不在模拟中）
- 调用 Sui Move 合约 `market::list_panda`，将 NFT 放入 Kiosk
- Kiosk 使用 `TransferPolicy<Panda>` 确保版税执行
- 上架前触发 Walrus 经验数据强制同步

---

#### `POST /api/market/delist`

从市场下架 NFT。

**请求参数（Body）**：

```typescript
interface MarketDelistRequest {
  listing_id: string;
}
```

**成功响应**：

```typescript
interface MarketDelistResponse {
  success: true;
  data: {
    listing_id: string;
    panda_id: string;
    sui_tx_digest: string;
    delisted_at: string;
  };
}
```

**请求示例**：

```json
{
  "listing_id": "list_001"
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "listing_id": "list_001",
    "panda_id": "660e8400-e29b-41d4-a716-446655440001",
    "sui_tx_digest": "9Lg0nM4o...",
    "delisted_at": "2026-05-09T14:00:00Z"
  }
}
```

**错误码**：

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `MARKET_LISTING_NOT_FOUND` | 404 | 上架记录不存在 |
| `MARKET_NOT_SELLER` | 403 | 非该 NFT 的上架者 |
| `MARKET_TX_FAILED` | 500 | 链上交易执行失败 |

---

#### `POST /api/market/buy`

购买 NFT（调用 Kiosk 合约完成购买）。

**请求参数（Body）**：

```typescript
interface MarketBuyRequest {
  listing_id: string;
}
```

**成功响应**：

```typescript
interface MarketBuyResponse {
  success: true;
  data: {
    listing_id: string;
    panda_id: string;
    price_sui: number;
    buyer_id: string;
    seller_id: string;
    royalty_paid: number;        // 版税金额（SUI）
    sui_tx_digest: string;
    bought_at: string;
  };
}
```

**请求示例**：

```json
{
  "listing_id": "list_001"
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "listing_id": "list_001",
    "panda_id": "660e8400-e29b-41d4-a716-446655440001",
    "price_sui": 50.0,
    "buyer_id": "550e8400-e29b-41d4-a716-446655440099",
    "seller_id": "550e8400-e29b-41d4-a716-446655440000",
    "royalty_paid": 2.5,
    "sui_tx_digest": "0Mh1oN5p...",
    "bought_at": "2026-05-09T15:00:00Z"
  }
}
```

**错误码**：

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `MARKET_LISTING_NOT_FOUND` | 404 | 上架记录不存在 |
| `MARKET_LISTING_SOLD` | 409 | 已被其他人购买 |
| `MARKET_INSUFFICIENT_BALANCE` | 400 | SUI 余额不足 |
| `MARKET_SELF_PURCHASE` | 400 | 不能购买自己的 NFT |
| `MARKET_TX_FAILED` | 500 | 链上交易执行失败 |

**业务逻辑**：
- 调用 Kiosk 合约 `market::buy_panda`，支付价格 + 版税
- 更新 PostgreSQL 中熊猫的 `owner_id`
- 买方从 Walrus 恢复经验数据到自己的数据空间
- 购买后熊猫保留全部经验和性格，但策略熟练度降低 20%（换手适应期）

---

### 3.7 排行榜模块

---

#### `GET /api/leaderboard`

获取排行榜（支持多维度排序）。

**请求参数（Query）**：

```typescript
interface LeaderboardQuery {
  type: 'win_rate' | 'pnl' | 'experience' | 'mastery';  // 排行类型
  asset?: 'BTC' | 'ETH' | 'SUI';  // mastery 类型时按资产筛选
  page?: number;                   // 默认 1
  limit?: number;                  // 默认 20，最大 50
}
```

**成功响应**：

```typescript
interface LeaderboardResponse {
  success: true;
  data: Array<{
    rank: number;
    panda: {
      id: string;
      name: string | null;
      personality: {
        boldness: number;
        patience: number;
        intuition: number;
        focus: number;
        contrarian: number;
      };
      talent: {
        id: number;
        name: string;
      };
      experience_level: number;
      growth_stage: string;
    };
    owner: {
      id: string;
      display_name: string | null;
      wallet_address: string;
    };
    score: number;                 // 排行分数（胜率/收益/经验/专精度）
    total_trades: number;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    type: string;
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "panda": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "竹林大师",
        "personality": { "boldness": 92, "patience": 78, "intuition": 65, "focus": 85, "contrarian": 40 },
        "talent": { "id": 1, "name": "竹林禅心" },
        "experience_level": 45,
        "growth_stage": "experienced"
      },
      "owner": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "display_name": "TopTrader",
        "wallet_address": "0x1a2b3c..."
      },
      "score": 0.6823,
      "total_trades": 520
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 100, "type": "win_rate" }
}
```

---

#### `GET /api/leaderboard/my-rank`

获取当前用户的排名信息。

**请求参数（Query）**：

```typescript
interface MyRankQuery {
  type: 'win_rate' | 'pnl' | 'experience' | 'mastery';
  panda_id?: string;             // 可选：指定熊猫（默认取最优）
  asset?: 'BTC' | 'ETH' | 'SUI';
}
```

**成功响应**：

```typescript
interface MyRankResponse {
  success: true;
  data: {
    rank: number;
    total_participants: number;
    percentile: number;          // 百分位 0-100（top N%）
    panda_id: string;
    score: number;
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "rank": 23,
    "total_participants": 150,
    "percentile": 84.7,
    "panda_id": "660e8400-e29b-41d4-a716-446655440001",
    "score": 0.5547
  }
}
```

---

### 3.8 成就模块

---

#### `GET /api/achievements`

获取所有成就定义。

**请求参数（Query）**：

```typescript
interface AchievementsQuery {
  category?: 'trading' | 'growth' | 'social' | 'collection';
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}
```

**成功响应**：

```typescript
interface AchievementsResponse {
  success: true;
  data: Array<{
    id: string;
    code: string;
    name: string;
    description: string;
    category: 'trading' | 'growth' | 'social' | 'collection';
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    icon_url: string | null;
    total_unlocked: number;      // 全服已解锁次数
  }>;
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "id": "ach_001",
      "code": "first_trade",
      "name": "初出茅庐",
      "description": "完成第一笔交易",
      "category": "trading",
      "rarity": "common",
      "icon_url": "https://assets.tradingpanda.io/achievements/first_trade.png",
      "total_unlocked": 342
    },
    {
      "id": "ach_002",
      "code": "win_streak_10",
      "name": "势不可挡",
      "description": "连续盈利 10 笔",
      "category": "trading",
      "rarity": "epic",
      "icon_url": "https://assets.tradingpanda.io/achievements/win_streak_10.png",
      "total_unlocked": 28
    }
  ]
}
```

---

#### `GET /api/achievements/my`

获取当前用户已解锁的成就。

**请求参数（Query）**：

```typescript
interface MyAchievementsQuery {
  panda_id?: string;             // 可选：按熊猫筛选
}
```

**成功响应**：

```typescript
interface MyAchievementsResponse {
  success: true;
  data: Array<{
    achievement: {
      id: string;
      code: string;
      name: string;
      description: string;
      category: string;
      rarity: string;
      icon_url: string | null;
    };
    panda_id: string;
    panda_name: string | null;
    unlocked_at: string;
    chain_status: 'pending' | 'confirmed';
    sui_tx_digest: string | null;
  }>;
  meta: {
    total_unlocked: number;
    total_achievements: number;
    completion_rate: number;     // 完成率 0-1
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "achievement": {
        "id": "ach_001",
        "code": "first_trade",
        "name": "初出茅庐",
        "description": "完成第一笔交易",
        "category": "trading",
        "rarity": "common",
        "icon_url": "https://assets.tradingpanda.io/achievements/first_trade.png"
      },
      "panda_id": "660e8400-e29b-41d4-a716-446655440001",
      "panda_name": "小竹",
      "unlocked_at": "2026-05-08T14:00:00Z",
      "chain_status": "confirmed",
      "sui_tx_digest": "1Ni2pO6q..."
    }
  ],
  "meta": {
    "total_unlocked": 5,
    "total_achievements": 20,
    "completion_rate": 0.25
  }
}
```

---

### 3.9 签到模块

---

#### `POST /api/checkin`

执行每日签到。

**请求参数**：无

**成功响应**：

```typescript
interface CheckinResponse {
  success: true;
  data: {
    checkin_date: string;          // 签到日期 YYYY-MM-DD
    streak_count: number;          // 连续签到天数
    reward: {
      type: 'exp_boost' | 'calm_bamboo' | 'strategy_hint';
      amount: number;
      description: string;
    };
    next_milestone: {
      streak_target: number;       // 下一个里程碑天数
      reward_preview: string;      // 预览奖励描述
    };
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "checkin_date": "2026-05-09",
    "streak_count": 7,
    "reward": {
      "type": "exp_boost",
      "amount": 1.5,
      "description": "经验获取 ×1.5 持续 24 小时"
    },
    "next_milestone": {
      "streak_target": 14,
      "reward_preview": "连续14天签到：获赠安心竹（减少情绪波动 30 分钟）"
    }
  }
}
```

**错误码**：

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `CHECKIN_ALREADY_TODAY` | 409 | 今日已签到 |

---

#### `GET /api/checkin/status`

获取签到状态。

**请求参数**：无

**成功响应**：

```typescript
interface CheckinStatusResponse {
  success: true;
  data: {
    checked_in_today: boolean;
    streak_count: number;          // 当前连续签到天数
    last_checkin_date: string | null;  // 最近签到日期
    total_checkins: number;        // 累计签到天数
    current_reward_active: {
      type: string;
      expires_at: string;
    } | null;
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "checked_in_today": true,
    "streak_count": 7,
    "last_checkin_date": "2026-05-09",
    "total_checkins": 15,
    "current_reward_active": {
      "type": "exp_boost",
      "expires_at": "2026-05-10T00:00:00Z"
    }
  }
}
```

---

### 3.10 市场数据模块

---

#### `GET /api/market-data/:asset/kline`

获取 K 线数据（来自 DeepBook 或 CSV）。

**请求参数（Path + Query）**：

```typescript
interface KlineParams {
  asset: 'BTC' | 'ETH' | 'SUI';
}

interface KlineQuery {
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';  // K 线间隔
  start_time?: string;           // ISO 8601，默认往前 100 根
  end_time?: string;             // ISO 8601，默认当前
  limit?: number;                // 返回条数，默认 100，最大 500
  source?: 'csv' | 'deepbook';   // 数据源，默认 csv
}
```

**成功响应**：

```typescript
interface KlineResponse {
  success: true;
  data: Array<{
    timestamp: string;           // ISO 8601
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    indicators: {
      rsi: number | null;        // RSI 14
      ma20: number | null;       // 20 周期均线
      volatility: number | null; // 波动率
    };
  }>;
  meta: {
    asset: string;
    interval: string;
    source: string;
    count: number;
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2026-05-09T14:00:00Z",
      "open": 68500.00,
      "high": 68750.00,
      "low": 68350.00,
      "close": 68620.00,
      "volume": 1234.56,
      "indicators": {
        "rsi": 52.34,
        "ma20": 68100.00,
        "volatility": 0.035
      }
    }
  ],
  "meta": { "asset": "BTC", "interval": "1h", "source": "csv", "count": 100 }
}
```

---

#### `GET /api/market-data/:asset/current`

获取资产当前价格。

**请求参数（Path）**：

```typescript
interface CurrentPriceParams {
  asset: 'BTC' | 'ETH' | 'SUI';
}
```

**成功响应**：

```typescript
interface CurrentPriceResponse {
  success: true;
  data: {
    asset: string;
    price: number;
    change_24h_pct: number;      // 24h 涨跌幅
    volume_24h: number;
    high_24h: number;
    low_24h: number;
    source: string;
    updated_at: string;
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "asset": "BTC",
    "price": 68620.00,
    "change_24h_pct": 0.0234,
    "volume_24h": 28456789.12,
    "high_24h": 69100.00,
    "low_24h": 67800.00,
    "source": "deepbook",
    "updated_at": "2026-05-09T14:30:00Z"
  }
}
```

---

#### `GET /api/market-data/correlation`

获取资产相关性矩阵。

**请求参数（Query）**：

```typescript
interface CorrelationQuery {
  window_days?: number;          // 滚动窗口天数，默认 30
}
```

**成功响应**：

```typescript
interface CorrelationResponse {
  success: true;
  data: {
    window_days: number;
    matrix: Array<{
      asset_a: string;
      asset_b: string;
      correlation: number;       // Pearson 相关系数 -1 ~ 1
    }>;
    calculated_at: string;
  };
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "window_days": 30,
    "matrix": [
      { "asset_a": "BTC", "asset_b": "ETH", "correlation": 0.8234 },
      { "asset_a": "BTC", "asset_b": "SUI", "correlation": 0.6512 },
      { "asset_a": "ETH", "asset_b": "SUI", "correlation": 0.7123 }
    ],
    "calculated_at": "2026-05-09T00:00:00Z"
  }
}
```

---

## 四、WebSocket Events

### 4.1 连接与认证

**连接地址**（浏览器使用 `NEXT_PUBLIC_WS_URL` 完整 `wss://...` 基址；与 Next.js 部署域名无关）：

```
{NEXT_PUBLIC_WS_URL}?token={JWT}
```

示例（占位）：`wss://trading-panda-ws.<your-subdomain>.workers.dev/ws?token={JWT}`

**连接成功**：服务端推送 `connected` 事件

```typescript
interface WSConnectedEvent {
  event: 'connected';
  payload: {
    user_id: string;
    session_id: string;
    connected_at: string;
  };
}
```

**连接失败**：关闭连接并返回错误码

| 关闭码 | 说明 |
|--------|------|
| 4001 | Token 无效 |
| 4002 | Token 已过期 |
| 4003 | 用户不存在 |

### 4.2 客户端 → 服务端（Commands）

所有客户端消息遵循统一格式：

```typescript
interface WSClientMessage {
  command: string;
  payload: Record<string, any>;
  request_id?: string;           // 可选，用于请求-响应匹配
}
```

---

#### `subscribe.simulation`

订阅模拟盘实时更新。

```typescript
interface SubscribeSimulationCommand {
  command: 'subscribe.simulation';
  payload: {
    panda_id: string;
    simulation_id: string;
  };
}
```

**示例**：

```json
{
  "command": "subscribe.simulation",
  "payload": {
    "panda_id": "660e8400-e29b-41d4-a716-446655440001",
    "simulation_id": "880e8400-e29b-41d4-a716-446655440003"
  }
}
```

---

#### `unsubscribe.simulation`

取消订阅模拟盘。

```typescript
interface UnsubscribeSimulationCommand {
  command: 'unsubscribe.simulation';
  payload: {
    panda_id: string;
  };
}
```

**示例**：

```json
{
  "command": "unsubscribe.simulation",
  "payload": {
    "panda_id": "660e8400-e29b-41d4-a716-446655440001"
  }
}
```

---

#### `subscribe.market`

订阅市场数据实时更新。

```typescript
interface SubscribeMarketCommand {
  command: 'subscribe.market';
  payload: {
    assets: Array<'BTC' | 'ETH' | 'SUI'>;
    interval: '1m' | '5m' | '15m';
  };
}
```

**示例**：

```json
{
  "command": "subscribe.market",
  "payload": {
    "assets": ["BTC", "SUI"],
    "interval": "1m"
  }
}
```

---

### 4.3 服务端 → 客户端（Events）

所有服务端事件遵循统一格式：

```typescript
interface WSServerEvent<T = any> {
  event: string;
  payload: T;
  timestamp: string;             // ISO 8601
}
```

---

#### `simulation.tick`

模拟盘每个 tick 推送（K 线更新 + 熊猫状态）。

```typescript
interface SimulationTickPayload {
  simulation_id: string;
  panda_id: string;
  tick_number: number;
  candle: {
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  };
  panda_state: {
    equity: number;
    pnl_pct: number;
    position: {
      action: 'LONG' | 'SHORT' | 'NONE';
      entry_price: number | null;
      quantity: number;
      unrealized_pnl_pct: number;
    };
    emotion_state: string;
    proficiency: number;
  };
  indicators: {
    rsi: number | null;
    ma20: number | null;
    volatility: number | null;
  };
}
```

**示例**：

```json
{
  "event": "simulation.tick",
  "payload": {
    "simulation_id": "880e8400-e29b-41d4-a716-446655440003",
    "panda_id": "660e8400-e29b-41d4-a716-446655440001",
    "tick_number": 145,
    "candle": {
      "timestamp": "2026-05-09T14:15:00Z",
      "open": 68500.00,
      "high": 68600.00,
      "low": 68450.00,
      "close": 68560.00,
      "volume": 45.23
    },
    "panda_state": {
      "equity": 10234.80,
      "pnl_pct": 0.0235,
      "position": {
        "action": "LONG",
        "entry_price": 68542.50,
        "quantity": 0.015,
        "unrealized_pnl_pct": 0.0003
      },
      "emotion_state": "focused",
      "proficiency": 35
    },
    "indicators": { "rsi": 52.34, "ma20": 68100.00, "volatility": 0.035 }
  },
  "timestamp": "2026-05-09T14:15:00Z"
}
```

---

#### `trade.executed`

交易执行事件（BUY/SELL/HOLD + 决策分数）。

```typescript
interface TradeExecutedPayload {
  simulation_id: string;
  panda_id: string;
  trade_id: string;
  asset: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  price: number;
  quantity: number;
  position_size_pct: number;
  final_score: number;
  emotion_at_trade: string;
  proficiency_at_trade: number;
  pnl_pct: number | null;       // 仅 SELL 时有值
  equity_after: number;
  panda_speak: string;           // 熊猫交易时的自语
}
```

**示例**：

```json
{
  "event": "trade.executed",
  "payload": {
    "simulation_id": "880e8400-e29b-41d4-a716-446655440003",
    "panda_id": "660e8400-e29b-41d4-a716-446655440001",
    "trade_id": "990e8400-e29b-41d4-a716-446655440004",
    "asset": "BTC",
    "action": "BUY",
    "price": 68542.50,
    "quantity": 0.015,
    "position_size_pct": 0.1028,
    "final_score": 0.7234,
    "emotion_at_trade": "focused",
    "proficiency_at_trade": 35,
    "pnl_pct": null,
    "equity_after": 10234.80,
    "panda_speak": "RSI 超卖了，这个形态我见过！买入！"
  },
  "timestamp": "2026-05-09T14:15:05Z"
}
```

---

#### `emotion.changed`

情绪状态跳转事件。

```typescript
interface EmotionChangedPayload {
  panda_id: string;
  from_state: 'focused' | 'excited' | 'greedy' | 'cautious' | 'panicking' | 'numb';
  to_state: 'focused' | 'excited' | 'greedy' | 'cautious' | 'panicking' | 'numb';
  trigger: string;               // 触发原因编码
  trigger_display: string;       // 人可读触发原因
  panda_speak: string;           // 熊猫对情绪变化的自语
}
```

**示例**：

```json
{
  "event": "emotion.changed",
  "payload": {
    "panda_id": "660e8400-e29b-41d4-a716-446655440001",
    "from_state": "focused",
    "to_state": "excited",
    "trigger": "win_streak_3",
    "trigger_display": "连续盈利 3 笔",
    "panda_speak": "连赢三把了！感觉今天运气不错！"
  },
  "timestamp": "2026-05-09T14:20:00Z"
}
```

---

#### `panda.speak`

熊猫自语事件（模板或 LLM 生成），用于非交易/非情绪变化时的随机自语。

```typescript
interface PandaSpeakPayload {
  panda_id: string;
  content: string;               // 自语内容
  trigger: 'idle' | 'market_observation' | 'strategy_thinking' | 'random';
  emotion_state: string;
  generated_by: 'template' | 'llm';
}
```

**示例**：

```json
{
  "event": "panda.speak",
  "payload": {
    "panda_id": "660e8400-e29b-41d4-a716-446655440001",
    "content": "嗯...BTC 的波动率在收窄，像是暴风雨前的宁静。我再观察一下。",
    "trigger": "market_observation",
    "emotion_state": "focused",
    "generated_by": "template"
  },
  "timestamp": "2026-05-09T14:25:00Z"
}
```

---

#### `decision.chain`

完整 8 步决策链推送（用于决策链实时可视化）。

```typescript
interface DecisionChainPayload {
  simulation_id: string;
  panda_id: string;
  trade_id: string;
  chain: Array<{
    step: number;                // 1-8
    label: string;               // 步骤名称
    input_value: number;         // 输入值
    output_value: number;        // 输出值
    delta: number;               // 变化量
    details: Record<string, any>;
  }>;
  final_action: 'BUY' | 'SELL' | 'HOLD';
  final_score: number;
  shadow_influence: {
    active_shadows: number;
    total_shadow_weight: number;
    deviation_applied: number;
  };
}
```

**示例**：

```json
{
  "event": "decision.chain",
  "payload": {
    "simulation_id": "880e8400-e29b-41d4-a716-446655440003",
    "panda_id": "660e8400-e29b-41d4-a716-446655440001",
    "trade_id": "990e8400-e29b-41d4-a716-446655440004",
    "chain": [
      { "step": 1, "label": "策略原始信号", "input_value": 0.0, "output_value": 0.72, "delta": 0.72, "details": {} },
      { "step": 2, "label": "熟练度噪声", "input_value": 0.72, "output_value": 0.64, "delta": -0.08, "details": { "proficiency": 35 } },
      { "step": 3, "label": "经验修正", "input_value": 0.64, "output_value": 0.69, "delta": 0.05, "details": {} },
      { "step": 4, "label": "信号融合", "input_value": 0.69, "output_value": 0.69, "delta": 0.0, "details": {} },
      { "step": 5, "label": "性格过滤", "input_value": 0.69, "output_value": 0.74, "delta": 0.05, "details": {} },
      { "step": 6, "label": "环境感知", "input_value": 0.74, "output_value": 0.72, "delta": -0.02, "details": {} },
      { "step": 7, "label": "社交信号", "input_value": 0.72, "output_value": 0.72, "delta": 0.0, "details": {} },
      { "step": 8, "label": "情绪调制", "input_value": 0.72, "output_value": 0.7234, "delta": 0.0034, "details": { "emotion_state": "focused" } }
    ],
    "final_action": "BUY",
    "final_score": 0.7234,
    "shadow_influence": { "active_shadows": 1, "total_shadow_weight": 0.12, "deviation_applied": -0.03 }
  },
  "timestamp": "2026-05-09T14:15:05Z"
}
```

---

#### `achievement.unlocked`

成就解锁通知。

```typescript
interface AchievementUnlockedPayload {
  panda_id: string;
  achievement: {
    id: string;
    code: string;
    name: string;
    description: string;
    category: string;
    rarity: string;
    icon_url: string | null;
  };
  unlock_context: string;        // 解锁时的上下文描述
  chain_status: 'pending' | 'confirmed';
}
```

**示例**：

```json
{
  "event": "achievement.unlocked",
  "payload": {
    "panda_id": "660e8400-e29b-41d4-a716-446655440001",
    "achievement": {
      "id": "ach_002",
      "code": "win_streak_10",
      "name": "势不可挡",
      "description": "连续盈利 10 笔",
      "category": "trading",
      "rarity": "epic",
      "icon_url": "https://assets.tradingpanda.io/achievements/win_streak_10.png"
    },
    "unlock_context": "在第 3 轮 BTC 模拟中连续盈利 10 笔",
    "chain_status": "pending"
  },
  "timestamp": "2026-05-09T15:30:00Z"
}
```

---

#### `simulation.completed`

模拟完成事件（含总结报告）。

```typescript
interface SimulationCompletedPayload {
  simulation_id: string;
  panda_id: string;
  status: 'completed' | 'stopped';
  summary: {
    total_trades: number;
    win_rate: number;
    total_pnl_pct: number;
    max_drawdown: number;
    initial_capital: number;
    final_equity: number;
    best_trade: {
      trade_id: string;
      pnl_pct: number;
      asset: string;
    };
    worst_trade: {
      trade_id: string;
      pnl_pct: number;
      asset: string;
    };
    emotion_distribution: Record<string, number>;  // 各情绪状态占比
    proficiency_change: number;   // 熟练度变化
    experience_gained: number;    // 获得的经验值
    level_before: number;
    level_after: number;
  };
  diary_entry: string;           // LLM 生成的模拟总结日记
  achievements_unlocked: string[];  // 本次模拟解锁的成就 code 列表
}
```

**示例**：

```json
{
  "event": "simulation.completed",
  "payload": {
    "simulation_id": "880e8400-e29b-41d4-a716-446655440003",
    "panda_id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "completed",
    "summary": {
      "total_trades": 47,
      "win_rate": 0.5532,
      "total_pnl_pct": 0.0524,
      "max_drawdown": 0.0834,
      "initial_capital": 10000,
      "final_equity": 10523.50,
      "best_trade": { "trade_id": "trade_best_001", "pnl_pct": 0.0845, "asset": "BTC" },
      "worst_trade": { "trade_id": "trade_worst_001", "pnl_pct": -0.0523, "asset": "BTC" },
      "emotion_distribution": { "focused": 0.65, "excited": 0.20, "cautious": 0.10, "greedy": 0.05 },
      "proficiency_change": 12,
      "experience_gained": 230,
      "level_before": 13,
      "level_after": 15
    },
    "diary_entry": "今天的模拟训练结束了！47 笔交易，总收益 +5.24%。最开心的是在那个十字星反转形态上赚到了 +8.45%，直觉告诉我那是个好机会，果然没错！不过回撤有点大，8.34% 让我一度有点紧张。下次要更注意止损位的设置。明天继续加油！",
    "achievements_unlocked": ["first_50_trades"]
  },
  "timestamp": "2026-05-09T16:30:00Z"
}
```

---

#### `experience.levelup`

经验等级提升事件。

```typescript
interface ExperienceLevelupPayload {
  panda_id: string;
  level_before: number;
  level_after: number;
  growth_stage_before: string;
  growth_stage_after: string;
  stage_changed: boolean;        // 是否跨越成长阶段
  new_abilities: string[];       // 新解锁的能力描述
  panda_speak: string;           // 升级时的自语
}
```

**示例**：

```json
{
  "event": "experience.levelup",
  "payload": {
    "panda_id": "660e8400-e29b-41d4-a716-446655440001",
    "level_before": 19,
    "level_after": 20,
    "growth_stage_before": "learning",
    "growth_stage_after": "experienced",
    "stage_changed": true,
    "new_abilities": [
      "解锁多资产相关性感知（Lv.3+）",
      "经验修正权重提升至 0.30",
      "模式记忆容量扩展"
    ],
    "panda_speak": "我感觉自己变强了！现在我能感受到不同资产之间的联动关系了...BTC 涨的时候 ETH 也会跟着涨？有意思！"
  },
  "timestamp": "2026-05-09T16:30:05Z"
}
```

---

## 五、Internal RPC（API Gateway ↔ Decision Engine）

API Gateway（Next.js / Vercel）与 Decision Engine（Python / Render）之间的内部通信接口。所有内部接口使用 `X-Internal-Key` 头认证。

**基础 URL**：`https://{decision-engine-host}`

---

#### `POST /internal/strategy/parse`

将用户自然语言策略文本送 DeepSeek V3 解析为结构化策略（**仅 Path B**；Path A 由 BFF 直接校验 `parsed`，可不调用本接口）。

**请求参数（Body）**：

```typescript
interface InternalStrategyParseRequest {
  panda_id: string;
  raw_text: string;
  personality: {
    boldness: number;
    patience: number;
    intuition: number;
    focus: number;
    contrarian: number;
  };
  talent_id: number;
}
```

**成功响应**：

```typescript
interface InternalStrategyParseResponse {
  success: true;
  data: {
    parsed_json: {
      philosophy: string;
      position_sizing: {
        max_position_pct: number;
        scale_in: boolean;
      };
      signal_rules: Array<SignalRule>;
      risk_management: {
        stop_loss_pct: number;
        take_profit_pct: number;
        max_drawdown_pct: number;
      };
    };
    strategy_hash: string;
    personality_match: number;
    llm_reasoning: string;       // LLM 解析推理过程（调试用）
  };
}
```

**请求示例**：

```json
{
  "panda_id": "660e8400-e29b-41d4-a716-446655440001",
  "raw_text": "当RSI低于30时买入，高于70时卖出...",
  "personality": { "boldness": 72, "patience": 45, "intuition": 88, "focus": 61, "contrarian": 33 },
  "talent_id": 5
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "parsed_json": {
      "philosophy": "trend_following",
      "position_sizing": { "max_position_pct": 0.20, "scale_in": false },
      "signal_rules": [
        { "indicator": "RSI", "condition": "< 30", "threshold": 30, "action": "BUY" },
        { "indicator": "RSI", "condition": "> 70", "threshold": 70, "action": "SELL" }
      ],
      "risk_management": { "stop_loss_pct": 0.05, "take_profit_pct": 0.15, "max_drawdown_pct": 0.20 }
    },
    "strategy_hash": "a1b2c3d4e5f6...",
    "personality_match": 72,
    "llm_reasoning": "用户策略以RSI为核心指标，属于趋势跟踪类。与熊猫高直觉(88)匹配良好..."
  }
}
```

---

#### `POST /internal/simulation/start`

启动模拟 Actor。

**请求参数（Body）**：

```typescript
interface InternalSimulationStartRequest {
  simulation_id: string;
  panda_id: string;
  personality: {
    boldness: number;
    patience: number;
    intuition: number;
    focus: number;
    contrarian: number;
  };
  talent_id: number;
  strategy: {
    parsed_json: Record<string, any>;
    proficiency: number;
  };
  experience: {
    level: number;
    patterns: Array<Record<string, any>>;
    mastery: Array<Record<string, any>>;
    mistakes: Array<Record<string, any>>;
    cycles: Array<Record<string, any>>;
  };
  emotion_state: string;
  emotion_stability: number;
  speed: '1x' | '10x' | '100x' | 'instant';
  asset: 'BTC' | 'ETH' | 'SUI';
  initial_capital: number;
  data_source: 'csv' | 'deepbook';
  active_shadows: Array<{
    strategy_hash: string;
    ghost_weight: number;
  }>;
  websocket_callback_url: string; // WebSocket 推送回调地址
}
```

**成功响应**：

```typescript
interface InternalSimulationStartResponse {
  success: true;
  data: {
    actor_id: string;            // Python Actor ID
    status: 'started';
  };
}
```

**请求示例**：

```json
{
  "simulation_id": "880e8400-e29b-41d4-a716-446655440003",
  "panda_id": "660e8400-e29b-41d4-a716-446655440001",
  "personality": { "boldness": 72, "patience": 45, "intuition": 88, "focus": 61, "contrarian": 33 },
  "talent_id": 5,
  "strategy": {
    "parsed_json": { "philosophy": "trend_following", "signal_rules": [] },
    "proficiency": 35
  },
  "experience": { "level": 15, "patterns": [], "mastery": [], "mistakes": [], "cycles": [] },
  "emotion_state": "focused",
  "emotion_stability": 62,
  "speed": "10x",
  "asset": "BTC",
  "initial_capital": 10000,
  "data_source": "csv",
  "active_shadows": [{ "strategy_hash": "old_hash_1", "ghost_weight": 0.12 }],
  "websocket_callback_url": "https://api.tradingpanda.io/internal/ws-callback"
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "actor_id": "actor_btc_660e8400",
    "status": "started"
  }
}
```

---

#### `POST /internal/simulation/stop`

停止模拟 Actor。

**请求参数（Body）**：

```typescript
interface InternalSimulationStopRequest {
  simulation_id: string;
  panda_id: string;
}
```

**成功响应**：

```typescript
interface InternalSimulationStopResponse {
  success: true;
  data: {
    actor_id: string;
    status: 'stopped';
    final_state: {
      total_trades: number;
      final_equity: number;
      win_rate: number;
      max_drawdown: number;
    };
  };
}
```

---

#### `GET /internal/panda/:id/state`

获取 Actor 的实时状态。

**请求参数（Path）**：

```typescript
interface InternalPandaStateParams {
  id: string;                    // 熊猫 UUID
}
```

**成功响应**：

```typescript
interface InternalPandaStateResponse {
  success: true;
  data: {
    actor_id: string;
    is_alive: boolean;
    simulation_id: string | null;
    equity: number;
    position: {
      action: 'LONG' | 'SHORT' | 'NONE';
      entry_price: number | null;
      quantity: number;
    } | null;
    emotion_state: string;
    proficiency: number;
    total_trades: number;
    pending_decisions: number;    // 待处理的决策数
    last_tick_at: string | null;
  };
}
```

---

#### `POST /internal/panda/:id/ask`

用户提问，触发 Agent Coordinator（冲突/极端/用户主动提问时介入）。

**请求参数（Path + Body）**：

```typescript
interface InternalPandaAskParams {
  id: string;
}

interface InternalPandaAskRequest {
  question: string;              // 用户的问题
  context: {
    simulation_id?: string;
    current_state: Record<string, any>;
  };
}
```

**成功响应**：

```typescript
interface InternalPandaAskResponse {
  success: true;
  data: {
    answer: string;              // LLM 生成的回答（熊猫视角）
    reasoning: string;           // 推理过程
    suggested_action: 'BUY' | 'SELL' | 'HOLD' | null;
    confidence: number;          // 回答置信度 0-1
  };
}
```

**请求示例**：

```json
{
  "question": "你觉得现在应该卖出吗？",
  "context": {
    "simulation_id": "880e8400-e29b-41d4-a716-446655440003",
    "current_state": {
      "position": "LONG",
      "unrealized_pnl_pct": 0.03,
      "emotion_state": "excited"
    }
  }
}
```

**成功响应示例**：

```json
{
  "success": true,
  "data": {
    "answer": "现在涨了3%，我有点兴奋但还没到止盈线(15%)。RSI 还在 55，不算超买。我觉得可以再等等。不过你是主人，你说了算！",
    "reasoning": "未达止盈阈值，RSI中性，趋势未反转，建议持有",
    "suggested_action": "HOLD",
    "confidence": 0.72
  }
}
```

---

## 六、统一响应格式

### 6.1 成功响应

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}
```

### 6.2 错误响应

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;                // 业务错误码（如 PANDA_NOT_FOUND）
    message: string;             // 人可读错误信息（中文）
    details?: any;               // 可选：额外调试信息（仅开发环境）
  };
}
```

### 6.3 分页元数据

```typescript
interface PaginationMeta {
  page: number;                  // 当前页码（从 1 开始）
  limit: number;                 // 每页条数
  total: number;                 // 总条数
}
```

---

## 七、错误码表

### 7.1 通用错误码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `VALIDATION_ERROR` | 400 | 请求参数校验失败 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |
| `SERVICE_UNAVAILABLE` | 503 | 服务暂时不可用 |

### 7.2 认证错误码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `AUTH_UNAUTHORIZED` | 401 | 未提供 Token 或 Token 无效 |
| `AUTH_TOKEN_EXPIRED` | 401 | Token 已过期 |
| `AUTH_INVALID_SIGNATURE` | 401 | 钱包签名验证失败 |
| `AUTH_INVALID_NONCE` | 401 | Nonce 无效或已过期 |
| `AUTH_INVALID_ID_TOKEN` | 401 | zkLogin id_token 验证失败 |
| `AUTH_PROVIDER_NOT_SUPPORTED` | 400 | 不支持的 OAuth 提供商 |
| `AUTH_MISSING_PARAMS` | 400 | 缺少必要认证参数 |
| `AUTH_REFRESH_EXPIRED` | 401 | Refresh Token 已过期 |
| `AUTH_REFRESH_INVALID` | 401 | Refresh Token 无效 |
| `AUTH_REFRESH_REVOKED` | 401 | Refresh Token 已被撤销 |
| `AUTH_USER_NOT_FOUND` | 404 | 用户不存在 |

### 7.3 熊猫错误码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `PANDA_NOT_FOUND` | 404 | 熊猫不存在 |
| `PANDA_NOT_OWNER` | 403 | 非该熊猫的主人 |
| `PANDA_MINT_DISABLED` | 403 | 铸造功能已关闭 |
| `PANDA_MAX_SUPPLY` | 403 | 已达最大铸造上限 |
| `PANDA_MINT_RATE_LIMIT` | 429 | 铸造频率超限 |
| `PANDA_TX_FAILED` | 500 | 链上交易执行失败 |
| `PANDA_NAME_INVALID` | 400 | 名称格式不合法 |
| `PANDA_NAME_PROFANITY` | 400 | 名称包含违禁词 |
| `PANDA_IS_TRADING` | 409 | 熊猫正在交易中 |

### 7.4 策略错误码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `STRATEGY_TEXT_TOO_SHORT` | 400 | 策略文本过短（< 10 字符） |
| `STRATEGY_TEXT_TOO_LONG` | 400 | 策略文本过长（> 2000 字符） |
| `STRATEGY_PARSE_FAILED` | 422 | LLM 无法解析为有效策略 |
| `STRATEGY_RATE_LIMIT` | 429 | 策略解析频率超限（5次/分钟） |
| `STRATEGY_NOT_FOUND` | 404 | 策略不存在 |

### 7.5 模拟交易错误码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `SIM_ALREADY_RUNNING` | 409 | 该熊猫已有运行中的模拟 |
| `SIM_NO_STRATEGY` | 400 | 熊猫尚未设置策略 |
| `SIM_INVALID_SPEED` | 400 | 无效的模拟速度 |
| `SIM_INVALID_ASSET` | 400 | 不支持的交易资产 |
| `SIM_NOT_RUNNING` | 400 | 没有正在运行的模拟 |
| `SIM_NOT_FOUND` | 404 | 模拟会话不存在 |

### 7.6 市场错误码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `MARKET_LISTING_NOT_FOUND` | 404 | 上架记录不存在 |
| `MARKET_PANDA_IS_TRADING` | 409 | 熊猫正在交易中，无法上架 |
| `MARKET_PANDA_ALREADY_LISTED` | 409 | 熊猫已在市场上架 |
| `MARKET_PRICE_TOO_LOW` | 400 | 价格低于最低限额 |
| `MARKET_NOT_SELLER` | 403 | 非该 NFT 的上架者 |
| `MARKET_LISTING_SOLD` | 409 | 已被其他人购买 |
| `MARKET_INSUFFICIENT_BALANCE` | 400 | SUI 余额不足 |
| `MARKET_SELF_PURCHASE` | 400 | 不能购买自己的 NFT |
| `MARKET_TX_FAILED` | 500 | 链上交易执行失败 |

### 7.7 签到错误码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `CHECKIN_ALREADY_TODAY` | 409 | 今日已签到 |

### 7.8 市场数据错误码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `MARKET_DATA_ASSET_NOT_SUPPORTED` | 400 | 不支持的资产类型 |
| `MARKET_DATA_INTERVAL_INVALID` | 400 | 无效的 K 线间隔 |
| `MARKET_DATA_SOURCE_UNAVAILABLE` | 503 | 数据源暂时不可用 |

### 7.9 Internal RPC 错误码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `INTERNAL_AUTH_FAILED` | 401 | Internal API Key 验证失败 |
| `INTERNAL_ACTOR_NOT_FOUND` | 404 | Actor 不存在 |
| `INTERNAL_ACTOR_BUSY` | 409 | Actor 正在处理其他请求 |
| `INTERNAL_LLM_ERROR` | 502 | DeepSeek V3 调用失败 |
| `INTERNAL_LLM_TIMEOUT` | 504 | DeepSeek V3 调用超时（> 3s） |

---

## 八、Rate Limiting

### 8.1 限流策略

| 接口类别 | 限制 | 窗口 | 说明 |
|----------|------|------|------|
| 普通接口 | 60 req | 1 min / user | 默认限流 |
| 策略 **LLM 解析**（`POST …/strategy` 且 `parse_with_llm=true`） | 5 req | 1 min / user | 仅文本解析计次；`parsed` 直传不限 |
| 策略校验 (`POST …/strategy/validate`) | 30 req | 1 min / user | 不存库、不调 LLM |
| 铸造 (`POST /api/panda/mint`) | 3 req | 1 min / user | 链上操作 |
| 市场操作 (`POST /api/market/*`) | 10 req | 1 min / user | 链上操作 |
| WebSocket 消息 | 30 msg | 1 min / connection | 客户端消息限流 |
| Internal RPC | 1000 req | 1 min / service | 服务间通信 |

### 8.2 限流响应

当请求超过速率限制时，返回：

```
HTTP 429 Too Many Requests
```

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "请求过于频繁，请稍后再试",
    "details": {
      "limit": 60,
      "window_seconds": 60,
      "retry_after_seconds": 23
    }
  }
}
```

### 8.3 限流 Header

所有响应包含限流信息 Header：

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1683648000
```
