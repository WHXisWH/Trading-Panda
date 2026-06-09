# TradingPanda 前端设计文档

> 版本: 1.1 | 日期: 2026-05-22  
> Sui Overflow 2026 黑客松 — AI 交易宠物养成系统  
> **UI 设计稿唯一来源（Obsidian）**：`Artifact-Registry/sui-ai-trading-pet/design/design-spec/`  
>   - `design-tokens.md` · `mint-page-spec.md` · `dashboard-spec.md`  
>   - `trading-interface-spec.md` · `market-page-spec.md` · `pool-selection-spec.md`  
> 工程对齐：`docs/PRD.md` · `docs/api-specification.md`（策略积木/API 见 PRD §3.2）

---

## 一、技术栈与项目结构

### 1.1 完整依赖列表

#### 核心框架

| 包名 | 版本 | 用途 |
|------|------|------|
| next | ^14.2.x | App Router 框架 |
| react | ^18.3.x | UI 渲染 |
| react-dom | ^18.3.x | DOM 渲染 |
| typescript | ^5.5.x | 类型系统 |

#### Sui 链集成

| 包名 | 版本 | 用途 |
|------|------|------|
| @mysten/dapp-kit | ^0.14.x | Sui 钱包连接、交易签名、hooks |
| @mysten/sui | ^1.x | Sui SDK（链上读写、对象查询） |
| @mysten/zklogin | ^0.7.x | zkLogin（Google 登录） |
| @mysten/kiosk | ^0.9.x | Kiosk 协议（NFT 市场买卖） |

#### 状态管理 & 数据请求

| 包名 | 版本 | 用途 |
|------|------|------|
| zustand | ^4.5.x | 全局状态管理 |
| @tanstack/react-query | ^5.50.x | 服务端/链上数据请求与缓存 |

#### UI & 动画

| 包名 | 版本 | 用途 |
|------|------|------|
| tailwindcss | ^3.4.x | 原子化 CSS |
| @rive-app/react-canvas | ^4.x | Rive 状态机动画（熊猫） |
| lightweight-charts | ^4.2.x | K 线图（TradingView 开源版） |
| framer-motion | ^11.x | 页面/组件过渡动画 |
| @tanstack/react-virtual | ^3.8.x | 虚拟列表（长列表性能优化） |
| recharts | ^2.12.x | 雷达图 / 饼图 / 折线图 |

#### 工具库

| 包名 | 版本 | 用途 |
|------|------|------|
| clsx | ^2.1.x | 条件 class 拼接 |
| date-fns | ^3.6.x | 日期格式化 |
| zod | ^3.23.x | 运行时数据校验 |
| sonner | ^1.5.x | Toast 通知 |
| @radix-ui/react-dialog | ^1.1.x | 无障碍对话框 |
| @radix-ui/react-tooltip | ^1.1.x | 无障碍 Tooltip |
| @radix-ui/react-tabs | ^1.1.x | 无障碍 Tabs |
| @radix-ui/react-select | ^2.1.x | 无障碍 Select |
| @radix-ui/react-slider | ^1.2.x | 无障碍 Slider（筛选滑块） |
| lucide-react | ^0.400.x | 图标库 |

#### 字体

| 包名 | 版本 | 用途 |
|------|------|------|
| @fontsource/noto-serif-sc | ^5.x | 标题字体（思源宋体 - 水墨书法感） |
| @fontsource/noto-sans-sc | ^5.x | 正文字体（思源黑体 - 清晰可读） |
| @fontsource/zcool-xiaowei | ^5.x | 品牌标题字体（小薇体 - 书法韵味） |
| @fontsource/zcool-qingke-huangyou | ^5.x | 数字字体（庆科黄油体 - 独特辨识度） |
| @fontsource/inter | ^5.x | 英文/数字 fallback |

#### 开发工具

| 包名 | 版本 | 用途 |
|------|------|------|
| eslint | ^8.57.x | 代码检查 |
| eslint-config-next | ^14.2.x | Next.js ESLint 规则 |
| prettier | ^3.3.x | 代码格式化 |
| prettier-plugin-tailwindcss | ^0.6.x | Tailwind class 排序 |
| @types/react | ^18.3.x | React 类型定义 |
| @types/node | ^20.x | Node 类型定义 |

### 1.2 项目目录结构

```
src/
├── app/                              # Next.js App Router 页面
│   ├── page.tsx                      # Landing Page（首页）
│   ├── layout.tsx                    # 根布局（Providers/Navbar/Footer）
│   ├── globals.css                   # 全局样式 + Design Tokens
│   ├── onboarding/
│   │   └── page.tsx                  # 新用户问卷（首次登录后跳转）
│   ├── mint/
│   │   └── page.tsx                  # 铸造页
│   ├── dashboard/
│   │   └── [id]/
│   │       └── page.tsx              # 模拟盘（按熊猫 ID 路由）
│   ├── trading/
│   │   └── [id]/
│   │       └── page.tsx              # 交易界面（订单簿 + 表单，可选）
│   ├── pools/
│   │   └── page.tsx                  # 交易池多选（DeepBook / Cetus 等）
│   ├── market/
│   │   └── page.tsx                  # NFT 市场
│   ├── leaderboard/
│   │   └── page.tsx                  # 排行榜
│   ├── achievements/
│   │   └── page.tsx                  # 成就系统
│   └── profile/
│       └── page.tsx                  # 个人中心 + 签到
│
├── components/
│   ├── panda/                        # 熊猫相关组件
│   │   ├── PandaAvatar.tsx           # 熊猫形象（Rive 动画容器）
│   │   ├── PersonalityRadar.tsx      # 性格五轴雷达图
│   │   ├── TalentBadge.tsx           # 天赋标签
│   │   ├── EmotionIndicator.tsx      # 情绪指示器 + 熊猫自语
│   │   ├── PandaCard.tsx             # 市场列表卡片
│   │   ├── ExperienceBar.tsx         # 经验等级进度条
│   │   └── PandaSelector.tsx         # 多熊猫切换器
│   │
│   ├── trading/                      # 交易相关组件
│   │   ├── CandlestickChart.tsx      # K 线图（Lightweight Charts）
│   │   ├── AccountPanel.tsx          # 账户面板（余额/持仓/盈亏）
│   │   ├── DecisionPanel.tsx         # 决策链面板（8 步可视化）
│   │   ├── DecisionChain.tsx         # 右侧决策摘要 + 历史（Dashboard）
│   │   ├── PandaSidebar.tsx          # Dashboard 左侧 180px 栏
│   │   ├── DecisionStep.tsx          # 决策链单步
│   │   ├── StrategyBuilder.tsx       # 猎手规则积木（主路径）
│   │   ├── StrategyRuleRow.tsx
│   │   ├── StrategyTemplates.tsx
│   │   ├── StrategyTextInput.tsx     # 自然语言（进阶）
│   │   ├── StrategyPreview.tsx
│   │   ├── TradeHistory.tsx
│   │   ├── TradeHistoryItem.tsx
│   │   ├── SimulationControls.tsx    # 模拟速度 [1×][10×][100×][跳到结果]
│   │   ├── SpeedControl.tsx
│   │   ├── TradeMarker.tsx
│   │   ├── OrderBook.tsx             # 交易页 · 订单簿 + 深度
│   │   ├── OrderBookDepth.tsx
│   │   ├── TradeForm.tsx             # 交易页 · 买卖表单
│   │   └── PositionList.tsx          # 交易页 · 持仓列表
│   │
│   ├── pools/                          # 交易池选择
│   │   ├── PoolListItem.tsx
│   │   ├── PoolConfirmBar.tsx
│   │   └── PoolListSkeleton.tsx
│   │
│   ├── market/                       # 市场相关组件
│   │   ├── MarketGrid.tsx            # 市场卡片网格
│   │   ├── MarketFilters.tsx         # 筛选面板
│   │   ├── MarketSort.tsx            # 排序选择器
│   │   ├── MarketDetailModal.tsx     # 熊猫详情弹窗
│   │   ├── ListPandaModal.tsx        # 上架弹窗
│   │   └── PurchaseConfirmModal.tsx  # 购买确认弹窗
│   │
│   ├── leaderboard/                  # 排行榜组件
│   │   ├── LeaderboardTable.tsx      # 排行榜表格
│   │   ├── PandaRank.tsx             # 排行项组件
│   │   └── RankDimensionTabs.tsx     # 维度切换标签
│   │
│   ├── achievement/                  # 成就组件
│   │   ├── AchievementGrid.tsx       # 成就网格
│   │   ├── AchievementCard.tsx       # 成就卡片
│   │   └── AchievementUnlockAnim.tsx # 解锁动画
│   │
│   ├── profile/                      # 个人中心组件
│   │   ├── MyPandaList.tsx           # 我的熊猫列表
│   │   ├── CheckInCalendar.tsx       # 签到日历
│   │   ├── StatsOverview.tsx         # 统计概览
│   │   └── SettingsPanel.tsx         # 设置面板
│   │
│   ├── layout/                       # 布局组件
│   │   ├── Navbar.tsx                # 顶部导航栏
│   │   ├── Footer.tsx                # 页脚
│   │   ├── WalletButton.tsx          # 钱包连接按钮
│   │   ├── NetworkBanner.tsx         # 网络状态横幅
│   │   └── PageContainer.tsx         # 页面容器（max-width + padding）
│   │
│   └── ui/                           # 基础 UI 组件
│       ├── Button.tsx                # 按钮
│       ├── Card.tsx                  # 卡片
│       ├── Modal.tsx                 # 模态框
│       ├── Input.tsx                 # 输入框
│       ├── Textarea.tsx              # 文本域
│       ├── Badge.tsx                 # 标签
│       ├── Tooltip.tsx               # 提示气泡
│       ├── Skeleton.tsx              # 骨架屏
│       ├── Spinner.tsx               # 加载动画
│       ├── Toast.tsx                 # Toast 通知
│       ├── Tabs.tsx                  # 标签页
│       ├── Select.tsx                # 下拉选择
│       ├── Slider.tsx                # 滑块
│       ├── ProgressBar.tsx           # 进度条
│       ├── EmptyState.tsx            # 空状态
│       └── ErrorState.tsx            # 错误状态
│
├── hooks/                            # 自定义 Hooks
│   ├── useSuiWallet.ts               # 钱包连接/断开/状态
│   ├── useMintPanda.ts               # 铸造熊猫交易
│   ├── usePandaData.ts               # 链上熊猫数据查询
│   ├── useMarketData.ts              # 市场列表数据
│   ├── usePurchasePanda.ts           # 购买熊猫交易
│   ├── useListPanda.ts               # 上架熊猫交易
│   ├── useDelistPanda.ts             # 下架熊猫交易
│   ├── useWebSocket.ts               # WebSocket 连接管理
│   ├── useSimulation.ts              # 模拟盘控制
│   ├── useDecisionChain.ts           # 决策链数据
│   ├── useTradeHistory.ts            # 交易历史
│   ├── useLeaderboard.ts             # 排行榜数据
│   ├── useAchievements.ts            # 成就数据
│   ├── useCheckIn.ts                 # 签到
│   ├── useReducedMotion.ts           # 减少动画偏好检测
│   └── useBreakpoint.ts              # 响应式断点检测
│
├── stores/                           # Zustand Stores
│   ├── useAuthStore.ts               # 认证 & 钱包状态
│   ├── usePandaStore.ts              # 当前熊猫数据
│   ├── useSimulationStore.ts         # 模拟盘运行状态
│   ├── useMarketStore.ts             # 市场筛选/排序/分页
│   └── useUIStore.ts                 # UI 状态（弹窗/通知/侧栏）
│
├── services/                         # API 服务层（HTTP/WS 通信封装）
│   ├── http.ts                       # Axios/fetch 基础客户端（baseURL、拦截器、JWT 注入）
│   ├── auth.service.ts               # connectWallet, zkLogin, refreshToken, submitSurvey
│   ├── panda.service.ts              # mintPanda, getPanda, getMyPandas, renamePanda
│   ├── strategy.service.ts           # feedStrategy, validateStrategy, parseStrategyText, getStrategy
│   ├── simulation.service.ts         # startSimulation, stopSimulation, getStatus, getHistory
│   ├── trading.service.ts            # getTrades, getTradeDecision
│   ├── experience.service.ts         # getExperience, getPatterns, getMastery, getMistakes
│   ├── market.service.ts             # getListings, getListingDetail, listPanda, delistPanda, buyPanda
│   ├── leaderboard.service.ts        # getLeaderboard, getMyRank
│   ├── achievement.service.ts        # getAchievements, getMyAchievements
│   ├── checkin.service.ts            # checkIn, getCheckInStatus
│   └── market-data.service.ts        # getKline, getCurrentPrice, getCorrelation
│
├── lib/                              # 工具函数（纯逻辑，不含网络请求）
│   ├── sui.ts                        # Sui 客户端初始化
│   ├── kiosk.ts                      # Kiosk 合约交互封装
│   ├── websocket.ts                  # WebSocket 客户端
│   ├── chart.ts                      # Lightweight Charts 配置工厂
│   ├── format.ts                     # 数字/地址/日期格式化
│   ├── personality.ts                # 性格五轴工具（名称映射、颜色映射）
│   ├── talent.ts                     # 天赋工具（ID→名称、概率）
│   ├── emotion.ts                    # 情绪工具（状态映射、文案）
│   ├── decision.ts                   # 决策链解析/格式化
│   ├── validation.ts                 # Zod schemas
│   └── constants.ts                  # 全局常量
│
├── styles/                           # 全局样式
│   └── tokens.css                    # Design Tokens（CSS Custom Properties）
│
└── types/                            # TypeScript 类型
    ├── panda.ts                      # 熊猫相关类型
    ├── trading.ts                    # 交易相关类型
    ├── market.ts                     # 市场相关类型
    ├── decision.ts                   # 决策链类型
    ├── achievement.ts                # 成就类型
    ├── websocket.ts                  # WebSocket 事件类型
    └── api.ts                        # API 响应类型
```

