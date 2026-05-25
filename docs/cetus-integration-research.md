# 🐼 熊猫的第二战场：Cetus DLMM 跨池套利调研报告

> 给 TradingPanda 接上 Cetus DLMM，就像给一只只会钓 DeepBook 小鱼的熊猫，
> 再发一根 Cetus 的鱼竿——从此它能同时蹲两个鱼塘，哪个鱼多就去哪个。

---

## 一、CDPM 能力盘点：熊猫的"经纪人执照"

### 1.1 CDPM 是什么？

想象你是一个基金经理（熊猫），但你自己不能直接去交易所下单。你需要一个**经纪人**（CDPM 合约）帮你持有仓位、管理资金、记账分润。这个经纪人住在 Sui 链上，是一份不可篡改的 Move 合约。

**Package 地址**: `0x3e926116ec95d753b83b80d768e310ef492d84892dee5cc86b51c1d3a876d5b7`

### 1.2 PositionManager：熊猫的"钱包+仓位"

每个 PositionManager（简称 PM）就像一个保险箱：

```
PositionManager 结构
┌─────────────────────────────────────┐
│  owner      → 熊猫的主人（用户钱包）    │
│  agents[]   → 被授权的"小弟"列表        │ ← 熊猫在这里！
│  position   → Cetus DLMM 仓位 ID      │
│  balance    → 可用资金（多币种 Map）     │
│  fee        → 累积手续费收益            │
│  lending    → 闲置资金理财（Scallop/Kai）│
└─────────────────────────────────────┘
```

### 1.3 Agent 委托模式：熊猫能做什么？

主人把熊猫注册为 PM 的 Agent 后，熊猫获得三项超能力：

| 操作 | 含义 | 比喻 |
|------|------|------|
| `add_liquidity` | 向 DLMM 池注入流动性 | 往鱼塘里撒鱼食，吸引鱼群 |
| `remove_liquidity` | 从 DLMM 池撤出流动性 | 把鱼食捞回来 |
| `swap` | 在 DLMM 池内兑换代币 | 用虾换蚯蚓 |

**但熊猫做不到的事**（安全边界）：
- ❌ 关闭 PM（不能把保险箱炸了）
- ❌ 提取余额（不能偷主人的钱）
- ❌ 转移仓位（不能把保险箱搬走）

这就像给熊猫发了一张**限额信用卡**——能消费，但不能销户、不能提现、不能转给别的熊猫。

### 1.4 PTB 模式：一键套餐

CDPM 的所有操作都通过 **PTB（Programmable Transaction Block）** 执行。PTB 就像一个"交易套餐"——把多个操作打包成一笔交易，要么全成功，要么全回滚。

```typescript
// 类比：熊猫的"一键操作"
const tx = new Transaction();

// 步骤 1：从余额取钱
tx.moveCall({ target: `${CDPM}::cdpm::deposit_to_balance`, ... });
// 步骤 2：注入流动性
tx.moveCall({ target: `${CDPM}::cdpm::agent_add_liquidity`, ... });
// 步骤 3：收集手续费
tx.moveCall({ target: `${CDPM}::cdpm::collect_fee`, ... });

// 三步合一，原子执行
await client.signAndExecuteTransaction({ transaction: tx });
```

---

## 二、跨池数据架构：一只熊猫，两个鱼塘

### 2.1 当前现状

TradingPanda 目前只有一个数据源——DeepBook。市场监听器（market-monitor）从 DeepBook 拉取 order book 数据，聚合成 K 线，推送到 `market:tick:*` 频道。

### 2.2 目标架构

接上 Cetus DLMM 后，市场数据流变成这样：

