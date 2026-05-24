# TradingPanda 数据库 Schema 设计文档

> 版本 1.0 · 2026-05-08
> 适用于 Sui Overflow 2026 黑客松 — AI 交易宠物养成系统

---

## 一、数据库选型与部署

### 1.1 主数据库：PostgreSQL

| 项目 | 方案 |
|------|------|
| 数据库引擎 | PostgreSQL 15+ |
| 托管方案 | Supabase Free Tier（首选）或 Render PostgreSQL |
| 连接方式 | Supabase: `postgresql://postgres:[密码]@db.[项目ID].supabase.co:5432/postgres` |
| 连接池 | Supabase 内置 PgBouncer（Transaction 模式，默认端口 6543） |
| 最大连接数 | Free Tier: 60（PgBouncer）/ 15（直连） |
| 备份 | Supabase 自动每日备份（Pro 版可恢复到任意时间点） |

**无本地数据**：所有数据服务端存储，不使用 SQLite。客户端零状态。

### 1.2 数据分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                     链上层 (Sui Move)                        │
│  Panda NFT struct + dynamic_fields (strategy_hash, blob_id) │
│  性格五轴、天赋、is_trading 锁 — 不可变，链上权威               │
└────────────────────────┬────────────────────────────────────┘
                         │ 事件监听 / 链上读取
┌────────────────────────▼────────────────────────────────────┐
│                  结构化 DB (PostgreSQL)                      │
│  用户、熊猫镜像、策略、交易、经验、情绪、成就、签到、市场缓存     │
│  热数据查询、决策引擎读写、API 服务                             │
└────────────────────────┬────────────────────────────────────┘
                         │ 定期同步
┌────────────────────────▼────────────────────────────────────┐
│                非结构化存储 (Walrus)                          │
│  经验数据 JSON 备份、历史交易归档、NFT 转让时数据迁移            │
│  blob_id 记录在 PostgreSQL + 链上 dynamic_field              │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 与 Walrus 的同步策略

- PostgreSQL 中 `pandas` 表维护 `walrus_blob_id`、`walrus_last_synced_at`、`walrus_sync_status` 三个字段
- 同步触发条件：每 50 笔交易 / 每日定时 / NFT 转让前强制同步
- 同步方向：PostgreSQL → Walrus（写）；NFT 转让后新主人 Walrus → PostgreSQL（恢复）
- 故障处理：`sync_status` 标记为 `failed`，下次触发时重试

---

## 二、ER 图（ASCII）

```
                            ┌──────────────┐
                            │    users     │
                            │──────────────│
                            │ id (PK)      │
                            │ wallet_addr  │
                            │ zk_login_sub │
                            └──────┬───────┘
                                   │ 1
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼ N            ▼ N            ▼ N
            ┌──────────────┐ ┌──────────┐ ┌──────────────┐
            │   pandas     │ │ checkins │ │user_achievem.│
            │──────────────│ │──────────│ │──────────────│
            │ id (PK)      │ │ id (PK)  │ │ id (PK)      │
            │ owner_id(FK) │ │ user_id  │ │ user_id (FK) │
            │ sui_object_id│ │          │ │ achieve.(FK) │
            └──────┬───────┘ └──────────┘ │ panda_id(FK) │
                   │ 1                     └──────────────┘
     ┌─────────────┼─────────────┬────────────────┐          ┌──────────────┐
     │             │             │                │          │ achievements │
     ▼ N           ▼ N           ▼ N              ▼ N        │──────────────│
┌──────────┐ ┌───────────┐ ┌───────────────┐ ┌──────────┐   │ id (PK)      │
│strategies│ │  trades   │ │strategy_hist. │ │emotions_ │   │ code (UQ)    │
│──────────│ │───────────│ │───────────────│ │  log     │   └──────────────┘
│ id (PK)  │ │ id (PK)   │ │ id (PK)       │ │──────────│
│ panda_id │ │ panda_id  │ │ panda_id (FK) │ │ id (PK)  │
│          │ │ strategy  │ │ ghost_weight  │ │ panda_id │
└──────────┘ │ simul.(FK)│ └───────────────┘ └──────────┘
             └─────┬─────┘
                   │ N                        ┌──────────────────┐
                   │                          │ experience_*     │
             ┌─────▼─────┐                    │──────────────────│
             │simulations│                    │ patterns (N)     │
             │───────────│                    │ mastery  (N)     │
             │ id (PK)   │                    │ mistakes (N)     │
             │ panda_id  │                    │ cycles   (N)     │
             └───────────┘                    │ 全部 FK → pandas │
                                              └──────────────────┘
     ┌──────────────┐  ┌───────────────────┐  ┌──────────────┐
     │ merkle_roots │  │market_data_cache  │  │ panda_diary  │
     │──────────────│  │───────────────────│  │──────────────│
     │ id (PK)      │  │ id (PK)           │  │ id (PK)      │
     │ panda_id(FK) │  │ asset / source    │  │ panda_id(FK) │
     │ root_hash    │  │ OHLCV + 指标      │  │ content      │
     │ chain_status │  └───────────────────┘  └──────────────┘
     └──────────────┘
                        ┌───────────────────┐
                        │correlation_matrix │
                        │───────────────────│
                        │ id (PK)           │
                        │ asset_a / asset_b │
                        │ correlation       │
                        └───────────────────┘
```