> Panda Avatar PNG 素材分层、子层命名、`experience-rig.json` 锚点、bbox 质量门与生成 prompt 约束见：`docs/panda-avatar-asset-layering.md`。后续熊猫外观素材必须按“属性 → 单一语义子层 → 单一 anchor”的规则生产；`intuition` 禁止生成眼睛、眼神、瞳孔、眉眼或眼周主表情素材，避免与 `emotions` 语义重复。

### 1.3 服务层架构

前端分为四层，各层职责严格隔离：

```
┌─────────────────────────────────────────────────┐
│  Components（组件层）                              │
│  只负责渲染 UI + 用户交互事件                        │
└────────────────────┬────────────────────────────┘
                     │ 调用
┌────────────────────▼────────────────────────────┐
│  Hooks（业务逻辑层）                               │
│  useQuery/useMutation 封装、WebSocket 订阅、       │
│  状态派生、错误处理、乐观更新                         │
└────────────────────┬────────────────────────────┘
                     │ 调用
┌────────────────────▼────────────────────────────┐
│  Services（通信层）                                │
│  HTTP 请求封装、JWT 自动注入、请求/响应类型定义         │
│  每个 service 文件对应一个 API 模块                   │
└────────────────────┬────────────────────────────┘
                     │ 调用
┌────────────────────▼────────────────────────────┐
│  lib/http.ts（基础设施层）                          │
│  Axios 实例、baseURL 配置、拦截器（401 自动刷新）     │
└─────────────────────────────────────────────────┘
```

**服务层约定**：

```typescript
// services/http.ts — 基础 HTTP 客户端
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10_000,
});

// 请求拦截器：自动注入 JWT
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 响应拦截器：401 自动刷新
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const newToken = await refreshToken();
      if (newToken) return api(error.config); // 重试
    }
    return Promise.reject(error);
  }
);

export { api };
```

```typescript
// services/panda.service.ts — 示例
import { api } from './http';
import type { Panda, MintResponse } from '@/types/panda';
import type { SuccessResponse } from '@/types/api';

export const pandaService = {
  mint: () =>
    api.post<SuccessResponse<MintResponse>>('/api/panda/mint').then(r => r.data),

  getById: (id: string) =>
    api.get<SuccessResponse<Panda>>(`/api/panda/${id}`).then(r => r.data),

  getMine: () =>
    api.get<SuccessResponse<Panda[]>>('/api/panda/my').then(r => r.data),

  rename: (id: string, name: string) =>
    api.put<SuccessResponse<void>>(`/api/panda/${id}/name`, { name }).then(r => r.data),
};
```

```typescript
// hooks/usePandaData.ts — hooks 调 services，不直接调 fetch
import { useQuery } from '@tanstack/react-query';
import { pandaService } from '@/services/panda.service';

export function usePandaData(pandaId: string) {
  return useQuery({
    queryKey: ['panda', pandaId],
    queryFn: () => pandaService.getById(pandaId),
  });
}
```

**禁止**：组件层直接调用 `fetch`/`axios`。所有网络请求必须经过 services 层。

---

## 二、Design System

> **规范优先级**：Obsidian `design-tokens.md` 中的像素值与命名为主；本节 CSS 变量为工程落地超集（含纹理、稀有度等扩展 Token）。冲突时以 Obsidian 为准。

### 2.1 Design Tokens

所有 Design Token 以 CSS Custom Properties 定义，写入 `src/styles/tokens.css` 并在 `globals.css` 中引入。

```css
/* src/styles/tokens.css */

:root {
  /* ========== 颜色 — 水墨中国风 ========== */
  /* 设计理念：宣纸为底、浓墨为骨、竹青为魂、朱砂为印 */

  /* 背景 — 宣纸层次 */
  --color-bg-primary: #f5f0e6;          /* 生宣纸 */
  --color-bg-card: #ede8dc;             /* 熟宣纸 */
  --color-bg-white: #ffffff;            /* 卡片白底（市场卡片、池列表项） */
  --color-bg-input: #e8e2d4;            /* 输入框 - 毛边纸 */
  --color-bg-hover: #e2dccf;
  --color-bg-overlay: rgba(245, 240, 230, 0.85); /* = --color-overlay */
  --color-bg-ink-wash: rgba(30, 30, 28, 0.04);   /* 淡墨晕染层 */

  /* 强调色 — 竹青绿 */
  --color-accent: #2d5a3d;              /* 主强调 - 竹青 */
  --color-accent-hover: #1e4a2e;        /* 强调色 hover - 深竹 */
  --color-accent-glow: rgba(45, 90, 61, 0.3);    /* 天赋发光 - 竹光 */
  --color-accent-muted: rgba(45, 90, 61, 0.08);
  --color-accent-light: #f0f8f0;        /* 选中行 / 池项已选背景（Obsidian） */

  /* 文字 */
  --color-text-primary: #1a1a1a;        /* 浓墨 */
  --color-text-secondary: #888888;
  --color-text-tertiary: #999999;
  --color-text-placeholder: #bbbbbb;
  --color-text-muted: #9a9a8e;          /* 兼容别名 */
  --color-text-inverse: #ffffff;

  /* 语义色 — 国画色谱 */
  --color-success: #2d5a3d;             /* 盈利 - 竹青（与强调色统一）*/
  --color-success-bg: rgba(45, 90, 61, 0.08);
  --color-danger: #c23a3a;              /* 亏损 - 朱砂红 */
  --color-danger-bg: rgba(194, 58, 58, 0.06);
  --color-warning: #e8b84b;             /* 藤黄 · 稀有天赋 */
  --color-warning-bg: rgba(232, 184, 75, 0.12);
  --color-excited: #d4727a;           /* 胭脂 · 兴奋情绪 */
  --color-info: #4a6d8c;

  /* 熊猫色 */
  --color-panda-fur: #1a1a1a;           /* 熊猫黑 - 浓墨 */
  --color-panda-white: #f5f5f0;         /* 熊猫白 - 宣纸白 */
  --color-panda-eye: #2d5a3d;           /* 熊猫眼 = 竹青 */

  /* 边框 — 墨线 */
  --color-border: #d4cfc4;              /* 淡墨线 */
  --color-border-light: #ede8dc;
  --color-border-hover: #bfb5a0;
  --color-border-accent: #2d5a3d;
  --color-overlay: rgba(245, 240, 230, 0.85);

  /* 印章 & 点缀 */
  --color-seal: #c23a3a;                /* 印章朱红 - 用于 logo、徽章、重要标记 */
  --color-seal-bg: rgba(194, 58, 58, 0.08);

  /* 成就稀有度 — 国画颜料 */
  --color-rarity-common: #9a9a8e;       /* 枯墨 */
  --color-rarity-rare: #4a6d8c;         /* 花青 */
  --color-rarity-epic: #6b4c8a;         /* 紫藤 */
  --color-rarity-legendary: #c23a3a;    /* 朱砂 + glow */

  /* 纹理 */
  --texture-rice-paper: url('/textures/rice-paper.webp'); /* 宣纸纹理叠加层 */

  /* ========== 字体 — 书法 + 现代 ========== */
  --font-heading: "ZCOOL XiaoWei", "Noto Serif SC", serif;
  --font-body: "Noto Sans SC", "Inter", -apple-system, sans-serif;
  --font-display: "Noto Sans SC", "Inter", sans-serif;  /* 价格数字 · Obsidian */
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* 字号层级（Obsidian） */
  --text-h1: 22px;
  --text-h2: 18px;
  --text-h3: 15px;
  --text-body: 13px;
  --text-small: 11px;
  --text-tiny: 10px;
  --text-price: 20px;
  --text-price-lg: 28px;
  /* Tailwind 兼容 rem 刻度保留 */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  --text-display: 3rem;

  /* ========== 间距（Obsidian） ========== */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;
  --spacing-3xl: 48px;

  /* ========== 圆角 ========== */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* ========== 阴影 ========== */
  --shadow-sm: 0 1px 3px rgba(26, 26, 26, 0.08);
  --shadow-md: 0 4px 12px rgba(26, 26, 26, 0.10);
  --shadow-lg: 0 8px 24px rgba(26, 26, 26, 0.12);
  --shadow-glow: 0 0 20px rgba(45, 90, 61, 0.20);
  --shadow-glow-rare: 0 0 40px rgba(232, 184, 75, 0.35);
  --shadow-glow-strong: var(--shadow-glow-rare);
  --shadow-ink: 0 2px 8px rgba(26, 26, 24, 0.06);

  /* ========== 过渡 ========== */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

  /* ========== Z-Index ========== */
  --z-base: 0;
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-navbar: 30;
  --z-overlay: 40;
  --z-modal: 50;
  --z-toast: 60;

  /* ========== 布局（Obsidian） ========== */
  --navbar-height: 44px;
  --page-max-width: 1440px;
  --page-mint-max-width: 800px;
  --sidebar-width: 180px;              /* Dashboard 左侧 PandaSidebar */
  --sidebar-width-wide: 260px;         /* 宽侧栏场景 */
  --decision-panel-width: 170px;       /* Dashboard 右侧决策链 */
  --trading-positions-width: 220px;
  --trading-orderbook-width: 320px;
  --trading-form-width: 224px;
  --modal-width-lg: 800px;
  --modal-width-sm: 400px;
  --panda-avatar-dashboard: 80px;
  --panda-avatar-mint: 120px;
  --panda-avatar-card: 80px;
  --market-card-width: 183px;
  --market-card-height: 210px;
  --pool-list-item-height: 72px;
  --confirm-bar-height: 50px;
}
```

### 2.1.1 熊猫情绪色（Rive / SVG 联动）

| 情绪 | 身体/脸颊 | 特效 |
|------|-----------|------|
| 专注 Focused | 标准黑白 `#1A1A1A` / `#F5F5F0` | 无 |
| 兴奋 Excited | 脸颊 `#D4727A` | 小星星 ✨ |
| 贪婪 Greedy | 光泽 `#E8B84B` | 金币粒子 |
| 谨慎 Cautious | 蓝灰冷调 | 头顶 ❓ |
| 恐慌 Panicking | 灰 `#CCCCCC` | 汗滴 💦 |
| 麻木 Numb | 低饱和褪色 | 灰色气泡 |
| 冷静 Calm | 银白光泽 | 柔和光晕 |

**产品约束**：Dashboard 不对用户暴露情绪数值系数，仅表情/颜色/姿态（PRD C4）。

### 2.2 基础组件库

#### Button

```typescript
interface ButtonProps {
  children: React.ReactNode;
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;      // 左侧图标
  iconRight?: React.ReactNode; // 右侧图标
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
}
```

**变体**：
- `primary`: bg=accent, text=bg-primary, hover=accent-hover（铸造按钮、购买按钮）
- `secondary`: bg=bg-card, border=border, text=text-primary, hover=bg-hover（次要操作）
- `ghost`: bg=transparent, text=text-secondary, hover=bg-hover（取消、关闭）
- `danger`: bg=danger, text=white（下架、取消交易）

**状态**：idle / hover / active / disabled / loading（loading 时显示 Spinner + 文案替换）

---

#### Card

```typescript
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'interactive' | 'highlight';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}
```

**变体**：
- `default`: bg=bg-card, border=border, radius=radius-md（面板/信息卡）
- `interactive`: 同 default + hover 时 border=accent, shadow=shadow-md（PandaCard、成就卡）
- `highlight`: border=accent, shadow=shadow-glow（稀有天赋卡）

---

#### Modal

```typescript
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';     // sm=400px, md=600px, lg=800px
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
}
```

基于 Radix Dialog 实现，动画 scale-in 200ms ease-out。

---

#### Input

```typescript
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;    // 右侧附加元素（如单位）
  type?: 'text' | 'number';
  className?: string;
}
```

样式：bg=bg-input, border=border, focus:border=accent, radius=radius-sm

---

#### Textarea

```typescript
interface TextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
}
```

用于策略输入框，支持自动高度扩展。

---

#### Badge

```typescript
interface BadgeProps {
  children: React.ReactNode;
  variant: 'default' | 'success' | 'danger' | 'warning' | 'accent' | 'glow';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}
```

**变体**：
- `default`: bg=bg-hover, text=text-secondary（普通标签）
- `success`: bg=success-bg, text=success（盈利标记）
- `danger`: bg=danger-bg, text=danger（亏损标记）
- `warning`: bg=warning-bg, text=warning（警告标记）
- `accent`: bg=accent-muted, text=accent（天赋标签 - 普通）
- `glow`: bg=accent-muted, text=accent, shadow=shadow-glow, animation=glow-pulse（稀有天赋）

