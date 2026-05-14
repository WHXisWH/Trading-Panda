# TradingPanda 产品与进度上下文

> 本文档以「忒修斯之船」方式持续维护，记录产品目标、当前状态、里程碑进展和下一步行动项。
> 最后更新：2026-05-13（WebSocket Hub：Cloudflare Workers + DO 文档同步）

**与 `dev-docs/DEV_CONTEXT.md` 的关系**：DEV_CONTEXT.md 写「部署事实」（环境变量、端口、API路径、数据库结构），本文写「产品与进度事实」；**两份文档都由 §9 变更日志承接时间轴**，任何合并级改动必须在 `DEV_CONTEXT.md` §9 追加一行，保证「谁改了什么」可查。

---

## §1 产品概述（为什么做）

### 1.1 产品目标

TradingPanda 是 Sui 链上的 **AI 交易宠物养成系统**，目标是 **Sui Overflow 2026 黑客松**（2026年5-6月）。

核心价值主张：
- 用户铸造熊猫 NFT（性格五轴由 `sui::random` 生成，不可更改）
- 用户用自然语言喂给熊猫交易策略，熊猫在模拟盘自主练习交易
- 熊猫通过盈亏获得经验、改变情绪、成长进化（幼年→成长→成熟）
- 经验数据可验证（Merkle Root 每50笔上链），熊猫可在 Kiosk 市场买卖

**一句话**：养一只会交易的 AI 熊猫。

### 1.2 黑客松定位

| | 竞品 | TradingPanda |
|---|------|--------------|
| 用户角色 | 交易者 | **训练者/主人** |
| AI 角色 | 工具/引擎 | **伙伴/学徒** |
| 情感连接 | 无 | **宠物养成** |
| NFT 价值 | 无 | **性格稀缺性+训练价值** |

### 1.3 路线图

| 阶段 | 时间 | 目标 |
|------|------|------|
| **黑客松 MVP** | 2026/5–6月 | 铸造+喂策略+模拟盘+市场+排行榜+成就+签到 |
| **测试网** | 2026/7月 | 情绪系统完善、环境感知 Lv.1-3、DeepBook 实时数据 |
| **主网 Alpha** | 2026/9月 | Walrus 完整集成、Kiosk 市场、Nautilus TEE |
| **主网 Beta** | 2026/11月 | 社交模块、师承、策略模板市场 |
| **Pro 版** | 2027 Q1 | 实盘接入、多熊猫 Portfolio |

---

## §2 当前状态总览

### 2.1 里程碑进度

| 里程碑 | 状态 | 进度 | 负责人 | 备注 |
|--------|------|------|--------|------|
| 项目骨架 | ✅ 完成 | 100% | — | frontend/backend/contracts 目录结构、CLAUDE.md、DEV_CONTEXT.md |
| Sui Move 合约 | 🟡 本地实现完成 | 70% | — | 核心模块按 `docs/contract-design.md` 实现，`sui move test` 通过 11/11；待重新部署 Testnet 与 5% Kiosk 版税深化 |
| PostgreSQL Schema | ⏸️ 待开始 | 0% | — | Alembic 首个迁移文件待写 |
| 钱包登录（JWT） | ⏸️ 待开始 | 0% | — | Sui signature verify + JWT 签发 |
| Onboarding 问卷 | ⏸️ 待开始 | 0% | — | 5步问卷 + 推导 experience_level |
| 铸造流程（Mint） | ⏸️ 待开始 | 0% | — | 合约 mint() + 前端 MintPage |
| 策略解析 | ⏸️ 待开始 | 0% | — | DeepSeek V3 接入 → 四层结构化 |
| 8步决策引擎 | ⏸️ 待开始 | 0% | — | Python DecisionPipeline 核心实现 |
| 情绪状态机 | ⏸️ 待开始 | 0% | — | 骨架已建，逻辑待完善 |
| 经验引擎（5子系统） | ⏸️ 待开始 | 0% | — | PostgreSQL 读写 |
| Merkle Root Worker | ⏸️ 待开始 | 0% | — | 每50笔 → 上链 |
| WebSocket 实时推送 | ⏸️ 待开始 | 0% | — | **Cloudflare Workers + DO** Hub ↔ 与 DE 同一 Redis Pub/Sub（设计见 `docs/websocket-hub-design.md`）；实现与生产 URL 待定 |
| Dashboard 前端 | ⏸️ 待开始 | 0% | — | K线 + 决策链可视化 + 情绪展示 |
| NFT 市场（Kiosk） | 🟡 合约 MVP | 20% | — | 合约侧已具备 Kiosk 上架/下架/购买骨架；需补 5% TransferPolicy 版税规则、前端 SDK 集成与端到端测试 |
| 排行榜/成就/签到 | ⏸️ 待开始 | 0% | — | |
| Walrus 集成 | ⏸️ 待开始 | 0% | — | 经验数据备份，NFT 转让前强制同步 |
| 黑客松 MVP 验收 | ⏸️ 待开始 | 0% | — | 目标：2026年6月提交 |

### 2.2 当前阻塞项

| 阻塞 | 影响 | 解决方案 |
|------|------|---------|
| DeepBook Testnet Pool 地址 | Dashboard K线数据 | 待部署合约后从 Sui Explorer 获取 |
| Walrus Testnet Publisher URL | 经验数据备份 | 已在 .env.example 填入官方测试节点 |
| Supabase / Render DB 创建 | 后端数据库连接 | 黑客松阶段用 Render 免费 PostgreSQL |
| Panda 转让税强制性 | 项目方 5% 收益能否覆盖所有转让路径 | MVP 采用 Kiosk/TransferPolicy 收二级市场 5% 版税；若要禁止绕过，需在合约层牺牲自由 public transfer，改为受控托管/市场路径 |

