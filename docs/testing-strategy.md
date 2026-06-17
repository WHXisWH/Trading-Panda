# TradingPanda 测试与验证策略

> 版本 1.0 · 2026-05-08
> 覆盖：合约、决策引擎、API、前端四层测试 + 决策引擎可视化工具设计

> **PRD v3.1 对齐说明（2026-06-17）**：早期“模拟盘”测试仍可作为兼容回归，但新增验收应以 `docs/PRD.md` v3.1、`docs/architecture.md`、`spec.md` 为准：Training Ledger 是 PnL 真相；Mode 2 只测试 selected/manual Chain Proof Moment 的 testnet PandaCoin PTB；`PandaVault` 是 shared object；`TradingPolicy` 是 standalone shared object；`async_jobs` 是 durable queue。

### v3.1 新增核心测试

| 层 | 必测内容 |
|---|---|
| Move | `TradingPolicy` owner-only update/pause/revoke；`PandaVault` shared object；`demo_executor` 对 signer/policy/vault/panda/version/pair/notional/loss 的 abort 覆盖 |
| Backend hot path | `PandaActor → PolicyGate → LedgerService → TradeFactWriter` 原子落库；policy reject 不静默丢失 |
| Async queue | `async_jobs` worker 重启可恢复；idempotency key 防重复 chain proof |
| Mode 2 | 自动 proof 只选中高置信 BUY/SELL；manual proof 仍受 policy/cooldown/cap/duplicate 约束 |
| Failure isolation | Sui RPC/PTB 失败不会回滚 Training Ledger PnL |
| Skill Memory | 只有 reviewed Trade Fact 能更新 supported/verified memory |

---

## 一、测试分层总览

```
┌──────────────────────────────────────────────────────────────┐
│  E2E 测试（Playwright）                                       │
│  铸造→喂策略→模拟→交易→成长→市场→排行榜 全流程                      │
├──────────────────────────────────────────────────────────────┤
│  集成测试                                                     │
│  API Gateway ↔ Decision Engine / 链上合约交互 / WebSocket       │
├──────────────────────────────────────────────────────────────┤
│  单元测试                                                     │
│  决策管线8步 / 情绪状态机 / 经验引擎 / 策略解析 / 合约函数 / 前端hooks │
├──────────────────────────────────────────────────────────────┤
│  回归测试（Battle Cases）                                      │
│  阿暴/阿稳/阿鬼/BTC闪崩 4个固定案例 → 每次改动后跑一遍               │
└──────────────────────────────────────────────────────────────┘
```

**覆盖率目标**：80%（决策引擎核心路径 95%）

---

## 二、Move 合约测试

### 2.1 测试框架

```bash
sui move test                          # 运行所有 #[test] 模块
sui move test --coverage              # 覆盖率报告
```

### 2.2 测试用例清单

#### panda 模块

| 用例 | 验证内容 | 预期 |
|------|---------|------|
| `test_mint_panda` | 铸造成功，性格五轴 0-100，天赋 0-6 | 对象创建 + Display 可读 |
| `test_mint_max_supply` | 超过 max_supply 铸造 | abort E_MAX_SUPPLY_REACHED |
| `test_mint_disabled` | mint_enabled=false 时铸造 | abort E_MINT_DISABLED |
| `test_trading_lock` | is_trading=true 时转让 | abort E_TRADING_IN_PROGRESS |
| `test_set_trading_lock` | AdminCap 设置交易锁 | is_trading 状态变更 |
| `test_personality_immutable` | 铸造后性格值不可变 | 无修改入口（Move 结构体保证） |

#### strategy 模块

| 用例 | 验证内容 | 预期 |
|------|---------|------|
| `test_set_strategy` | 首次设置策略 | dynamic_field 写入 strategy_hash |
| `test_update_strategy` | 更新策略 | strategy_hash 变更 + 旧记录归档 |
| `test_strategy_history` | 多次换策略 | strategy_count 递增 + 历史记录完整 |
| `test_strategy_not_owner` | 非主人设置策略 | abort（权限拒绝） |