---

#### Tooltip

```typescript
interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
}
```

基于 Radix Tooltip 实现。

---

#### Skeleton

```typescript
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  className?: string;
}
```

带 shimmer 动画，bg=bg-card → bg-hover 往复渐变。

---

#### Spinner

```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';    // 16px / 24px / 32px
  color?: string;                 // 默认 accent
}
```

---

#### Tabs

```typescript
interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  items: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  children: React.ReactNode;
}
```

基于 Radix Tabs 实现。

---

#### Select

```typescript
interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  label?: string;
}
```

基于 Radix Select 实现。

---

#### Slider

```typescript
interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min: number;
  max: number;
  step?: number;
  label?: string;
  formatValue?: (value: number) => string;
}
```

基于 Radix Slider 实现，用于市场筛选（价格区间、性格值区间）。

---

#### ProgressBar

```typescript
interface ProgressBarProps {
  value: number;       // 0-100
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: 'default' | 'accent' | 'success';
  size?: 'sm' | 'md';
}
```

用于经验等级进度条、熟练度进度条。

---

#### EmptyState

```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
```

---

#### ErrorState

```typescript
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}
```

---

## 三、页面详细设计

### 3.1 Landing Page

#### 页面职责

产品首页，向新用户展示 TradingPanda 的核心卖点，引导连接钱包进入铸造流程。

#### SEO

```typescript
export const metadata: Metadata = {
  title: 'TradingPanda — 养一只会交易的 AI 熊猫',
  description: '在 Sui 区块链上铸造你的 AI 交易熊猫 NFT，每只熊猫都有独特的性格和天赋，通过模拟交易训练它成为你的专属交易伙伴。',
};
```

#### 组件树

```
LandingPage
├── Navbar
│   ├── Logo
│   ├── NavLinks [铸造 | 市场 | 排行榜]
│   └── WalletButton
│
├── HeroSection
│   ├── h1 "养一只会交易的 AI 熊猫"
│   ├── p  "每只熊猫都有独特的性格..."
│   ├── Button "开始铸造" → /mint
│   └── PandaDemoAnimation（3 只示例熊猫轮播动画）
│
├── FeaturesSection
│   ├── FeatureCard "独特性格"（雷达图示例）
│   ├── FeatureCard "AI 决策"（决策链示意）
│   ├── FeatureCard "成长进化"（3 阶段示意）
│   └── FeatureCard "NFT 市场"（交易示意）
│
├── HowItWorksSection
│   ├── Step 1 "铸造" + 动画
│   ├── Step 2 "训练" + 动画
│   ├── Step 3 "成长" + 动画
│   └── Step 4 "交易" + 动画
│
├── DemoPandaSection
│   ├── PandaCard（阿暴 - 激进派示例）
│   ├── PandaCard（阿稳 - 保守派示例）
│   └── PandaCard（阿鬼 - 直觉派示例）
│
├── CTASection
│   ├── h2 "准备好了吗？"
│   └── Button "连接钱包开始"
│
└── Footer
    ├── Logo
    ├── Links [文档 | GitHub | X/Twitter]
    └── "Built on Sui | Sui Overflow 2026"
```

#### 状态管理

- 无 Zustand store 依赖
- 本地状态：`currentDemoIndex`（轮播索引）

#### 数据流

- 无 TanStack Query 请求（纯静态页面）
- 钱包连接状态从 `useAuthStore` 读取（仅用于 Navbar 显示）

#### 响应式布局要点

- Desktop：双列英雄区（左文字右动画），四列特性卡
- Tablet：单列英雄区，双列特性卡
- Mobile：单列全部，特性卡改为横向滚动

#### 滚动动画

使用 framer-motion `useInView` 实现进入视口时的 fade-up 动画：
- HeroSection：页面加载即显示
- FeaturesSection：滚动至视口时逐卡 stagger 进入（间隔 100ms）
- HowItWorksSection：步骤逐个从左滑入
- DemoPandaSection：卡片从下方 fade-up

---

### 3.1.5 Onboarding Survey（新用户问卷）

#### 页面职责

新用户首次登录后、进入铸造页之前的一次性引导问卷。收集交易经验与偏好，用于个性化 UI 深度和策略推荐。**不影响决策引擎公式**。

#### 触发条件

```typescript
// 在全局 AuthGuard 中检查
if (user.onboarding_survey === null) {
  router.push('/onboarding');
}
```

#### 组件树

```
OnboardingPage
├── ProgressBar（5步进度条，当前步高亮）
│
├── Step1_TradingExp
│   ├── h2 "你有多少交易经验？"
│   └── OptionCards [
│         "零经验，纯新手" (none),
│         "做过一些模拟/小额" (beginner),
│         "交易1年以上" (intermediate),
│         "资深交易者" (advanced)
│       ]
│
├── Step2_Style
│   ├── h2 "你偏好什么交易风格？"
│   ├── p  "可多选"
│   └── CheckboxCards [趋势跟踪, 波段, 短线, 价值投资, 网格]
│
├── Step3_MaxLoss
│   ├── h2 "单笔最多能接受亏多少？"
│   └── SliderSelect [5% | 10% | 20% | 30%]
│       └── PandaReaction（根据选择显示不同表情）
│
├── Step4_Indicators
│   ├── h2 "你熟悉哪些技术指标？"
│   ├── p  "不熟悉也没关系"
│   └── CheckboxCards [MA, RSI, MACD, 布林带, 成交量, 都不熟悉]
│
├── Step5_Autonomy
│   ├── h2 "你希望熊猫多自主？"
│   ├── RangeSlider [1(完全听我的) ←→ 5(让它自由发挥)]
│   └── AutonomyPreview（预览不同自主度的行为描述）
│
└── SubmitSection
    ├── Button "完成" → POST /api/auth/onboarding-survey
    └── ResultCard（显示推导出的 experience_level + 推荐策略标签）
```

#### 状态管理

```typescript
// 本地状态，不入 Zustand（一次性流程）
const [step, setStep] = useState(1);
const [answers, setAnswers] = useState<OnboardingSurvey>({
  trading_exp: null,
  style: [],
  max_loss: 10,
  indicators: [],
  panda_autonomy: 3,
});
```

#### 交互设计

- 每步单屏展示，左右滑动切换（移动端）或 fade 切换（桌面端）
- Step3 的 PandaReaction：选 5% 熊猫竖大拇指，选 30% 熊猫冒冷汗
- 提交后显示 2 秒结果卡片，然后自动跳转 `/mint`
- 问卷无"跳过"按钮 — 所有问题必答（引导完整性）

#### 动效

- 步骤切换：横向 slide + fade（300ms ease-out-expo）
- OptionCard 选中：scale(1.02) + 边框高亮（150ms）
- 提交成功：ResultCard 从下方 spring-up

---

### 3.2 Mint Page（铸造页）

> 设计稿：`design-spec/mint-page-spec.md` · mockup `mint-page.png`

#### 页面职责

用户铸造 AI 交易熊猫 NFT。布局为 **居中单列，内容区最大宽度 800px**，Navbar 高 44px。

#### 页面布局（Obsidian）

```
┌────────────────────────────────────────┐
│  Navbar (全宽 max 800px, h=44px)        │
├────────────────────────────────────────┤
│           🐼 熊猫圆形头像 120×120         │
│       "铸造你的 AI 交易熊猫" (h1)        │
│     "连接 Sui Wallet，铸造独一无二..."    │
│         [🐼 铸造熊猫]  Gas ~0.03 SUI   │
│    ┌────── 性格五轴 Recharts 雷达 ──┐    │
│    └──────────────────────────────┘    │
│         🎋 天赋标签（稀有=金色光晕）      │
│  [🎮 进入模拟盘]    [再养一只]           │
└────────────────────────────────────────┘
```

#### SEO

```typescript
export const metadata: Metadata = {
  title: '铸造熊猫 — TradingPanda',
  description: '铸造你的 AI 交易熊猫 NFT，每只熊猫拥有独一无二的五维性格和稀有天赋。',
};
```

#### 页面状态

| 状态 | 代码枚举 | 触发 | 视觉（Obsidian） |
|------|---------|------|------------------|
| idle | `IDLE` | 钱包已连接 | 熊猫剪影呼吸动画 opacity 0.8↔1.0 + 标题 + 按钮 |
| connecting | `CONNECTING` | 未连接钱包 | 按钮文案「🔗 连接钱包」 |
| confirming | `CONFIRMING` | 点击铸造，等钱包 | 按钮 loading「交易确认中...」 |
| minting | `MINTING` | 钱包已签，链上 pending | loading + 剪影微动 |
| revealing | `REVEALING` | Mint 成功 | 破壳 2s → 雷达 500ms/轴 → 天赋 delay 1s |
| success / done | `SUCCESS` | 揭晓完成 | 完整展示 +「🎮 进入模拟盘」→ `/dashboard/[id]` |
| error | `ERROR` | 拒绝 / gas 不足 | 错误提示 + 重试 |

#### 组件规格（Obsidian）

**PandaAvatar（Mint）**：120×120 圆形；铸造前 CSS 渐变剪影；铸造中 spinner；铸造后 Rive 破壳 → 展示。

**MintButton**：默认「🐼 铸造熊猫」`--color-accent` 白字；铸造中 disabled + loading；成功后隐藏。

**PersonalityRadar**：Recharts；填充 `rgba(45,90,61,0.2)`；描边 `--color-accent`；500ms/轴顺时针。

**TalentBadge**：无天赋隐藏；普通=竹青底白字；稀有=`--color-warning` + `--shadow-glow-rare`；spring-up 动画。

#### 6 页面状态（实现映射）

> 工程代码可将 `done` 映射为 `success`。

#### 组件树

```
MintPage
├── Navbar
│   ├── Logo
│   └── WalletButton
│
├── MintContent (flex-col, items-center)
│   │
│   ├── [状态=idle] ────────────────────────
│   │   ├── PandaSilhouette（熊猫剪影，半透明动画）
│   │   ├── h1 "铸造你的 AI 交易熊猫"
│   │   ├── p  "连接 Sui Wallet，铸造独一无二的熊猫"
│   │   └── MintButton [铸造熊猫] / [连接钱包]
│   │
│   ├── [状态=minting] ─────────────────────
│   │   ├── PandaSilhouette（微动动画）
│   │   └── MintButton [交易确认中...] (loading)
│   │
│   ├── [状态=revealing] ───────────────────
│   │   ├── PandaAvatar (hatching → revealed, 2s)
│   │   ├── PersonalityRadar (empty → filling → complete, 2.5s)
│   │   └── TalentBadge (hidden → revealed, 300ms + 1s delay)
│   │
│   ├── [状态=success] ─────────────────────
│   │   ├── PandaAvatar (default)
│   │   ├── h2 "🎉 欢迎 [熊猫名] 加入你的战队"
│   │   ├── PersonalityRadar (complete)
│   │   ├── TalentBadge (revealed)
│   │   ├── Button "进入模拟盘" → /dashboard/[id]
│   │   └── Button "再养一只" (secondary)
│   │
│   └── [状态=error] ───────────────────────
│       ├── ErrorState (message + retry)
│       └── MintButton [重试]
│
├── ExistingPandasBanner（已拥有熊猫时显示）
│   └── "你已拥有 N 只熊猫" + 查看链接
│
└── NetworkBanner（网络断开时显示红色横幅）
```

#### 状态管理

**Zustand**：
- `useAuthStore.walletConnected` — 钱包是否已连接
- `useAuthStore.address` — 当前地址

**Local State**：
```typescript
const [mintStatus, setMintStatus] = useState<
  'idle' | 'connecting' | 'minting' | 'revealing' | 'success' | 'error'
>('idle');
const [mintResult, setMintResult] = useState<MintResult | null>(null);
const [error, setError] = useState<string | null>(null);
const [revealPhase, setRevealPhase] = useState<
  'hatching' | 'radar' | 'talent' | 'done'
>('hatching');
```

#### 数据流

```typescript
// 查询用户已有熊猫
const existingPandas = useQuery({
  queryKey: ['pandas', address],
  queryFn: () => fetchUserPandas(address),
  enabled: !!address,
  staleTime: 30_000,
});

// 铸造 mutation
const mintMutation = useMutation({
  mutationFn: (txBlock: TransactionBlock) => signAndExecute(txBlock),
  onSuccess: (result) => {
    setMintStatus('revealing');
    // 从链上事件解析性格和天赋数据
    const pandaData = parseMintEvent(result);
    setMintResult(pandaData);
    startRevealSequence(pandaData);
  },
  onError: (error) => {
    setMintStatus('error');
    setError(parseSuiError(error));
  },
});
```

#### 铸造揭晓动画序列

```typescript
async function startRevealSequence(data: MintResult) {
  setRevealPhase('hatching');
  await delay(2000);                    // 破壳动画 2s

  setRevealPhase('radar');
  await delay(2500);                    // 雷达图 500ms × 5 轴

  setRevealPhase('talent');
  await delay(1300);                    // 天赋 1s 延迟 + 300ms fade-in

  setRevealPhase('done');
  setMintStatus('success');
}
```

#### 性格雷达图组件（PersonalityRadar）

