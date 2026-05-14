# TradingPanda 前端设计文档

> 版本: 1.0 | 日期: 2026-05-08
> Sui Overflow 2026 黑客松 — AI 交易宠物养成系统
> 基于: design-plan.md v2.0 / mint-page.md / dashboard.md / market.md / user-journey.md

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
│   │   ├── DecisionStep.tsx          # 决策链单步
│   │   ├── StrategyInput.tsx         # 策略输入框
│   │   ├── StrategyPreview.tsx       # 策略解析结果展示
│   │   ├── TradeHistory.tsx          # 交易历史列表
│   │   ├── TradeHistoryItem.tsx      # 交易历史单条
│   │   ├── SimulationControls.tsx    # 模拟速度控制
│   │   └── TradeMarker.tsx           # K 线图交易标记
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
│   ├── strategy.service.ts           # parseStrategy, getStrategy, getStrategyHistory
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

### 2.1 Design Tokens

所有 Design Token 以 CSS Custom Properties 定义，写入 `src/styles/tokens.css` 并在 `globals.css` 中引入。

```css
/* src/styles/tokens.css */

:root {
  /* ========== 颜色 — 水墨中国风 ========== */
  /* 设计理念：宣纸为底、浓墨为骨、竹青为魂、朱砂为印 */

  /* 背景 — 宣纸层次 */
  --color-bg-primary: #f5f0e6;          /* 主背景 - 生宣纸 */
  --color-bg-card: #ede8dc;             /* 卡片/面板 - 熟宣纸 */
  --color-bg-input: #e8e2d4;            /* 输入框 - 毛边纸 */
  --color-bg-hover: #e2dccf;            /* 悬停 - 按压宣纸 */
  --color-bg-overlay: rgba(245, 240, 230, 0.85); /* 遮罩层 - 薄宣 */
  --color-bg-ink-wash: rgba(30, 30, 28, 0.04);   /* 淡墨晕染层 */

  /* 强调色 — 竹青绿 */
  --color-accent: #2d5a3d;              /* 主强调 - 竹青 */
  --color-accent-hover: #1e4a2e;        /* 强调色 hover - 深竹 */
  --color-accent-glow: rgba(45, 90, 61, 0.3);    /* 天赋发光 - 竹光 */
  --color-accent-muted: rgba(45, 90, 61, 0.08);  /* 强调色淡背景 */
  --color-accent-light: #3a7a52;        /* 翠竹 - 次级强调 */

  /* 文字 — 墨色五彩 */
  --color-text-primary: #1a1a18;        /* 主文字 - 浓墨 */
  --color-text-secondary: #5a5a52;      /* 次要文字 - 淡墨 */
  --color-text-muted: #9a9a8e;          /* 占位符 - 枯墨 */

  /* 语义色 — 国画色谱 */
  --color-success: #2d5a3d;             /* 盈利 - 竹青（与强调色统一）*/
  --color-success-bg: rgba(45, 90, 61, 0.08);
  --color-danger: #c23a3a;              /* 亏损 - 朱砂红 */
  --color-danger-bg: rgba(194, 58, 58, 0.06);
  --color-warning: #b8860b;             /* 警告 - 赭石 */
  --color-warning-bg: rgba(184, 134, 11, 0.06);
  --color-info: #4a6d8c;               /* 信息 - 花青 */

  /* 熊猫色 */
  --color-panda-fur: #1a1a1a;           /* 熊猫黑 - 浓墨 */
  --color-panda-white: #f5f5f0;         /* 熊猫白 - 宣纸白 */
  --color-panda-eye: #2d5a3d;           /* 熊猫眼 = 竹青 */

  /* 边框 — 墨线 */
  --color-border: #d4cbb8;              /* 默认边框 - 淡墨线 */
  --color-border-hover: #bfb5a0;        /* 悬停边框 - 中墨线 */
  --color-border-accent: #2d5a3d;       /* 强调边框 - 竹青 */

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
  --font-heading: "ZCOOL XiaoWei", "Noto Serif SC", serif;       /* 标题 - 小薇体/思源宋 */
  --font-display: "ZCOOL QingKe HuangYou", "Noto Sans SC", sans-serif; /* 数字 - 庆科黄油体 */
  --font-body: "Noto Sans SC", "Inter", -apple-system, sans-serif; /* 正文 - 思源黑 */

  /* 字号 */
  --text-xs: 0.75rem;      /* 12px */
  --text-sm: 0.875rem;     /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg: 1.125rem;     /* 18px */
  --text-xl: 1.25rem;      /* 20px */
  --text-2xl: 1.5rem;      /* 24px */
  --text-3xl: 1.875rem;    /* 30px */
  --text-4xl: 2.25rem;     /* 36px */
  --text-display: 3rem;    /* 48px - 用于 Landing 大标题 */

  /* ========== 间距 ========== */
  --spacing-xs: 4px;       /* 紧密元素间距 */
  --spacing-sm: 8px;       /* 标签与值间距 */
  --spacing-md: 16px;      /* 组件内间距、卡片 padding */
  --spacing-lg: 24px;      /* 组件间间距 */
  --spacing-xl: 32px;      /* 页面区块间距 */
  --spacing-2xl: 48px;     /* 导航栏高度 */
  --spacing-3xl: 64px;     /* 大段间距 */
  --spacing-4xl: 96px;     /* Landing 区块间距 */

  /* ========== 圆角 ========== */
  --radius-sm: 6px;        /* 按钮、输入框、标签 */
  --radius-md: 12px;       /* 卡片、面板 */
  --radius-lg: 16px;       /* 模态框 */
  --radius-full: 9999px;   /* 熊猫头像圆形裁切 */

  /* ========== 阴影 ========== */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);       /* 水墨浅影 */
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.12);      /* 宣纸层叠 */
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.15);      /* 深层叠 */
  --shadow-glow: 0 0 20px rgba(45, 90, 61, 0.2);    /* 竹青光晕 */
  --shadow-glow-strong: 0 0 40px rgba(45, 90, 61, 0.35); /* 天赋竹光 */
  --shadow-ink: 0 2px 8px rgba(26, 26, 24, 0.06);   /* 墨渍阴影 */

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

  /* ========== 布局 ========== */
  --navbar-height: 48px;
  --page-max-width: 1440px;
  --sidebar-width: 260px;
}
```

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

