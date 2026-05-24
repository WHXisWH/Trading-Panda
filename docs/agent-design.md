# TradingPanda Agent 设计文档

> 版本 1.0 · 2026-05-08
> 性质：面向开发者的完整实现规格，读完可直接编码
> 前置文档：trading-behavior-mechanics.md / battle-cases.md / product-design.md

---

## 一、架构总览

### 1.1 混合架构全景

```
                           ┌─────────────────────────────┐
                           │  market-monitor/ (Render)   │
                           │  DeepBook v3 · Sui RPC 轮询  │
                           │  K线 + 指标 → MarketEvent     │
                           └──────────┬──────────────────┘
                                      │ PUBLISH
                                      ▼
                           ┌──────────────────────┐
                           │   Redis Pub/Sub        │
                           │  market:tick:{pair}    │
                           └──────────┬──────────────┘
                                      │ SUBSCRIBE (DE)
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                  ▼
          ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
          │ PandaActor-1 │   │ PandaActor-2 │   │ PandaActor-N │
          │ (asyncio)    │   │ (asyncio)    │   │ (asyncio)    │
          └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
                 │                  │                   │
     ┌───────────▼──────────────────▼───────────────────▼──────────┐
     │                   确定性 8 步管线 (<50ms)                      │
     │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │
     │  │ S1 │→│ S2 │→│ S3 │→│ S4 │→│ S5 │→│ S6 │→│ S7 │→│ S8 │ │
     │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ │
     │  策略信号 熟练噪声 经验修正 融合  性格过滤 环境适配 社交偏移 情绪扭曲 │
     └───────────────────────┬─────────────────────────────────────┘
                             │ S_final
                             ▼
                   ┌───────────────────┐
                   │   信号分流判定器      │
                   │  >0.65 → 执行       │
                   │  0.40-0.65 → 观望   │
                   │  <0.40 → 忽视       │
                   └────────┬──────────┘
                            │
              ┌─────────────┼──────────────┐
              ▼             ▼              ▼
     ┌──────────────┐ ┌──────────┐ ┌──────────────────┐
     │ 信号明确         │ │ 信号模糊   │ │ 冲突/极端情绪      │
     │ (>0.65/<0.40)  │ │(0.40-0.65)│ │ 检测到冲突          │
     └──────┬────────┘ └────┬─────┘ └────────┬─────────┘
            │               │                │
            ▼               ▼                ▼
   ┌────────────────┐  ┌──────────────────────────────┐
   │ 立即执行预决策    │  │ 等待 LLM Agent (3s timeout)   │
   │ Agent结果→熊猫自语 │  │ 超时→降级为预决策                │
   └────────────────┘  │ 正常→Agent决策+熊猫自语+解释      │
                       └──────────────────────────────┘
                                    │
                                    ▼
                       ┌──────────────────────┐
                       │  LLM Agent Coordinator │
                       │  DeepSeek V3 异步调用    │
                       │  Tools: personality /   │
                       │  strategy / memory /    │
                       │  emotion / market       │
                       └──────────────────────┘
```

### 1.2 关键设计原则

| 原则 | 说明 |
|------|------|
| 确定性优先 | 99%+ 的交易信号走 8 步管线，同步完成 <50ms |
| LLM 异步增强 | Agent 并行发起，结果用于表达层或仅在模糊区间修正决策 |
| Actor 隔离 | 每只熊猫独立 Actor，状态不共享，崩溃不扩散 |
| 事件驱动 | 市场数据通过 Redis Pub/Sub 广播，Actor 按需订阅 |
| 快进兼容 | 快进模式只跑规则引擎，不调 LLM |

---

## 二、Actor 模型设计

### 2.1 PandaActor 类设计

```python
import asyncio
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional, Dict, List

class ActorState(Enum):
    CREATED = "created"       # 已创建，未激活
    ACTIVE = "active"         # 正在接收事件、处理决策
    SLEEPING = "sleeping"     # 休眠，不消耗事件
    DESTROYED = "destroyed"   # 已销毁

@dataclass
class PandaActor:
    """每只熊猫的独立 Actor，持有全部状态"""
    
    # ---- 身份 ----
    panda_id: str                          # NFT ID（链上）
    personality: "Personality"             # 先天性格五轴（不可变）
    talent: int                            # 天赋编号 0-6
    
    # ---- 策略状态 ----
    strategy: "Strategy"                   # 当前策略（四层JSON）
    strategy_proficiency: int = 0          # 策略熟练度 0-100
    strategy_ghosts: List["StrategyGhost"] = field(default_factory=list)  # 策略残影列表
    
    # ---- 经验状态 ----
    experience_level: int = 0              # 经验等级 0-100
    pattern_memory: "PatternMemoryStore"   = None  # 模式记忆（SQLite）
    asset_mastery: Dict[str, float]        = field(default_factory=dict)  # 资产专精度
    mistake_journal: "MistakeJournal"      = None  # 错误反省
    cycle_wisdom: "CycleWisdom"            = None   # 周期认知
    relationship_memory: "RelationshipMemory" = None  # 关系记忆
    
    # ---- 情绪状态 ----
    emotion_state: "EmotionState" = None   # 情绪状态机实例
    
    # ---- 运行时 ----
    state: ActorState = ActorState.CREATED
    subscribed_assets: List[str] = field(default_factory=list)  # 订阅的资产
    event_queue: asyncio.Queue = field(default_factory=asyncio.Queue)
    decision_logs: List["DecisionLog"] = field(default_factory=list)
    trade_count: int = 0                   # 累计交易笔数
    position: Dict[str, "Position"] = field(default_factory=dict)  # 当前持仓
    
    # ---- 组件引用 ----
    rule_engine: "RuleEngine" = None
    environment_sensor: "EnvironmentSensor" = None
    agent_coordinator: "AgentCoordinator" = None
    expression_engine: "ExpressionEngine" = None
```

### 2.2 Actor 生命周期

```python
class PandaActorManager:
    """管理所有 PandaActor 的生命周期"""
    
    def __init__(self, redis_client, llm_client):
        self.actors: Dict[str, PandaActor] = {}
        self.redis = redis_client
        self.llm_client = llm_client
        self.tasks: Dict[str, asyncio.Task] = {}
    
    async def create_actor(self, panda_id: str, personality: "Personality",
                           strategy: "Strategy") -> PandaActor:
        """创建 Actor：从链上读取性格，从 Walrus 恢复经验"""
        actor = PandaActor(
            panda_id=panda_id,
            personality=personality,
            strategy=strategy,
        )
        # 初始化子组件
        actor.emotion_state = EmotionState(personality.emotion_stability)
        actor.pattern_memory = PatternMemoryStore(panda_id)
        actor.mistake_journal = MistakeJournal()
        actor.cycle_wisdom = CycleWisdom()
        actor.relationship_memory = RelationshipMemory()
        actor.rule_engine = RuleEngine(strategy)
        actor.environment_sensor = EnvironmentSensor(actor.experience_level)
        actor.agent_coordinator = AgentCoordinator(self.llm_client)
        actor.expression_engine = ExpressionEngine()
        
        actor.state = ActorState.CREATED
        self.actors[panda_id] = actor
        return actor
    
    async def activate_actor(self, panda_id: str):
        """激活 Actor：开始订阅市场事件，启动事件消费循环"""
        actor = self.actors[panda_id]
        actor.state = ActorState.ACTIVE
        
        # 订阅资产频道
        max_assets = 1 + actor.personality.focus // 25  # focus→最大资产数
        for asset in actor.subscribed_assets[:max_assets]:
            await self.redis.subscribe(f"market:tick:{asset}", actor.event_queue)
        
        # 启动事件消费循环
        self.tasks[panda_id] = asyncio.create_task(
            self._event_loop(actor)
        )
    
    async def sleep_actor(self, panda_id: str):
        """休眠 Actor：取消订阅，保留状态，停止事件消费"""
        actor = self.actors[panda_id]
        actor.state = ActorState.SLEEPING
        
        # 取消事件消费任务
        if panda_id in self.tasks:
            self.tasks[panda_id].cancel()
        
        # 取消订阅
        for asset in actor.subscribed_assets:
            await self.redis.unsubscribe(f"market:tick:{asset}")
        
        # 同步经验到 Walrus（防止休眠期数据丢失）
        await self._sync_experience_to_walrus(actor)
    
    async def destroy_actor(self, panda_id: str):
        """销毁 Actor：NFT 转让时调用，先同步再清理"""
        await self.sleep_actor(panda_id)
        actor = self.actors.pop(panda_id)
        actor.state = ActorState.DESTROYED
    
    async def _event_loop(self, actor: PandaActor):
        """单个 Actor 的事件消费主循环"""
        while actor.state == ActorState.ACTIVE:
            try:
                event = await asyncio.wait_for(
                    actor.event_queue.get(), timeout=60.0
                )
                await self._process_market_event(actor, event)
            except asyncio.TimeoutError:
                # 60s 无事件 → 心跳检查
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                # Actor 内部错误不影响其他 Actor
                logging.error(f"Actor {actor.panda_id} error: {e}")
                continue
```

### 2.3 市场数据事件流

```python
@dataclass(frozen=True)
class MarketEvent:
    """市场数据事件（不可变）"""
    asset: str              # "BTC", "ETH", "SUI"
    timestamp: float        # Unix 时间戳
    price: float            # 当前价格
    prev_price: float       # 上一根 K 线价格
    volume: float           # 成交量
    rsi: float              # RSI 指标值
    ma20: float             # 20 均线
    prev_ma20: float        # 上一根 K 线 MA20
    macd_signal: bool       # MACD 是否金叉/死叉
    volatility: float       # 波动率
    trend_strength: float   # 趋势强度 (0-1)
    market_regime: str      # "bull" / "bear" / "ranging"
    funding_rate: float     # 资金费率
    orderbook_imbalance: float  # 订单簿不平衡度
    pair: str               # 如 "SUI-USDC"（Redis channel 后缀）
```

**生产者 / 消费者分工（方案 B）**

- **生产**：`market-monitor/` 轮询 DeepBook v3 → 计算指标 → `PUBLISH market:tick:{pair}`（见 `docs/market-monitor-design.md`）。
- **消费**：Decision Engine 内 `MarketDataConsumer`：

```python
class MarketDataConsumer:
    async def start(self):
        pubsub = self.redis.pubsub()
        await pubsub.psubscribe("market:tick:*")
        async for message in pubsub.listen():
            event = MarketEvent.from_json(message["data"])
            await self.actor_manager.broadcast_market_tick(event)
```

### 2.4 Actor 状态管理

```
PandaActor 内部状态分为四层：

┌─────────────────────────────────────────┐
│ 层级 1: 不可变状态（链上 NFT）              │
│   personality (五轴), talent              │
│   → 铸造时确定，永不修改                     │
├─────────────────────────────────────────┤
│ 层级 2: 慢变状态（链下持久化）              │
│   strategy, proficiency, experience      │
│   pattern_memory, asset_mastery          │
│   → 每笔交易后更新，每 50 笔同步 Walrus     │
├─────────────────────────────────────────┤
│ 层级 3: 快变状态（内存）                    │
│   emotion_state, position, trade_count   │
│   → 每次事件后可能变化                      │
├─────────────────────────────────────────┤
│ 层级 4: 临时状态（单次决策生命周期）          │
│   S_raw, S_prof, S_exp, ...S_final       │
│   → 决策完成即丢弃                          │
└─────────────────────────────────────────┘
```

---

## 三、8 步决策管线详细实现

### 核心入口

```python
async def _process_market_event(self, actor: PandaActor, event: MarketEvent):
    """处理单个市场事件的完整决策管线"""
    
    market = event.__dict__  # 转为 dict 供规则引擎使用
    
    # ============ 确定性 8 步管线 ============
    
    # Step 1: 策略原始信号
    s_raw = self._step1_raw_signal(actor, market)
    
    # Step 2: 策略熟练度噪声
    s_prof = self._step2_proficiency_noise(actor, s_raw)
    
    # Step 3: 经验修正
    s_exp = self._step3_experience_correction(actor, market, s_prof)
    
    # Step 4: 策略/经验融合
    s_fuse = self._step4_fusion(actor, s_prof, s_exp)
    
    # Step 5: 性格过滤
    s_pers, entry_delay, position_factor = self._step5_personality_filter(
        actor, s_fuse
    )
    
    # Step 6: 环境适配
    s_env = self._step6_environment_adapt(actor, s_pers, market)
    
    # Step 7: 社交偏移（MVP 预留）
    s_social = self._step7_social_bias(actor, s_env, market)
    
    # Step 8: 情绪扭曲
    s_final, emotion_position_mod, emotion_stoploss_mod = (
        self._step8_emotion_distort(actor, s_social)
    )
    
    # ============ 执行判定与 Agent 协调 ============
    
    # 检测是否需要 Agent 介入
    needs_agent = self._check_agent_trigger(actor, s_final, s_prof, s_exp)
    
    if needs_agent:
        # 信号模糊或冲突 → 等待 Agent
        agent_result = await self._invoke_agent_with_timeout(
            actor, market, s_final, timeout=3.0
        )
        if agent_result is not None:
            s_final = agent_result.adjusted_signal
            monologue = agent_result.monologue
        else:
            # 超时，使用预决策
            monologue = actor.expression_engine.generate_template(
                actor, market, s_final
            )
    else:
        # 信号明确 → 立即执行，异步生成熊猫自语
        asyncio.create_task(
            self._async_generate_monologue(actor, market, s_final)
        )
        monologue = None
    
    # 执行交易
    await self._execute_decision(
        actor, market, s_final, entry_delay,
        position_factor, emotion_position_mod, emotion_stoploss_mod
    )
```

---

### Step 1: 策略原始信号 S_raw

**输入参数**：
- `market: dict` — 当前市场数据（price, rsi, ma20, macd_signal, volume 等）
- `strategy.signal_rules: list` — 策略信号规则列表
- `personality.intuition: int` — 直觉值 (0-100)
- `experience_level: int` — 经验等级 (0-100)
- `strategy_proficiency: int` — 策略熟练度 (0-100)

**输出参数**：
- `S_raw: float` — 原始信号强度 (0.0 ~ 1.0)，来自 `|signed_vote|`
- `direction: int` — `+1` 买 / `-1` 卖 / `0` 无方向（`signed_vote === 0`）

**MVP 支持的 `signal_rules` 指标**（与 `RuleEngine` 一致）：

| indicator | condition 示例 | 依赖 market 字段 |
|-----------|----------------|------------------|
| `RSI` | `< 30` / `> 70` | `rsi` |
| `MA20` | `cross_above` / `cross_below` | `price`, `ma20`, `prev_price`, `prev_ma20` |
| `MACD` | `golden_cross` / `death_cross` | `macd_signal` |
| `PRICE` | `> 60000` / `< 50000` | `price` |

无法编译的规则在服务端校验阶段拒绝；运行时静默跳过会导致分母变小，**禁止**未校验入库。

**多规则投票（Step 1 核心）**：

```
对每个已编译规则，评估 predicate(market)：
  buy_hits  = 命中且 action=BUY 的条数
  sell_hits = 命中且 action=SELL 的条数
  total     = 已编译规则总条数（非命中数）

signed_vote = (buy_hits - sell_hits) / total
direction   = sign(signed_vote)  // 0 表示无方向
S_raw       = |signed_vote|

例：4 条规则，1 买命中 → signed_vote = +0.25
例：4 条规则，1 买 1 卖同时命中 → signed_vote = 0
```

`signal_rules[].weight` 在 API/DB 中可存，**MVP 引擎不参与计分**；v2 可改为加权投票。

