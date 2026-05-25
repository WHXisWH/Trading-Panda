# TradingPanda 开发 TODO

> **方法论**：Sprint 0 横向地基 → **按功能纵向 Epic**（每条穿全栈）→ Epic 内按「契约 → 后端/链上 → service/hook → UI → 联调 → DEV_CONTEXT」检查。  
> **原则**：每个 Epic 的 Done = **用户可演示**，不是某一层文件建完。  
> **文档**：`docs/PRD.md` · `docs/frontend-design.md` v1.1 · `docs/api-specification.md` · `dev-docs/DEV_CONTEXT.md`

**Epic 优先级（MVP 锁死）**：`Foundation` → `Mint` → `Strategy` → `Dashboard` → `Pools` → `Market` → `Growth` → `Phase 2`

**状态标记**：`[ ]` 待做 · `[~]` 进行中 · `[x]` 完成 · `[-]` 跳过/Phase 2

---

## Sprint 0 — Foundation（全功能共用地基）

**Done 标准**：本地可 `frontend build` + `backend pytest` + 环境变量文档对齐；共享类型与 BFF 约定就绪。

### 0.1 契约与类型

- [x] 前端 `types/strategy.ts` 对齐 API：`ParsedStrategy` · `SignalRule` · `DecisionStep.ruleHits`
- [x] 前端 `types/panda.ts` / `types/trading.ts` 与 `api-specification.md` 核心字段对齐
- [x] 后端 Pydantic：`SignalRule` · `ParsedStrategyLayers` · `StrategyFeedRequest`（`parsed` | `raw_text`）
- [x] 统一 API 错误码枚举：`STRATEGY_*` · `PANDA_*`（BFF 透传）

### 0.2 数据库与迁移

- [x] Alembic 初始化 + 首版 migration（`users` · `pandas` · `strategies` · `simulations` · `trades` · `strategy_history`）
- [x] 本地/Supabase 连接验证（`DATABASE_URL` + asyncpg；`scripts/verify_db.py` + `/health` `db` 字段）
- [x] 种子脚本或 README：测试用户 + 一只 mock panda（`scripts/seed_dev.py` · `backend/README.md` § Database）

### 0.3 BFF / Auth / 配置

- [x] Next.js API Routes 代理模板（`NEXT_PUBLIC_BACKEND_URL` + JWT 转发）
- [x] 钱包连接 + zkLogin 会话 → JWT（`POST /api/auth/connect`）
- [x] `frontend/.env.example` · `backend/.env.example` 与 DEV_CONTEXT §4 核对

### 0.3.1 钱包验签 + Nonce Redis（Auth 加固）

**Done 标准**：`method=wallet` 的 `/auth/connect` 在 `REDIS_URL` 可用时完成 PersonalMessage 验签 + nonce 一次性消费；伪造签名 / 重放 nonce 返回 `AUTH_INVALID_SIGNATURE` / `AUTH_INVALID_NONCE`；`pytest` 覆盖主路径。

**依赖**：Sprint 0.3（`/auth/connect` 已通）· `REDIS_URL`（Upstash `rediss://`）· 可选 `requirements-sui.txt`（pysui 验签）

**参考**：`docs/api-specification.md` §2–3.1 · `docs/backend-design.md` §2.2 · `docs/redis-architecture.md`（JWT nonce 5min）

#### 契约与 Redis 约定

- [x] 锁定 nonce 流：**服务端签发**（`GET /auth/nonce` → 签 `message` 字段 → connect 提交 `nonce` id）
- [x] Redis key：`auth:nonce:{nonce}` · TTL **300s** · 值可选绑定 `wallet_address`；connect 时 `GETDEL` 一次性消费
- [x] `GET /api/auth/nonce`（BFF 代理 `GET /auth/nonce`）返回 `{ nonce, message, expires_in }`

#### 后端

- [x] `app/services/nonce_store.py`：`issue_nonce` · `consume_nonce`（无 `REDIS_URL` → `SERVICE_UNAVAILABLE`）
- [x] `app/services/wallet_verify.py`：PersonalMessage 验签（PyNaCl + Sui intent BCS，无需 pysui）
- [x] `POST /auth/connect`（`method=wallet`）：`consume_nonce` → 验签 → `AUTH_INVALID_*`
- [x] `backend/README.md` §钱包登录；依赖 `PyNaCl`（`requirements.txt`）
- [x] `tests/test_auth_wallet.py`：有效签 · 错误签名/地址 · nonce 重放 · Redis mock