---

## 三、表定义

### 3.1 users — 用户表

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address  TEXT NOT NULL UNIQUE,          -- Sui 钱包地址 (0x...)
    zk_login_subject TEXT,                         -- zkLogin 主体标识（Google/Apple sub）
    display_name    TEXT,                          -- 用户昵称
    avatar_url      TEXT,                          -- 头像 URL
    onboarding_survey JSONB,                       -- 初次登录问卷结果（交易经验/风格/风险偏好）
    experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE users IS '用户表，通过 Sui 钱包地址或 zkLogin 注册';
COMMENT ON COLUMN users.wallet_address IS 'Sui 链上钱包地址，全局唯一';
COMMENT ON COLUMN users.zk_login_subject IS 'zkLogin OAuth subject，用于免助记词登录';
COMMENT ON COLUMN users.onboarding_survey IS '初次登录问卷JSON: {trading_exp, style[], max_loss, indicators[], panda_autonomy}';
COMMENT ON COLUMN users.experience_level IS '从问卷推导的交易经验等级，影响推荐和UI深度';

CREATE INDEX idx_users_zk_login ON users (zk_login_subject) WHERE zk_login_subject IS NOT NULL;
```

### 3.2 pandas — 熊猫表（链下镜像）

```sql
CREATE TABLE pandas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sui_object_id       TEXT NOT NULL UNIQUE,      -- 链上 NFT 对象 ID
    owner_id            UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- 先天性格五轴（链上权威，此处为镜像缓存）
    boldness            SMALLINT NOT NULL CHECK (boldness BETWEEN 0 AND 100),
    patience            SMALLINT NOT NULL CHECK (patience BETWEEN 0 AND 100),
    intuition           SMALLINT NOT NULL CHECK (intuition BETWEEN 0 AND 100),
    focus               SMALLINT NOT NULL CHECK (focus BETWEEN 0 AND 100),
    contrarian          SMALLINT NOT NULL CHECK (contrarian BETWEEN 0 AND 100),

    -- 天赋：0=无天赋, 1-6 对应六种稀有天赋
    talent              SMALLINT NOT NULL DEFAULT 0 CHECK (talent BETWEEN 0 AND 6),

    -- 成长状态
    experience_level    SMALLINT NOT NULL DEFAULT 0 CHECK (experience_level BETWEEN 0 AND 100),
    is_trading          BOOLEAN NOT NULL DEFAULT FALSE,  -- 交易锁，防止交易中转让

    -- 情绪状态
    emotion_state       TEXT NOT NULL DEFAULT 'focused'
                        CHECK (emotion_state IN ('focused','excited','greedy','cautious','panicking','numb')),
    emotion_stability   SMALLINT NOT NULL DEFAULT 50     -- 隐含属性，由性格计算后缓存
                        CHECK (emotion_stability BETWEEN 0 AND 100),

    -- Walrus 同步字段
    walrus_blob_id      TEXT,                      -- Walrus 经验数据 blob ID
    walrus_last_synced_at TIMESTAMPTZ,             -- 上次同步时间
    walrus_sync_status  TEXT NOT NULL DEFAULT 'pending'
                        CHECK (walrus_sync_status IN ('pending','synced','failed')),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE pandas IS '熊猫 NFT 的链下镜像，性格五轴为链上数据的缓存';
COMMENT ON COLUMN pandas.sui_object_id IS '链上 Panda NFT 的 Sui Object ID';
COMMENT ON COLUMN pandas.talent IS '0=无天赋, 1=镜像思维, 2=夜行者, 3=竹林禅心, 4=量子嗅觉, 5=时间感知, 6=共情交易';
COMMENT ON COLUMN pandas.emotion_stability IS '情绪稳定性 = f(patience, focus, experience_level)，缓存避免重复计算';
COMMENT ON COLUMN pandas.walrus_sync_status IS '经验数据 Walrus 同步状态：pending/synced/failed';

CREATE INDEX idx_pandas_owner ON pandas (owner_id);
CREATE INDEX idx_pandas_emotion ON pandas (emotion_state);
CREATE INDEX idx_pandas_walrus_sync ON pandas (walrus_sync_status) WHERE walrus_sync_status != 'synced';
```

### 3.3 strategies — 策略表

```sql
CREATE TABLE strategies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id        UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,

    raw_text        TEXT NOT NULL,                  -- 用户原文或积木自动摘要（展示/历史）
    parsed_json     JSONB NOT NULL,                 -- 四层结构（积木直传或 LLM 解析）
                                                    -- signal_rules[]: {indicator, condition, threshold?, action}
    strategy_hash   TEXT NOT NULL,                   -- SHA256 哈希（同步到链上 dynamic_field）
    philosophy      TEXT NOT NULL                    -- 哲学层：trend_following / contrarian / intuition_driven
                    CHECK (philosophy IN ('trend_following','contrarian','intuition_driven','grid','custom')),
    proficiency     SMALLINT NOT NULL DEFAULT 0      -- 策略熟练度 0-100
                    CHECK (proficiency BETWEEN 0 AND 100),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,   -- 当前激活策略（每只熊猫仅一个 active）

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE strategies IS '用户教给熊猫的交易策略';
COMMENT ON COLUMN strategies.parsed_json IS '四层 JSON：哲学/仓位/signal_rules[]/风控；权威执行来源';
COMMENT ON COLUMN strategies.strategy_hash IS 'SHA256(parsed_json) 用于链上验证';
COMMENT ON COLUMN strategies.proficiency IS '策略熟练度：0-20 偏差±30%, 20-50 ±15%, 50-80 ±5%, 80-100 完美执行';