**策略作用域**：

- 每只 `PandaActor` 仅 **`active_strategy` 一份**（换策 deactivate 旧记录）。
- **一份策略内** `signal_rules` 为 **数组**（多条买/卖规则）。
- 历史策略通过 **策略残影**（Step 4，`ghost_weight` 衰减）干扰，**非**并列第二主策略。

**完整计算公式**：

```
S_raw = RuleEngine.match(market, strategy.signalRules)
        + 直觉信号 (仅当 S_raw=0 且 intuition>0 时)

直觉信号强度 = intuition / 200 + experience_level / 200
  intuition=0, exp=0   → 0 (纯理性，无规则不行动)
  intuition=100, exp=50 → 0.75 (75% 概率在没有规则匹配时仍产生信号)

最终直觉权重 = 直觉信号 × proficiency / 100
  幼年期 proficiency=15 → 直觉几乎不生效
  成熟期 proficiency=90 → 直觉成为主要驱动力
```

**Python 伪代码**：

```python
def _step1_raw_signal(self, actor: PandaActor, market: dict) -> float:
    """Step 1: 策略原始信号"""
    # 规则引擎匹配
    s_raw = actor.rule_engine.match_signals(market)
    
    # 哲学层方向加成
    philosophy = actor.strategy.philosophy
    if philosophy == "趋势跟踪":
        if s_raw > 0:  # BUY 方向
            s_raw *= 1.2
        else:
            s_raw *= 0.8
    elif philosophy == "逆向抄底":
        if s_raw > 0:
            s_raw *= 0.8
        else:
            s_raw *= 1.2
    elif philosophy == "直觉驱动":
        # 直觉权重 ×1.5（放大后续直觉的影响）
        pass  # 在直觉信号处理中体现
    
    # 直觉信号：仅当规则引擎无匹配时触发
    if s_raw == 0 and actor.personality.intuition > 0:
        intuition_strength = (
            actor.personality.intuition / 200
            + actor.experience_level / 200
        )
        # 直觉受熟练度调节
        intuition_weight = intuition_strength * actor.strategy_proficiency / 100
        
        # 直觉驱动哲学额外放大
        if philosophy == "直觉驱动":
            intuition_weight *= 1.5
        
        # 直觉产生的信号带有随机性（模拟"感觉"）
        if random.random() < intuition_weight:
            s_raw = intuition_weight  # 直觉信号强度 = 直觉权重
    
    return max(0.0, min(1.0, s_raw))
```

**规则引擎核心逻辑**：

```python
class RuleEngine:
    """Compile signal_rules → predicates; vote buy vs sell."""

    MVP_INDICATORS = ("RSI", "MA", "MA20", "MACD", "PRICE")

    def match_signals(self, market: dict) -> float:
        """Signed vote in [-1, 1]. Positive = BUY bias."""
        buy_hits = sell_hits = 0.0
        total = len(self._compiled) or 1
        for action, fn in self._compiled:
            if not fn(market):
                continue
            if action == "SELL":
                sell_hits += 1.0
            else:
                buy_hits += 1.0
        if buy_hits == 0 and sell_hits == 0:
            return 0.0
        return (buy_hits - sell_hits) / total
```

实现见 `backend/app/engine/rule_engine.py`。前端 Step 1 须展示 `buy_hits`, `sell_hits`, `total`, `matched_rule_indexes`。

---

### Step 2: 策略熟练度噪声 S_prof

**输入参数**：
- `S_raw: float` — Step 1 的原始信号
- `strategy_proficiency: int` — 策略熟练度 (0-100)
- `personality.boldness: int` — 胆识值 (0-100)

**输出参数**：
- `S_prof: float` — 加入熟练度噪声后的信号

**完整计算公式**：

```
S_prof = S_raw × (1 + noise(proficiency) × boldness/100)

noise 范围:
  proficiency < 20  → noise ∈ [-0.30, +0.30]  随机偏差 ±30%
  proficiency < 50  → noise ∈ [-0.15, +0.15]  随机偏差 ±15%
  proficiency < 80  → noise ∈ [-0.05, +0.05]  随机偏差 ±5%
  proficiency >= 80 → noise = 0                完美执行，且开始识别变体情形

熟练度成长速度:
  基础速度: +1 / 笔交易
  性格匹配加成: ×1.5（胆识 85 的熊猫练激进策略更快）
  经验重叠加成: ×1.3（已有相似策略经验）
  频繁换策惩罚: 熟练度重置，且残影叠加
```

**Python 伪代码**：

```python
def _step2_proficiency_noise(self, actor: PandaActor, s_raw: float) -> float:
    """Step 2: 策略熟练度噪声"""
    prof = actor.strategy_proficiency
    
    # 确定噪声范围
    if prof < 20:
        noise = random.uniform(-0.30, 0.30)
    elif prof < 50:
        noise = random.uniform(-0.15, 0.15)
    elif prof < 80:
        noise = random.uniform(-0.05, 0.05)
    else:
        noise = 0.0  # 完美执行
    
    # 噪声被胆识放大：高胆识 → 噪声影响更大
    s_prof = s_raw * (1 + noise * actor.personality.boldness / 100)
    
    return max(0.0, min(1.0, s_prof))

def _update_proficiency(self, actor: PandaActor, trade_result: dict):
    """交易完成后更新策略熟练度"""
    base_growth = 1  # +1/笔
    
    # 性格匹配加成
    match_score = self._calc_strategy_personality_match(actor)
    if match_score > 0.7:
        base_growth *= 1.5
    
    # 经验重叠加成
    if self._has_similar_strategy_experience(actor):
        base_growth *= 1.3
    
    actor.strategy_proficiency = min(
        100,
        actor.strategy_proficiency + int(base_growth)
    )
```

---

### Step 3: 经验修正 S_exp

**输入参数**：
- `S_prof: float` — Step 2 的信号
- `pattern_memory: PatternMemoryStore` — 模式记忆数据库
- `asset_mastery: dict` — 资产专精度
- `mistake_journal: MistakeJournal` — 错误反省记录
- `cycle_wisdom: CycleWisdom` — 周期认知
- `market: dict` — 当前市场数据

**输出参数**：
- `S_exp: float` — 经验修正后的信号

**完整计算公式**：

```
经验修正 = 模式记忆修正 + 资产专精修正 + 错误反省修正 + 周期认知修正

模式记忆修正 = Σ(形态相似度 × 历史胜率偏移)
  形态 hash=0x3f2a, 历史出现 21 次, 震荡市中胜率 25%
  → 当该形态出现且当前为震荡市时: 修正 = -0.25（强烈反对策略的 BUY 信号）

资产专精修正 = (mastery_score - 50) / 200
  BTC mastery=90 → +0.20 (这只熊猫是 BTC 专家)
  SOL mastery=12 → -0.19 (这只熊猫不懂 SOL)

错误反省修正 = 警惕系数 × (-0.10)
  追高错误 ×3 → 警惕系数=1.0 → 每次追高信号 -0.10
  错误 60 天未犯 → 警惕系数每周 -3%

周期认知修正 = 周期匹配加成
  亲历熊市 >30 天 → 熊市操作 +0.20

S_exp = S_prof + 经验总修正
```

**Python 伪代码**：

```python
def _step3_experience_correction(
    self, actor: PandaActor, market: dict, s_prof: float
) -> float:
    """Step 3: 经验修正"""
    total_correction = 0.0
    
    # --- 模式记忆修正 ---
    pattern_hash = self._compute_pattern_hash(market)
    memory = actor.pattern_memory.query(pattern_hash, market.get("market_regime"))
    if memory is not None and memory.occurrence_count >= 5:
        # 形态相似度 × 历史胜率偏移
        win_rate_offset = memory.win_rate - 0.50  # 偏离 50% 基准
        pattern_correction = memory.similarity * win_rate_offset
        total_correction += pattern_correction
    
    # --- 资产专精修正 ---
    asset = market.get("asset", "BTC")
    mastery = actor.asset_mastery.get(asset, 50)
    asset_correction = (mastery - 50) / 200
    total_correction += asset_correction
    
    # --- 错误反省修正 ---
    # 检查当前信号类型是否匹配历史错误模式
    signal_type = self._classify_signal_type(market)  # "追高", "抄底", "顺势"...
    vigilance = actor.mistake_journal.get_vigilance(signal_type)
    mistake_correction = vigilance * (-0.10)
    total_correction += mistake_correction
    
    # --- 周期认知修正 ---
    current_regime = market.get("market_regime", "unknown")
    cycle_experience_days = actor.cycle_wisdom.get_experience_days(current_regime)
    if cycle_experience_days > 30:
        cycle_correction = 0.20  # 有足够周期经验 → 加成
    elif cycle_experience_days > 10:
        cycle_correction = 0.10
    else:
        cycle_correction = 0.0
    total_correction += cycle_correction
    
    s_exp = s_prof + total_correction
    return s_exp  # 注意：这里不做 clamp，因为负值在 Step 4 融合时有意义
```

---

### Step 4: 策略/经验融合 S_fuse

**输入参数**：
- `S_prof: float` — Step 2 的策略信号（含噪声）
- `S_exp: float` — Step 3 的经验修正信号
- `experience_level: int` — 经验等级 (0-100)，决定成长阶段

**输出参数**：
- `S_fuse: float` — 融合后信号

**完整计算公式**：

```
S_fuse = S_prof × w_strategy + S_exp × w_experience

成长阶段与权重:
  幼年期 (exp 0-25):  w_strategy=0.55, w_experience=0.10
  成长期 (exp 25-65): w_strategy=0.50, w_experience=0.20
  成熟期 (exp 65-100): w_strategy=0.30, w_experience=0.50

关键张力（经验与策略的冲突）:
  策略说: RSI < 30 → BUY (信号强度 0.85)
  经验说: 这个形态震荡市 21 次假突破 → 修正 -0.35

  融合: 幼年期 → 0.85×0.55 + (-0.35)×0.10 = 0.43 (观望)
        成熟期 → 0.85×0.30 + (-0.35)×0.50 = 0.08 (忽视策略！)

注意: w_strategy + w_experience 不等于 1.0，剩余权重属于性格维度（在 Step 5 体现）
```

**Python 伪代码**：

```python
def _step4_fusion(
    self, actor: PandaActor, s_prof: float, s_exp: float
) -> float:
    """Step 4: 策略/经验融合"""
    exp = actor.experience_level
    
    # 根据经验等级确定成长阶段与权重
    if exp < 25:
        # 幼年期：策略主导
        w_strategy = 0.55
        w_experience = 0.10
    elif exp < 65:
        # 成长期：策略与经验开始平衡
        w_strategy = 0.50
        w_experience = 0.20
    else:
        # 成熟期：经验主导（可能反叛策略）
        w_strategy = 0.30
        w_experience = 0.50
    
    s_fuse = s_prof * w_strategy + s_exp * w_experience
    
    return s_fuse
```

---

### Step 5: 性格过滤 S_pers

**输入参数**：
- `S_fuse: float` — Step 4 的融合信号
- `personality.boldness: int` — 胆识 (0-100)
- `personality.patience: int` — 耐性 (0-100)
- `personality.focus: int` — 专注 (0-100)

**输出参数**：
- `S_pers: float` — 性格过滤后的信号
- `entry_delay: int` — 入场延迟 K 线数
- `position_factor: float` — 仓位倍率

**完整计算公式**：

```
入场阈值 = 0.65 × (1 - (boldness - 50) / 200)
  boldness=0   → 阈值 0.81 (极度保守)
  boldness=50  → 阈值 0.65 (中性)
  boldness=100 → 阈值 0.49 (极度激进)

仓位比例 = 策略仓位 × (0.6 + boldness / 250)
  boldness=0   → ×0.6 (只用策略建议的 60% 仓位)
  boldness=100 → ×1.0 (用满策略仓位)

入场延迟(K线数) = floor(patience / 20) - 1
  patience<20  → 0 (立即执行，不等)
  patience=50  → 1 (等 1 根 K 线)
  patience=100 → 4 (等 4 根 K 线确认)

持仓耐心(K线数) = 12 + patience / 4
  patience=0   → 12 K 线 (没耐心，快速离场)
  patience=100 → 37 K 线 (超长持仓)

单资产信号加成 = 1 + (focus - 50) / 200
  focus=100  → 专注资产信号 ×1.25
  focus=0    → 每个资产信号 ×0.75

boldness_factor = 0.7 + (boldness / 100) × 0.6  → 范围 0.7 ~ 1.3

S_pers = S_fuse × boldness_factor × focus_bonus
```

**Python 伪代码**：

```python
def _step5_personality_filter(
    self, actor: PandaActor, s_fuse: float
) -> tuple[float, int, float]:
    """Step 5: 性格过滤
    
    Returns:
        (s_pers, entry_delay, position_factor)
    """
    p = actor.personality
    
    # 入场阈值
    entry_threshold = 0.65 * (1 - (p.boldness - 50) / 200)
    
    # 入场延迟（K 线数）
    entry_delay = max(0, p.patience // 20 - 1)
    
    # 仓位倍率
    position_factor = 0.6 + p.boldness / 250
    
    # 持仓耐心（用于持仓管理，此处记录到 Actor 状态）
    actor._holding_patience = 12 + p.patience / 4
    
    # boldness_factor 放大/缩小信号
    boldness_factor = 0.7 + (p.boldness / 100) * 0.6  # 0.7 ~ 1.3
    
    # 专注度加成
    focus_bonus = 1 + (p.focus - 50) / 200  # 0.75 ~ 1.25
    
    s_pers = s_fuse * boldness_factor * focus_bonus
    
    # 注意：入场阈值的判定在最终执行时进行，而非此步
    # 但阈值信息传递到执行判定器
    actor._entry_threshold = entry_threshold
    
    return s_pers, entry_delay, position_factor
```

---

### Step 6: 环境适配 S_env

**输入参数**：
- `S_pers: float` — Step 5 的性格过滤信号
- `experience_level: int` — 经验等级（决定感知级别）
- `strategy.philosophy: str` — 策略哲学（判断策略-市场匹配度）
- `market.market_regime: str` — 当前市场状态
- `market.volatility: float` — 波动率
- `correlation_matrix: dict` — 多资产相关性矩阵（Lv.3+）

**输出参数**：
- `S_env: float` — 环境适配后的信号

**完整计算公式**：

```
感知等级 Lv.1 (exp 0-25):
  可感知: 价格方向、单资产波动率
  不可感知: 趋势强度、成交量异动、市场状态
  → 在不可感知环境中操作: 信号 ×0.7

感知等级 Lv.2 (exp 25-50):
  新增感知: 趋势强度、成交量异动
  不可感知: 多资产相关性、流动性

感知等级 Lv.3 (exp 50-80):
  新增感知: 市场状态分类(牛/熊/震荡)、多资产相关性
  不可感知: 宏观情绪、周期切换预感

感知等级 Lv.4 (exp 80-100):
  新增感知: 宏观情绪、异常资金流向、周期切换预感
  完全感知、无打折

策略-市场匹配度:
  当前市场 = 震荡市, 策略 = 趋势跟踪 → 不适配 → 信号 ×0.7
  当前市场 = 牛市, 策略 = 趋势跟踪 → 适配 → 信号 ×1.0

双倍惩罚:
  如果熊猫感知不到「当前是震荡市」(Lv.1) 且策略不适配:
  → 信号 ×0.7×0.7 = ×0.49

多资产相关性（Lv.3+ 可感知）:
  高相关(>0.7)资产不重复建仓: 信号 ×0.5

S_env = S_pers × 环境适配系数 × 策略-市场匹配度
```

