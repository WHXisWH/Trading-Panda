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

## Epic 8 — Panda Avatar 素材分层与锚点骨架（panda-lab）

**Done 标准**：`/panda-lab` 使用真实 PNG 素材图层合成熊猫；属性变化不会出现头带、斗篷、眼部、体型错位；大图预览与 120/128px 头像都可读；每个属性的 10 档素材清单、路径、锚点、验收图都可追踪。

**依赖**：`/Users/Murphywuwu/Documents/Obsidian Vault/Artifact-Registry/sui-ai-trading-pet/design/panda-character-design.md` · 当前 `PandaCanvasRenderer` / `pandaCanvasAssets` · `tmp/imagegen/panda-trait-prompts.jsonl` · `docs/panda-avatar-asset-layering.md`

**当前状态**：子层目录、manifest、renderer、audit、QA 工程链路已跑通；当前生成 PNG 仅作为 smoke fixture，不作为正式美术素材。正式方向已锁定为 `docs/panda-avatar-asset-layering.md` v1.1 的“赛博潮玩微装饰件”。

### 8.1 资产范围与档位契约

- [x] 锁定 7 个外观属性：`boldness` / `patience` / `intuition` / `focus` / `contrarian` / `experience` / `emotion`
- [x] 将资产目标从“性格五维 50 张”扩展为“每个属性 10 档素材”；若 `emotion` 继续使用现有 7 种枚举，先补充 10 档映射规则或更新情绪模型
- [x] 明确最终资产目录与命名：`frontend/public/assets/panda/{experience|emotions|traits/...}/tier-01.png` ... `tier-10.png`
- [x] 为每个属性写清图层职责：`experience` 控制身体/成长基底，`emotion` 控制脸部，性格五维控制局部配饰/气场，不再让单个属性生成整只熊猫

### 8.2 Panda Rig 锚点模型

- [x] 新增统一骨架/锚点模型：`headCenter` · `neck` · `shoulderLeft` · `shoulderRight` · `bodyCenter` · `eyeLeft` · `eyeRight` · `feetBase`
- [x] 为 10 个 `experience` 档定义锚点变化，体型变大时锚点随之变化，而不是只缩放 base 图
- [x] 定义 attachment groups：`head` · `eyes` · `neck` · `shoulders` · `torso` · `back` · `hands` · `ground` · `worldAura`
- [x] 约定安全区：脸部不可遮挡区、身体中央留空区、头像裁切安全区

### 8.3 素材 Manifest 与图层元数据

- [x] 扩展 `pandaCanvasAssets` manifest：每张素材记录 `src` · `attribute` · `tier` · `attachment` · `pivot` · `zIndex` · `scaleWith` · `opacityRule`
- [x] 支持“Top 1-2 强化 / 全属性显示”两种模式：由 manifest 与 layer state 决定渲染强度，不靠手写 if/else 堆叠
- [x] 支持“10 阶换图 / 档内渐进增强”两种模式：离散模式只换素材；渐进模式调整 alpha/scale/filter，但不改变 attachment 关系
- [x] 保留开发期 fallback，但正式 canvas 路径优先加载 PNG 素材，不再以程序绘制作为主视觉

### 8.4 Canvas Renderer 长期重构

- [x] 把 `drawBasePanda` 的经验缩放逻辑迁移到 rig transform，避免 base 与 trait layer 使用不同坐标系
- [x] 绘制每个素材时按 attachment group 计算 `translate / scale / rotate`，例如胆识斗篷挂 `shoulders/back`，直觉 `ear-radar` / `halo` 挂头部外围锚点
- [x] 保证 `experience` 体型变化时，头带、斗篷、眼圈、装备、气场跟随正确锚点，不出现固定画布坐标错位
- [ ] 同时验证主预览 384px、Mint 圆预览 120px、Dashboard 头像 128px 的裁切与可读性

### 8.5 GPT Image 素材生成与质检流水线

