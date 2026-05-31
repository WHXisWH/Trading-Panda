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

- [x] 实现 `POST /api/panda/:id/strategy`（`parsed` 优先，跳过 LLM）
- [x] 实现 `POST /api/panda/:id/strategy/validate`（试编译 + Step1 预览）
- [x] 可选：`raw_text` + `parse_with_llm` 路径（DeepSeek，5/min 限流）

### 2.2 后端

- [x] `strategy.py`：Pydantic 校验 · RuleEngine 试编译 · 至少 1 条有效规则
- [x] deactivate 旧策略 · `strategy_history` · `ghost_weight=0.40`
- [x] `strategy_hash = SHA256(parsed_json)` · 性格匹配度（规则表，非必须 LLM）
- [x] 无 `raw_text` 时生成摘要写入 `strategies.raw_text`

### 2.3 前端

- [x] `StrategyBuilder`：哲学 + 规则行（RSI/MA20/MACD/PRICE）+ 仓位/止损滑块
- [x] `StrategyTemplates` 四套模板 · 行内校验 · 软警告黄条
- [x] `StrategyTextInput` 折叠（进阶 LLM）· 解析结果灌入 Builder
- [x] `feedStrategy` / `validateStrategy` service + mutations
- [x] 匹配度展示 ·「教给熊猫」主按钮

### 2.4 联调与验收

- [x] 提交 2 买 2 卖规则 → GET strategy 回读一致
- [x] 无效 indicator → `STRATEGY_RULE_INVALID`
- [x] 换策后 simulation 使用新 `active_strategy`；ghost 在 Step4 可观测
- [x] pytest：`test_rule_engine` · `test_verdict` 仍绿

---

## Epic 3 — Dashboard 模拟盘（核心体验）

**Done 标准**：用户选好 DeepBook 池 → 点击 **「开始训练」** 后熊猫才消费 tick 并跑八步管线 → 主区 K 线为**所选池真实行情**（REST 历史 + WS 增量）→ 右侧 **上半：实时决策链（WS）**、**下半：交易历史列表** → 布局 Obsidian **180 | flex | 170**。

**依赖**：Epic 2 · Sprint 0 WS · market-monitor（`DEEP/SUI` · `SUI/DBUSDC`）

### 产品共识（2026-05-25 讨论锁定）

| 项 | 结论 |
|----|------|
| **何时练** | **会话制**：仅用户点 **「开始训练」** 后 `ActorManager.start`；未训练时 monitor 仍推 `market:tick`，但该熊猫不决策、不写 `trades` |
| **结束训练** | **「暂停训练」**（`simulation/stop`）释放 `is_trading` 锁；非「关页面即停」的隐含行为需在文案写清 |
| **行情 vs 成交** | 行情来自 DeepBook（monitor）；买卖为链下 paper trade（MVP 不向 DeepBook 下单） |
| **MVP 池** | 仅 **DeepBook Testnet 两池**：`DEEP/SUI`、`SUI/DBUSDC`（与 `DEEPBOOK_POOLS` 一致）；UI 禁止 Cetus/假池名 |
| **右侧决策链** | **实时 WS**（`subscribe.simulation` → `decision` / `emotion` / `trade_executed`）；训练中展示最近一笔评估/成交摘要，可展开 8 步 |
| **交易历史** | 右侧栏 **下半部分**；列表来自 `GET trades`（或 WS `trade_executed` 增量）；点击某笔可展开该笔 `decision_details`（8 步回顾，与实时区二选一展示或折叠切换） |
| **池切换位置** | **ChartHeader 旁**（symbol / timeframe 一行），**不在**主区底栏；底栏仅 **速度控制 + 开始/暂停训练** |
| **移除 mock** | Dashboard 不得使用 `MOCK_DECISIONS`、`generateCandles`、占位「Cetus BTC/SUI」；`/trading/[id]` 非 MVP 主路径（Phase 2） |

**右侧栏布局（170px）**：

```
┌─ 决策链（上，flex-1）─┐  ← WS 实时：最近 decision + 展开 8 步
├─ 交易历史（下）──────┤  ← REST/WS：成交列表；点击行 → 8 步回顾
└──────────────────────┘
```

### 3.1 契约

- [x] `POST /api/panda/:id/simulation/start|stop` · `GET .../status`（`panda_simulation.py` + BFF）
- [x] `simulation/start` body：`speed` · `subscribed_pools[]` · `data_source: deepbook`
- [x] `GET /api/panda/:id/trades`（含 `decision_details`）
- [x] WS Hub：`decision`/`emotion`/`trade_executed`（`panda:{id}:trade`）
- [x] 行情 WS + REST candles 同源

### 3.2 后端（DE）