#### trust_proof 模块

| 用例 | 验证内容 | 预期 |
|------|---------|------|
| `test_submit_merkle_root` | 提交 32 字节 root | dynamic_field 写入 + 事件发出 |
| `test_invalid_root_length` | 提交非 32 字节 | abort E_INVALID_ROOT |
| `test_verify_trade_log` | Merkle Proof 验证 | 验证通过返回 true |
| `test_verify_invalid_proof` | 错误 Proof | 验证失败返回 false |

#### achievement 模块

| 用例 | 验证内容 | 预期 |
|------|---------|------|
| `test_unlock_achievement` | 首次解锁 | dynamic_field 写入 + 事件发出 |
| `test_duplicate_unlock` | 重复解锁同成就 | abort E_ALREADY_UNLOCKED |
| `test_achievement_not_found` | 解锁不存在的成就 | abort E_ACHIEVEMENT_NOT_FOUND |

#### market 模块

| 用例 | 验证内容 | 预期 |
|------|---------|------|
| `test_configure_kiosk` | 创建 Kiosk + 版税策略 | Kiosk 对象创建 |
| `test_list_panda` | 上架熊猫 | Kiosk 中可查到 listing |
| `test_list_trading_panda` | 上架交易中的熊猫 | abort E_PANDA_IS_TRADING |
| `test_royalty_bounds` | 版税超出 2%-10% 范围 | abort E_INVALID_ROYALTY |

#### checkin 模块

| 用例 | 验证内容 | 预期 |
|------|---------|------|
| `test_claim_reward` | 首次签到领奖 | dynamic_field 写入 |
| `test_duplicate_claim` | 同日重复领奖 | abort E_ALREADY_CLAIMED |

### 2.3 Move 测试代码示例

```move
#[test_only]
module tradingpanda::panda_tests {
    use sui::test_scenario;
    use sui::random::{Self, Random};
    use tradingpanda::panda::{Self, Panda, PandaRegistry, AdminCap};

    #[test]
    fun test_mint_panda() {
        let admin = @0xAD;
        let user = @0xBB;
        let mut scenario = test_scenario::begin(admin);

        // Init 模块
        test_scenario::next_tx(&mut scenario, admin);
        {
            panda::init_for_testing(test_scenario::ctx(&mut scenario));
        };

        // 创建 Random
        test_scenario::next_tx(&mut scenario, admin);
        {
            random::create_for_testing(test_scenario::ctx(&mut scenario));
        };

        // 铸造
        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<PandaRegistry>(&scenario);
            let r = test_scenario::take_shared<Random>(&scenario);
            let clock = sui::clock::create_for_testing(test_scenario::ctx(&mut scenario));

            panda::mint_panda(&mut registry, &r, &clock, test_scenario::ctx(&mut scenario));

            assert!(panda::total_minted(&registry) == 1, 0);

            test_scenario::return_shared(registry);
            test_scenario::return_shared(r);
            sui::clock::destroy_for_testing(clock);
        };

        // 验证 Panda 对象
        test_scenario::next_tx(&mut scenario, user);
        {
            let panda = test_scenario::take_from_sender<Panda>(&scenario);
            assert!(panda::boldness(&panda) <= 100, 1);
            assert!(panda::talent(&panda) <= 6, 2);
            assert!(!panda::is_trading(&panda), 3);
            test_scenario::return_to_sender(&scenario, panda);
        };

        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = panda::E_TRADING_IN_PROGRESS)]
    fun test_trading_lock_prevents_transfer() {
        // ... 设置 is_trading=true，尝试 transfer，预期 abort
    }
}
```

---

## 三、决策引擎测试（Python / pytest）

### 3.1 单元测试

```bash
pytest tests/ --cov=engine --cov-report=term-missing -v
```

#### 8 步决策管线

