# Dashboard 布局方案 v2（设计稿）

> **状态**：已实现（2026-05-25） · **日期**：2026-05-25  
> **依据**：当前实现（训练条已置顶、方案 A 池订阅）+ 产品需求（区块重排）  
> **关联**：`docs/frontend-design.md` §3.3 · `dev-docs/TODO.md` Epic 3 · Obsidian `dashboard-spec.md`

---

## 1. 设计目标

| 目标 | 说明 |
|------|------|
| **看盘优先** | 中间主栏留给 K 线与训练控制，视线自上而下：训练 → 行情 → 决策/成交 |
| **策略常驻左侧** | 策略积木与熊猫身份同属「养成/配置」区，改策略不必挤在 K 线下方 |
| **账户贴行情** | 权益、持仓、盈亏放在右侧，与 ChartHeader 同一视线高度，模拟盘「账户栏」习惯 |
| **决策可追溯** | 决策链 + 交易历史仍在同一屏，但占主区下方全宽，展开 8 步时有横向空间 |
| **行为不变** | 数据仍全走 BFF/WS；池订阅方案 A、会话制训练、情绪不暴露数值等 PRD 规则不改 |

---

## 2. 现状（v1 · 当前代码）

```
┌──────────┬────────────────────────────────────┬──────────┐
│ 左 180px │ 主栏 flex                           │ 右 170px │
│          │ ┌ DashboardTrainingBar ──────────┐ │          │
│ Panda    │ │ 速度 · 开始训练 · 管理交易池    │ │ Decision │
│ Sidebar  │ └────────────────────────────────┘ │ Panel    │
│ 头像五轴 │ CandlestickChart（池切换+K线）      │          │
│ 天赋情绪 │                                    │ Trade    │
│ 切换熊猫 │ AccountPanel │ StrategyBuilder     │ History  │
│          │ （中间下方 2 列）                   │          │
└──────────┴────────────────────────────────────┴──────────┘
```

**痛点**

- 主区下方同时挤 **账户 + 积木 + 策略摘要**，K 线垂直空间被压缩。
- **决策链 170px** 过窄，8 步展开、规则命中列表易折行。
- 左侧仅「看熊猫」，**改策略**与「看行情」混在同一列，认知负担高。

---

## 3. 新布局 v2（推荐稿）