```
┌──────────────────────────────────────────────────────────────┐
│                     数据源层 (On-Chain)                        │
│                                                              │
│  ┌──────────────────┐          ┌──────────────────────────┐  │
│  │   DeepBook v3    │          │     Cetus DLMM Pool      │  │
│  │  (订单簿模式)      │          │    (流动性池模式)         │  │
│  │  - 买一/卖一价格   │          │    - 当前 bin 价格       │  │
│  │  - 深度数据        │          │    - binStep / 活跃 bin  │  │
│  │  - 成交记录        │          │    - 流动性分布          │  │
│  └────────┬─────────┘          └────────────┬─────────────┘  │
│           │                                  │                │
└───────────┼──────────────────────────────────┼────────────────┘
            ▼                                  ▼
┌──────────────────────────────────────────────────────────────┐
│              market-monitor (改造版)                           │
│                                                              │
│  ┌─────────────────┐    ┌──────────────────────────────────┐ │
│  │ DeepBook Adapter │    │     Cetus DLMM Adapter (新)      │ │
│  │ (已有，不动)      │    │  - BinUtils.getQPriceFromId()    │ │
│  │                  │    │  - 订阅 pool 状态变化             │ │
│  │                  │    │  - 计算当前价格 + 滑点估算        │ │
│  └────────┬────────┘    └───────────────┬──────────────────┘ │
│           │                             │                    │
│           └──────────┬──────────────────┘                    │
│                      ▼                                       │
│           ┌─────────────────────┐                            │
│           │  UnifiedPriceFeed   │                            │
│           │  统一价格格式标准化    │                            │
│           │  { bid, ask, mid,   │                            │
│           │    source, ts }     │                            │
│           └──────────┬──────────┘                            │
│                      │                                       │
└──────────────────────┼───────────────────────────────────────┘
                       ▼
              ┌─────────────────┐
              │  Redis Pub/Sub  │
              │ market:tick:db  │  ← DeepBook 行情
              │ market:tick:cetus│ ← Cetus 行情（新）
              │ market:arb:*    │  ← 套利信号（新）
              └─────────────────┘
```

### 2.3 market-monitor 需要什么改造？

| 改造项 | 说明 | 优先级 |
|--------|------|--------|
| 新增 Cetus DLMM Adapter | 通过 GraphQL 查询 Cetus pool 状态，用 `BinUtils` 计算价格 | P0 |
| 统一价格格式 | DeepBook 是 order book（bid/ask），DLMM 是 AMM（mid price + slippage）。需要标准化为统一结构 | P0 |
| 跨池价差计算 | 实时计算同一交易对在两个池子的价差，超过阈值时推送套利信号 | P1 |
| 新增 Redis 频道 | `market:tick:cetus` 推送 Cetus 行情，`market:arb:*` 推送套利机会 | P1 |

**关键设计决策**：Cetus DLMM 价格查询用 `@cetusprotocol/dlmm-sdk` 的 `BinUtils`：

```typescript
import { BinUtils } from '@cetusprotocol/dlmm-sdk/utils'

// 从 bin ID 反推价格
const qPrice = BinUtils.getQPriceFromId(binId, binStep);
// 从价格正推 bin ID
const binId = BinUtils.getBinIdFromPrice(price, binStep, true, decimalA, decimalB);
// 计算流动性
const liquidity = BinUtils.getLiquidity(amountA, amountB, qPrice);
```

---

## 三、PTB 套利策略：一个套餐，两笔交易

### 3.1 核心思路

套利的本质：**同一个东西在两个地方价格不一样，从便宜的地方买，到贵的地方卖。**

场景：SUI/USDC 交易对
- DeepBook 价格：1 SUI = 2.05 USDC（便宜）
- Cetus DLMM 价格：1 SUI = 2.10 USDC（贵）
- 价差：0.05 USDC（2.4%）

熊猫的操作：
1. 在 DeepBook 用 2.05 USDC 买入 1 SUI
2. 在 Cetus DLMM 用 1 SUI 卖出得到 2.10 USDC
3. 净赚 0.05 USDC（扣除 gas 和手续费后）

### 3.2 PTB 构造：跨池原子套利

关键难点：DeepBook 和 CDPM 是两套不同的合约。PTB 需要在同一笔交易里调用两者。