| 步骤 | 测试文件 | 关键用例 |
|------|---------|---------|
| Step 1 策略信号 | `test_rule_engine.py` | RSI/MACD/MA 等指标匹配 + 直觉信号触发条件 |
| Step 2 熟练度噪声 | `test_proficiency.py` | 4 档熟练度(0-20/20-50/50-80/80+)对应偏差范围 |
| Step 3 经验修正 | `test_experience.py` | 模式记忆修正 + 资产专精修正 + 错误反省修正 |
| Step 4 融合 | `test_fusion.py` | 三阶段权重(幼/成长/成熟)正确切换 |
| Step 5 性格过滤 | `test_personality.py` | 胆识→阈值/仓位、耐性→延迟/持仓、直觉→权重 |
| Step 6 环境适配 | `test_environment.py` | 4 级感知等级 × 策略匹配/不匹配 |
| Step 7 社交偏移 | `test_social.py` | 逆向性 0/50/100 对群体信号的响应 |
| Step 8 情绪扭曲 | `test_emotion.py` | 7 状态系数 × 情绪稳定性调节 |

#### 情绪状态机

```python
# tests/test_emotion_machine.py

import pytest
from engine.emotion import EmotionStateMachine

class TestEmotionTransitions:
    def test_focused_to_excited_after_3_wins(self):
        sm = EmotionStateMachine(stability=50)
        assert sm.state == "focused"
        for _ in range(3):
            sm.on_trade_result(win=True, pnl_pct=0.02)
        assert sm.state == "excited"

    def test_excited_to_greedy_after_5_wins(self):
        sm = EmotionStateMachine(stability=50)
        for _ in range(5):
            sm.on_trade_result(win=True, pnl_pct=0.02)
        assert sm.state == "greedy"

    def test_focused_to_cautious_on_big_loss(self):
        sm = EmotionStateMachine(stability=50)
        sm.on_trade_result(win=False, pnl_pct=-0.06)  # >5% 亏损
        assert sm.state == "cautious"

    def test_zen_bamboo_never_panics(self):
        """天赋 T1 竹林禅心：情绪永不进入恐慌"""
        sm = EmotionStateMachine(stability=20, talent=1)
        sm.on_trade_result(win=False, pnl_pct=-0.06)
        sm.on_drawdown(0.12)  # >10% 回撤
        assert sm.state == "cautious"  # 最低止于谨慎，不进恐慌

    def test_cooldown_bamboo_resets_to_focused(self):
        """冷静竹道具重置情绪"""
        sm = EmotionStateMachine(stability=20)
        sm.state = "panicking"
        sm.use_cooldown_bamboo()
        assert sm.state == "focused"
```

#### 策略残影

```python
# tests/test_strategy_shadow.py

def test_ghost_weight_decay():
    """残影权重随交易笔数衰减"""
    shadow = StrategyShadow(old_strategy_hash="abc", switch_trade_count=0)
    assert shadow.get_weight(trades_since=0) == 0.40
    assert shadow.get_weight(trades_since=50) == 0.20
    assert shadow.get_weight(trades_since=150) == 0.08
    assert shadow.get_weight(trades_since=300) == 0.0

def test_frequent_switch_penalty():
    """30 天内换策 >3 次 → 衰减速度减半"""
    manager = ShadowManager()
    for _ in range(4):
        manager.switch_strategy("new_hash", days_since_first=25)
    shadow = manager.active_shadows[-1]
    # 正常 50 笔后 0.20，惩罚后 100 笔才到 0.20
    assert shadow.get_weight(trades_since=50) == 0.40  # 衰减减半

def test_multi_shadow_cap():
    """多个残影权重之和封顶 0.50"""
    manager = ShadowManager()
    manager.add_shadow(weight=0.40)
    manager.add_shadow(weight=0.40)
    assert manager.total_weight() <= 0.50
```

### 3.2 Battle Case 回归测试

将 `preparation/PRD/battle-cases.md` 的 4 个案例转化为自动化测试：

