# TradingPanda Decision Engine (Backend)

Python 3.10+ · FastAPI · 八步决策管线 · PandaActor · Redis Pub/Sub

本服务负责：**订阅行情** → **跑 8 步决策** → **模拟成交** → **写 PostgreSQL** → **发布 `panda:*` 事件**。

设计文档：`docs/agent-design.md`、`docs/backend-design.md`、`docs/redis-architecture.md`  
部署事实：`dev-docs/DEV_CONTEXT.md`

---

## 本地开发：分步指南（venv）

以下步骤在 **`backend/` 目录** 内完成。所有 `python` / `pip` 命令均应在 **已激活的虚拟环境** 中执行。

### 前置条件

| 项 | 要求 |
|----|------|
| Python | 3.10 或 3.11（推荐 3.10，与仓库当前联调一致） |
| PostgreSQL | Supabase 或本地 Postgres；需能写入 `DATABASE_URL` |
| Redis | 可选；L4+ 联调需要，与 `market-monitor` 共用同一 Upstash 实例 |
| 终端 | macOS / Linux；Windows 用 WSL 或 Git Bash |

### 第 0 步：进入目录

```bash
cd /path/to/Trading-Panda/backend
```

后续命令默认当前目录为 `backend/`。

---

### 第 1 步：创建并激活虚拟环境

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
```

确认使用的是 venv 里的解释器（**不要**用到 pyenv 全局的 `alembic`）：

```bash
which python
# 期望: .../Trading-Panda/backend/.venv/bin/python

which pip
# 期望: .../Trading-Panda/backend/.venv/bin/pip
```

若 `which python` 仍指向 `~/.pyenv/...`，先 `deactivate` 再重新 `source .venv/bin/activate`。

---

### 第 2 步：安装依赖

```bash
pip install --upgrade pip
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

清华源仍报 `No matching distribution` / `from versions: none` 时，改用官方 PyPI：

```bash
pip install -r requirements.txt -i https://pypi.org/simple
```

| 文件 | 说明 |
|------|------|
| `requirements.txt` | 核心依赖（FastAPI、SQLAlchemy、asyncpg、Alembic、pytest…） |
| `requirements-sui.txt` | 可选；链上 `pysui`（需 Rust，MVP 决策引擎可不装） |
| `pip.conf.example` | 可复制到 `~/.pip/pip.conf` 固定镜像源 |

**不要用** 旧地址 `https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple`（常缺包）。

---

### 第 3 步：配置环境变量

```bash
cp .env.example .env
```

编辑 `backend/.env`，至少配置：

```env
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=rediss://...          # 可选，L1 单元测试不需要
```

#### `DATABASE_URL` 写法（Supabase）

代码会把 `postgresql://` 自动补成 `postgresql+asyncpg://`。**不要**用裸 `postgresql://`，否则会去找 `psycopg2` 并报错。

**迁移 / DDL（推荐 Direct 连接）** — 在 Supabase Dashboard：**Settings → Database → Connection string → Direct**：

```env
DATABASE_URL=postgresql+asyncpg://postgres:你的密码@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

- 用户名：`postgres`（无 `.ref` 后缀）
- 主机：`db.<project-ref>.supabase.co`
- 端口：`5432`

**运行时 Pooler（可选）** — 使用 Dashboard 里 **Session / Transaction pooler** 的完整 URI，勿手拼 `aws-0-[region]`：

```env
DATABASE_URL=postgresql+asyncpg://postgres.xxxxxxxxxxxx:密码@aws-1-xx-xxxx.pooler.supabase.com:6543/postgres
```

- 用户名必须是 `postgres.<project-ref>`
- 主机名、区域以 Dashboard 为准（可能是 `aws-1-...` 而非 `aws-0-...`）

若连接报 `Tenant or user not found`：检查用户名是否含 project ref、主机是否与 Dashboard 一致、密码特殊字符是否 URL 编码（`@` → `%40`）。可加：

```env
?ssl=require
```

贴在 URL 末尾。

`REDIS_URL` 从 Upstash 控制台复制 **Python** 用的 `rediss://` 整串（不是 REST URL）。

---