CREATE INDEX idx_strategies_panda ON strategies (panda_id);
CREATE INDEX idx_strategies_active ON strategies (panda_id) WHERE is_active = TRUE;
CREATE INDEX idx_strategies_parsed ON strategies USING GIN (parsed_json);
```

### 3.4 strategy_history — 策略残影表

```sql
CREATE TABLE strategy_history (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id                UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,

    strategy_hash           TEXT NOT NULL,            -- 被替换策略的哈希
    proficiency_at_switch   SMALLINT NOT NULL         -- 切换时的熟练度
                            CHECK (proficiency_at_switch BETWEEN 0 AND 100),
    ghost_weight            DECIMAL(5,4) NOT NULL DEFAULT 1.0000,
                                                      -- 残影权重（1.0 → 随交易衰减 → 0）
    trades_since_switch     INT NOT NULL DEFAULT 0,   -- 换策后交易笔数（用于衰减计算）

    switched_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE strategy_history IS '策略残影：旧策略的影响随交易笔数指数衰减';
COMMENT ON COLUMN strategy_history.ghost_weight IS '残影权重 = exp(-trades_since_switch / decay_rate)，影响新策略执行的偏差';

CREATE INDEX idx_strategy_history_panda ON strategy_history (panda_id);
CREATE INDEX idx_strategy_history_active ON strategy_history (panda_id, ghost_weight)
    WHERE ghost_weight > 0.01;
```

### 3.5 trades — 交易记录表

```sql
CREATE TABLE trades (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id            UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,
    strategy_id         UUID NOT NULL REFERENCES strategies(id) ON DELETE RESTRICT,
    simulation_id       UUID NOT NULL,              -- 所属模拟会话 FK (见 simulations 表)

    -- 交易基本信息
    asset               TEXT NOT NULL               -- 交易资产
                        CHECK (asset IN ('BTC','ETH','SUI')),
    action              TEXT NOT NULL               -- 交易动作
                        CHECK (action IN ('BUY','SELL','HOLD')),
    price               DECIMAL(20,8) NOT NULL,     -- 执行价格
    quantity            DECIMAL(20,8) NOT NULL,      -- 交易数量
    position_size_pct   DECIMAL(5,4) NOT NULL,       -- 仓位占比 (0.0000-1.0000)

    -- 决策链数据（8 步决策过程）
    raw_signal          DECIMAL(5,4),                -- Step 1: 策略原始信号
    filtered_signal     DECIMAL(5,4),                -- Step 5: 性格过滤后信号
    final_score         DECIMAL(5,4) NOT NULL,       -- Step 8: 最终执行分
    emotion_at_trade    TEXT NOT NULL                 -- 交易时情绪状态
                        CHECK (emotion_at_trade IN ('focused','excited','greedy','cautious','panicking','numb')),
    proficiency_at_trade SMALLINT NOT NULL            -- 交易时策略熟练度
                        CHECK (proficiency_at_trade BETWEEN 0 AND 100),
    pnl_pct             DECIMAL(8,4),                -- 盈亏百分比（卖出时计算，买入/持有时为 NULL）
    decision_details    JSONB NOT NULL,               -- 8 步决策链完整记录
                                                      -- {step1_raw, step2_proficiency_noise, step3_experience,
                                                      --  step4_fusion, step5_personality, step6_environment,
                                                      --  step7_social, step8_emotion}

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE trades IS '每笔交易的完整记录，包含 8 步决策链数据';
COMMENT ON COLUMN trades.decision_details IS '完整决策链 JSON：策略信号→熟练度噪声→经验修正→融合→性格→环境→社交→情绪';
COMMENT ON COLUMN trades.pnl_pct IS '盈亏百分比：正数盈利/负数亏损，仅 SELL 时计算';

CREATE INDEX idx_trades_panda ON trades (panda_id, created_at DESC);
CREATE INDEX idx_trades_simulation ON trades (simulation_id);
CREATE INDEX idx_trades_asset ON trades (asset, created_at DESC);
CREATE INDEX idx_trades_pnl ON trades (panda_id, pnl_pct) WHERE pnl_pct IS NOT NULL;
CREATE INDEX idx_trades_decision ON trades USING GIN (decision_details);

-- 时间序列数据使用 BRIN 索引（对 created_at 按物理顺序排列时高效）
CREATE INDEX idx_trades_created_brin ON trades USING BRIN (created_at);
```

### 3.6 simulations — 模拟会话表

```sql
CREATE TABLE simulations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id        UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,
    strategy_id     UUID NOT NULL REFERENCES strategies(id) ON DELETE RESTRICT,

    status          TEXT NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running','completed','stopped')),
    speed           TEXT NOT NULL DEFAULT '1x'
                    CHECK (speed IN ('1x','10x','100x','instant')),

    -- 资金与绩效
    initial_capital DECIMAL(20,2) NOT NULL DEFAULT 10000.00,
    final_equity    DECIMAL(20,2),                  -- 结束时权益（running 时为 NULL）
    total_trades    INT NOT NULL DEFAULT 0,
    win_rate        DECIMAL(5,4),                    -- 胜率（0.0000-1.0000）
    max_drawdown    DECIMAL(5,4),                    -- 最大回撤

    data_source     TEXT NOT NULL DEFAULT 'csv'
                    CHECK (data_source IN ('csv','deepbook')),

    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ                      -- 完成/停止时间
);

COMMENT ON TABLE simulations IS '模拟交易会话，记录每轮模拟的配置与绩效';
COMMENT ON COLUMN simulations.speed IS '模拟速度：1x 实时, 10x/100x 加速, instant 瞬时回测';

CREATE INDEX idx_simulations_panda ON simulations (panda_id, started_at DESC);
CREATE INDEX idx_simulations_status ON simulations (status) WHERE status = 'running';

-- 为 trades.simulation_id 添加外键（需在 simulations 建表后）
ALTER TABLE trades ADD CONSTRAINT fk_trades_simulation
    FOREIGN KEY (simulation_id) REFERENCES simulations(id) ON DELETE CASCADE;
```

### 3.7 experience_patterns — 模式记忆表

```sql
CREATE TABLE experience_patterns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id        UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,

    pattern_hash    TEXT NOT NULL,                   -- 形态哈希（K 线形态的特征摘要）
    asset           TEXT NOT NULL
                    CHECK (asset IN ('BTC','ETH','SUI')),
    occurrences     INT NOT NULL DEFAULT 1,          -- 出现次数
    win_rate        DECIMAL(5,4) NOT NULL DEFAULT 0.5000,  -- 该形态下的历史胜率
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    market_condition TEXT NOT NULL DEFAULT 'sideways' -- 形态出现时的市场状态
                    CHECK (market_condition IN ('bull','bear','sideways')),

    UNIQUE (panda_id, pattern_hash, asset, market_condition)
);