```python
# tests/test_battle_cases.py

import pytest
from engine.pipeline import DecisionPipeline
from engine.types import Personality, Strategy, MarketState

class TestBattleCases:
    """
    来源：preparation/PRD/battle-cases.md
    每个案例用固定参数跑完整 8 步管线，验证最终执行分在预期范围内
    """

    @pytest.fixture
    def abao_personality(self):
        """阿暴：胆识90/耐性15/直觉60/专注40/逆向60/情绪稳定20"""
        return Personality(boldness=90, patience=15, intuition=60, focus=40, contrarian=60)

    @pytest.fixture
    def awen_personality(self):
        """阿稳：胆识25/耐性85/直觉40/专注80/逆向20/情绪稳定80"""
        return Personality(boldness=25, patience=85, intuition=40, focus=80, contrarian=20)

    @pytest.fixture
    def agui_personality(self):
        """阿鬼：胆识55/耐性50/直觉95/专注60/逆向85/情绪稳定50"""
        return Personality(boldness=55, patience=50, intuition=95, focus=60, contrarian=85)

    @pytest.fixture
    def rsi_strategy(self):
        """共同策略：RSI<30 买入, 仓位 5%, 止损 8%"""
        return Strategy(
            signal_rules=[
                {"indicator": "RSI", "condition": "< 30", "threshold": 30, "action": "BUY"},
            ],
            position_sizing={"max_position_pct": 0.05},
            risk_management={"stop_loss_pct": 0.08, "max_drawdown_pct": 0.15},
        )

    def test_case1_abao_btc_crash(self, abao_personality, rsi_strategy):
        """案例一：BTC闪崩，阿暴 → 3秒内冲进去"""
        pipeline = DecisionPipeline(
            personality=abao_personality,
            strategy=rsi_strategy,
            proficiency=35,
            emotion_state="excited",
            emotion_stability=20,
            experience_level=30,
        )
        market = MarketState(rsi=23, price=58800, volatility="high")
        result = pipeline.execute(market)

        assert result.action == "BUY"
        assert result.entry_delay_bars == 0       # 阿暴不等
        assert result.final_score > 0.49          # 超过低阈值

    def test_case1_awen_btc_crash(self, awen_personality, rsi_strategy):
        """案例一：BTC闪崩，阿稳 → 等3根K线再半仓买入"""
        pipeline = DecisionPipeline(
            personality=awen_personality,
            strategy=rsi_strategy,
            proficiency=50,
            emotion_state="focused",
            emotion_stability=80,
            experience_level=45,
        )
        market = MarketState(rsi=23, price=58800, volatility="high")
        result = pipeline.execute(market)

        assert result.entry_delay_bars >= 3       # 高耐性等 3+ K 线
        assert result.position_pct < 0.05         # 仓位低于策略建议

    def test_case1_agui_btc_crash(self, agui_personality, rsi_strategy):
        """案例一：BTC闪崩，阿鬼 → 反向操作"""
        pipeline = DecisionPipeline(
            personality=agui_personality,
            strategy=rsi_strategy,
            proficiency=65,
            emotion_state="focused",
            emotion_stability=50,
            experience_level=70,
        )
        market = MarketState(rsi=23, price=58800, volatility="high",
                            social_signal=-0.8)  # 群体恐慌卖出
        result = pipeline.execute(market)

        # 高逆向性(85) + 群体卖出 → 阿鬼可能反向买入或信号显著偏移
        assert result.social_offset < 0  # 逆向偏移为负（反向群体）

    def test_case4_personality_strategy_mismatch(self, awen_personality):
        """案例四：阿稳用趋势策略 → 匹配度低"""
        trend_strategy = Strategy(
            philosophy="trend_following",
            signal_rules=[
                {"indicator": "MACD", "condition": "golden_cross", "action": "BUY"},
            ],
            position_sizing={"max_position_pct": 0.10},  # 激进仓位
            risk_management={"stop_loss_pct": 0.05},
        )
        pipeline = DecisionPipeline(
            personality=awen_personality,
            strategy=trend_strategy,
            proficiency=20,
            emotion_state="focused",
            emotion_stability=80,
            experience_level=10,
        )
        # 低胆识 + 高仓位策略 → 实际仓位被砍到 60%
        assert pipeline.calculate_position_multiplier() < 0.7
```