### 3.1 总览

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Navbar  44px                                                              │
├─────────────┬────────────────────────────────────────────┬───────────────┤
│ 左栏        │ 主栏（看盘 + 决策）                          │ 右栏          │
│ --sidebar-  │                                              │ --account-    │
│  strategy   │  ┌─ DashboardTrainingBar ─────────────────┐  │  panel-width  │
│  260px      │  │ 训练速度 · 开始/暂停 · 管理交易池       │  │  220px        │
│             │  └────────────────────────────────────────┘  │               │
│ ┌─────────┐ │  ChartHeader + CandlestickChart              │ ┌───────────┐ │
│ │熊猫摘要 │ │  （subscribed_pools 池切换 · 1m · 成交标记）   │ │ Account   │ │
│ │紧凑卡片│ │                                              │ │ Panel     │ │
│ └─────────┘ │  ┌─ 主区底栏（全宽）────────────────────────┐  │ │ 权益      │ │
│             │  │ DecisionPanel（实时 / 复盘）              │  │ │ 持仓      │ │
│ Strategy    │  │ ─────────────────────────────────────── │  │ │ 盈亏      │ │
│ Builder     │  │ TradeHistory（可点 → 上方决策切复盘）     │  │ │ 笔数/状态 │ │
│ （可滚动）  │  └────────────────────────────────────────┘  │ └───────────┘ │
└─────────────┴────────────────────────────────────────────┴───────────────┘
```

### 3.2 区块职责

| 区域 | 组件 | 职责 |
|------|------|------|
| **左栏** | `PandaSidebar` | 身份/情绪/小雷达/切换熊猫 |
| **主栏上** | `DashboardTrainingBar` | 训练速度、开始/暂停、跳转 `/pools`（不变） |
| **主栏中** | `CandlestickChart` | K 线 + 池切换（仅 `subscribed_pools`） |
| **主栏下** | `DashboardMainFooter`（新容器） | `DecisionPanel` + `TradeHistory` 纵向或左右分栏 |
| **右栏** | `AccountPanel` + `StrategyBuilder` | 账户快照 + 策略积木（≥1280px）；&lt;1280px 策略走底部抽屉 |

### 3.3 主区底栏内部（二选一，**推荐 A**）

**方案 A — 上下堆叠（推荐）**

- 上：`DecisionPanel`（固定最小高度 ~200px，内容区可滚动）
- 下：`TradeHistory`（`flex-1`，列表 `max-height` + 内部滚动）
- **优点**：8 步决策链展开用满主栏宽度；与「先看决策、再点历史复盘」阅读顺序一致。

**方案 B — 左右分栏（≥1280px）**

- 左 45%：`DecisionPanel`
- 右 55%：`TradeHistory`
- **优点**：一屏同时看到决策与列表；**缺点**：窄屏下决策链仍偏挤。

> **评审默认**：采用 **方案 A**；≥1440px 可选升级为方案 B（实现期再定）。

---

## 4. 栅格与 Token

| Token | v1 | v2 建议 | 说明 |
|-------|-----|---------|------|
| `--sidebar-width` | 180px | **保留** | 其它页沿用 |
| `--sidebar-width-wide` | 260px | **左栏默认** | 策略积木最小舒适宽度 |
| `--decision-panel-width` | 170px | **废弃于 Dashboard** | 决策改主栏底，不再独立右栏 |
| `--account-panel-width` | （无） | **220px** | 复用 `--trading-positions-width` 或新增 |

**Tailwind / layout**

```css
/* 建议 globals.css */
.dashboard-layout-v2 {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}
@media (min-width: 1024px) {
  .dashboard-layout-v2 {
    flex-direction: row;
    align-items: stretch;
  }
}
.dashboard-col-left   { width: 100%; max-width: var(--sidebar-width-wide); }
.dashboard-col-main   { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--spacing-md); }
.dashboard-col-right  { width: 100%; max-width: var(--account-panel-width, 220px); }
.dashboard-main-footer { min-height: 240px; max-height: 38vh; overflow: hidden; display: flex; flex-direction: column; }
```

**K 线高度**：主栏中 Chart 建议 `min-height: 320px`，`flex-shrink: 0`；底栏 `max-height: 38vh` 避免小屏把 K 线挤没。

---

## 5. 组件迁移对照

| 组件 | v1 位置 | v2 位置 | 代码改动量级 |
|------|---------|---------|--------------|
| `PandaSidebar` | 左 180px | 左栏上部 → 拆为 **Compact** 变体 | 中：压缩雷达/五轴为折叠或单行摘要 |
| `StrategyBuilder` | 主栏下左半 | 左栏下部（`overflow-y: auto`） | 小：搬家 + 左栏样式 |
| `DashboardTrainingBar` | 主栏顶 | 主栏顶 | 无 |
| `CandlestickChart` | 主栏 | 主栏 | 无 |
| `AccountPanel` | 主栏下 | **右栏** | 小：包一层 `aside` |
| `DecisionPanel` | 右栏上 | **主栏底** | 小：从 `DashboardRightPanel` 抽出 |
| `TradeHistory` | 右栏下 | **主栏底** | 小：同上 |
| `DashboardRightPanel` | 右栏容器 | **删除或改名为 `DashboardMainFooter`** | 中 |
| 策略摘要 / 熊猫反应文案 | 主栏独立 `<p>` | 左栏 `StrategyBuilder` 下方折叠区 | 小 |

**不改动的数据流**

- `useMarketWs({ pool, pairs: [pool] })`
- `useSimulationWs` → `liveDecision` / trades 增量
- `handlePoolChange` / `subscribed_pools` 方案 A
- `toggleTraining` → `startTraining({ subscribedPools })`

---

## 6. 左栏：熊猫 + 策略（详细）

### 6.1 上部 — `PandaSidebarCompact`（建议高度 ≤ 280px）

保留：

- 头像 64–80px、名字、阶段 + 经验条
- `EmotionIndicator`（仅 emoji/颜色，无数值）
- `TalentBadge` 一行
- 底部「🐾 切换熊猫」

收缩 / 折叠：

- 五轴雷达 → **默认折叠**「性格五轴 ▼」，展开用 `PersonalityRadar` compact
- 「冷静竹」→ 图标 + 次数，或移入折叠区

### 6.2 下部 — `StrategyBuilder`

- 占左栏剩余高度，`overflow-y: auto`
- 主按钮「教给熊猫」sticky 在左栏底部（`sticky bottom-0 bg-paper-card`）避免滚不到
- `当前策略摘要` / `pandaReaction` 放在 Builder 下方 `StrategyStatusStrip`

---

## 7. 右栏：账户（详细）

`AccountPanel` 垂直排列，建议区块顺序：

1. **标题行**：「模拟账户」+ 训练中绿点/灰点
2. **权益**：大字 `equity`，副标题较初始资金 PnL（着色）
3. **持仓**：当前 `pool` 对应数量 + `@ 价`
4. **仓位占比**、**成交笔数**
5. （可选）迷你 sparkline — Phase 2，v2 不做

右栏 `position: sticky; top: calc(var(--navbar-height) + 8px)`，滚动主栏时账户仍可见。

---

## 8. 主栏底：决策 + 历史（详细）

### 8.1 `DecisionPanel`

- **实时模式**（训练中）：展示 `liveDecision`，标题「最近决策」
- **复盘模式**（点击 TradeHistory）：展示 `reviewDecision`，标题「历史决策 · {tradeId 短 id}」
- 8 步默认折叠；展开占满主栏宽
- 无数据：训练中显示「等待下一笔决策…」；未训练显示「开始训练后显示决策链」

### 8.2 `TradeHistory`

- 表头：时间 · 方向 · 池 · 盈亏
- 选中行高亮，联动 `DecisionPanel` 复盘
- 列表区域单独滚动，不带动整页

---

## 9. 响应式

| 断点 | 布局 |
|------|------|
| **< 1024px** | 单列顺序：**训练条 → K 线 → 账户（手风琴）→ 决策 → 历史 → 策略（手风琴）→ 熊猫摘要** |
| **1024–1279px** | 三列：左 240px \| 主 flex \| 右 200px；底栏堆叠 |
| **≥ 1280px** | 完整三栏 260 \| flex \| 220 |
| **≥ 1440px** | 可选底栏左右分栏（方案 B） |

小屏策略积木：默认折叠为「编辑策略 ▼」底部抽屉，避免左栏过长。

---

## 10. 交互清单（验收用）

- [ ] 左栏改策略并提交后，主栏 K 线与其它区不卸载
- [ ] 训练中右侧账户 `equity` 随 `simulation/status` 刷新
- [ ] 点击成交记录，主栏底决策切到复盘且可回到实时（取消选中或「返回实时」）
- [ ] 仅订阅 1 池时 ChartHeader 无下拉，与方案 A 一致
- [ ] 8 步决策展开不遮挡 K 线（底栏内部滚动）
- [ ] 左栏策略过长时仅左栏滚动，不撑高整页

---

## 11. 实现分期（建议）

| 阶段 | 内容 | 预估 |
|------|------|------|
| **P0** | 结构调整：右 `AccountPanel`、底 `Decision+History`、左 `StrategyBuilder` 搬家 | 0.5–1d |
| **P1** | `PandaSidebarCompact` + token/CSS `dashboard-layout-v2` | 0.5d |
| **P2** | 响应式 + 左栏 sticky 提交条 + 复盘「返回实时」 | 0.5d |
| **P3** | 同步 `docs/frontend-design.md` §3.3 与 Obsidian 备注 | 0.25d |

---

## 12. 与产品文档的差异说明

| 文档 | 原描述 | v2 |
|------|--------|-----|
| `frontend-design.md` §3.3 | 右 170px 决策链；主区底账户\|策略 | **以本文为准**，合并后回写 §3.3 |
| Epic 3 共识 | 右侧决策链 + 下方交易历史 | **位置对调**：决策/历史 → 主区底；账户 → 右 |
| 方案 A 池 | Chart 仅 `subscribed_pools` | 不变 |

---

## 13. 已确认（2026-05-25）

| # | 决策 |
|---|------|
| 1 | 主区底栏：**上下堆叠**（决策上 · 历史下） |
| 2 | 左栏宽度：**弹性** `clamp(240px, 22vw, 280px)` |
| 3 | 五轴：**常驻小雷达** 120px |
| 4 | 小屏策略：**底部折叠抽屉** `StrategyMobileDrawer` |

实现组件：`DashboardLeftColumn` · `DashboardMainFooter` · `DashboardAccountAside` · `DashboardStrategySection` · `dashboard-layout-v2` CSS。
