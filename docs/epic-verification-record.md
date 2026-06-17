# TradingPanda — Epic Verification Record

> **Last updated**: 2026-06-17 (Supabase DB landed to Alembic head)  
> **Purpose**: 记录 Autonomous Agent Wallet MVP 各 Epic 的交付物、验证命令与实测结果（如实、可追溯）  
> **Source of truth**: `dev-docs/TODO.md` · `docs/PRD.md` v3.1 · `dev-docs/DEV_CONTEXT.md`

---

## How to Use This Document

1. 每完成或验收一个 Epic，在 **§2 总览表** 更新状态，并在对应 **§3.x** 追加验证记录。
2. 验证结果只写实测事实：命令、环境、pass/fail、失败原因；不写未跑过的项为通过。
3. 共享环境阻塞（如 DB 不可达）记在 **§1 验证环境**，各 Epic 引用即可。
4. 重大复验在 **§4 Revision History** 追加一行。

**状态图例**：`✅ 已验证` · `⚠️ 部分验证` · `⏸ 未验证` · `❌ 验证失败` · `— 未开始`

---

## 1. Shared Verification Environment

| 项 | 记录 |
|----|------|
| 最近验证日期 | 2026-06-17（Supabase DB 落地复验） |
| OS | macOS |
| Python | 3.10.0（pyenv） |
| Node | 见 `frontend/package.json` engines |
| 数据库 | `backend/.env` → Supabase 直连 `db.dpezgzzvbpemlgxdogue.supabase.co:5432/postgres` |
| DB 连通性 | ✅ 可达；`python -m alembic current -v` 显示 `006_trust_merkle_columns (head)` |
| Schema 验证 | ✅ `python scripts/verify_db.py`：31 张表 + 8 个关键索引全部 `ok` |
| 影响范围 | 依赖 PostgreSQL 的 schema 验证已解除阻塞；业务级集成/E2E 仍需按各 Epic 手测或自动化复跑 |

**DB 可达时通用验收命令：**

```bash
cd backend
alembic upgrade head
alembic current
python scripts/verify_db.py
```

---

## 2. Epic Overview