```typescript
import { Transaction } from '@mysten/sui/transactions';

async function buildCrossPoolArbPTB(
  params: {
    // DeepBook 参数
    deepbookPoolId: string;
    deepbookCapId: string;
    // CDPM 参数
    cdpmPmId: string;
    cdpmAgentCapId: string;
    cetusPoolId: string;
    // 套利参数
    direction: 'buy_db_sell_cetus' | 'buy_cetus_sell_db';
    amountIn: bigint;
    minProfit: bigint;
  }
): Promise<Transaction> {
  const tx = new Transaction();

  if (params.direction === 'buy_db_sell_cetus') {
    // ========== 第一步：在 DeepBook 买入 ==========
    // 用 USDC 从 DeepBook 买 SUI
    const suiCoin = tx.moveCall({
      target: `${DEEPBOOK_PACKAGE}::pool::swap_exact_quote_for_base`,
      arguments: [
        tx.object(params.deepbookPoolId),
        tx.object(params.deepbookCapId),
        tx.pure.u64(params.amountIn),   // 输入 USDC 数量
        tx.pure.u64(0n),                // min SUI out（PTB 全成功或全回滚，所以可以设 0）
      ],
      typeArguments: ['0x2::sui::SUI', USDC_TYPE],
    });

    // ========== 第二步：在 Cetus DLMM 卖出 ==========
    // 把刚买到的 SUI 通过 CDPM Agent 在 Cetus 卖成 USDC
    const usdcCoin = tx.moveCall({
      target: `${CDPM_PACKAGE}::cdpm::agent_swap`,
      arguments: [
        tx.object(params.cdpmPmId),
        tx.object(params.cdpmAgentCapId),
        tx.object(params.cetusPoolId),
        suiCoin,  // 上一步的输出 = 这一步的输入
        tx.pure.bool(true),  // a_to_b: SUI → USDC
        tx.pure.u64(0n),     // min out
      ],
      typeArguments: [SUI_TYPE, USDC_TYPE],
    });

    // ========== 第三步：验证利润 ==========
    // 利润 = 卖出所得 - 买入成本
    // （实际实现中需要用 split/merge Coin 对比余额）
    // PTB 天然原子性：如果最终利润不足，整笔交易回滚

    // 归集利润到 PM balance
    tx.moveCall({
      target: `${CDPM_PACKAGE}::cdpm::deposit_to_balance`,
      arguments: [tx.object(params.cdpmPmId), usdcCoin],
      typeArguments: [USDC_TYPE],
    });
  }

  return tx;
}
```

**为什么 PTB 天然适合套利？**

PTB 的原子性意味着：
- 如果 DeepBook 买入成功但 Cetus 卖出失败 → 整笔回滚，不亏钱
- 如果最终利润不足 `minProfit` → 可以在最后一步验证，不足则 abort
- 没有"买了一半"的风险

这就像一个"套餐"——要么菜全上齐，要么一分钱不收。

### 3.3 CDPM + DeepBook 操作组合

```
PTB 跨池套利的命令序列：

命令 0: DeepBook swap_exact_quote_for_base (买入)
         ↓ 输出: Coin<SUI>
命令 1: CDPM agent_swap (卖出)
         ↑ 输入: 上一步的 Coin<SUI>
         ↓ 输出: Coin<USDC>
命令 2: CDPM deposit_to_balance (归集利润)
         ↑ 输入: 上一步的 Coin<USDC>

三步串联，数据在 PTB 内部流转，不经过外部钱包。
```

---

## 四、熊猫决策引擎升级：从"单池独钓"到"双塘巡游"

### 4.1 当前 8 步决策引擎

```
性格 → 策略 → 经验 → 情绪 → 环境 → 社交 → 综合评分 → 执行
```

目前只有 DeepBook 一个数据源，"环境"维度只看一个池子的价格。

### 4.2 需要新增的信号/维度

| 决策步骤 | 新增信号 | 说明 |
|----------|---------|------|
| **环境** | Cetus DLMM 实时价格 | 与 DeepBook 价格并列，作为第二个价格源 |
| **环境** | 跨池价差 | `spread = |db_price - cetus_price| / min(db, cetus)` |
| **环境** | 价差趋势 | 价差在扩大还是缩小？（动量信号） |
| **策略** | 套利策略类型 | 新增策略卡：跨池套利（与趋势跟踪、均值回归并列） |
| **策略** | 套利方向偏好 | 熊猫性格影响：激进熊猫更愿意追大价差，保守熊猫只吃稳定小价差 |
| **经验** | 套利历史胜率 | 熊猫记住了哪些价差模式容易赚钱 |
| **情绪** | 价差消失时的焦虑 | 价差从 2% 突然缩到 0.1% 时，熊猫该紧张了 |