```typescript
interface PersonalityRadarProps {
  data: {
    boldness: number;     // 胆识 0-100
    patience: number;     // 耐性 0-100
    intuition: number;    // 直觉 0-100
    focus: number;        // 专注 0-100
    contrarian: number;   // 逆向性 0-100
  } | null;
  state: 'empty' | 'filling' | 'complete';
  size?: number;          // 默认 280
  showValues?: boolean;   // 是否显示数值
  animated?: boolean;     // 是否动画
}
```

使用 recharts RadarChart 或 SVG 手绘实现五边形雷达图。
- `empty` 状态：灰色五边形线框 + 五轴标签（胆识/耐性/直觉/专注/逆向性）
- `filling` 状态：五轴逐一填充竹青区域，500ms/轴，顺时针
- `complete` 状态：完整竹青填充 + 各轴数值标注

#### 天赋标签组件（TalentBadge）

```typescript
interface TalentBadgeProps {
  talent: number;        // 0=无天赋, 1-6=具体天赋
  talentName: string;
  probability: number;   // 概率百分比（如 4 表示 4%）
  state: 'hidden' | 'revealed';
}
```

天赋映射表：
```typescript
const TALENT_MAP: Record<number, { name: string; probability: number; description: string }> = {
  0: { name: '无特殊天赋', probability: 85, description: '' },
  1: { name: '竹笋嗅觉', probability: 4, description: '对新资产的模式识别速度 x3' },
  2: { name: '铁竹意志', probability: 4, description: '情绪波动减少 50%' },
  3: { name: '月光冥想', probability: 3, description: '夜间交易信号准确度 +20%' },
  4: { name: '熊猫直觉', probability: 2, description: '趋势反转预判窗口 +2 根 K 线' },
  5: { name: '竹林回声', probability: 1, description: '策略切换时保留 100% 经验' },
  6: { name: '镜像思维', probability: 1, description: '可同时运行两套对冲策略' },
};
```

---

### 3.3 Dashboard（模拟交易主界面）

> 设计稿：`design-spec/dashboard-spec.md` · mockup `dashboard.png`

#### 页面职责

TradingPanda 核心页：观察熊猫自动交易、K 线、账户、**右侧决策链**、策略积木、模拟速度、当前交易池。

#### 页面布局（Obsidian · 三栏）

```
┌──────────┬────────────────────────────┬──────────┐
│ 左侧边栏  │        主内容区             │ 决策链   │
│ 180px    │        flex (~430px+)       │ 170px    │
│          │  BTC/USD  $59,500  +2.3%   │ 最近决策  │
│ 🐼 阿暴  │  [15m][1h][4h][1d]        │ score    │
│ 幼年·15% │  ┌─── K 线 + 交易标记 ──┐  │ 📊展开8步 │
│ 五轴文本  │  └──────────────────────┘  │ 历史决策  │
│ 🎋 天赋  │  ┌── 成交量 sub-chart ──┐  │ 🐼 自语   │
│ 冷静竹   │  └──────────────────────┘  │          │
│ 🐾切换   │  ┌─账户──┬─策略积木────┐  │          │
│          │  │余额持仓│ StrategyBuilder│          │
│          │  └──────┴───────────────┘  │          │
│          │  ⏱ [1×][10×][100×][跳到结果]         │
│          │  交易池: Cetus BTC/SUI → /pools      │
└──────────┴────────────────────────────┴──────────┘
```

**与旧版差异**：决策链在 **右侧固定 170px**（非页面底部全宽）；左侧 **180px** PandaSidebar（非 260px）；账户与策略 **主区底部并排**。

#### 组件规格（Obsidian）

| 组件 | 规格 |
|------|------|
| **PandaSidebar** | w=180px, bg=`--color-bg-card`；头像 80×80 圆；阶段「幼年 · 熟练度 15%」；经验条 140×8px；五轴 **文本**或 compact 雷达；冷静竹「今日剩余 N 次」；底部「🐾 我的熊猫 ▼」 |
| **ChartPanel** | lightweight-charts；时间框激活项竹青底；涨 `--color-success` / 跌 `--color-danger`；成交量灰色柱；买卖标记 绿▲/红▼ |
| **AccountPanel** | 余额 / 持仓 / 入场价 `@ $58,820` / 盈亏着色 / 仓位 % |
| **DecisionChain** | w=170px；最近决策卡片；「📊 决策详情 (展开 ▼)」8 步；底部引用块熊猫自语；历史灰色卡片倒序 |
| **SpeedControl** | [1×][10×][100×][跳到结果]；激活 `--color-accent`；快进不调 LLM |
| **StrategyBuilder** | 见 §3.3 策略积木（PRD §3.2）；主按钮「🐼 教给熊猫」；匹配度「67/100」竹青字 |

#### 关键交互（Obsidian）

1. Rive 实时反映情绪，**不展示情绪数值**
2. 决策链 **默认折叠**，仅最近一笔摘要
3. K 线 BUY 绿▲ / SELL 红▼
4. 多熊猫侧边栏下拉切换
5. 交易池文案可点击跳转 `/pools`

#### SEO

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `${pandaName} 的交易室 — TradingPanda`,
    description: '观察你的 AI 交易熊猫实时交易、查看决策链、优化策略。',
  };
}
```

#### 路由参数

```typescript
// /dashboard/[id]
interface DashboardParams {
  id: string;  // 熊猫 NFT 的 objectId
}
```

#### 页面布局（实现参考 · 宽屏）

```
┌────────────────────────────────────────────────────────────────────┐
│  Navbar  h=44px  [Logo] [熊猫名▾] [情绪]              [钱包]      │
├──────────┬─────────────────────────────────────┬───────────────────┤
│ Panda    │  ChartHeader + CandlestickChart      │ DecisionChain     │
│ Sidebar  │  Volume sub-chart                    │ 170px             │
│ 180px    │  AccountPanel | StrategyBuilder      │                   │
│          │  SpeedControl + PoolLabel            │                   │
└──────────┴─────────────────────────────────────┴───────────────────┘
│  TradeHistory（可选：主区下方或抽屉）                                │
└────────────────────────────────────────────────────────────────────┘
```

#### 组件树

```
DashboardPage
├── Navbar (h=44px)
│   ├── Logo
│   ├── PandaSelector
│   ├── EmotionIndicator（emoji only，无数值）
│   └── WalletButton
│
├── DashboardContent (grid: 180px | 1fr | 170px)
│   │
│   ├── PandaSidebar (180px)
│   │   ├── PandaAvatar 80×80（Rive）
│   │   ├── 名字 + 阶段/熟练度
│   │   ├── ExperienceBar 140×8
│   │   ├── PersonalitySummary（五轴文本或 compact radar）
│   │   ├── TalentBadge
│   │   ├── CalmBambooButton
│   │   └── PandaSelector footer
│   │
│   ├── MainColumn (flex-1)
│   │   ├── ChartPanel
│   │   │   ├── ChartHeader（交易对、--text-price-lg、24h %）
│   │   │   ├── TimeframeTabs [15m|1h|4h|1d]
│   │   │   ├── CandlestickChart + TradeMarkers
│   │   │   └── VolumeChart
│   │   ├── BottomSplit (grid 2 cols)
│   │   │   ├── AccountPanel
│   │   │   └── StrategySection
│   │   │       ├── StrategyBuilder（主）
│   │   │       ├── StrategyTextInput（折叠）
│   │   │       ├── StrategyPreview
│   │   │       └── StrategyValidateHint
│   │   ├── SpeedControl
│   │   └── PoolLabel → Link `/pools`
│   │
│   └── DecisionChain (170px)
│       ├── LatestDecisionCard
│       ├── DecisionSteps（折叠 8 步 + Step1 规则命中）
│       ├── PandaMonologue
│       └── DecisionHistoryList
│
└── TradeHistory（virtual list，可选位置见响应式）
```

#### 状态管理

**useSimulationStore**（核心 store）：

```typescript
interface SimulationState {
  // 运行状态
  status: 'idle' | 'running' | 'paused' | 'stopped';
  speed: 1 | 10 | 100 | 'instant';

  // 实时数据
  currentPrice: number;
  lastUpdated: number;

  // 账户
  balance: number;
  position: { amount: number; entryPrice: number; coin: string } | null;
  unrealizedPnl: number;
  realizedPnl: number;

  // 决策
  latestDecision: DecisionLog | null;
  decisionHistory: DecisionLog[];

  // 交易历史
  tradeHistory: TradeRecord[];

  // 策略
  strategy: {
    text: string;
    parsed: ParsedStrategy | null;
    proficiency: number;  // 0-100
    matchScore: number;   // 0-100
    warnings: string[];
  };

  // 情绪
  emotion: EmotionType;

  // Actions
  start: () => void;
  pause: () => void;
  stop: () => void;
  setSpeed: (speed: 1 | 10 | 100 | 'instant') => void;
  updatePrice: (price: number) => void;
  addDecision: (decision: DecisionLog) => void;
  addTrade: (trade: TradeRecord) => void;
  updateEmotion: (emotion: EmotionType) => void;
  setStrategy: (text: string) => void;
  useCalmBamboo: () => void;
}
```

**usePandaStore**：

```typescript
interface PandaState {
  currentPandaId: string | null;
  personality: PersonalityData | null;
  talent: number;
  talentName: string;
  experienceLevel: number;
  generation: number;

  // 多熊猫列表
  myPandas: PandaSummary[];

  // Actions
  setCurrentPanda: (id: string) => void;
  loadPandaData: (data: PandaData) => void;
  updateExperience: (exp: number) => void;
}
```

#### 数据流（TanStack Query）

```typescript
// 熊猫链上数据
const pandaQuery = useQuery({
  queryKey: ['panda', pandaId],
  queryFn: () => fetchPandaOnChain(pandaId),
  staleTime: 60_000,        // 性格/天赋不变，缓存 1 分钟
  cacheTime: 5 * 60_000,
});

// 交易历史
const tradeHistoryQuery = useQuery({
  queryKey: ['trades', pandaId],
  queryFn: () => fetchTradeHistory(pandaId),
  staleTime: 10_000,
  refetchInterval: 30_000,  // 每 30 秒刷新
});

// 策略提交（mutation）
const feedStrategyMutation = useMutation({
  mutationFn: (parsed: ParsedStrategy) => feedStrategy(pandaId, { parsed }),
  onSuccess: (result) => {
    simulationStore.setStrategy(result);
  },
});

// 可选：自然语言解析后再灌入 Builder
const parseStrategyMutation = useMutation({
  mutationFn: (text: string) => feedStrategy(pandaId, { raw_text: text, parse_with_llm: true }),
  onSuccess: (result) => {
    strategyBuilderStore.hydrateFromParsed(result.parsed);
  },
});
```

#### WebSocket 订阅（方案甲 · 单连接）

| 步骤 | 说明 |
|------|------|
| REST | `GET /api/market/candles?pool=…&interval=1m&limit=100`（BFF → monitor） |
| WSS | `NEXT_PUBLIC_WS_URL` → Hub |
| `subscribe.market` | 收 `market.tick`（含 `candle`）更新 K 线 |
| `subscribe.simulation` | 收熊猫决策/情绪/成交 |

Dashboard 通过 **Hub** 接收以下实时事件（K 线 + 熊猫 **同一 WebSocket**）：

```typescript
// 连接到模拟盘 WebSocket
const { status, sendMessage } = useWebSocket({
  url: `${WS_BASE}/simulation/${pandaId}`,
  onMessage: (event: SimulationEvent) => {
    switch (event.type) {
      case 'price_update':
        simulationStore.updatePrice(event.data.price);
        break;
      case 'decision_made':
        simulationStore.addDecision(event.data);
        break;
      case 'trade_executed':
        simulationStore.addTrade(event.data);
        queryClient.invalidateQueries(['trades', pandaId]);
        break;
      case 'emotion_changed':
        simulationStore.updateEmotion(event.data.emotion);
        break;
      case 'experience_gained':
        pandaStore.updateExperience(event.data.experience);
        break;
    }
  },
});
```

#### K 线图组件（CandlestickChart）

```typescript
interface CandlestickChartProps {
  pandaId: string;
  timeframe: '15m' | '1h' | '4h' | '1d';
  trades: TradeRecord[];       // 用于渲染买卖标记
  indicators: {
    rsi?: boolean;
    ma20?: boolean;
  };
  onTimeframeChange: (tf: string) => void;
}
```

Lightweight Charts 配置：

```typescript
const chartOptions: DeepPartial<ChartOptions> = {
  layout: {
    background: { type: ColorType.Solid, color: '#ede8dc' },  // --color-bg-card 熟宣纸
    textColor: '#5a5a52',                                      // --color-text-secondary 淡墨
    fontFamily: "'Noto Sans SC', 'Inter', sans-serif",
  },
  grid: {
    vertLines: { color: '#d4cbb8' },     // --color-border 淡墨线
    horzLines: { color: '#d4cbb8' },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: { color: '#2d5a3d', width: 1, style: LineStyle.Dashed }, // 竹青
    horzLine: { color: '#2d5a3d', width: 1, style: LineStyle.Dashed },
  },
  timeScale: {
    borderColor: '#d4cbb8',
    timeVisible: true,
    secondsVisible: false,
  },
  rightPriceScale: {
    borderColor: '#d4cbb8',
  },
};