### 第 4 步：数据库迁移（Alembic）

**必须先迁移再启动 FastAPI**（已移除启动时 `create_all`）。

```bash
# 仍在 backend/ 且 (.venv) 已激活
python -m alembic upgrade head
```

等价写法：

```bash
bash scripts/migrate.sh upgrade head
```

| 命令 | 说明 |
|------|------|
| `python -m alembic upgrade head` | 应用全部迁移 |
| `python -m alembic current` | 查看当前 revision（期望 `001_initial_core`） |
| `python -m alembic downgrade -1` | 回滚上一版 |

首版 migration 创建 6 张核心表：`users` · `pandas` · `strategies` · `strategy_history` · `simulations` · `trades`。Schema 见 `docs/database-schema.md`。

---

### 第 5 步：验证数据库与种子数据

```bash
python scripts/verify_db.py
python scripts/seed_dev.py
```

**`verify_db.py` 期望输出：**

```text
ping: ok
table users: ok
table pandas: ok
...
alembic_version: 001_initial_core
```

**`seed_dev.py` 期望输出（记下 ID，供 L4/L5 联调）：**

```text
seed: created dev fixtures
  user_id=...
  panda_id=...
  strategy_id=...
  simulation_id=...
  wallet=0xdev_seed_user_trading_panda_local_only
```

再次执行 `seed_dev.py` 会显示 `seed: already exists`（幂等）。

> 脚本须在 `backend/` 下运行；已内置 `scripts/_bootstrap.py` 自动加入 `app` 模块路径。若报 `No module named 'app'`，确认当前目录为 `backend/` 而非仓库根目录。

---

### 第 6 步：启动 API 服务

```bash
uvicorn main:app --reload --port 8000
```

或：

```bash
python -m uvicorn main:app --reload --port 8000
```

---

### 第 7 步：健康检查

另开终端（同样 `cd backend && source .venv/bin/activate`）：

```bash
curl -s http://localhost:8000/health | jq .
```

| 字段 | 期望（最小可运行） |
|------|-------------------|
| `status` | `"ok"` |
| `db` | `"connected"`（已配 `DATABASE_URL` 且迁移成功） |
| `redis` | `"configured"` 或 `"not configured"`（未配 Redis 时后者正常） |
| `active_actors` | `0`（未 start Actor 前） |