#### 前端

- [x] `useAuth`：`fetchAuthNonce` → `signPersonalMessage(message)` → `connect`
- [x] `auth.service.ts`：`fetchAuthNonce()` · `authErrorMessage` + toast

#### 联调与文档

- [x] 文档：DEV_CONTEXT §5 `/auth/nonce` · §9 变更日志 · README 钱包登录流
- [x] 本地 E2E：配置 `REDIS_URL` 后钱包连接全流程（需本机 Redis/Upstash）

### 0.4 实时与行情（最小联调）

- [x] Hub 本地：`cd websocket && npm run dev`；文档 URL 写入 DEV_CONTEXT
- [x] market-monitor 本地：`market:tick:*` 有推送；`GET /candles/{pool}` 可拉历史
- [x] 前端单 WSS：`subscribe.market` + `subscribe.simulation` 封装 hook

### 0.5 UI 壳（Obsidian tokens）

- [x] `globals.css` / `tokens.css`：Navbar **44px** · 三栏 Dashboard 宽度变量（180 / flex / 170）
- [x] 共享 `Navbar` · `WalletButton` · 页面 `layout` 壳
- [x] DEV_CONTEXT 变更日志：Sprint 0.5 完成一行

---

## Epic 1 — Onboarding + Mint（第一条链上闭环）

**Done 标准**：新用户连接钱包 → 铸造熊猫 → 性格/天赋揭晓 → 跳转 `/dashboard/[id]`；DB 有 `pandas` 行。

**依赖**：Sprint 0（auth、DB、types）

### 1.1 契约

- [x] `POST /api/panda/mint` 注册链上 object → DB（见 `api-specification.md`）
- [x] Mint 事件解析：`personality` 五轴 · `talent` · `object_id`

### 1.2 合约（Sui Testnet）

- [x] 确认 Package 与 DEV_CONTEXT §3 一致；必要时 redeploy 并更新 ID
- [x] `mint` 入口：gas ~0.03 SUI · `sui::random` 性格 · dynamic_field 初始化
- [x] 本地 `sui move test` 绿

### 1.3 后端

- [x] 监听或 BFF 回调：mint 成功后 `INSERT pandas` + owner_id（Epic 1.1 `POST /panda/mint`）
- [x] `GET /api/panda/:id` · `GET /api/panda/my`（api-spec 嵌套 personality/talent + success 信封）

### 1.4 前端

- [x] `/onboarding` 问卷（5 步）→ 完成跳 `/mint`
- [x] `/mint` 状态机：`idle` → `confirming` → `minting` → `revealing` → `success`（见 `frontend-design` §3.2）
- [x] PandaAvatar 120×120 · PersonalityRadar · TalentBadge ·「进入模拟盘」
- [x] `useMintPanda` hook + `panda.service` 链上 tx + 后端注册

### 1.5 联调与验收

- [x] Testnet 端到端：铸造 1 只熊猫（手测步骤见 `dev-docs/EPIC1_MINT_E2E.md`）
- [x] 错误态：拒绝签名 · gas 不足 · 重试（`parseMintError` + mint 页重试）
- [x] DEV_CONTEXT：Package/铸造事实如有变更则更新

---

## Epic 2 — 猎手策略 StrategyBuilder（喂策略）

**Done 标准**：Dashboard 用积木提交 `parsed` → 后端校验 RuleEngine → 存 `strategies`；换策产生 ghost；前端可预览匹配度。

**依赖**：Epic 1（panda_id）

### 2.1 契约

- [ ] 实现 `POST /api/panda/:id/strategy`（`parsed` 优先，跳过 LLM）
- [ ] 实现 `POST /api/panda/:id/strategy/validate`（试编译 + Step1 预览）
- [ ] 可选：`raw_text` + `parse_with_llm` 路径（DeepSeek，5/min 限流）

### 2.2 后端

- [ ] `strategy.py`：Pydantic 校验 · RuleEngine 试编译 · 至少 1 条有效规则
- [ ] deactivate 旧策略 · `strategy_history` · `ghost_weight=0.40`
- [ ] `strategy_hash = SHA256(parsed_json)` · 性格匹配度（规则表，非必须 LLM）
- [ ] 无 `raw_text` 时生成摘要写入 `strategies.raw_text`