COMMENT ON TABLE experience_patterns IS '熊猫的模式记忆：记录见过的 K 线形态及其胜率';
COMMENT ON COLUMN experience_patterns.pattern_hash IS '形态特征摘要哈希，用于快速匹配';

CREATE INDEX idx_exp_patterns_panda ON experience_patterns (panda_id);
CREATE INDEX idx_exp_patterns_lookup ON experience_patterns (panda_id, asset, market_condition);
```

### 3.8 experience_mastery — 资产专精表

```sql
CREATE TABLE experience_mastery (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id        UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,

    asset           TEXT NOT NULL
                    CHECK (asset IN ('BTC','ETH','SUI')),
    mastery_score   SMALLINT NOT NULL DEFAULT 0      -- 专精度 0-100
                    CHECK (mastery_score BETWEEN 0 AND 100),
    total_trades    INT NOT NULL DEFAULT 0,          -- 该资产总交易笔数

    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (panda_id, asset)
);

COMMENT ON TABLE experience_mastery IS '熊猫对各资产的专精度';
COMMENT ON COLUMN experience_mastery.mastery_score IS '专精度：(mastery-50)/200 作为信号修正系数';

CREATE INDEX idx_exp_mastery_panda ON experience_mastery (panda_id);
```

### 3.9 experience_mistakes — 错误反省表

```sql
CREATE TABLE experience_mistakes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id            UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,

    mistake_type        TEXT NOT NULL,               -- 错误类型
                                                     -- chase_high / panic_sell / fomo_entry / ...
    occurrences         INT NOT NULL DEFAULT 1,       -- 犯错次数
    vigilance_coefficient DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
                                                      -- 警惕系数（每次犯错 +0.33，上限 1.0）
    last_occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    decay_rate          DECIMAL(5,4) NOT NULL DEFAULT 0.0300,
                                                      -- 衰减速率（每周 -3%，60 天未犯则淡忘）

    UNIQUE (panda_id, mistake_type)
);

COMMENT ON TABLE experience_mistakes IS '熊猫的错误反省记录，影响信号修正';
COMMENT ON COLUMN experience_mistakes.vigilance_coefficient IS '警惕系数：每次同类错误信号 × (-0.10 × vigilance)';
COMMENT ON COLUMN experience_mistakes.decay_rate IS '60 天未犯同类错误，警惕系数每周衰减此比率';

CREATE INDEX idx_exp_mistakes_panda ON experience_mistakes (panda_id);
```

### 3.10 experience_cycles — 周期认知表

```sql
CREATE TABLE experience_cycles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id            UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,

    market_phase        TEXT NOT NULL
                        CHECK (market_phase IN ('bull','bear','sideways')),
    days_experienced    INT NOT NULL DEFAULT 0,       -- 在该市场阶段经历的天数
    performance_in_phase DECIMAL(8,4) NOT NULL DEFAULT 0.0000,
                                                      -- 该阶段的表现（PnL 百分比）

    UNIQUE (panda_id, market_phase)
);