浏览器打开 [http://localhost:8000/docs](http://localhost:8000/docs) 查看 OpenAPI。

---

### 第 8 步：单元测试（可选）

不依赖数据库与 Redis：

```bash
pytest tests/ -q
```

---

### 一条龙命令（复制用）

已熟悉流程后可合并执行（Supabase `.env` 已填好前提下）：

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt -i https://pypi.org/simple
cp -n .env.example .env   # 首次；再手动编辑 DATABASE_URL
python -m alembic upgrade head
python scripts/verify_db.py
python scripts/seed_dev.py
uvicorn main:app --reload --port 8000
```

---

## 本地开发排障

| 现象 | 处理 |
|------|------|
| `No module named 'app'`（Alembic / scripts） | 在 `backend/` 目录执行；Alembic 用 `python -m alembic`，勿用 pyenv 全局 `alembic` |
| `No module named 'psycopg2'` | `DATABASE_URL` 改为 `postgresql+asyncpg://...` |
| `InterpolationMissingOptionError` / `DATABASE_URL` in alembic.ini | 已修复：URL 只从 `backend/.env` 读取，勿在 `alembic.ini` 写 `%(DATABASE_URL)s` |
| `KeyError: 'qualname'` | 更新仓库内 `alembic.ini`（需含 logger `qualname`） |
| pip `from versions: none` | 换 `https://pypi.tuna.tsinghua.edu.cn/simple` 或 `https://pypi.org/simple` |
| Supabase `Tenant or user not found` | Pooler 用户名为 `postgres.<ref>`；主机从 Dashboard 复制；迁移优先用 Direct `db.*.supabase.co:5432` |
| `/health` → `db: error` | 检查密码 URL 编码、网络、Supabase 项目是否暂停 |
| `verify_db` 某表 `MISSING` | 先 `python -m alembic upgrade head` |

---

## 环境变量速查

| 变量 | 必需 | 说明 |
|------|------|------|
| `DATABASE_URL` | 是（跑 DB / Actor） | `postgresql+asyncpg://...`；见上文 Supabase 说明 |
| `REDIS_URL` | L4+ | `rediss://…`，与 market-monitor 同库 |
| `DEEPSEEK_API_KEY` | 否 | 策略解析 / 观望区 Agent |
| `JWT_SECRET` | 鉴权 API | 默认 dev 值，生产必换 |
| `MAX_ACTORS` | 否 | 默认 `100` |

完整列表见 `backend/.env.example`。

---

## 快速启动（TL;DR）

```bash
cd backend && source .venv/bin/activate
python -m alembic upgrade head && python scripts/verify_db.py && python scripts/seed_dev.py
uvicorn main:app --reload --port 8000
```

---

## 架构速览

```
market-monitor  ──PUBLISH──►  Redis market:tick:{pair}
                                    │
                                    │ PSUBSCRIBE
                                    ▼
                            MarketDataConsumer
                                    │
                                    ▼
                            ActorManager ──► PandaActor (每只熊猫一个)
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            DecisionPipeline   EmotionStateMachine  ExperienceEngine
            (8 步, <50ms)      (7 状态)            (PostgreSQL)
                    │
                    ▼
            EXECUTE / OBSERVE / IGNORE
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
  PostgreSQL trades      Redis panda:{id}:decision|emotion
```

### 核心目录

| 路径 | 职责 |
|------|------|
| `app/engine/decision_pipeline.py` | 8 步决策管线 |
| `app/engine/rule_engine.py` | 策略 `signal_rules` 匹配 |
| `app/engine/panda_actor.py` | 单熊猫运行时、模拟成交 |
| `app/engine/actor_manager.py` | Actor 生命周期 + 行情扇出 |
| `app/engine/market_consumer.py` | Redis `market:tick:*` 订阅 |
| `app/engine/event_publisher.py` | Redis `panda:*` 发布 |
| `tests/` | 单元测试（pytest） |

### HTTP API（决策引擎）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查（含 `active_actors`、`redis` 状态） |
| `POST` | `/engine/actors/{panda_id}/start` | 启动 PandaActor |
| `POST` | `/engine/actors/{panda_id}/stop` | 停止 |
| `GET` | `/engine/actors/{panda_id}/state` | 状态快照（含 `last_decision` 八步链） |
| `POST` | `/engine/market/tick` | **内部注入** 行情（不经过 Redis，联调用） |
| `POST` | `/engine/strategy/parse` | 自然语言策略解析（需 JWT） |

---

## 测试分层总览

从快到慢、从隔离到全链路，建议按层推进，上一层通过再测下一层。

```mermaid
flowchart TB
    L1[L1 单元测试 pytest<br/>不连 Redis / DB]
    L2[L2 管线确定性测试<br/>固定 seed + Battle Case]
    L3[L3 Redis 管道<br/>market-monitor → Redis]
    L4[L4 DE 订阅联调<br/>backend + REDIS_URL]
    L5[L5 端到端<br/>Actor → trades / panda:*]

    L1 --> L2 --> L3 --> L4 --> L5
```

| 层级 | 测什么 | 依赖服务 | 典型耗时 |
|------|--------|----------|----------|
| **L1** | 规则引擎、8 步公式、情绪机、策略残影 | 仅 Python | 秒级 |
| **L2** | 固定人格/行情 → 分数、动作、延迟是否符合预期 | pytest | 秒级 |
| **L3** | monitor 是否持续 `PUBLISH market:tick:*` | Redis + market-monitor | 1～2 分钟 |
| **L4** | DE 是否订阅并驱动 Actor 更新 `last_decision` | + backend | 数分钟 |
| **L5** | 成交落库、`panda:*` 事件、情绪迁移 | + PostgreSQL 完整数据 | 十数分钟 |

**覆盖率目标**（见 `docs/testing-strategy.md`）：决策引擎核心路径 ≥ 80%；Battle Case 4/4 回归。

---

## L1：单元测试（每天开发必跑）

**目的**：验证八步数学与边界，**不启动** Redis、PostgreSQL、market-monitor。

```bash
cd backend
pytest tests/ -v
```

可选覆盖率：

```bash
pytest tests/ --cov=app.engine --cov-report=term-missing
```

### 测试文件（112 用例，`pytest tests/ -q`）

| 文件 | 覆盖内容 |
|------|----------|
| `tests/conftest.py` | 共享 fixture、`CRASH_MARKET`、策略模板 |
| `tests/test_rule_engine.py` | RSI/MA/MACD、买卖方向、多规则 |
| `tests/test_step1_philosophy.py` | 哲学加成、直觉路径 |
| `tests/test_step2_proficiency.py` | 四档噪声、胆识放大 |
| `tests/test_step3_experience.py` | 模式/专精/踩坑/周期四项 |
| `tests/test_step4_fusion.py` | 幼/成/熟权重、残影 blend、对抗剧 |
| `tests/test_step5_personality.py` | 门槛、耐性延迟、专注加成 |
| `tests/test_step6_environment.py` | 市场匹配表、感知、相关性 |
| `tests/test_step7_social.py` | 群体信号 × 逆向性 |
| `tests/test_step8_emotion.py` | 七情绪、稳定性压扁、门槛修正 |
| `tests/test_verdict.py` | EXECUTE/OBSERVE/IGNORE、SELL 路径 |
| `tests/test_control_variables.py` | CV-01～CV-08 |
| `tests/test_battle_cases.py` | 阿暴/阿稳/阿鬼/不适配 四剧本 |
| `tests/test_decision_pipeline.py` | 冒烟 + 情绪状态机 |
| `tests/test_strategy_ghost.py` | 残影衰减与封顶 |

### 约定

- 管线使用固定随机种子：`DecisionPipeline(rng=random.Random(42))`，Step 2 熟练度噪声可复现。
- 不测试 `PandaActor` 异步循环与 Redis 连接。

### 通过标准

- `pytest tests/` 全部 PASSED。

---

## L2：管线确定性 / Battle Case（规划中）

**目的**：用文档固定案例（阿暴 / 阿稳 / 阿鬼 / BTC 闪崩）约束「同样输入 → 同样区间输出」。

来源：`docs/testing-strategy.md` §3.2、`preparation/PRD/battle-cases.md`（若存在）。

**计划文件**：`tests/test_battle_cases.py`（尚未全部落地）。

### 示例断言（讨论标准）

| 案例 | 期望（示意） |
|------|----------------|
| 阿暴 + RSI=23 闪崩 | `action=BUY`，`entry_delay=0`，`|final_score|` 超个人门槛 |
| 阿稳 + 同上 | `entry_delay >= 3`，仓位低于策略满额 |
| 阿鬼 + 群体恐慌 | 社交偏移项非零（正式版） |

### 通过标准

- Battle Case 4/4 自动化通过（PR 合并前目标）。

---

## L3：Redis 管道（market-monitor → Redis）

**目的**：在测 DE 之前，确认 **行情水管** 畅通；与 backend 无关。

### 3.1 market-monitor 健康

```bash
curl -s http://localhost:8001/health | jq .
```

关注：`redis_connected`、各 pool 是否报错。

### 3.2 旁听 `market:tick:*`

```bash
# 与 market-monitor、backend 使用同一 REDIS_URL（rediss://）
redis-cli -u "$REDIS_URL" PSUBSCRIBE 'market:tick:*'
```

**期望**：每隔 `POLL_INTERVAL_SEC`（约 15s）收到 JSON，字段包含：

- `asset`, `pair`, `price`, `rsi`, `ma20`, `market_regime`, `trend_strength`, `volatility` 等

与 `market-monitor/broadcast/schemas.py` 中 `MarketEvent` 一致。

### 3.3 market-monitor 集成探针（可选）

```bash
cd market-monitor
python _integration_probe.py
```

### 通过标准

- 能持续收到 `market:tick:{pair}` 消息 → L3 通过。
- 若此处失败，应先修 monitor / Redis，再测 backend。

---

## L4：DE + Redis 联调

**目的**：验证 `MarketDataConsumer` 订阅、`ActorManager` 扇出、八步管线在真实 tick 下更新状态。

### 4.1 前置条件

1. `market-monitor` 与 `backend` 的 **`REDIS_URL` 指向同一 Upstash 实例**（`rediss://`，不是 REST Token）。
2. backend 已启动：

   ```bash
   cd backend && uvicorn main:app --port 8000
   ```

3. `/health` 检查：

   ```bash
   curl -s http://localhost:8000/health | jq .
   ```

   | 字段 | 期望 |
   |------|------|
   | `redis` | `"configured"` |
   | `db` | `"connected"`（跑 L5 时必需） |
   | `active_actors` | start 后 ≥ 1 |

应用启动时会 `actor_manager.startup()` → `PSUBSCRIBE market:tick:*`。

### 4.2 方法 A：真链路（推荐）

```bash
# 若已跑 seed_dev.py，用脚本输出的 panda_id / simulation_id
export PANDA_ID="your-panda-uuid"
export SIM_ID="your-simulation-uuid"

curl -X POST "http://localhost:8000/engine/actors/${PANDA_ID}/start" \
  -H "Content-Type: application/json" \
  -d "{\"panda_id\":\"${PANDA_ID}\",\"simulation_id\":\"${SIM_ID}\",\"speed\":\"1x\"}"

# 每 5～15 秒查看（与 monitor 轮询间隔对齐）
curl -s "http://localhost:8000/engine/actors/${PANDA_ID}/state" | jq .
```

**通过标准**：

- `/health` 中 `active_actors >= 1`
- `last_decision` 出现且含 `steps`（8 步）、`action`、`final_score`
- 多次 EXECUTE 后 `trade_count`、`equity` 有变化

### 4.3 方法 B：绕过 monitor，只测 DE 大脑

不验证 Redis 订阅，只验证「tick → 管线 → state」：

```bash
curl -X POST "http://localhost:8000/engine/market/tick" \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "SUI",
    "pair": "SUI-USDC",
    "price": 3.2,
    "prev_price": 3.3,
    "rsi": 23,
    "ma20": 3.25,
    "prev_ma20": 3.28,
    "market_regime": "bear",
    "trend_strength": 0.8,
    "volatility": 0.1
  }'
```

**排障**：若 B 有 `last_decision` 而 A 没有 → 优先查 `REDIS_URL`、monitor 是否在发 tick、资产名是否与 Actor 订阅一致。

### 通过标准

- 方法 A 或 B 能使 `last_decision` 在 1～2 个 poll 周期内更新。

---

## L5：端到端（决策 → 模拟成交 → 持久化）

**目的**：验证副作用：PostgreSQL、`panda:*` Redis 频道、情绪日志。

### 5.1 数据库前置数据

`PandaActor.hydrate()` 需要：

| 数据 | 表 | 说明 |
|------|-----|------|
| 熊猫 | `pandas` | 五轴、`emotion_state`、`experience_level` |
| 活跃策略 | `strategies` | `is_active=true`，`parsed_json` 含 `signal_rules` |
| 模拟盘 | `simulations` | **建议预先插入**；`trades.simulation_id` 外键依赖 |

**常见坑**：

- 前端 `simulation/start` 可能用 `crypto.randomUUID()` 生成 `simulation_id`，但 DB 无对应行 → 决策能跑，写 `trades` 可能失败。
- 测试时请在 DB 插入 `simulations` 行，start 请求使用该 `id`。
- `DATABASE_URL` 未配置时 `hydrate()` 失败，八步分数接近 0。

### 5.2 启动 Actor 并等待 tick

同 L4 方法 A；或配合 L4 方法 B 快速触发决策。

### 5.3 旁听 DE 输出频道

```bash
redis-cli -u "$REDIS_URL" PSUBSCRIBE 'panda:*'
```

期望频道示例：

- `panda:{panda_id}:decision` — 含 `action`、`final_score`、`steps`
- `panda:{panda_id}:emotion` — 情绪迁移

### 5.4 数据库验收

```sql
SELECT id, action, final_score, emotion_at_trade, decision_details, created_at
FROM trades
WHERE panda_id = 'YOUR_PANDA_ID'
ORDER BY created_at DESC
LIMIT 10;
```

`decision_details` 中应包含 8 步 `steps`。

### 5.5 关于「买入 / 卖出」

MVP 为 **模拟盘（paper trade）**：更新内存 `positions`、`equity`，写入 `trades` 表，**不会在 DeepBook 真实下单**。链上下单为后续阶段。

### 通过标准

- [ ] `trades` 表有新行（需合法 `simulation_id` + `strategy_id`）
- [ ] Redis 收到 `panda:{id}:decision`
- [ ] 多次 EXECUTE 后 `simulations.total_trades` / `final_equity` 更新

---

## DE 验收清单（可打印勾选）

### A. 无外部依赖

- [ ] `pytest tests/` 全绿
- [ ] 固定 seed：RSI&lt;30 + 高胆识 → `zone=EXECUTE` 或 `|final_score| > entry_threshold`

### B. Redis 管道（market-monitor 已运行）

- [ ] `PSUBSCRIBE market:tick:*` 持续有消息
- [ ] payload 含 `rsi`、`market_regime`、`pair`

### C. DE 订阅（backend 已运行）

- [ ] `/health` → `redis: configured`
- [ ] start Actor 后，仅依赖真实 tick，`/state.last_decision` 在 1～2 个 poll 周期内更新

### D. 决策质量

- [ ] 注入 tick（RSI=23）→ `action=BUY`，`len(steps)==8`
- [ ] Battle Case 4/4（自动化，待补 `test_battle_cases.py`）

### E. 副作用

- [ ] `trades` 表有新行
- [ ] `panda:*` Redis 有 decision 事件

### F. 非功能

- [ ] 单 tick 管线 &lt; 50ms（本地观察）
- [ ] 2 只熊猫同时 start，状态互不影响

---

## 推荐联调顺序（Redis + market-monitor 已运行）

```
1. redis-cli PSUBSCRIBE 'market:tick:*'     → 确认 L3
2. 启动 backend（REDIS_URL 与 monitor 一致） → curl /health
3. DB：pandas + strategies(is_active) + simulations 行
4. POST /engine/actors/{id}/start
5. 轮询 GET /engine/actors/{id}/state（看 last_decision）
6. PSUBSCRIBE 'panda:*' + 查 trades 表          → L5
7. 若 5 无反应 → POST /engine/market/tick 隔离 Redis vs Actor
```

---

## 排障速查

| 现象 | 可能原因 |
|------|----------|
| `/health` 中 `redis: not configured` | 未设置 `REDIS_URL` |
| Actor 无 `last_decision` | 未 start；或 monitor 未发 tick；或资产未订阅 |
| `last_decision` 全 0 / 无步骤 | `hydrate` 失败（无 DB 或无熊猫/策略） |
| 有决策无 `trades` 行 | `simulation_id` / `strategy_id` 无效；或未达 EXECUTE 区 |
| monitor 有 tick，DE 无反应 | backend 用了不同的 Redis 实例 |
| 观望区无 Agent 回复 | 未配置 `DEEPSEEK_API_KEY`（会保持 HOLD） |

---

## 测试体系待补项

| 项 | 说明 |
|----|------|
| `tests/test_battle_cases.py` | PRD 四案例回归 |
| `tests/test_integration_redis.py` | 标记 `@pytest.mark.integration`，CI 可选跑 |
| 启动模拟盘时自动创建 `simulations` | 避免前端随机 UUID 导致 FK 失败 |
| CI 覆盖率门禁 | 对齐 `docs/testing-strategy.md` 80% 目标 |

---

## 测试方案（完整报告）

Decision Engine **控制变量 / 权重公式 / Battle Case** 的完整测试设计见：

**[docs/decision-engine-test-plan.md](docs/decision-engine-test-plan.md)** — 《熊猫判决实验室》测试方案报告

## 相关文档

- [Agent / 8 步管线设计](../docs/agent-design.md)
- [Backend 架构](../docs/backend-design.md)
- [Redis 频道契约](../docs/redis-architecture.md)
- [Market Monitor README](../market-monitor/README.md)
- [测试策略](../docs/testing-strategy.md)