### 2.3 前端

- [ ] `StrategyBuilder`：哲学 + 规则行（RSI/MA20/MACD/PRICE）+ 仓位/止损滑块
- [ ] `StrategyTemplates` 四套模板 · 行内校验 · 软警告黄条
- [ ] `StrategyTextInput` 折叠（进阶 LLM）· 解析结果灌入 Builder
- [ ] `feedStrategy` / `validateStrategy` service + mutations
- [ ] 匹配度展示 ·「教给熊猫」主按钮

### 2.4 联调与验收

- [ ] 提交 2 买 2 卖规则 → GET strategy 回读一致
- [ ] 无效 indicator → `STRATEGY_RULE_INVALID`
- [ ] 换策后 simulation 使用新 `active_strategy`；ghost 在 Step4 可观测
- [ ] pytest：`test_rule_engine` · `test_verdict` 仍绿

---

## Epic 3 — Dashboard 模拟盘（核心体验）

**Done 标准**：选池后启动模拟 → K 线 + 右侧决策链 WS 更新 → 熊猫自动 decision/trade；布局符合 Obsidian 180|flex|170。

**依赖**：Epic 2 · Sprint 0 WS · market-monitor

### 3.1 契约

- [ ] `POST /api/panda/:id/simulation/start|stop` · `GET .../status`
- [ ] WS：`decision` · `emotion` · `trade_executed` 事件形状与 Hub 一致

### 3.2 后端（DE）

- [ ] `ActorManager` start/stop；`PandaActor` hydrate 从 DB
- [ ] 订阅 `market:tick:{pair}` · 八步管线 · publish `panda:{id}:decision|emotion`
- [ ] 模拟成交写 `trades`（后续 Epic：持仓账本 realized PnL 对齐 schema）
- [ ] `POST /engine/market/tick` 内部注入（联调）

### 3.3 前端

- [ ] Dashboard 三栏：`PandaSidebar` 180px · `DecisionChain` 170px · 主区 Chart + Account/Strategy 并排
- [ ] `CandlestickChart` REST 历史 + WS 增量；买卖标记；成交量 sub-chart
- [ ] `DecisionChain`：最近决策 · 8 步展开 · **Step1 规则命中明细**
- [ ] `SpeedControl` [1×][10×][100×][跳到结果] · `PoolLabel` → `/pools`
- [ ] `useSimulationStore` + Hub `subscribe.simulation`
- [ ] 情绪仅 emoji/颜色，不暴露数值（PRD C4）

### 3.4 联调与验收

- [ ] 本地：monitor → Redis → DE → Hub → 浏览器单连接
- [ ] 1x 模拟跑 ≥10 tick，决策链与 trades 可查
- [ ] 快进 instant 不调 LLM（PRD）
- [ ] DEV_CONTEXT：Render/WS URL 如有部署则更新

---

## Epic 4 — 交易池选择 Pools

**Done 标准**：`/pools` 多选 DeepBook 池 → 确认 → 写回熊猫订阅 → Dashboard 显示当前池。

**依赖**：Epic 3 · market-monitor 池列表

### 4.1 契约

- [ ] `PUT /api/panda/:id/pools` 或 simulation start 携带 `subscribed_pools[]`
- [ ] 池列表 API：monitor `/health` 或 BFF 聚合静态+动态

### 4.2 后端

- [ ] 持久化 `pandas.subscribed_assets` / simulation 配置
- [ ] DE 按 focus 规则限制订阅数量（PRD）

### 4.3 前端

- [ ] `/pools`：`PoolListItem` 72px · 多选 · 底部 ConfirmBar 50px
- [ ] DeepBook 池「推荐」标签 · 空态/骨架屏
- [ ] 确认后回 Dashboard 并刷新订阅

### 4.4 联调与验收

- [ ] 选 1–2 池 → Actor 只消费对应 `market:tick`

---

## Epic 5 — NFT 市场 Market（Kiosk）

**Done 标准**：浏览列表 → 详情弹窗 → 购买/上架走 Kiosk testnet（或 staged mock→真）。