COMMENT ON TABLE experience_cycles IS '熊猫对不同市场周期的认知深度';
COMMENT ON COLUMN experience_cycles.days_experienced IS '亲历天数 >30 天则获得周期认知修正 +0.20';

CREATE INDEX idx_exp_cycles_panda ON experience_cycles (panda_id);
```

### 3.11 emotions_log — 情绪变更日志

```sql
CREATE TABLE emotions_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id    UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,

    from_state  TEXT NOT NULL
                CHECK (from_state IN ('focused','excited','greedy','cautious','panicking','numb')),
    to_state    TEXT NOT NULL
                CHECK (to_state IN ('focused','excited','greedy','cautious','panicking','numb')),
    trigger     TEXT NOT NULL,                       -- 触发原因描述
                                                     -- 如 "win_streak_3", "single_loss_gt_5pct", "drawdown_gt_10pct"

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE emotions_log IS '熊猫情绪状态跳转的完整日志';
COMMENT ON COLUMN emotions_log.trigger IS '触发原因编码：win_streak_N / loss_gt_Npct / drawdown_gt_Npct / idle_N';

CREATE INDEX idx_emotions_log_panda ON emotions_log (panda_id, created_at DESC);
CREATE INDEX idx_emotions_log_created_brin ON emotions_log USING BRIN (created_at);
```

### 3.12 merkle_roots — Merkle Root 记录表

```sql
CREATE TABLE merkle_roots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id        UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,

    root_hash       TEXT NOT NULL,                   -- Merkle Root 哈希值
    trade_count     INT NOT NULL,                    -- 本次包含的交易笔数
    first_trade_id  UUID NOT NULL REFERENCES trades(id) ON DELETE RESTRICT,
    last_trade_id   UUID NOT NULL REFERENCES trades(id) ON DELETE RESTRICT,

    -- 链上提交状态
    chain_status    TEXT NOT NULL DEFAULT 'pending'
                    CHECK (chain_status IN ('pending','submitted','confirmed','failed')),
    sui_tx_digest   TEXT,                            -- Sui 链上交易哈希（提交后填入）

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at    TIMESTAMPTZ                      -- 提交到链上的时间
);

COMMENT ON TABLE merkle_roots IS '每 50 笔交易计算一次 Merkle Root，提交到链上验证';
COMMENT ON COLUMN merkle_roots.chain_status IS 'pending→submitted→confirmed/failed';

CREATE INDEX idx_merkle_roots_panda ON merkle_roots (panda_id, created_at DESC);
CREATE INDEX idx_merkle_roots_status ON merkle_roots (chain_status) WHERE chain_status IN ('pending','submitted');
```

### 3.13 achievements — 成就定义表

```sql
CREATE TABLE achievements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT NOT NULL UNIQUE,                -- 成就编码（如 first_trade, win_streak_10）
    name        TEXT NOT NULL,                       -- 成就名称
    description TEXT NOT NULL,                       -- 成就描述
    category    TEXT NOT NULL
                CHECK (category IN ('trading','growth','social','collection')),
    rarity      TEXT NOT NULL
                CHECK (rarity IN ('common','rare','epic','legendary')),
    icon_url    TEXT                                  -- 成就图标 URL
);

COMMENT ON TABLE achievements IS '成就系统：预定义的成就模板';

-- 预置数据示例（在 seed 脚本中执行）
-- INSERT INTO achievements (code, name, description, category, rarity) VALUES
--   ('first_trade', '初出茅庐', '完成第一笔交易', 'trading', 'common'),
--   ('win_streak_10', '势不可挡', '连续盈利 10 笔', 'trading', 'epic'),
--   ('btc_master', 'BTC 大师', 'BTC 专精度达到 90', 'growth', 'legendary'),
--   ('emotion_zen', '禅定大师', '连续 100 笔交易保持专注', 'growth', 'rare');
```

### 3.14 user_achievements — 用户成就解锁表

```sql
CREATE TABLE user_achievements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    panda_id        UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,
    achievement_id  UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,

    -- 链上 NFT 化状态
    chain_status    TEXT NOT NULL DEFAULT 'pending'
                    CHECK (chain_status IN ('pending','confirmed')),
    sui_tx_digest   TEXT,                            -- 成就 NFT 铸造交易哈希

    unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (user_id, achievement_id)
);

COMMENT ON TABLE user_achievements IS '用户解锁的成就记录，可选铸造为链上 NFT';

CREATE INDEX idx_user_achievements_user ON user_achievements (user_id);
CREATE INDEX idx_user_achievements_panda ON user_achievements (panda_id);
```

### 3.15 checkins — 签到表

```sql
CREATE TABLE checkins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    streak_count    INT NOT NULL DEFAULT 1,          -- 连续签到天数
    checkin_date    DATE NOT NULL,                    -- 签到日期
    reward_type     TEXT NOT NULL,                    -- 奖励类型：exp_boost / calm_bamboo / strategy_hint
    reward_amount   DECIMAL(10,2) NOT NULL DEFAULT 0, -- 奖励数值

    UNIQUE (user_id, checkin_date)
);

