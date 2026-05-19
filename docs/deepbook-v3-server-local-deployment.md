# DeepBook v3 Server 本地部署指南

> 本文档说明如何将 DeepBook v3 Server 部署到本地环境，用于开发、测试和数据查询。
>
> 仓库地址：https://github.com/MystenLabs/deepbookv3
> 服务器代码位置：`crates/server/`（Rust + Axum REST API）
> 索引器代码位置：`crates/indexer/`（Sui 链事件索引）

---

## 目录

1. [前置条件](#1-前置条件)
2. [获取代码](#2-获取代码)
3. [架构概览](#3-架构概览)
4. [配置 PostgreSQL](#4-配置-postgresql)
5. [配置 Sui RPC](#5-配置-sui-rpc)
6. [编译 Indexer & Server](#6-编译-indexer--server)
7. [运行 Indexer（数据填充）](#7-运行-indexer数据填充)
8. [配置 Server](#8-配置-server)
9. [启动 Server](#9-启动-server)
10. [验证部署](#10-验证部署)
11. [API 使用示例](#11-api-使用示例)
12. [Docker 部署](#12-docker-部署)
13. [本地开发配置](#13-本地开发配置)
14. [常见问题](#14-常见问题)

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
| PostgreSQL | 13+ | `brew install postgresql@16` | `sudo apt install postgresql postgresql-contrib` |
| libpq / postgres dev | — | `brew install libpq` | `sudo apt install libpq-dev` |
| pkg-config | — | `brew install pkg-config` | `sudo apt install pkg-config` |
| cmake / clang | — | 随 Xcode CLI 安装 | `sudo apt install cmake clang` |
| openssl | — | `brew install openssl` | `sudo apt install libssl-dev` |
| git | 任意 | `brew install git` | `sudo apt install git` |

### 网络要求

- 需要访问 Sui RPC 端点（默认使用 Sui 主网 https://fullnode.mainnet.sui.io:443）
- 部署完整功能需要运行 Indexer（需要持续连接 Sui RPC 同步链上事件）
- 仅查询已有数据时，Server 可以在没有网络的情况下工作（但无法从链上拉取实时数据）

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

```
                    ┌─────────────────────────────────┐
                    │        Sui Blockchain            │
                    │  (Mainnet / Testnet)             │
                    └─────────┬───────────────────────┘
                              │ RPC (读取链上状态)
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   │
  ┌──────────────┐   ┌──────────────┐            │
  │  deepbook-   │   │  deepbook-   │  ← 读取    │
  │  indexer     │   │  server      │    链上     │
  │  (Rust)      │   │  (Rust+Axum) │    实时数据  │
  │              │   │              │            │
  │  ↓ 写入事件  │   │  ↑ 读取数据  │            │
  └──────┬───────┘   └──────┬───────┘            │
         │                  │                    │
         ▼                  ▼                    │
  ┌────────────────────────────────┐            │
  │       PostgreSQL               │            │
  │  (deepbook 数据库)             │            │
  │  ├─ pool_events               │            │
  │  ├─ trades                    │            │
  │  ├─ orders                    │            │
  │  ├─ ohclv_candles             │            │
  │  ├─ margin_* events           │            │
  │  └─ watermark tracking        │            │
  └────────────────────────────────┘            │
```

**核心流程：**

1. **Indexer**（`crates/indexer/`）持续监听 Sui 链上 checkpoint，提取 DeepBook 事件写入 PostgreSQL
2. **Server**（`crates/server/`）提供 REST API，从 PostgreSQL 读取索引数据 + 从 Sui RPC 读取链上实时数据（如 orderbook、DEEP supply）
3. **必须先运行 Indexer** — 否则数据库中没有任何数据，Server 只能提供链上实时查询（orderbook、deep_supply 等）

---

## 4. 配置 PostgreSQL

### 4.1 安装 PostgreSQL

**macOS：**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu：**
```bash
sudo apt install postgresql postgresql-contrib libpq-dev
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 4.2 创建数据库和用户

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
-- postgres://deepbook_user:your_secure_password@localhost:5432/deepbook
\q
```

### 4.3 验证连接

```bash
psql -U deepbook_user -d deepbook -h localhost -c "SELECT 1 as test;"
```

### 4.4 数据库连接字符串格式

```
postgres://[user]:[password]@[host]:[port]/[dbname]
```

示例：
```
postgres://postgres:mysecretpassword@localhost:5432/deepbook
```

> **注意**：如果密码包含特殊字符（如 `@`、`:`、`/`），需要 URL 编码：
> - `@` → `%40`
> - `:` → `%3A`
> - `/` → `%2F`

---

## 5. 配置 Sui RPC

### 5.1 内置默认值

Server 和 Indexer 默认使用 Sui 主网 RPC：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--rpc-url` | `https://fullnode.mainnet.sui.io:443` | Sui 主网全节点 |

### 5.2 可用的 RPC 端点

| 网络 | RPC 端点 | 用途 |
|------|---------|------|
| **Mainnet** | `https://fullnode.mainnet.sui.io:443` | 生产数据 |
| **Mainnet** | `https://sui-mainnet-rpc.allthatnode.com` | 备用端点 |
| **Testnet** | `https://fullnode.testnet.sui.io:443` | 开发测试 |

### 5.3 使用 Testnet（推荐开发测试）

```bash
# Indexer 使用 testnet
DATABASE_URL="postgres://postgres@localhost:5432/deepbook" \
cargo run --package deepbook-indexer -- \
  --env testnet \
  --packages deepbook

# Server 使用 testnet RPC
DATABASE_URL="postgres://postgres@localhost:5432/deepbook" \
cargo run --package deepbook-server -- \
  --database-url "postgres://postgres@localhost:5432/deepbook" \
  --rpc-url "https://fullnode.testnet.sui.io:443"
```

### 5.4 DeepBook v3 合约地址（主网默认值）

从 `crates/server/src/main.rs` 提取的默认值：

| 参数 | 默认值（主网） |
|------|---------------|
| `deepbook-package-id` | `0x2c8d603bc51326b8c13cef9dd07031a408a48dddb541963357661df5d3204809` |
| `deep-token-package-id` | `0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270` |
| `deep-treasury-id` | `0x032abf8948dda67a271bcc18e776dbbcfb0d58c8d288a700ff0d5521e57a1ffe` |

> Testnet 上需要替换为 testnet 的合约地址（运行 `sui client --env testnet` 后通过 sui explorer 查看）。

---

## 6. 编译 Indexer & Server

### 6.1 环境检查

```bash
# 检查 Rust 版本
rustc --version
# 需要 1.80+

# 检查 cargo
cargo --version
```

### 6.2 编译所有 crate（推荐，首次）

从仓库根目录编译整个工作区：

```bash
cd deepbookv3
cargo build --release
```

这将编译所有 4 个 crate（bench、indexer、schema、server）。首次编译大约需要 15-30 分钟，取决于网络和机器性能。

### 6.3 仅编译 Server（更快）

```bash
cargo build --release --package deepbook-server
```

### 6.4 仅编译 Indexer

```bash
cargo build --release --package deepbook-indexer
```

### 6.5 编译产物位置

```
target/release/
├── deepbook-server    ← REST API 服务器
├── deepbook-indexer   ← 区块链索引器
├── deepbook-bench     ← 性能基准工具
└── ... (其他依赖)
```

### 6.6 常见编译错误

| 错误信息 | 解决方案 |
|---------|---------|
| `linker 'cc' not found` | 安装 Xcode CLI (macOS): `xcode-select --install` |
| `libpq-dev not found` | Ubuntu: `sudo apt install libpq-dev`; macOS: `brew install libpq` |
| `openssl-sys` 编译失败 | macOS: `brew install openssl && export LDFLAGS="-L$(brew --prefix openssl)/lib"` |
| 依赖从 `github.com/MystenLabs/sui.git` 拉取慢 | 配置 git 代理或使用 `--config net.git-fetch-with-cli=true` |
| 内存不足（OOM） | 降低并行度：`CARGO_BUILD_JOBS=4 cargo build --release` |

---

## 7. 运行 Indexer（数据填充）

> **Server 的数据库查询功能依赖 Indexer 写入事件数据。如果不运行 Indexer，只能通过 Server 做链上实时查询（orderbook、deep_supply 等）。**

### 7.1 基本命令

```bash
cd deepbookv3

# 索引 DeepBook 核心事件（主网）
DATABASE_URL="postgres://postgres@localhost:5432/deepbook" \
cargo run --release --package deepbook-indexer -- \
  --env mainnet \
  --packages deepbook
```

### 7.2 索引 DeepBook + Margin 事件

```bash
DATABASE_URL="postgres://postgres@localhost:5432/deepbook" \
cargo run --release --package deepbook-indexer -- \
  --env mainnet \
  --packages deepbook deepbook-margin
```

### 7.3 索引 testnet 数据

```bash
DATABASE_URL="postgres://postgres@localhost:5432/deepbook" \
cargo run --release --package deepbook-indexer -- \
  --env testnet \
  --packages deepbook
```

> **注意**：Margin 包在主网上可能尚未部署，`deepbook-margin` 参数在主网可能失败。

### 7.4 Indexer 参数说明

| 参数 | 必需 | 默认值 | 说明 |
|------|-----|--------|------|
| `--env` | ✅ | — | `mainnet` 或 `testnet` |
| `--packages` | ✅ | — | `deepbook` 或 `deepbook deepbook-margin` |
| `--database-url` | ❌ | `DATABASE_URL` env | PostgreSQL 连接字符串 |
| `--metrics-address` | ❌ | `0.0.0.0:9184` | Prometheus 指标端点 |

### 7.5 首次运行注意事项

- Indexer 首次启动时自动运行数据库迁移（创建所有表）
- 首次同步需要从创世块开始，可能耗时数小时
- 建议使用 screen / tmux 或 systemd 保持运行
- 可通过 `--metrics-address` 暴露 Prometheus 指标监控同步进度

### 7.6 验证 Indexer 同步进度

```bash
# 连接到 PostgreSQL 检查水印
psql -U postgres -d deepbook -c "SELECT * FROM pg_watermarks;"
```

或通过 Prometheus 指标端点：
```bash
curl http://localhost:9184/metrics | grep deepbook
```

---

## 8. 配置 Server

### 8.1 所有配置参数

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

### 8.2 环境变量配置文件（推荐）

创建一个 `.env` 文件在项目根目录：

```bash
cd deepbookv3
cat > .env << 'EOF'
# PostgreSQL
DATABASE_URL="postgres://postgres:your_password@localhost:5432/deepbook"

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

### 8.3 Testnet 配置示例

```env
DATABASE_URL="postgres://postgres@localhost:5432/deepbook_test"
RPC_URL="https://fullnode.testnet.sui.io:443"
DEEPBOOK_PACKAGE_ID="<testnet-deepbook-package-id>"
DEEP_TOKEN_PACKAGE_ID="<testnet-deep-token-package-id>"
DEEP_TREASURY_ID="<testnet-deep-treasury-id>"
SERVER_PORT=9008
RUST_LOG=debug
```

---

## 9. 启动 Server

### 9.1 从源码运行（开发模式）

```bash
cd deepbookv3

# 通过环境变量传参
DATABASE_URL="postgres://postgres@localhost:5432/deepbook" \
RPC_URL="https://fullnode.mainnet.sui.io:443" \
cargo run --release --package deepbook-server

# 或通过命令行参数
cargo run --release --package deepbook-server -- \
  --database-url "postgres://postgres@localhost:5432/deepbook" \
  --rpc-url "https://fullnode.mainnet.sui.io:443"
```

### 9.2 从编译产物运行（生产模式）

```bash
cd deepbookv3

# 使用环境变量
export DATABASE_URL="postgres://postgres@localhost:5432/deepbook"
export RPC_URL="https://fullnode.mainnet.sui.io:443"
./target/release/deepbook-server

# 或使用命令行参数
./target/release/deepbook-server \
  --database-url "postgres://postgres@localhost:5432/deepbook" \
  --rpc-url "https://fullnode.mainnet.sui.io:443"
```

### 9.3 启动后预期输出

```
Server started successfully on port 9008
```

（如果配置了 margin package，还会看到 `Margin metrics poller started (interval: 30s)`）

### 9.4 后台运行（持久化）

```bash
# 使用 nohup
nohup ./target/release/deepbook-server \
  --database-url "postgres://postgres@localhost:5432/deepbook" \
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
Environment=DATABASE_URL=postgres://postgres@localhost:5432/deepbook
Environment=RPC_URL=https://fullnode.mainnet.sui.io:443
Environment=RUST_LOG=info
ExecStart=/path/to/deepbookv3/target/release/deepbook-server
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## 10. 验证部署

### 10.1 健康检查

```bash
# 基础健康检查（不依赖数据库）
curl http://localhost:9008/
# 预期输出: 空响应, HTTP 200

# 查看详细状态
curl http://localhost:9008/status
```

`/status` 响应示例：

```json
{
  "status": "OK",
  "latest_onchain_checkpoint": 12345678,
  "current_time_ms": 1732567890000,
  "earliest_checkpoint": 12345673,
  "max_lag_pipeline": "deepbook_indexer",
  "pipelines": [
    {
      "pipeline": "deepbook_indexer",
      "indexed_checkpoint": 12345673,
      "indexed_epoch": 500,
      "indexed_timestamp_ms": 1732567878000,
      "checkpoint_lag": 5,
      "time_lag_seconds": 12,
      "latest_onchain_checkpoint": 12345678,
      "is_backfill": false
    }
  ],
  "max_checkpoint_lag": 5,
  "max_time_lag_seconds": 12
}
```

> 如果 `status` 为 `"UNHEALTHY"`，说明 Indexer 同步落后于链上超过阈值（默认 checkpoint_lag ≥ 100 或 time_lag ≥ 60s）。

### 10.2 查询日志

```bash
# 查看服务器日志
tail -f server.log

# 或在前台运行时查看标准输出
```

正常日志示例：
```
Server started successfully on port 9008
[INFO] GET /get_pools 200 OK
[INFO] GET /ticker 200 OK
```

### 10.3 测试核心 API

```bash
# 获取交易对列表
curl -s http://localhost:9008/get_pools | head -c 500

# 获取行情 ticker
curl -s http://localhost:9008/ticker | head -c 500

# 获取链上 orderbook（不依赖数据库）
curl -s http://localhost:9008/orderbook/SUI_USDC | head -c 500

# 获取 DEEP 总供应量
curl -s http://localhost:9008/deep_supply | head -c 200
```

### 10.4 检查 Prometheus 指标

```bash
curl http://localhost:9184/metrics | head -30
```

---

## 11. API 使用示例

### 11.1 获取交易池列表

```bash
curl -s http://localhost:9008/get_pools | jq .
```

返回格式（取决于数据库是否有数据）：

```json
[
  {
    "pool_id": "0x6e...",
    "pool_name": "SUI_USDC",
    "base_asset": "0x2::sui::SUI",
    "quote_asset": "...::usdc::USDC",
    "ticker_id": "SUI_USDC"
  }
]
```

### 11.2 获取订单簿

```bash
# 获取 SUI_USDC 池的订单簿（从链上实时查询）
curl -s "http://localhost:9008/orderbook/SUI_USDC" | jq .
```

可选参数：
- `asks_limit` — 卖单深度
- `bids_limit` — 买单深度

```bash
curl -s "http://localhost:9008/orderbook/SUI_USDC?asks_limit=10&bids_limit=10" | jq .
```

### 11.3 获取成交历史

```bash
# 获取最近成交
curl -s "http://localhost:9008/trades/SUI_USDC?limit=20" | jq .

# 指定时间范围
curl -s "http://localhost:9008/trades/SUI_USDC?start_time=1700000000&end_time=1700100000&limit=100" | jq .
```

参数：
| 参数 | 说明 |
|------|------|
| `limit` | 返回条数（默认 1） |
| `start_time` | 开始时间（Unix 秒） |
| `end_time` | 结束时间（Unix 秒，默认当前） |

### 11.4 获取 OHLCV K 线

```bash
# 1 分钟 K 线
curl -s "http://localhost:9008/ohclv/SUI_USDC?interval=1m&limit=10" | jq .

# 1 小时 K 线
curl -s "http://localhost:9008/ohclv/SUI_USDC?interval=1h&limit=24" | jq .

# 日 K 线
curl -s "http://localhost:9008/ohclv/SUI_USDC?interval=1d&start_time=1700000000" | jq .
```

支持的 interval 值：`1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`

返回格式：

```json
{
  "candles": [
    [1700000000000, 1.05, 1.08, 1.02, 1.06, 100000],
    [1700000060000, 1.06, 1.07, 1.04, 1.05, 50000]
  ]
}
```

每根蜡烛格式：`[timestamp_ms, open, high, low, close, volume]`

### 11.5 获取 Ticker / 行情摘要

```bash
# 所有交易对的 ticker
curl -s http://localhost:9008/ticker | jq .

# 汇总信息
curl -s http://localhost:9008/summary | jq .
```

### 11.6 获取历史交易量

```bash
# 指定池
curl -s "http://localhost:9008/historical_volume/SUI_USDC" | jq .

# 多个池
curl -s "http://localhost:9008/historical_volume/SUI_USDC,SUI_DEEP" | jq .

# 所有池总交易量
curl -s http://localhost:9008/all_historical_volume | jq .
```

参数：
| 参数 | 说明 |
|------|------|
| `start_time` | 开始时间（Unix 秒） |
| `end_time` | 结束时间（Unix 秒） |
| `volume_in_base` | `true` 以 base asset 计价 |
| `limit` | 限制返回条数 |

### 11.7 获取交易对数量

```bash
curl -s http://localhost:9008/trade_count | jq .
```

### 11.8 查询指定用户的订单

```bash
curl -s "http://localhost:9008/orders/SUI_USDC/<balance_manager_id>?limit=50" | jq .
```

### 11.9 查询资产

```bash
curl -s http://localhost:9008/assets | jq .
```

### 11.10 获取费率

```bash
curl -s http://localhost:9008/fees | jq .
```

### 11.11 Portfolio 查询

```bash
curl -s "http://localhost:9008/portfolio/<sui_wallet_address>" | jq .
```

### 11.12 DEEP 供应量

```bash
curl -s http://localhost:9008/deep_supply | jq .
```

### 11.13 用户订单更新

```bash
curl -s "http://localhost:9008/order_updates/SUI_USDC?limit=10" | jq .
```

---

## 12. Docker 部署

### 12.1 Dockerfile 说明

仓库已包含 Dockerfile：`docker/deepbook-server/Dockerfile`

使用 Rust 1.90.0 作为构建基础镜像，分两个阶段：
1. **Builder 阶段**：编译 deepbook-server 二进制
2. **Runtime 阶段**：基于 debian trixie-slim，包含 PostgreSQL 客户端、curl、git 等工具

### 12.2 构建 Docker 镜像

```bash
cd deepbookv3

docker build \
  -t deepbook-server:latest \
  -f docker/deepbook-server/Dockerfile \
  --build-arg PROFILE=release \
  .
```

### 12.3 运行 Docker 容器

```bash
docker run -d \
  --name deepbook-server \
  -p 9008:9008 \
  -p 9184:9184 \
  -e DATABASE_URL="postgres://postgres:password@host.docker.internal:5432/deepbook" \
  -e RPC_URL="https://fullnode.mainnet.sui.io:443" \
  -e DEEPBOOK_PACKAGE_ID="0x2c8d603bc51326b8c13cef9dd07031a408a48dddb541963357661df5d3204809" \
  -e DEEP_TOKEN_PACKAGE_ID="0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270" \
  -e DEEP_TREASURY_ID="0x032abf8948dda67a271bcc18e776dbbcfb0d58c8d288a700ff0d5521e57a1ffe" \
  -e RUST_LOG=info \
  deepbook-server:latest
```

> 如果 PostgreSQL 在宿主机上，使用 `host.docker.internal` 访问。

### 12.4 docker-compose 示例

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
      DATABASE_URL: "postgres://postgres:your_password@postgres:5432/deepbook"
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
      DATABASE_URL: "postgres://postgres:your_password@postgres:5432/deepbook"
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

## 13. 本地开发配置

### 13.1 使用 Testnet 数据

对于本地开发，推荐使用 testnet 以减少主网数据量：

```bash
# 步骤 1: 启动 PostgreSQL
brew services start postgresql@16
createdb deepbook_dev

# 步骤 2: 运行 indexer（testnet，只索引核心事件）
DATABASE_URL="postgres://postgres@localhost:5432/deepbook_dev" \
cargo run --release --package deepbook-indexer -- \
  --env testnet \
  --packages deepbook

# 步骤 3: 在另一个终端启动 server
DATABASE_URL="postgres://postgres@localhost:5432/deepbook_dev" \
RPC_URL="https://fullnode.testnet.sui.io:443" \
cargo run --release --package deepbook-server
```

### 13.2 仅运行 Server（无 Indexer）

如果不需要历史事件数据，可以仅启动 Server（仅支持链上实时查询）：

```bash
DATABASE_URL="postgres://postgres@localhost:5432/deepbook_dev" \
RPC_URL="https://fullnode.mainnet.sui.io:443" \
cargo run --release --package deepbook-server
```

此时服务器会启动，但以下端点会返回空数据或错误：
- `/get_pools`（数据库无数据）
- `/trades/:pool_name`
- `/ohclv/:pool_name`
- `/historical_volume/:pool_names`

以下端点仍能工作（直接从链上读取）：
- `/` (health check)
- `/status` (indexer status)
- `/orderbook/:pool_name` (从链上 RPC 查询)
- `/deep_supply` (从链上 RPC 查询)
- `/margin_supply` (从链上 RPC 查询)
- `/fees` (从链上 RPC 查询)

### 13.3 增量同步（跳过历史数据）

Indexer 默认从创世块开始同步。如果只需最新数据，可以使用部分同步方式 ——
但当前版本没有内置 skip-to-latest 参数。可以通过以下方式加速：

1. 使用 testnet（数据量小得多）
2. 等待索引器赶上最新检查点后，它会快速追赶
3. 在生产环境中，考虑迁移已经同步好的数据库快照

### 13.4 端口规划

| 服务 | 端口 | 用途 |
|------|------|------|
| DeepBook Server | 9008 | REST API |
| Prometheus Metrics | 9184 | 监控指标 |
| PostgreSQL | 5432 | 数据库 |

### 13.5 启用 Admin 端点

Admin 端点需要配置 Bearer Token：

```bash
# 设置 admin 令牌
ADMIN_TOKENS="token1,token2" \
./target/release/deepbook-server \
  --database-url "postgres://postgres@localhost:5432/deepbook" \
  --rpc-url "https://fullnode.mainnet.sui.io:443"

# 调用 admin 端点
curl -H "Authorization: Bearer token1" http://localhost:9008/admin/...
```

Admin 端点路径前缀为 `/admin`，包含速率限制（10 次认证失败/分钟）。

> 注意：admin routes 的具体端点未在公开文档中完整列出，建议查看源代码 `crates/server/src/admin/`。

---

## 14. 常见问题

### Q1: 服务器启动时报 `Connection refused` for PostgreSQL

```
Error: connection to server at "localhost" (127.0.0.1), port 5432 failed
```

**解决方案：**
1. 确认 PostgreSQL 已启动：`pg_isready`
2. 检查连接字符串中的主机名和端口
3. 确认数据库 `deepbook` 已创建

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

### Q4: `/orderbook/:pool_name` 返回 500 错误

**原因：** 池名称不存在或 Sui RPC 调用失败。

**解决方案：**
1. 确认池名称拼写正确（如 `SUI_USDC`）
2. 检查 RPC 端点是否可访问：`curl https://fullnode.mainnet.sui.io:443 -d '{"jsonrpc":"2.0","method":"sui_getLatestCheckpointSequenceNumber","params":[],"id":1}'`
3. 确认 deepbook-package-id 正确

### Q5: `/status` 返回 `UNHEALTHY`

**解决方案：**
1. 检查 Indexer 是否在运行
2. 使用宽松的阈值：
   ```bash
   curl "http://localhost:9008/status?max_checkpoint_lag=1000&max_time_lag_seconds=3600"
   ```
3. 如果 Indexer 正在追赶，这是正常行为

### Q6: macOS Apple Silicon 编译 openssl-sys 失败

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

### Q7: 磁盘空间不足

```bash
# 清除编译缓存
cargo clean

# 只保留 final binary（约 100MB）
# 其他缓存和中间产物可删除
```

### Q8: 如何停止 Server？

```bash
# 前台运行: Ctrl+C
# 后台运行: kill 进程
pkill deepbook-server

# 或通过 systemd
sudo systemctl stop deepbook-server
```

### Q9: Indexer 同步太慢？

- Testnet 同步更快（数据量小）
- 主网首次同步可能需要数小时到一天
- 考虑从已有的数据库快照恢复
- 使用更快的网络连接和磁盘（SSD 推荐）

### Q10: Rust 版本太旧？

```bash
# 更新 Rust
rustup update stable

# 查看当前版本
rustc --version
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

# Indexer 启动（最小配置）
cargo run --release --package deepbook-indexer -- \
  --env mainnet \
  --packages deepbook
```