**Python 伪代码**：

```python
# 策略-市场匹配表
STRATEGY_MARKET_MATCH = {
    # (philosophy, market_regime) → match_factor
    ("趋势跟踪", "bull"): 1.0,
    ("趋势跟踪", "bear"): 0.85,
    ("趋势跟踪", "ranging"): 0.7,
    ("逆向抄底", "bull"): 0.7,
    ("逆向抄底", "bear"): 1.0,
    ("逆向抄底", "ranging"): 0.85,
    ("网格交易", "bull"): 0.7,
    ("网格交易", "bear"): 0.7,
    ("网格交易", "ranging"): 1.0,
}

def _step6_environment_adapt(
    self, actor: PandaActor, s_pers: float, market: dict
) -> float:
    """Step 6: 环境适配"""
    exp = actor.experience_level
    regime = market.get("market_regime", "unknown")
    philosophy = actor.strategy.philosophy
    
    # 确定感知等级
    if exp < 25:
        perception_level = 1
    elif exp < 50:
        perception_level = 2
    elif exp < 80:
        perception_level = 3
    else:
        perception_level = 4
    
    # --- 环境适配系数 ---
    env_factor = 1.0
    
    # Lv.1: 只能感知价格方向和单资产波动率
    if perception_level == 1:
        # 无法感知市场状态、趋势强度 → 打折
        if regime in ("ranging", "bear"):
            env_factor *= 0.7  # 不知道危险
    
    # Lv.2: 可感知趋势强度和成交量异动
    elif perception_level == 2:
        trend = market.get("trend_strength", 0.5)
        if trend < 0.3:
            env_factor *= 0.85  # 趋势弱 → 小幅打折
    
    # Lv.3+: 可感知市场状态
    # Lv.4: 完全感知，无打折
    
    # --- 策略-市场匹配度 ---
    match_key = (philosophy, regime)
    market_match = STRATEGY_MARKET_MATCH.get(match_key, 0.85)
    
    # 感知不到市场状态时，匹配度判定无效（不知道不适配）
    can_perceive_regime = perception_level >= 3
    if not can_perceive_regime and market_match < 1.0:
        # 双倍惩罚：既不适配，又不知道
        env_factor *= 0.7
        # market_match 仍然生效（客观不适配）
    
    # --- 多资产相关性（Lv.3+）---
    correlation_penalty = 1.0
    if perception_level >= 3:
        asset = market.get("asset", "BTC")
        for held_asset, pos in actor.position.items():
            if held_asset != asset and pos.quantity > 0:
                corr = self._get_correlation(asset, held_asset)
                if corr > 0.7:
                    # 高相关资产不重复建仓
                    correlation_penalty = 0.5
                    break
    
    s_env = s_pers * env_factor * market_match * correlation_penalty
    return s_env
```

---

### Step 7: 社交偏移 S_social

**输入参数**：
- `S_env: float` — Step 6 的环境适配信号
- `personality.contrarian: int` — 逆向性 (0-100)
- `social_signal: float` — 群体信号强度

**输出参数**：
- `S_social: float` — 社交偏移后的信号

**完整计算公式**：

```
群体信号: >30% 熊猫在同一方向操作 → 触发

逆向偏移 = (contrarian - 50) / 100 × social_signal_strength
  contrarian=0   → 完全跟随群体（群体买我也买）
  contrarian=50  → 不受群体影响
  contrarian=100 → 完全反向（群体买我卖，群体卖我买）

低逆向性 (contrarian < 30):
  偏移 = +0.15 (顺向加成)
高逆向性 (contrarian > 70):
  偏移 = -0.15 (反向操作，群体买我卖)

S_social = S_env + 逆向偏移
```

**Python 伪代码**：

```python
def _step7_social_bias(
    self, actor: PandaActor, s_env: float, market: dict
) -> float:
    """Step 7: 社交偏移（MVP 不做，预留接口）"""
    # MVP: 社交信号为 0，直接透传
    social_signal_strength = 0.0  # TODO: 正式版从社交模块获取
    
    if social_signal_strength == 0:
        return s_env
    
    # 逆向偏移计算
    contrarian = actor.personality.contrarian
    bias = (contrarian - 50) / 100 * social_signal_strength
    
    s_social = s_env + bias
    return s_social

# --- 正式版接口定义 ---
class SocialModule:
    """社交模块接口（正式版实现）"""
    
    async def get_crowd_signal(self, asset: str) -> float:
        """获取群体信号强度 (-1.0 ~ +1.0)
        
        正值 = 群体在买入
        负值 = 群体在卖出
        0 = 无明显群体行为（<30% 熊猫同向）
        """
        pass
    
    async def get_mentor_memory(self, panda_id: str) -> dict:
        """获取导师模式记忆摘要（师承学习）"""
        pass
    
    async def get_rank_pressure(self, panda_id: str) -> float:
        """获取排名压力 → 影响入场门槛
        
        排名下降 → -0.05 (焦虑)
        排名新高 → 0 (不影响)
        """
        pass
```

---

### Step 8: 情绪扭曲 S_final

**输入参数**：
- `S_social: float` — Step 7 的社交偏移信号
- `emotion_state: EmotionState` — 当前情绪状态
- `personality.emotion_stability: int` — 情绪稳定性 (0-100)

**输出参数**：
- `S_final: float` — 最终执行分
- `emotion_position_mod: float` — 情绪仓位修正系数
- `emotion_stoploss_mod: float` — 情绪止损修正系数

**完整计算公式**：

```
情绪修正系数表:
  专注 Focused   → 信号 ×1.0   (仓位 1.0×, 止损 1.0×, 入场门槛 1.0×)
  兴奋 Excited   → 信号 ×1.1   (仓位 1.2×, 止损 1.1×, 入场门槛 0.9×)
  贪婪 Greedy    → 信号 ×1.3   (仓位 1.6×, 止损 1.4×, 入场门槛 0.7×)
  谨慎 Cautious  → 信号 ×0.85  (仓位 0.7×, 止损 0.85×, 入场门槛 1.2×)
  恐慌 Panicking → 信号 ×0.5   (仓位 0.3×, 止损 0.6×, 入场门槛 1.6×)
  麻木 Numb      → 信号 ×0.6   (仓位 0.5×, 入场门槛 1.4×, 几乎不操作)

性格调节:
  实际情绪修正 = 理论修正 × (1 - 情绪稳定性/100)
  情绪稳定性=85 → 几乎不受情绪影响
  情绪稳定性=15 → 贪婪时 ×1.3→×1.26, 恐慌时 ×0.5→×0.08 (严重失控)

完整计算:
  raw_emotion_factor = EMOTION_TABLE[current_emotion].signal_factor
  actual_emotion_factor = raw_emotion_factor ** (1 - emotion_stability / 100)
  
  但更精确地:
  偏离量 = raw_emotion_factor - 1.0  (偏离中性的距离)
  实际偏离 = 偏离量 × (1 - emotion_stability / 100)
  actual_factor = 1.0 + 实际偏离

S_final = S_social × actual_factor
```

**Python 伪代码**：

```python
@dataclass(frozen=True)
class EmotionProfile:
    """单个情绪状态的参数集"""
    signal_factor: float       # 信号乘数
    position_factor: float     # 仓位乘数
    stoploss_factor: float     # 止损乘数
    threshold_factor: float    # 入场门槛乘数

EMOTION_PROFILES = {
    "focused":   EmotionProfile(1.0,  1.0, 1.0,  1.0),
    "excited":   EmotionProfile(1.1,  1.2, 1.1,  0.9),
    "greedy":    EmotionProfile(1.3,  1.6, 1.4,  0.7),
    "cautious":  EmotionProfile(0.85, 0.7, 0.85, 1.2),
    "panicking": EmotionProfile(0.5,  0.3, 0.6,  1.6),
    "numb":      EmotionProfile(0.6,  0.5, 1.0,  1.4),
}

def _step8_emotion_distort(
    self, actor: PandaActor, s_social: float
) -> tuple[float, float, float]:
    """Step 8: 情绪扭曲"""
    emotion = actor.emotion_state.current
    stability = actor.personality.emotion_stability
    profile = EMOTION_PROFILES[emotion]
    
    # 性格调节：实际偏差 = 理论偏差 × (1 - 情绪稳定性/100)
    dampening = 1 - stability / 100
    
    def apply_dampening(raw_factor: float) -> float:
        deviation = raw_factor - 1.0
        actual_deviation = deviation * dampening
        return 1.0 + actual_deviation
    
    actual_signal_factor = apply_dampening(profile.signal_factor)
    actual_position_factor = apply_dampening(profile.position_factor)
    actual_stoploss_factor = apply_dampening(profile.stoploss_factor)
    actual_threshold_factor = apply_dampening(profile.threshold_factor)
    
    # 调整入场阈值
    actor._entry_threshold *= actual_threshold_factor
    
    s_final = s_social * actual_signal_factor
    
    return s_final, actual_position_factor, actual_stoploss_factor
```

### 执行判定

```python
async def _execute_decision(
    self, actor: PandaActor, market: dict,
    s_final: float, entry_delay: int,
    position_factor: float,
    emotion_position_mod: float,
    emotion_stoploss_mod: float
):
    """执行判定：根据 S_final 决定行动"""
    
    # 入场延迟处理
    if entry_delay > 0:
        # 记录延迟状态，等待后续 K 线确认
        actor._pending_signal = {
            "s_final": s_final,
            "remaining_delay": entry_delay,
            "original_market": market,
        }
        return  # 等下一根 K 线再决定
    
    # 策略残影干扰
    s_final = self._apply_ghost_interference(actor, s_final, market)
    
    entry_threshold = actor._entry_threshold  # 已被情绪调整
    
    if s_final > entry_threshold:
        # ---- 执行交易 ----
        # 最终仓位 = 策略仓位 × boldness_factor × 情绪仓位修正
        strategy_position = actor.strategy.position_sizing.get("value", 0.05)
        final_position = strategy_position * position_factor * emotion_position_mod
        
        # 止损 = max(策略止损 × 情绪止损修正, 0.03)  // 最低 3%
        strategy_stoploss = actor.strategy.risk_mgmt.get("stopLoss", 0.08)
        final_stoploss = max(strategy_stoploss * emotion_stoploss_mod, 0.03)
        
        # 风控硬限制检查
        if not self._risk_check(actor, final_position, market):
            return  # 风控拒绝
        
        await self._place_order(actor, market, final_position, final_stoploss)
        
    elif s_final >= 0.40:
        # ---- 观望（持仓不动）----
        pass
        
    else:
        # ---- 忽视信号 ----
        pass
    
    # 记录决策日志
    self._log_decision(actor, market, s_final)
    
    # 更新情绪状态机
    actor.emotion_state.update(market, actor.position)
```

---

## 四、Agent Coordinator 设计

### 4.1 触发条件精确定义

```python
def _check_agent_trigger(
    self, actor: PandaActor,
    s_final: float, s_prof: float, s_exp: float
) -> bool:
    """判断是否需要 LLM Agent 介入
    
    四种触发条件（满足任一即触发）:
    1. 信号处于模糊区间 (0.40 <= s_final <= 0.65)
    2. 策略与经验产生严重冲突
    3. 情绪处于极端状态（贪婪/恐慌/麻木）
    4. 用户主动提问（通过 API 触发，不在此函数处理）
    """
    
    # 条件 1: 信号模糊区间
    if 0.40 <= s_final <= 0.65:
        return True
    
    # 条件 2: 策略与经验严重冲突
    # 定义：策略信号和经验修正方向相反，且差值 > 0.30
    strategy_direction = 1 if s_prof > 0.5 else -1
    experience_direction = 1 if s_exp > s_prof else -1
    conflict_magnitude = abs(s_prof - s_exp)
    if strategy_direction != experience_direction and conflict_magnitude > 0.30:
        return True
    
    # 条件 3: 情绪极端状态
    extreme_emotions = {"greedy", "panicking", "numb"}
    if actor.emotion_state.current in extreme_emotions:
        return True
    
    return False
```

### 4.2 LLM Prompt 模板

#### 系统提示词

```python
AGENT_SYSTEM_PROMPT = """你是 TradingPanda 的 AI 交易顾问，负责为一只名叫「{panda_name}」的交易熊猫提供决策建议。

你的角色：
- 你不是直接交易的 AI，你是熊猫的"内心声音"
- 你需要综合考虑熊猫的性格、策略、经验和当前情绪
- 你的输出包括：决策建议（买/卖/观望）、信号强度调整、熊猫自语文本

熊猫的性格（先天不可变）：
- 胆识: {boldness}/100 — {"激进冲动" if boldness > 70 else "保守谨慎" if boldness < 30 else "中性"}
- 耐性: {patience}/100 — {"极其耐心" if patience > 70 else "急躁" if patience < 30 else "中性"}
- 直觉: {intuition}/100 — {"直觉敏锐" if intuition > 70 else "纯理性" if intuition < 30 else "中性"}
- 专注: {focus}/100
- 逆向性: {contrarian}/100 — {"逆向思维" if contrarian > 70 else "随大流" if contrarian < 30 else "中性"}
- 情绪稳定性: {emotion_stability}/100

输出格式（严格 JSON）：
{{
  "decision": "BUY" | "SELL" | "HOLD" | "IGNORE",
  "signal_adjustment": float,  // -0.3 ~ +0.3 的信号调整
  "confidence": float,         // 0-1 的置信度
  "monologue": "string",       // 熊猫第一人称自语，30-80字，体现性格
  "reasoning": "string"        // 决策解释，供调试用
}}

重要规则：
1. monologue 必须用熊猫的第一人称视角，语气要体现性格特征
2. 不暴露精确数值（不说"胜率 25%"，说"这个形态我不太信"）
3. signal_adjustment 不应偏离规则引擎结果太远
4. 如果经验与策略冲突，优先描述冲突而非直接给出答案
"""
```

#### 上下文构造

```python
def _build_agent_context(
    self, actor: PandaActor, market: dict, s_final: float
) -> str:
    """构造 Agent 调用的上下文"""
    
    # 市场快照
    market_context = f"""当前市场状况:
- 资产: {market['asset']}
- 价格: ${market['price']:,.2f}
- RSI: {market['rsi']:.1f}
- 波动率: {market['volatility']:.2%}
- 市场状态: {market.get('market_regime', '未知')}
- 趋势强度: {market.get('trend_strength', 0.5):.2f}
"""
    
    # 经验摘要
    pattern_hash = self._compute_pattern_hash(market)
    memory = actor.pattern_memory.query(pattern_hash)
    experience_context = ""
    if memory and memory.occurrence_count >= 3:
        experience_context = f"""相关经验:
- 相似形态出现过 {memory.occurrence_count} 次
- 历史胜率: {'高' if memory.win_rate > 0.6 else '低' if memory.win_rate < 0.4 else '中等'}
- 最近一次: {memory.last_seen_description}
"""
    
    # 情绪状态
    emotion_context = f"""当前情绪: {actor.emotion_state.current}
- 连续盈亏: {actor.emotion_state.streak_description}
- 最近回撤: {actor.emotion_state.recent_drawdown:.1%}
"""
    
    # 规则引擎预决策
    engine_context = f"""规则引擎预决策:
- 信号强度: {s_final:.3f}
- 预判定: {'执行' if s_final > 0.65 else '观望' if s_final >= 0.40 else '忽视'}
- 触发 Agent 原因: {self._get_trigger_reason(actor, s_final)}
"""
    
    return market_context + experience_context + emotion_context + engine_context
```

### 4.3 Tool 定义

Agent Coordinator 使用 function calling 模式，定义以下 Tool 供 LLM 调用：