- [x] 重写 smoke prompt JSONL，使每张素材都声明对应 attachment、锚点、留空区、禁止完整熊猫输出
- [x] 使用 `gpt-image-2` 生成 chroma-key 源图，再用本地 chroma-key helper 输出透明 PNG（70/70 smoke fixture 已生成）
- [x] 每张 smoke 素材生成后做 alpha bounding box 检查：是否居中、是否超出安全区、是否误画完整熊猫、是否带背景/文字/水印
- [x] 先完成一个纵向工程样例链路：`experience` 1/5/10 + `boldness` 1/5/10 + rig 合成验收
- [x] smoke 源图保存在 `tmp/imagegen/generated/`，smoke 透明 PNG 放入 `frontend/public/assets/panda/`
- [ ] 按 `docs/panda-avatar-asset-layering.md` v1.1 重写 production prompt JSONL：赛博潮玩、非常小但精致、不遮脸
- [ ] 先生成 6 个 production 样例：`boldness/headband`、`focus/monocle`、`intuition/ear-radar`、`patience/tea`、`contrarian/mark`、`emotions/extras`
- [ ] 6 个样例通过人工视觉审查后，再扩展全量 tier 与其他 sublayer
- [ ] production 源图与最终透明 PNG 落盘后，替换 smoke fixture 并更新 QA 报告

### 8.6 Panda Avatar 长期修正：底图主权与脸部语义

**背景**：当前 `experience` 10 档底图已经是完整熊猫，包含眼睛、嘴巴、鼻子、耳朵；`emotion` 与 `intuition` 若生成眼部相关素材，直接叠加会出现双眼、错位、表情冲突和脸部脏乱。长期方案需要把 `experience` 定义为体型/角色基底，把 `emotion` 定义为唯一主表情层，把 `intuition` 限制为耳周/头部外围感知特效。

**Done 标准**：任意 `experience tier` + emotion + intuition 组合下，不出现重复五官；表情跟随真实底图 landmarks；直觉效果不替代/覆盖主眼睛；Dashboard 128px 头像仍可读。

- [x] 明确图层职责并写入文档/manifest 注释：`experience = body/head/ear/base identity`，`emotion = 当前唯一五官主层`，`intuition = 耳周/头部外围感知特效`
- [x] 禁止 `emotion` 使用整张 AI 眼睛 PNG 直接叠脸；改为严格小部件 PNG 渲染
- [x] 禁止 `intuition` 绘制完整眼睛/眉眼组合；仅允许 ear-radar、head-perimeter signal arcs、insight particles、external halo
- [x] 定义固定绘制顺序：background → worldAura PNG → ground PNG → experience base PNG → body accessories PNG → emotion PNG → intuition PNG → final highlights PNG
- [x] 默认展示模式从“全部强叠”收敛到 Top1/Top2 主视觉；低优先级 trait 使用低透明徽记或不显示

### 8.7 Experience Rig 人工/半自动标注工具

**目标**：为 10 张 `experience` 底图建立真实 landmark manifest，替代当前理想坐标推断。

**推荐入口**：新增内部页面 `/panda-lab/rig`，不要塞进 `/panda-lab` 主试装页。`/panda-lab` 保持最终视觉预览，`/panda-lab/rig` 作为资产生产工具，开发环境开放即可。

- [x] 新增 `/panda-lab/rig` 内部标注页：显示当前 tier 底图 + landmark overlay + JSON 预览
- [x] 标注页固定使用前端最终坐标系（建议 `512x512`），所有源图无论 `1024`/`1254` 都归一化后标注
- [x] 支持 tier 切换：`tier-01` ... `tier-10`
- [x] 支持复制上一 tier 的 landmarks，便于连续修正成长变化
- [x] 支持拖动/缩放矩形：`faceRect`、`leftEye`、`rightEye`、`nose`、`mouth`、`bodyRect`
- [x] 支持拖动点位：`headCenter`、`feetBase`
- [x] 支持键盘微调当前选中点/框（1px 或 5px 步进）
- [x] 支持显示/隐藏 overlay、底图透明度、mask preview、emotion preview
- [x] 支持导出/保存 `experience-rig.json`

### 8.8 半自动初始标注脚本

**目标**：用图像分析给人工标注提供初始值，最终结果仍以人工校正为准。

- [x] 统一 `experience` 最终资产尺寸，禁止同一资产集混用 `1024x1024` 与 `1254x1254`
- [x] 基于 alpha channel 估算整只熊猫 bbox，生成 `bodyRect` 初始值
- [x] 基于上半身深色连通区域估算耳朵/眼圈候选，生成 `faceRect` 初始值
- [x] 在 `faceRect` 内估算左右眼深色区域，生成 `leftEye` / `rightEye` 初始值
- [x] 在双眼中间下方估算 `nose` 初始值
- [x] 在鼻子下方估算 `mouth` 初始值
- [x] 输出初始 manifest，供 `/panda-lab/rig` 加载并人工校正
- [x] 半自动脚本只作为辅助，不因识别失败阻塞人工从零标注

