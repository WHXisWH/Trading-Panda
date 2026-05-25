# K 线 WebSocket 服务设计文档（方案乙 · 可选）

> 版本 1.2 · 2026-05-20  
> **MVP 已采用方案甲**：`market-monitor` 读 PG `order_fills` → `PUBLISH market:tick:*` → **WebSocket Hub** 转发 K 线 + **REST** 历史；**无需**本服务。  
> 本文档保留为 **高频/拆流** 时的可选实现（独立 `:9009` WSS）。

---

## 〇、方案甲 vs 方案乙

| | **方案甲（MVP，已锁定）** | **方案乙（本文档）** |
|--|-------------------------|---------------------|
| K 线聚合 | **market-monitor** | 独立 kline-ws |
| 实时推送 | Redis `market:tick` → **CF Hub** | WSS `:9009` 直连浏览器 |
| 历史 K 线 | monitor **`GET /candles`** | kline `subscribe` + `initial_count` |
| 前端连接数 | **1** 根 WSS | **2** 根 WSS |
| 何时用乙 | — | Hub Redis 流量过大、要逐笔推 bar、公开行情 API |

---

## 一、背景与决策（方案乙）

### 1.0 第一性原理：为何不用 Cloudflare Workers 做聚合

| 需求 | Cloudflare Workers | 结论 |
|------|-------------------|------|
| 查询 PostgreSQL | ❌ 无法直连 | 需 HTTP 中转，延迟与复杂度增加 |
| Python 聚合逻辑 | ❌ 仅 JS/TS | 与 Decision Engine 同栈应在 Python VPS |
| 持续运行 + 维护 K 线状态 | ⚠️ 依赖 Durable Objects | VPS 常驻进程更简单 |
| WebSocket 长连接 | ✅（需 DO） | **不适合**承担 K 线主路径 |

**方案甲下**：Hub 转发 `market:tick` 即可。**方案乙下**：Hub 只负责 `panda:*`；K 线由 VPS `:9009` 提供。

### 1.1 问题

TradingPanda 前端需要实时 K 线数据用于 K 线图展示（`lightweight-charts`）。现有数据源存在两个问题：

| 方案 | 问题 | 结论 |
|------|------|------|
| DeepBook Server `/ohclv` 端点 | DeepBook v3 Server 的 `/ohclv` 端点无数据（该功能未实现或不可用） | ❌ 不可用 |
| PostgreSQL 物化视图 | 数据更新延迟高，无法满足实时性要求 | ❌ 不可用 |

### 1.2 最终方案

**构建独立的 K 线 WebSocket 数据推送服务**，实时从 `order_fills` 表（PostgreSQL）聚合 K 线并推送。

核心原则：
- **不依赖 DeepBook Server** 的行情 API
- **K 线数据来源于 order_fills**（交易系统自己产生的成交记录）
- **实时在线聚合**：每次新成交到达时，更新内存中的 K 线状态，间隔时间窗切割

---

## 二、服务架构

### 2.1 整体架构

```
order_fills 表 (PostgreSQL)
    │
    ▼
K 线 WebSocket 服务 (Python + FastAPI + asyncpg)
    │
    ├── 定时查询 order_fills 增量数据（last_id 游标）
    ├── 聚合 K 线（1m, 5m, 15m, 1h, 4h, 1d）
    ├── 维护内存状态（当前时间窗的 open/high/low/close/volume）
    ├── 按时间窗切割：时间窗结束时固化当前 K 线，开启下一根
    │
    └── WebSocket 推送（每个连接的订阅实时推送）
        │
        ▼
    前端 / PandaActor / 其他消费者
```

### 2.2 服务位置（VPS，已锁定）

| 维度 | 值 |
|------|-----|
| 服务名 | `kline-ws-service` |
| 部署主机 | **VPS `152.53.166.128`**（与 DeepBook Server / Indexer / PostgreSQL 同机） |
| 端口 | **9009**（可配置；与 DeepBook Server **9008**、PostgreSQL **5433** 并列） |
| 协议 | WebSocket（`ws://` 内网；生产经 Nginx/Caddy **WSS** 终止） |
| 依赖 | PostgreSQL **本地** `:5433`（读取 `order_fills`，由 **DeepBook Indexer** 写入） |
| 无依赖 | Cloudflare Workers、Upstash Redis、Render |