```python
AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "personality_tool",
            "description": "查询熊猫的性格详情和性格对当前信号的影响",
            "parameters": {
                "type": "object",
                "properties": {
                    "query_type": {
                        "type": "string",
                        "enum": ["full_profile", "boldness_impact",
                                 "patience_impact", "intuition_check"]
                    }
                },
                "required": ["query_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "strategy_tool",
            "description": "查询当前策略详情、熟练度和策略-性格匹配度",
            "parameters": {
                "type": "object",
                "properties": {
                    "query_type": {
                        "type": "string",
                        "enum": ["current_strategy", "proficiency",
                                 "match_score", "ghost_status"]
                    }
                },
                "required": ["query_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "memory_tool",
            "description": "查询熊猫的经验记忆：模式记忆、资产专精、错误反省",
            "parameters": {
                "type": "object",
                "properties": {
                    "query_type": {
                        "type": "string",
                        "enum": ["pattern_lookup", "asset_mastery",
                                 "mistake_history", "cycle_wisdom"]
                    },
                    "pattern_hash": {
                        "type": "string",
                        "description": "模式 hash（query_type=pattern_lookup 时）"
                    },
                    "asset": {
                        "type": "string",
                        "description": "资产名（query_type=asset_mastery 时）"
                    }
                },
                "required": ["query_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "emotion_tool",
            "description": "查询情绪状态机详情：当前状态、跳转历史、影响系数",
            "parameters": {
                "type": "object",
                "properties": {
                    "query_type": {
                        "type": "string",
                        "enum": ["current_state", "transition_history",
                                 "impact_coefficients"]
                    }
                },
                "required": ["query_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "market_tool",
            "description": "查询市场数据：技术指标、历史走势、多资产相关性",
            "parameters": {
                "type": "object",
                "properties": {
                    "query_type": {
                        "type": "string",
                        "enum": ["technical_indicators", "price_history",
                                 "correlation_matrix", "orderbook_depth"]
                    },
                    "asset": {"type": "string"},
                    "lookback_bars": {"type": "integer", "default": 20}
                },
                "required": ["query_type"]
            }
        }
    }
]
```

### 4.4 响应解析

```python
@dataclass
class AgentResult:
    """Agent 返回结果"""
    decision: str           # "BUY" / "SELL" / "HOLD" / "IGNORE"
    signal_adjustment: float  # -0.3 ~ +0.3
    confidence: float       # 0-1
    monologue: str          # 熊猫自语文本
    reasoning: str          # 决策解释
    adjusted_signal: float  # 调整后的最终信号

class AgentCoordinator:
    def __init__(self, llm_client):
        self.client = llm_client  # DeepSeek V3 client
    
    async def invoke(
        self, actor: PandaActor, market: dict, s_final: float
    ) -> Optional[AgentResult]:
        """调用 LLM Agent，返回决策结果"""
        
        system_prompt = AGENT_SYSTEM_PROMPT.format(
            panda_name=actor.panda_id,
            boldness=actor.personality.boldness,
            patience=actor.personality.patience,
            intuition=actor.personality.intuition,
            focus=actor.personality.focus,
            contrarian=actor.personality.contrarian,
            emotion_stability=actor.personality.emotion_stability,
        )
        
        user_message = self._build_agent_context(actor, market, s_final)
        
        try:
            response = await self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                tools=AGENT_TOOLS,
                temperature=0.3,
                max_tokens=500,
            )
            
            # 处理 tool calls（如果 LLM 需要查询更多信息）
            while response.choices[0].message.tool_calls:
                tool_results = await self._execute_tools(
                    actor, market, response.choices[0].message.tool_calls
                )
                # 追加 tool 结果，继续对话
                response = await self.client.chat.completions.create(
                    model="deepseek-chat",
                    messages=[...tool_results...],
                    tools=AGENT_TOOLS,
                    temperature=0.3,
                    max_tokens=500,
                )
            
            # 解析最终响应
            raw = response.choices[0].message.content
            result_dict = json.loads(raw)
            
            # 验证 signal_adjustment 范围
            adj = max(-0.3, min(0.3, result_dict.get("signal_adjustment", 0)))
            
            return AgentResult(
                decision=result_dict["decision"],
                signal_adjustment=adj,
                confidence=result_dict.get("confidence", 0.5),
                monologue=result_dict["monologue"],
                reasoning=result_dict.get("reasoning", ""),
                adjusted_signal=s_final + adj,
            )
        
        except Exception as e:
            logging.warning(f"Agent invoke failed: {e}")
            return None
```

### 4.5 超时与降级策略

```python
async def _invoke_agent_with_timeout(
    self, actor: PandaActor, market: dict,
    s_final: float, timeout: float = 3.0
) -> Optional[AgentResult]:
    """带超时的 Agent 调用，超时降级为规则引擎预决策"""
    
    try:
        result = await asyncio.wait_for(
            actor.agent_coordinator.invoke(actor, market, s_final),
            timeout=timeout
        )
        return result
    
    except asyncio.TimeoutError:
        logging.info(
            f"Agent timeout for {actor.panda_id}, "
            f"falling back to rule engine (s_final={s_final:.3f})"
        )
        # 降级：使用模板生成简单的熊猫自语
        monologue = actor.expression_engine.generate_template(
            actor, market, s_final
        )
        return AgentResult(
            decision="HOLD" if 0.40 <= s_final <= 0.65 else "IGNORE",
            signal_adjustment=0.0,
            confidence=0.3,
            monologue=monologue,
            reasoning="Agent timeout, using rule engine fallback",
            adjusted_signal=s_final,
        )
    
    except Exception as e:
        logging.error(f"Agent error: {e}")
        return None
```

### 4.6 与规则引擎预决策的合并逻辑

```python
def _merge_agent_decision(
    self, pre_decision_signal: float, agent_result: AgentResult
) -> float:
    """合并 Agent 建议与规则引擎预决策
    
    规则:
    1. Agent 的 signal_adjustment 被限制在 [-0.3, +0.3]
    2. 如果 Agent confidence < 0.3，忽略 Agent 建议
    3. 最终信号 = pre_decision + adjustment × confidence
    """
    if agent_result.confidence < 0.3:
        return pre_decision_signal
    
    adjustment = agent_result.signal_adjustment * agent_result.confidence
    merged = pre_decision_signal + adjustment
    
    return max(0.0, min(1.0, merged))
```

---

## 五、策略解析器

### 5.1 自然语言 → 四层结构化 JSON

```python
STRATEGY_PARSE_PROMPT = """你是 TradingPanda 的策略解析器。将用户的自然语言交易策略解析为四层结构化 JSON。

输出格式（严格 JSON，无注释）：
{
  "philosophy": "趋势跟踪" | "逆向抄底" | "网格交易" | "定投" | "直觉驱动",
  "positionSizing": {
    "type": "fixed" | "kelly" | "grid",
    "value": 0.05,
    "maxPosition": 0.20,
    "gridLevels": 10,
    "gridSpacing": 0.03
  },
  "signalRules": [
    {
      "indicator": "RSI" | "MA20" | "MACD" | "VOLUME" | "PRICE",
      "condition": "below" | "above" | "cross_above" | "cross_below" | "golden_cross" | "death_cross",
      "threshold": 30,
      "signal_direction": "BUY" | "SELL",
      "signal_strength": 1.0
    }
  ],
  "riskMgmt": {
    "stopLoss": 0.08,
    "takeProfit": null,
    "maxDailyLoss": 500,
    "maxDrawdown": 0.15,
    "maxPositionSize": 0.10
  },
  "risk_warning": null | "描述危险行为"
}

解析规则：
1. 如果用户没提止损，默认 8%
2. 如果用户没提仓位，默认 5%
3. 如果用户说"全仓"或"梭哈"，标记 risk_warning
4. 如果用户提到危险行为（如"加杠杆"），标记 risk_warning
5. 策略哲学从用户描述中推断，如果无法推断则用"趋势跟踪"
"""

class StrategyParser:
    def __init__(self, llm_client):
        self.client = llm_client
    
    async def parse(self, strategy_text: str) -> dict:
        """解析策略文本 → 结构化 JSON
        
        - 一次性调用，结果缓存
        - 成本 < $0.002
        """
        response = await self.client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "只输出JSON，不要其他文字。"},
                {"role": "user", "content": STRATEGY_PARSE_PROMPT + "\n\n用户策略：" + strategy_text},
            ],
            temperature=0.1,
            max_tokens=500,
        )
        
        raw = response.choices[0].message.content
        # 清理 markdown 代码块标记
        raw = raw.strip().removeprefix("```json").removesuffix("```").strip()
        parsed = json.loads(raw)
        
        # 验证
        self._validate(parsed)
        
        return parsed
    
    def _validate(self, parsed: dict):
        """验证解析结果的完整性和安全性"""
        
        # 必须有 signalRules
        if not parsed.get("signalRules"):
            raise ValueError("策略至少需要一条信号规则")
        
        # stopLoss 必须存在且合理
        risk = parsed.get("riskMgmt", {})
        stop_loss = risk.get("stopLoss", 0.08)
        if stop_loss > 0.20:
            parsed.setdefault("risk_warning", "止损过宽（>20%），风险极高")
        if stop_loss < 0.01:
            parsed["riskMgmt"]["stopLoss"] = 0.03  # 强制最低 3%
        
        # 仓位检查
        position = parsed.get("positionSizing", {})
        value = position.get("value", 0.05)
        if value > 0.30:
            parsed.setdefault("risk_warning", "单次仓位过大（>30%），风险极高")
        
        # 信号规则验证
        valid_indicators = {"RSI", "MA20", "MA", "MACD", "VOLUME", "PRICE",
                            "BOLLINGER", "EMA"}
        for rule in parsed.get("signalRules", []):
            indicator = rule.get("indicator", "").upper()
            if indicator not in valid_indicators:
                raise ValueError(f"不支持的指标: {indicator}")
    
    def _detect_dangerous_strategy(self, parsed: dict) -> Optional[str]:
        """检测危险策略模式"""
        warnings = []
        
        risk = parsed.get("riskMgmt", {})
        if risk.get("stopLoss", 0.08) > 0.15:
            warnings.append("止损宽度超过 15%")
        if risk.get("maxDrawdown", 0.15) > 0.30:
            warnings.append("最大回撤容忍超过 30%")
        
        position = parsed.get("positionSizing", {})
        if position.get("value", 0.05) > 0.20:
            warnings.append("单次仓位超过 20%")
        
        return "; ".join(warnings) if warnings else None
```

### 5.2 解析结果缓存

```python
class StrategyCache:
    """策略解析结果缓存：避免重复调用 LLM"""
    
    def __init__(self):
        self._cache: Dict[str, dict] = {}
    
    def _hash_strategy(self, text: str) -> str:
        """对策略文本做哈希"""
        return hashlib.sha256(text.encode()).hexdigest()[:16]
    
    async def get_or_parse(
        self, parser: StrategyParser, strategy_text: str
    ) -> dict:
        key = self._hash_strategy(strategy_text)
        if key in self._cache:
            return self._cache[key]
        
        result = await parser.parse(strategy_text)
        self._cache[key] = result
        return result
```

---

## 六、情绪状态机

### 6.1 七状态定义

```python
from enum import Enum

class EmotionType(str, Enum):
    FOCUSED   = "focused"    # 专注（默认）
    EXCITED   = "excited"    # 兴奋
    GREEDY    = "greedy"     # 贪婪
    CAUTIOUS  = "cautious"   # 谨慎
    PANICKING = "panicking"  # 恐慌
    NUMB      = "numb"       # 麻木
    # 注意：产品文档定义了 6 种情绪，此处将 FOCUSED 作为默认基准
```

### 6.2 完整跳转规则

```
状态跳转规则（从 trading-behavior-mechanics.md 原文）:

专注 → 兴奋: 连赢 3 次
兴奋 → 贪婪: 连赢 5 次
贪婪 → 专注: 单次盈利 < 预期 or 连亏 2 次

专注 → 谨慎: 单次大亏 (>5%)
谨慎 → 恐慌: 回撤 > 10%
恐慌 → 麻木: 连续 10 次无操作 + 长期亏损
麻木 → 专注: 连续 5 次无操作 + 回撤 < 5%

例外: 天赋「竹林禅心」→ 情绪永远不进入恐慌，最低止于谨慎
```

### 6.3 状态机实现

```python
@dataclass
class EmotionState:
    """情绪状态机"""
    
    current: str = "focused"
    emotion_stability: int = 50   # 性格的情绪稳定性
    has_zen_talent: bool = False  # 天赋「竹林禅心」
    
    # 跟踪变量
    consecutive_wins: int = 0
    consecutive_losses: int = 0
    consecutive_no_ops: int = 0
    recent_drawdown: float = 0.0
    peak_equity: float = 10000.0
    last_pnl: float = 0.0
    total_pnl: float = 0.0
    
    # 跳转历史（用于 Agent 分析）
    transition_history: List[tuple] = field(default_factory=list)
    
    @property
    def streak_description(self) -> str:
        if self.consecutive_wins > 0:
            return f"连赢 {self.consecutive_wins} 次"
        elif self.consecutive_losses > 0:
            return f"连亏 {self.consecutive_losses} 次"
        else:
            return "无连续"
    
    def update(self, trade_result: Optional[dict], current_equity: float):
        """交易/事件后更新情绪状态"""
        
        if trade_result is not None:
            pnl_pct = trade_result.get("pnl_pct", 0)
            self.last_pnl = pnl_pct
            self.total_pnl += pnl_pct
            
            if pnl_pct > 0:
                self.consecutive_wins += 1
                self.consecutive_losses = 0
                self.consecutive_no_ops = 0
            elif pnl_pct < 0:
                self.consecutive_losses += 1
                self.consecutive_wins = 0
                self.consecutive_no_ops = 0
            
            # 更新峰值和回撤
            if current_equity > self.peak_equity:
                self.peak_equity = current_equity
            self.recent_drawdown = (
                (self.peak_equity - current_equity) / self.peak_equity
            )
        else:
            # 无操作事件
            self.consecutive_no_ops += 1
        
        # 执行状态跳转
        self._transition()
    
    def _transition(self):
        """执行状态跳转逻辑"""
        old_state = self.current
        
        if self.current == "focused":
            if self.consecutive_wins >= 3:
                self.current = "excited"
            elif self.last_pnl < -5.0:  # 单次大亏 >5%
                self.current = "cautious"
        
        elif self.current == "excited":
            if self.consecutive_wins >= 5:
                self.current = "greedy"
            elif self.consecutive_losses >= 1:
                self.current = "focused"
        
        elif self.current == "greedy":
            if self.last_pnl < 0 and self.last_pnl > -2.0:
                # 单次盈利 < 预期（小亏也算）
                self.current = "focused"
            elif self.consecutive_losses >= 2:
                self.current = "focused"
        
        elif self.current == "cautious":
            if self.recent_drawdown > 0.10:  # 回撤 >10%
                if self.has_zen_talent:
                    # 竹林禅心：不进入恐慌
                    pass  # 保持 cautious
                else:
                    self.current = "panicking"
            elif self.consecutive_wins >= 2:
                self.current = "focused"
        
        elif self.current == "panicking":
            if (self.consecutive_no_ops >= 10
                    and self.total_pnl < 0):  # 长期亏损
                self.current = "numb"
            elif self.consecutive_wins >= 1:
                self.current = "cautious"
        
        elif self.current == "numb":
            if (self.consecutive_no_ops >= 5
                    and self.recent_drawdown < 0.05):
                self.current = "focused"
        
        # 记录跳转历史
        if self.current != old_state:
            self.transition_history.append(
                (old_state, self.current, time.time())
            )
    
    def reset_to_focused(self):
        """道具「冷静竹」效果：重置为专注"""
        old = self.current
        self.current = "focused"
        self.consecutive_wins = 0
        self.consecutive_losses = 0
        self.consecutive_no_ops = 0
        self.transition_history.append(
            (old, "focused", time.time(), "cold_bamboo_item")
        )
```