**依赖**：Epic 1 · 合约 Kiosk 模块

### 5.1 契约

- [ ] `GET /api/market/listings` · detail · list · delist · buy（见 api-spec）

### 5.2 合约 / 链上

- [ ] Kiosk 集成 · 版税 2–5% · `is_trading` 锁（PRD）

### 5.3 前端

- [ ] Market 页：SearchBar 600px · FilterBar · Grid 183×210 · Pagination
- [ ] `PandaCard` 五变体 · `MarketDetailModal` 800px · `PurchaseConfirmModal` 400px
- [ ] `@mysten/kiosk` 购买/上架流程

### 5.4 联调与验收

- [ ] 上架一只 → 市场可见 → 另一钱包购买（testnet）

---

## Epic 6 — Growth（排行榜 · 成就 · 签到）

**Done 标准**：PRD MVP 清单中社交/留存功能可演示（可薄实现）。

**依赖**：Epic 3 trades 数据

### 6.1 排行榜

- [ ] `GET /api/leaderboard` 胜率/收益/等级维度
- [ ] `/leaderboard` 页 + RankDimensionTabs

### 6.2 成就

- [ ] 成就条件检测（服务端）· 链上 dynamic_field 记录（可选 batch）
- [ ] `/achievements` 页

### 6.3 签到

- [ ] `POST /api/profile/checkin` · 连续签到加成
- [ ] `/profile` 签到日历

---

## Epic 7 — 信任与经验（可并行，优先级低于 Epic 3）

**Done 标准**：每 50 笔 trade 计算 Merkle batch；经验表有读写；Walrus 备份策略文档化。

### 7.1 Merkle Worker

- [ ] 决策日志序列化 · batch=50 · testnet 提交
- [ ] 前端展示「最近 Merkle root」状态（可选）

### 7.2 经验引擎 PostgreSQL

- [ ] `experience_patterns` · mastery · mistakes 读写接入 Actor
- [ ] 换策 ghost 与 experience 不冲突

### 7.3 持仓与 PnL 账本（猎手）

- [ ] `avg_entry_price` · SELL 时 realized `pnl_pct`（对齐 `database-schema.md`）
- [ ] 胜率统计基于平仓笔数

---

## Phase 2 — 延后（不要挡 MVP）

- [ ] **Trading 界面** `/trading/[id]` 订单簿三栏（只读亦可）
- [ ] **Cetus 双塘** Phase 1：双价+价差 UI（`docs/cetus-integration-research.md`）
- [ ] **镖师** 跨池套利 · PTB 执行
- [ ] **塘主** DLMM LP 模拟
- [ ] **Nautilus TEE** 替换 Merkle 展示层
- [ ] **LLM** 策略解析默认开启 / 熊猫日记批量生成

---

## 工作方式（给 Agent / 人类）

1. 从 **Sprint 0** 或当前 `[~]` Epic 顶部任务开始，**一次只推进一个 Epic 到 Done**。
2. 完成子任务后在本文件把 `[ ]` 改为 `[x]`；Epic Done 后在 DEV_CONTEXT §2.1 更新进度百分比。
3. 任何部署/端口/表结构变更 → **DEV_CONTEXT §9 变更日志追加一行**（CLAUDE.md 第一条规则）。
4. 每个 Epic 合并前至少：`frontend build`（若改 UI）· 相关 `pytest` · 手动 E2E 一条。

---

## 快速参考：Epic → 主要路径

| Epic | 用户路径 | 关键文件/目录 |
|------|----------|----------------|
| 1 Mint | `/onboarding` → `/mint` → `/dashboard/[id]` | `contracts/` · `app/mint/` · `panda.service` |
| 2 Strategy | Dashboard StrategyBuilder → 教给熊猫 | `strategy.py` · `StrategyBuilder` · `rule_engine.py` |
| 3 Dashboard | 模拟盘运行 + WS | `panda_actor.py` · `websocket/` · `dashboard/[id]` |
| 4 Pools | `/pools` → 确认 | `app/pools/` · monitor 池列表 |
| 5 Market | `/market` | Kiosk · `MarketGrid` |
| 6 Growth | `/leaderboard` · `/achievements` · `/profile` | 各 API + 页 |

*最后更新：2026-05-25 · Epic 1.3–1.5 Mint 后端/前端/验收完成*