### 3.3 多资产相关性测试

```python
# tests/test_correlation.py

def test_pearson_correlation_btc_eth():
    """BTC-ETH 30 天滚动相关系数计算"""
    returns_btc = [0.01, -0.02, 0.03, ...]  # 30 天日收益率
    returns_eth = [0.015, -0.018, 0.028, ...]
    corr = calculate_pearson(returns_btc, returns_eth)
    assert -1.0 <= corr <= 1.0

def test_high_correlation_penalty():
    """高相关资产(>0.7)不重复建仓 → 信号 ×0.5"""
    engine = EnvironmentEngine(experience_level=60)
    engine.set_correlation("BTC", "ETH", 0.85)
    engine.set_held_asset("BTC")
    signal = engine.apply_correlation_filter("ETH", raw_signal=0.80)
    assert signal == pytest.approx(0.40)  # 0.80 × 0.5

def test_low_level_ignores_correlation():
    """Lv.1-2 看不到相关性 → 不惩罚"""
    engine = EnvironmentEngine(experience_level=20)
    engine.set_correlation("BTC", "ETH", 0.85)
    engine.set_held_asset("BTC")
    signal = engine.apply_correlation_filter("ETH", raw_signal=0.80)
    assert signal == 0.80  # 不感知，不惩罚
```

---

## 四、API 集成测试

### 4.1 框架

```bash
# API Gateway (Next.js)
pnpm vitest run tests/api/

# Decision Engine (Python)
pytest tests/integration/ --timeout=30
```

### 4.2 测试矩阵

| 端点 | Happy Path | 错误码 | 权限 | 边界 |
|------|-----------|--------|------|------|
| `POST /api/auth/connect` | Wallet签名验证 | 无效签名/nonce | 无需认证 | 同钱包重复连接 |
| `POST /api/auth/onboarding-survey` | 提交问卷 | 字段非法 | JWT | 重复提交(409) |
| `POST /api/panda/mint` | 铸造成功 | 链上失败/供应上限 | JWT | 并发铸造 |
| `POST /api/panda/:id/strategy` | 解析+保存 | 文本过短/LLM失败 | JWT+Owner | 频繁换策 |
| `POST /api/panda/:id/simulation/start` | 启动模拟 | 无策略/已在运行 | JWT+Owner | — |
| `GET /api/panda/:id/trades` | 返回交易列表 | 熊猫不存在 | JWT+Owner | 分页边界 |
| `POST /api/market/buy` | 购买成功 | 已售出/余额不足 | JWT | 自己买自己(400) |
| `POST /api/checkin` | 签到成功 | 今日已签到(409) | JWT | 跨日签到 |

### 4.3 Internal RPC 集成测试

```python
# tests/integration/test_internal_rpc.py

async def test_strategy_parse_round_trip():
    """API Gateway → Decision Engine → 策略解析 → 返回"""
    resp = await client.post("/internal/strategy/parse", json={
        "panda_id": "test-panda-001",
        "raw_text": "当RSI低于30时买入，止损8%",
        "personality": {"boldness": 72, "patience": 45, "intuition": 88, "focus": 61, "contrarian": 33},
        "talent_id": 0,
    })
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["parsed_json"]["risk_management"]["stop_loss_pct"] == 0.08
    assert 0 <= data["personality_match"] <= 100
    assert len(data["strategy_hash"]) == 64

async def test_simulation_lifecycle():
    """启动模拟 → 获取状态 → 停止模拟"""
    start_resp = await client.post("/internal/simulation/start", json={...})
    assert start_resp.json()["data"]["status"] == "started"
    actor_id = start_resp.json()["data"]["actor_id"]

    state_resp = await client.get(f"/internal/panda/test-001/state")
    assert state_resp.json()["data"]["is_alive"] is True

    stop_resp = await client.post("/internal/simulation/stop", json={
        "simulation_id": "test-sim-001",
        "panda_id": "test-001",
    })
    assert stop_resp.json()["data"]["status"] == "stopped"
    assert stop_resp.json()["data"]["final_state"]["total_trades"] >= 0
```