### 6.4 情绪对交易参数的影响系数表

| 情绪状态 | 信号乘数 | 仓位乘数 | 止损乘数 | 入场门槛乘数 |
|---------|---------|---------|---------|-----------|
| 专注 Focused | ×1.0 | ×1.0 | ×1.0 | ×1.0 |
| 兴奋 Excited | ×1.1 | ×1.2 | ×1.1 | ×0.9 |
| 贪婪 Greedy | ×1.3 | ×1.6 | ×1.4 | ×0.7 |
| 谨慎 Cautious | ×0.85 | ×0.7 | ×0.85 | ×1.2 |
| 恐慌 Panicking | ×0.5 | ×0.3 | ×0.6 | ×1.6 |
| 麻木 Numb | ×0.6 | ×0.5 | ×1.0 | ×1.4 |

### 6.5 性格调节公式

```
实际情绪修正 = 理论修正 × (1 - 情绪稳定性/100)

示例：
  情绪稳定性=85, 当前贪婪:
    理论信号乘数 = 1.3
    偏离 = 1.3 - 1.0 = 0.3
    实际偏离 = 0.3 × (1 - 85/100) = 0.3 × 0.15 = 0.045
    实际信号乘数 = 1.0 + 0.045 = 1.045 ← 几乎不受影响

  情绪稳定性=15, 当前恐慌:
    理论信号乘数 = 0.5
    偏离 = 0.5 - 1.0 = -0.5
    实际偏离 = -0.5 × (1 - 15/100) = -0.5 × 0.85 = -0.425
    实际信号乘数 = 1.0 + (-0.425) = 0.575 ← 严重失控
    (注：实际表现中低稳定性+恐慌=近乎瘫痪)
```

### 6.6 天赋「竹林禅心」的特殊规则

```
天赋编号: talent=X (具体编号待确认)
效果: 情绪永远不进入「恐慌 Panicking」状态

实现:
  在 _transition() 中，当跳转目标为 panicking 时:
    if self.has_zen_talent:
        pass  # 保持 cautious，不进入 panicking
  
  副作用:
    - 也不会从 panicking → numb（因为永远不进入 panicking）
    - 最差状态是 cautious（信号 ×0.85，仓位 ×0.7）
    - 这使拥有竹林禅心天赋的熊猫在极端行情中表现显著更稳
```

---

## 七、经验引擎

### 7.1 五个经验子系统概览

```
experience_engine/
├── pattern_memory/     # 形态记忆：识别历史形态并做修正
├── asset_mastery/      # 资产专精：对特定资产的熟悉度
├── mistake_journal/    # 错误反省：记录并警惕重复错误
├── cycle_wisdom/       # 周期认知：市场周期经验
└── relationship_memory/ # 关系记忆：师承/对手关系
```

### 7.2 模式记忆 (Pattern Memory)

```python
@dataclass
class PatternRecord:
    """单个形态模式记录"""
    pattern_hash: str          # 形态特征哈希
    occurrence_count: int      # 出现次数
    win_count: int             # 盈利次数
    loss_count: int            # 亏损次数
    win_rate: float            # 胜率
    avg_pnl: float             # 平均盈亏
    market_regime_stats: Dict[str, dict]  # 按市场状态分类的统计
    last_seen: float           # 上次出现时间戳
    similarity: float = 1.0   # 与当前形态的相似度
    last_seen_description: str = ""

class PatternMemoryStore:
    """模式记忆存储（SQLite）"""
    
    def __init__(self, panda_id: str):
        self.db_path = f"experience_db/{panda_id}/pattern_memory.db"
        self._init_db()
    
    def _init_db(self):
        """初始化 SQLite 表"""
        # CREATE TABLE patterns (
        #   hash TEXT PRIMARY KEY,
        #   occurrence_count INTEGER,
        #   win_count INTEGER,
        #   loss_count INTEGER,
        #   regime_stats TEXT,  -- JSON
        #   last_seen REAL,
        #   avg_pnl REAL
        # )
        pass
    
    def query(
        self, pattern_hash: str, market_regime: Optional[str] = None
    ) -> Optional[PatternRecord]:
        """查询模式记忆
        
        输入: 当前形态 hash + 市场状态
        输出: 匹配的历史记录（如有）
        延迟: < 10ms (SQLite hash 查询)
        """
        # SELECT * FROM patterns WHERE hash = ?
        row = self._query_db(pattern_hash)
        if row is None:
            return None
        
        record = PatternRecord(
            pattern_hash=pattern_hash,
            occurrence_count=row["occurrence_count"],
            win_count=row["win_count"],
            loss_count=row["loss_count"],
            win_rate=row["win_count"] / max(1, row["occurrence_count"]),
            avg_pnl=row["avg_pnl"],
            market_regime_stats=json.loads(row["regime_stats"]),
            last_seen=row["last_seen"],
        )
        
        # 如果指定了市场状态，用该状态下的统计
        if market_regime and market_regime in record.market_regime_stats:
            regime_data = record.market_regime_stats[market_regime]
            record.win_rate = regime_data.get("win_rate", record.win_rate)
            record.occurrence_count = regime_data.get("count", record.occurrence_count)
        
        return record
    
    def update(
        self, pattern_hash: str, market_regime: str,
        pnl: float, won: bool
    ):
        """交易完成后更新模式记忆"""
        # UPSERT: 增加 occurrence_count, 更新 win/loss
        pass
    
    def compute_correction(
        self, pattern_hash: str, market_regime: str
    ) -> float:
        """计算模式记忆修正值
        
        公式: 模式记忆修正 = Σ(形态相似度 × 历史胜率偏移)
        """
        record = self.query(pattern_hash, market_regime)
        if record is None or record.occurrence_count < 5:
            return 0.0
        
        # 胜率偏移 = 实际胜率 - 0.50 基准
        win_rate_offset = record.win_rate - 0.50
        correction = record.similarity * win_rate_offset
        
        return correction


def _compute_pattern_hash(market: dict) -> str:
    """计算市场形态哈希
    
    特征向量: [RSI区间, 波动率区间, 趋势方向, 成交量异动, K线形态]
    """
    rsi_bucket = int(market.get("rsi", 50)) // 10  # 0-9
    vol_bucket = min(4, int(market.get("volatility", 0.02) * 100))  # 0-4
    trend_dir = 1 if market.get("price", 0) > market.get("prev_price", 0) else 0
    
    feature_str = f"{rsi_bucket}:{vol_bucket}:{trend_dir}"
    return hashlib.md5(feature_str.encode()).hexdigest()[:8]
```

### 7.3 资产专精 (Asset Mastery)

```python
@dataclass
class AssetMasteryStore:
    """资产专精度管理"""
    
    mastery: Dict[str, float] = field(default_factory=dict)  # asset → score (0-100)
    trade_counts: Dict[str, int] = field(default_factory=dict)  # asset → 交易次数
    
    def get_mastery(self, asset: str) -> float:
        """获取资产专精度，默认 50"""
        return self.mastery.get(asset, 50.0)
    
    def compute_correction(self, asset: str) -> float:
        """资产专精修正 = (mastery_score - 50) / 200
        
        BTC mastery=90 → +0.20
        SOL mastery=12 → -0.19
        """
        mastery = self.get_mastery(asset)
        return (mastery - 50) / 200
    
    def update(self, asset: str, trade_result: dict):
        """交易后更新专精度
        
        更新规则:
        - 盈利: +2
        - 亏损但合理止损: +1（学到了东西）
        - 亏损因失误: -1
        - 上限 100, 下限 0
        """
        self.trade_counts[asset] = self.trade_counts.get(asset, 0) + 1
        
        pnl = trade_result.get("pnl_pct", 0)
        reason = trade_result.get("exit_reason", "")
        
        if pnl > 0:
            delta = 2.0
        elif reason == "stop_loss":
            delta = 1.0  # 合理止损 = 学习
        else:
            delta = -1.0
        
        current = self.mastery.get(asset, 50.0)
        self.mastery[asset] = max(0, min(100, current + delta))
```

### 7.4 错误反省 (Mistake Journal)

```python
@dataclass
class MistakeRecord:
    """错误记录"""
    mistake_type: str     # "追高", "恐慌割肉", "过度交易", "忽视止损"
    count: int            # 累计次数
    last_occurrence: float  # 上次发生时间戳
    vigilance: float      # 警惕系数 (0-1)

class MistakeJournal:
    """错误反省系统"""
    
    def __init__(self):
        self.records: Dict[str, MistakeRecord] = {}
    
    def record_mistake(self, mistake_type: str):
        """记录一次错误"""
        if mistake_type in self.records:
            r = self.records[mistake_type]
            r.count += 1
            r.last_occurrence = time.time()
            # 警惕系数随次数增长，上限 1.0
            r.vigilance = min(1.0, r.count / 3)
        else:
            self.records[mistake_type] = MistakeRecord(
                mistake_type=mistake_type,
                count=1,
                last_occurrence=time.time(),
                vigilance=0.33,
            )
    
    def get_vigilance(self, signal_type: str) -> float:
        """获取特定信号类型的警惕系数
        
        错误 60 天未犯 → 警惕系数每周 -3%
        
        公式: 错误反省修正 = 警惕系数 × (-0.10)
          追高错误 ×3 → 警惕系数=1.0 → 每次追高信号 -0.10
        """
        # 信号类型 → 关联错误类型的映射
        signal_to_mistake = {
            "追高": "追高",
            "抄底": "恐慌割肉",
            "频繁交易": "过度交易",
        }
        
        mistake_type = signal_to_mistake.get(signal_type)
        if mistake_type is None or mistake_type not in self.records:
            return 0.0
        
        record = self.records[mistake_type]
        
        # 警惕系数衰减：60 天未犯则每周 -3%
        days_since = (time.time() - record.last_occurrence) / 86400
        if days_since > 60:
            weeks_decayed = (days_since - 60) / 7
            decay = 0.03 * weeks_decayed
            return max(0.0, record.vigilance - decay)
        
        return record.vigilance
```

### 7.5 周期认知 (Cycle Wisdom)

```python
@dataclass
class CycleWisdom:
    """周期认知：记录熊猫在不同市场周期中的经历"""
    
    # 每种市场状态的累计天数
    regime_days: Dict[str, float] = field(default_factory=lambda: {
        "bull": 0.0,
        "bear": 0.0,
        "ranging": 0.0,
    })
    
    # 每种市场状态下的交易表现
    regime_performance: Dict[str, dict] = field(default_factory=dict)
    
    def get_experience_days(self, regime: str) -> float:
        """获取在指定市场状态中的累计经验天数"""
        return self.regime_days.get(regime, 0.0)
    
    def compute_correction(self, regime: str) -> float:
        """周期认知修正 = 周期匹配加成
        
        亲历熊市 >30 天 → 熊市操作 +0.20
        亲历牛市 >30 天 → 牛市操作 +0.20
        """
        days = self.get_experience_days(regime)
        if days > 30:
            return 0.20
        elif days > 10:
            return 0.10
        else:
            return 0.0
    
    def update(self, regime: str, duration_hours: float):
        """更新周期经验"""
        self.regime_days[regime] = (
            self.regime_days.get(regime, 0.0) + duration_hours / 24
        )
```

### 7.6 关系记忆 (Relationship Memory)

```python
@dataclass
class RelationshipMemory:
    """关系记忆（MVP 预留，正式版实现）"""
    
    mentor_id: Optional[str] = None         # 导师 panda_id
    apprentice_ids: List[str] = field(default_factory=list)  # 学徒列表
    rival_ids: List[str] = field(default_factory=list)       # 对手列表
    
    # 师承学习
    # 导师的模式记忆 → 学徒的模式记忆预加载
    # 导师的资产专精 → 学徒的资产专精 ×0.3 加速
    
    def inherit_from_mentor(
        self, mentor_pattern_memory: PatternMemoryStore,
        mentor_asset_mastery: AssetMasteryStore
    ):
        """从导师继承经验（30% 模式记忆 + 50% 资产专精）"""
        # 子熊猫: 继承父熊猫 30% 的模式记忆 + 50% 的资产专精
        # 学徒: 继承导师 30% 的模式记忆摘要（不是全量数据）
        pass
```

### 7.7 经验与策略的冲突检测

```python
def _detect_strategy_experience_conflict(
    self, actor: PandaActor, s_prof: float, s_exp: float
) -> Optional[dict]:
    """检测策略与经验的冲突
    
    返回冲突描述（如有），用于触发 Agent 和熊猫自语
    
    核心张力：
      策略说: RSI < 30 → BUY (信号强度 0.85)
      经验说: 这个形态震荡市 21 次假突破 → 修正 -0.35
      
      融合: 幼年期 → 0.85×0.55 + (-0.35)×0.10 = 0.43 (观望)
            成熟期 → 0.85×0.30 + (-0.35)×0.50 = 0.08 (忽视策略！)
    """
    # 策略方向
    strategy_bullish = s_prof > 0.5
    # 经验方向（经验修正使信号往反方向移动）
    experience_correction = s_exp - s_prof
    experience_opposing = (experience_correction < -0.20 and strategy_bullish) or \
                          (experience_correction > 0.20 and not strategy_bullish)
    
    if not experience_opposing:
        return None
    
    conflict_strength = abs(experience_correction)
    
    return {
        "type": "strategy_experience_conflict",
        "strategy_signal": s_prof,
        "experience_correction": experience_correction,
        "conflict_strength": conflict_strength,
        "growth_stage": _get_growth_stage(actor.experience_level),
        "description": (
            f"策略信号 {s_prof:.2f} 与经验修正 {experience_correction:.2f} 冲突"
        ),
    }
```

### 7.8 经验权重随成长阶段变化

```
成长阶段与主导权重:

| 阶段   | 经验等级  | w_strategy | w_experience | 主导        |
|--------|----------|------------|-------------|-------------|
| 幼年期 | 0-25     | 0.55       | 0.10        | 性格+策略主导 |
| 成长期 | 25-65    | 0.50       | 0.20        | 策略开始生效  |
| 成熟期 | 65-100   | 0.30       | 0.50        | 经验主导（可能反叛）|

注意: w_strategy + w_experience 不等于 1.0
  幼年期剩余 0.35 由性格主导（Step 5 体现）
  成长期剩余 0.30 由性格+环境主导
  成熟期剩余 0.20 由性格+环境主导
```

---

## 八、环境感知系统

### 8.1 四级感知能力解锁