// K 线颜色 — 国画色谱
const candlestickOptions = {
  upColor: '#2d5a3d',        // --color-success 竹青
  downColor: '#c23a3a',      // --color-danger 朱砂
  borderUpColor: '#2d5a3d',
  borderDownColor: '#c23a3a',
  wickUpColor: '#2d5a3d',
  wickDownColor: '#c23a3a',
};
```

交易标记：
- BUY → 绿色向上箭头 `▲`，标注在对应 K 线下方
- SELL → 红色向下箭头 `▼`，标注在对应 K 线上方

#### 决策链面板（DecisionPanel）

```typescript
interface DecisionPanelProps {
  decision: DecisionLog | null;
  expanded: boolean;
  onToggle: () => void;
}

interface DecisionLog {
  timestamp: number;
  steps: DecisionStep[];
  finalScore: number;
  threshold: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  executedPosition?: number;
}

interface DecisionStep {
  name: string;           // "策略信号" | "熟练度噪声" | ...
  inputLabel: string;     // "RSI=28 < 30"
  inputValue: number;
  modifier: number;       // 修正系数（如 1.08）
  outputScore: number;    // 经此步后的累积分数
  highlight?: boolean;    // 是否高亮（关键影响步骤）
}
```

决策链 8 步可视化：每步渲染为一个水平条，展示 name → inputLabel → modifier → 进度条（outputScore）。

**Step 1 扩展（猎手）**：展示 `signal_rules` 命中明细——买/卖各几条、已编译总条数、`(buy_hits - sell_hits) / total` 投票结果；命中的规则行高亮。

动画：展开时从上到下 stagger 进入，每步间隔 50ms。

#### 策略积木组件（StrategyBuilder · 主路径）

```typescript
type SupportedIndicator = 'RSI' | 'MA20' | 'MACD' | 'PRICE';

interface SignalRuleRow {
  id: string;                          // 前端行 id
  indicator: SupportedIndicator;
  condition: string;                   // 由条件下拉生成，如 "< 30", "cross_above"
  threshold?: number;                  // RSI/PRICE 必填；MA/MACD 交叉类隐藏
  action: 'BUY' | 'SELL';
}

interface StrategyBuilderProps {
  philosophy: PhilosophyType;
  rules: SignalRuleRow[];
  positionPct: number;                 // 0.01–0.25
  stopLossPct: number;
  maxDrawdownPct: number;
  onPhilosophyChange: (p: PhilosophyType) => void;
  onRulesChange: (rules: SignalRuleRow[]) => void;
  onSubmit: (parsed: ParsedStrategy) => void;
  onValidate: () => void;              // POST …/strategy/validate
  loading: boolean;
  matchScore: number | null;
  warnings: string[];
  errors: Array<{ ruleIndex?: number; message: string }>;
}
```

**单行字段（StrategyRuleRow）**：

| 列 | 控件 | 校验 |
|----|------|------|
| 指标 | 下拉 RSI / MA20 / MACD / PRICE | 必填 |
| 条件 | 随指标变（低于/高于/上穿/下穿/金叉/死叉） | 必填 |
| 阈值 | 数字；交叉类隐藏 | RSI 0–100；PRICE > 0 |
| 动作 | 买入 / 卖出 | 必填 |
| 预览 | 只读人话，如「RSI 低于 30 → 买入」 | — |

**约束**：至少 1 条、最多 8 条；提交前客户端 + `validate` 端点试编译；无效行红框。

**预设模板（StrategyTemplates）**：

| 模板 | 规则 |
|------|------|
| RSI 抄底逃顶 | RSI&lt;30 BUY + RSI&gt;70 SELL |
| 均线趋势 | MA20 上穿 BUY + 下穿 SELL |
| MACD 趋势 | 金叉 BUY + 死叉 SELL |
| 极简抄底 | 仅 RSI&lt;30 BUY |

首次选模板 **覆盖** 列表；已有规则时 **追加**（产品默认）。

**软警告（黄条，可提交）**：仅 BUY 无 SELL；仅 SELL（MVP 只做多）；哲学与规则风格不一致。

#### 策略文本输入（StrategyTextInput · 进阶）

```typescript
interface StrategyTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onParse: () => void;                 // raw_text + parse_with_llm → 结果写入 Builder
  loading: boolean;
  collapsed?: boolean;                 // 默认折叠
}
```

特性：
- 可选折叠；解析成功后 **灌入 StrategyBuilder** 可编辑，再 `parsed` 提交
- 解析走 LLM，受 5 次/分钟限流
- 保留 3 个示例策略卡片（一键填入文本框）

#### 提交数据流

```typescript
// 主路径：不调 LLM
const parsed: ParsedStrategy = {
  philosophy,
  position_sizing: { type: 'fixed', value: positionPct, scale_in: false },
  signal_rules: rules.map(({ indicator, condition, threshold, action }) => ({
    indicator, condition, threshold, action,
  })),
  risk_management: {
    stop_loss_pct: stopLossPct,
    max_drawdown_pct: maxDrawdownPct,
    take_profit_pct: takeProfitPct,
  },
};
await feedStrategy(pandaId, { parsed });
```

#### 模拟速度控制（SimulationControls）

```typescript
interface SimulationControlsProps {
  status: 'idle' | 'running' | 'paused' | 'stopped';
  speed: 1 | 10 | 100 | 'instant';
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: 1 | 10 | 100 | 'instant') => void;
}
```

速度按钮组：`[1x] [10x] [100x] [⚡ instant]`，当前选中高亮为 accent。

#### 交易历史列表（TradeHistory）

```typescript
interface TradeHistoryProps {
  trades: TradeRecord[];
  onExpandDecision: (tradeId: string) => void;
}

interface TradeRecord {
  id: string;
  timestamp: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  coin: string;
  amount: number;
  entryPrice: number;
  exitPrice?: number;
  pnl?: number;
  pnlPercent?: number;
  decisionLog: DecisionLog;
}
```

使用 `@tanstack/react-virtual` 实现虚拟列表，每条记录高度 48px，点击展开显示完整决策链。

---

### 3.4 Trading Interface（交易界面）

> 设计稿：`design-spec/trading-interface-spec.md` · mockup `trading-interface.png`  
> 路由：`/trading/[id]` · **MVP 可选**：模拟盘以 Dashboard 为主；本页用于订单簿/深度展示与 Pro 向交互原型。

#### 页面布局（三栏）

```
┌──────────┬────────────────────────┬───────────┐
│ 持仓列表  │   订单簿 + 深度 320px   │ 交易表单  │
│ 220px    │   价格 + Spread        │ 224px     │
│ 📦 持仓   │   Ask/Bid 表格 + 深度图 │ 买|卖 限价/市价 │
│ 总盈亏    │   最新成交列表          │ 25%-100%  │
│ 策略摘要   │                        │ 📋 交易历史 │
└──────────┴────────────────────────┴───────────┘
```

#### 组件规格

| 组件 | 规格 |
|------|------|
| **PositionList** | 220px；每项：资产 Long、数量、盈亏 `$` + 🟢/🔴、盈亏%、入场价；盈利底 `--color-accent-light` / 亏损 `#FFF0F0` |
| **OrderBook** | 自定义表；Bid 绿 / Ask 红；深度图 50% 透明；Spread 居中灰线；Hub/`market.tick` 或 orderbook REST 刷新 |
| **TradeForm** | Buy=`--color-accent` / Sell=`--color-danger`；限价/市价切换；快速 [25%][50%][75%][100%]；提交按钮文案随方向 |
| **TradeHistory** | 时间+操作+数量+价格+盈亏；底部「查看更多 →」 |

#### 关键交互

1. Buy/Sell 切换联动表单色与按钮文案  
2. 市价隐藏价格输入  
3. 深度图 hover 显示价位与深度  
4. 订单簿行 hover 高亮  

**MVP 说明**：熊猫自主交易在 Dashboard 模拟；本页 **用户手动下单为可选/后续**，当前可实现为只读订单簿 + 持仓展示。

---

### 3.5 Pool Selection（交易池选择）

> 设计稿：`design-spec/pool-selection-spec.md` · mockup `pool-selection.png`  
> 路由：`/pools` · 确认后写回熊猫 `subscribed_pools` 并返回 Dashboard。

#### 页面布局

```
居中 h1「选择交易池」+ 副标题「可多选」
┌─────────────────────────────────────────────┐
│ ☑ Cetus BTC/SUI    流动性 $2.1M   +5.3% 🟢  │
│ ☐ DeepBook SUI/USDC  🏷️推荐      -1.2% 🔴  │
│ ...（列表项 h=72px, gap=10px）               │
└─────────────────────────────────────────────┘
固定底栏 h=50px：已选 N 个 [清空] [✅ 确认选择]
```

#### PoolListItem

| 状态 | 样式 |
|------|------|
| 未选 | bg `#FFFFFF`, border `--color-border`, radius `--radius-lg` |
| 已选 | bg `--color-accent-light`, border `--color-accent` 2px |

行结构：Checkbox + 池名 + 描述 | 流动性 + 24h 量 | 价格 + 24h 涨跌 | 费率 / 🏷️推荐（DeepBook 池）

#### 状态

| 状态 | UI |
|------|-----|
| loading | 5 行骨架屏 |
| empty | 「暂无可用交易池」 |
| selected=0 | 确认按钮 disabled 灰字 |
| selected≥1 | 确认按钮竹青可用 |

#### 关键交互

1. 点击行或 Checkbox 切换选中  
2. 底部计数实时更新  
3. 清空一键取消  
4. 确认 → 保存 → `/dashboard/[id]` 或 `/trading/[id]`  
5. DeepBook SUI/USDC 显示推荐标签（与 market-monitor 数据源一致）

**数据源（工程）**：MVP 列表可来自 monitor `/health` 池目录 + 静态费率；Cetus 池 Phase 2 接 `market:tick:cetus`（见 `docs/cetus-integration-research.md`）。

---

### 3.6 Market（NFT 市场）

> 设计稿：`design-spec/market-page-spec.md` · mockup `market-page.png`

#### 页面职责

浏览、搜索、购买/上架熊猫 NFT 的交易市场。

#### SEO

```typescript
export const metadata: Metadata = {
  title: '熊猫市场 — TradingPanda',
  description: '浏览和购买训练好的 AI 交易熊猫 NFT，每只都有独特性格、天赋和交易记录。',
};
```

#### 页面布局（Obsidian）

```
Navbar
🔍 SearchBar 600px          SortDropdown [最新上架 ▼]
FilterBar：天赋 Badge | 经验 Checkbox | 价格 Slider | 性格 Slider×5
Grid 4×N  卡片 183×210  gap 24px
Pagination 居中
```

#### 弹窗规格（Obsidian）

| 弹窗 | 宽度 | 说明 |
|------|------|------|
| MarketDetailModal | 800px (`--modal-width-lg`) | scale-in 200ms；overlay `--color-overlay` |
| PurchaseConfirmModal | 400px | 价格+版税+Gas+风险提示 |
| ListPandaModal | 600px | 价格、版税 2–5%、留言 200 字 |

#### 组件树

```
MarketPage
├── Navbar
│
├── MarketHeader
│   ├── h1 "熊猫市场"
│   ├── SearchInput（搜索框）
│   └── Button "上架我的熊猫"
│
├── MarketToolbar
│   ├── SearchBar（w=600px, bg white, placeholder「搜索熊猫名 / NFT ID...」, 清除 ✕）
│   ├── SortDropdown [最新上架 | 价格低→高 | 价格高→低 | 经验高→低 | 胜率高→低]
│   └── FilterBar（bg `--color-bg-card`）
│       ├── TalentFilter Badges [全部][竹林禅心][黑白视界]…
│       ├── LevelCheckboxes [幼年][成长][成熟]
│       ├── PriceRange Slider 0–10 SUI
│       └── PersonalityMinSliders ×5
│
├── MarketGrid (4 cols desktop, gap 24px)
│   └── PandaCard 183×210
│       ├── PandaAvatar（80×80 圆，卡片内居中）
│       ├── 熊猫名（--font-heading）
│       ├── 性格摘要（胆识90 耐性15 直觉70）
│       ├── TalentBadge（talent≠0 时竹青发光）
│       ├── 统计（Lv / 交易笔数 / 胜率）
│       ├── 价格（SUI）
│       ├── Button "购买" / Badge "交易中" / Badge "我的"
│       └── onClick → 打开 MarketDetailModal
│
├── Pagination（居中，当前页 `--color-accent`）
│
├── LoadMoreButton / InfiniteScroll（可选，与分页二选一）
│
├── MarketDetailModal（弹窗）
│   ├── ModalHeader（熊猫名 + 关闭按钮）
│   ├── ModalBody (grid: 2 cols)
│   │   ├── PandaAvatar（226×301）
│   │   └── StatsPanel
│   │       ├── PersonalityRadar（280×280）
│   │       ├── TalentBadge
│   │       ├── 交易统计：总交易/胜率/夏普/最大回撤
│   │       ├── 当前策略摘要
│   │       ├── 训练者地址
│   │       └── 训练者留言
│   ├── ModalFooter
│   │   ├── 价格 + 版税信息
│   │   └── Button "以 X SUI 购买"
│   └── [已是主人时]
│       └── Button "下架" (danger)
│
├── PurchaseConfirmModal（购买确认二次弹窗）
│   ├── "确认以 [price] SUI 购买？"
│   ├── 费用明细：价格 + gas + 版税
│   ├── Button "确认购买" / Button "取消"
│   └── [loading 状态] "交易确认中..."
│
└── ListPandaModal（上架弹窗）
    ├── 选择要上架的熊猫
    ├── Input 价格（SUI）
    ├── Slider 版税（2-5%）
    ├── Textarea 训练者留言（可选）
    └── Button "确认上架"
```