### 8.9 Rig Manifest 契约与渲染接入

**目标**：所有脸部相关渲染基于真实 landmarks，而不是固定画布坐标或理想 rig。

- [x] 定义 `experience-rig.json` schema：`tier`、`image`、`canvasSize`、`headCenter`、`faceRect`、`leftEye`、`rightEye`、`nose`、`mouth`、`bodyRect`、`feetBase`
- [x] 添加 schema 校验：10 个 tier 必须齐全；坐标必须在 canvas 内；左右眼/嘴巴必须落在 `faceRect` 内
- [x] `PandaCanvasRenderer` 按当前 `experience tier` 读取真实 rig manifest
- [x] `PandaCanvasRenderer` 使用 emotion PNG 素材层，不再用 Canvas/SVG 程序绘制五官
- [x] `PandaCanvasRenderer` 使用 intuition PNG 素材层，不再用 Canvas/SVG 程序绘制眼周特效
- [x] `focus` 使用生成素材图层，不再使用固定画布坐标的程序绘制
- [x] `boldness` 使用生成素材图层，避免程序绘制头带横穿眼睛
- [x] `patience` 使用生成素材图层，不再用程序绘制 ground props

### 8.10 Face Cleanup Mask 与五官替换

**目标**：解决 `experience` 底图自带五官与 emotion 五官重复的问题。

- [x] 移除 Canvas/SVG cleanup mask，避免程序绘制覆盖生成素材
- [x] 默认保留底图鼻子；emotion 仅通过生成 PNG 小部件表达表情
- [x] 禁止 cleanup mask 破坏熊猫黑眼圈、脸型和水墨纹理
- [x] 绘制 emotion 时只叠加生成 PNG 素材层
- [x] 为 calm/excited/panic/numb/frustrated/greedy/cautious 至少 7 种现有 emotion 建立素材 tier 映射
- [x] 在 128px 小头像尺寸完成 smoke fixture 检查：emotion 层不出现糊脸或空洞感
- [ ] production emotion/extras 生成后重新验收 128px 小头像可读性

### 8.11 资产质检与视觉验收升级

**目标**：把现有“warning 可接受”的资产检查升级成可阻止错误素材进入前端的质量门。当前已完成工程质量门；production 级视觉验收需等赛博潮玩素材生成后执行。

- [x] 质检 hard fail：素材尺寸不一致
- [x] 质检 hard fail：非 `experience` 素材疑似完整熊猫或覆盖 body/face 过大
- [x] 质检 hard fail：`emotion` 素材覆盖身体区域或 bbox 不在 `faceRect` 附近
- [x] 质检 hard fail：`intuition` 素材出现完整眼睛主体/眉眼组合
- [x] 生成批量验收图：10 张底图 + landmark overlay
- [x] 移除 SVG cleanup mask 验收图，改由 `/panda-lab/qa` 检查素材实叠效果
- [x] 在 `/panda-lab/qa` 完成 smoke fixture 的 calm/excited/panic 等 emotion PNG 实叠检查
- [x] 在 `/panda-lab/qa` 完成 smoke fixture 的 low/mid/high intuition PNG 实叠检查
- [x] 在 `/panda-lab` 完成 smoke fixture 的最终组合检查：不同 experience、emotion、intuition、Top1/Top2 traits、384px/128px 尺寸
- [ ] 在 `/panda-lab/qa` 验收 production cyber accessory 素材实叠效果：6 个样例先过，再扩全量
- [ ] 在 `/panda-lab` 做 production 最终组合验收：不同 experience、emotion、intuition、Top1/Top2 traits、384px/128px 尺寸

### 8.12 Avatar 素材子层规范落地

**目标**：把“属性 → 单一大图”的旧模型升级为“属性 → 单一语义子层 → 单一 anchor”的生产规范，避免大 bbox 素材压眼睛/嘴巴/身体关键区。