#### 页面职责

用户铸造 AI 交易熊猫 NFT 的核心页面。从连接钱包 → 铸造 → 性格揭晓 → 天赋揭晓 → 进入模拟盘。

#### SEO

```typescript
export const metadata: Metadata = {
  title: '铸造熊猫 — TradingPanda',
  description: '铸造你的 AI 交易熊猫 NFT，每只熊猫拥有独一无二的五维性格和稀有天赋。',
};
```

#### 6 页面状态

| 状态 | 代码枚举 | 触发条件 | 视觉 |
|------|---------|---------|------|
| idle | `IDLE` | 钱包已连接，未开始铸造 | 熊猫剪影 + 引导文案 + Mint 按钮 |
| connecting | `CONNECTING` | 点击连接钱包 | 钱包弹窗等待中 |
| minting | `MINTING` | 点击 Mint + 钱包确认 | 按钮 loading + 熊猫剪影微动 |
| revealing | `REVEALING` | 链上 Mint 完成 | 破壳动画 → 雷达图填充 → 天赋揭晓 |
| success | `SUCCESS` | 揭晓完成 | 完整熊猫 + 雷达图 + 天赋 + 「进入模拟盘」按钮 |
| error | `ERROR` | Gas 不足 / 合约报错 | 错误提示 + 重试按钮 |

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

#### 页面职责

TradingPanda 的核心页面。用户在此观察熊猫自动交易、查看盈亏、理解决策过程、修改策略。

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

#### 页面布局（ASCII）