```python
@dataclass
class EnvironmentSensor:
    """环境感知器：根据经验等级解锁不同感知能力"""
    
    experience_level: int
    
    # 30天滚动窗口的相关性矩阵
    _correlation_cache: Dict[tuple, float] = field(default_factory=dict)
    _correlation_window: List[dict] = field(default_factory=list)  # 30天价格历史
    
    @property
    def perception_level(self) -> int:
        if self.experience_level < 25:
            return 1
        elif self.experience_level < 50:
            return 2
        elif self.experience_level < 80:
            return 3
        else:
            return 4
    
    def perceive(self, market: dict) -> dict:
        """根据感知等级返回可感知的环境信息"""
        result = {}
        
        # Lv.1 (exp 0-25): 价格方向 + 单资产波动率
        if self.perception_level >= 1:
            result["price_direction"] = (
                "up" if market.get("price", 0) > market.get("prev_price", 0) else "down"
            )
            result["volatility"] = market.get("volatility", 0.02)
        
        # Lv.2 (exp 25-50): 趋势强度 + 成交量异动
        if self.perception_level >= 2:
            result["trend_strength"] = market.get("trend_strength", 0.5)
            result["volume_anomaly"] = self._detect_volume_anomaly(market)
        
        # Lv.3 (exp 50-80): 市场状态分类 + 多资产相关性
        if self.perception_level >= 3:
            result["market_regime"] = market.get("market_regime", "unknown")
            result["correlations"] = self._get_correlation_matrix()
        
        # Lv.4 (exp 80-100): 宏观情绪 + 异常资金流 + 周期切换预感
        if self.perception_level >= 4:
            result["macro_sentiment"] = self._assess_macro_sentiment(market)
            result["unusual_flow"] = market.get("orderbook_imbalance", 0)
            result["cycle_switch_hint"] = self._detect_cycle_switch(market)
        
        return result
    
    def get_env_factor(self, market: dict) -> float:
        """计算环境适配系数
        
        不可感知的环境因素 → ×0.7
        """
        perception = self.perceive(market)
        factor = 1.0
        
        regime = market.get("market_regime", "unknown")
        
        # Lv.1: 无法感知市场状态 → 在不利市场中盲目操作
        if self.perception_level == 1:
            if regime in ("bear", "ranging"):
                factor *= 0.7
        
        # Lv.2: 能感知趋势强度，但不能感知市场状态
        elif self.perception_level == 2:
            trend = perception.get("trend_strength", 0.5)
            if trend < 0.3:
                factor *= 0.85
        
        # Lv.3-4: 可感知市场状态，无盲目惩罚
        # Lv.4: 完全感知，无打折
        
        return factor
    
    def _detect_volume_anomaly(self, market: dict) -> bool:
        """检测成交量异动（Lv.2+）"""
        volume = market.get("volume", 0)
        avg_volume = market.get("avg_volume", volume)
        return volume > avg_volume * 2.0
    
    def _assess_macro_sentiment(self, market: dict) -> str:
        """评估宏观情绪（Lv.4）"""
        funding_rate = market.get("funding_rate", 0)
        if funding_rate > 0.001:
            return "euphoric"
        elif funding_rate < -0.001:
            return "fearful"
        return "neutral"
    
    def _detect_cycle_switch(self, market: dict) -> Optional[str]:
        """检测周期切换预感（Lv.4）"""
        # 基于趋势强度变化率、成交量趋势等
        return None  # 具体实现依赖足够的历史数据
```

### 8.2 策略-市场匹配度评估

```python
def _calc_strategy_market_match(
    philosophy: str, market_regime: str
) -> float:
    """评估策略与当前市场状态的匹配度
    
    返回 0.7 (不适配) 或 1.0 (适配) 或 0.85 (中性)
    
    当前市场 = 震荡市, 策略 = 趋势跟踪 → 不适配 → 信号 ×0.7
    当前市场 = 牛市, 策略 = 趋势跟踪 → 适配 → 信号 ×1.0
    """
    match_table = {
        ("趋势跟踪", "bull"):    1.0,
        ("趋势跟踪", "bear"):    0.85,
        ("趋势跟踪", "ranging"): 0.7,
        ("逆向抄底", "bull"):    0.7,
        ("逆向抄底", "bear"):    1.0,
        ("逆向抄底", "ranging"): 0.85,
        ("网格交易", "bull"):    0.7,
        ("网格交易", "bear"):    0.7,
        ("网格交易", "ranging"): 1.0,
        ("定投",     "bull"):    0.85,
        ("定投",     "bear"):    1.0,
        ("定投",     "ranging"): 0.85,
    }
    return match_table.get((philosophy, market_regime), 0.85)
```

### 8.3 多资产相关性矩阵

```python
class CorrelationMatrix:
    """滚动 30 天 Pearson 相关系数矩阵"""
    
    SUPPORTED_ASSETS = ["BTC", "ETH", "SUI"]
    WINDOW_DAYS = 30
    
    def __init__(self):
        # 存储每个资产的日收益率序列
        self._daily_returns: Dict[str, List[float]] = {
            asset: [] for asset in self.SUPPORTED_ASSETS
        }
        self._matrix: Dict[tuple, float] = {}
    
    def update(self, asset: str, daily_return: float):
        """添加一天的收益率数据"""
        returns = self._daily_returns.get(asset, [])
        returns.append(daily_return)
        if len(returns) > self.WINDOW_DAYS:
            returns.pop(0)  # 滚动窗口
        self._daily_returns[asset] = returns
        self._recalculate()
    
    def _recalculate(self):
        """重新计算相关系数矩阵"""
        assets = self.SUPPORTED_ASSETS
        for i in range(len(assets)):
            for j in range(i + 1, len(assets)):
                a, b = assets[i], assets[j]
                returns_a = self._daily_returns.get(a, [])
                returns_b = self._daily_returns.get(b, [])
                
                if len(returns_a) >= 10 and len(returns_b) >= 10:
                    # 取共同长度
                    min_len = min(len(returns_a), len(returns_b))
                    corr = self._pearson(
                        returns_a[-min_len:], returns_b[-min_len:]
                    )
                    self._matrix[(a, b)] = corr
                    self._matrix[(b, a)] = corr
    
    def get_correlation(self, asset_a: str, asset_b: str) -> float:
        """获取两个资产的相关系数，默认 0"""
        return self._matrix.get((asset_a, asset_b), 0.0)
    
    def should_reduce_signal(
        self, target_asset: str, held_assets: List[str]
    ) -> float:
        """判断是否因高相关性而减弱信号
        
        环境感知 Lv.3+ 可感知相关性
        高相关(>0.7)资产不重复建仓 → 信号 ×0.5
        """
        for held in held_assets:
            if held != target_asset:
                corr = self.get_correlation(target_asset, held)
                if corr > 0.7:
                    return 0.5  # 信号减半
        return 1.0
    
    @staticmethod
    def _pearson(x: List[float], y: List[float]) -> float:
        """计算 Pearson 相关系数"""
        n = len(x)
        if n < 2:
            return 0.0
        
        mean_x = sum(x) / n
        mean_y = sum(y) / n
        
        cov = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
        std_x = (sum((xi - mean_x) ** 2 for xi in x)) ** 0.5
        std_y = (sum((yi - mean_y) ** 2 for yi in y)) ** 0.5
        
        if std_x == 0 or std_y == 0:
            return 0.0
        
        return cov / (std_x * std_y)
```

---

## 九、策略残影系统

### 9.1 完整机制设计

```python
@dataclass
class StrategyGhost:
    """策略残影：用户换策略后，旧策略的残留影响"""
    
    old_strategy: "Strategy"           # 旧策略
    old_proficiency: int               # 归档时的熟练度
    old_rule_engine: "RuleEngine"      # 旧策略的规则引擎（保留用于计算 old_signal）
    trades_since_switch: int = 0       # 换策后的交易笔数
    switch_timestamp: float = 0.0      # 换策时间
    
    @property
    def ghost_weight(self) -> float:
        """残影权重随交易笔数衰减
        
        0-50笔:   ghost_weight = 0.40
        50-150笔:  ghost_weight = 0.20
        150-300笔: ghost_weight = 0.08
        300笔+:    ghost_weight = 0
        """
        n = self.trades_since_switch
        if n < 50:
            return 0.40
        elif n < 150:
            return 0.20
        elif n < 300:
            return 0.08
        else:
            return 0.0
    
    @property
    def is_expired(self) -> bool:
        return self.ghost_weight == 0.0
```

### 9.2 衰减曲线

```
残影权重衰减图:

weight
0.40 ─── ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
0.20 ─── ─ ─ ─ ─ ─ ─ ─ ─ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
0.08 ─── ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
0.00 ─── ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ──
     0       50            150                  300           交易笔数
```

### 9.3 残影干扰计算

```python
def _apply_ghost_interference(
    self, actor: PandaActor, new_signal: float, market: dict
) -> float:
    """应用策略残影干扰
    
    公式: final_signal = new_signal × (1 - ghost_weight) + old_signal × ghost_weight
    """
    if not actor.strategy_ghosts:
        return new_signal
    
    # 清理已过期的残影
    actor.strategy_ghosts = [
        g for g in actor.strategy_ghosts if not g.is_expired
    ]
    
    total_ghost_weight = 0.0
    weighted_old_signal = 0.0
    
    for ghost in actor.strategy_ghosts:
        gw = ghost.ghost_weight
        
        # 频繁换策惩罚检查
        gw = self._apply_frequent_switch_penalty(actor, gw)
        
        total_ghost_weight += gw
        
        # 用旧策略的规则引擎计算旧信号
        old_signal = ghost.old_rule_engine.match_signals(market)
        weighted_old_signal += old_signal * gw
    
    # 多残影之和封顶 0.50
    total_ghost_weight = min(total_ghost_weight, 0.50)
    
    # 残影干扰公式
    final_signal = (
        new_signal * (1 - total_ghost_weight)
        + weighted_old_signal
    )
    
    return final_signal
```

### 9.4 多残影叠加规则

```python
def _on_strategy_switch(self, actor: PandaActor, new_strategy: "Strategy"):
    """用户更换策略时的处理"""
    
    # 1. 旧策略熟练度归档
    old_ghost = StrategyGhost(
        old_strategy=actor.strategy,
        old_proficiency=actor.strategy_proficiency,
        old_rule_engine=actor.rule_engine,
        trades_since_switch=0,
        switch_timestamp=time.time(),
    )
    actor.strategy_ghosts.append(old_ghost)
    
    # 2. 新策略初始化
    actor.strategy = new_strategy
    actor.strategy_proficiency = 0  # 重置
    actor.rule_engine = RuleEngine(new_strategy)
    
    # 3. 检查频繁换策
    self._check_frequent_switch(actor)
```

### 9.5 频繁换策惩罚

```python
def _check_frequent_switch(self, actor: PandaActor):
    """检查是否频繁换策（30天内换策>3次）"""
    thirty_days_ago = time.time() - 30 * 86400
    recent_switches = [
        g for g in actor.strategy_ghosts
        if g.switch_timestamp > thirty_days_ago
    ]
    actor._frequent_switch_count = len(recent_switches)

def _apply_frequent_switch_penalty(
    self, actor: PandaActor, ghost_weight: float
) -> float:
    """频繁换策惩罚
    
    30天内换策 >3 次:
    - 衰减速度减半（ghost_weight 持续更久）
    - 多残影之和封顶 0.50
    """
    if getattr(actor, '_frequent_switch_count', 0) > 3:
        # 衰减速度减半 = 等效于 ghost_weight 翻倍
        # 但仍受 0.50 封顶限制
        return min(ghost_weight * 2.0, 0.50)
    return ghost_weight
```

---

## 十、熊猫表达层

### 10.1 模板库分类（按触发场景）

```python
class MonologueCategory(str, Enum):
    """熊猫自语触发场景分类"""
    SIGNAL_STRONG_BUY = "signal_strong_buy"       # 强烈买入信号
    SIGNAL_STRONG_SELL = "signal_strong_sell"      # 强烈卖出信号
    SIGNAL_FUZZY = "signal_fuzzy"                  # 模糊信号/观望
    SIGNAL_IGNORE = "signal_ignore"               # 忽视信号
    STRATEGY_CONFLICT = "strategy_conflict"       # 策略与经验冲突
    EMOTION_EXCITED = "emotion_excited"           # 情绪兴奋
    EMOTION_GREEDY = "emotion_greedy"             # 情绪贪婪
    EMOTION_CAUTIOUS = "emotion_cautious"         # 情绪谨慎
    EMOTION_PANICKING = "emotion_panicking"       # 情绪恐慌
    EMOTION_NUMB = "emotion_numb"                 # 情绪麻木
    EMOTION_TRANSITION = "emotion_transition"     # 情绪跳转
    STREAK_WIN = "streak_win"                     # 连赢
    STREAK_LOSS = "streak_loss"                   # 连亏
    EXPERIENCE_LEVELUP = "experience_levelup"     # 经验等级提升
    PATTERN_RECOGNIZED = "pattern_recognized"     # 新形态识别
    ASSET_MASTERY = "asset_mastery"               # 资产专精里程碑
    STOPLOSS_TRIGGERED = "stoploss_triggered"     # 止损触发
    MARKET_REGIME_CHANGE = "market_regime_change" # 市场状态变化
    IDLE = "idle"                                 # 长时间无操作
    STRATEGY_MISMATCH = "strategy_mismatch"       # 策略-性格不匹配
```

### 10.2 模板示例（20+ 条）

```python
MONOLOGUE_TEMPLATES = {
    # ---- 信号相关 ----
    MonologueCategory.SIGNAL_STRONG_BUY: [
        "RSI 到 {rsi} 了，{asset} 超卖了！冲！",
        "信号很明确，{asset} 该进场了。",
        "这个位置不买还等什么？我先上了！",
        "{asset} 跌得差不多了吧...我觉得可以搞。",
    ],
    MonologueCategory.SIGNAL_STRONG_SELL: [
        "该走了，{asset} 的信号在说再见。",
        "落袋为安，先卖一波。",
        "MACD 都死叉了，我先撤。",
    ],
    MonologueCategory.SIGNAL_FUZZY: [
        "嗯...不太确定，再看看。",
        "信号不够强，我等等。",
        "{asset} 方向不明，我先观望。",
        "有点想买，但又怕追高...算了先不动。",
    ],
    MonologueCategory.SIGNAL_IGNORE: [
        "这信号我不信，跳过。",
        "跟我没关系，继续吃竹子。",
        "这种行情不适合出手。",
    ],
    
    # ---- 策略/经验冲突 ----
    MonologueCategory.STRATEGY_CONFLICT: [
        "策略说要买...但这个形态我见过 {count} 次了，{win_rate_desc}。我不太信。",
        "教我的策略说买入，但我的经验告诉我要小心。",
        "规则是规则，但我见过太多假突破了。",
    ],
    
    # ---- 情绪相关 ----
    MonologueCategory.EMOTION_EXCITED: [
        "最近手感不错！再来一笔！",
        "连赢 {wins} 次了，运气真好~",
        "哈哈，又赚了！感觉自己是天才！",
    ],
    MonologueCategory.EMOTION_GREEDY: [
        "加仓！加仓！这波大的！",
        "我要把仓位加到最满！",
        "这行情不加仓说不过去！",
    ],
    MonologueCategory.EMOTION_CAUTIOUS: [
        "上次亏了不少...这次小心点。",
        "先观望吧，不急。",
        "感觉不太对，减仓观望。",
    ],
    MonologueCategory.EMOTION_PANICKING: [
        "不要...又会跌的...",
        "我不想交易了...好怕...",
        "全部卖掉吧...我受不了了...",
    ],
    MonologueCategory.EMOTION_NUMB: [
        "...无所谓了。",
        "随便吧。",
        "躺平了，爱咋咋地。",
    ],
    MonologueCategory.EMOTION_TRANSITION: [
        "我感觉自己的心态变了...从{from_emotion}到{to_emotion}了。",
    ],
    
    # ---- 连胜/连亏 ----
    MonologueCategory.STREAK_WIN: [
        "连赢 {count} 次了！不过不能飘...",
        "哇，第 {count} 次盈利了！",
    ],
    MonologueCategory.STREAK_LOSS: [
        "又亏了...连续第 {count} 次。需要冷静一下。",
        "怎么又亏了...我是不是哪里做错了？",
    ],
    
    # ---- 经验里程碑 ----
    MonologueCategory.EXPERIENCE_LEVELUP: [
        "我感觉自己变强了！经验等级 {level}！",
        "升级了！现在能看到更多东西了。",
    ],
    MonologueCategory.PATTERN_RECOGNIZED: [
        "这个形态...我见过！上次是这样的结果：{result_desc}",
        "等等，这个走势我记得！{occurrence_count} 次了。",
    ],
    MonologueCategory.ASSET_MASTERY: [
        "{asset} 我越来越熟了，专精度 {mastery}！",
        "我对 {asset} 的理解又深了一层。",
    ],
    
    # ---- 其他 ----
    MonologueCategory.STOPLOSS_TRIGGERED: [
        "止损了...亏 {loss_pct:.1f}%。不过这是纪律。",
        "唉，止损线到了。保住本金最重要。",
    ],
    MonologueCategory.STRATEGY_MISMATCH: [
        "这个策略不太适合我的性格...做起来别扭。",
        "我觉得换个策略会更好，这个太{mismatch_reason}了。",
    ],
    MonologueCategory.IDLE: [
        "好安静啊...市场什么时候来信号？",
        "在等一个好机会...不急。",
    ],
}
```