---

## 五、前端测试

### 5.1 框架

```bash
pnpm vitest run                       # 单元测试 (hooks, services, utils)
pnpm playwright test                  # E2E 测试
```

### 5.2 单元测试 — Hooks & Services

```typescript
// tests/hooks/usePandaData.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { usePandaData } from '@/hooks/usePandaData';

test('usePandaData fetches and returns panda', async () => {
  const { result } = renderHook(() => usePandaData('panda-001'));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.personality.boldness).toBeGreaterThanOrEqual(0);
});
```

```typescript
// tests/services/panda.service.test.ts
import { pandaService } from '@/services/panda.service';

test('pandaService.getById returns panda data', async () => {
  const result = await pandaService.getById('panda-001');
  expect(result.success).toBe(true);
  expect(result.data.id).toBe('panda-001');
});
```

### 5.3 E2E 测试 — 关键用户流程

```typescript
// tests/e2e/mint-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete mint flow', async ({ page }) => {
  await page.goto('/');
  await page.click('text=连接钱包');
  // ... 模拟钱包连接

  await page.goto('/mint');
  await page.click('text=铸造熊猫');
  await expect(page.locator('[data-testid="personality-radar"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('[data-testid="talent-badge"]')).toBeVisible();
  await page.click('text=进入模拟盘');
  await expect(page).toHaveURL(/\/dashboard\//);
});

test('onboarding survey flow', async ({ page }) => {
  // 模拟首次登录用户
  await page.goto('/onboarding');
  await page.click('text=零经验，纯新手');
  await page.click('text=下一步');
  // ... 5 步问卷
  await page.click('text=完成');
  await expect(page).toHaveURL('/mint');
});

test('strategy input and simulation', async ({ page }) => {
  await page.goto('/dashboard/panda-001');
  await page.fill('[data-testid="strategy-input"]', '当RSI低于30时买入，止损8%');
  await page.click('text=喂给熊猫');
  await expect(page.locator('[data-testid="strategy-preview"]')).toBeVisible();
  await page.click('text=开始模拟');
  await expect(page.locator('[data-testid="simulation-running"]')).toBeVisible();
});
```

### 5.4 Visual Regression — 关键断点

```typescript
// tests/visual/snapshots.spec.ts
import { test, expect } from '@playwright/test';

const breakpoints = [320, 768, 1024, 1440];

for (const width of breakpoints) {
  test(`landing page at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page).toHaveScreenshot(`landing-${width}.png`);
  });
}
```

---

## 六、决策引擎测试可视化工具

> 来源：DECISION_ITEMS.md Q19 — "需要决策引擎测试可视化工具"

### 6.1 目标

开发阶段用的内部工具，让开发者能：
1. 输入任意性格 + 策略 + 市场状态 → 实时看到 8 步管线每步的输出
2. 批量跑 battle cases → 对比不同性格的结果
3. 调参后即时看到行为变化（公式调优用）

### 6.2 技术方案

```
独立 Streamlit 应用（Python），不部署到生产环境。

pages/
├── pipeline_debugger.py    # 单次决策管线可视化
├── battle_simulator.py     # Battle Case 批量模拟
├── emotion_timeline.py     # 情绪状态机时间线
└── parameter_tuner.py      # 公式参数调优
```

### 6.3 Pipeline Debugger 页面

```python
# 左侧面板：输入参数
st.sidebar.header("性格五轴")
boldness = st.sidebar.slider("胆识", 0, 100, 72)
patience = st.sidebar.slider("耐性", 0, 100, 45)
# ...

st.sidebar.header("市场状态")
rsi = st.sidebar.slider("RSI", 0, 100, 28)
price = st.sidebar.number_input("价格", value=58800)