```
┌────────────────────────────────────────────────────────────────────┐
│  Navbar                                                            │
│  [Logo TradingPanda]  [熊猫名 ▾]  [情绪emoji]        [钱包 0xab..] │ h=48px
├──────────────────┬──────────────────────────┬──────────────────────┤
│                  │                          │                      │
│  PandaStatusZone │   ChartZone              │  AccountZone         │
│  w=260px         │   flex: 1                │  w=260px             │
│                  │                          │                      │
│  ┌────────────┐  │  ┌──────────────────────┐│  ┌────────────────┐  │
│  │PandaAvatar │  │  │                      ││  │ 余额           │  │
│  │ 226×301    │  │  │  CandlestickChart    ││  │ $10,032.50     │  │
│  │            │  │  │  (Lightweight Charts) ││  │                │  │
│  └────────────┘  │  │  实时 K 线 + 交易标记 ││  │ 持仓           │  │
│  ┌────────────┐  │  │  时间切换：15m/1h/4h/1d│  │ 0.045 BTC     │  │
│  │EmotionInd  │  │  │                      ││  │ @ $59,500      │  │
│  │😐 "观察中" │  │  └──────────────────────┘│  │                │  │
│  └────────────┘  │                          │  │ 盈亏           │  │
│  ┌────────────┐  │                          │  │ +$32.50        │  │
│  │Personality │  │                          │  │ (+0.33%)       │  │
│  │   Radar    │  │                          │  │                │  │
│  │  (compact) │  │                          │  │ ──────────     │  │
│  └────────────┘  │                          │  │ 策略熟练度     │  │
│  ┌────────────┐  │                          │  │ ████░░ 45%     │  │
│  │ExperienceBar│ │                          │  │                │  │
│  │ Lv.12 ███░ │  │                          │  │ Nautilus ✅    │  │
│  └────────────┘  │                          │  └────────────────┘  │
│                  │                          │                      │
├──────────────────┴──────────────────────────┴──────────────────────┤
│                                                                    │
│  DecisionPanel                                                     │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ [折叠] RSI=28 → 买入 @ $59,500  (score: 0.71)      [展开 ▼] ││
│  │                                                                ││
│  │ [展开时]                                                       ││
│  │ Step 1: 策略信号    RSI=28 < 30         → 1.00               ││
│  │ Step 2: 熟练度噪声  proficiency=45%     → +8% → 1.08        ││
│  │ Step 3: 性格过滤    boldness=72         → 阈值 0.58, ×0.89   ││
│  │ Step 4: 环境感知    Lv.1 高波动         → ×0.85              ││
│  │ Step 5: 情绪修正    focused             → ×1.0               ││
│  │ Step 6: 天赋加成    竹笋嗅觉            → ×1.0 (未触发)      ││
│  │ Step 7: 经验修正    exp=12              → ×0.95              ││
│  │ Step 8: 最终执行分  0.71 > 0.58         → ✅ 执行买入         ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│  BottomZone                                                        │
│  ┌──────────────────────────────┬─────────────────────────────────┐│
│  │ StrategyInput                │  SimulationControls             ││
│  │ ┌──────────────────────────┐ │  速度: [1x] [10x] [100x] [⚡]  ││
│  │ │ 当 RSI < 30 时买入...    │ │  状态: ▶ 运行中               ││
│  │ └──────────────────────────┘ │  [暂停] [停止]                 ││
│  │ 📊 匹配度: 67/100           │                                 ││
│  │ ⚠️ 未设置止损               │  🎋 冷静竹 (今日剩余 1 次)      ││
│  └──────────────────────────────┴─────────────────────────────────┘│
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│  TradeHistory (虚拟列表)                                           │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ #127  BUY  0.045 BTC @ $59,500  → SELL @ $60,200  +$31.50 ✅ ││
│  │ #126  BUY  0.050 BTC @ $58,800  → SELL @ $58,300  -$25.00 ❌ ││
│  │ #125  HOLD  RSI=42 → 不满足入场条件  score: 0.38             ││
│  │ ...（点击展开查看完整决策链）                                  ││
│  └────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

#### 组件树

```
DashboardPage
├── Navbar
│   ├── Logo
│   ├── PandaSelector（多熊猫下拉切换）
│   ├── EmotionIndicator（当前情绪 emoji + 文字）
│   └── WalletButton
│
├── DashboardContent (grid: 3 columns)
│   │
│   ├── PandaStatusZone (col-1, w=260px)
│   │   ├── PandaAvatar（Rive 动画）
│   │   ├── EmotionIndicator（熊猫自语气泡）
│   │   ├── PersonalityRadar (compact, size=180)
│   │   └── ExperienceBar
│   │
│   ├── ChartZone (col-2, flex=1)
│   │   ├── ChartHeader
│   │   │   ├── 交易对标签 "BTC/USD"
│   │   │   ├── 当前价格
│   │   │   └── TimeframeTabs [15m | 1h | 4h | 1d]
│   │   └── CandlestickChart
│   │       ├── K 线主图
│   │       ├── TradeMarkers（BUY/SELL 标记）
│   │       └── IndicatorOverlay（RSI / MA20）
│   │
│   └── AccountZone (col-3, w=260px)
│       └── AccountPanel
│           ├── 余额
│           ├── 持仓
│           ├── 浮动盈亏
│           ├── 策略熟练度进度条
│           └── Nautilus TEE 验证标记
│
├── DecisionPanel
│   ├── DecisionSummary（折叠态：最近一条摘要）
│   └── DecisionSteps（展开态：8 步完整链路）
│       ├── DecisionStep × 8
│       └── FinalScore（最终执行分 + 结果）
│
├── BottomZone (grid: 2 columns)
│   ├── StrategySection
│   │   ├── StrategyInput（文本域）
│   │   ├── StrategyPreview（解析结果 4 层 JSON 可视化）
│   │   │   ├── 哲学层
│   │   │   ├── 入场/出场规则层
│   │   │   ├── 仓位管理层
│   │   │   └── 风险控制层
│   │   └── StrategyWarning（危险策略警告）
│   │
│   └── ControlsSection
│       ├── SimulationControls
│       │   ├── SpeedSelector [1x | 10x | 100x | instant]
│       │   └── PlayPauseStop buttons
│       └── ItemsPanel
│           └── CalmBambooButton（冷静竹道具）
│
└── TradeHistory（虚拟列表，@tanstack/react-virtual）
    └── TradeHistoryItem × N
        ├── 交易概要（方向/数量/价格/盈亏）
        └── 可展开的决策链
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