### 10.3 模板匹配引擎

```python
class ExpressionEngine:
    """熊猫表达层：模板匹配 + LLM 生成"""
    
    def generate_template(
        self, actor: PandaActor, market: dict, s_final: float
    ) -> str:
        """使用模板生成熊猫自语（同步，<1ms）"""
        
        # 确定触发场景
        category = self._determine_category(actor, market, s_final)
        
        # 从模板库选取
        templates = MONOLOGUE_TEMPLATES.get(category, [])
        if not templates:
            return ""
        
        template = random.choice(templates)
        
        # 变量填充
        variables = self._build_variables(actor, market, s_final)
        
        try:
            return template.format(**variables)
        except KeyError:
            return template  # 变量缺失时返回原模板
    
    def _determine_category(
        self, actor: PandaActor, market: dict, s_final: float
    ) -> MonologueCategory:
        """判断当前应该触发哪类自语"""
        
        # 优先级排序（高 → 低）
        
        # 1. 情绪跳转（刚发生）
        if actor.emotion_state.transition_history:
            last_transition = actor.emotion_state.transition_history[-1]
            if time.time() - last_transition[2] < 5:  # 5秒内
                return MonologueCategory.EMOTION_TRANSITION
        
        # 2. 策略/经验冲突
        # （由外部在 conflict 检测后直接指定）
        
        # 3. 信号强度分类
        if s_final > 0.65:
            return MonologueCategory.SIGNAL_STRONG_BUY
        elif s_final < 0.40:
            return MonologueCategory.SIGNAL_IGNORE
        else:
            return MonologueCategory.SIGNAL_FUZZY
    
    def _build_variables(
        self, actor: PandaActor, market: dict, s_final: float
    ) -> dict:
        """构建模板变量"""
        return {
            "asset": market.get("asset", "BTC"),
            "rsi": market.get("rsi", 50),
            "price": market.get("price", 0),
            "wins": actor.emotion_state.consecutive_wins,
            "losses": actor.emotion_state.consecutive_losses,
            "count": max(
                actor.emotion_state.consecutive_wins,
                actor.emotion_state.consecutive_losses
            ),
            "level": actor.experience_level,
            "mastery": actor.asset_mastery.get(market.get("asset", "BTC"), 50),
            "from_emotion": (
                actor.emotion_state.transition_history[-1][0]
                if actor.emotion_state.transition_history else ""
            ),
            "to_emotion": actor.emotion_state.current,
            "loss_pct": abs(actor.emotion_state.last_pnl),
            "win_rate_desc": "不太可靠",
            "occurrence_count": 0,
            "result_desc": "",
            "mismatch_reason": "",
        }
```

### 10.4 LLM 生成触发条件

```python
# 以下场景触发 LLM 生成个性化自语（不使用模板）:
LLM_MONOLOGUE_TRIGGERS = [
    "策略-经验冲突（经验修正 > 0.30 且方向相反）",
    "情绪状态跳转（跨级跳转，如 focused → panicking）",
    "连赢 5 次以上或连亏 3 次以上",
    "经验等级提升（每 10 级一次）",
    "新形态首次识别且后续验证（形态出现 >10 次）",
    "策略-性格严重不匹配（匹配度 <40）",
    "里程碑事件（第 100/500/1000 笔交易）",
]
```

### 10.5 LLM 自语 Prompt 模板

```python
MONOLOGUE_GENERATION_PROMPT = """你是一只交易熊猫的内心独白生成器。

熊猫性格:
- 胆识: {boldness} ({"冲动" if boldness > 70 else "谨慎" if boldness < 30 else "中性"})
- 耐性: {patience} ({"慢性子" if patience > 70 else "急性子" if patience < 30 else "中性"})
- 逆向性: {contrarian} ({"叛逆" if contrarian > 70 else "从众" if contrarian < 30 else "中性"})

当前情绪: {emotion}
触发场景: {trigger}
上下文: {context}

要求:
1. 第一人称，熊猫视角
2. 30-80字
3. 语气体现性格（高胆识=自信/冲动，低胆识=犹豫/谨慎，高逆向=叛逆/独立思考）
4. 不暴露精确数值
5. 自然、有性格、不像机器人

只输出一段熊猫自语文本，无其他内容。"""
```

---

## 十一、快进模式

### 11.1 规则引擎独立运行模式

```python
class FastForwardEngine:
    """快进模式：只跑规则引擎，不调 LLM"""
    
    def __init__(self, actor: PandaActor, speed: str = "10x"):
        """
        speed: "10x" | "100x" | "instant"
        """
        self.actor = actor
        self.speed = speed
        self.key_moments: List[dict] = []  # 关键时刻记录
    
    async def run(self, market_data_series: List[dict]) -> dict:
        """快进执行整个市场数据序列
        
        特点:
        - 只跑 8 步确定性管线
        - 不调 LLM Agent
        - 不生成熊猫自语
        - 记录关键时刻供事后日记生成
        """
        results = []
        
        for i, market in enumerate(market_data_series):
            # 8 步管线（同步，<50ms/笔）
            s_raw = self._step1_raw_signal(self.actor, market)
            s_prof = self._step2_proficiency_noise(self.actor, s_raw)
            s_exp = self._step3_experience_correction(self.actor, market, s_prof)
            s_fuse = self._step4_fusion(self.actor, s_prof, s_exp)
            s_pers, delay, pos_factor = self._step5_personality_filter(self.actor, s_fuse)
            s_env = self._step6_environment_adapt(self.actor, s_pers, market)
            s_social = self._step7_social_bias(self.actor, s_env, market)
            s_final, emo_pos, emo_sl = self._step8_emotion_distort(self.actor, s_social)
            
            # 执行
            action = self._determine_action(s_final)
            trade_result = self._simulate_trade(self.actor, market, action, pos_factor, emo_pos, emo_sl)
            
            # 更新 Actor 状态
            self._update_actor_state(self.actor, trade_result, market)
            
            # 标记关键时刻
            if self._is_key_moment(self.actor, market, s_final, trade_result, i):
                self.key_moments.append({
                    "index": i,
                    "market": market,
                    "s_final": s_final,
                    "action": action,
                    "trade_result": trade_result,
                    "emotion": self.actor.emotion_state.current,
                    "reason": self._get_key_moment_reason(
                        self.actor, market, s_final, trade_result
                    ),
                })
            
            results.append({
                "action": action,
                "s_final": s_final,
                "equity": trade_result.get("equity", 0),
            })
        
        return {
            "total_trades": len([r for r in results if r["action"] != "HOLD"]),
            "final_equity": results[-1]["equity"] if results else 0,
            "key_moments": self.key_moments,
        }
```

### 11.2 关键时刻标记算法

```python
def _is_key_moment(
    self, actor: PandaActor, market: dict,
    s_final: float, trade_result: dict, index: int
) -> bool:
    """判断某个决策是否值得记录为"关键时刻"
    
    筛选标准（满足任一）:
    1. 策略与经验严重冲突（修正 > 0.30）
    2. 情绪状态跳转
    3. 连赢/连亏里程碑（3/5/10）
    4. 单笔盈亏超过 5%
    5. 止损触发
    6. 经验等级提升
    7. 首次识别新形态
    8. 策略残影导致反向操作
    """
    # 1. 策略-经验冲突
    if hasattr(actor, '_last_conflict') and actor._last_conflict is not None:
        if actor._last_conflict.get("conflict_strength", 0) > 0.30:
            return True
    
    # 2. 情绪跳转
    if (actor.emotion_state.transition_history and
            time.time() - actor.emotion_state.transition_history[-1][2] < 1):
        return True
    
    # 3. 连赢/连亏里程碑
    if actor.emotion_state.consecutive_wins in (3, 5, 10):
        return True
    if actor.emotion_state.consecutive_losses in (3, 5, 10):
        return True
    
    # 4. 大盈亏
    pnl = trade_result.get("pnl_pct", 0)
    if abs(pnl) > 5.0:
        return True
    
    # 5. 止损触发
    if trade_result.get("exit_reason") == "stop_loss":
        return True
    
    return False

def _get_key_moment_reason(
    self, actor: PandaActor, market: dict,
    s_final: float, trade_result: dict
) -> str:
    """获取关键时刻的原因描述，供日记生成使用"""
    reasons = []
    
    if hasattr(actor, '_last_conflict') and actor._last_conflict:
        reasons.append(f"策略经验冲突: {actor._last_conflict['description']}")
    
    if (actor.emotion_state.transition_history and
            time.time() - actor.emotion_state.transition_history[-1][2] < 1):
        t = actor.emotion_state.transition_history[-1]
        reasons.append(f"情绪跳转: {t[0]} → {t[1]}")
    
    pnl = trade_result.get("pnl_pct", 0)
    if abs(pnl) > 5.0:
        reasons.append(f"大幅{'盈利' if pnl > 0 else '亏损'}: {pnl:.1f}%")
    
    if trade_result.get("exit_reason") == "stop_loss":
        reasons.append("止损触发")
    
    return "; ".join(reasons) if reasons else "常规关键点"
```

### 11.3 事后日记批量生成

```python
class DiaryGenerator:
    """事后批量生成熊猫日记"""
    
    def __init__(self, llm_client):
        self.client = llm_client
    
    async def generate_diary(
        self, actor: PandaActor, key_moments: List[dict]
    ) -> str:
        """模拟结束后，批量调 LLM 生成「熊猫日记」
        
        输入: 关键时刻列表
        输出: 一篇完整日记（第一人称）
        """
        if not key_moments:
            return "今天没什么特别的，安安静静吃竹子。"
        
        # 构造日记生成 prompt
        moments_desc = "\n".join([
            f"- 时刻{m['index']}: {m['reason']} (信号={m['s_final']:.2f}, "
            f"行动={m['action']}, 情绪={m['emotion']})"
            for m in key_moments[:20]  # 最多 20 个关键时刻
        ])
        
        prompt = f"""你是一只交易熊猫，请根据以下关键时刻写一篇交易日记。

熊猫性格:
- 胆识: {actor.personality.boldness}
- 耐性: {actor.personality.patience}
- 直觉: {actor.personality.intuition}
- 逆向性: {actor.personality.contrarian}

今天的关键时刻:
{moments_desc}

要求:
1. 第一人称，熊猫视角
2. 200-500字
3. 语气体现性格
4. 描述思考过程和情绪变化
5. 提炼经验教训
6. 不暴露精确数值，用感性描述

只输出日记正文。"""
        
        response = await self.client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=800,
        )
        
        return response.choices[0].message.content
```

---

## 十二、DeepBook 集成

### 12.1 数据源接入

```python
class DeepBookDataSource:
    """从 DeepBook 拉取市场数据
    
    DeepBook 是 Sui 原生的 CLOB（中央限价订单簿）
    提供: 订单簿深度、历史成交、K线数据
    """
    
    DEEPBOOK_RPC = "https://deepbook-indexer.testnet.sui.io"
    
    # 支持的交易对
    SUPPORTED_POOLS = {
        "BTC_USDC": "0x...",  # DeepBook pool object ID
        "ETH_USDC": "0x...",
        "SUI_USDC": "0x...",
    }
    
    async def fetch_orderbook(self, pool_id: str) -> dict:
        """拉取订单簿快照
        
        返回: {bids: [...], asks: [...], mid_price, spread}
        """
        # GET /orderbook/{pool_id}
        url = f"{self.DEEPBOOK_RPC}/orderbook/{pool_id}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                data = await resp.json()
        
        return {
            "bids": data.get("bids", []),
            "asks": data.get("asks", []),
            "mid_price": self._calc_mid_price(data),
            "spread": self._calc_spread(data),
        }
    
    async def fetch_klines(
        self, pool_id: str, interval: str = "1m", limit: int = 100
    ) -> List[dict]:
        """拉取历史 K 线数据
        
        返回: [{timestamp, open, high, low, close, volume}, ...]
        """
        # GET /klines/{pool_id}?interval={interval}&limit={limit}
        url = f"{self.DEEPBOOK_RPC}/klines/{pool_id}"
        params = {"interval": interval, "limit": limit}
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as resp:
                data = await resp.json()
        
        return data.get("klines", [])
    
    async def fetch_recent_trades(
        self, pool_id: str, limit: int = 50
    ) -> List[dict]:
        """拉取最近成交记录"""
        url = f"{self.DEEPBOOK_RPC}/trades/{pool_id}"
        params = {"limit": limit}
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as resp:
                return await resp.json()
```

### 12.2 数据格式转换

```python
class DeepBookMarketAdapter:
    """将 DeepBook 原始数据转换为 MarketEvent 格式"""
    
    def __init__(self):
        self._indicator_calculator = TechnicalIndicators()
    
    def klines_to_market_event(
        self, klines: List[dict], asset: str
    ) -> MarketEvent:
        """K 线序列 → MarketEvent"""
        if len(klines) < 2:
            raise ValueError("需要至少 2 根 K 线")
        
        current = klines[-1]
        previous = klines[-2]
        
        # 计算技术指标
        closes = [k["close"] for k in klines]
        volumes = [k["volume"] for k in klines]
        
        rsi = self._indicator_calculator.rsi(closes, period=14)
        ma20 = self._indicator_calculator.sma(closes, period=20)
        prev_ma20 = self._indicator_calculator.sma(closes[:-1], period=20)
        macd_signal = self._indicator_calculator.macd_cross(closes)
        volatility = self._indicator_calculator.volatility(closes, period=20)
        trend_strength = self._indicator_calculator.trend_strength(closes)
        
        return MarketEvent(
            asset=asset,
            timestamp=current["timestamp"],
            price=current["close"],
            prev_price=previous["close"],
            volume=current["volume"],
            rsi=rsi,
            ma20=ma20,
            prev_ma20=prev_ma20,
            macd_signal=macd_signal,
            volatility=volatility,
            trend_strength=trend_strength,
            market_regime=self._classify_regime(closes, volatility),
            funding_rate=0.0,  # DeepBook 无 funding rate
            orderbook_imbalance=0.0,
        )
    
    def _classify_regime(
        self, closes: List[float], volatility: float
    ) -> str:
        """简单市场状态分类
        
        bull: 20日均线向上 + 价格在均线上方
        bear: 20日均线向下 + 价格在均线下方
        ranging: 波动率低 + 无明显方向
        """
        if len(closes) < 20:
            return "unknown"
        
        ma20_now = sum(closes[-20:]) / 20
        ma20_prev = sum(closes[-21:-1]) / 20
        price_now = closes[-1]
        
        ma_direction = ma20_now - ma20_prev
        
        if price_now > ma20_now and ma_direction > 0:
            return "bull"
        elif price_now < ma20_now and ma_direction < 0:
            return "bear"
        else:
            return "ranging"
```