- [x] 在 `docs/panda-avatar-asset-layering.md` 写入完整素材分层规范：目录、子层、anchor、bbox、prompt、迁移计划、赛博潮玩 production prompt 样例
- [x] 在 `docs/frontend-design.md` 增加 Panda Avatar 素材规范引用
- [x] 将当前 broad-layer 旧素材标记为临时资产：`traits/boldness/tier-*.png`、`traits/intuition/tier-*.png`、`emotions/tier-*.png`
- [x] 明确旧目录兼容策略：旧目录仅作为归档临时资产保留，子层素材验收通过后 renderer 不再加载旧 broad-layer
- [x] 在 `dev-docs/DEV_CONTEXT.md` 记录当前方案变更：intuition 禁止眼相关素材，emotions 独占主五官语义
- [ ] production 素材生成后回填 `dev-docs/DEV_CONTEXT.md`：最终素材数量、生成方式、QA 报告、已知限制

### 8.13 子层目录与素材重生成

**目标**：按 `docs/panda-avatar-asset-layering.md` 重新生成可组合的小 bbox PNG，不再把多个视觉元素混进同一张属性图。

- [x] 建立新目录结构：`traits/boldness/{headband,cape,weapon}/tier-xx.png`
- [x] 建立新目录结构：`traits/contrarian/{aura,mark}/tier-xx.png`
- [x] 建立新目录结构：`traits/focus/{monocle,headband,chest-core}/tier-xx.png`
- [x] 建立新目录结构：`traits/intuition/{ear-radar,particles,halo}/tier-xx.png`
- [x] 建立新目录结构：`traits/patience/{ground-prop,bamboo,tea}/tier-xx.png`
- [x] 建立新目录结构：`emotions/{eyes,brows,mouth,extras}/tier-xx.png`
- [x] 重写 smoke GPT Image prompt JSONL：每条 prompt 必须声明 `attribute`、`sublayer`、`anchor`、禁止完整熊猫/完整脸/背景/文字/水印
- [x] 为 smoke `intuition` prompt 加硬约束：禁止 eyes、pupils、eyebrows、eye glow、eye rings、gaze beams、任何改变表情的眼神素材
- [x] 为 smoke `emotions` prompt 加硬约束：仅允许主五官小部件，不允许 body props、aura、完整脸或完整熊猫
- [x] 先生成 smoke set：每个属性至少 1 个 sublayer 的 tier-01 / tier-05 / tier-10
- [x] smoke set 通过 bbox 工程检查后扩展为 full smoke fixture
- [ ] 重写 production GPT Image prompt JSONL：采用 `docs/panda-avatar-asset-layering.md` v1.1 的赛博潮玩微装饰件样例与 chroma-key 规范
- [ ] production prompt 必须禁用 broad ink wash / 程序几何占位感 / 大面积遮脸效果

### 8.14 Sublayer Manifest 契约

**目标**：把 `pandaCanvasAssets` 从属性级 manifest 升级为子层级 manifest，让 renderer 能按子层选择真实 anchor。

- [x] 新增 sublayer manifest schema：`attribute`、`sublayer`、`tier`、`src`、`anchorPolicy`、`zIndex`、`opacityRule`、`bboxPolicy`、`role`
- [x] 定义 anchor policy 枚举：`faceTopCenter`、`leftEyeCenter`、`rightEyeCenter`、`eyesMidpoint`、`mouthCenter`、`bodyCenter`、`upperBodyCenter`、`feetBase`、`headCenterOffset`、`worldAura`
- [x] 为每个 sublayer 写入固定 anchor policy，禁止 renderer 通过属性名猜测定位
- [x] 支持一个属性同时渲染多个 sublayer，并由 `zIndex` 控制顺序
- [x] 保留 Top1/Top2 主视觉逻辑，但 Top2 应作用于属性级开关，属性内部 sublayer 仍按 manifest 渲染
- [x] 写入新 manifest 的 TypeScript 类型与 schema 校验
- [x] 保留旧 broad-layer manifest fallback，直到新素材全量通过验收；验收通过后旧 broad-layer 已从 renderer manifest 移除

### 8.15 Renderer 子层锚点接入

**目标**：`PandaCanvasRenderer` 使用 `experience-rig.json` + sublayer manifest 定位每个小素材，彻底避免单一属性大图压脸。