### 2.3 架构图（仅方案乙启用时）

```
VPS — K-line WSS :9009 ← order_fills
浏览器 WSS → :9009（图表） + WSS → CF Hub（熊猫）
```

**方案甲（当前）不部署本服务**；见 `docs/market-monitor-design.md` §7。

---

## 三、技术选型

| 组件 | 选择 | 理由 |
|------|------|------|
| 运行时 | Python 3.11+ | 与后端技术栈一致 |
| Web 框架 | FastAPI | 原生 WebSocket 支持、async 全栈、文档自动生成 |
| ASGI 服务器 | uvicorn + WebSocket 支持 | 生产级 WS/ASGI 容器 |
| 数据库驱动 | asyncpg | 异步 PostgreSQL 访问，高效游标查询 |
| 数据格式 | JSON | 通用、前端原生支持 |

依赖清单（`requirements.txt`）：

```
fastapi>=0.110.0
uvicorn[standard]>=0.29.0
asyncpg>=0.29.0
pydantic>=2.7.0
asyncio>=3.4.3
```

---

## 四、WebSocket 协议设计

### 4.1 端点

```
ws://host:9009/ws/klines/{pool_name}
```

| 参数 | 说明 | 示例 |
|------|------|------|
| `pool_name` | 交易池名称 | `DEEP/SUI` |

### 4.2 客户端 → 服务端（订阅管理）

#### 订阅 K 线

