# DeepBook v3 Server 本地部署指南

> 本文档说明如何将 DeepBook v3 Server 部署到本地环境，用于开发、测试和数据查询。
>
> 仓库地址：https://github.com/MystenLabs/deepbookv3  
> 服务器代码位置：`crates/server/`（Rust + Axum REST API）  
> 索引器代码位置：`crates/indexer/`（Sui 链事件索引）
>
> **TradingPanda MVP（已锁定）**：`market-monitor` / Decision Engine **只调用 DeepBook Server HTTP API**（如 `http://localhost:9008`），**不**在应用代码中直接调用 Sui JSON-RPC。链上读取由 **Indexer + Server 内部**完成。

---

## 目录

1. [前置条件](#1-前置条件)
2. [获取代码](#2-获取代码)
3. [架构概览](#3-架构概览)
4. [架构决策与 TradingPanda MVP](#4-架构决策与-tradingpanda-mvp)
5. [数据保留策略](#5-数据保留策略)
6. [配置 PostgreSQL](#6-配置-postgresql)
7. [配置 Sui RPC](#7-配置-sui-rpc)
8. [编译 Indexer & Server](#8-编译-indexer--server)
9. [运行 Indexer（数据填充）](#9-运行-indexer数据填充)
10. [配置 Server](#10-配置-server)
11. [启动 Server](#11-启动-server)
12. [验证部署](#12-验证部署)
13. [API 使用示例](#13-api-使用示例)
14. [Docker 部署](#14-docker-部署)
15. [本地开发配置](#15-本地开发配置)
16. [常见问题](#16-常见问题)

---

## 1. 前置条件

### 操作系统

| 系统 | 支持状态 | 备注 |
|------|---------|------|
| macOS 13+ | ✅ 已测试 | Intel / Apple Silicon 均支持 |
| Ubuntu 22.04+ | ✅ 已测试 | 推荐用于生产部署 |
| Windows (WSL2) | ⚠️ 可行 | 需要 WSL2 Ubuntu 环境 |

### 必需工具

| 工具 | 版本要求 | 安装命令 (macOS) | 安装命令 (Ubuntu) |
|------|---------|-----------------|-------------------|
| Rust | 1.80+ (推荐 1.90) | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` | 同上 |
| Docker | 24+ | `brew install --cask docker` | `sudo apt install docker.io docker-compose-v2` |
| libpq / postgres dev | — | `brew install libpq` | `sudo apt install libpq-dev` |
| pkg-config | — | `brew install pkg-config` | `sudo apt install pkg-config` |
| cmake / clang | — | 随 Xcode CLI 安装 | `sudo apt install cmake clang` |
| openssl | — | `brew install openssl` | `sudo apt install libssl-dev` |
| git | 任意 | `brew install git` | `sudo apt install git` |

> **提示**：macOS 上推荐使用 Docker 运行 PostgreSQL 而不是 Homebrew 安装（见 §6），因此前置条件中加入了 Docker。

### 网络要求

- **DeepBook Indexer / Server** 需要访问 Sui RPC（默认主网 `https://fullnode.mainnet.sui.io:443`），用于索引链上事件与 Server 内部实时查询。
- **TradingPanda 应用进程**（`market-monitor`、`backend`）**不需要**配置 `SUI_RPC_URL` 来拉行情；只需能访问 **DeepBook Server**（如 `http://localhost:9008`）。
- MVP **必须**同时运行 **Indexer + Server + PostgreSQL**（建议保留约 **1 个月**历史，见 §5）；仅启动 Server、不跑 Indexer **不符合** TradingPanda MVP 方案（见 §4、§15.2）。

### 磁盘空间

| 组件 | 预估空间 |
|------|---------|
| Rust 编译缓存 + 依赖 | 5-10 GB |
| 源码 + build artifacts | 2-5 GB |
| PostgreSQL 数据 | 随时间增长（数 GB/月） |

---

## 2. 获取代码

```bash
git clone https://github.com/MystenLabs/deepbookv3.git
cd deepbookv3
```

仓库结构关键目录：

```
deepbookv3/
├── crates/
│   ├── server/         ← DeepBook REST API 服务器（本文档焦点）
│   ├── indexer/        ← Sui 区块链事件索引器
│   ├── schema/         ← 数据库模型 + 迁移脚本
│   └── bench/          ← 性能基准
├── docker/
│   └── deepbook-server/  ← Docker 部署配置
├── scripts/            ← 管理脚本
└── packages/           ← Move 合约包
```

---

## 3. 架构概览

### 3.1 DeepBook 基础设施（Indexer + Server）

```
                    ┌─────────────────────────────────┐
                    │        Sui Blockchain            │
                    │  (Mainnet / Testnet)             │
                    └─────────┬───────────────────────┘
                              │ RPC（仅 Indexer / Server 内部使用）
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   │
  ┌──────────────┐   ┌──────────────┐            │
  │  deepbook-   │   │  deepbook-   │            │
  │  indexer     │   │  server      │            │
  │  (Rust)      │   │  (Rust+Axum) │            │
  │  ↓ 写入事件  │   │  REST :9008  │            │
  └──────┬───────┘   └──────┬───────┘            │
         │                  │                    │
         ▼                  ▼                    │
  ┌────────────────────────────────┐            │
  │       PostgreSQL               │◄── K线、成交、池列表等
  │  trades / ohclv_candles / …    │            │
  └────────────────────────────────┘            │
         Server 内部按需再调 Sui RPC → 实时 orderbook 等
```

**核心流程：**

1. **Indexer** 监听 Sui checkpoint，把 DeepBook 事件写入 PostgreSQL（需配置 `RPC_URL`，**TradingPanda 不碰**）。
2. **Server** 对外提供 REST API：历史类读 PostgreSQL；实时 orderbook 等由 **Server 内部**调 Sui RPC。
3. **TradingPanda MVP 必须跑 Indexer**（建议同步并保留约 1 个月数据），否则 K 线、成交历史、`/get_pools` 等不可用或为空。

### 3.2 TradingPanda 侧（MVP）

```
DeepBook Server (localhost:9008)
        │  HTTP only（无 Sui RPC）
        ▼
market-monitor/  ──轮询 API、算指标──►  PUBLISH market:tick:* ──► Upstash
        │
        ▼
Decision Engine  ◄── SUBSCRIBE ──  PandaActor（8 步决策）
```

TradingPanda **不**维护：Sui 事件轮询、K 线落库、链上 orderbook 解析；这些由 DeepBook 仓库负责。

---

## 4. 架构决策与 TradingPanda MVP

### 4.1 结论（已锁定）

| 角色 | MVP 是否直接调用 Sui RPC | 说明 |
|------|-------------------------|------|
| **TradingPanda**（`market-monitor`、`backend`） | **否** | 只调 DeepBook Server HTTP API |
| **DeepBook Indexer** | **是**（基础设施） | 同步链上事件进 PostgreSQL |
| **DeepBook Server** | **是**（内部） | 对客户端透明；REST 统一出口 |

**MVP 方案 = Indexer + Server + PostgreSQL**，不是「应用直连 Sui RPC」。

### 4.2 方案对比（应用层视角）

| 方案 | TradingPanda 代码复杂度 | 历史 K 线 / 成交 | 实时 orderbook | MVP 采用 |
|------|----------------------|-----------------|----------------|----------|
| 应用直连 Sui RPC（`suix_queryEvents` 等） | 高（自维护 K 线、事件解析） | 有限 | 可实时 | **否** |
| **DeepBook Indexer + Server API** | 低（`httpx` 调 REST） | 完整（如 1 个月） | 有（Server 内部 RPC） | **是** |

### 4.3 TradingPanda 需要的 Server API（MVP）

`market-monitor` 通过 `DEEPBOOK_SERVER_URL`（如 `http://localhost:9008`）调用，**不**配置链上 RPC：

| 用途 | 推荐端点（以本仓库 Server 为准） | 数据来自（Server 内部） |
|------|----------------------------------|-------------------------|
| 交易池列表 | `GET /get_pools` | PostgreSQL（Indexer） |
| 实时订单簿 / Level2 | `GET /orderbook/:pool_name` 或上游新增的 `GET /get_level2_ticks_from_mid` | Sui RPC（**Server 内部**） |
| 成交历史 | `GET /trades/:pool_name` | PostgreSQL |
| K 线 OHLCV | `GET /ohclv/:pool_name`（文档中亦可能写作 `/candles`，以实际路由为准） | PostgreSQL |

> 部署后先用 `curl http://localhost:9008/` 与附录 [A. 完整 API 端点列表](#a-完整-api-端点列表) 核对路径；DeepBook 版本升级时端点名可能增减。

### 4.4 你需要做的 vs 不需要做的

**需要：**

1. 启动 PostgreSQL  
2. 启动 **Indexer**（建议 `--start-checkpoint` 从较近块高开始，保留策略见 §5）  
3. 启动 **Server**（默认 `http://localhost:9008`）  
4. 在 `market-monitor` 中配置 `DEEPBOOK_SERVER_URL`，轮询上述 API → 组装 `MarketEvent` → `PUBLISH` 到 Upstash  

**不需要（TradingPanda 应用代码）：**

- 直接调用 Sui JSON-RPC（`suix_queryEvents`、`suix_subscribeEvent` 等）  
- 自己维护 K 线聚合与 DeepBook 事件解析  
- 为行情单独部署「应用层 → Sui」长连接  

### 4.5 技术指标与历史长度

| 指标 | 参数 | 约需 1m K 线根数 |
|------|------|------------------|
| RSI | 14 | 14+ |
| MA20 | 20 | 20+ |
| MACD | 26（慢线） | 26+ |

Indexer 保留 **30 天**（§5）对 MVP 指标计算足够；无需应用侧再拉链上历史补洞。

### 4.6 与旧文档的差异

此前 §4 曾写「MVP 可仅用 Sui RPC、不跑 Indexer」——**对 TradingPanda 已作废**。MVP 与正式产品在 DeepBook 侧均采用 **Indexer + Server**；差别主要在保留周期、环境与监控，而非「是否索引」。

---

## 5. 数据保留策略

### 5.1 保留周期

| 阶段 | 数据保留时间 | 清理策略 | 说明 |
|------|------------|---------|------|
| MVP / 开发 | 30 天 | 自动删除 30 天前数据 | 最小存储，快速迭代 |
| 正式产品 | 6 个月 | 自动删除 6 个月前数据 | 平衡存储与历史分析 |
| 长期存档 | 1 年+ | 冷存储备份 | 需要长期趋势分析时 |

### 5.2 存储空间估算

假设每分钟一次 OHLCV 记录，每天约 1440 条记录，每条记录约 200 字节：

| 保留时间 | 粗估行数 | 存储空间 | 适用场景 |
|---------|---------|---------|---------|
| 1 个月 | ~43,000 | ~210 MB | MVP、测试 |
| 3 个月 | ~130,000 | ~630 MB | 可以接受 |
| 6 个月 | ~260,000 | ~1.26 GB | 正式产品 |
| 1 年 | ~525,000 | ~2.55 GB | 需要长期分析 |

> **注**：上述估算仅针对 K 线数据。实际存储包括 trades、orders、events 等多张表，总空间约为估算值的 2-3 倍。

### 5.3 数据清理脚本

**Cron 定时清理（每日凌晨 2 点）：**

```bash
# 清理 30 天前的订单成交数据
0 2 * * * psql -U deepbook_user -d deepbook -c \
  "DELETE FROM order_fills WHERE timestamp < NOW() - INTERVAL '30 days';"

# 清理 30 天前的 OHLCV K 线数据
0 2 * * * psql -U deepbook_user -d deepbook -c \
  "DELETE FROM ohclv_candles WHERE timestamp < NOW() - INTERVAL '30 days';"

# 清理 30 天前的 trades 数据
0 2 * * * psql -U deepbook_user -d deepbook -c \
  "DELETE FROM trades WHERE timestamp < NOW() - INTERVAL '30 days';"
```

**Python 清理脚本**（推荐用于更复杂的清理逻辑）：

```python
#!/usr/bin/env python3
"""
数据清理脚本 — 按保留策略删除过期数据
用法: python cleanup_data.py --retention-days 180
"""
import argparse
import os
from datetime import datetime, timedelta
import psycopg2

def cleanup(retention_days: int, dry_run: bool = True):
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cursor = conn.cursor()
    cutoff = datetime.utcnow() - timedelta(days=retention_days)

    tables = [
        ("order_fills", "timestamp"),
        ("trades", "timestamp"),
        ("ohclv_candles", "open_time"),
        ("pool_events", "timestamp"),
    ]

    for table, ts_col in tables:
        sql = f"DELETE FROM {table} WHERE {ts_col} < %s"
        if dry_run:
            cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE {ts_col} < %s", (cutoff,))
            count = cursor.fetchone()[0]
            print(f"[DRY-RUN] {table}: {count} rows would be deleted")
        else:
            cursor.execute(sql, (cutoff,))
            print(f"[DELETED] {table}: {cursor.rowcount} rows removed")

    if not dry_run:
        conn.commit()
    cursor.close()
    conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--retention-days", type=int, default=30)
    parser.add_argument("--apply", action="store_true", help="实际执行，默认 dry-run")
    args = parser.parse_args()
    cleanup(args.retention_days, dry_run=not args.apply)
```

### 5.4 正式产品保留策略实施

对于正式产品使用 Indexer，推荐保留 6 个月数据：

```bash
# 添加到 crontab
0 3 * * * cd /path/to/deepbookv3 && \
  DATABASE_URL="postgres://..." python3 scripts/cleanup_data.py \
  --retention-days 180 --apply
```

> 保留 6 个月足以覆盖绝大多数技术指标计算（最长的 MACD 也只需要 26 个周期）和季度趋势分析。

---

## 6. 配置 PostgreSQL

### 6.1 方案选择

| 方案 | 安装方式 | 优点 | 缺点 |
|------|---------|------|------|
| **A. Docker（推荐）** | Docker 容器 | 隔离性好、macOS/Linux 一致、无 Homebrew 兼容性问题 | 需要 Docker 磁盘空间 |
| **B. Homebrew（macOS）** | `brew install postgresql@16` | 本地原生进程 | macOS 版本升级可能导致兼容性冲突 |
| **C. 系统包（Ubuntu）** | `apt install` | 系统集成度高 | 版本可能较旧 |

### 6.2 方案 A：使用 Docker 运行 PostgreSQL（推荐）

**这是 macOS 上最推荐的方式**，因为 Homebrew 安装 PostgreSQL 在 macOS Sonoma+ 上可能出现兼容性问题。

```bash
# 拉取 PostgreSQL 16 镜像
docker pull postgres:16

# 启动 PostgreSQL 容器
docker run -d \
  --name deepbook-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=deepbook \
  -p 5432:5432 \
  -v deepbook-pgdata:/var/lib/postgresql/data \
  postgres:16

# 验证容器运行状态
docker ps --filter name=deepbook-postgres

# 验证数据库连接
psql -U postgres -d deepbook -h localhost -c "SELECT 1 as test;"
```

如需自定义用户：

```bash
# 创建专用用户
docker exec -it deepbook-postgres psql -U postgres -c "
  CREATE USER deepbook_user WITH PASSWORD 'your_secure_password';
  GRANT ALL PRIVILEGES ON DATABASE deepbook TO deepbook_user;
"
```

**停止和清理：**

```bash
# 停止容器
docker stop deepbook-postgres

# 重新启动
docker start deepbook-postgres

# 彻底删除容器和数据
docker rm -f deepbook-postgres
docker volume rm deepbook-pgdata
```

### 6.3 方案 B：Homebrew 安装（macOS，不推荐）

```bash
brew install postgresql@16
brew services start postgresql@16
```

> ⚠️ **注意**：macOS 的 Homebrew PostgreSQL 可能在系统升级后出现兼容性问题。如果遇到问题，请切换为 Docker 方案。

### 6.4 方案 C：系统包（Ubuntu）

```bash
sudo apt install postgresql postgresql-contrib libpq-dev
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 6.5 创建数据库和用户

```bash
# 切换到 postgres 用户（Ubuntu）
sudo -u postgres psql

# 或直接（macOS，当前用户可创建数据库）
createdb deepbook
```

在 psql 中执行：

```sql
-- 创建用户（可选，也可用默认 postgres 用户）
CREATE USER deepbook_user WITH PASSWORD 'your_secure_password';

-- 创建数据库
CREATE DATABASE deepbook OWNER deepbook_user;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE deepbook TO deepbook_user;

-- 验证连接字符串
-- postgres://deepbook_user:***@localhost:5432/deepbook
\q
```

### 6.6 验证连接

```bash
psql -U deepbook_user -d deepbook -h localhost -c "SELECT 1 as test;"
```

### 6.7 数据库连接字符串格式

```
postgres://[user]:***@[host]:[port]/[dbname]
```

示例：
```
postgres://postgres:***@localhost:5432/deepbook
```

> **注意**：如果密码包含特殊字符（如 `@`、`:`、`/`），需要 URL 编码：
> - `@` → `%40`
> - `:` → `%3A`
> - `/` → `%2F`

---

## 7. 配置 Sui RPC（仅 DeepBook Indexer / Server）

> **TradingPanda 开发者可跳过本节**——除非你在本地编译运行 DeepBook 的 Indexer/Server。  
> `market-monitor` 的 `.env` **不应**用 `SUI_RPC_URL` 拉行情；行情来自 `DEEPBOOK_SERVER_URL`。

### 7.1 内置默认值

Indexer 与 Server 进程默认使用 Sui 主网 RPC：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--rpc-url` | `https://fullnode.mainnet.sui.io:443` | Sui 主网全节点 |

### 7.2 可用的 RPC 端点

| 网络 | RPC 端点 | 用途 |
|------|---------|------|
| **Mainnet** | `https://fullnode.mainnet.sui.io:443` | 生产数据 |
| **Mainnet** | `https://sui-mainnet-rpc.allthatnode.com` | 备用端点 |
| **Testnet** | `https://fullnode.testnet.sui.io:443` | 开发测试 |

### 7.3 使用 Testnet（推荐开发测试）

```bash
# Indexer 使用 testnet
DATABASE_URL="postgres://postgres@localhost:***@localhost:5432/deepbook" \
cargo run --release --package deepbook-indexer -- \
  --env testnet \
  --packages deepbook
```

---

## 8. 编译 Indexer & Server

> **重要**：Server 和 Indexer 都**必须**在 release 模式下编译。调试模式编译的二进制文件跳过数据库连接初始化，启动后会立即报错退出。

DeepBook v3 使用单一 Cargo workspace，包含 server 和 indexer 两个 crate。需要分别编译。

### 8.1 编译 Server

```bash
cd deepbookv3

# 编译 Server（release 模式，耗时较长，约 10-30 分钟）
cargo build --release --package deepbook-server

# 编译产物
ls -lh target/release/deepbook-server
```

### 8.2 编译 Indexer

```bash
cd deepbookv3

# 编译 Indexer（release 模式）
cargo build --release --package deepbook-indexer

# 编译产物
ls -lh target/release/deepbook-indexer
```

### 8.3 Release vs Debug 对比

| 模式 | 编译命令 | 二进制大小 | 编译时间 | 能否运行 |
|------|---------|-----------|---------|---------|
| **Release** | `cargo build --release` | ~80 MB | 10-30 分钟 | ✅ 正常运行 |
| Debug | `cargo build` | ~500 MB | 5-10 分钟 | ❌ DB 连接初始化失败 |

> **经验教训**：不要使用 `cargo run`（默认 debug）运行 Server 或 Indexer — 二进制文件缺少编译时优化的数据库依赖初始化，启动后立即报错。始终添加 `--release` 标志。

### 8.4 首次编译注意事项

- 首次编译需要下载大量 Rust 依赖（包括 Sui SDK），可能耗时 20-40 分钟
- 后续编译使用缓存，增量修改后只需 1-5 分钟
- 如果网络不稳定，可配置 mirror：`export CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse`

---

## 9. 运行 Indexer（数据填充）

Indexer 从 Sui 链上读取 DeepBook 合约事件并写入 PostgreSQL。

> **注意**：Indexer 首次运行时会自动执行数据库迁移（创建所有需要的表）。

### 9.1 基本命令

```bash
cd deepbookv3
```

**主网：**

```bash
DATABASE_URL="postgres://postgres@localhost:***@localhost:5432/deepbook" \
cargo run --release --package deepbook-indexer -- \
  --env mainnet \
  --packages deepbook
```

### 9.2 使用 `--start-checkpoint` 加速首次同步

> **关键优化**：Indexer 默认从创世块（checkpoint 0）开始同步，这需要数小时甚至一天。推荐从较新的 checkpoint 开始，大幅缩短同步时间。

```bash
# 查询当前最新 checkpoint 编号
curl -s https://fullnode.mainnet.sui.io:443 -d '{
  "jsonrpc": "2.0",
  "method": "sui_getLatestCheckpointSequenceNumber",
  "params": [],
  "id": 1
}' | jq '.result'

# 示例输出: 42896742（假设最新 checkpoint）
# 选择一个较新的 checkpoint 作为起点（例如最新值减去少量偏移）
# 这里使用 42896000 作为起点

DATABASE_URL="postgres://postgres@localhost:***@localhost:5432/deepbook" \
cargo run --release --package deepbook-indexer -- \
  --env mainnet \
  --packages deepbook \
  --start-checkpoint 42896000
```

**指定 checkpoint 的优势：**

| 方式 | 同步时间 | 说明 |
|------|---------|------|
| 从创世块开始 | 数小时 ~ 1 天 | 大量历史事件需要处理 |
| 从最近 checkpoint 开始 | 几分钟 | 跳过历史，只索引最新事件 |

> **何时使用**：如果 only 需要实时数据（如最新的 orderbook 或 k 线），强烈推荐 `--start-checkpoint`。如果需要全部历史数据做回测或分析，才从创世块开始。

### 9.3 索引 DeepBook + Margin 事件（可选）

```bash
DATABASE_URL="postgres://postgres@localhost:***@localhost:5432/deepbook" \
cargo run --release --package deepbook-indexer -- \
  --env mainnet \
  --packages deepbook deepbook-margin
```

> **注意**：Margin 包在主网上可能尚未部署，`deepbook-margin` 参数在主网可能失败。

### 9.4 Indexer 参数说明

| 参数 | 必需 | 默认值 | 说明 |
|------|-----|--------|------|
| `--env` | ✅ | — | `mainnet` 或 `testnet` |
| `--packages` | ✅ | — | `deepbook` 或 `deepbook deepbook-margin` |
| `--start-checkpoint` | ❌ | 0（创世块） | 起始 checkpoint 编号，大幅缩短同步时间 |
| `--database-url` | ❌ | `DATABASE_URL` env | PostgreSQL 连接字符串 |
| `--metrics-address` | ❌ | `0.0.0.0:9184` | Prometheus 指标端点 |

### 9.5 首次运行注意事项

- Indexer 首次启动时自动运行数据库迁移（创建所有表）
- 从创世块同步需要数小时，推荐使用 `--start-checkpoint`
- 建议使用 screen / tmux 或 systemd 保持运行
- 可通过 `--metrics-address` 暴露 Prometheus 指标监控同步进度

### 9.6 验证 Indexer 同步进度

```bash
# 连接到 PostgreSQL 检查水印
psql -U postgres -d deepbook -c "SELECT * FROM pg_watermarks;"
```

或通过 Prometheus 指标端点：
```bash
curl http://localhost:9184/metrics | grep deepbook
```

---

## 10. 配置 Server

### 10.1 所有配置参数

从 `main.rs` 提取的完整参数列表：

| 参数 | 环境变量 | 默认值 | 说明 |
|------|---------|--------|------|
| `--server-port` | `SERVER_PORT` | `9008` | 服务器监听端口 |
| `--database-url` | `DATABASE_URL` | `postgres://postgres:***@localhost:5432/deepbook` | PostgreSQL 连接 |
| `--rpc-url` | `RPC_URL` | `https://fullnode.mainnet.sui.io:443` | Sui RPC 端点 |
| `--deepbook-package-id` | `DEEPBOOK_PACKAGE_ID` | `0x2c8d...4809` | DeepBook v3 包 ID |
| `--deep-token-package-id` | `DEEP_TOKEN_PACKAGE_ID` | `0xdeeb...6270` | DEEP 代币包 ID |
| `--deep-treasury-id` | `DEEP_TREASURY_ID` | `0x032a...1ffe` | DEEP 国库 ID |
| `--metrics-address` | `METRICS_ADDRESS` | `0.0.0.0:9184` | Prometheus 指标地址 |
| `--margin-poll-interval-secs` | `MARGIN_POLL_INTERVAL_SECS` | `30` | Margin 指标轮询间隔 |
| `--margin-package-id` | `MARGIN_PACKAGE_ID` | `(空)` | Margin 包 ID（可选） |
| `--admin-tokens` | `ADMIN_TOKENS` | `(空)` | 管理员 Bearer Token（逗号分隔） |
| `--db-statement-timeout-ms` | `DB_STATEMENT_TIMEOUT_MS` | `60000` | SQL 查询超时 |

### 10.2 环境变量配置文件（推荐）

创建一个 `.env` 文件在项目根目录：

```bash
cd deepbookv3
cat > .env << 'EOF'
# PostgreSQL
DATABASE_URL="postgres://postgres:***@localhost:5432/deepbook"

# Sui RPC（主网）
RPC_URL="https://fullnode.mainnet.sui.io:443"

# DeepBook 合约地址（主网默认）
DEEPBOOK_PACKAGE_ID="0x2c8d603bc51326b8c13cef9dd07031a408a48dddb541963357661df5d3204809"
DEEP_TOKEN_PACKAGE_ID="0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270"
DEEP_TREASURY_ID="0x032abf8948dda67a271bcc18e776dbbcfb0d58c8d288a700ff0d5521e57a1ffe"

# Server 端口
SERVER_PORT=9008

# Metrics（Prometheus）
METRICS_ADDRESS="0.0.0.0:9184"

# Margin（可选）
MARGIN_POLL_INTERVAL_SECS=30

# SQL 查询超时
DB_STATEMENT_TIMEOUT_MS=60000

# Rust 日志
RUST_LOG=info
RUST_BACKTRACE=1
EOF
```

### 10.3 Testnet 配置示例

```env
DATABASE_URL="postgres://postgres@localhost:***@localhost:5432/deepbook_dev"
RPC_URL="https://fullnode.testnet.sui.io:443"
# Testnet 的包 ID 可能不同，需要从合约部署记录中获取
DEEPBOOK_PACKAGE_ID="0x..."
```

---

## 11. 启动 Server

### 11.1 编译后运行

```bash
cd deepbookv3

# 设置环境变量后运行
export DATABASE_URL="postgres://postgres@localhost:***@localhost:5432/deepbook"
export RPC_URL="https://fullnode.mainnet.sui.io:443"
cargo run --release --package deepbook-server
```

### 11.2 使用环境变量文件

```bash
cd deepbookv3
set -a; source .env; set +a
cargo run --release --package deepbook-server
```

### 11.3 直接使用二进制文件

编译一次后，后续可以跳过编译直接运行二进制文件：

```bash
cd deepbookv3

# 设置环境变量
export DATABASE_URL="postgres://postgres@localhost:***@localhost:5432/deepbook"
export RPC_URL="https://fullnode.mainnet.sui.io:443"

# 直接运行编译好的二进制文件
./target/release/deepbook-server

# 或使用命令行参数
./target/release/deepbook-server \
  --database-url "postgres://postgres@localhost:***@localhost:5432/deepbook" \
  --rpc-url "https://fullnode.mainnet.sui.io:443"
```

### 11.4 后台运行

```bash
cd deepbookv3

nohup ./target/release/deepbook-server \
  --database-url "postgres://postgres@localhost:***@localhost:5432/deepbook" \
  --rpc-url "https://fullnode.mainnet.sui.io:443" \
  > server.log 2>&1 &

# 使用 systemd（推荐生产环境）
# 在 /etc/systemd/system/deepbook-server.service 中配置
```

systemd 单元文件示例：

```ini
[Unit]
Description=DeepBook v3 Server
After=network.target postgresql.service

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/deepbookv3
Environment=DATABASE_URL=postgres://postgres:***@localhost:5432/deepbook
Environment=RPC_URL=https://fullnode.mainnet.sui.io:443
ExecStart=/path/to/deepbookv3/target/release/deepbook-server
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## 12. 验证部署

### 12.1 健康检查

```bash
# Server 根路径 — 确认服务正在监听
curl http://localhost:9008/

# 成功响应示例（无 Indexer 时）：
# OK

# 详细状态（含 Indexer 同步进度）
curl http://localhost:9008/status
```

### 12.2 检查 API 端点

```bash
# 获取交易池列表（最重要的端点和 Server 的入口）
curl http://localhost:9008/get_pools

# 成功响应示例（有数据时）：
# ["SUI_USDC","SUI_USDT","DEEP_USDC",...]

# 空数组说明 Indexer 尚未索引到包含 pool 事件的 checkpoint
# 如果尚无数据：
# []
```

> **重要**：Server 的 API 端点路径是 `/get_pools`（Rust `axum` router 直接挂载），**不是** `/api/v1/pools`。类似的，所有端点都直接挂在根路径下（如 `/ticker`、`/trades/:pool_name`），没有 `/api/v1/` 前缀。

### 12.3 查询实时 Orderbook

```bash
# 查询 SUI_USDC 交易对的订单簿
curl http://localhost:9008/orderbook/SUI_USDC
```

### 12.4 查询 K 线数据

```bash
# 获取 OHLCV K 线（需要 Indexer 已同步数据）
curl "http://localhost:9008/ohclv/SUI_USDC?limit=10"
```

### 12.5 验证步骤总结

| 步骤 | 命令 | 预期结果 |
|------|------|---------|
| 1. Server 运行中 | `curl http://localhost:9008/` | `OK` |
| 2. API 可用 | `curl http://localhost:9008/get_pools` | 数组或空数组 `[]` |
| 3. Orderbook 数据 | `curl http://localhost:9008/orderbook/SUI_USDC` | 订单簿 JSON |
| 4. Indexer 同步 | `curl http://localhost:9008/status` | 含 checkpoint 信息 |

---

## 13. API 使用示例

### 13.1 交易池和市场信息

```bash
# 获取所有交易池
curl http://localhost:9008/get_pools

# 行情汇总
curl http://localhost:9008/ticker

# 交易池统计汇总
curl http://localhost:9008/summary
```

### 13.2 订单簿和交易数据

```bash
# 订单簿深度
curl http://localhost:9008/orderbook/SUI_USDC

# 成交历史
curl http://localhost:9008/trades/SUI_USDC?limit=10

# OHLCV K 线（1 分钟、1 小时、1 天等粒度）
curl "http://localhost:9008/ohclv/SUI_USDC?period=1h&limit=20"
```

### 13.3 代币和资产信息

```bash
# DEEP 代币供应量
curl http://localhost:9008/deep_supply

# 资产信息列表
curl http://localhost:9008/assets

# 费率信息
curl http://localhost:9008/fees
```

### 13.4 投资组合和历史数据

```bash
# 投资组合（需要钱包地址）
curl http://localhost:9008/portfolio/0x...

# 历史交易量
curl http://localhost:9008/historical_volume/SUI_USDC

# 全部交易量
curl http://localhost:9008/all_historical_volume
```

### 13.5 管理端点

```bash
# 管理端点需要 Bearer Token
# 查看管理端点列表
curl http://localhost:9008/admin/

# 调用 admin 端点
curl -H "Authorization: Bearer <token>" http://localhost:9008/admin/...
```

Admin 端点路径前缀为 `/admin`，包含速率限制（10 次认证失败/分钟）。

> 注意：admin routes 的具体端点未在公开文档中完整列出，建议查看源代码 `crates/server/src/admin/`。

---

## 14. Docker 部署

### 14.1 构建 Docker 镜像

仓库已提供 Dockerfile，可以直接构建：

```bash
cd deepbookv3

# 构建 Server 镜像
docker build -f docker/deepbook-server/Dockerfile -t deepbook-server:latest .
```

### 14.2 启动 PostgreSQL + Server

```bash
# 创建 Docker 网络
docker network create deepbook-net

# 启动 PostgreSQL
docker run -d \
  --name deepbook-postgres \
  --network deepbook-net \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=deepbook \
  -v deepbook-pgdata:/var/lib/postgresql/data \
  postgres:16

# 启动 DeepBook Server
docker run -d \
  --name deepbook-server \
  --network deepbook-net \
  -p 9008:9008 \
  -e DATABASE_URL="postgres://postgres:***@postgres:5432/deepbook" \
  -e RPC_URL="https://fullnode.mainnet.sui.io:443" \
  -e DEEPBOOK_PACKAGE_ID="0x2c8d603bc51326b8c13cef9dd07031a408a48dddb541963357661df5d3204809" \
  -e DEEP_TOKEN_PACKAGE_ID="0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270" \
  -e DEEP_TREASURY_ID="0x032abf8948dda67a271bcc18e776dbbcfb0d58c8d288a700ff0d5521e57a1ffe" \
  -e RUST_LOG=info \
  deepbook-server:latest
```

> 如果 PostgreSQL 在宿主机上，使用 `host.docker.internal` 访问。

### 14.3 docker-compose 示例

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: deepbook
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  indexer:
    build:
      context: .
      dockerfile: docker/deepbook-server/Dockerfile
      args:
        PROFILE: release
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: "postgres://postgres:***@postgres:5432/deepbook"
      RPC_URL: "https://fullnode.mainnet.sui.io:443"
      RUST_LOG: info
    command: >
      /opt/mysten/bin/deepbook-indexer
      --env mainnet
      --packages deepbook

  server:
    build:
      context: .
      dockerfile: docker/deepbook-server/Dockerfile
    ports:
      - "9008:9008"
      - "9184:9184"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: "postgres://postgres:***@postgres:5432/deepbook"
      RPC_URL: "https://fullnode.mainnet.sui.io:443"
      DEEPBOOK_PACKAGE_ID: "0x2c8d603bc51326b8c13cef9dd07031a408a48dddb541963357661df5d3204809"
      DEEP_TOKEN_PACKAGE_ID: "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270"
      DEEP_TREASURY_ID: "0x032abf8948dda67a271bcc18e776dbbcfb0d58c8d288a700ff0d5521e57a1ffe"
      RUST_LOG: info
      SERVER_PORT: 9008

volumes:
  pgdata:
```

> **注意**：上述 docker-compose 中的 indexer 使用了 server 的 Dockerfile（因为仓库未提供 indexer 独立 Dockerfile）。
> 实际部署时需要为 indexer 单独准备 Dockerfile 或调整 builder 编译完整工作区。

---

## 15. 本地开发配置

### 15.1 使用 Testnet 数据

对于本地开发，推荐使用 testnet 以减少主网数据量：

```bash
# 步骤 1: 启动 PostgreSQL（Docker 或 Homebrew）
docker start deepbook-postgres
createdb deepbook_dev

# 步骤 2: 运行 indexer（testnet，从最近 checkpoint 开始）
DATABASE_URL="postgres://postgres@localhost:***@localhost:5432/deepbook_dev" \
RPC_URL="https://fullnode.testnet.sui.io:443" \
cargo run --release --package deepbook-indexer -- \
  --env testnet \
  --packages deepbook \
  --start-checkpoint <latest_checkpoint>

# 步骤 3: 启动 server
DATABASE_URL="postgres://postgres@localhost:***@localhost:5432/deepbook_dev" \
RPC_URL="https://fullnode.testnet.sui.io:443" \
cargo run --release --package deepbook-server
```

### 15.2 仅运行 Server（无 Indexer）— 不适用于 TradingPanda MVP

DeepBook 上游允许「只起 Server、不起 Indexer」：此时 `/get_pools`、K 线、成交历史等依赖 PostgreSQL 的接口多为空，仅部分经 Server **内部** Sui RPC 的端点（如 `/orderbook/:pool_name`）可用。

```bash
# 仅用于快速验证 Server 进程能否启动 — TradingPanda 请勿依赖此模式
DATABASE_URL="postgres://postgres@localhost:***@localhost:5432/deepbook" \
RPC_URL="https://fullnode.mainnet.sui.io:443" \
./target/release/deepbook-server
```

**TradingPanda MVP 必须**：PostgreSQL + Indexer（约 1 个月数据）+ Server，并由 `market-monitor` **只调 HTTP API**（见 §4.3）。

---

## 16. 常见问题

### Q1: 服务器启动时报 `Connection refused` for PostgreSQL

```
Error: connection to server at "localhost" (127.0.0.1), port 5432 failed
```

**解决方案：**
1. 确认 PostgreSQL 已启动：`pg_isready`
2. 如果使用 Homebrew：`brew services list | grep postgres`
3. 如果使用 Docker：`docker ps --filter name=postgres`
4. 检查连接字符串中的主机名和端口
5. 确认数据库 `deepbook` 已创建

### Q2: 编译时卡在 `sui.git` 依赖下载

```
Updating git repository `https://github.com/MystenLabs/sui.git`
```

**解决方案：**
- 这是正常行为，sui 仓库较大
- 首次拉取可能需要 5-10 分钟
- 后续编译使用本地缓存，速度会快很多
- 如遇网络问题，配置 git 使用代理：
  ```bash
  git config --global http.proxy http://your-proxy:port
  ```

### Q3: `/get_pools` 返回空数组

```
[]
```

**原因：** Indexer 尚未运行或还未同步到包含 pool 事件的检查点。

**解决方案：**
1. 确保 Indexer 正在运行
2. 检查 Indexer 同步进度：`curl http://localhost:9184/metrics`
3. 等待 Indexer 同步到包含数据的最新检查点

### Q4: Server 二进制文件运行后立即退出，无错误输出

```
# 启动后立即返回，没有日志输出
```

**原因：** 编译时未使用 `--release` 模式。Debug 模式编译的二进制文件在 DB 连接初始化阶段因缺少编译时优化依赖而静默失败。

**解决方案：**
```bash
# 必须使用 release 模式编译
cargo build --release --package deepbook-server

# 而不是
cargo build --package deepbook-server  # ❌ debug 模式不可用
```

### Q5: `/orderbook/:pool_name` 返回 500 错误

**原因：** 池名称不存在或 Sui RPC 调用失败。

**解决方案：**
1. 确认池名称拼写正确（如 `SUI_USDC`）
2. 检查 RPC 端点是否可访问：`curl https://fullnode.mainnet.sui.io:443 -d '{"jsonrpc":"2.0","method":"sui_getLatestCheckpointSequenceNumber","params":[],"id":1}'`
3. 确认 deepbook-package-id 正确

### Q6: `/status` 返回 `UNHEALTHY`

**解决方案：**
1. 检查 Indexer 是否在运行
2. 使用宽松的阈值：
   ```bash
   curl "http://localhost:9008/status?max_checkpoint_lag=1000&max_time_lag_seconds=3600"
   ```
3. 如果 Indexer 正在追赶，这是正常行为

### Q7: macOS Apple Silicon 编译 openssl-sys 失败

```
error: failed to run custom build command for `openssl-sys v0.9.x`
```

**解决方案：**
```bash
export LDFLAGS="-L$(brew --prefix openssl)/lib"
export CPPFLAGS="-I$(brew --prefix openssl)/include"
export PKG_CONFIG_PATH="$(brew --prefix openssl)/lib/pkgconfig"
cargo clean && cargo build --release
```

### Q8: 磁盘空间不足

```bash
# 清除编译缓存
cargo clean

# 只保留 final binary（约 80 MB）
# 其他缓存和中间产物可删除
```

### Q9: 如何停止 Server？

```bash
# 前台运行: Ctrl+C
# 后台运行: kill 进程
pkill deepbook-server

# 或通过 systemd
sudo systemctl stop deepbook-server
```

### Q10: Indexer 同步太慢？

| 场景 | 解决方案 |
|------|---------|
| 首次同步主网 | 使用 `--start-checkpoint` 跳过历史数据 |
| Testnet 更快 | 开发测试优先用 testnet |
| 需要全部历史 | 预留 1 天同步时间 |
| 磁盘性能 | 使用 SSD，确保良好网络连接 |

### Q11: 如何确定正确的 API 端点路径？

**主要原因**：DeepBook v3 Server 的 API 端点直接挂载在根路径下，**没有** `/api/v1/` 前缀。

| 正确路径 | 错误路径（不要用） |
|---------|-----------------|
| `/get_pools` | `/api/v1/pools` |
| `/ticker` | `/api/v1/ticker` |
| `/orderbook/SUI_USDC` | `/api/v1/orderbook/SUI_USDC` |

> **经验教训**：Server 使用 Rust 的 `axum` 框架，路由直接注册在根路径。如果你习惯 RESTful 风格（如 `/api/v1/pools`），请改用 `/get_pools`。

### Q12: Homebrew PostgreSQL 出现兼容性问题

**症状**：macOS 升级后 PostgreSQL 启动失败或连接报错。

**解决方案**：
```bash
# 1. 查看 Homebrew PostgreSQL 状态
brew services list

# 2. 尝试重启
brew services restart postgresql@16

# 3. 如果不行，切换为 Docker PostgreSQL（推荐）
docker run -d --name deepbook-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=deepbook \
  -p 5432:5432 \
  postgres:16

# 4. Docker 完成后，不再需要 Homebrew PostgreSQL
brew services stop postgresql@16
```

---

## 附录

### A. 完整 API 端点列表

| 端点 | 方法 | 说明 | 数据来源 |
|------|------|------|---------|
| `/` | GET | 健康检查 | — |
| `/status` | GET | Indexer 同步状态 | DB + Sui RPC |
| `/get_pools` | GET | 交易池列表 | PostgreSQL |
| `/ticker` | GET | 行情汇总 | PostgreSQL |
| `/trades/:pool_name` | GET | 成交历史 | PostgreSQL |
| `/order_updates/:pool_name` | GET | 订单更新事件 | PostgreSQL |
| `/orders/:pool_name/:balance_manager_id` | GET | 用户订单 | PostgreSQL |
| `/trade_count` | GET | 成交数量统计 | PostgreSQL |
| `/assets` | GET | 资产信息 | PostgreSQL |
| `/summary` | GET | 汇总统计 | Sui RPC |
| `/orderbook/:pool_name` | GET | 订单簿深度 | Sui RPC |
| `/deep_supply` | GET | DEEP 代币供应量 | Sui RPC |
| `/margin_supply` | GET | Margin 供应量 | Sui RPC |
| `/ohclv/:pool_name` | GET | OHLCV K 线 | PostgreSQL |
| `/fees` | GET | 费率信息 | Sui RPC |
| `/historical_volume/:pool_names` | GET | 历史交易量 | PostgreSQL |
| `/all_historical_volume` | GET | 全部交易量 | PostgreSQL |
| `/get_net_deposits/:asset_ids/:timestamp` | GET | 净存入量 | PostgreSQL |
| `/portfolio/:wallet_address` | GET | 投资组合 | PostgreSQL |
| `/get_points` | GET | 积分查询 | PostgreSQL |
| `/margin_manager_created` | GET | Margin 管理器事件 | PostgreSQL |
| `/loan_borrowed` | GET | 借款事件 | PostgreSQL |
| `/loan_repaid` | GET | 还款事件 | PostgreSQL |
| `/liquidation` | GET | 清算事件 | PostgreSQL |
| `/asset_supplied` | GET | 资产供应事件 | PostgreSQL |
| `/asset_withdrawn` | GET | 资产提取事件 | PostgreSQL |
| `/margin_pool_created` | GET | Margin 池创建 | PostgreSQL |
| `/collateral_events` | GET | 抵押事件 | PostgreSQL |
| `/deposited_assets/:balance_manager_ids` | GET | 存入资产 | PostgreSQL |
| `/rebates_v2` | GET | 返佣数据 | PostgreSQL |
| `/margin_managers_info` | GET | Margin 管理器信息 | PostgreSQL |
| `/margin_manager_states` | GET | Margin 管理器状态 | PostgreSQL |
| `/admin/*` | GET/POST | 管理端点（需 Bearer Token） | 多种 |

### B. 相关链接

- [DeepBook v3 仓库](https://github.com/MystenLabs/deepbookv3)
- [DeepBook 官网](https://deepbook.tech)
- [DeepBook 白皮书](https://cdn.prod.website-files.com/65fdccb65290aeb1c597b611/66059b44041261e3fe4a330d_deepbook_whitepaper.pdf)
- [Sui 文档 - DeepBook v3 标准](https://docs.sui.io/standards/deepbookv3)
- [Sui SDK 文档](https://docs.sui.io/standards/deepbookv3-sdk)
- [Sui TypeScript SDK 示例](https://github.com/MystenLabs/ts-sdks/tree/main/packages/deepbook-v3/examples)
- [Rust SDK（非官方）](https://github.com/hoh-zone/sui-deepbookv3)

### C. 配置参数速查

```bash
# Server 启动（最小配置）
./target/release/deepbook-server \
  --database-url "postgres://postgres@localhost:5432/deepbook" \
  --rpc-url "https://fullnode.mainnet.sui.io:443"

# Indexer 启动（最小配置，从最近 checkpoint 开始）
cargo run --release --package deepbook-indexer -- \
  --env mainnet \
  --packages deepbook \
  --start-checkpoint <latest_checkpoint>
```