- [x] `ActorManager` 仅 `simulation/start` 后 start；`subscribed_pools` 传入 Actor
- [x] `PandaActor.hydrate` + `subscribed_assets` 过滤
- [x] 八步管线 + `publish decision|emotion|trade_executed`
- [x] 模拟成交写 `trades`（`decision_details.steps`）
- [x] `pandas.is_trading` / simulation `status` 与 start/stop 同步
- [ ] `POST /engine/market/tick` 内部注入（联调，可选）

### 3.3 前端

- [x] 三栏布局：`PandaSidebar` 180px · 主区 · 右侧 170px（`DashboardRightPanel` 上决策 + 下历史）
- [x] **ChartHeader**：当前池名（`DEEP/SUI` ▼）· 价格/涨跌；池切换在 **此行**，改池后重拉 REST + 重订 `subscribe.market`
- [x] `CandlestickChart`：`useMarketWs` + REST + 成交量柱 + K 线买卖标记（`trades`）
- [x] **训练控制**：主区底栏 **仅** `SpeedControl` + **「开始训练」/「暂停训练」**
- [x] `useSimulationWs`：`subscribe.simulation`；收 `decision` / `emotion` / `trade_executed`
- [x] **DecisionChain（右侧上）**：绑定 WS 实时；展开 8 步
- [x] **TradeHistory（右侧下）**：`GET trades` 列表；点击行回顾 `decision_details`
- [x] `AccountPanel` 接 `simulation/status`（权益、持仓、盈亏、成交笔数）
- [x] 情绪仅 emoji/颜色，不暴露数值（PRD C4）
- [x] 清理：Dashboard 移除 `MOCK_DECISIONS`、Cetus 假池文案

### 3.4 联调与验收

- [ ] 未点「开始训练」：K 线随所选池更新（market WS），**无**新 `trades`、**无** panda decision 推送
- [ ] 点「开始训练」后：monitor → Redis → DE Actor → Hub → 浏览器；≥10 tick 有 decision；有成交则有 `trades` 行
- [ ] 切换池：ChartHeader 换池 → K 线与 `market:tick` 频道变为新池；训练中仅新池 tick 驱动决策（若已订阅过滤）
- [ ] 右侧：上半随 WS 更新；下半列表与 DB `trades` 一致
- [ ] 快进 instant 不调 LLM（PRD）
- [ ] DEV_CONTEXT：Render/WS URL 如有部署则更新

---

## Epic 4 — 交易池选择 Pools

**Done 标准**：MVP 仅暴露 **DeepBook 两池**；Dashboard ChartHeader 可切换当前池；`/pools` 用于首次/多池配置（受 focus 限制）→ 写回 `subscribed_pools` → 训练 start 使用该配置。

**依赖**：Epic 3（池名与 WS/REST 已打通）

### 产品共识

- **数据源唯一**：DeepBook v3 Testnet；`market-monitor` 的 `DEEPBOOK_POOLS=DEEP/SUI,SUI/DBUSDC`
- **Dashboard 主路径**：ChartHeader 下拉切换「当前看盘/训练池」
- **`/pools` 页**：mint 后可选入口、或 focus 允许多池时的批量勾选；**不是**唯一改池方式

### 4.1 契约

- [x] `PUT` / `GET /api/panda/:id/pools`
- [x] `simulation/start` 优先 body 池，否则 `pandas.subscribed_pools`
- [x] BFF `GET /api/market/health`

### 4.2 后端

- [x] Alembic `002` · `pandas.subscribed_pools` JSONB
- [x] `panda_pools.py` · focus 上限（cap 2）
- [x] 训练中禁止改池；Actor `set_subscribed_pools`

### 4.3 前端

- [x] `/pools` DeepBook 两池 + enrichment + ConfirmBar（无 MOCK_POOLS）
- [x] Dashboard ChartHeader ↔ `PUT pools`
- [x] 开始训练用已保存 `subscribed_pools`

### 4.4 联调与验收

- [ ] 手测：选池 → Dashboard → 训练仅订阅所选池
- [ ] `alembic upgrade head`

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
| 3 Dashboard | 选池 → **开始训练** → K 线真行情 + 右侧实时决策/历史 | `panda_actor.py` · `useMarketWs` · `useSimulationWs` · `dashboard/[id]` |
| 4 Pools | ChartHeader 或 `/pools` → 两 DeepBook 池 | `DEEP/SUI` · `SUI/DBUSDC` · `pandas.subscribed_assets` |
| 5 Market | `/market` | Kiosk · `MarketGrid` |
| 6 Growth | `/leaderboard` · `/achievements` · `/profile` | 各 API + 页 |

*最后更新：2026-05-25 · Epic 4 Pools（DeepBook 两池、持久化订阅、/pools 页）*