#### PandaCard 组件（Obsidian）

| 属性 | 值 |
|------|-----|
| 尺寸 | **183×210px** |
| 背景 | `#FFFFFF` |
| 边框 | 默认 `--color-border`；稀有天赋 `--color-warning` 2px + `--shadow-glow-rare` |
| 熊猫名 | `--text-h3`, `--font-heading` |
| 性格 | 最高两轴小字 |
| 价格 | `--text-price` bold |
| 购买按钮 | accent；稀有 `--color-warning` |
| 时间 | 「⏰ 3小时前」 |

**卡片变体**：默认 | 稀有天赋发光 | 交易中遮罩「🔒 交易中」 | 自己上架「🏷️ 我的」 | 已售出灰遮罩

```typescript
interface PandaCardProps {
  nftId: string;
  name: string;
  personality: PersonalityData;
  talent: number;
  talentName: string;
  experienceLevel: number;
  totalTrades: number;
  winRate: number;
  price: number;
  listedAt: number;
  variant: 'default' | 'rare' | 'trading' | 'owned' | 'sold';
  isTrading: boolean;
  isOwner: boolean;
  onClick: () => void;
}
```

卡片布局（183×210）：

```
┌──────────────────┐
│   PandaAvatar    │  80×80 圆
│  阿暴            │
│  胆识90 耐性15   │  最高两轴
│  🎋 竹笋嗅觉     │  稀有=金边
│  Lv.35 · 胜率62% │
│  5 SUI  [购买]   │
│  ⏰ 3小时前       │
└──────────────────┘
```

#### 状态管理

**useMarketStore**：

```typescript
interface MarketState {
  // 筛选
  filters: {
    talent: number[];           // 天赋筛选
    boldnessRange: [number, number];
    patienceRange: [number, number];
    intuitionRange: [number, number];
    focusRange: [number, number];
    contrarianRange: [number, number];
    levelRange: [number, number];
    priceRange: [number, number];
    searchQuery: string;
  };

  // 排序
  sortBy: 'newest' | 'price_asc' | 'price_desc' | 'win_rate' | 'level';

  // 分页
  page: number;
  hasMore: boolean;

  // 选中的熊猫（详情弹窗）
  selectedPandaId: string | null;

  // Actions
  setFilter: <K extends keyof MarketState['filters']>(key: K, value: MarketState['filters'][K]) => void;
  resetFilters: () => void;
  setSortBy: (sort: MarketState['sortBy']) => void;
  setSelectedPanda: (id: string | null) => void;
  nextPage: () => void;
}
```

#### 数据流

```typescript
// 市场列表
const marketQuery = useInfiniteQuery({
  queryKey: ['market', filters, sortBy],
  queryFn: ({ pageParam = 0 }) =>
    fetchMarketListings({ ...filters, sortBy, offset: pageParam, limit: 20 }),
  getNextPageParam: (lastPage) => lastPage.nextOffset,
  staleTime: 15_000,
});

// 熊猫详情
const pandaDetailQuery = useQuery({
  queryKey: ['market', 'detail', selectedPandaId],
  queryFn: () => fetchPandaDetail(selectedPandaId!),
  enabled: !!selectedPandaId,
  staleTime: 30_000,
});

// 购买 mutation
const purchaseMutation = useMutation({
  mutationFn: ({ kioskId, nftId, price }: PurchaseParams) =>
    purchaseFromKiosk(kioskId, nftId, price),
  onSuccess: () => {
    toast.success('购买成功！');
    queryClient.invalidateQueries(['market']);
    queryClient.invalidateQueries(['pandas', address]);
    marketStore.setSelectedPanda(null);
  },
  onError: (error) => {
    toast.error(parseSuiError(error));
  },
});

// 上架 mutation
const listMutation = useMutation({
  mutationFn: (params: ListParams) => listToKiosk(params),
  onSuccess: () => {
    toast.success('上架成功！');
    queryClient.invalidateQueries(['market']);
  },
});
```

---

### 3.7 Leaderboard（排行榜）

#### 页面职责

展示全平台熊猫排行，激励竞争。

#### SEO

```typescript
export const metadata: Metadata = {
  title: '排行榜 — TradingPanda',
  description: '查看全平台 AI 交易熊猫排行——胜率、总收益、经验等级，看看谁家熊猫最厉害。',
};
```

#### 组件树

```
LeaderboardPage
├── Navbar
│
├── PageHeader
│   └── h1 "排行榜"
│
├── RankDimensionTabs
│   └── Tabs [胜率 | 总收益 | 经验等级 | 最大单笔收益]
│
├── LeaderboardTable
│   ├── TableHeader
│   │   └── [排名 | 熊猫 | 训练者 | 指标值 | 等级 | 天赋]
│   ├── PandaRank × N
│   │   ├── 排名数字（#1 #2 #3 金银铜样式）
│   │   ├── PandaAvatar (mini, 40×53)
│   │   ├── 熊猫名
│   │   ├── 训练者地址（缩写）
│   │   ├── 指标值（胜率 / 收益 / 等级）
│   │   ├── ExperienceBar (mini)
│   │   └── TalentBadge (mini)
│   └── MyRankHighlight（我的排名，固定在底部高亮行）
│
└── Pagination / InfiniteScroll
```

#### PandaRank 组件

```typescript
interface PandaRankProps {
  rank: number;
  pandaId: string;
  pandaName: string;
  trainerAddress: string;
  metricValue: number;        // 当前维度的值
  metricLabel: string;        // 如 "68.4%"
  experienceLevel: number;
  talent: number;
  talentName: string;
  isCurrentUser: boolean;     // 是否为当前用户的熊猫
}
```

Top 3 排名样式：
- #1: 朱砂边框 + 印章图标
- #2: 银色边框
- #3: 铜色边框

#### 状态管理

本地状态：`dimension`（当前排行维度）

#### 数据流

```typescript
const leaderboardQuery = useQuery({
  queryKey: ['leaderboard', dimension, page],
  queryFn: () => fetchLeaderboard({ dimension, page, limit: 50 }),
  staleTime: 60_000,
});

const myRankQuery = useQuery({
  queryKey: ['leaderboard', 'my-rank', dimension, address],
  queryFn: () => fetchMyRank({ dimension, address }),
  enabled: !!address,
  staleTime: 60_000,
});
```

---

### 3.8 Achievement（成就系统）

#### 页面职责

展示所有成就，已解锁/未解锁状态，激励探索。

#### SEO

```typescript
export const metadata: Metadata = {
  title: '成就 — TradingPanda',
  description: '查看你的交易成就——收集所有成就徽章，成为最强训练者。',
};
```

#### 组件树

```
AchievementPage
├── Navbar
│
├── AchievementHeader
│   ├── h1 "成就系统"
│   ├── 进度摘要 "已解锁 12/48"
│   └── RarityFilter [全部 | 普通 | 稀有 | 史诗 | 传说]
│
├── AchievementGrid (CSS Grid, 4 cols)
│   └── AchievementCard × N
│       ├── 图标（已解锁=彩色, 未解锁=灰色锁定）
│       ├── 成就名称
│       ├── 描述
│       ├── RarityBadge (common/rare/epic/legendary)
│       ├── 解锁条件进度条（如 "30/100 笔交易"）
│       └── 解锁时间（已解锁时显示）
│
└── AchievementUnlockAnim（全局浮层，解锁时触发）
    ├── 墨点/竹叶粒子特效
    ├── 成就图标放大展示
    ├── 成就名称 + 描述
    └── 自动 3s 消失
```

#### AchievementCard 组件

```typescript
interface AchievementCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: number;
  progress?: { current: number; target: number };
}
```