COMMENT ON TABLE checkins IS '用户每日签到记录';
COMMENT ON COLUMN checkins.streak_count IS '连续签到天数，中断则重置为 1';

CREATE INDEX idx_checkins_user ON checkins (user_id, checkin_date DESC);
```

### 3.16 market_data_cache — 市场数据缓存表

```sql
CREATE TABLE market_data_cache (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    asset       TEXT NOT NULL
                CHECK (asset IN ('BTC','ETH','SUI')),
    source      TEXT NOT NULL DEFAULT 'csv'
                CHECK (source IN ('csv','deepbook','external_api')),
    timestamp   TIMESTAMPTZ NOT NULL,                -- K 线时间戳

    -- OHLCV
    open        DECIMAL(20,8) NOT NULL,
    high        DECIMAL(20,8) NOT NULL,
    low         DECIMAL(20,8) NOT NULL,
    close       DECIMAL(20,8) NOT NULL,
    volume      DECIMAL(20,4) NOT NULL,

    -- 预计算技术指标
    rsi         DECIMAL(8,4),                        -- RSI 14
    ma20        DECIMAL(20,8),                       -- 20 周期均线
    volatility  DECIMAL(8,4),                        -- 波动率

    raw_data    JSONB                                -- 原始数据（DeepBook 完整响应等）
);

COMMENT ON TABLE market_data_cache IS '市场数据缓存，来自 CSV 导入或 DeepBook 实时数据';

-- 复合唯一约束：同一资产+数据源+时间戳不重复
CREATE UNIQUE INDEX idx_market_data_unique ON market_data_cache (asset, source, timestamp);

-- 时间序列查询优化
CREATE INDEX idx_market_data_asset_ts ON market_data_cache (asset, timestamp DESC);
CREATE INDEX idx_market_data_brin ON market_data_cache USING BRIN (timestamp);
CREATE INDEX idx_market_data_raw ON market_data_cache USING GIN (raw_data)
    WHERE raw_data IS NOT NULL;
```

### 3.17 correlation_matrix — 资产相关性矩阵表

```sql
CREATE TABLE correlation_matrix (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    asset_a         TEXT NOT NULL
                    CHECK (asset_a IN ('BTC','ETH','SUI')),
    asset_b         TEXT NOT NULL
                    CHECK (asset_b IN ('BTC','ETH','SUI')),
    correlation     DECIMAL(6,4) NOT NULL            -- Pearson 相关系数 (-1.0000 ~ 1.0000)
                    CHECK (correlation BETWEEN -1.0000 AND 1.0000),
    window_days     INT NOT NULL DEFAULT 30,         -- 计算窗口（天）
    calculated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (asset_a, asset_b, window_days),
    CHECK (asset_a < asset_b)                        -- 防止 (BTC,ETH) 和 (ETH,BTC) 重复
);

COMMENT ON TABLE correlation_matrix IS '多资产 Pearson 相关性矩阵，定期重算';
COMMENT ON COLUMN correlation_matrix.window_days IS '默认 30 天窗口，Lv.3+ 熊猫可用于环境感知';