### 4.3 决策链升级方案

```
原版：
  环境(DeepBook价格) → 综合评分 → 执行(DepthBook下单)

升级版：
  环境
  ├── DeepBook 价格 ──┐
  ├── Cetus 价格 ─────┤
  ├── 跨池价差 ───────┤──→ 综合评分 → 执行
  └── 价差趋势 ───────┘         ├── DeepBook 下单
                                ├── Cetus DLMM 下单（CDPM Agent）
                                └── 跨池 PTB 套利（新）
```

**关键设计原则**：套利信号是**独立于熊猫性格的客观机会**。但熊猫的性格决定了它**如何响应**这个机会——

- 🐻 **暴躁熊猫**：价差 > 3% 才出手，追求高收益高风险
- 🐰 **胆小熊猫**：价差 > 0.5% 就干，积少成多
- 🧘 **佛系熊猫**：只在"环境"维度评分极高时才动，宁可错过不犯错

---

## 五、风险与边界：熊猫的安全气囊

### 5.1 滑点控制

| 风险 | 场景 | 防护措施 |
|------|------|---------|
| DLMM 滑点 | 大额 swap 穿过多个 bin，实际成交价偏离预期 | PTB 中设置 `min_amount_out`；根据 bin 流动性计算可执行上限 |
| DeepBook 滑点 | 大单吃掉多层挂单 | 分批执行，单笔不超过 order book 深度的 10% |
| 跨池执行延迟 | PTB 签名到上链之间价格已变 | Sui 出块 ~0.5s，窗口极短；极端行情下价差可能消失 |

### 5.2 MEV 保护

Sui 的 PTB 模型天然比 EVM 更抗 MEV：
- 没有公共内存池（mempool）供三明治攻击
- 交易排序由共识决定，不是 gas 价竞拍
- 但仍有验证者内部 MEV 风险（概率极低）

**建议**：MVP 阶段不需专门的 MEV 保护。监控到异常时再考虑。

### 5.3 资金效率

```
问题：熊猫同时在两个池子操作，资金怎么分配？

方案 A（简单）：PM balance 里放两种币各 50%
  优点：简单
  缺点：资金利用率低，可能一边用完另一边闲置

方案 B（动态）：根据价差方向动态调拨
  优点：资金效率高
  缺点：需要额外的 rebalance PTB

MVP 建议：先用方案 A，跑通后再优化。
```

### 5.4 Gas 成本

| 操作 | 估算 Gas (MIST) | 说明 |
|------|-----------------|------|
| 单次 CDPM agent_swap | ~5,000,000 | ~0.005 SUI |
| 单次 DeepBook swap | ~3,000,000 | ~0.003 SUI |
| 跨池 PTB 套利（2 swap） | ~8,000,000 | ~0.008 SUI |
| 加上 collect_fee | ~10,000,000 | ~0.01 SUI |

SUI 价格 $2 时，单次套利 gas 成本约 $0.02。价差需要 > 0.1% 才有正收益。

### 5.5 失败回滚

PTB 的原子性是最大的安全网。但要注意：

- **部分失败不等于亏损**：PTB 要么全成功要么全回滚
- **回滚不退 gas**：交易即使回滚，gas 费照收
- **建议**：先用 dryRun 模拟，确认可行再上链

---

## 六、MVP 范围建议：先让熊猫学会看第二个鱼塘

### 6.1 分期规划