### 12.3 模拟执行

```python
class DeepBookSimulator:
    """通过 DeepBook testnet 模拟交易执行
    
    模拟盘模式:
    - 使用真实订单簿数据计算滑点
    - 不实际下单
    - 记录虚拟持仓和盈亏
    """
    
    def __init__(self, initial_capital: float = 10000.0):
        self.capital = initial_capital
        self.positions: Dict[str, "Position"] = {}
        self.trade_history: List[dict] = []
        self.equity_curve: List[float] = []
    
    async def simulate_order(
        self, asset: str, side: str, size_pct: float,
        orderbook: dict, stop_loss: float
    ) -> dict:
        """模拟订单执行
        
        使用订单簿数据计算:
        1. 实际成交价（含滑点）
        2. 手续费 (0.1%)
        3. 滑点估算
        """
        trade_value = self.capital * size_pct
        mid_price = orderbook["mid_price"]
        
        # 滑点计算：遍历订单簿估算实际成交均价
        if side == "BUY":
            fill_price = self._calc_fill_price(
                orderbook["asks"], trade_value
            )
        else:
            fill_price = self._calc_fill_price(
                orderbook["bids"], trade_value
            )
        
        slippage = abs(fill_price - mid_price) / mid_price
        fee = trade_value * 0.001  # 0.1% 手续费
        
        # 执行
        quantity = (trade_value - fee) / fill_price
        
        if side == "BUY":
            self.positions[asset] = Position(
                asset=asset,
                quantity=quantity,
                entry_price=fill_price,
                stop_loss_price=fill_price * (1 - stop_loss),
            )
            self.capital -= trade_value
        elif side == "SELL" and asset in self.positions:
            pos = self.positions.pop(asset)
            proceeds = pos.quantity * fill_price - fee
            self.capital += proceeds
            pnl_pct = (fill_price - pos.entry_price) / pos.entry_price * 100
        
        result = {
            "side": side,
            "asset": asset,
            "fill_price": fill_price,
            "slippage": slippage,
            "fee": fee,
            "quantity": quantity,
            "pnl_pct": pnl_pct if side == "SELL" else 0,
        }
        
        self.trade_history.append(result)
        self.equity_curve.append(self._total_equity(mid_price))
        
        return result
    
    def _calc_fill_price(
        self, book_side: List[dict], trade_value: float
    ) -> float:
        """遍历订单簿计算加权平均成交价"""
        remaining = trade_value
        total_qty = 0.0
        total_cost = 0.0
        
        for level in book_side:
            price = level["price"]
            qty_available = level["quantity"]
            cost_at_level = price * qty_available
            
            if cost_at_level >= remaining:
                filled_qty = remaining / price
                total_qty += filled_qty
                total_cost += remaining
                break
            else:
                total_qty += qty_available
                total_cost += cost_at_level
                remaining -= cost_at_level
        
        return total_cost / total_qty if total_qty > 0 else book_side[0]["price"]
    
    def _total_equity(self, current_price: float) -> float:
        pos_value = sum(
            p.quantity * current_price for p in self.positions.values()
        )
        return self.capital + pos_value


@dataclass
class Position:
    asset: str
    quantity: float
    entry_price: float
    stop_loss_price: float
    entry_time: float = field(default_factory=time.time)
```

---

## 十三、Merkle Root 信任证明

### 13.1 决策日志格式

```python
@dataclass
class DecisionLogEntry:
    """单条决策日志（用于 Merkle Tree）"""
    
    timestamp: float           # Unix 时间戳
    panda_id: str              # 熊猫 NFT ID
    asset: str                 # 交易资产
    action: str                # "BUY" / "SELL" / "HOLD" / "IGNORE"
    s_final: float             # 最终执行分
    s_raw: float               # 原始信号
    emotion: str               # 情绪状态
    position_size: float       # 仓位大小
    entry_price: float         # 入场价（如适用）
    stop_loss: float           # 止损价（如适用）
    
    def to_hash_input(self) -> str:
        """序列化为哈希输入字符串"""
        return (
            f"{self.timestamp:.6f}|{self.panda_id}|{self.asset}|"
            f"{self.action}|{self.s_final:.6f}|{self.s_raw:.6f}|"
            f"{self.emotion}|{self.position_size:.6f}|"
            f"{self.entry_price:.2f}|{self.stop_loss:.4f}"
        )
    
    def hash(self) -> bytes:
        """计算叶节点哈希"""
        return hashlib.sha256(self.to_hash_input().encode()).digest()
```

### 13.2 每 50 笔交易计算 Merkle Root 的流程

```python
class MerkleTreeBuilder:
    """Merkle Tree 构建器"""
    
    def __init__(self, batch_size: int = 50):
        self.batch_size = batch_size
        self.pending_logs: List[DecisionLogEntry] = []
        self.roots: List[dict] = []  # 历史 root 记录
    
    def add_log(self, log: DecisionLogEntry):
        """添加决策日志"""
        self.pending_logs.append(log)
        
        if len(self.pending_logs) >= self.batch_size:
            root = self._compute_root(self.pending_logs[:self.batch_size])
            self.roots.append({
                "root": root,
                "batch_index": len(self.roots),
                "log_count": self.batch_size,
                "first_timestamp": self.pending_logs[0].timestamp,
                "last_timestamp": self.pending_logs[self.batch_size - 1].timestamp,
            })
            self.pending_logs = self.pending_logs[self.batch_size:]
            
            # 触发异步上链
            return root
        
        return None
    
    def _compute_root(self, logs: List[DecisionLogEntry]) -> str:
        """计算 Merkle Root
        
        算法:
        1. 每条日志 → SHA-256 叶节点
        2. 两两配对 → SHA-256(left + right)
        3. 奇数节点 → 复制最后一个
        4. 递归直到只剩一个节点
        """
        hashes = [log.hash() for log in logs]
        
        while len(hashes) > 1:
            # 奇数个节点 → 复制最后一个
            if len(hashes) % 2 == 1:
                hashes.append(hashes[-1])
            
            next_level = []
            for i in range(0, len(hashes), 2):
                combined = hashes[i] + hashes[i + 1]
                next_level.append(hashlib.sha256(combined).digest())
            
            hashes = next_level
        
        return hashes[0].hex() if hashes else ""
    
    def generate_proof(
        self, log_index: int, batch_logs: List[DecisionLogEntry]
    ) -> List[dict]:
        """生成特定日志的 Merkle Proof（用于链上验证）"""
        hashes = [log.hash() for log in batch_logs]
        proof = []
        idx = log_index
        
        while len(hashes) > 1:
            if len(hashes) % 2 == 1:
                hashes.append(hashes[-1])
            
            if idx % 2 == 0:
                sibling_idx = idx + 1
                direction = "right"
            else:
                sibling_idx = idx - 1
                direction = "left"
            
            proof.append({
                "hash": hashes[sibling_idx].hex(),
                "direction": direction,
            })
            
            next_level = []
            for i in range(0, len(hashes), 2):
                combined = hashes[i] + hashes[i + 1]
                next_level.append(hashlib.sha256(combined).digest())
            
            hashes = next_level
            idx = idx // 2
        
        return proof
```

### 13.3 Root 提交链上的异步 Worker

```python
class MerkleRootSubmitter:
    """异步 Worker：将 Merkle Root 提交到 Sui 链上"""
    
    def __init__(self, sui_client, panda_id: str):
        self.sui_client = sui_client
        self.panda_id = panda_id
        self._queue: asyncio.Queue = asyncio.Queue()
        self._task: Optional[asyncio.Task] = None
    
    def start(self):
        """启动异步提交 worker"""
        self._task = asyncio.create_task(self._worker_loop())
    
    async def submit(self, root_data: dict):
        """将 root 数据放入提交队列"""
        await self._queue.put(root_data)
    
    async def _worker_loop(self):
        """Worker 主循环：消费队列，提交链上"""
        while True:
            try:
                root_data = await self._queue.get()
                await self._submit_to_chain(root_data)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.error(f"Merkle root submission failed: {e}")
                # 重试逻辑：放回队列
                await asyncio.sleep(5)
                await self._queue.put(root_data)
    
    async def _submit_to_chain(self, root_data: dict):
        """调用 Sui Move 合约提交 Merkle Root
        
        Move 合约函数签名:
        public fun submit_merkle_root(
            panda: &mut Panda,
            root: vector<u8>,      // 32 bytes Merkle Root
            batch_index: u64,
            log_count: u64,
            timestamp: u64,
            ctx: &mut TxContext
        )
        
        链上存储:
        dynamic_field: {
            key: batch_index,
            value: MerkleRootRecord {
                root: vector<u8>,
                log_count: u64,
                timestamp: u64,
            }
        }
        """
        root_bytes = bytes.fromhex(root_data["root"])
        
        tx = self.sui_client.build_transaction(
            target=f"{PACKAGE_ID}::panda::submit_merkle_root",
            arguments=[
                self.panda_id,                    # &mut Panda
                list(root_bytes),                 # root: vector<u8>
                root_data["batch_index"],         # batch_index: u64
                root_data["log_count"],           # log_count: u64
                int(root_data["last_timestamp"]), # timestamp: u64
            ],
        )
        
        result = await self.sui_client.execute_transaction(tx)
        
        logging.info(
            f"Merkle root submitted: batch={root_data['batch_index']}, "
            f"root={root_data['root'][:16]}..., "
            f"tx={result['digest']}"
        )
        
        return result
```

---

## 附录 A：数据模型汇总

```python
# ---- 核心数据结构 ----

@dataclass(frozen=True)
class Personality:
    """先天性格（不可变，链上 NFT）"""
    boldness: int        # 胆识 0-100
    patience: int        # 耐性 0-100
    intuition: int       # 直觉 0-100
    focus: int           # 专注 0-100
    contrarian: int      # 逆向性 0-100
    emotion_stability: int  # 情绪稳定性 0-100（隐含在性格中）
    talent: int = 0      # 天赋 0-6

@dataclass
class Strategy:
    """四层策略结构"""
    philosophy: str                    # 交易哲学
    position_sizing: dict              # 仓位管理
    signal_rules: List[dict]           # 信号规则
    risk_mgmt: dict                    # 风控规则
    raw_text: str = ""                 # 用户原始输入
    parsed_hash: str = ""              # 解析结果哈希（链上存储）
    risk_warning: Optional[str] = None # 危险策略警告

@dataclass
class StrategyGhost:
    """策略残影"""
    old_strategy: Strategy
    old_proficiency: int
    old_rule_engine: "RuleEngine"
    trades_since_switch: int = 0
    switch_timestamp: float = 0.0

@dataclass
class Position:
    """持仓"""
    asset: str
    quantity: float
    entry_price: float
    stop_loss_price: float
    entry_time: float = 0.0
    bars_held: int = 0  # 持仓 K 线数
```

## 附录 B：Onboarding 问卷与决策引擎的关系

### 严格隔离原则

用户初次登录时填写的 onboarding 问卷（交易经验、风格偏好、风险容忍度、技术指标熟悉度、熊猫自主度）**不进入 8 步决策管线的任何公式**。

### 问卷影响范围

| 影响 | 说明 |
|------|------|
| **策略推荐** | 根据 `style[]` + `experience_level` 在铸造页推荐匹配的策略模板 |
| **UI 深度** | beginner → 简化 K 线/隐藏高级指标；advanced → 完整订单簿/深度图 |
| **引导提示密度** | beginner 显示更多操作引导气泡；expert 几乎不显示 |
| **熊猫自语措辞** | `panda_autonomy` 影响表达层模板选择：低自主→更多"等待主人指示"类措辞，高自主→更多"我觉得应该..."类措辞 |

### 不影响的内容

- 性格五轴生成（铸造时 `sui::random` 决定）
- 策略解析结果（纯粹由用户输入的策略文本决定）
- 经验引擎所有子系统的计算公式
- 情绪状态机跳转规则
- 环境感知等级解锁条件
- 策略残影衰减速率

### 数据存储

```python
# 存储在 users 表
# users.onboarding_survey: JSONB
# users.experience_level: TEXT ('beginner'|'intermediate'|'advanced'|'expert')

# 问卷数据通过 PandaActor 初始化时注入为只读上下文
class PandaActor:
    def __init__(self, ..., user_profile: dict):
        self.user_experience_level = user_profile.get('experience_level', 'beginner')
        # 仅用于表达层模板选择和 UI 推荐，不参与决策计算
```

---

## 附录 C：配置常量

```python
# ---- 系统配置 ----
DECISION_PIPELINE_TIMEOUT_MS = 50       # 8步管线超时
AGENT_CALL_TIMEOUT_SEC = 3.0            # LLM Agent 超时
MERKLE_BATCH_SIZE = 50                  # 每批日志数
EXPERIENCE_SYNC_INTERVAL = 50           # 每 N 笔交易同步 Walrus

# ---- 信号阈值 ----
SIGNAL_EXECUTE_THRESHOLD = 0.65         # 执行阈值
SIGNAL_IGNORE_THRESHOLD = 0.40          # 忽视阈值
SIGNAL_FUZZY_LOW = 0.40                 # 模糊区间下界
SIGNAL_FUZZY_HIGH = 0.65               # 模糊区间上界

# ---- 风控硬限制 ----
MIN_STOP_LOSS = 0.03                    # 最低止损 3%
MAX_POSITION_PCT = 0.30                 # 单笔最大仓位 30%
MAX_DAILY_TRADES = 50                   # 单日最大交易笔数

# ---- 经验系统 ----
GROWTH_STAGE_JUVENILE = 25              # 幼年期上限
GROWTH_STAGE_GROWING = 65              # 成长期上限
PATTERN_MIN_OCCURRENCES = 5            # 模式记忆最少出现次数
MISTAKE_DECAY_DAYS = 60                # 错误警惕衰减起始天数
MISTAKE_DECAY_RATE_PER_WEEK = 0.03     # 每周衰减 3%

# ---- 策略残影 ----
GHOST_WEIGHT_TIERS = [
    (50,  0.40),   # 0-50笔
    (150, 0.20),   # 50-150笔
    (300, 0.08),   # 150-300笔
]
GHOST_MAX_TOTAL_WEIGHT = 0.50          # 多残影权重上限
FREQUENT_SWITCH_THRESHOLD = 3          # 30天内换策阈值
FREQUENT_SWITCH_WINDOW_DAYS = 30       # 频繁换策检测窗口

# ---- LLM ----
LLM_MODEL = "deepseek-chat"            # DeepSeek V3
LLM_TEMPERATURE_STRATEGY = 0.1         # 策略解析温度（低=精确）
LLM_TEMPERATURE_AGENT = 0.3            # Agent 温度
LLM_TEMPERATURE_DIARY = 0.7            # 日记生成温度（高=创意）
LLM_MAX_TOKENS_STRATEGY = 500
LLM_MAX_TOKENS_AGENT = 500
LLM_MAX_TOKENS_DIARY = 800

# ---- 市场数据 ----
SUPPORTED_ASSETS = ["BTC", "ETH", "SUI"]
CORRELATION_WINDOW_DAYS = 30
HIGH_CORRELATION_THRESHOLD = 0.7       # 高相关阈值
CORRELATION_SIGNAL_PENALTY = 0.5       # 高相关信号惩罚
```