CREATE INDEX idx_correlation_calc ON correlation_matrix (calculated_at DESC);
```

### 3.18 panda_diary — 熊猫日记表

```sql
CREATE TABLE panda_diary (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panda_id        UUID NOT NULL REFERENCES pandas(id) ON DELETE CASCADE,

    content         TEXT NOT NULL,                    -- 熊猫自语内容（第一人称视角）
    trigger_type    TEXT NOT NULL
                    CHECK (trigger_type IN ('conflict','extreme_emotion','milestone','routine')),
    context         JSONB,                            -- 触发上下文
                                                      -- {market_state, emotion, trade_id, pattern_hash, ...}
    source          TEXT NOT NULL DEFAULT 'template'
                    CHECK (source IN ('template','llm')),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE panda_diary IS '熊猫日记：LLM 或模板生成的第一人称自语';
COMMENT ON COLUMN panda_diary.trigger_type IS 'conflict=经验与策略冲突, extreme_emotion=极端情绪, milestone=里程碑, routine=日常';
COMMENT ON COLUMN panda_diary.source IS 'template=预制模板填充, llm=DeepSeek 生成';

CREATE INDEX idx_panda_diary_panda ON panda_diary (panda_id, created_at DESC);
CREATE INDEX idx_panda_diary_trigger ON panda_diary (panda_id, trigger_type);
CREATE INDEX idx_panda_diary_context ON panda_diary USING GIN (context)
    WHERE context IS NOT NULL;
```

---

## 四、索引策略

### 4.1 索引设计原则

| 索引类型 | 适用场景 | 已应用表 |
|----------|---------|---------|
| B-Tree（默认）| 等值查询、范围查询、排序 | 所有表的主查询字段 |
| GIN | JSONB 字段内部查询 | strategies.parsed_json, trades.decision_details, market_data_cache.raw_data, panda_diary.context |
| BRIN | 时间序列数据（物理有序） | trades.created_at, emotions_log.created_at, market_data_cache.timestamp |
| 部分索引 | 仅索引活跃子集 | strategies (is_active=TRUE), strategy_history (ghost_weight>0.01), simulations (status='running') |

### 4.2 高频查询与索引覆盖

```
查询: 获取熊猫最近交易
  → idx_trades_panda (panda_id, created_at DESC)

查询: 查找运行中的模拟
  → idx_simulations_status (status) WHERE status = 'running'

查询: 获取熊猫当前激活策略
  → idx_strategies_active (panda_id) WHERE is_active = TRUE

查询: 市场数据按资产和时间范围检索
  → idx_market_data_asset_ts (asset, timestamp DESC)
  → idx_market_data_brin (timestamp) 用于大范围扫描

查询: 待同步的 Walrus 数据
  → idx_pandas_walrus_sync (walrus_sync_status) WHERE != 'synced'

查询: 查找特定形态在特定市场条件下的记忆
  → idx_exp_patterns_lookup (panda_id, asset, market_condition)

查询: JSONB 内部检索（如策略的 signal_rules 中包含 RSI）
  → idx_strategies_parsed GIN 索引 + @> 操作符
```

### 4.3 索引维护建议

- 定期执行 `VACUUM ANALYZE` 更新统计信息
- 监控 `pg_stat_user_indexes` 确认索引实际使用率
- 对 trades 等高频写入表，BRIN 索引比 B-Tree 更节省空间（约 1/100）

---

## 五、数据生命周期

### 5.1 温度分层

| 温度 | 时间范围 | 存储位置 | 访问模式 |
|------|---------|---------|---------|
| **热数据** | 最近 7 天 | PostgreSQL（直接查询，命中缓存） | 决策引擎实时读写、API 直接返回 |
| **温数据** | 7-90 天 | PostgreSQL（带索引） | 历史查询、统计分析、经验引擎检索 |
| **冷数据** | 90 天+ | PostgreSQL 保留摘要 + Walrus 归档 | 偶尔查询、NFT 转让时恢复 |

### 5.2 归档策略

```sql
-- 90 天以上的 trades 归档到 Walrus 后，可选删除原始 decision_details
-- 保留核心字段用于统计

-- 归档前：完整记录
-- 归档后：decision_details → NULL，raw_signal/filtered_signal 保留

-- 定期归档任务（建议用 pg_cron 或应用层定时任务）
UPDATE trades
SET decision_details = NULL
WHERE created_at < now() - INTERVAL '90 days'
  AND decision_details IS NOT NULL
  AND panda_id IN (
      SELECT id FROM pandas WHERE walrus_sync_status = 'synced'
  );
```

### 5.3 数据量预估

| 表 | 每只熊猫/天 | 100 只/月 | 行大小（估） |
|---|-----------|----------|-----------|
| trades | ~200 行 | 600,000 行 | ~500 bytes |
| emotions_log | ~5 行 | 15,000 行 | ~100 bytes |
| market_data_cache | 共享 ~4,320 行/资产 | ~388,800 行 | ~200 bytes |
| experience_patterns | ~10 行（去重累加） | ~3,000 行 | ~150 bytes |

100 只熊猫一个月总数据量约 **300-500 MB**，Supabase Free Tier 500MB 存储刚好够用。需要关注 trades 表的增长。

---

## 六、Walrus 同步策略

### 6.1 同步触发条件

| 触发条件 | 优先级 | 说明 |
|---------|-------|------|
| 每 50 笔交易 | 常规 | 与 Merkle Root 计算同步触发 |
| 每日定时（UTC 00:00） | 常规 | 兜底同步，确保数据不超过 24 小时未备份 |
| NFT 转让前 | **强制** | is_trading 检查通过后、转让执行前，必须完成同步 |
| 用户手动触发 | 按需 | Pro 版功能 |

### 6.2 同步数据格式

```json
{
  "version": "1.0",
  "panda_id": "uuid-xxx",
  "sui_object_id": "0x...",
  "synced_at": "2026-05-08T12:00:00Z",

  "experience": {
    "patterns": [
      {
        "pattern_hash": "0x3f2a...",
        "asset": "BTC",
        "occurrences": 21,
        "win_rate": 0.25,
        "market_condition": "sideways",
        "last_seen_at": "2026-05-07T18:30:00Z"
      }
    ],
    "mastery": [
      { "asset": "BTC", "mastery_score": 73, "total_trades": 450 },
      { "asset": "ETH", "mastery_score": 45, "total_trades": 210 }
    ],
    "mistakes": [
      {
        "mistake_type": "chase_high",
        "occurrences": 3,
        "vigilance_coefficient": 0.99,
        "decay_rate": 0.03
      }
    ],
    "cycles": [
      { "market_phase": "bull", "days_experienced": 45, "performance": 0.12 },
      { "market_phase": "bear", "days_experienced": 12, "performance": -0.08 }
    ]
  },

  "strategy_history": [
    {
      "strategy_hash": "sha256-xxx",
      "proficiency_at_switch": 65,
      "ghost_weight": 0.42,
      "trades_since_switch": 120
    }
  ],

  "trade_summary": {
    "total_trades": 1250,
    "win_rate": 0.52,
    "total_pnl_pct": 15.6,
    "best_trade_pnl": 8.2,
    "worst_trade_pnl": -5.1
  }
}
```

### 6.3 同步流程

```
1. 触发同步条件
2. 从 PostgreSQL 聚合经验数据 → JSON
3. 调用 walrus-python SDK 写入 blob
4. 获取 blob_id
5. 更新 pandas 表：
   - walrus_blob_id = 新 blob_id
   - walrus_last_synced_at = now()
   - walrus_sync_status = 'synced'
6. 更新链上 dynamic_field 的 blob_id（可选，仅 NFT 转让前强制）
```

### 6.4 故障恢复

```
同步失败时：
1. walrus_sync_status 标记为 'failed'
2. 记录错误日志
3. 下次触发条件到达时自动重试
4. 连续 3 次失败 → 告警通知
5. NFT 转让前如果同步失败 → 阻止转让（is_trading 锁不释放）

数据恢复（新主人）：
1. 从链上 dynamic_field 读取 blob_id
2. walrus-python SDK 读取 blob
3. 解析 JSON → 写入 PostgreSQL 各经验表
4. 验证数据完整性（trade_summary 校验）
```

---

## 七、与链上数据的同步

### 7.1 事件监听架构

```
Sui 全节点 / RPC
    │
    │  WebSocket 订阅 / 轮询
    ▼
┌─────────────────────┐
│  事件监听服务         │
│  (Python asyncio)   │
│                     │
│  监听事件类型：        │
│  - MintEvent        │
│  - TransferEvent    │
│  - StrategyUpdate   │
│  - MerkleRootSubmit │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    PostgreSQL       │
│  更新对应表记录       │
└─────────────────────┘
```

### 7.2 铸造事件 → 创建 pandas 记录

```
链上事件: MintEvent {
    object_id: 0x...,
    owner: 0x...,
    boldness: 75,
    patience: 42,
    intuition: 88,
    focus: 33,
    contrarian: 61,
    talent: 0
}

处理流程：
1. 通过 owner 地址查找或创建 users 记录
2. 创建 pandas 记录：
   - sui_object_id = event.object_id
   - owner_id = users.id
   - 性格五轴从事件读取
   - talent, experience_level, emotion_state 取默认值
3. 初始化经验表：
   - experience_mastery: BTC/ETH/SUI 各一行，mastery_score=0
   - experience_cycles: bull/bear/sideways 各一行，days=0
```

### 7.3 转让事件 → 更新 owner_id

```
链上事件: TransferEvent {
    object_id: 0x...,
    from: 0x...,
    to: 0x...
}

处理流程：
1. 前置检查：pandas.is_trading 应为 FALSE（链上合约已保证）
2. 查找或创建新 owner 的 users 记录
3. 更新 pandas.owner_id = 新 owner 的 users.id
4. 触发 Walrus 数据恢复流程（如果新 owner 需要完整经验数据）
5. 策略保留：strategies 记录不变（策略跟随熊猫，不跟随用户）
```

### 7.4 Merkle Root 确认 → 更新链上状态

```
链上事件: MerkleRootConfirmed {
    tx_digest: "...",
    root_hash: "...",
    panda_id: 0x...
}

处理流程：
1. 通过 root_hash 匹配 merkle_roots 记录
2. 更新：
   - chain_status = 'confirmed'
   - sui_tx_digest = event.tx_digest
   - submitted_at = now()（如果之前未记录）
```

### 7.5 数据一致性保证

| 场景 | 策略 |
|------|------|
| 链上为权威（性格五轴、天赋） | PostgreSQL 仅缓存，定期校验与链上一致 |
| PostgreSQL 为权威（经验、情绪、交易） | 链上只存哈希/摘要，完整数据在 DB |
| 事件丢失 | 监听服务记录 checkpoint（cursor），重启后从断点继续 |
| 数据不一致 | 定期（每日）全量校验 pandas 表与链上对象，不一致时以链上为准更新 |

---

## 附录：updated_at 自动更新触发器

```sql
-- 通用的 updated_at 自动更新函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要 updated_at 的表创建触发器
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_pandas_updated_at
    BEFORE UPDATE ON pandas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 附录 A：order_fills 与 K 线数据说明

### A.1 order_fills 作为 K 线唯一数据源

> **2026-05-20 架构更新**：K 线数据不再依赖 DeepBook Server 的 `/ohclv` 端点和物化视图。

| 变化 | 说明 |
|------|------|
| ohclv_1m / ohclv_1d 表 | **不再需要** — K 线由 WebSocket 服务实时从 order_fills 聚合 |
| K 线数据源 | `order_fills` 表是 K 线数据的唯一来源 |
| 查询方式 | K 线 WebSocket 服务通过 `last_id` 游标增量轮询 order_fills |
| 数据流向 | **Indexer** 写入 `order_fills` → **market-monitor** 聚合 → Redis `market:tick` → Hub/DE；历史 K 线 REST `GET /candles`（方案甲）。可选：独立 K-line WSS（方案乙） |
| 数据保留 | order_fills 保留全部历史，K 线服务根据数据保留策略自行截取时间范围 |

详细设计见 **`docs/kline-websocket-service.md`**。