- [x] `experience` 继续 512x512 原位绘制，不做二次 transform
- [x] `boldness/headband` 基于 `faceRect.topCenter`，并强制位于 eye center 以上
- [x] `boldness/cape` 基于 upper `bodyRect` / shoulder 区域，不允许覆盖眼睛
- [x] `boldness/weapon` 基于 body side anchor；缺少 hand anchor 前不得生成手持跨脸素材
- [x] `contrarian/aura` 基于 `bodyRect.center` 或外圈 `worldAura`，可大但必须外围化
- [x] `focus/monocle` 基于 `rightEye.center`，不得替代眼睛
- [x] `focus/headband` 基于 `faceRect.topCenter`
- [x] `focus/chest-core` 基于 upper `bodyRect.center`
- [x] `intuition/ear-radar` 基于 `headCenter` 侧偏移，后续补 ear anchors 后迁移
- [x] `intuition/particles` 基于 `faceRect` 外围，不允许落入 eyes/mouth 主区域
- [x] `intuition/halo` 基于 `headCenter` 上方，不覆盖眼睛和嘴巴
- [x] `patience/ground-prop` / `bamboo` / `tea` 基于 `feetBase` 或 ground side offset
- [x] `emotions/eyes`、`emotions/brows`、`emotions/mouth`、`emotions/extras` 分别基于眼睛/眉区/嘴巴/脸侧局部锚点

### 8.16 子层资产质检升级

**目标**：把 `audit-panda-assets.mjs` 从属性级检查升级为子层级质量门，阻止 broad-layer 或语义冲突素材进入前端。

- [x] 读取 sublayer manifest，按 `bboxPolicy` 对每张 PNG 做 hard fail
- [x] hard fail：非 `experience` 素材疑似完整熊猫或完整脸
- [x] hard fail：任一 sublayer 同时覆盖多个不相关 landmark
- [x] hard fail：`boldness/headband` 与 `leftEye` / `rightEye` overlap 超过 5%
- [x] hard fail：`boldness/cape` 与任一 eye rect overlap 超过 10%
- [x] hard fail：`focus/chest-core` 与 `faceRect` 相交
- [x] hard fail：`focus/monocle` 覆盖双眼或替代主眼睛
- [x] hard fail：`intuition/*` 与 `leftEye` / `rightEye` / `mouth` overlap 超过 5%
- [x] hard fail：`intuition/*` prompt 或文件元数据疑似 eye/pupil/brow/gaze 语义
- [x] hard fail：`patience/ground-prop` 中心高于 `bodyRect.y`
- [x] hard fail：`emotions/eyes` 不接近 `leftEye` / `rightEye`
- [x] hard fail：`emotions/mouth` 不接近 `mouth`
- [x] 生成 QA 报告：每个 sublayer 的 bbox、anchor、overlap ratios、通过/失败原因

### 8.17 Panda Lab 子层验收

**目标**：让 `/panda-lab` 和 `/panda-lab/qa` 能检查每个子层的单独挂载效果与最终组合效果。

- [x] `/panda-lab/qa` 新增 sublayer 单独预览：选择 attribute / sublayer / tier / experience tier
- [x] `/panda-lab/qa` 显示 anchor overlay、alpha bbox overlay、目标 landmark overlay
- [x] `/panda-lab/qa` 显示 hard fail 指标：eye overlap、mouth overlap、face overlap、body overlap
- [x] smoke 验收 `boldness/headband` 在 tier-01 / tier-05 / tier-10 不遮眼
- [x] smoke 验收 `boldness/cape` 在低/中/高 experience 不压脸
- [x] smoke 验收 `intuition/*` 不改变眼神或表情
- [x] smoke 验收 `emotions/*` 能独立表达 calm/excited/panic/numb/frustrated/greedy/cautious
- [x] smoke 验收 384px 主预览、120px Mint 圆预览、128px Dashboard 头像可读性
- [ ] production 验收 `boldness/headband`、`focus/monocle`、`intuition/ear-radar`、`patience/tea`、`contrarian/mark`、`emotions/extras` 6 个样例
- [ ] production 全量通过后，将 smoke fixture 替换为正式素材，并确认旧 broad-layer 目录不再被 renderer manifest 加载

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

*最后更新：2026-06-08 · Epic 8 Panda Avatar（赛博潮玩 production 素材规范与 smoke fixture 状态修正）*