```json
{
    "action": "subscribe",
    "pool_name": "DEEP/SUI",
    "interval": "1m"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | string | 是 | 固定值 `subscribe` |
| `pool_name` | string | 是 | 交易池名称 |
| `interval` | string | 是 | K 线周期，支持：`1m`, `5m`, `15m`, `1h`, `4h`, `1d` |

#### 取消订阅

```json
{
    "action": "unsubscribe",
    "pool_name": "DEEP/SUI",
    "interval": "1m"
}
```

#### 批量订阅

```json
{
    "action": "subscribe",
    "subscriptions": [
        {"pool_name": "DEEP/SUI", "interval": "1m"},
        {"pool_name": "DEEP/SUI", "interval": "5m"},
        {"pool_name": "DEEP/USDC", "interval": "1h"}
    ]
}
```

#### 初始历史数据请求

连接建立后，客户端可请求最近 N 根 K 线作为初始数据：

```json
{
    "action": "subscribe",
    "pool_name": "DEEP/SUI",
    "interval": "1m",
    "initial_count": 100
}
```

服务端会先推送 `initial_count` 根历史 K 线，然后持续推送实时更新。

### 4.3 服务端 → 客户端（数据推送）

#### K 线数据推送

```json
{
    "type": "kline",
    "pool_name": "DEEP/SUI",
    "interval": "1m",
    "data": {
        "timestamp": 1716100000,
        "open": 1.234,
        "high": 1.250,
        "low": 1.220,
        "close": 1.245,
        "volume": 1000000,
        "trade_count": 50
    }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | string | 固定值 `kline` |
| `pool_name` | string | 交易池名称 |
| `interval` | string | K 线周期 |
| `data.timestamp` | int64 | K 线时间窗起始 Unix 时间戳（秒） |
| `data.open` | float | 开盘价（时间窗内第一笔成交价） |
| `data.high` | float | 最高价 |
| `data.low` | float | 最低价 |
| `data.close` | float | 收盘价（时间窗内最后一笔成交价） |
| `data.volume` | float | 成交量（数量之和） |
| `data.trade_count` | int | 成交笔数 |

#### K 线关闭推送

当 K 线时间窗结束时（新的一根开始），服务端推送该 K 线的最终数据：

```json
{
    "type": "kline_closed",
    "pool_name": "DEEP/SUI",
    "interval": "1m",
    "data": {
        "timestamp": 1716100000,
        "open": 1.234,
        "high": 1.260,
        "low": 1.220,
        "close": 1.258,
        "volume": 1200000,
        "trade_count": 62
    }
}
```

#### 订阅确认

```json
{
    "type": "subscribed",
    "pool_name": "DEEP/SUI",
    "interval": "1m"
}
```

#### 取消订阅确认

```json
{
    "type": "unsubscribed",
    "pool_name": "DEEP/SUI",
    "interval": "1m"
}
```

#### 错误消息

```json
{
    "type": "error",
    "code": "INVALID_POOL",
    "message": "Pool DEEP/XYZ not found"
}
```

| 错误码 | 说明 |
|--------|------|
| `INVALID_POOL` | 交易池不存在 |
| `INVALID_INTERVAL` | 不支持的 K 线周期 |
| `INVALID_ACTION` | 不支持的操作类型 |
| `INTERNAL_ERROR` | 服务内部错误 |

---

## 五、K 线聚合算法

### 5.1 核心算法

```python
from typing import List, Optional, Dict

def aggregate_kline(fills: List[dict], interval: str) -> Optional[dict]:
    """从成交记录聚合 K 线。

    Args:
        fills: 时间窗内的成交记录列表，按时间升序排列
               每条记录包含 price, quantity, timestamp 等字段
        interval: K 线周期（'1m', '5m', '15m', '1h', '4h', '1d'）

    Returns:
        K 线字典，或在无成交时返回 None
    """
    if not fills:
        return None

    prices = [f['price'] for f in fills]
    volumes = [f['quantity'] for f in fills]

    return {
        'open': prices[0],
        'high': max(prices),
        'low': min(prices),
        'close': prices[-1],
        'volume': sum(volumes),
        'trade_count': len(fills)
    }
```

### 5.2 增量更新

```python
async def update_kline_state(
    current: dict,
    new_fills: List[dict]
) -> dict:
    """用新成交记录增量更新当前 K 线状态。"""
    for fill in new_fills:
        price = fill['price']
        qty = fill['quantity']

        if price > current['high']:
            current['high'] = price
        if price < current['low']:
            current['low'] = price

        current['close'] = price
        current['volume'] += qty
        current['trade_count'] += 1

    return current
```

### 5.3 时间窗切割逻辑

```python
import math
from datetime import datetime, timezone

def get_interval_seconds(interval: str) -> int:
    """返回 K 线周期的秒数。"""
    units = {
        '1m': 60,
        '5m': 300,
        '15m': 900,
        '1h': 3600,
        '4h': 14400,
        '1d': 86400,
    }
    return units[interval]

def get_window_start(ts: int, interval: str) -> int:
    """计算给定时间戳所属的 K 线时间窗起始时间。

    将 Unix 时间戳对齐到周期起点。
    """
    seconds = get_interval_seconds(interval)
    return (ts // seconds) * seconds

def should_start_new_window(ts: int, current_window_start: int, interval: str) -> bool:
    """判断是否应开启新的 K 线时间窗。"""
    actual_start = get_window_start(ts, interval)
    return actual_start != current_window_start
```

### 5.4 完整聚合循环

```python
async def aggegation_loop(pool_name: str):
    """K 线聚合主循环。

    每 N 秒轮询一次 order_fills 表，获取增量数据，
    更新内存中的 K 线状态，推送变化到已订阅的连接。
    """
    last_id = await get_last_processed_id(pool_name)
    current_candles = init_empty_candles()  # 每个 interval 一个

    while True:
        # 1. 获取自上次轮询以来的新成交
        new_fills = await fetch_fills_since_id(pool_name, last_id)

        if new_fills:
            # 2. 按 pool_name + 时间窗分组
            grouped = group_by_window(new_fills, get_window_start)

            for window_start, fills in grouped.items():
                for interval in current_candles:
                    # 检查是否需要切窗
                    if should_start_new_window(
                        fills[-1]['timestamp'],
                        current_candles[interval]['window_start'],
                        interval
                    ):
                        # 推送关闭的 K 线
                        await broadcast_closed_kline(
                            pool_name, interval, current_candles[interval]
                        )
                        # 开启新的 K 线
                        current_candles[interval] = new_candle(
                            window_start, interval
                        )

                    # 增量更新
                    await update_kline_state(current_candles[interval], fills)
                    # 推送实时更新
                    await broadcast_kline_update(
                        pool_name, interval, current_candles[interval]
                    )

            last_id = new_fills[-1]['id']

        await asyncio.sleep(POLL_INTERVAL)  # 默认 1 秒
```

---

## 六、服务实现设计

### 6.1 项目结构

```
kline-ws-service/
├── main.py              # FastAPI 应用入口 + WebSocket 端点
├── kline_aggregator.py  # K 线聚合算法 + 时间窗管理
├── db.py                # asyncpg 连接池 + order_fills 查询
├── ws_manager.py        # WebSocket 连接管理器
├── models.py            # Pydantic 数据模型
├── config.py            # 配置（端口、DB URL、轮询间隔等）
├── requirements.txt     # 依赖清单
└── Dockerfile           # 容器化部署
```

### 6.2 核心类设计

```python
# ws_manager.py
class ConnectionManager:
    """管理所有 WebSocket 连接及其订阅。"""

    def __init__(self):
        # {connection_id: {pool_name: {interval: True}}}
        self._connections: dict = {}
        # {(pool_name, interval): {connection_id: WebSocket}}
        self._subscriptions: dict = {}

    async def connect(self, websocket: WebSocket) -> str:
        """接受新连接，返回 connection_id。"""

    def add_subscription(self, conn_id: str, pool_name: str, interval: str):
        """为连接添加订阅。"""

    def remove_subscription(self, conn_id: str, pool_name: str, interval: str):
        """取消订阅。"""

    async def disconnect(self, conn_id: str):
        """断开连接并清理所有订阅。"""

    async def broadcast_to_subscribers(
        self, pool_name: str, interval: str, message: dict
    ):
        """向订阅了指定 (pool_name, interval) 的所有连接推送消息。"""

# kline_aggregator.py
class KlineState:
    """每个 (pool_name, interval) 对的内存 K 线状态。"""

    def __init__(self):
        self.candles: dict = {}     # {(pool_name, interval): Candle}
        self.windows: dict = {}     # {(pool_name, interval): window_start}

    def update(self, pool_name: str, interval: str, fills: List[dict]) -> List[dict]:
        """更新 K 线状态。返回需要推送的更新列表。"""

    def close_candle(self, pool_name: str, interval: str) -> Optional[dict]:
        """关闭当前时间窗的 K 线并返回其数据。"""
```

### 6.3 order_fills 表查询

实现基于 `last_id` 游标的增量轮询：

```python
async def fetch_fills_since_id(
    pool_name: str,
    last_id: int,
    pool: asyncpg.Pool
) -> list[dict]:
    """查询自 last_id 之后的新成交记录。"""
    query = """
        SELECT
            id,
            pool_name,
            price,
            quantity,
            EXTRACT(EPOCH FROM created_at)::BIGINT AS timestamp
        FROM order_fills
        WHERE pool_name = $1
          AND id > $2
        ORDER BY id ASC
        LIMIT 1000
    """
    rows = await pool.fetch(query, pool_name, last_id)
    return [dict(row) for row in rows]
```

### 6.4 WebSocket 端点

```python
# main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from ws_manager import ConnectionManager

app = FastAPI(title="Kline WebSocket Service")
manager = ConnectionManager()

@app.websocket("/ws/klines/{pool_name}")
async def kline_websocket(websocket: WebSocket, pool_name: str):
    conn_id = await manager.connect(websocket)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "subscribe":
                if "subscriptions" in data:
                    for sub in data["subscriptions"]:
                        manager.add_subscription(
                            conn_id, sub["pool_name"], sub["interval"]
                        )
                else:
                    pool = data.get("pool_name", pool_name)
                    interval = data["interval"]
                    manager.add_subscription(conn_id, pool, interval)

                await websocket.send_json({
                    "type": "subscribed",
                    "pool_name": data.get("pool_name", pool_name),
                    "interval": data.get("interval", "")
                })

            elif action == "unsubscribe":
                pool = data.get("pool_name", pool_name)
                interval = data.get("interval", "")
                manager.remove_subscription(conn_id, pool, interval)
                await websocket.send_json({
                    "type": "unsubscribed",
                    "pool_name": pool,
                    "interval": interval
                })

    except WebSocketDisconnect:
        await manager.disconnect(conn_id)
```

---

## 七、部署方案

### 7.1 Docker 部署

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 9009
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9009", "--ws", "auto"]
```

### 7.2 Render 部署（推荐）

| 配置项 | 值 |
|--------|-----|
| 服务类型 | Web Service |
| Runtime | Python 3.11 |
| 启动命令 | `uvicorn main:app --host 0.0.0.0 --port $PORT --ws auto` |
| 端口 | 自动（Render 分配），本地 9009 |
| 健康检查 | `GET /health` 返回 200 |
| 环境变量 | `DATABASE_URL`, `POOL_INTERVAL`（可选） |

### 7.3 环境变量

```
DATABASE_URL=postgresql://user:pass@host:5432/tradingpanda
WS_HOST=0.0.0.0
WS_PORT=9009
POLL_INTERVAL=1         # 轮询间隔（秒）
```

### 7.4 反向代理（生产 WSS）

生产环境建议通过 Nginx/Caddy 做 TLS 终止 + 反向代理：

```
# nginx 配置示例
server {
    listen 443 ssl;
    server_name kline.example.com;

    ssl_certificate     /etc/ssl/certs/example.crt;
    ssl_certificate_key /etc/ssl/private/example.key;

    location /ws/klines/ {
        proxy_pass http://127.0.0.1:9009;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

---

## 八、连接管理与背压

### 8.1 连接限制

| 限制项 | 建议值 | 说明 |
|--------|--------|------|
| 最大连接数 | 1000 | 超过返回 503 |
| 每连接最大订阅数 | 10 | 防止单个客户端过载 |
| 消息发送超时 | 5s | 慢客户端断开连接 |
| 心跳间隔 | 30s | `PING` 维护连接存活 |

### 8.2 心跳

服务端每 30 秒发送 `PING` 帧，客户端应在 10 秒内回复 `PONG`，否则断开连接。服务端推送的空闲超时为 60 秒。

### 8.3 背压处理

```
┌──────────────┐     ┌───────────────┐     ┌────────────┐
│ 数据源触发    │────▶│ 消息队列      │────▶│ WebSocket  │
│（新成交）    │     │ (asyncio.Queue)│     │ 发送协程   │
└──────────────┘     └───────────────┘     └────────────┘
                              │
                              │ 队列满（maxsize=100）→ 丢弃旧消息
                              ▼
                        日志告警：客户端消费过慢
```

---

## 九、监控与指标

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| `active_connections` | 当前连接数 | > 800 |
| `messages_pushed` | 总推送消息数（counter） | — |
| `push_latency_ms` | 推送延迟 | > 500ms |
| `connection_errors` | 连接错误计数 | > 10/min |
| `fill_poll_latency` | DB 轮询延迟 | > 200ms |
| `kline_aggregations` | 每分钟聚合次数 | — |

---

## 十、历史 K 线初始化

服务启动时，对于新的订阅请求，需要提供历史 K 线数据。

### 10.1 历史数据来源

```python
async def get_historical_klines(
    pool_name: str,
    interval: str,
    count: int,
    pool: asyncpg.Pool
) -> list[dict]:
    """从 order_fills 表聚合历史 K 线。"""
    interval_seconds = get_interval_seconds(interval)
    now = int(datetime.now(timezone.utc).timestamp())
    since = now - (count * interval_seconds)

    fills = await fetch_fills_since_timestamp(pool_name, since, pool)
    grouped = group_by_window(fills, lambda ts: get_window_start(ts, interval))

    klines = []
    for window_start in sorted(grouped.keys(), reverse=True)[:count]:
        kline = aggregate_kline(grouped[window_start], interval)
        if kline:
            kline['timestamp'] = window_start
            klines.append(kline)

    return klines  # 按时间升序返回
```

### 10.2 推送到新连接

客户端连接并在订阅时指定 `initial_count`：

```json
{
    "action": "subscribe",
    "pool_name": "DEEP/SUI",
    "interval": "1m",
    "initial_count": 100
}
```

服务端先推送 `initial_count` 根历史 K 线（`type: "kline"`），然后开始推送实时更新。

---

## 十一、与现有系统集成

### 11.1 与 market-monitor 的关系

| 维度 | market-monitor | K 线 WebSocket 服务 |
|------|---------------|-------------------|
| 数据源 | DeepBook Server HTTP API | order_fills 表 (PostgreSQL) |
| 推送内容 | 实时 tick（价格、成交量、技术指标） | K 线（OHLCV 聚合） |
| 输出 | Redis Pub/Sub `market:tick:*` | WebSocket 直推 |
| 用途 | Decision Engine 实时决策输入 | 前端 K 线图展示 |

两者互补，不重叠。

### 11.2 与 WebSocket Hub 的关系

- **方案甲**：Hub 订 `market:tick` + `panda:*`；**不需要**本服务。  
- **方案乙**：Hub 只订 `panda:*`；图表走 `:9009`；须保持与 monitor **同一套**聚合算法，避免双轨价差。