# 右侧：8 步管线可视化
# 每步显示 输入值 → 公式 → 输出值
# 用颜色标记关键变化（绿=信号增强，红=信号衰减）
# 最终显示执行/观望/忽视 + 仓位 + 止损
```

### 6.4 Battle Simulator 页面

```python
# 选择市场场景（BTC闪崩 / 牛市突破 / 震荡市）
# 自动跑 阿暴/阿稳/阿鬼 三只熊猫
# 并排显示：
#   - 三只熊猫的 8 步管线结果对比表
#   - 100 笔交易后的收益曲线对比图
#   - 情绪变化时间线对比
```

### 6.5 Parameter Tuner 页面

```python
# 可调整的全局参数：
# - 信号阈值 (0.65/0.40)
# - 情绪系数 (excited=1.1 / greedy=1.3 / ...)
# - 成长阶段权重 (幼年/成长/成熟)
# - 残影衰减曲线

# 调整后：
# 1. 实时显示 battle case 结果变化
# 2. 显示"这个调整会导致阿暴在BTC闪崩时从执行变为观望"等影响分析
```

---

## 七、CI/CD 集成

### 7.1 测试流水线

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Sui CLI
        run: cargo install --locked --git https://github.com/MystenLabs/sui.git sui
      - name: Run Move tests
        run: cd contracts && sui move test --coverage

  engine-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r requirements.txt
      - run: pytest tests/ --cov=engine --cov-report=xml --cov-fail-under=80
      - name: Battle Case Regression
        run: pytest tests/test_battle_cases.py -v

  api-tests:
    runs-on: ubuntu-latest
    needs: [engine-tests]
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r requirements.txt
      - run: pytest tests/integration/ --timeout=30

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && pnpm install && pnpm vitest run
      - run: cd frontend && pnpm playwright install && pnpm playwright test
```

### 7.2 质量门禁

| 指标 | 阈值 | 阻断 |
|------|------|------|
| 决策引擎覆盖率 | ≥80% | PR 不可合并 |
| Battle Case 回归 | 4/4 通过 | PR 不可合并 |
| Move 合约测试 | 全部通过 | PR 不可合并 |
| API 集成测试 | 全部通过 | PR 不可合并 |
| 前端 E2E | 关键流程通过 | PR 不可合并 |
| Lint (ruff + eslint) | 0 errors | PR 不可合并 |

---

## 八、验收验证清单

### 8.1 PRD 用户故事覆盖

| PRD 用户故事 | 测试覆盖 |
|-------------|---------|
| 新用户铸造熊猫 | E2E: mint-flow.spec.ts |
| 喂策略并解析 | E2E: strategy-input.spec.ts + API 集成 |
| 模拟盘自动交易 | Battle Case 回归 + E2E |
| 决策链可视化 | E2E: decision-chain.spec.ts |
| 情绪变化可见 | 情绪状态机单元测试 + E2E 表情切换 |
| 成长进化 | 经验引擎单元测试 |
| NFT 市场买卖 | E2E: market-flow.spec.ts + 合约测试 |
| 签到系统 | API 集成测试 |
| 成就解锁 | 合约测试 + API 集成 |
| 排行榜 | API 集成测试 |
| 问卷调查 | E2E: onboarding.spec.ts |

### 8.2 公式完整性验证

trading-behavior-mechanics.md 中的每个公式都必须有对应的单元测试：

| 公式 | 测试文件 | 状态 |
|------|---------|------|
| 入场阈值 = 0.65 × (1 - (boldness-50)/200) | test_personality.py | ⬜ |
| 仓位比例 = 策略仓位 × (0.6 + boldness/250) | test_personality.py | ⬜ |
| 入场延迟 = floor(patience/20) - 1 | test_personality.py | ⬜ |
| 持仓耐心 = 12 + patience/4 | test_personality.py | ⬜ |
| 直觉信号 = intuition/200 + exp/200 | test_personality.py | ⬜ |
| 情绪修正 = 理论 × (1 - stability/100) | test_emotion.py | ⬜ |
| 残影权重衰减 (0.40→0.20→0.08→0) | test_strategy_shadow.py | ⬜ |
| Pearson 相关系数 | test_correlation.py | ⬜ |
| 8步管线完整公式 | test_pipeline.py | ⬜ |