稀有度对应色：
- common → `--color-rarity-common` (#9a9a8e 枯墨)
- rare → `--color-rarity-rare` (#4a6d8c 花青)
- epic → `--color-rarity-epic` (#6b4c8a 紫藤)
- legendary → `--color-rarity-legendary` (#c23a3a 朱砂) + glow 动画

#### 数据流

```typescript
const achievementsQuery = useQuery({
  queryKey: ['achievements', address],
  queryFn: () => fetchAchievements(address),
  enabled: !!address,
  staleTime: 60_000,
});
```

---

### 3.9 Profile（个人中心）

#### 页面职责

用户管理中心——查看我的熊猫、签到、统计、设置。

#### SEO

```typescript
export const metadata: Metadata = {
  title: '个人中心 — TradingPanda',
  description: '管理你的 AI 交易熊猫、每日签到、查看统计数据。',
};
```

#### 组件树

```
ProfilePage
├── Navbar
│
├── ProfileHeader
│   ├── 用户地址（缩写 + 复制按钮）
│   ├── StatsOverview
│   │   ├── 总熊猫数
│   │   ├── 总交易笔数
│   │   ├── 总收益
│   │   └── 总胜率
│   └── CheckInButton "签到" / "已签到 ✅"
│
├── CheckInCalendar
│   ├── 月历视图
│   ├── 已签到日期高亮（accent 色）
│   ├── 连续签到天数标注
│   └── 签到奖励说明
│
├── MyPandaList (grid, 3 cols)
│   └── PandaCard × N（可点击进入 Dashboard）
│       ├── PandaAvatar
│       ├── 名字 + 等级
│       ├── 胜率
│       ├── 情绪状态
│       ├── Button "进入交易室" → /dashboard/[id]
│       └── Button "上架出售" → 打开 ListPandaModal
│
└── SettingsPanel
    ├── 通知设置（开/关）
    ├── 动画减少模式（开/关）
    └── 断开钱包按钮
```

#### 数据流

```typescript
// 我的熊猫
const myPandasQuery = useQuery({
  queryKey: ['pandas', address],
  queryFn: () => fetchUserPandas(address),
  enabled: !!address,
  staleTime: 30_000,
});

// 签到状态
const checkInQuery = useQuery({
  queryKey: ['checkin', address],
  queryFn: () => fetchCheckInStatus(address),
  enabled: !!address,
  staleTime: 60_000,
});

// 签到 mutation
const checkInMutation = useMutation({
  mutationFn: () => doCheckIn(address),
  onSuccess: () => {
    toast.success('签到成功！');
    queryClient.invalidateQueries(['checkin', address]);
  },
});

// 统计数据
const statsQuery = useQuery({
  queryKey: ['stats', address],
  queryFn: () => fetchUserStats(address),
  enabled: !!address,
  staleTime: 60_000,
});
```

---

## 四、状态管理设计

### 4.1 Zustand Stores

#### useAuthStore

```typescript
interface AuthState {
  // State
  walletConnected: boolean;
  address: string | null;
  walletType: 'sui-wallet' | 'zklogin' | null;
  network: 'mainnet' | 'testnet' | 'devnet';

  // Actions
  setWalletConnected: (connected: boolean) => void;
  setAddress: (address: string | null) => void;
  setWalletType: (type: AuthState['walletType']) => void;
  disconnect: () => void;
  reset: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  walletConnected: false,
  address: null,
  walletType: null,
  network: 'mainnet',

  setWalletConnected: (connected) => set({ walletConnected: connected }),
  setAddress: (address) => set({ address }),
  setWalletType: (type) => set({ walletType: type }),
  disconnect: () => set({
    walletConnected: false,
    address: null,
    walletType: null,
  }),
  reset: () => set({
    walletConnected: false,
    address: null,
    walletType: null,
  }),
}));
```

#### usePandaStore

```typescript
interface PandaState {
  // State
  currentPandaId: string | null;
  personality: {
    boldness: number;
    patience: number;
    intuition: number;
    focus: number;
    contrarian: number;
  } | null;
  talent: number;
  talentName: string;
  experienceLevel: number;
  generation: number;
  name: string;

  myPandas: Array<{
    id: string;
    name: string;
    experienceLevel: number;
    emotion: EmotionType;
    winRate: number;
    isTrading: boolean;
  }>;

  // Actions
  setCurrentPanda: (id: string) => void;
  loadPandaData: (data: PandaFullData) => void;
  updateExperience: (exp: number) => void;
  setMyPandas: (pandas: PandaState['myPandas']) => void;
}
```

#### useSimulationStore

（见 3.3 Dashboard 章节详细定义。）

#### useMarketStore

（见 3.4 Market 章节详细定义。）

#### useUIStore

```typescript
interface UIState {
  // State
  activeModal: string | null;              // 当前打开的 Modal ID
  modalData: Record<string, unknown>;      // Modal 传参
  sidebarOpen: boolean;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }>;
  reducedMotion: boolean;

  // Actions
  openModal: (id: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  setReducedMotion: (reduced: boolean) => void;
}
```

### 4.2 TanStack Query 策略

| Query Key | staleTime | cacheTime | refetchInterval | 说明 |
|-----------|-----------|-----------|-----------------|------|
| `['pandas', address]` | 30s | 5min | - | 用户的熊猫列表 |
| `['panda', pandaId]` | 60s | 5min | - | 单只熊猫链上数据 |
| `['trades', pandaId]` | 10s | 5min | 30s | 交易历史 |
| `['market', filters, sortBy]` | 15s | 5min | - | 市场列表 |
| `['market', 'detail', pandaId]` | 30s | 5min | - | 市场熊猫详情 |
| `['leaderboard', dim, page]` | 60s | 10min | - | 排行榜 |
| `['achievements', address]` | 60s | 10min | - | 成就列表 |
| `['checkin', address]` | 60s | 5min | - | 签到状态 |
| `['stats', address]` | 60s | 5min | - | 用户统计 |
| `['leaderboard', 'my-rank', ...]` | 60s | 5min | - | 我的排名 |

全局 QueryClient 配置：

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

---

## 五、WebSocket 集成

实时通道部署在 **Cloudflare Workers + Durable Objects**，不经过 Vercel（Serverless 无长连接）。连接基址使用环境变量 **`NEXT_PUBLIC_WS_URL`**（完整 `wss://…`）；JWT 仍由 Next.js 签发，握手时附带 `token`。契约见 `docs/api-specification.md` 第四章与 `docs/websocket-hub-design.md`。

### 5.1 连接管理

```typescript
// lib/websocket.ts

interface WebSocketConfig {
  url: string;
  token?: string;                // JWT 认证 token
  reconnectAttempts?: number;    // 最大重连次数，默认 5
  reconnectInterval?: number;    // 重连间隔，默认 3000ms
  heartbeatInterval?: number;    // 心跳间隔，默认 30000ms
}

class SimulationWebSocket {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectCount = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private handlers: Map<string, (data: unknown) => void> = new Map();

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectInterval: 3000,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  connect(): void {
    const url = this.config.token
      ? `${this.config.url}?token=${this.config.token}`
      : this.config.url;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectCount = 0;
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'pong') return; // 心跳响应
      const handler = this.handlers.get(message.type);
      if (handler) handler(message.data);
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.tryReconnect();
    };

    this.ws.onerror = () => {
      // onclose 会随后触发
    };
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, this.config.heartbeatInterval!);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private tryReconnect(): void {
    if (this.reconnectCount < this.config.reconnectAttempts!) {
      this.reconnectCount++;
      setTimeout(() => this.connect(), this.config.reconnectInterval!);
    }
  }

  on(type: string, handler: (data: unknown) => void): void {
    this.handlers.set(type, handler);
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
  }
}
```

### 5.2 事件处理

#### 事件类型定义

```typescript
// types/websocket.ts

type SimulationEvent =
  | { type: 'price_update'; data: { price: number; timestamp: number; volume: number } }
  | { type: 'candle_update'; data: { open: number; high: number; low: number; close: number; time: number } }
  | { type: 'decision_made'; data: DecisionLog }
  | { type: 'trade_executed'; data: TradeRecord }
  | { type: 'emotion_changed'; data: { emotion: EmotionType; trigger: string } }
  | { type: 'experience_gained'; data: { experience: number; levelUp: boolean } }
  | { type: 'strategy_parsed'; data: { parsed: ParsedStrategy; matchScore: number; warnings: string[] } }
  | { type: 'simulation_status'; data: { status: 'running' | 'paused' | 'stopped' } }
  | { type: 'error'; data: { code: string; message: string } };
```

#### useWebSocket Hook

```typescript
// hooks/useWebSocket.ts

function useWebSocket(pandaId: string) {
  const simulationStore = useSimulationStore();
  const pandaStore = usePandaStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new SimulationWebSocket({
      url: `${process.env.NEXT_PUBLIC_WS_URL}/simulation/${pandaId}`,
      token: getAuthToken(),
    });

    ws.on('price_update', (data: PriceUpdate) => {
      simulationStore.updatePrice(data.price);
    });

    ws.on('candle_update', (data: CandleData) => {
      // 更新 Lightweight Charts 实时数据
      chartRef.current?.update(data);
    });

    ws.on('decision_made', (data: DecisionLog) => {
      simulationStore.addDecision(data);
    });

    ws.on('trade_executed', (data: TradeRecord) => {
      simulationStore.addTrade(data);
      // 同时 invalidate TanStack Query 缓存
      queryClient.invalidateQueries({ queryKey: ['trades', pandaId] });
    });

    ws.on('emotion_changed', (data: EmotionData) => {
      simulationStore.updateEmotion(data.emotion);
    });

    ws.on('experience_gained', (data: ExpData) => {
      pandaStore.updateExperience(data.experience);
      if (data.levelUp) {
        // 触发升级动画
        uiStore.addNotification({
          type: 'success',
          message: `${pandaStore.name} 升级了！`,
        });
      }
    });

    ws.connect();

    return () => ws.disconnect();
  }, [pandaId]);
}
```

---

## 六、熊猫动画系统（Rive）

### 6.1 状态机设计

Rive 文件：`public/animations/panda.riv`

#### 状态机输入参数

| 输入名 | 类型 | 取值范围 | 说明 |
|--------|------|---------|------|
| emotion | string (enum) | focused / excited / greedy / cautious / panicking / numb | 当前情绪 |
| experience_level | number | 0-100 | 经验等级（影响体型） |
| is_trading | boolean | true / false | 是否正在交易中 |
| trade_result | trigger | - | 交易完成时触发 |
| is_profitable | boolean | true / false | 最近交易是否盈利 |

#### 状态与过渡

```
                 ┌──────────┐
                 │  idle    │  ← 默认入口
                 │ 正常站立  │
                 └────┬─────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ trading  │ │ sleeping │ │ eating   │
    │ 观察K线   │ │ 打瞌睡   │ │ 吃竹子   │
    │ 眼睛跟随  │ │ 缩成球   │ │ 冷静竹   │
    └────┬─────┘ └──────────┘ └──────────┘
         │
    ┌────┼────────────┬──────────┐
    ▼    ▼            ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│excited │ │cautious│ │panick  │ │numb    │
│兴奋跳动 │ │缩小沉思│ │发抖灰色│ │灰色不动│
│竹青光效 │ │慢速眨眼│ │眼睛大  │ │闭眼    │
└────────┘ └────────┘ └────────┘ └────────┘
```

#### 各状态视觉表现

| 状态 | 动作 | 颜色 | 眼睛 | 特效 |
|------|------|------|------|------|
| idle | 正常站立，偶尔眨眼 | 标准墨色 | 竹青，正常 | 无 |
| trading | 微微前倾，眼睛追踪 | 标准墨色 | 竹青，专注 | 无 |
| excited | 上下跳动，挥手 | 标准墨色 | 竹青，放大 | 竹青墨点粒子 |
| cautious | 缩小 5%，手抱胸 | 淡墨 | 半闭 | 无 |
| panicking | 左右发抖，缩小 10% | 枯墨灰调 | 大睁 | 墨滴汗珠 |
| numb | 静止不动 | 完全枯墨 | 闭眼 | 无 |
| sleeping | 缩成球，呼吸起伏 | 淡墨调 | 闭眼 | zzz 气泡 |
| eating | 双手拿竹子啃 | 恢复浓墨 | 眯眼满足 | 竹叶粒子 |

#### PandaAvatar 组件

```typescript
interface PandaAvatarProps {
  emotion: EmotionType;
  experienceLevel: number;
  isTrading: boolean;
  size?: 'sm' | 'md' | 'lg';     // sm=120×160, md=180×240, lg=226×301
  onAnimationComplete?: () => void;
}
```

使用 `@rive-app/react-canvas` 的 `useRive` hook：

```typescript
const { RiveComponent, rive } = useRive({
  src: '/animations/panda.riv',
  stateMachines: 'PandaStateMachine',
  autoplay: true,
});

// 当情绪变化时更新输入
useEffect(() => {
  if (rive) {
    const inputs = rive.stateMachineInputs('PandaStateMachine');
    const emotionInput = inputs?.find(i => i.name === 'emotion');
    const expInput = inputs?.find(i => i.name === 'experience_level');
    const tradingInput = inputs?.find(i => i.name === 'is_trading');

    if (emotionInput) emotionInput.value = emotion;
    if (expInput) expInput.value = experienceLevel;
    if (tradingInput) tradingInput.value = isTrading;
  }
}, [emotion, experienceLevel, isTrading, rive]);
```

### 6.2 性格驱动的表现差异

熊猫的外在表现受性格五轴影响：

| 性格维度 | 高值表现（>70） | 低值表现（<30） |
|---------|---------------|---------------|
| 胆识 (boldness) | 动作幅度大、步伐快、交易时眼睛发光更亮 | 动作小幅、步伐慢、交易时微微退缩 |
| 耐性 (patience) | 动作缓慢优雅、表情沉稳、等待时安静 | 动作急促、频繁抖脚、等待时焦躁 |
| 直觉 (intuition) | 头部偶尔歪向一侧"思考"、眼睛时常看远方 | 目光集中在屏幕、很少走神 |
| 专注 (focus) | 长时间保持同一姿势、极少分心动作 | 频繁左顾右盼、偶尔玩耍 |
| 逆向性 (contrarian) | 独特的"摇头"动作、有时背对方向 | 跟随节奏点头、正面朝向 |

实现方式：Rive 状态机中根据性格参数调整动画速度、幅度、频率。

---

## 七、K 线图集成

### 7.1 Lightweight Charts 配置

#### 主题配置

```typescript
// lib/chart.ts

import { createChart, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';

export function createTradingChart(container: HTMLElement) {
  const chart = createChart(container, {
    width: container.clientWidth,
    height: 400,
    layout: {
      background: { type: ColorType.Solid, color: '#ede8dc' },  // 熟宣纸
      textColor: '#5a5a52',                                       // 淡墨
      fontFamily: "'ZCOOL QingKe HuangYou', 'Noto Sans SC', sans-serif",
      fontSize: 14,
    },
    grid: {
      vertLines: { color: '#d4cbb820' },       // 半透明淡墨线
      horzLines: { color: '#d4cbb820' },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: '#2d5a3d80',                     // 竹青半透明
        width: 1,
        style: LineStyle.Dashed,
        labelBackgroundColor: '#2d5a3d',
      },
      horzLine: {
        color: '#2d5a3d80',
        width: 1,
        style: LineStyle.Dashed,
        labelBackgroundColor: '#2d5a3d',
      },
    },
    rightPriceScale: {
      borderColor: '#d4cbb8',                   // 淡墨线
      scaleMargins: { top: 0.1, bottom: 0.2 },
    },
    timeScale: {
      borderColor: '#d4cbb8',
      timeVisible: true,
      secondsVisible: false,
    },
    handleScroll: { vertTouchDrag: false },
  });

  // 添加 K 线序列 — 竹青/朱砂
  const candleSeries = chart.addCandlestickSeries({
    upColor: '#2d5a3d',        // 竹青
    downColor: '#c23a3a',      // 朱砂
    borderUpColor: '#2d5a3d',
    borderDownColor: '#c23a3a',
    wickUpColor: '#2d5a3d',
    wickDownColor: '#c23a3a',
  });

  return { chart, candleSeries };
}
```

#### 交易标记

```typescript
// BUY 标记 - 绿色向上箭头
candleSeries.setMarkers(trades.map(trade => ({
  time: trade.timestamp as UTCTimestamp,
  position: trade.action === 'BUY' ? 'belowBar' : 'aboveBar',
  color: trade.action === 'BUY' ? '#2d5a3d' : '#c23a3a',  // 竹青/朱砂
  shape: trade.action === 'BUY' ? 'arrowUp' : 'arrowDown',
  text: `${trade.action} @ $${trade.price.toLocaleString()}`,
})));
```

#### 技术指标叠加

```typescript
// RSI 指标 - 底部子图
const rsiSeries = chart.addLineSeries({
  color: '#2d5a3d',  // 竹青
  lineWidth: 1,
  priceScaleId: 'rsi',
  pane: 1,                  // 底部面板
});

// MA20 均线 - 叠加在主图
const ma20Series = chart.addLineSeries({
  color: '#4a6d8c',  // 花青
  lineWidth: 1,
  lineStyle: LineStyle.Solid,
});
```

#### 实时数据更新

```typescript
// WebSocket 推送的 candle 数据实时更新
function handleCandleUpdate(candle: CandleData) {
  candleSeries.update({
    time: candle.time as UTCTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  });
}
```

#### 自适应容器

```typescript
// CandlestickChart.tsx 中使用 ResizeObserver 自适应
useEffect(() => {
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      chart.applyOptions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    }
  });
  observer.observe(containerRef.current!);
  return () => observer.disconnect();
}, [chart]);
```

---

## 八、响应式设计

### 断点定义

```css
/* Tailwind config 中的断点 */
screens: {
  'xs': '320px',
  'sm': '375px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1440px',
  '2xl': '1920px',
}
```

### 各页面布局变化

#### Landing Page

| 断点 | 布局变化 |
|------|---------|
| >=1024px | Hero 双列（左文右图），Features 四列网格 |
| 768-1023px | Hero 单列（上文下图），Features 双列网格 |
| <768px | 全单列，Features 横向滚动 |

#### Mint Page

| 断点 | 布局变化 |
|------|---------|
| >=768px | 居中单列 max-width 800px；头像 **120×120**；Radar 默认 280 |
| <768px | 全宽；头像 96×96；按钮 fullWidth |

#### Dashboard

| 断点 | 布局变化 |
|------|---------|
| >=1280px | Obsidian 三栏：180px \| flex \| 170px |
| 1024–1279px | 隐藏决策链为右侧抽屉；主栏 + 180px 侧栏 |
| 768–1023px | 侧栏折叠为顶栏条；Chart 全宽；Account+Strategy 堆叠 |
| <768px | 单列：侧栏条 → Chart → 策略 → 决策链 Accordion |

#### Trading Interface

| 断点 | 布局变化 |
|------|---------|
| >=1280px | 220 \| 320+ \| 224 三栏 |
| <1280px | 持仓折叠；订单簿 + 表单上下堆叠 |

#### Pool Selection

| 断点 | 布局变化 |
|------|---------|
| >=768px | 列表 max-width 720px 居中；底栏 fixed |
| <768px | 列表全宽；确认栏 sticky bottom |

#### Market

| 断点 | 布局变化 |
|------|---------|
| >=1440px | **4 列**卡片 grid，gap 24px |
| 1024–1439px | 3 列 |
| 768–1023px | 2 列 |
| <768px | 1 列；FilterBar → 底部 Drawer |

#### Leaderboard

| 断点 | 布局变化 |
|------|---------|
| >=768px | 完整表格 |
| <768px | 简化表格（隐藏部分列），点击行查看详情 |

#### Achievement

| 断点 | 布局变化 |
|------|---------|
| >=1024px | 四列成就网格 |
| 768-1023px | 三列 |
| <768px | 两列 |

#### Profile

| 断点 | 布局变化 |
|------|---------|
| >=1024px | 签到日历和统计并排；熊猫列表三列 |
| 768-1023px | 签到日历全宽、统计全宽；熊猫列表两列 |
| <768px | 全单列 |

### 移动端特殊交互

- Dashboard K 线图支持双指缩放
- 决策链面板使用底部抽屉（sheet）代替内联展开
- 市场筛选使用全屏抽屉
- Tooltip 改为点击触发（而非 hover）
- 所有按钮最小触摸区域 44×44px

> **MVP 说明**：黑客松阶段优先实现 Desktop 布局（>=1024px），响应式适配在黑客松后迭代。

---

## 九、性能优化

### 动态导入

```typescript
// Lightweight Charts - 仅 Dashboard 页面加载
const CandlestickChart = dynamic(
  () => import('@/components/trading/CandlestickChart'),
  { loading: () => <Skeleton variant="rectangular" height={400} />, ssr: false }
);

// Rive 动画 - 仅包含熊猫的页面加载
const PandaAvatar = dynamic(
  () => import('@/components/panda/PandaAvatar'),
  { loading: () => <Skeleton variant="rectangular" width={226} height={301} />, ssr: false }
);

// 雷达图（recharts）
const PersonalityRadar = dynamic(
  () => import('@/components/panda/PersonalityRadar'),
  { loading: () => <Skeleton variant="circular" width={280} height={280} />, ssr: false }
);

// 市场详情弹窗
const MarketDetailModal = dynamic(
  () => import('@/components/market/MarketDetailModal'),
  { ssr: false }
);
```

### 图片优化

```typescript
// 使用 Next.js Image 组件
import Image from 'next/image';

<Image
  src="/images/panda-focused.png"
  alt="熊猫"
  width={226}
  height={301}
  priority                       // Hero 图片预加载
  placeholder="blur"
  blurDataURL={PANDA_BLUR_DATA}
/>
```

### 虚拟列表

交易历史和市场列表使用 `@tanstack/react-virtual`：

```typescript
const virtualizer = useVirtualizer({
  count: tradeHistory.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 48,        // 每行预估 48px
  overscan: 5,                   // 视口外预渲染 5 行
});
```

### 预加载策略

```typescript
// 在 Landing Page 预加载 Mint 页面
<Link href="/mint" prefetch>开始铸造</Link>

// 在 Mint 成功后预加载 Dashboard
useEffect(() => {
  if (mintStatus === 'success') {
    router.prefetch(`/dashboard/${pandaId}`);
  }
}, [mintStatus]);

// 预加载 Rive 动画文件
<link rel="preload" href="/animations/panda.riv" as="fetch" crossOrigin="anonymous" />
```

### 字体加载优化

```css
/* 仅加载必要的字重 */
@font-face {
  font-family: 'ZCOOL XiaoWei';
  font-display: swap;
  /* 子集化：仅包含 GB2312 常用汉字 + ASCII */
}
@font-face {
  font-family: 'Noto Serif SC';
  font-display: swap;
  font-weight: 400 700;
}
@font-face {
  font-family: 'Noto Sans SC';
  font-display: swap;
  font-weight: 400 500 700;
}
```

---

## 十、可访问性

### 键盘导航

| 区域 | 操作 | 快捷键 |
|------|------|--------|
| 全局 | 跳转主内容区 | Tab → "Skip to content" 链接 |
| 导航栏 | 切换页面 | Tab + Enter |
| 模态框 | 关闭 | Escape |
| K 线图 | 缩放 | 方向键 + / - |
| 决策链 | 展开/折叠 | Enter / Space |
| 市场卡片 | 打开详情 | Enter |
| 排行榜 | 切换维度 | 左右方向键 |

### 屏幕阅读器支持

```html
<!-- 熊猫情绪 -->
<div role="status" aria-live="polite" aria-label="熊猫当前情绪：专注">
  😐 "我在观察..."
</div>

<!-- K 线图 -->
<div role="img" aria-label="BTC/USD K线图，当前价格 $59,500，24小时涨幅 +2.3%">
  <canvas />
</div>

<!-- 雷达图 -->
<div role="img" aria-label="性格雷达图：胆识72，耐性45，直觉88，专注60，逆向性35">
  <svg />
</div>

<!-- 交易结果 -->
<div role="status" aria-live="assertive">
  交易完成：买入 0.045 BTC，当前盈亏 +$32.50
</div>

<!-- 成就解锁 -->
<div role="alert" aria-label="成就解锁：首次交易">
  解锁动画
</div>
```

### ARIA 标注

- 所有交互元素有 `aria-label`
- 加载状态使用 `aria-busy="true"`
- 错误状态使用 `role="alert"`
- 实时数据使用 `aria-live="polite"` / `"assertive"`
- 模态框使用 `role="dialog"` + `aria-modal="true"`
- 标签页使用 `role="tablist"` / `role="tab"` / `role="tabpanel"`

### 颜色对比度

所有文字颜色满足 WCAG AA 标准（4.5:1 对比度）：

| 前景 | 背景 | 对比度 | 合规 |
|------|------|--------|------|
| #1a1a18 (浓墨) | #f5f0e6 (宣纸) | 14.5:1 | AAA |
| #5a5a52 (淡墨) | #f5f0e6 (宣纸) | 5.1:1 | AA |
| #5a5a52 (淡墨) | #ede8dc (熟宣) | 4.5:1 | AA |
| #2d5a3d (竹青) | #f5f0e6 (宣纸) | 7.2:1 | AAA |
| #c23a3a (朱砂) | #f5f0e6 (宣纸) | 4.8:1 | AA |
| #4a6d8c (花青) | #f5f0e6 (宣纸) | 4.6:1 | AA |

### 减少动画模式

```typescript
// hooks/useReducedMotion.ts
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  return reduced;
}
```

当 `reducedMotion = true` 时：
- 所有过渡动画时间设为 0ms
- Rive 熊猫动画暂停在静态帧
- 雷达图填充动画跳过，直接显示完成状态
- 铸造揭晓动画跳过，直接显示结果
- K 线图更新不使用过渡
- 粒子特效关闭

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 附录：类型定义总览

### types/panda.ts

```typescript
export type EmotionType = 'focused' | 'excited' | 'greedy' | 'cautious' | 'panicking' | 'numb';

export interface PersonalityData {
  boldness: number;     // 胆识 0-100
  patience: number;     // 耐性 0-100
  intuition: number;    // 直觉 0-100
  focus: number;        // 专注 0-100
  contrarian: number;   // 逆向性 0-100
}

export interface PandaFullData {
  id: string;
  name: string;
  personality: PersonalityData;
  talent: number;
  talentName: string;
  experienceLevel: number;
  generation: number;
  emotion: EmotionType;
  isTrading: boolean;
  owner: string;
}

export interface PandaSummary {
  id: string;
  name: string;
  experienceLevel: number;
  emotion: EmotionType;
  winRate: number;
  isTrading: boolean;
}

export interface MintResult {
  pandaId: string;
  name: string;
  personality: PersonalityData;
  talent: number;
  talentName: string;
  txDigest: string;
}
```

### types/trading.ts

```typescript
export interface TradeRecord {
  id: string;
  timestamp: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  coin: string;
  amount: number;
  entryPrice: number;
  exitPrice?: number;
  pnl?: number;
  pnlPercent?: number;
  decisionLog: DecisionLog;
}

export interface SignalRule {
  indicator: 'RSI' | 'MA20' | 'MACD' | 'PRICE';
  condition: string;
  threshold?: number;
  action: 'BUY' | 'SELL';
  weight?: number;                     // 预留，MVP 前端不展示
}

export interface ParsedStrategy {
  philosophy: string;
  position_sizing: {
    type?: 'fixed' | 'kelly' | 'grid';
    value?: number;
    max_position_pct?: number;
    scale_in?: boolean;
  };
  signal_rules: SignalRule[];          // 1–8 条，对齐 API / RuleEngine
  risk_management: {
    stop_loss_pct: number;
    take_profit_pct?: number;
    max_drawdown_pct: number;
  };
}
```

### types/decision.ts

```typescript
export interface DecisionLog {
  id: string;
  timestamp: number;
  steps: DecisionStep[];
  finalScore: number;
  threshold: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  executedPosition?: number;
}

export interface DecisionStep {
  stepNumber: number;
  name: string;
  inputLabel: string;
  inputValue: number;
  modifier: number;
  outputScore: number;
  highlight: boolean;
  /** Step 1 专用：规则命中明细 */
  ruleHits?: {
    buyHits: number;
    sellHits: number;
    totalCompiled: number;
    matchedRuleIndexes: number[];
    signedVote: number;
  };
}
```

### types/market.ts

```typescript
export interface MarketListing {
  nftId: string;
  kioskId: string;
  name: string;
  personality: PersonalityData;
  talent: number;
  talentName: string;
  experienceLevel: number;
  totalTrades: number;
  winRate: number;
  generation: number;
  price: number;            // SUI
  seller: string;
  royalty: number;          // 2-5
  listedAt: number;
  isTrading: boolean;
  strategyText?: string;
  trainerMessage?: string;
}

export interface MarketFilters {
  talent: number[];
  boldnessRange: [number, number];
  patienceRange: [number, number];
  intuitionRange: [number, number];
  focusRange: [number, number];
  contrarianRange: [number, number];
  levelRange: [number, number];
  priceRange: [number, number];
  searchQuery: string;
}

export type MarketSortBy = 'newest' | 'price_asc' | 'price_desc' | 'win_rate' | 'level';
```

### types/achievement.ts

```typescript
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  unlocked: boolean;
  unlockedAt?: number;
  progress?: {
    current: number;
    target: number;
  };
  category: 'trading' | 'growth' | 'social' | 'collection';
}
```

### E.12 K 线数据（方案甲 · 经 Hub + REST）

> **MVP**：实时 K 线来自 Hub 转发的 **`market.tick`**（Redis `market:tick`）；历史来自 REST。  
> **方案乙**（独立 `:9009` WSS）见 `docs/kline-websocket-service.md`。

#### 历史 K 线（REST）

```
GET {MONITOR_OR_BFF}/candles/{pool}?interval=1m&limit=100
```

响应：`{ candles: [{ t, o, h, l, c, v }, ...] }`（字段名以实现为准）。

#### 实时 K 线（WebSocket · 同一 Hub）

连接 `NEXT_PUBLIC_WS_URL`，发送 `subscribe.market` 后接收：

```typescript
interface MarketTickEvent {
  event: 'market.tick';  // 以 api-spec 为准
  payload: MarketEvent;  // 含 candle: { open, high, low, close, volume, interval }
}
```

用 `payload.candle` 更新 `lightweight-charts` 最后一根 bar。

#### Hub 命令（与 `websocket/README.md` 一致）

```typescript
// 连接成功后
send({ command: 'subscribe.market', payload: { assets: ['SUI'], interval: '1m' } });
```

#### React 模式（示意）

```typescript
// 1. useQuery 拉 REST 历史 → setChartData
// 2. useWebSocket(Hub) on 'market.tick' → updateLastCandle(payload.candle)
// 3. 同一 socket on 'decision_made' | 'emotion_changed' → 熊猫 UI
```

重连：Hub 统一退避；重连后重发 `subscribe.market` + `subscribe.simulation`，并 **重新 REST** 拉一段历史以防 Pub/Sub 空洞。

方案乙独立 WSS 示例见 **`docs/kline-websocket-service.md`** §四。

```typescript
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}
```