---

## §3 已锁定的关键决策

| # | 决策 | 结论 | 锁定时间 | 原因 |
|---|------|------|---------|------|
| C1 | 信任层 | Merkle Root 先行，Nautilus TEE 为正式版 | 2026-05-08 | 黑客松时间限制 |
| C2 | 数据存储 | PostgreSQL（Supabase）+ Walrus 备份 | 2026-05-08 | 无本地 SQLite |
| C3 | MVP 入口 | Web App only，无 Telegram Bot | 2026-05-08 | 降复杂度 |
| C4 | 计算位置 | 全服务端（Python） | 2026-05-08 | 前端零计算 |
| C5 | 实盘 | MVP 不做，DeepBook 仅模拟 | 2026-05-08 | 合规 |
| C9 | 情绪稳定性 | 从 patience 推导，非独立轴 | 2026-05-08 | 简化五轴设计 |
| C11 | 胜率 | 链下 trades 表计算 | 2026-05-08 | 不上链 |
| C12 | 执行阈值 | >0.65 执行 / 0.40-0.65 观望 / <0.40 忽视 | 2026-05-08 | PRD 勘误 |
| C13 | Panda 二级市场收益 | MVP 统一通过 Sui Kiosk + TransferPolicy 收取 5% 版税 | 2026-05-13 | Sui 标准市场兼容、用户体验较好；普通钱包转账不视作市场交易，前端不提供绕过路径 |
| C14 | 实时推送层 | WebSocket Hub 采用 **Cloudflare Workers + Durable Objects**，订阅与 Python DE **同一 Redis**；PostgreSQL 仍为权威存储 | 2026-05-13 | Vercel Serverless 无法常驻长连接；DO 仅存连接/订阅/有界队列等短时状态（见 `docs/websocket-hub-design.md`） |

---

## §4 开发优先级队列（下一步）

按顺序执行，每项完成后更新 §2.1 进度并追加 §9 变更日志：

1. **合约 v2 与市场税** — 将 Panda 市场路径固定为 Kiosk + TransferPolicy 5% 版税，补测试后重新部署 Testnet
2. **数据库 Schema** — 写 Alembic 首个迁移文件（18张表）
3. **钱包登录** — Next.js API route + JWT 签发
4. **策略解析** — DeepSeek V3 接入，`/engine/strategy/parse` 端点
5. **决策引擎核心** — `DecisionPipeline` 8步实现 + 单元测试
6. **情绪状态机** — 完善 transitions + 经 **CF Hub** 的 WebSocket 广播（Redis 发布侧在 Python）
7. **Dashboard MVP** — K线图 + 决策链 + `NEXT_PUBLIC_WS_URL` 接入
8. **铸造前端** — MintPage + 链上 mint() 调用
9. **Merkle Root Worker** — 50笔触发 + 链上提交

---

## §5 技术风险与缓解措施

| 风险 | 影响 | 概率 | 缓解 |
|------|------|------|------|
| DeepSeek API 限流 | 策略解析延迟 | 中 | 本地规则引擎作 fallback |
| Render Free Tier 休眠（15分钟无请求） | Actor 状态丢失 | 高 | 使用 UptimeRobot 保活；Actor 状态持久化到 Redis |
| Supabase Free Tier 500MB 上限 | trades 表增长 | 低 | 90天归档到 Walrus |
| Walrus Testnet 不稳定 | 经验数据备份失败 | 中 | walrus_sync_status='failed' → 自动重试 |
| sui::random 可预测性 | NFT 性格公平性 | 低 | 使用官方 Random 对象，不可操控 |

---

## §9 变更日志（只追加，不改写历史行）

| 日期 | 变更 | 影响 |
|------|------|------|
| 2026-05-10 | **项目骨架初始化**：创建 CLAUDE.md、dev-docs/DEV_CONTEXT.md（部署事实）、dev-docs/DEVELOPMENT_CONTEXT.md（本文，产品进度）、frontend/ Next.js 14骨架、backend/ Python FastAPI骨架、contracts/ Sui Move骨架（8模块）、vercel.json、render.yaml | 仓库从纯文档状态进入可开发状态；骨架可直接 npm install / pip install / sui move build 验证 |
| 2026-05-13 | **合约本地实现与市场税设计同步**：Sui Move 核心模块本地实现完成并通过 `sui move test` 11/11；产品进度更新为合约 70%、Kiosk 市场 20%；新增 C13 决策：Panda 二级市场通过 Sui Kiosk + TransferPolicy 收取 5% 版税。 | 合约进入重新部署前准备阶段；下一步优先补齐 5% 版税规则、市场路径测试与 Testnet 重新发布 |
| 2026-05-13 | **WebSocket Hub 设计写入文档**：新增 C14（Cloudflare Workers + Durable Objects + 与 DE 共用 Redis）；里程碑「WebSocket 实时推送」与优先级队列 6–7 同步为 CF 方案；对齐 `docs/websocket-hub-design.md` 与 `dev-docs/DEV_CONTEXT.md`。 | 架构与调研结论一致；Workers 工程与生产 `NEXT_PUBLIC_WS_URL` 仍为待办 |