| Epic | 名称 | TODO 状态 | 验证状态 | 最近验证 | 详见 |
|------|------|-----------|----------|----------|------|
| 0 | v3.1 Foundation Alignment | 部分完成 | ✅ 已验证 | 2026-06-17 | [§3.0](#30-epic-0--v31-foundation-alignment) |
| 1 | Mint Panda Identity | TODO 全勾 | ⚠️ 部分验证 | 2026-06-17 | [§3.1](#31-epic-1--mint-panda-identity) |
| 2 | Agent Wallet Setup | TODO 全勾 | ⚠️ 部分验证 | 2026-06-17 | [§3.2](#32-epic-2--agent-wallet-setup) |
| 3 | Real Market Monitor And Pair Ranking | TODO `[x]` | ⚠️ 部分验证 | 2026-06-17 | [§3.3](#33-epic-3--real-market-monitor-and-pair-ranking) |
| 4 | Strategy Builder Inside Policy | 见 TODO（§4 全勾） | ⚠️ 部分验证 | 2026-06-17 | [§3.4](#34-epic-4--strategy-builder-inside-policy) |
| 5 | Training Ledger Hot Path | TODO 全勾选 | ⚠️ 部分验证 | 2026-06-17 | [§3.5](#35-epic-5--training-ledger-hot-path) |
| 6 | Chain Proof Mode 2 | 见 TODO（§6 已勾选） | ⚠️ 部分验证 | 2026-06-17 | [§3.6](#36-epic-6--chain-proof-mode-2) |
| 7 | Review And Skill Memory | 见 TODO | ⚠️ 部分验证 | 2026-06-17 | [§3.7](#37-epic-7--review-and-skill-memory) |
| 8 | Safety And Owner Controls | 见 TODO（§8 全勾） | ⚠️ 部分验证 | 2026-06-17 | [§3.8](#38-epic-8--safety-and-owner-controls) |
| 9 | Trust, Merkle, Walrus | 全部勾选 | ⚠️ 部分验证 | 2026-06-17 | [§3.9](#39-epic-9--trust-merkle-walrus) |
| 10 | Frontend Product Integration | 见 TODO（§10 全勾） | ⚠️ 部分验证 | 2026-06-17 | [§3.10](#310-epic-10--frontend-product-integration) |
| 11 | MVP Acceptance And Demo Path | 见 TODO | — 未开始 | — | [§3.11](#311-epic-11--mvp-acceptance-and-demo-path) |

---

## 3. Per-Epic Verification

### 3.0 Epic 0 — v3.1 Foundation Alignment

**范围**：数据模型、契约、配置、迁移脚本；不含业务热路径与 v3.1 API 路由实现。

#### Deliverables

| 类别 | 内容 |
|------|------|
| ORM | 13 张 v3.1 表 + `pandas` 钱包指针列 |
| Migration | Alembic `004_v31_agent_wallet` |
| Backend 契约 | `backend/app/schemas/autonomous_wallet.py` |
| 错误码 | 24 个 `VAULT_*` / `POLICY_*` / `LEDGER_*` / `TRADE_FACT_*` / `CHAIN_PROOF_*` / `AGENT_SIGNER_*` |
| 配置 | `config.py` + `backend/.env.example` |
| Frontend 契约 | `frontend/src/types/autonomous-wallet.ts` |
| 校验脚本 | `backend/scripts/verify_db.py` 扩展 v3.1 表与索引 |
| 兼容说明 | `Simulation` ORM 注释、`panda_simulation.py` legacy 说明 |

#### Files Touched

**新建**：`autonomous_wallet.py` · `004_v31_agent_wallet_tables.py` · `test_migration_004.py` · `autonomous-wallet.ts`

**修改**：`models.py` · `config.py` · `errors.py` · `schemas/__init__.py` · `.env.example` · `verify_db.py` · `panda_simulation.py` · `types/index.ts` · `TODO.md` · `DEV_CONTEXT.md` · `.gitignore`

#### TODO Checklist Snapshot

| 项 | 状态 |
|----|------|
| 全库术语审计 | ✅ |
| 产品文案重命名 | ✅ |
| Legacy API 兼容包装 | ✅ |
| `simulation/*` 弃用注释 | ✅ |
| `.env.example` v3.1 变量 | ✅ |
| `api-specification.md` v3.1 端点 | ✅ |
| `spec.md` 同步 | ✅ |
| 前后端契约 | ✅ |
| 共享错误码 | ✅ |
| 保留 legacy 表 | ✅ |
| v3.1 表 ORM + migration | ✅ |
| 热路径接入 `order_intents` 等 | ✅（Epic 5 · `TradeFactWriter.commit_tick`） |
| `trades` backfill 决策 | ✅ legacy views only |
| `verify_db.py` 扩展 | ✅（脚本已写） |

#### Terminology Audit (2026-06-17)

| 范围 | 结论 | 处理 |
|------|------|------|
| MVP 七页（mint/agent-wallet/strategy/training-ledger/chain-proof/review/safety） | ✅ 已用 v3.1 术语 | 无需改 |
| Legacy 页（landing/dashboard/trading/onboarding） | ⚠️ 含「模拟盘」等 | 已重命名为 Training Ledger / 训练账本 |
| 内部标识（`simulation_id`、`useSimulationSession`、API `/simulation/*`） | ✅ 保留 | 兼容包装，见 `panda_simulation.py` 注释 |
| 后端用户文案 | ⚠️ 1 处 | `strategy_feed` 错误信息已改 |
| Move 合约 | ✅ | 无用户可见文案 |
| 历史文档（whitepaper、frontend-design 等） | ⏸ | 非 Epic 0 阻塞；PRD v3.1 已对齐 |

**审计命令（可复现）：**

```bash
rg -n '模拟盘|paper trade = chain|DeepBook testnet 两池' frontend/src backend/app contracts/sources
rg -n 'Training Ledger|Agent Wallet|Chain Proof|Trade Fact' frontend/src/app/mint frontend/src/app/agent-wallet frontend/src/app/training-ledger
rg -n 'commit_tick|order_intents|trade_facts' backend/app/engine/panda_actor.py backend/app/services/trade_fact_writer.py
```

#### Verification Runs (2026-06-17, Epic 0 补全)

| # | 命令 / 检查 | 结果 | 详情 |
|---|-------------|------|------|
| A | `pytest tests/test_migration_004.py tests/test_migration_003.py -q` | ✅ PASS | 9 passed |
| B | `cd frontend && npm run type-check` | ✅ PASS | 零 TS 错误 |
| C | 静态抽查（错误码 / config / 类型导出） | ✅ PASS | 均存在 |
| D | `python -m alembic current -v` | ✅ PASS | Supabase `006_trust_merkle_columns (head)` |
| E | `python scripts/verify_db.py` | ✅ PASS | 31 张表 + 8 个关键索引全部 `ok` |
| F | 术语审计 `rg`（见上表） | ✅ PASS | MVP 七页 v3.1 术语；legacy 页已重命名；无「paper trade = chain trade」用户文案 |
| G | 静态：`api-specification.md` v3.1 端点表 | ✅ PASS | 22 条 v3.1 REST + 错误码/WS 说明 |
| H | 静态：`spec.md` §8 REST 映射 | ✅ PASS | 与 `router.py` 挂载路径一致 |
| I | 静态：热路径 `PandaActor` → `TradeFactWriter` | ✅ PASS | `commit_tick` 写 `order_intents` / `ledger_entries` / `trade_facts` |

#### Database Landing Root Cause (2026-06-17)

| 发现 | 证据 |
|------|------|
| Supabase 网络和登录实际可用 | DNS/TCP 探针通过；只读 SQL `current_database/current_user/version` 通过 |
| 落地失败根因 | Supabase 当前 `alembic_version` 停在 `002_panda_subscribed_pools`，public 只有 7 张表 |
| 修复动作 | 执行 `python -m alembic upgrade head`，迁移 `003` → `004` → `005` → `006` |
| 验收结果 | `alembic current -v` = `006_trust_merkle_columns (head)`；`verify_db.py` 全绿 |

#### Verdict

| 层级 | 结论 |
|------|------|
| 代码 / 契约 / 迁移脚本 | ✅ 通过 |
| 术语 / API spec / spec 同步 | ✅ 通过（2026-06-17 补全） |
| 数据库落地 | ✅ 已落地 Supabase `dpezgzzvbpemlgxdogue` |
| Epic 0 完整闭环 | ✅ Schema / 契约 / 文档闭环已验证；业务级 E2E 另见后续 Epic |

---

### 3.1 Epic 1 — Mint Panda Identity

> **验证状态**：⚠️ 部分验证（2026-06-17）  
> **Done standard**（摘自 TODO）：用户可铸造 Panda NFT，看到 Panda 揭晓，并继续 Agent Wallet setup；mint 不授予交易权限。

#### Deliverables

| 类别 | 内容 |
|------|------|
| 前端 `/mint` | `MintHeroCopy` · `PandaCarouselStage` · `PandaStageHalo` · `GasFeeHint` · `WalletSignatureModal` · `MintDetailsDrawer` · `useMintPanda` |
| 路由 | 成功 CTA → `/agent-wallet?panda={id}&step=no-vault`（`agentWalletSetupPath`） |
| 问卷绕过 | `OnboardingGuard` 将 `/mint` 加入 `SKIP_PREFIXES` |
| 重试同步 | `pendingMint.ts` sessionStorage + `retryRegistration()` |
| 后端 | `POST /panda/mint` 幂等（同 owner 200）· `active_vault_id/active_policy_id` 显式 null |
| Move | `mint::mint` 仅创建 `Panda` 身份 + DF 初始化；`Panda` struct 无 vault/policy 字段 |
| 测试 | `mint_tests`（3）· `test_mint_event_parser`（4）· `test_mint_registration`（3）· `mint.smoke.test.ts`（5）· `routeJump.test.ts`（4） |

#### Files Touched (Epic 1 scope)

**新建**：`frontend/src/components/mint/*` · `frontend/src/components/ui/Drawer.tsx` · `frontend/src/lib/mint/*` · `frontend/src/app/agent-wallet/*` · `backend/app/services/mint_registration.py` · `backend/tests/test_mint_registration.py` · `frontend/vitest.config.ts`

**修改**：`frontend/src/app/mint/page.tsx` · `frontend/src/hooks/useMintPanda.ts` · `frontend/src/components/auth/OnboardingGuard.tsx` · `backend/app/api/panda_mint.py` · `contracts/tests/mint_tests.move` · `dev-docs/TODO.md` · `dev-docs/DEV_CONTEXT.md`

#### TODO Checklist vs Verification

| # | TODO 项 | 自动验证 | 结果 | 说明 |
|---|---------|----------|------|------|
| 1.1a | `/mint` 匹配 `page-mint.md` 布局与文案 | 静态抽查 | ✅ | 标题 `Mint your autonomous Panda`、轮播舞台、单主 CTA、Gas/安全提示均存在；暗色舞台 `bg-[#0d1421]` + `PandaStageHalo` |
| 1.1b | 默认路径无问卷摩擦 | 静态抽查 | ✅ | `OnboardingGuard` 跳过 `/mint`；`/mint` 页无 onboarding 跳转 |
| 1.1c | `WalletSignatureModal` | 静态抽查 | ✅ | `mint/page.tsx` 引入并在 `Mint Panda NFT` 后打开 |
| 1.1d | toast 提交/成功/失败 | 静态抽查 | ✅ | `productToast`：`toastSubmitted` / `toastSuccess` / `toastFailedSafely` |
| 1.1e | tx/object id 藏在 drawer | 静态抽查 | ✅ | 默认页不展示 digest；`View mint details` → `MintDetailsDrawer` |
| 1.1f | 成功 CTA → Agent Wallet | 单元测试 | ✅ | `agentWalletSetupPath` vitest 通过 |
| 1.2a | Testnet Package ID 与部署一致 | RPC + 文档交叉 | ✅ | 见下方 Run #F、#G |
| 1.2b | mint 仅身份 + 不可变性格 | Move 测试 + 静态 | ⚠️ | struct 无性格 setter；`test_minted_panda_identity_only_no_trading_permission` 通过；**无** `expected_failure` 突变性格测试 |
| 1.2c | DB 注册无 vault/policy | 静态抽查 | ✅ | `panda_mint.py` 显式 `active_vault_id=None, active_policy_id=None` |
| 1.2d | tx digest 重试同步 | 单元测试 | ✅ | `pendingMint` + `retryRegistration` 逻辑有 vitest；**无** HTTP 集成测 |
| 1.3a | Move：mint / 性格 / 无 wallet | `sui move test` | ⚠️ | 3/3 `mint_tests` 通过；性格不可变靠结构约束，非独立 abort 测试 |
| 1.3b | Backend：parser + 幂等 | `pytest` | ⚠️ | parser 4/4 + `decide_existing_mint` 3/3；**无** `register_mint` 路由级集成测 |
| 1.3c | Frontend smoke | `vitest` | ⚠️ | 9/9 通过（含 wallet reject 解析、route jump、pending）；**无** Playwright/浏览器 E2E |

#### Design Gaps (非阻塞，如实记录)

| 设计组件 | 实现情况 |
|----------|----------|
| `MintPrimaryAction` | 未独立组件；CTA 逻辑内联于 `mint/page.tsx` |
| `MintTxOverlay` | 未独立组件；`PandaStageHalo dimmed` + pending 按钮文案代替 |
| Mobile sticky CTA | 未实现 `position: sticky`；仅居中布局 |
| Toast 默认展示 object id | 设计 §6 写 success toast 可含 object id；当前 toast 仅文案，id 在 drawer |

#### Verification Runs (2026-06-17)

| # | 命令 / 检查 | 结果 | 详情 |
|---|-------------|------|------|
| A | `cd contracts && sui move test mint_tests` | ✅ PASS | 3 passed：`test_mint_panda_random_personality_and_dynamic_fields` · `test_mint_rejects_when_supply_exhausted` · `test_minted_panda_identity_only_no_trading_permission` |
| B | `cd backend && python -m pytest tests/test_mint_event_parser.py tests/test_mint_registration.py tests/test_panda_schemas.py -v` | ✅ PASS | 11 passed |
| C | `cd frontend && pnpm test` | ✅ PASS | 9 passed（`mint.smoke.test.ts` 5 + `routeJump.test.ts` 4） |
| D | `cd frontend && pnpm exec tsc --noEmit` | ✅ PASS | 零 TS 错误 |
| E | 静态：mint 组件文件存在 | ✅ PASS | `components/mint/` 6 文件 + `Drawer.tsx` + `lib/mint/` |
| F | Testnet RPC：`sui_getObject` Package | ✅ PASS | `0x5950…1465` → `type: package` |
| G | Testnet RPC：`sui_getObject` PandaRegistry | ✅ PASS | `0x5cbf…baa5` → `…::panda_registry::PandaRegistry`，包 ID 与 F 一致 |
| H | 文档交叉：Package / Registry ID | ✅ PASS | `DEV_CONTEXT.md` §3 · `contracts/DEPLOY.md` · `frontend/.env.example` · `backend/.env.example` 一致 |
| I | `POST /panda/mint` 幂等 HTTP 集成 | ⏸ 未跑 | 依赖 PostgreSQL（§1 DB 不可达） |
| J | 浏览器手测：Connect → Sign → Mint → Reveal → Agent Wallet | ⏸ 未跑 | 需本地四服务 + 钱包 + Testnet SUI；本验证会话未执行 |
| K | 链上实铸 + DB 行校验 | ⏸ 未跑 | 需 J 完成后查 `pandas` 表 `active_vault_id`/`active_policy_id` 为 NULL |

#### How to Verify (复现方法)

**1. 自动化（无需 DB / 钱包）**

```bash
# Move mint 模块
cd contracts && sui move test mint_tests

# Backend 解析器 + 幂等决策 + schema
cd backend && python -m pytest tests/test_mint_event_parser.py tests/test_mint_registration.py tests/test_panda_schemas.py -v

# Frontend 逻辑 smoke
cd frontend && pnpm test

# TypeScript 类型
cd frontend && pnpm exec tsc --noEmit
```

**2. 链上 ID 交叉（无需钱包）**

```bash
# Package 应为 type=package
curl -s -X POST https://fullnode.testnet.sui.io:443 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"sui_getObject","params":["0x595087bb3e5f6c5011585797e4eb4db513b55d39ce84f984bb357e9375c11465",{"showType":true}]}'

# Registry 类型应含 panda_registry::PandaRegistry
curl -s -X POST https://fullnode.testnet.sui.io:443 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"sui_getObject","params":["0x5cbf822c3fe346d7001125ff0ad52d675611148b2c4734d1e200ebf23d53baa5",{"showType":true}]}'
```

**3. 静态 UI 契约（代码审查）**

```bash
# 核心组件 wired
rg -l 'WalletSignatureModal|MintDetailsDrawer|PandaCarouselStage' frontend/src/app/mint

# 问卷不拦 mint
rg 'SKIP_PREFIXES' frontend/src/components/auth/OnboardingGuard.tsx

# DB 注册不写 vault/policy
rg 'active_vault_id|active_policy_id' backend/app/api/panda_mint.py
```

**4. 手测清单（Epic 1 完整闭环，需环境）**

前置：`frontend` + `backend` 运行；`frontend/.env.local` 配置 `NEXT_PUBLIC_PACKAGE_ID` / `NEXT_PUBLIC_REGISTRY_ID`；钱包有 Testnet SUI。

| 步骤 | 操作 | 预期 |
|------|------|------|
| 1 | 未连钱包打开 `/mint` | 轮播舞台 + `Connect Wallet` + muted Gas 提示 |
| 2 | 连接钱包并登录 | CTA 变为 `Mint Panda NFT` |
| 3 | 点击 Mint → 弹 `WalletSignatureModal` → Confirm | 钱包签名弹窗；toast「Mint submitted」 |
| 4 | 签名确认 | 舞台变暗；pending 文案；链上成功后 Panda 定格揭晓 |
| 5 | 成功态 | toast 成功；主 CTA `Create Agent Wallet`；无 digest 默认展示 |
| 6 | 点击 `View mint details` | drawer 显示 tx digest · object id · package id |
| 7 | 点击 `Create Agent Wallet` | 跳转 `/agent-wallet?panda=…&step=no-vault` |
| 8 | 钱包拒绝签名 | 回到可 mint 态；无失败 toast（rejected 静默） |
| 9 | 链上成功但断网注册 | 显示 `Retry backend sync`；点后补注册成功 |

**5. DB 验收（DB 可达时）**

```bash
cd backend && alembic upgrade head
# 完成一次 mint 注册后：
psql "$DATABASE_URL" -c "SELECT id, sui_object_id, active_vault_id, active_policy_id FROM pandas ORDER BY created_at DESC LIMIT 1;"
# 期望：active_vault_id / active_policy_id 均为 NULL

# 幂等：同一 sui_object_id 再次 POST /panda/mint → HTTP 200（非 409）
```

#### Verdict

| 层级 | 结论 |
|------|------|
| 合约单元测试 | ✅ 通过（3/3 mint_tests） |
| 后端单元测试 | ✅ 通过（11/11）；缺路由级集成 |
| 前端单元/smoke | ✅ 通过（9/9）；缺浏览器 E2E |
| 链上 Package/Registry | ✅ RPC 实测存在且 ID 一致 |
| 手测 / DB 落地 / 实铸 E2E | ⏸ 本环境未执行（DB 不可达 + 无钱包手测） |
| **Epic 1 整体** | **⚠️ 部分验证** — 代码与自动化测试达标；完整用户旅程与 DB 幂等 HTTP 待 DB 可达 + 手测复验后升为 ✅ |

---

### 3.2 Epic 2 — Agent Wallet Setup

> **验证状态**：⚠️ 部分验证（2026-06-17）  
> **Done standard**：用户用 owner 签名创建 shared `PandaVault` + standalone `TradingPolicy`；backend mirror；无 active vault/policy 不可训练。

#### Deliverables

| 类别 | 内容 |
|------|------|
| Move | `trading_policy.move` · `panda_vault.move` · `panda_coin.move` · `agent_wallet.move` · `demo_executor.move` |
| Move 测试 | `contracts/tests/agent_wallet_tests.move`（12 项 Epic 2 相关） |
| DB | `panda_vaults` · `trading_policies` · `panda_accounts` · `panda_positions`（Alembic `004_v31_agent_wallet`） |
| Backend | `app/services/agent_wallet.py` · `agent_wallet_event_parser.py` · `app/api/panda_agent_wallet.py` |
| 训练门禁 | `require_active_wallet()` → `POST /panda/{id}/simulation/start` |
| Frontend | `/agent-wallet` · `AgentWalletPage` · `PandaPermissionCard` · `PolicyCollarEditor` · `AuthorizedAgentReview` · `WalletSignatureModal` · `AgentWalletDetailsDrawer` |

#### TODO Checklist Snapshot

| 小节 | TODO 项 | 代码存在 | 自动验证 | 备注 |
|------|---------|----------|----------|------|
| 2.1 Move Contracts | 7/7 | ✅ | ✅ Move test | 事件 `TradingPolicyCreated/Updated/Paused` · `AgentRevoked` · `PandaVaultCreated` 均在源码 |
| 2.2 Contract Tests | 6/6 | ✅ | ✅ 12/12 PASS | 含 pause/revoke/stale version/mismatch/demo_executor |
| 2.3 Database Mirror | 6/6 | ✅ | ⏸ DB 不可达 | ORM + migration 已写；`verify_db.py` 本环境 Timeout |
| 2.4 Backend APIs | 5/5 | ✅ | ⚠️ 仅服务层单测 | 4 条 REST 路由已实现；**无** HTTP 集成测试 |
| 2.5 Frontend | 8/8 | ✅ | ⚠️ type-check ✅ · build ❌ | `/agent-wallet` prerender 失败（见下） |

#### Verification Runs (2026-06-17)

| # | 命令 / 检查 | 结果 | 详情 |
|---|-------------|------|------|
| A | `cd contracts && sui move test` | ✅ PASS | **27/27**；其中 `agent_wallet_tests` **12/12** |
| B | `cd backend && pytest tests/test_agent_wallet.py tests/test_migration_004.py tests/test_safety.py tests/test_agent_signer.py -q` | ✅ PASS | **19 passed**（policy 校验 5 · migration 静态 5 · owner-action 解析 2 · PolicyGate 3 · agent_signer 3） |
| C | `cd frontend && npm run type-check` | ✅ PASS | 零 TS 错误；agent-wallet 组件/服务/hook 类型通过 |
| D | `cd frontend && npm run build` | ❌ FAIL | `/agent-wallet` prerender error：`useSearchParams()` 需 Suspense 边界（Next.js 14） |
| E | `python scripts/verify_db.py` | ❌ FAIL | `asyncio.TimeoutError`（Supabase 直连不可达，见 §1） |
| F | 静态：API 路由注册 | ✅ PASS | `router.py` → `panda_agent_wallet` 挂载于 `/panda` |
| G | 静态：训练门禁接线 | ✅ PASS | `panda_simulation.py:start_simulation` 调用 `require_active_wallet` |
| H | HTTP/E2E：链上 PTB → sync → 前端 | ⏸ 未跑 | 需 testnet 钱包 + 运行 backend + 浏览器手测 |

#### Epic 2 合约测试明细（`agent_wallet_tests.move`）

```bash
cd contracts && sui move test
# 期望 agent_wallet_tests 全部 PASS：
# test_owner_creates_vault_and_policy
# test_non_owner_cannot_update_policy / test_non_owner_cannot_loosen_policy
# test_agent_cannot_update_policy
# test_paused_policy_blocks_demo_executor / test_revoked_agent_blocks_demo_executor
# test_stale_policy_version_aborts / test_mismatched_vault_policy_aborts
# test_legal_demo_trade_succeeds / test_unauthorized_agent_aborts
# test_pair_not_allowed_aborts / test_notional_exceeded_aborts
```

#### Epic 2 Backend 验证方法

**服务层（已跑通）：**

```bash
cd backend
python -m pytest tests/test_agent_wallet.py tests/test_migration_004.py tests/test_safety.py -q
```

**迁移脚本静态（不连 DB）：**

```bash
python -m pytest tests/test_migration_004.py -q
# 断言 004 含 panda_vaults / trading_policies / panda_accounts / panda_positions
```

**API 手测（需 backend + JWT + 已 mint 的 panda）：**

```bash
# 1. 读 setup 状态
curl -sS -H "Authorization: Bearer $JWT" \
  "$BACKEND/panda/$PANDA_ID/agent-wallet" | jq .

# 2. 校验 draft policy
curl -sS -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"allowed_pairs":["DEEP/SUI"],"max_notional_per_trade":50,"max_daily_loss":8,"max_open_positions":1}' \
  "$BACKEND/panda/$PANDA_ID/agent-wallet/validate-policy" | jq .

# 3. 链上 setup 后 mirror sync（替换 TX_DIGEST）
curl -sS -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"sui_tx_digest":"'$TX_DIGEST'","draft":{...}}' \
  "$BACKEND/panda/$PANDA_ID/agent-wallet/sync" | jq .

# 4. 训练门禁：无 vault 时应 4xx
curl -sS -X POST -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"speed":"1x","subscribed_pools":["DEEP/SUI"]}' \
  "$BACKEND/panda/$PANDA_ID/simulation/start" | jq .
# 期望：VAULT_NOT_FOUND 或 VAULT_SYNC_PENDING（视 mirror 状态）
```

#### Epic 2 Frontend 验证方法

**类型（已跑通）：**

```bash
cd frontend && npm run type-check
```

**生产构建（当前失败，需修复后复验）：**

```bash
cd frontend && npm run build
# 失败点：src/app/agent-wallet/page.tsx 使用 useSearchParams 但未包 Suspense
```

**浏览器手测清单：**

1. 登录 → 打开 `/agent-wallet?panda={id}`
2. `PolicyCollarEditor` 选 launch pairs → `Review Agent Signer` modal
3. `WalletSignatureModal` 签名 testnet PTB（`setupAgentWallet`）
4. sync 成功 → toast + `mirror_sync_status=synced` + CTA「Feed strategy」→ `/strategy`
5. `View objects` drawer 展示 vault/policy object id（L2 披露）
6. 链成功但 sync 失败 → 「Retry mirror sync」

#### Expected Pass (DB reachable)

```bash
cd backend
alembic upgrade head   # 至少 004_v31_agent_wallet
python scripts/verify_db.py
# 期望：panda_vaults / trading_policies / panda_accounts / panda_positions = ok
```

#### Known Gaps（如实记录）

| 缺口 | 影响 |
|------|------|
| 无 `test_agent_wallet_api.py` HTTP 集成测试 | API 契约仅靠静态 + 手测 |
| 无 `simulation/start` 门禁 pytest | `require_active_wallet` 未自动化 |
| DB 本环境不可达 | migration 落地与 mirror 读写未实测 |
| 无 testnet E2E（PTB → sync → train） | Done standard 全链路未闭环验证 |
| `npm run build` `/agent-wallet` 失败 | Vercel 生产部署该页可能失败 |

#### Verdict

| 层级 | 结论 |
|------|------|
| Move 合约 + 单元测试 | ✅ 通过 |
| Backend 服务逻辑 + migration 脚本 | ✅ 通过（静态/单测） |
| Backend API + DB 落地 | ⏸ / ⚠️ 未完整验证 |
| Frontend 实现 | ⚠️ 代码齐全；build 未通过 |
| Epic 2 完整闭环（链上 + mirror + 训练门禁 E2E） | ⚠️ 部分完成 |

---

### 3.3 Epic 3 — Real Market Monitor And Pair Ranking

> **验证状态**：⚠️ 部分验证（2026-06-17）  
> **Done standard**（摘自 TODO）：market-monitor 为所选 liquid pairs 发布健康的 DeepBook mainnet ticks；frontend 与 PandaActor 消费同一 market truth。

#### Deliverables

| 类别 | 内容 |
|------|------|
| Pair registry | `market-monitor/feed/pair_registry.py` — launch pairs、testnet fallback、`PairMeta`（含 decimals/min_tick_size） |
| Pair ranking | `market-monitor/pipeline/pair_ranking.py` — volume/spread/depth/freshness/health 打分 |
| Tick schema | `market-monitor/broadcast/schemas.py` — 扩展 `MarketEvent` + `PairMetaPayload` |
| Monitor service | `market-monitor/monitor.py` — 排名、health、Redis publish |
| REST | `GET /health` · `GET /pairs` · `GET /candles?pool=` |
| Config | `DEEPBOOK_NETWORK` · `LAUNCH_PAIRS` · `USE_PAIR_RANKING` · `STALE_THRESHOLD_SEC` |
| Backend gate | `backend/app/engine/market_event.py` — `is_tradeable()` |
| Stale → HOLD | `backend/app/engine/panda_actor.py` — `_apply_stale_hold()` |
| Consumer | `backend/app/engine/market_consumer.py` — `PSUBSCRIBE market:tick:*`（无 DeepBook 直连） |
| Hub | `websocket/src/channels.ts` · `user-hub.ts` — 订阅/转发 `market:tick:*` |

#### Files Touched (Epic 3 scope)

**新建**：`pair_registry.py` · `pair_ranking.py` · `test_pair_ranking.py` · `test_pair_ranking_integration.py` · `test_market_event_schema.py` · `test_orderbook_summary.py` · `test_health_payload.py` · `test_pairs_endpoint.py` · `backend/tests/test_market_event.py`

**修改**：`monitor.py` · `main.py` · `config.py` · `schemas.py` · `deepbook_client.py` · `fills_client.py` · `orderbook.py` · `.env.example` · `market_event.py` · `panda_actor.py` · `TODO.md` · `DEV_CONTEXT.md`

#### TODO Checklist Snapshot

| 项 | 代码/TODO | 本次验证 |
|----|-----------|----------|
| 3.1 流动性优先 registry | ✅ | ✅ 单元测试 + `/pairs` launch_pairs |
| 3.1 多信号排名 | ✅ | ✅ 单元 + 集成样本测试 |
| 3.1 元数据暴露 | ✅ | ✅ `/pairs` 含 pool_id/decimals；live 见 §Live |
| 3.1 testnet fallback | ✅ | ✅ `is_fallback=true` on DEEP/SUI |
| 3.2 MarketEvent schema | ✅ | ✅ 静态字段对齐 + schema 测试 |
| 3.2 OHLCV/spread/depth/freshness | ✅ | ✅ Redis tick 实测含字段 |
| 3.2 `/candles` 历史 K 线 | ✅ | ✅ live `DEEP/SUI` 返回真实 bars |
| 3.2 health 状态机 | ✅ | ✅ 单元测试 + live `health=stale` |
| 3.2 stale → Panda HOLD | ✅ | ⚠️ 仅 `is_tradeable()` 单测；无 PandaActor 集成测 |
| 3.3 Hub 订阅/转发 | ✅ | ⚠️ vitest 频道逻辑 ✅；无 live WS 冒烟 |
| 3.3 MarketDataConsumer | ✅ | ✅ 静态：无 DeepBook import |
| 3.3 Redis 仅事件总线 | ✅ | ✅ 架构/代码审查 |
| 3.4 测试与 DEV_CONTEXT | ✅ | ✅ pytest 全绿；DEV_CONTEXT 已更新 |

#### Verification Methods（验证方法说明）

| 方法 | 适用项 | 命令 / 操作 |
|------|--------|-------------|
| **A. 单元/集成 pytest** | 排名算法、schema、health payload、stale gate | 见下方 Verification Runs #A–#C |
| **B. 静态代码审查** | 模块存在、路由、schema 字段对齐、Consumer 不直连 DeepBook | `grep` / 内联 Python 脚本（见 #D） |
| **C. Hub 频道逻辑测试** | `market:tick:{pair}` 订阅与转发规则 | `cd websocket && npm test -- --run` |
| **D. Live monitor 冒烟** | `/health` · `/pairs` · `/candles` · Redis publish | 启动 monitor + `curl` + Redis `PSUBSCRIBE`（见 #E–#H） |
| **E. 主网 launch pairs 联调** | 真实 mainnet 流动性排名与 fresh ticks | 须 VPS mainnet Indexer + 清空 `DEEPBOOK_POOLS`；**本次未跑** |
| **F. 端到端** | 浏览器 K 线 + PandaActor 决策同源 | `monitor→Redis→Hub→frontend` + `simulation/start`；**本次未跑** |

**推荐复验命令（复制即用）：**

```bash
# 1) Epic 3 专项 pytest
cd market-monitor
python -m pytest tests/test_pair_ranking.py tests/test_pair_ranking_integration.py \
  tests/test_market_event_schema.py tests/test_orderbook_summary.py \
  tests/test_health_payload.py tests/test_pairs_endpoint.py -q

cd ../backend
python -m pytest tests/test_market_event.py -q

# 2) 全量 monitor + Hub
cd ../market-monitor && python -m pytest -q
cd ../websocket && npm test -- --run

# 3) Live 冒烟（需 market-monitor/.env 配 Redis + DeepBook PG/Server）
cd market-monitor
python -m uvicorn main:app --host 127.0.0.1 --port 8001
# 另一终端：
curl -s http://127.0.0.1:8001/health | python3 -m json.tool
curl -s http://127.0.0.1:8001/pairs | python3 -m json.tool
curl -s "http://127.0.0.1:8001/candles?pool=DEEP/SUI&limit=5" | python3 -m json.tool

# 4) Redis tick（替换为 REDIS_URL）
redis-cli -u "$REDIS_URL" PSUBSCRIBE 'market:tick:*'
# 或 Python asyncio pubsub，等待 ≥35s（stale tick 节流约 2×POLL_INTERVAL_SEC）
```

#### Verification Runs (2026-06-17)

| # | 命令 / 检查 | 结果 | 详情 |
|---|-------------|------|------|
| A | `cd market-monitor && python -m pytest tests/test_pair_ranking.py … test_pairs_endpoint.py -q` | ✅ PASS | **27 passed**（Epic 3 专项） |
| B | `cd market-monitor && python -m pytest -q` | ✅ PASS | **51 passed**（monitor 全量） |
| C | `cd backend && python -m pytest tests/test_market_event.py -q` | ✅ PASS | **7 passed**（`is_tradeable` 矩阵） |
| C2 | `cd backend && python -m pytest tests/test_training_hot_path.py::test_market_stale_is_not_tradeable -q` | ✅ PASS | stale 与 Epic 3 gate 一致 |
| D | 静态：schema 字段 / 路由 / 模块存在 | ✅ PASS | monitor+backend 均含 `reference_price/spread_bps/health/pair_meta` 等；`/health` `/pairs` `/candles` 存在；`market_consumer.py` 无 DeepBook 引用 |
| E | Hub vitest `npm test -- --run` | ✅ PASS | **17 passed**；含 `market:tick:DEEP/SUI` 订阅与转发过滤 |
| F | Live：`uvicorn main:app :8001` → `GET /health` | ✅ PASS | `status=ok` · `pg_ok=true` · `deepbook_reachable=true` · `redis_connected=true` · 池 `DEEP/SUI`/`SUI/DBUSDC` 有 `last_publish_ts` |
| G | Live：`GET /candles?pool=DEEP/SUI&limit=3` | ✅ PASS | 返回真实 OHLCV（VPS testnet Indexer PG） |
| H | Live：Redis `PSUBSCRIBE market:tick:*`（35s） | ✅ PASS | 收到 **2** 条；频道 `market:tick:DEEP/SUI`；payload 含 `candle`/`health`/`stale`/`reference_price`/`pair_meta` |
| I | Live：`GET /pairs`（poll 后） | ✅ PASS | `ranked_pairs` 2 条；`is_fallback=true`；含 `pool_id`/decimals/volume/spread |
| J | Mainnet launch pairs 自动排名 + fresh ticks | ⏸ 未验证 | 本地 `.env` 显式 `DEEPBOOK_POOLS=DEEP/SUI,SUI/DBUSDC`（testnet VPS）；`network=mainnet` 与 `sui_rpc_url=testnet` 配置不一致；未接 mainnet Indexer |
| K | PandaActor 运行时 stale→HOLD 集成 | ⏸ 未验证 | 仅有 `is_tradeable()` 单测；无 actor tick 集成测 |
| L | WebSocket Hub live 转发 `market.tick` | ⏸ 未验证 | vitest 覆盖频道逻辑；未启 wrangler + 浏览器 WS |
| M | Frontend 与 PandaActor 同源 market truth | ⏸ 未验证 | 需 Hub + frontend `useMarketWs` 手测 |

#### Live Environment Notes (2026-06-17)

| 观察 | 说明 |
|------|------|
| 数据源 | VPS `152.53.166.128:9008` + PG — **testnet** 稀疏池，非 PRD 目标 mainnet launch pairs |
| Tick 健康 | 两池 `health=stale` · `stale=true`（符合 testnet 成交稀疏；health 状态机工作正常） |
| 配置口径 | `DEEPBOOK_NETWORK` 默认 `mainnet`，但 `.env` 仍指定 testnet 池 — 产品「训练真相=mainnet」须切换 Indexer 后复验 #J |
| `min_tick_size` | live `/pairs` 显示 `1000.0`（疑为 `/get_pools` 原始 tick 未缩放）；fallback decimals 逻辑正常 |

#### Verdict

| 层级 | 结论 |
|------|------|
| 代码交付 / TODO `[x]` | ✅ 已实现 |
| 自动化测试（单元+集成+静态+Hub 逻辑） | ✅ 通过 |
| Live monitor + Redis publish（当前 testnet VPS） | ✅ 通过 |
| Mainnet liquid pairs 端到端 | ⏸ 未验证（环境仍为 testnet fallback 池） |
| Frontend + PandaActor 运行时同源 | ⏸ 未验证 |
| **Epic 3 整体验收** | **⚠️ 部分验证** — 代码与本地/ testnet 联调通过；**mainnet 训练真相**与 **浏览器 E2E** 待补验 |

---

### 3.4 Epic 4 — Strategy Builder Inside Policy

> **验证状态**：⚠️ 部分验证（2026-06-17）  
> **Done standard**（摘自 TODO）：用户可喂策略规则；backend 对照 active TradingPolicy 校验；已保存策略可指导决策但不得扩展权限。

#### Deliverables

| 类别 | 内容 |
|------|------|
| Policy 兼容服务 | `backend/app/services/policy_compatibility.py`（pair / notional / daily loss / paused） |
| Strategy feed 重构 | `strategy_feed.py` 加载 `trading_policies` mirror；validate/feed 返回 `policy_conflicts`、`version` |
| API | `POST/GET /panda/:id/strategy`、`POST …/validate` 接入 policy 校验；`STRATEGY_POLICY_CONFLICT` |
| 决策链读取 | `panda_loader` → `strategy_version` + `skill_memories`；`decision_pipeline` Step3 skill 修正 |
| Ghost | 换策写 `strategy_history`（`ghost_weight=0.40`）；GET 返回 `ghost_influence` |
| 前端页面 | `/strategy/[id]` + `PolicyCompatibilityPreview` / `StrategyVersionBar` / `StrategyTemplateRack` / `GhostInfluenceHint` |
| 测试 | `tests/test_strategy_policy.py`（8 项）+ 既有 `test_strategy_feed` / `test_strategy_ghost` |

#### Files Touched（Epic 4 相关）

**新建**

- `backend/app/services/policy_compatibility.py`
- `backend/tests/test_strategy_policy.py`
- `frontend/src/app/strategy/[id]/page.tsx`
- `frontend/src/components/strategy/PolicyCompatibilityPreview.tsx`
- `frontend/src/components/strategy/StrategyVersionBar.tsx`
- `frontend/src/components/strategy/GhostInfluenceHint.tsx`
- `frontend/src/components/strategy/StrategyTemplateRack.tsx`

**修改**

- `backend/app/schemas/strategy.py` · `errors.py` · `common.py`
- `backend/app/services/strategy_feed.py` · `api/panda_strategy.py`
- `backend/app/engine/panda_loader.py` · `decision_pipeline.py` · `panda_actor.py`
- `frontend/src/types/strategy.ts` · `services/strategy.service.ts` · `lib/strategyBuilder.ts`
- `frontend/src/components/trading/StrategyBuilder.tsx` · `StrategyTemplates.tsx`

#### TODO Checklist — 逐项验证

| # | 任务 | 代码存在 | 自动测试 | 结论 |
|---|------|----------|----------|------|
| **4.1** | | | | |
| 4.1.1 | parsed rule blocks 主路径 | ✅ `StrategyFeedRequest.parsed` + `RuleEngine` | ✅ `test_strategy_feed.py` | ✅ |
| 4.1.2 | `target_pairs` vs `allowed_pairs` | ✅ `policy_compatibility.check_policy_compatibility` | ✅ `test_unauthorized_pair_blocked` | ✅ |
| 4.1.3 | notional / daily loss 假设校验 | ✅ `position_sizing` + `max_drawdown_pct` | ✅ `test_notional_conflict_returns_field_error` | ✅ |
| 4.1.4 | 持久化 version + hash | ✅ hash 入库；version 为 **计数推导**（非独立 DB 列） | ⚠️ `test_next_strategy_version_increments`（mock DB） | ⚠️ |
| 4.1.5 | ghost 残影、不绕过 policy | ✅ `feed_strategy` 写 `strategy_history` | ⚠️ ghost 衰减单测绿；**无 save 后 DB 集成测** | ⚠️ |
| **4.2** | | | | |
| 4.2.1 | validate/feed 加载 policy mirror | ✅ `load_active_trading_policy` | ⏸ 需 PostgreSQL + `trading_policies` 行 | ⏸ |
| 4.2.2 | 返回兼容结果与可读冲突 | ✅ `StrategyValidateData.policy_*` | ✅ `test_validate_body_*` | ✅ |
| 4.2.3 | 未授权 pair 拒绝激活 | ✅ `feed_strategy` → `_raise_policy_conflicts` | ⚠️ 单测 `_raise_policy_conflicts`；**无 `feed_strategy` 异步集成测** | ⚠️ |
| 4.2.4 | DecisionPipeline 读 version + Skill Memory | ✅ loader + actor + pipeline | ⚠️ `test_decision_pipeline_reads_skill_memory`（单元）；**无 save→hydrate 链路测** | ⚠️ |
| **4.3** | | | | |
| 4.3.1 | Strategy 页按 `page-strategy.md` | ✅ `/strategy/[id]` 布局与核心组件 | ⏸ 未跑浏览器 E2E | ⚠️ |
| 4.3.2 | 模板优先 UX | ✅ `StrategyTemplateRack`（Trend Scout / Mean Reversion / Cautious Learner） | 静态 ✅ | ✅ |
| 4.3.3 | hash / JSON 藏 drawer | ✅ `View validation details` Drawer | 静态 ✅ | ✅ |
| 4.3.4 | 默认展示兼容摘要 | ✅ `PolicyCompatibilityPreview` | 静态 ✅ | ✅ |
| 4.3.5 | 激活后路由 Training Ledger | ✅ `Start Training` → `/dashboard/:id`；`routeJump.strategyPath` | ✅ `routeJump.test.ts` | ✅ |
| **4.4** | | | | |
| 4.4.1 | 未授权 pair 不能 save | ✅ 代码路径存在 | ⚠️ 见 4.2.3 | ⚠️ |
| 4.4.2 | policy 冲突返回字段级错误 | ✅ `PolicyConflictDetail.field` | ✅ `test_notional_conflict_returns_field_error` | ✅ |
| 4.4.3 | save 产生 version + ghost | ✅ 代码路径存在 | ⚠️ 仅 version mock；ghost 无 DB 断言 | ⚠️ |
| 4.4.4 | Pipeline 加载 save 后 version | ✅ loader 计数 version | ⚠️ 未测 save→reload 闭环 | ⚠️ |

#### Verification Runs (2026-06-17)

| # | 命令 / 检查 | 结果 | 详情 |
|---|-------------|------|------|
| E4-1 | `pytest tests/test_strategy_policy.py tests/test_strategy_feed.py tests/test_strategy_ghost.py -v` | ✅ PASS | **19 passed**（0.68s） |
| E4-2 | `pytest tests/test_strategy_policy.py … tests/test_decision_pipeline.py -q` | ✅ PASS | **31 passed**（含决策链 smoke） |
| E4-3 | `python -c` policy_compat smoke（`WAL/USDC` blocked） | ✅ PASS | `policy_compat_smoke: OK` |
| E4-4 | 静态：backend 4 个交付文件存在 | ✅ PASS | `policy_compatibility` / `strategy_feed` / `panda_strategy` / `panda_loader` |
| E4-5 | 静态：frontend 5 个交付文件存在 | ✅ PASS | page + 4 components |
| E4-6 | `npx vitest run src/lib/ui/routeJump.test.ts` | ✅ PASS | **4 passed**（含 `strategyPath`） |
| E4-7 | `rg` 设计组件名 vs 实现 | ⚠️ 部分 | `NaturalLanguageHintBox` / `RuleBlockEditor` / `SaveStrategyButton` **未独立命名**；复用 `StrategyBuilder` |
| E4-8 | `npm run type-check`（frontend 全量） | ❌ FAIL | `TS6053`：缺少 `.next/types/**`（需先 `next dev`/`next build` 生成）；**非 Strategy 源码类型错误** |
| E4-9 | HTTP API 手测 / TestClient + 真实 DB | ⏸ 未跑 | §1 DB 不可达；无 `test_panda_strategy_api.py` |
| E4-10 | 浏览器 `/strategy/:id` 手测 | ⏸ 未跑 | 需 frontend + backend + JWT + panda 数据 |

#### 推荐验证命令（可复制）

**后端单元 / 逻辑（本环境已跑通）**

```bash
cd backend
python -m pytest tests/test_strategy_policy.py tests/test_strategy_feed.py tests/test_strategy_ghost.py -v
python -m pytest tests/test_strategy_policy.py tests/test_strategy_feed.py tests/test_strategy_ghost.py tests/test_decision_pipeline.py -q
```

**Policy 兼容 smoke（无需 DB）**

```bash
cd backend
python -c "
from app.services.policy_compatibility import check_policy_compatibility, PolicyMirror
from app.schemas.strategy import ParsedStrategyLayers
from tests.test_schemas import _sample_parsed
parsed = ParsedStrategyLayers.model_validate({**_sample_parsed(), 'target_pairs': ['WAL/USDC']})
policy = PolicyMirror(version=1, allowed_pairs=['DEEP/SUI'], max_notional_per_trade=500, max_daily_loss=800)
r = check_policy_compatibility(parsed, policy, target_pairs=['WAL/USDC'])
assert not r.compatible and r.blocked_pairs == ['WAL/USDC']
print('OK')
"
```

**前端路由与类型**

```bash
cd frontend
npx vitest run src/lib/ui/routeJump.test.ts
# 全量 type-check 前需生成 Next 类型：
# npm run dev   # 或 npm run build
npm run type-check
```

**DB / API 集成（需 §1 数据库可达 + seed policy）**

```bash
cd backend
alembic upgrade head
# 插入 trading_policies 测试行后：
curl -s -X POST "$BACKEND/panda/{PANDA_ID}/strategy/validate" \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"parsed":{...,"target_pairs":["WAL/USDC"]}}' | jq .
# 期望：policy_compatible=false 或 valid=false；save 应 422 STRATEGY_POLICY_CONFLICT
```

**浏览器手测清单**

1. 登录 → 打开 `/strategy/{pandaId}`
2. 选模板 → Validate → 查看 `PolicyCompatibilityPreview`
3. 兼容通过后 Save → 出现 version toast
4. `Start Training` 跳转 `/dashboard/{pandaId}`
5. Drawer 中可见 `strategy_hash` / parsed JSON

#### Known Gaps（如实）

| 缺口 | 影响 |
|------|------|
| 无 `feed_strategy` PostgreSQL 集成测试 | ghost 入库、policy 拒绝 save 仅代码审查 + 单元测 |
| `strategy.version` 非表字段 | 由历史 `strategies` 计数；与 TODO「持久化 version」语义略弱 |
| 设计文档 3 个组件名未独立实现 | 功能由 `StrategyBuilder` 承担；NL 解析在 Strategy 页 toast 引导回 Dashboard |
| 无浏览器 E2E | 移动端 accordion / sticky CTA 未实测 |
| 依赖 Epic 2 `trading_policies` mirror | 无 policy 行时 validate 仍可通过规则编译，但 `policy_compatible=null` |

#### Verdict

| 层级 | 结论 |
|------|------|
| 后端逻辑 / 单元测试 | ✅ 通过（31 项相关 pytest 绿） |
| 前端静态交付 / 路由 | ✅ 通过 |
| DB 集成 / HTTP API / 浏览器 | ⏸ 未验证（环境或未执行） |
| 设计稿 1:1 组件命名 | ⚠️ 部分对齐 |
| **Epic 4 完整闭环** | **⚠️ 部分验证** — 可合并，但建议在 DB 可达后补 API + save→ghost 集成测与 `/strategy` 手测 |

---

### 3.5 Epic 5 — Training Ledger Hot Path

> **验证状态**：⚠️ 部分验证（2026-06-17）  
> **Done standard**（摘自 TODO）：活跃 Panda 消费真实 market tick → BUY/SELL/HOLD 决策 → Policy 校验 → 纸面账本变更 → 提交 canonical Trade Fact。

#### Deliverables

| 类别 | 内容 |
|------|------|
| 热路径服务 | `policy_gate.py` · `ledger_service.py` · `trade_fact_writer.py` |
| Actor 接线 | `PandaActor` 经 `TradeFactWriter.commit_tick` 写 `order_intents` / `ledger_entries` / `trade_facts`（仍兼容写 legacy `trades`） |
| 训练读 API | `GET /panda/:id/training/ledger` · `order-intents` · `trade-facts` |
| 会话 API | legacy `simulation/start|stop|status` + `require_active_wallet` |
| 实时事件 | `decision` · `order_intent` · `execution` · `policy_rejected` · `market_stale`（+ legacy `trade_executed`） |
| 前端 | `/training-ledger/[id]` + `components/training/*` + BFF 3 路由 + `training.service.ts` |
| 数据层 | migration `004` 中 `order_intents` / `ledger_entries` / `trade_facts`（Epic 0 已建，Epic 5 首次写入） |

#### Files Touched

**新建（backend）**：`app/services/policy_gate.py` · `ledger_service.py` · `trade_fact_writer.py` · `app/api/panda_training.py` · `tests/test_policy_gate.py` · `test_ledger_service.py` · `test_training_hot_path.py`

**修改（backend）**：`app/engine/panda_actor.py` · `actor_manager.py` · `event_publisher.py` · `app/api/panda_simulation.py` · `app/api/router.py`

**新建（frontend）**：`src/app/training-ledger/[id]/page.tsx` · `src/services/training.service.ts` · `src/components/training/*`（7 组件）· `src/app/api/panda/[id]/training/{ledger,order-intents,trade-facts}/route.ts`

**修改（frontend）**：`src/hooks/useSimulationWs.ts` · `src/services/simulation.service.ts`

#### TODO Checklist vs 实测

| 小节 | 项 | TODO | 代码存在 | 自动测试 | 备注 |
|------|-----|------|----------|----------|------|
| 5.1 | `order_intents` / `ledger_entries` / `trade_facts` | ✅ | ✅ | ✅ ORM+migration 静态 | DB 落地 ⏸（§1） |
| 5.1 | `decision_hash` / `fact_hash` / `proof_key` 唯一索引 | ✅ | ✅ | ✅ migration 源码抽查 | |
| 5.1 | intent 快照 policy version + result | ✅ | ✅ | ⏸ | `policy_snapshot` JSONB 在 `TradeFactWriter` 写入 |
| 5.2 | `MarketDataConsumer` | ✅ | ✅ | — | Epic 3 既有；未单独回归 |
| 5.2 | `ActorManager` 仅路由 active actors | ✅ | ✅ | — | `broadcast_market_tick` 跳过空 actor 表 |
| 5.2 | `PandaActor` → OrderIntent（非直接 trade） | ✅ | ✅ | ⏸ | 主路径已改；成功执行仍写 legacy `trades` 兼容行 |
| 5.2 | `DecisionPipeline` 含 strategy/skill version | ✅ | ⚠️ | — | version 在 `decision_snapshot`；pipeline 本身不返回 version 字段 |
| 5.2 | `PolicyGate` | ✅ | ✅ | ✅ 7 cases | |
| 5.2 | `LedgerService` | ✅ | ✅ | ⚠️ | 仅 `snapshot_to_dict` 单测；`apply_execution` 无 DB 集成测 |
| 5.2 | `TradeFactWriter` 原子提交 + outbox/async_jobs | ✅ | ⚠️ | ⏸ | 写 `outbox_events` + 直接 Redis publish；**未**创建 `async_jobs` 行 |
| 5.2 | 持久化 rejected intents | ✅ | ✅ | ⏸ | `status=REJECTED` + `rejection_reason`（非字面量 `REJECTED_BY_POLICY`） |
| 5.3 | `simulation/start` 作 Training 会话 | ✅ | ✅ | — | |
| 5.3 | 启动前置：vault+policy+strategy+pair+fresh market | ✅ | ⚠️ | — | 后端强制 vault/policy/strategy；**fresh market 仅前端软性检查**（`SimulationStatusBar`） |
| 5.3 | stop 不丢已提交 Trade Fact | ✅ | ✅ | ⏸ | stop 不删 fact 表；无 DB 实测 |
| 5.3 | 暴露 ledger 状态 / Trade Fact 时间线 | ✅ | ✅ | ⏸ | 3 个 GET 路由已注册；无 HTTP 集成测 |
| 5.4 | `panda:{id}:decision` | ✅ | ✅ | — | |
| 5.4 | `panda:{id}:order_intent` / `:execution` | ✅ | ✅ | ⏸ | 代码发布；无 Redis 订阅实测 |
| 5.4 | `panda:{id}:review` | ✅ | ⚠️ | — | `publish_review` 存在（Epic 7 worker 用）；**非 Epic 5 热路径触发** |
| 5.4 | failure/stale/policy 事件 | ✅ | ⚠️ | — | `policy_rejected`·`market_stale` 已调用；`publish_policy_paused` **已定义未调用** |
| 5.5 | `TrainingLedgerPage` + 设计组件 | ✅ | ✅ | ⚠️ | 页面与 7 组件存在；tsc 无 training 相关错误 |
| 5.5 | 决策时间线 + Trade Fact drawer | ✅ | ✅ | — | `DecisionTimeline` + `TradeFactDrawer` |
| 5.5 | Policy pass/reject drawer | ✅ | ⚠️ | — | `PolicyGateBanner` 内联展示；**无独立 policy drawer** |
| 5.5 | 跳转 Chain Proof / Review | ✅ | ✅ | — | `routeJump` → `/chain-proof` · `/review` |
| 5.6 | PolicyGate 矩阵单测 | ✅ | ✅ | ✅ | |
| 5.6 | LedgerService 现金/持仓/PnL 变异 | ✅ | ⚠️ | ❌ | 无 `apply_execution` 集成或变异单测 |
| 5.6 | tick→Intent→Gate→Ledger→Fact 集成 | ✅ | ⚠️ | ❌ | **无**端到端 pytest |
| 5.6 | market stale → HOLD | ✅ | ✅ | ✅ | `test_market_event` + `test_training_hot_path` |
| 5.6 | policy paused 阻止纸面执行 | ✅ | ⚠️ | ⚠️ | `PolicyGate` 单测覆盖；**无** `PandaActor`+DB 集成测 |
| 5.6 | DB 事务回滚防部分账本 | ✅ | ⚠️ | ❌ | **无** rollback 测试 |

#### Verification Runs (2026-06-17)

| # | 命令 / 检查 | 结果 | 详情 |
|---|-------------|------|------|
| E5-1 | `pytest tests/test_policy_gate.py tests/test_ledger_service.py tests/test_training_hot_path.py tests/test_market_event.py tests/test_migration_004.py -v` | ✅ PASS | **22 passed** |
| E5-2 | 静态：热路径模块 import | ✅ PASS | `PolicyGate` · `LedgerService` · `TradeFactWriter` · `panda_training.router` |
| E5-3 | 静态：API 路由注册 | ✅ PASS | `router.py` 含 `panda_training`；3× `GET /training/*` |
| E5-4 | 静态：EventPublisher 频道 | ✅ PASS | `order_intent` / `execution` / `policy_rejected` / `market_stale` |
| E5-5 | 静态：前端 training 资产 | ✅ PASS | 页面 + 7 组件 + 3 BFF 路由 + `training.service.ts` |
| E5-6 | `cd frontend && npx tsc --noEmit \| rg training` | ✅ PASS | 无 training 相关 TS 错误（全量 tsc 另有 chain-proof 预存错误） |
| E5-7 | `python scripts/verify_db.py` | ❌ FAIL | `asyncio.TimeoutError` ~70s（见 §1） |
| E5-8 | 缺口扫描：`async_jobs` in TradeFactWriter | ⚠️ GAP | grep 无匹配；TODO 5.2 声称含 async_jobs |
| E5-9 | 缺口扫描：`publish_policy_paused` 调用点 | ⚠️ GAP | 仅定义于 `event_publisher.py`，热路径未调用 |
| E5-10 | 缺口扫描：Ledger 集成 / rollback 测试 | ❌ GAP | `tests/` 无 `commit_tick` / `apply_execution` / rollback |

#### Recommended Verification Commands（可复现）

**A. 单元 + 静态（无需 DB，本环境已跑）**

```bash
cd backend
.venv/bin/python -m pytest \
  tests/test_policy_gate.py \
  tests/test_ledger_service.py \
  tests/test_training_hot_path.py \
  tests/test_market_event.py \
  tests/test_migration_004.py -v

# 模块可导入
.venv/bin/python -c "
from app.services.policy_gate import PolicyGate
from app.services.ledger_service import LedgerService
from app.services.trade_fact_writer import TradeFactWriter
from app.api.panda_training import router
print('imports_ok', len(router.routes))
"

# 前端类型（training 相关）
cd ../frontend
npx tsc --noEmit 2>&1 | rg -i "training|training-ledger" || echo "no training TS errors"
```

**B. 数据库落地（需 §1 可达 PostgreSQL）**

```bash
cd backend
alembic upgrade head
alembic current   # 期望含 004_v31_agent_wallet
python scripts/verify_db.py   # order_intents / ledger_entries / trade_facts 等为 ok
```

**C. 热路径集成（需 DB + Redis + 已 seed 熊猫 + active vault/policy/strategy）**

```bash
# 1) 启动 backend + market-monitor + Redis
# 2) 获取 JWT 后：
curl -s -H "Authorization: Bearer $JWT" \
  -X POST "$BACKEND/panda/$PANDA_ID/simulation/start" \
  -H "Content-Type: application/json" \
  -d '{"speed":"1x","subscribed_pools":["DEEP/SUI"]}'

# 3) 等待 tick 后查 v3.1 表
psql "$DATABASE_URL" -c "SELECT id, side, status FROM order_intents WHERE panda_id='$PANDA_ID' ORDER BY created_at DESC LIMIT 5;"
psql "$DATABASE_URL" -c "SELECT id, fact_hash FROM trade_facts WHERE panda_id='$PANDA_ID' ORDER BY created_at DESC LIMIT 5;"

# 4) 读 API
curl -s -H "Authorization: Bearer $JWT" "$BACKEND/panda/$PANDA_ID/training/ledger"
curl -s -H "Authorization: Bearer $JWT" "$BACKEND/panda/$PANDA_ID/training/trade-facts"

# 5) Redis 订阅（另一终端）
redis-cli -u "$REDIS_URL" PSUBSCRIBE "panda:$PANDA_ID:*"
# 期望见到：decision · order_intent · execution（执行时）· policy_rejected（拒绝时）· market_stale（行情 stale 时）
```

**D. 前端手测（需四服务 + 钱包登录）**

1. 打开 `/training-ledger/{pandaId}`  
2. 确认 Agent Wallet + Strategy 已就绪 → 启动训练  
3. 观察：状态条、K 线 tick、Ledger 条、Decision 时间线、Trade Fact drawer  
4. 点击 Chain Proof / Review 链接可跳转  
5. Policy 拒绝或 market stale 时 banner 有提示  

**E. 负例手测**

| 场景 | 期望 | 验证方式 |
|------|------|----------|
| 无 Agent Wallet | `simulation/start` 4xx `VAULT_*` / `POLICY_*` | curl start |
| Policy paused | intent `REJECTED`，无 ledger 变更 | 暂停 policy 后等 tick |
| Market stale | `PandaActor` HOLD，发布 `market_stale` | 断 monitor 或等 freshness>120s |
| 未授权 pair | PolicyGate `POLICY_PAIR_NOT_ALLOWED` | 策略/订阅非法 pair |

#### Verdict

| 层级 | 结论 |
|------|------|
| 代码交付（模块/API/页面） | ✅ 已交付 |
| 单元 / 静态测试 | ✅ 22 项通过；覆盖 PolicyGate + stale gate + migration |
| 集成 / DB / Redis / E2E | ⏸ 未在本环境验证（DB 超时；无热路径集成测） |
| TODO 5.6 声称的全部测试 | ⚠️ 未完全兑现（缺 Ledger 变异、E2E、rollback） |
| Epic 5 完整闭环 | ⚠️ **部分完成** — 可演示主路径，生产验收需补 B+C+D 与缺口项 |

#### Open Gaps（建议在 Epic 11 前关闭）

1. `TradeFactWriter` 创建 `async_jobs`（若架构要求 commit 后异步 side effect）  
2. `publish_policy_paused` 在 policy 暂停时实际发布  
3. `LedgerService.apply_execution` 集成测试 + DB rollback 测试  
4. `pytest` 集成：`tick → OrderIntent → PolicyGate → Ledger → TradeFact`  
5. `simulation/start` 后端强制 fresh market（或明确文档：仅前端门禁）  
6. Training 页订阅 WS `order_intent`/`execution`（现主要靠 REST 轮询）  
7. DB 可达环境下复跑 `verify_db` + 表内实写验收  

---


### 3.6 Epic 6 — Chain Proof Mode 2

> **验证状态**：⚠️ 部分验证（2026-06-17）  
> **Done standard**（摘自 TODO）：selected/manual Trade Fact 可通过 Agent Signer 提交 testnet PandaCoin PTB；proof 失败不污染 Training Ledger PnL。

#### Deliverables

| 类别 | 内容 |
|------|------|
| Move | `contracts/sources/demo_executor.move`（`DemoTradeExecuted` + `trade_fact_id_hash`） |
| Move 测试 | `contracts/tests/agent_wallet_tests.move`（legal / paused / stale / pair / notional / unauthorized / revoked） |
| DB | `chain_execution_logs`（migration `004`）+ `retryable` 与 idempotency index（migration `005`） |
| Backend 服务 | `proof_selector.py` · `agent_signer.py` · `chain_proof_service.py` |
| Worker | `chain_execution_worker.py` + `queue_dispatcher` 分发 `chain_proof_requested` |
| API | `GET/POST /panda/:id/chain-proof/:trade_fact_id`（`panda_chain_proof.py`） |
| 配置 | `CHAIN_PROOF_ENABLED` · `AGENT_SIGNER_*` · `chain_proof_auto_score_threshold` / `cooldown` / `daily_cap` |
| Frontend | `/chain-proof` + `components/chain-proof/*` + BFF 代理 + `useChainProof` |

#### Files Touched（Epic 6 范围）

**新建**：`demo_executor.move` · `005_chain_proof_idempotency.py` · `proof_selector.py` · `agent_signer.py` · `chain_proof_service.py` · `chain_execution_worker.py` · `panda_chain_proof.py` · `test_proof_selector.py` · `test_agent_signer.py` · `test_chain_execution_worker.py` · `test_migration_005.py` · `frontend/src/app/chain-proof/*` · `frontend/src/components/chain-proof/*` · `chainProof.service.ts` · `useChainProof.ts`

**修改**：`agent_wallet_tests.move` · `queue_dispatcher.py` · `router.py` · `config.py` · `models.py` · `verify_db.py` · `autonomous_wallet.ts` · `autonomous-wallet.ts`（types）

#### TODO Checklist vs 实测

| 小节 | 项 | 代码存在 | 自动化验证 | 备注 |
|------|-----|----------|------------|------|
| 6.1 | `demo_executor.move` | ✅ | ✅ Move 27/27 | |
| 6.1 | signer = `authorized_agent` | ✅ | ✅ `test_unauthorized_agent_aborts` | |
| 6.1 | vault/policy/panda 绑定 | ✅ | ✅ `assert_bindings` + mismatch test | |
| 6.1 | pair / notional / daily loss | ✅ | ✅ pair + notional Move tests | daily loss 路径无独立 abort 用例 |
| 6.1 | paused / revoked / expired | ✅ | ✅ paused + revoked tests | **expired** 无独立 abort 用例 |
| 6.1 | cooldown / daily cap（链上） | ⚠️ | ⏸ | 字段存于 `TradingPolicy`，**`assert_trade_allowed` 未校验**；由 backend `ProofSelector` 负责 |
| 6.1 | `DemoTradeExecuted` 事件字段 | ✅ | ✅ 静态 + legal trade test | 链上为 `trade_fact_id_hash`（bytes），非明文 id |
| 6.2 | `chain_execution_logs` 表 | ✅ | ⚠️ | ORM + `004` 迁移脚本；**本环境 DB 不可达，未落地验证** |
| 6.2 | proof_key / tx / status / retryable | ✅ | ⚠️ | `005` 脚本 + 静态测试；列未在 DB 实测 |
| 6.2 | idempotency（fact+version+hash） | ✅ | ⚠️ | `proof_key` SHA256 + DB unique index 脚本；**无集成测试** |
| 6.3 | `ProofSelector` | ✅ | ✅ 7 pytest | |
| 6.3 | 自动资格 score≥0.75 等 | ✅ | ✅ 单元测试 | EXECUTE 侧由 `BUY/SELL` 侧别检查近似 |
| 6.3 | 手动绕过分数 | ✅ | ✅ 单元测试 | |
| 6.3 | `ChainExecutionWorker` | ✅ | ⚠️ | 有模块 + dry-run 测试；**无 DB 集成 / duplicate / failure 集成测试** |
| 6.3 | `AgentSignerService` | ✅ | ✅ 3+2 pytest | |
| 6.3 | 真实 testnet PTB（pysui） | ✅ 代码路径 | ⏸ | 测试环境无 `AGENT_SIGNER_PRIVATE_KEY`；实测为 **DRYRUN_** digest |
| 6.3 | proof 失败不回滚 ledger | ✅ 设计 | ⏸ | 无 DB 集成测试验证余额不变 |
| 6.4 | Chain Proof 页面与组件 | ✅ | ✅ type-check | |
| 6.4 | 资格 / 时间线 / drawer / modal / digest | ✅ | ⏸ | 无浏览器 smoke |
| 6.5 | Move abort 路径测试 | ✅ | ✅ 见 Move 表 | |
| 6.5 | Backend selector / signer | ✅ | ✅ 16 pytest | |
| 6.5 | Worker success/fail/retry/duplicate | ⚠️ | ⚠️ | 仅 dry-run + custom submit_fn；**duplicate/retry 无专用测试** |
| 6.5 | E2E smoke | ⏸ | ⏸ | **未执行**（需 DB + 后端 + 浏览器 + 可选 testnet） |

#### Verification Runs (2026-06-17)

| # | 命令 / 检查 | 结果 | 详情 |
|---|-------------|------|------|
| 1 | `cd contracts && sui move test` | ✅ PASS | **27 passed**（含 Epic 6：`test_legal_demo_trade_succeeds`、`test_unauthorized_agent_aborts`、`test_pair_not_allowed_aborts`、`test_notional_exceeded_aborts`、`test_paused_policy_blocks_demo_executor`、`test_revoked_agent_blocks_demo_executor`、`test_stale_policy_version_aborts`、`test_mismatched_vault_policy_aborts`） |
| 2 | `cd backend && pytest tests/test_proof_selector.py tests/test_agent_signer.py tests/test_chain_execution_worker.py tests/test_migration_005.py -v` | ✅ PASS | **16 passed** |
| 3 | `cd backend && pytest tests/test_migration_004.py -q` | ✅ PASS | 5 passed（`chain_execution_logs` 在 `004` 表清单中） |
| 4 | `cd frontend && pnpm type-check` | ✅ PASS | 零 TS 错误 |
| 5 | `cd frontend && pnpm exec vitest run src/lib/ui/routeJump.test.ts` | ✅ PASS | 4 passed（含 `chainProofPath`） |
| 6 | 静态交付物存在性（§ Deliverables 文件表） | ✅ PASS | 6/6 backend 核心文件存在 |
| 7 | `cd frontend && pnpm build` | ❌ FAIL | 构建失败于 **`/agent-wallet`**（`useSearchParams` 缺 Suspense），**非 `/chain-proof`**；`/chain-proof` 已包 `Suspense` |
| 8 | DB：`alembic_current` + `chain_execution_logs.retryable` | ❌ FAIL | `TimeoutError`（25s），与 §1 一致 |
| 9 | 真实 testnet PTB + tx digest 上链 | ⏸ 未跑 | 需 `CHAIN_PROOF_ENABLED=true` + `AGENT_SIGNER_PRIVATE_KEY` + 已 publish 的 `demo_executor` |
| 10 | 浏览器 E2E：`/chain-proof?panda=&fact=` → Prove → digest | ⏸ 未跑 | 需全栈 + Trade Fact 种子数据 |

#### How to Re-Verify（推荐复验顺序）

```bash
# 1) Move 合约
cd contracts && sui move test

# 2) Backend 单元（不依赖 DB）
cd backend && pytest \
  tests/test_proof_selector.py \
  tests/test_agent_signer.py \
  tests/test_chain_execution_worker.py \
  tests/test_migration_005.py \
  tests/test_migration_004.py -v

# 3) Frontend 类型与路由
cd frontend && pnpm type-check
pnpm exec vitest run src/lib/ui/routeJump.test.ts

# 4) DB 落地（须可达 DATABASE_URL）
cd backend && alembic upgrade head && alembic current
python scripts/verify_db.py   # 期望含 chain_execution_logs、idx_chain_execution_logs_idempotency、retryable 列

# 5) API smoke（须 backend + JWT + 种子 Trade Fact）
curl -H "Authorization: Bearer $JWT" \
  "$BACKEND/panda/$PANDA_ID/chain-proof/$TRADE_FACT_ID"
curl -X POST -H "Authorization: Bearer $JWT" \
  "$BACKEND/panda/$PANDA_ID/chain-proof/$TRADE_FACT_ID/request"

# 6) 真实 testnet proof（可选）
# 设置 CHAIN_PROOF_ENABLED=true、AGENT_SIGNER_*、PACKAGE_ID，重新 publish 合约后执行 POST /request
# 期望 chain_execution_logs.tx_digest 非 DRYRUN_ 前缀

# 7) 浏览器
# 打开 /chain-proof?panda={id}&fact={tradeFactId}，确认资格面板、时间线、确认弹窗、digest/失败文案
```

#### Gaps（诚实未覆盖项）

1. **无** `process_chain_proof_job` / `request_chain_proof` 的 PostgreSQL 集成测试（duplicate、failure+retryable、ledger 余额不变）。
2. **无** 端到端自动化（Trade Fact → job → worker → digest UI）。
3. **无** 本环境真实 testnet 交易回执验证（仅 dry-run digest 单测）。
4. Migration `005` 与 `retryable` 列 **未在可达 DB 上执行**。
5. Move 层 **未** 在 `demo_executor` 路径校验 proof cooldown / daily cap（由 backend 负责，与 spec 部分一致但链上 collar 较窄）。
6. 全站 `pnpm build` 因 Epic 2 `/agent-wallet` 问题失败，不单独代表 Chain Proof 页不可用。

#### Verdict

| 层级 | 结论 |
|------|------|
| Move 合约 + 单元测试 | ✅ 通过 |
| Backend 服务 / Worker 代码 | ✅ 已交付 |
| Backend 集成 / E2E / 真实 testnet | ⏸ 未验证 |
| DB migration `005` 落地 | ⏸ 未验证（环境阻塞） |
| Frontend 类型 + 路由 | ✅ 通过 |
| Frontend build（全站） | ❌ 阻塞于 `/agent-wallet` |
| Epic 6 完整闭环 | ⚠️ **部分完成** — 可合并代码并继续 Epic 11 前须补 DB 集成 + E2E +（可选）testnet smoke |

---

### 3.7 Epic 7 — Review And Skill Memory

> **验证状态**：⚠️ 部分验证（2026-06-17）  
> **Done standard**（摘自 TODO）：closed paper position 产生 realized PnL、证据复盘、可选 Skill Memory 更新；Panda 不能从「无证据 vibe」学习。

#### Deliverables

| 类别 | 内容 |
|------|------|
| 数据模型 | `trade_reviews` · `skill_memories` · `skill_versions`（migration `004` + ORM） |
| 纯逻辑 | `backend/app/services/review_logic.py`（hypothesis 生命周期、证据校验） |
| 服务层 | `review_service.py` · `skill_memory_service.py` · `async_job_queue.py` |
| Workers | `review_worker.py` · `skill_memory_worker.py` · `queue_dispatcher.py` |
| API | `panda_review.py` — 6 个路由（reviews / trade-fact review / skill-memories / skill-versions） |
| 错误码 | `REVIEW_NOT_FOUND` · `REVIEW_NOT_READY` · `REVIEW_EVIDENCE_MISSING` · `SKILL_VERSION_NOT_FOUND` |
| 实时事件 | `EventPublisher.publish_review` · `publish_skill`（**已定义，worker 未调用**） |
| 决策接入 | `panda_loader` 加载 supported/verified memories → `PandaActor` → `DecisionPipeline._skill_memory_correction` |
| 前端 | `/review` · `ReviewJournalPageClient` · 4 个 review 组件 · BFF 4 路由 · `review.service.ts` |
| 单元测试 | `backend/tests/test_review_logic.py`（6 项） |

#### Files Touched (Epic 7 scope)

**新建（backend）**：`services/review_logic.py` · `review_service.py` · `skill_memory_service.py` · `async_job_queue.py` · `workers/review_worker.py` · `skill_memory_worker.py` · `queue_dispatcher.py` · `api/panda_review.py` · `tests/test_review_logic.py`

**新建（frontend）**：`app/review/*` · `components/review/*` · `services/review.service.ts` · `app/api/panda/[id]/reviews/route.ts` · `.../trade-facts/[tradeFactId]/review/route.ts` · `.../skill-memories/route.ts` · `.../skill-versions/latest/route.ts`

**修改**：`api/router.py` · `schemas/errors.py` · `engine/event_publisher.py` · `types/autonomous-wallet.ts` · `types/index.ts`

#### TODO Checklist Snapshot

| 小节 | 项 | 代码存在 | 自动验证 | 备注 |
|------|-----|----------|----------|------|
| 7.1 | `trade_reviews` / `skill_memories` / `skill_versions` | ✅ | ✅ | ORM + migration 004 静态测试 |
| 7.1 | review ↔ 单一 Trade Fact | ✅ | ✅ | `trade_fact_id` UNIQUE FK |
| 7.1 | skill memory ↔ evidence ids | ✅ | ⚠️ | 写入时带 `evidence_trade_fact_ids`；无 DB 约束级验证 |
| 7.2 | position close 触发 review | ⚠️ | ❌ | `enqueue_position_closed_review` **未被** `TradeFactWriter`/ledger 调用 |
| 7.2 | 手动 review 请求 | ✅ | ⏸ | POST API + 同步 `process_pending_jobs`；**无 DB 集成测** |
| 7.2 | entry/exit 参考价 → realized PnL 复盘 | ⚠️ | ⚠️ | 逻辑读 `outcome.entry/exit_price`；**热路径 TradeFact 未写入这些字段** |
| 7.2 | 决策证据 vs outcome 对比 | ✅ | ✅ | `analyze_hypotheses` 6 项单测 |
| 7.2 | hypothesis 五态 | ✅ | ✅ | proposed/supported/verified/weakened/retired |
| 7.2 | 弱证据不更新 skill | ✅ | ✅ | `should_update_skill` 单测 |
| 7.3 | supported/verified → skill version | ✅ | ⏸ | `apply_skill_update_from_review` 有实现；**无 DB 单测** |
| 7.3 | evidence refs + confidence + digest | ✅ | ⏸ | `memory_hash` / `skill_hash` 计算存在 |
| 7.3 | DecisionPipeline 读最新 skill | ✅ | ✅ | 静态：`panda_loader` + `_skill_memory_correction` |
| 7.4 | Review Journal 页面 | ✅ | ✅ | 文件与组件存在 |
| 7.4 | 默认 outcome + PnL | ✅ | ✅ | `TradeOutcomeHeader` / `TradeOutcomeStory` |
| 7.4 | evidence / skill diff → drawer | ✅ | ✅ | 2× `Drawer` |
| 7.4 | Why not updated modal | ✅ | ✅ | `WhyNotUpdatedModal` |
| 7.4 | 回 Training | ✅ | ✅ | `trainingLedgerPath(pandaId)` → `/training-ledger/{id}` |
| 7.4 | 设计稿全组件 | ⚠️ | ⚠️ | 缺 `HypothesisLifecycle` · `ReviewTimeline` · `LearningBoundaryNotice` |
| 7.5 | 盈利不 auto-verify | ✅ | ✅ | `test_positive_pnl_does_not_auto_verify_without_alignment` |
| 7.5 | 缺证据阻断 | ✅ | ✅ | `test_missing_evidence_blocks_review`（纯函数级） |
| 7.5 | supported → memory candidate | ⚠️ | ⚠️ | 单测仅验 `should_update_skill`，**未验 DB 写入** |
| 7.5 | verified → skill version | ⚠️ | ⚠️ | 单测仅验 hypothesis status，**未验 `skill_versions` 行** |
| 7.5 | 矛盾证据 weaken/retire | ✅ | ✅ | `test_contradictory_evidence_weakens_hypothesis` |

#### Verification Runs (2026-06-17)

| # | 命令 / 检查 | 结果 | 详情 |
|---|-------------|------|------|
| 1 | `cd backend && python -m pytest tests/test_review_logic.py -v` | ✅ PASS | **6/6** passed |
| 2 | `cd backend && python -m pytest tests/test_migration_004.py -q` | ✅ PASS | **5/5** passed；含 `trade_reviews` / `skill_memories` / `skill_versions` ORM 与 migration 文本 |
| 3 | Python import + 路由静态盘点 | ✅ PASS | `imports_ok`；`panda_review` **6** routes |
| 4 | `rg enqueue_position_closed_review` 全库 | ❌ GAP | 仅 `review_worker.py` 定义；**无调用方** |
| 5 | `TradeFactWriter` outcome 字段抽查 | ❌ GAP | 热路径只写 `realized_pnl_delta`；**无 `closed_at` / `entry_price` / `exit_price`** → 真实 Trade Fact 难通过 `run_review_for_fact` |
| 6 | `rg publish_review\\|publish_skill` worker 调用 | ❌ GAP | 仅在 `event_publisher.py` 定义；worker **未 publish** |
| 7 | 前端文件存在性 | ✅ PASS | `/review` page + 4 components + 4 BFF routes + `review.service.ts` |
| 8 | `tsc --noEmit \| rg review` | ✅ PASS | review 相关文件无 TS 错误 |
| 9 | `cd frontend && npx tsc --noEmit`（全量） | ❌ FAIL | 缺 `.next/types/**` 构建产物（**非 Epic 7 源码错误**） |
| 10 | Review API HTTP 集成（需 JWT + DB） | ⏸ SKIP | §1 DB 不可达 |
| 11 | `alembic upgrade head` + `verify_db.py` v3.1 表 | ⏸ SKIP | §1 DB 不可达 |
| 12 | 浏览器 `/review?panda=&fact=` 手测 | ⏸ SKIP | 需运行 frontend + 后端 + 已有关闭 Trade Fact 数据 |

#### Verification Methods（如何复验）

**A. 单元 / 静态（本环境已跑，无需 DB）**

```bash
# Epic 7 核心逻辑
cd backend
python -m pytest tests/test_review_logic.py -v

# v3.1 表结构（含 trade_reviews / skill_memories / skill_versions）
python -m pytest tests/test_migration_004.py -q

# API 路由盘点
python -c "from app.api.panda_review import router; print([(list(r.methods), r.path) for r in router.routes])"

# 热路径接线缺口（期望：TradeFactWriter 或 ledger 应调用 enqueue_position_closed_review）
rg "enqueue_position_closed_review|position_closed" backend/

# Trade Fact 字段是否满足 review 前置（期望：closed_at + outcome.entry/exit_price）
rg "closed_at|entry_price|exit_price" backend/app/services/trade_fact_writer.py backend/app/services/ledger_service.py
```

**B. 数据库集成（DB 可达时）**

```bash
cd backend
alembic upgrade head
python scripts/verify_db.py   # 确认 trade_reviews / skill_memories / skill_versions = ok

# 手动：插入 closed Trade Fact（含 closed_at + outcome 价格）→ POST review → 查 trade_reviews / skill_versions
# curl -X POST "$BACKEND/panda/{panda_id}/trade-facts/{fact_id}/review" -H "Authorization: Bearer $JWT"
```

**C. 前端（本环境部分）**

```bash
cd frontend
npx tsc --noEmit 2>&1 | rg -i review || echo "no review TS errors"
npm run build   # 生成 .next/types 后可消除全量 tsc 假失败

# 浏览器：登录 → /review?panda={id}&fact={tradeFactId}
# 检查：Outcome story、Evidence drawer、Why not updated modal、Continue training → /training-ledger/{id}
```

**D. 端到端（Epic 5 + 7 联调，当前未通过）**

1. Training Ledger 平仓/减仓 → Trade Fact 写入 `closed_at` + entry/exit 参考价  
2. 自动或手动触发 `position_closed` / `review_requested` job  
3. `trade_reviews` 一行 + 可选 `skill_memories` / `skill_versions`  
4. Redis `panda:{id}:review` / `:skill` 事件（当前 worker 未 publish）  
5. 下 tick `DecisionPipeline` Step3 出现 skill memory correction  

#### Known Gaps（如实记录）

1. **Training Ledger 未接线**：`TradeFactWriter` 不设置 `closed_at` / entry·exit 价，也不 enqueue `position_closed` → Epic 7 worker 对真实热路径 Trade Fact **尚不可用**。  
2. **无 DB 集成测试**：`run_review_for_fact` / `apply_skill_update_from_review` 未覆盖。  
3. **7.5 两项命名偏高**：`supported`/`verified` 单测只验 hypothesis 状态，未验 skill 表写入。  
4. **Redis 实时事件未发出**：`publish_review` / `publish_skill` 未被 worker 调用；且 `event_publisher.py` 存在重复 `publish_review` 定义（后者覆盖前者）。  
5. **无后台常驻 dispatcher**：`process_pending_jobs` 仅在 POST review 时同步调用。  
6. **设计稿组件未齐**：`HypothesisLifecycle` · `ReviewTimeline` · `LearningBoundaryNotice` 未实现。

#### Verdict

| 层级 | 结论 |
|------|------|
| 数据模型 / migration 脚本 | ✅ 通过（静态） |
| Review 纯逻辑 + 单元测试 | ✅ 通过 |
| Worker / API / 前端页面代码 | ✅ 已交付 |
| Training Ledger → Review 热路径 | ❌ 未接线 |
| DB / HTTP / E2E 集成 | ⏸ 未验证（环境 + 上游缺口） |
| Epic 7 完整闭环（按 TODO Done standard） | ⚠️ **部分完成** |

**结论**：Epic 7 **模块已实现**，但 **尚未与 Epic 5 Training Ledger 平仓事实闭环**；在 DB 可达环境补集成测试 + 热路径接线前，不应标记为「全量已验证」。

---

### 3.8 Epic 8 — Safety And Owner Controls

> **验证状态**：⚠️ 部分验证（2026-06-17）  
> **Done standard**（摘自 TODO）：用户可 pause / revoke / tighten policy；backend `PolicyGate` 与 Move demo PTB 路径均遵守新 policy 状态。

#### Deliverables

| 类别 | 内容 |
|------|------|
| Move | `trading_policy::pause_policy` · `revoke_agent` · `tighten_policy`（`update_policy` 别名）· 事件 `TradingPolicyPaused` / `AgentRevoked` / `TradingPolicyUpdated` |
| Backend | `safety_service.py` · `agent_wallet_event_parser`（owner action 事件）· `policy_gate`（`POLICY_AGENT_REVOKED` / `POLICY_MIRROR_STALE`）· `sync_owner_action_from_tx` + pause/revoke 取消 pending proof jobs |
| API | `GET /panda/:id/safety` · `POST /panda/:id/safety/owner-action`（兼容 `POST /panda/:id/agent-wallet/owner-action`） |
| Frontend | `/safety/[id]` · `EmergencyControlsPage` · `useSafetyControls` · `lib/sui/ownerPolicyActions.ts` · BFF `/api/panda/[id]/safety*` |
| 错误码 | `POLICY_AGENT_REVOKED` · `POLICY_MIRROR_STALE`（`schemas/errors.py`） |

#### Files Touched（Epic 8 核心）

**新建**：`backend/app/services/safety_service.py` · `backend/app/api/panda_safety.py` · `backend/tests/test_safety.py` · `frontend/src/types/safety.ts` · `frontend/src/services/safety.service.ts` · `frontend/src/lib/sui/ownerPolicyActions.ts` · `frontend/src/hooks/useSafetyControls.ts` · `frontend/src/components/safety/*` · `frontend/src/app/safety/[id]/page.tsx` · `frontend/src/app/api/panda/[id]/safety/*`

**修改**：`contracts/sources/trading_policy.move` · `contracts/tests/agent_wallet_tests.move` · `backend/app/services/agent_wallet.py` · `backend/app/services/agent_wallet_event_parser.py` · `backend/app/services/policy_gate.py` · `backend/app/services/policy_compatibility.py` · `backend/app/engine/panda_actor.py` · `backend/app/api/router.py` · `backend/tests/test_policy_gate.py` · `backend/tests/test_agent_signer.py`

#### TODO Checklist Snapshot（`dev-docs/TODO.md` §8）

| 小节 | TODO 勾选 | 本次验证结论 |
|------|-----------|--------------|
| 8.1 Move Owner Controls | 6/6 ✅ | Move 单测覆盖 pause/revoke/loosen 阻断 ✅ |
| 8.2 Backend Mirror And Hot Path | 5/5 ✅ | 单元测试 + 静态代码 ✅；DB 集成 / job 取消落库 ⏸ |
| 8.3 Frontend Safety Page | 6/6 ✅ | 组件与路由存在 + `tsc` ✅；浏览器手测 ⏸ |
| 8.4 Tests | 5/5 ✅ | 见下方 pytest / Move 矩阵；无专用 vitest / E2E |

#### Verification Runs (2026-06-17)

| # | 命令 / 检查 | 结果 | 详情 |
|---|-------------|------|------|
| 1 | `cd contracts && sui move test` | ✅ PASS | **27/27**；含 `test_paused_policy_blocks_demo_executor` · `test_revoked_agent_blocks_demo_executor` · `test_non_owner_cannot_loosen_policy` |
| 2 | `cd backend && pytest tests/test_safety.py tests/test_policy_gate.py tests/test_agent_signer.py -q` | ✅ PASS | **16/16**（见 §3.8.1 用例映射） |
| 3 | `cd frontend && pnpm exec tsc --noEmit` | ✅ PASS | 零 TS 错误（含 Safety 类型与页面） |
| 4 | 静态交付物检查（关键文件 + 符号存在） | ✅ PASS | `pause_policy` / `panda_safety` / `EmergencyControlsPage` / `buildTightenPolicyTx` 等 |
| 5 | `cd frontend && pnpm run build` | ❌ FAIL | **非 Epic 8 专属**：`/agent-wallet` 缺 Suspense 导致 prerender 失败；`/safety/[id]` 未单独报错 |
| 6 | `pytest` 集成：`cancel_pending_chain_proof_jobs` / `sync_owner_action_from_tx` | ⏸ 未跑 | 无对应测试文件；依赖 PostgreSQL 的 API 集成 ⏸（见 §1） |
| 7 | 浏览器手测：Pause → 签名 → mirror 更新 | ⏸ 未跑 | 需本地 wallet + 已 publish 合约 + backend |
| 8 | Testnet 链上 owner action（pause/revoke/tighten PTB） | ⏸ 未跑 | 需钱包签名与 republish 后 `tighten_policy` 入口 |

##### 3.8.1 自动化用例 ↔ TODO §8.4 映射

| TODO §8.4 项 | 验证方式 | 结果 |
|--------------|----------|------|
| Paused policy blocks Training Ledger execution | `test_policy_gate.py::test_paused_policy_rejects` | ✅ |
| Paused policy aborts demo executor Move path | `agent_wallet_tests::test_paused_policy_blocks_demo_executor` | ✅ |
| Revoked signer blocks AgentSignerService | `test_agent_signer.py::test_signer_rejects_revoked_agent` | ✅ |
| Tightened max notional rejects previously valid intent | `test_safety.py::test_tightened_max_notional_rejects_previously_valid_intent` | ✅ |
| Mirror stale state blocks execution safely | `test_safety.py::test_mirror_stale_blocks_execution` | ✅ |

##### 3.8.2 代码存在但未自动验证的路径

| 路径 | 说明 |
|------|------|
| `cancel_pending_chain_proof_jobs` | 实现于 `safety_service.py`，由 `sync_owner_action_from_tx` 在 pause/revoke 时调用；**无单测** |
| `ChainExecutionWorker` + paused/revoked | worker 经 `AgentSignerService.validate_preconditions` 阻断；仅有 signer 单测，**无 worker 级 paused 集成测** |
| `fetch_owner_action_from_tx` 真实 Sui RPC | 仅有 `parse_owner_action_from_tx` 单元测；**未对真实 tx digest 拉取** |
| Frontend 钱包签名 + mirror sync 闭环 | UI 与 PTB builder 已落地；**未手测** |

#### How to Re-Run（验证方法速查）

```bash
# 1) Move — owner controls + demo executor 阻断
cd contracts && sui move test

# 2) Backend — PolicyGate / Safety / AgentSigner 单元测试
cd backend && python -m pytest \
  tests/test_safety.py \
  tests/test_policy_gate.py \
  tests/test_agent_signer.py \
  -v

# 3) Frontend — 类型检查（Safety 页面）
cd frontend && pnpm exec tsc --noEmit

# 4) 静态交付物（可选，仓库根目录）
python3 -c "
import os
pairs = [
  ('contracts/sources/trading_policy.move', ['pause_policy','revoke_agent','tighten_policy']),
  ('backend/app/api/panda_safety.py', ['get_safety']),
  ('frontend/src/components/safety/EmergencyControlsPage.tsx', ['EmergencyControlsPage']),
]
for p, keys in pairs:
    t=open(p).read()
    assert all(k in t for k in keys), p
print('static OK')
"

# 5) API 烟雾（需 backend 运行 + JWT + 已有 Panda）
# curl -H "Authorization: Bearer $JWT" http://localhost:8000/panda/$PANDA_ID/safety

# 6) DB 集成（§1 环境可达时）
# — 创建 pending chain_proof_requested job → owner pause → 断言 job.status=cancelled

# 7) 浏览器手测清单
# — 打开 /safety/{pandaId}
# — Pause：Danger modal → 钱包签名 → RiskStatusBanner=paused → PolicyResult drawer 有 tx digest
# — Training Ledger：确认 paper 执行被 PolicyGate 拒绝
# — Revoke：Chain Proof 请求被 AgentSigner 拒绝
# — Tighten：drawer 输入更低 cap → 签名 → policy version 递增
```

#### Expected Pass (full Epic 8 closure)

- Move **27/27** + backend Epic 8 pytest **16/16** + frontend `tsc` 零错误
- DB 可达时：`POST .../safety/owner-action` 镜像 `trading_policies` / `panda_vaults`；pause/revoke 后 pending `async_jobs` 为 `cancelled`
- Testnet：owner 签名 pause/revoke/tighten 三笔 tx 成功，backend mirror `synced`
- 浏览器：§3.8.2 手测清单全绿

#### Verdict

| 层级 | 结论 |
|------|------|
| 代码交付（TODO §8 勾选） | ✅ 与 `dev-docs/TODO.md` 一致 |
| 合约 + 单元测试自动化 | ✅ 通过 |
| 前端类型 / 静态结构 | ✅ 通过 |
| 全站 `pnpm run build` | ❌ 失败（`/agent-wallet` Suspense，非 Safety 专属） |
| DB / API / 链上 / 浏览器 E2E | ⏸ 未验证（环境或未执行） |
| **Epic 8 完整闭环** | **⚠️ 部分验证** — 自动化层可合并；生产验收需补 §3.8.2 + DB/链上手测 |

---

### 3.9 Epic 9 — Trust, Merkle, Walrus

**验证状态**：⚠️ 部分验证（2026-06-17）  
**Done standard**（摘自 TODO）：Trade Fact 批次与 Skill Memory digest 可锚定；长期证据可归档且不阻塞热路径。

#### Deliverables

| 类别 | 内容 |
|------|------|
| Merkle 叶子 / 树根 | `backend/app/engine/merkle_worker.py` — `trade_fact_leaf` / `compute_merkle_root` / `persist_merkle_batch` |
| Merkle 服务 | `backend/app/services/merkle_service.py` — 确定性 batch 加载、`batch_trade_id_range`、状态查询 |
| 链上信任提交 | `backend/app/services/trust_proof_service.py` — `submit_merkle_root` / `submit_skill_digest`（无密钥时 dry-run） |
| 异步 Worker | `merkle_worker.py` · `skill_digest_worker.py` · `walrus_sync_worker.py` |
| 队列分发 | `queue_dispatcher.py` 注册 `merkle_batch_ready` / `skill_digest_requested` / `walrus_archive_requested` |
| 热路径触发 | `panda_actor.py` 每 `MERKLE_BATCH_SIZE` enqueue job（非同步写库） |
| Review/Skill 侧效应 | `review_service.py` enqueue Walrus；`skill_memory_worker.py` enqueue skill digest + Walrus |
| Move 合约 | `trust_proof.move` — `submit_merkle_root` + 新增 `submit_skill_digest` |
| Migration | Alembic `006_trust_merkle_columns`（`root_type` / `start_fact_id` / `end_fact_id`） |
| API | `GET /panda/:id/trust/merkle` · `.../merkle/history` · `.../trust/skill-digest` |
| Frontend | `trust.service.ts` + BFF 代理 + `TrainingStatusStrip` Merkle 状态展示 |

#### Files Touched (Epic 9)

**新建**：`merkle_service.py` · `trust_proof_service.py` · `workers/merkle_worker.py` · `workers/skill_digest_worker.py` · `workers/walrus_sync_worker.py` · `api/panda_trust.py` · `006_trust_merkle_columns.py` · `tests/test_merkle_epic9.py` · `frontend/src/services/trust.service.ts` · `frontend/src/app/api/panda/[id]/trust/*`

**修改**：`engine/merkle_worker.py` · `engine/panda_actor.py` · `workers/queue_dispatcher.py` · `workers/skill_memory_worker.py` · `services/review_service.py` · `db/models.py` · `config.py` · `.env.example` · `contracts/sources/trust_proof.move` · `contracts/tests/core_tests.move` · `TrainingStatusStrip.tsx` · `training-ledger/[id]/page.tsx`

#### TODO Checklist Snapshot

| 项 | TODO | 代码存在 | 自动验证 |
|----|------|----------|----------|
| Merkle 树算法基线 | ✅ | ✅ | ✅ pytest |
| 叶子改为 `trade_facts` | ✅ | ✅ | ✅ `trade_fact_leaf` 测试 |
| 按 Panda + batch_index 确定性 root | ✅ | ✅ | ✅ `load_batch_facts` / `batch_trade_id_range` |
| 持久化 root + leaf count | ✅ | ✅ | ⚠️ 无 DB 集成测 |
| 链上提交 Merkle root | ✅ | ✅ | ⚠️ 仅 dry-run 单测 |
| 前端展示 Merkle 状态 | ✅ | ✅ | ⚠️ 无浏览器 smoke |
| Skill version digest | ✅ | ✅ | ✅ `compute_skill_hash` 已有（Epic 7） |
| 链上提交 skill digest | ✅ | ✅ | ⚠️ 仅 dry-run；合约未 republish |
| digest tx 回写 `skill_versions` | ✅ | ✅ | ⚠️ 无 DB 集成测 |
| Skill digest 异步可重试 | ✅ | ✅ | ✅ 静态：`async_jobs` + `max_attempts` |
| Walrus review/skill 归档 job | ✅ | ✅ | ✅ skip-when-unconfigured 单测 |
| blob id 写入 DB | ✅ | ✅ | ⚠️ 无真实 Walrus 上传测 |
| 不阻塞热路径 | ✅ | ✅ | ✅ 静态：enqueue 在 review/skill worker |
| 失败可见于 async job | ✅ | ✅ | ✅ 静态：`last_error` / `status` |

#### Verification Runs (2026-06-17)

| # | 命令 / 检查 | 结果 | 详情 |
|---|-------------|------|------|
| A | `pytest tests/test_merkle.py tests/test_merkle_epic9.py -v` | ✅ PASS | **16/16** passed |
| B | `cd contracts && sui move test` | ✅ PASS | **27/27** passed；含 `test_submit_and_verify_merkle_root`、`test_submit_skill_digest` |
| C | `pytest tests/test_migration_003.py tests/test_migration_004.py -q` | ✅ PASS | 9 passed（**不含** `006` 专用结构测） |
| D | Alembic head 链检查（无 DB） | ✅ PASS | `head: 006_trust_merkle_columns` |
| E | Epic 9 模块 import 冒烟 | ✅ PASS | 7 个模块可 import；`merkle_submit_enabled=True` |
| F | 静态接线：`queue_dispatcher` job types | ✅ PASS | `merkle_batch_ready` / `skill_digest_requested` / `walrus_archive_requested` |
| G | 静态：`panda_actor` 改 enqueue | ✅ PASS | `_enqueue_merkle_batch`；无 `persist_merkle_batch` 同步调用 |
| H | `cd frontend && pnpm type-check` | ✅ PASS | 零 TS 错误（2026-06-17 复验） |
| I | Epic 9 相关 TS 文件过滤检查 | ✅ PASS | trust / TrainingStatusStrip 无专属错误 |
| J | `alembic current` | ❌ FAIL | `asyncpg` **TimeoutError**（见 §1）；`006` **未在本环境落地** |
| K | `python scripts/verify_db.py` | ⏸ 未跑 | 依赖 DB；且脚本**尚未**校验 `006` 新列 |
| L | 真实 Sui Merkle / Skill digest PTB | ⏸ 未跑 | 需 `SUI_PRIVATE_KEY` + `ADMIN_CAP_ID` + 合约 **republish** |
| M | 真实 Walrus 上传 | ⏸ 未跑 | 需可达 `WALRUS_PUBLISHER_URL`；仅测 unconfigured skip |
| N | 浏览器 Training Ledger Merkle 条 | ⏸ 未跑 | 需登录 + 有 Panda + JWT |
| O | `async_jobs` 端到端（50 笔 → Merkle job → worker） | ⏸ 未跑 | 需 DB + 训练会话或集成测试 |

#### How to Verify (可复制命令)

**1. 后端单元 / 逻辑（无需 DB）**

```bash
cd backend
pytest tests/test_merkle.py tests/test_merkle_epic9.py -v
```

**2. Move 合约（Merkle + Skill digest）**

```bash
cd contracts
sui move test
# 仅 trust_proof 相关：
sui move test --filter core_tests
```

**3. 迁移链与结构（无需 DB 连通）**

```bash
cd backend
python -c "from alembic.config import Config; from alembic.script import ScriptDirectory; s=ScriptDirectory.from_config(Config('alembic.ini')); print(s.get_current_head())"
# 期望：006_trust_merkle_columns
pytest tests/test_migration_003.py tests/test_migration_004.py -q
```

**4. 数据库落地（需可达 `DATABASE_URL`）**

```bash
cd backend
alembic upgrade head
alembic current   # 期望 revision 含 006
python scripts/verify_db.py
# 手动确认 merkle_roots 有 root_type / start_fact_id / end_fact_id：
# psql $DATABASE_URL -c "\d merkle_roots"
```

**5. 链上提交（Testnet，可选）**

```bash
# backend/.env 配置：
# SUI_PRIVATE_KEY=...
# ADMIN_CAP_ID=0xf6ff3f496b7471353dc2ea3c7732cd822f596cdb62d27bdb0362171862b60a00
# PACKAGE_ID=...（republish 后更新）
# MERKLE_SUBMIT_ENABLED=true
# SKILL_DIGEST_ENABLED=true

# 先 republish 合约（含 submit_skill_digest）后，触发 50 笔训练或手动 dispatch：
cd backend
python -c "
import asyncio
from app.db.database import AsyncSessionLocal, ensure_engine
from app.workers.queue_dispatcher import process_pending_jobs
async def main():
    ensure_engine()
    async with AsyncSessionLocal() as s:
        print(await process_pending_jobs(s, limit=5))
asyncio.run(main())
"
# 检查 merkle_roots.sui_tx_digest / skill_versions.submitted_tx_digest
```

**6. Walrus 归档（可选）**

```bash
# 配置 WALRUS_PUBLISHER_URL + WALRUS_AGGREGATOR_URL
# 完成一笔 review 后检查 async_jobs job_type=walrus_archive_requested
# 以及 pandas.walrus_blob_id 或 skill_versions.walrus_blob_id
```

**7. 前端 API + UI**

```bash
cd frontend
pnpm type-check
pnpm build

# 登录后（浏览器 DevTools Network）：
# GET /api/panda/{id}/trust/merkle
# Training Ledger 页状态条应显示 "Merkle batch #N pending|on-chain"
```

**8. API 冒烟（需 backend + JWT）**

```bash
curl -s -H "Authorization: Bearer $JWT" \
  http://localhost:8000/panda/$PANDA_ID/trust/merkle | jq
curl -s -H "Authorization: Bearer $JWT" \
  http://localhost:8000/panda/$PANDA_ID/trust/skill-digest | jq
```

#### Expected Pass (full Epic 9 closure)

| 层级 | 期望 |
|------|------|
| 纯逻辑 | pytest Merkle 16/16；Move 27/27 |
| DB | `alembic` @ `006`；`merkle_roots` 新列存在；batch 行 `trade_count`/`root_hash` 正确 |
| 异步 | `async_jobs` 三类 job 可 pending→completed；失败时 `last_error` 可见 |
| 链上 | `merkle_roots.sui_tx_digest` 非 dry-run（或明确记录 dry-run 环境） |
| Walrus | `walrus_blob_id` 写入；热路径 review 不等待上传 |
| 前端 | Training Ledger 展示最新 Merkle 批次状态 |

#### Gaps / Not Yet Verified

| 缺口 | 说明 |
|------|------|
| 无 `test_migration_006.py` | `006` 列仅 ORM + migration 文件，无专用结构单测 |
| `verify_db.py` 未覆盖 `006` 列 | 仅列 `merkle_roots` 表名，不查 `root_type` 等 |
| 无 Merkle/Skill DB 集成测 | Worker 与 `merkle_roots` / `skill_versions` 写回未在 pytest+PG 验证 |
| 链上提交仅 dry-run | 本环境未配置私钥；且 `submit_skill_digest` 需合约 republish |
| Walrus 仅 unconfigured 路径 | 未对真实 publisher 做上传/回写集成测 |
| 无 E2E 50 笔 → Merkle job | 需运行 Training Ledger + worker dispatcher |
| 无浏览器手测记录 | Merkle 状态条 UI 未在本台账记录截图/Network 证据 |

#### Verdict

| 层级 | 结论 |
|------|------|
| 代码 / 单测 / Move 测试 | ✅ 通过 |
| 迁移脚本（链上 head） | ✅ 通过（静态） |
| 数据库落地（`006`） | ⏸ 未验证（§1 DB 不可达） |
| 真实链上 Merkle / Skill digest | ⏸ 未验证 |
| 真实 Walrus 上传 | ⏸ 未验证 |
| 前端类型 / 接线 | ✅ 通过 |
| Epic 9 完整闭环 | ⚠️ **部分完成** — 可合并代码，生产前须 DB 迁移 + 可选链上/Walrus 环境验收 |

---

### 3.10 Epic 10 — Frontend Product Integration

> **验证状态**：⚠️ 部分验证（2026-06-17）  
> **Done standard**（摘自 TODO）：生产前端遵循 `docs/design/`；默认展示任务/状态；证据经 modal/drawer/toast 渐进披露。

#### Deliverables

| 类别 | 内容 |
|------|------|
| 共享交互 | `frontend/src/lib/ui/{routeJump,productToast,disclosure,index}.ts` · `components/ui/{Modal,Drawer}.tsx`（`variant="product"`） |
| 产品画布 | `components/layout/ProductPageShell.tsx`（low/medium/high/urgent 密度） |
| 视觉 token | `styles/tokens.css`（`--color-void`/`--color-gold`/`--color-neon-green` 等）· `tailwind.config.ts` `product.*` |
| MVP 旅程页 | `/mint` · `/agent-wallet` · `/strategy/[id]` · `/training-ledger/[id]` · `/chain-proof` · `/review` · `/safety/[id]` |
| 路由跳转 | `routeJump.ts`：`agentWalletSetupPath` → `strategyPath` → `trainingLedgerPath` → `chainProofPath` / `reviewPath` / `safetyPath` |
| 测试 | `src/lib/ui/routeJump.test.ts` · `src/lib/mint/mint.smoke.test.ts` |

#### TODO Checklist Snapshot（`dev-docs/TODO.md` §Epic 10）

| 小节 | TODO 勾选 | 验证结论 |
|------|-----------|----------|
| 10.1 共享交互系统 | 5/5 ✅ | ⚠️ 代码存在；build 阻塞项见下表 |
| 10.2 页面构建 | 7/7 ✅ | ⚠️ 路由与组件齐全；视觉对齐未做像素级对比 |
| 10.3 视觉系统 | 4/4 ✅ | ⚠️ product token 已落地；Chain Proof 首屏仍有 mono id |

#### Verification Runs (2026-06-17)

环境：macOS · Node/pnpm 见 `frontend/package.json` · **未启动浏览器手测** · **未跑 Playwright/视口回归**

| # | 命令 / 检查 | 结果 | 详情 |
|---|-------------|------|------|
| A | `cd frontend && pnpm exec vitest run` | ✅ PASS | 2 files, **9** tests passed（`routeJump` 4 + `mint.smoke` 5） |
| B | `cd frontend && pnpm exec tsc --noEmit` | ❌ FAIL | `TS6053`：`.next/types/**/*.ts` 缺失（无完整 `next build` 产物时常见）；**不代表 src 类型错误** |
| C | `cd frontend && pnpm run build` | ❌ FAIL | 编译与 **Linting and checking validity of types** 通过；静态导出失败：`/agent-wallet` 的 `useSearchParams()` **未包在 `<Suspense>`**（Next.js prerender error） |
| D | 静态：Epic 10 交付文件存在性 | ✅ PASS | `src/lib/ui/*` · `Modal` · `Drawer` · `ProductPageShell` · `safety/[id]/page.tsx` 均存在 |
| E | 静态：`ProductPageShell` + `DisclosureL0` 接线 | ✅ PASS | agent-wallet / strategy / training-ledger / chain-proof / review / safety 已接；mint 用 `bg-[#0d1421]` 低密度舞台（未用 Shell，符合 mint 设计） |
| F | 静态：Drawer 移动端 bottom sheet | ✅ PASS | `Drawer.tsx`：`inset-x-0 bottom-0 max-h-[85dvh]` + `md:right-0` 右侧抽屉 |
| G | 静态：L3 / System Notes 不进生产 UI | ✅ PASS | `grep` 无 `System Notes`；`assertNotL3InProduction` 仅 `disclosure.tsx` 守卫 |
| H | 静态：首屏避免完整 hash/id | ⚠️ PARTIAL | Mint/Strategy/Review 证据在 drawer；**Chain Proof** 主画布仍渲染 `agent_signer.address`、vault/policy 短 id（`ChainProofPageClient.tsx`）；Safety 结果 drawer 用 `TruncatedEvidence` |
| I | 静态：情绪系数不暴露 | ✅ PASS | MVP 旅程 `app/**` 无 `emotion_stability`/`ghost_weight` 用户文案（dashboard 等 legacy 页仍有 `patience` 展示，非 Epic 10 主路径） |
| J | 手测：desktop + mobile 全旅程布局 | ⏸ 未执行 | 无自动化视口测试；需浏览器 DevTools 或真机 |
| K | 手测：modal/drawer/toast 交互闭环 | ⏸ 未执行 | 需连钱包 + 后端；本记录未跑 |

#### Recommended Verification Commands（可复现）

```bash
# 1) 单元 / smoke（Epic 10 直接覆盖）
cd frontend && pnpm exec vitest run

# 2) 生产构建（Epic 10 当前阻塞点）
cd frontend && pnpm run build

# 3) 类型检查（建议先 build 一次，或清理陈旧 .next）
cd frontend && pnpm run build && pnpm run type-check

# 4) 静态：旅程路由 helper
cd frontend && pnpm exec vitest run src/lib/ui/routeJump.test.ts

# 5) 静态：product 壳与披露组件接线
rg 'ProductPageShell|DisclosureL0|variant="product"' frontend/src/app frontend/src/components

# 6) 静态：Drawer 移动/桌面形态
rg 'bottom-0|md:right-0' frontend/src/components/ui/Drawer.tsx

# 7) 手测清单（浏览器，需 dev server + 登录钱包）
#    pnpm dev → 依次打开：
#    /mint → /agent-wallet?panda=… → /strategy/:id → /training-ledger/:id
#    → Trade Fact drawer → /chain-proof?panda=&fact= → /review?panda=&fact= → /safety/:id
#    每页：375px 与 1280px 视口；确认主 CTA 可见、证据在 drawer/modal、toast 非唯一成功来源
```

#### Known Gaps（如实）

1. **`pnpm build` 失败**：`/agent-wallet` 需像 `/chain-proof`、`/review` 一样拆 `Suspense` 边界，否则 Epic 11「frontend build」验收无法通过。  
2. **Chain Proof 首屏证据**：仍显示 signer 地址与 object 短 id，与 `docs/design`「L2 默认隐藏」不完全一致。  
3. **移动端/桌面布局**：仅有 CSS 响应式类，**无**自动化截图或 Playwright 回归。  
4. **Landing `/` 与 legacy `/dashboard`**：仍为浅色 SaaS 风格，不在 Epic 10 MVP 七页清单内，但未统一黑金 product 主题。

#### Verdict

| 层级 | 结论 |
|------|------|
| 共享交互代码与旅程路由 | ✅ 已交付且 vitest 通过 |
| Next.js 生产构建 | ❌ 未通过（agent-wallet Suspense） |
| 设计对齐（首屏证据 / 双端布局） | ⚠️ 部分满足；需手测与 Chain Proof 披露修补 |
| Epic 10 完整闭环 | ⚠️ **部分完成** — 可合并代码，但不宜标为全绿验收 |

---

### 3.11 Epic 11 — MVP Acceptance And Demo Path

> **验证状态**：— 未开始  

_待补充：端到端 demo 脚本、Battle Case 回归、MVP 验收清单逐项勾选。_

---

## 4. Revision History

| 日期 | 变更 |
|------|------|
| 2026-06-17 | **Supabase DB 落地复验**：真实网络下确认 `db.dpezgzzvbpemlgxdogue.supabase.co:5432/postgres` DNS/TCP/SQL 可达；根因是数据库停在 `002_panda_subscribed_pools` 且 public 仅 7 张表；执行 `python -m alembic upgrade head` 至 `006_trust_merkle_columns (head)`；`python scripts/verify_db.py` 通过 31 张表 + 8 个关键索引；§1 与 §3.0 更新为 ✅ |
| 2026-06-17 | **Epic 0 补全**：术语审计 + legacy 产品文案重命名；`api-specification.md` v3.1 端点表（22 条）；`spec.md` §8 REST 映射；确认 `PandaActor`→`TradeFactWriter` 热路径；§3.0 checklist 全绿（DB 落地仍 ⏸） |
| 2026-06-17 | **Epic 9 自动验证**：pytest Merkle 16/16、`sui move test` 27/27、Alembic head=`006_trust_merkle_columns`、前端 `pnpm type-check` ✅；`alembic current` Timeout、`006` 未落地、真实链上 PTB/Walrus 上传/E2E 50 笔/浏览器 smoke ⏸；§3.9 完整记录；判定 **⚠️ 部分验证** |
| 2026-06-17 | Epic 5 自动验证：pytest 22/22（PolicyGate·Ledger snapshot·stale gate·migration 004）+ 静态 API/WS/前端资产；`verify_db` Timeout；记录 async_jobs 未写、无热路径集成测、Ledger 变异/rollback 测缺失 → §3.5 **⚠️ 部分验证** |
| 2026-06-17 | Epic 6 自动验证：Move 27/27、backend pytest 16/16、type-check ✅、vitest routeJump 4/4；DB/testnet E2E ⏸；`pnpm build` ❌（`/agent-wallet`）；§3.6 完整记录；判定 **⚠️ 部分验证** |
| 2026-06-17 | Epic 2 **复验**（Cursor Agent）：`sui move test` **27/27** · `sui move test agent_wallet` **12/12** · `pytest tests/test_agent_wallet.py tests/test_migration_004.py tests/test_safety.py tests/test_agent_signer.py` **19/19** · `npm run type-check` ✅ · `verify_db.py` ❌ Timeout · `npm run build` ❌ `/agent-wallet` Suspense；§3.2 结论维持 **⚠️ 部分验证** |
| 2026-06-17 | Epic 10 自动验证：vitest 9/9 ✅、`pnpm build` ❌（`/agent-wallet` Suspense）、静态交付物 + product 接线 ✅、Chain Proof 首屏 id ⚠️、双端手测 ⏸；§3.10 完整记录；判定 **⚠️ 部分验证** |
| 2026-06-17 | Epic 1 自动验证：`sui move test mint_tests` 3/3、backend mint pytest 11/11、frontend vitest 9/9、`tsc`、Testnet RPC Package/Registry；§3.1 完整记录；结论 **⚠️ 部分验证**（缺 DB HTTP 集成 + 钱包/浏览器 E2E） |
| 2026-06-17 | Epic 2 自动验证：Move 27/27、backend Epic2 相关 pytest 19/19、frontend type-check ✅；`verify_db` Timeout、`npm run build` `/agent-wallet` prerender 失败；记入 §3.2 |
| 2026-06-17 | Epic 4 自动验证：pytest 19+31 项绿；静态交付物 + `routeJump` vitest 绿；§3.4 逐项 TODO 表与命令清单；判定 **⚠️ 部分验证**（DB/API/浏览器未跑） |
| 2026-06-17 | Epic 7 自动验证：`test_review_logic.py` 6/6、`test_migration_004.py` 5/5；静态盘点 API/worker/前端；记录 Training Ledger 未接线、`TradeFactWriter` 缺 review 字段、无 DB/E2E 等缺口 → §3.7 **⚠️ 部分验证** |
| 2026-06-17 | Epic 3 自动验证：monitor pytest 51/51 + Epic3 专项 27/27 + backend `test_market_event` 7/7 + websocket 17/17；live `/health`·`/pairs`·`/candles` + Redis `market:tick`×2；§3.3 完整记录；判定 **⚠️ 部分验证**（testnet VPS 池通过；mainnet launch pairs + frontend E2E 未验） |
