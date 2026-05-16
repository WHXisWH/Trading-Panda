# Market Monitor

独立 **DeepBook v3** 行情监听服务（架构方案 B）。

- 设计文档：**[docs/market-monitor-design.md](../docs/market-monitor-design.md)**
- 发布 Redis：`market:tick:{pair}`（完整 `MarketEvent`）
- Decision Engine 仅订阅，不轮询 Sui

## 本地（实现后）

```bash
cp .env.example .env
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

## 部署

见根目录 `render.yaml` 服务 `trading-panda-market-monitor`。
