# Epic 1 Mint — Testnet 端到端验收（1.5）

## 前置

- `backend`: `DATABASE_URL`、`JWT_SECRET`、`REDIS_URL`（钱包登录）、`PACKAGE_ID`、`SUI_RPC_URL`
- `alembic upgrade head` + 可选 `python scripts/seed_dev.py`
- `frontend`: `.env.local` 含 `NEXT_PUBLIC_PACKAGE_ID`、`NEXT_PUBLIC_REGISTRY_ID`、`BACKEND_URL`
- 钱包 Testnet SUI ≥ 0.05

## 流程

1. 打开 `http://localhost:3000`，连接钱包并登录
2. 若未填问卷 → 自动跳转 `/onboarding`，完成 5 步 → `/mint`
3. `/mint` 点击「铸造熊猫」→ 钱包确认 → 揭晓性格/天赋 →「进入模拟盘」
4. Dashboard 加载熊猫详情（`GET /api/panda/:id`）

## 错误态手测

| 场景 | 预期 |
|------|------|
| 拒绝签名 | 提示「你已取消签名」+ 重试按钮 |
| Gas 不足 | 提示余额不足 + Testnet faucet 链接 |
| 重复注册同一 object | 409 / 错误提示 |

## 自动化

```bash
cd backend && pytest tests/test_mint_event_parser.py tests/test_panda_schemas.py tests/test_onboarding_survey.py tests/test_panda_stats.py -q
cd frontend && npm run type-check
```