// 策略解析（mutation）
const parseStrategyMutation = useMutation({
  mutationFn: (text: string) => parseStrategy(text),
  onSuccess: (result) => {
    simulationStore.setStrategy(result);
  },
});
```

#### WebSocket 订阅

Dashboard 页面通过 WebSocket 接收以下实时事件：

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

动画：展开时从上到下 stagger 进入，每步间隔 50ms。

#### 策略输入组件（StrategyInput）

```typescript
interface StrategyInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;          // 解析中
  matchScore: number | null; // 匹配度
  warnings: string[];        // 策略警告
}
```

特性：
- 文本域 + placeholder 闪烁引导
- 提交后调用 LLM 解析，显示 4 层 JSON 可视化
- 策略含危险行为时显示黄色警告条
- 下方展示 3 个示例策略卡片（可一键填入）

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

### 3.4 Market（NFT 市场）

#### 页面职责

浏览、搜索、购买/上架熊猫 NFT 的交易市场。

#### SEO

```typescript
export const metadata: Metadata = {
  title: '熊猫市场 — TradingPanda',
  description: '浏览和购买训练好的 AI 交易熊猫 NFT，每只都有独特性格、天赋和交易记录。',
};
```

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
│   ├── MarketFilters
│   │   ├── TalentFilter（天赋多选下拉）
│   │   ├── PersonalitySliders（性格五轴区间）
│   │   ├── LevelRange（等级区间）
│   │   ├── PriceRange（价格区间）
│   │   └── Button "重置筛选"
│   └── MarketSort
│       └── Select [最新上架 | 价格低→高 | 价格高→低 | 胜率 | 等级]
│
├── MarketGrid (CSS Grid, 4 cols desktop)
│   └── PandaCard × N
│       ├── PandaAvatar（缩略 120×160）
│       ├── 熊猫名（--font-heading）
│       ├── 性格摘要（胆识90 耐性15 直觉70）
│       ├── TalentBadge（talent≠0 时竹青发光）
│       ├── 统计（Lv / 交易笔数 / 胜率）
│       ├── 价格（SUI）
│       ├── Button "购买" / Badge "交易中" / Badge "我的"
│       └── onClick → 打开 MarketDetailModal
│
├── LoadMoreButton / InfiniteScroll
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

#### PandaCard 组件

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
  price: number;            // SUI
  isTrading: boolean;
  isOwner: boolean;
  onClick: () => void;
}
```

卡片布局：

```
┌────────────────────┐
│  ┌──────────────┐  │
│  │ PandaAvatar  │  │  120×160, center
│  │  (缩略图)    │  │
│  └──────────────┘  │
│  阿暴               │  --font-heading, --text-sm
│  胆识90 耐性15      │  --font-body, --text-xs, --color-text-secondary
│  直觉70 专注40      │
│  逆向25             │
│  🎋 竹笋嗅觉 (4%)   │  talent≠0: --color-accent + glow
│  ─────────────────  │
│  Lv.35 · 127 笔     │  --color-text-secondary
│  胜率 62.4%          │  --color-success
│  ─────────────────  │
│  5 SUI    [购买]     │  price: --font-display; button: primary
└────────────────────┘
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

### 3.5 Leaderboard（排行榜）

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

### 3.6 Achievement（成就系统）

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

### 3.7 Profile（个人中心）

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
| >=768px | 居中单列，PandaAvatar 226×301，Radar 280×280 |
| <768px | 居中单列，PandaAvatar 160×213，Radar 200×200，按钮全宽 |

#### Dashboard

| 断点 | 布局变化 |
|------|---------|
| >=1024px | 三列布局：PandaZone(260) + Chart(flex) + Account(260) |
| 768-1023px | 两行：上行 Chart 全宽 + Account 侧边；下行 PandaZone 折叠为顶栏 |
| <768px | 全单列：PandaZone 水平条 → Chart 全宽 → Account 折叠 → DecisionPanel |

#### Market

| 断点 | 布局变化 |
|------|---------|
| >=1440px | 四列卡片网格 |
| 1024-1439px | 三列卡片网格 |
| 768-1023px | 两列卡片网格 |
| <768px | 单列卡片，筛选面板改为底部抽屉 |

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

export interface ParsedStrategy {
  philosophy: string;
  entry: { indicator: string; condition: string; threshold: number };
  exit: { indicator: string; condition: string; threshold: number } | null;
  position: { type: 'fixed' | 'kelly' | 'volatility'; size: number };
  risk: { stopLoss: number | null; takeProfit: number | null };
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

### types/api.ts

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