```
Phase 1（2 周）：数据层 —— 让熊猫"看见"Cetus
┌─────────────────────────────────────────────┐
│ ✅ 新增 Cetus DLMM Adapter（价格查询）        │
│ ✅ 统一价格格式 UnifiedPriceFeed              │
│ ✅ 新增 Redis 频道 market:tick:cetus          │
│ ✅ 前端展示双池价格对比                        │
│ ❌ 不做套利执行，只做数据采集和展示              │
└─────────────────────────────────────────────┘

Phase 2（2 周）：执行层 —— 让熊猫"操作"Cetus
┌─────────────────────────────────────────────┐
│ ✅ CDPM Agent 注册（熊猫 → Agent）            │
│ ✅ 单池 swap 通过 CDPM 执行                   │
│ ✅ 决策引擎新增跨池价差信号                    │
│ ✅ 单池流动性管理（add/remove liquidity）      │
│ ❌ 不做跨池 PTB 套利                          │
└─────────────────────────────────────────────┘

Phase 3（2 周）：套利层 —— 让熊猫"跨池套利"
┌─────────────────────────────────────────────┐
│ ✅ 跨池价差监控 + 套利信号推送                  │
│ ✅ PTB 跨池套利构造                            │
│ ✅ 滑点保护 + 利润验证                         │
│ ✅ 套利历史记录 + 经验反馈                      │
│ ✅ 前端套利决策链可视化                        │
└─────────────────────────────────────────────┘
```

### 6.2 Phase 1 最小可验证交付物

**目标**：用户在前端看到 DeepBook 和 Cetus 两个池子的价格，并排对比。

需要交付的代码：

```
market-monitor/
├── adapters/
│   ├── deepbook-adapter.ts     # 已有
│   └── cetus-dlmm-adapter.ts   # 新增：查询 Cetus pool 价格
├── feeds/
│   └── unified-price-feed.ts   # 新增：标准化两种数据源
└── publishers/
    └── redis-publisher.ts      # 改造：新增 market:tick:cetus 频道
```

验证标准：
- [ ] `market:tick:cetus` 频道有实时价格推送
- [ ] 前端 Trading 页面并排显示 DeepBook / Cetus 价格
- [ ] 价差百分比实时计算并展示

### 6.3 关键技术决策清单

| 决策 | 选项 | 建议 | 理由 |
|------|------|------|------|
| Cetus 数据获取方式 | GraphQL / RPC / SDK | **GraphQL**（Cetus 官方 API） | 最稳定，有 rate limit 但 MVP 够用 |
| CDPM Agent 身份 | 熊猫 NFT 地址 / 专用 Agent 钱包 | **专用 Agent 钱包** | 安全隔离，熊猫私钥不暴露给后端 |
| 套利触发方式 | 定时轮询 / WebSocket 订阅 | **定时轮询（500ms）** | Sui 没有原生 WebSocket 事件订阅，轮询足够 |
| 套利最小利润阈值 | 固定值 / 动态 | **动态**：`max(gas_cost * 2, 0.1%)` | 避免 gas 吃掉利润 |

---

## 附录：完整错误码速查

CDPM 合约的错误码（套利开发必看）：

| 错误码 | 含义 | 套利场景下如何触发 |
|--------|------|-------------------|
| 1001 ENotOwner | 非 owner 调用 | 不会触发（Agent 用 agent 函数） |
| 1002 ENotAllow | Agent 未授权 | 熊猫未注册为 PM 的 Agent |
| 1003 EInvalidFeeRate | 费率超 30% | 不会触发（协议配置） |
| 1004 ELendingNotEmpty | 关 PM 前 lending 未清空 | Phase 2+ 需注意 |
| 1005 ENoSuchVault | 不存在的 lending vault | 不会触发（套利不涉及 lending） |
| 1006 EReserveEmpty | 借贷储备耗尽 | 不会触发 |
| 1007 EZeroExpected | swap 金额太小 | 价差太小 + 本金太少 |
| 1008 EWrongPm | hot-potato ticket 绑错 PM | PTB 构造错误 |
| 1009 EAmountShortfall | finish 收到的币不够 | 价差在签名到上链间消失 |
| 1010 ENoSuchBalance | 不存在的余额类型 | 不会触发 |
| 1011 EStaleScallopState | Scallop 利息未结算 | Phase 2+ 涉及 lending 时需注意 |
| 1012 EWrongMarket | Scallop Market 不匹配 | 同上 |
| 1013 EWrongVault | Kai Vault 不匹配 | 同上 |

---

*报告撰写：Product Team | 2026-05-22*
*基于 CDPM 合约源码 + TradingPanda 架构文档整理*
