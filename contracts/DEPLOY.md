# TradingPanda 合约 Testnet 部署记录

> 权威 ID 以 `dev-docs/DEV_CONTEXT.md` §3 为准；本文件便于 `contracts/` 目录内快速查阅。

## 最新 publish（2026-05-25）

| 项 | 值 |
|----|-----|
| Network | Sui Testnet |
| Deployer | `0xa4594358c0a6b99237fcb5e6b4beca05021280584de70ea3a9724c0e44d97bf3` |
| Transaction | `HM2XXX4MHQzskM6TLgxmoYAsJJarRJfiAKUuWrjaZiQ3` |
| Package ID | `0x595087bb3e5f6c5011585797e4eb4db513b55d39ce84f984bb357e9375c11465` |
| PandaRegistry (shared) | `0x5cbf822c3fe346d7001125ff0ad52d675611148b2c4734d1e200ebf23d53baa5` |
| AchievementRegistry (shared) | `0x53c879bc3560a54548219f0a1f44dff471792c585a7b666829cfa08e722c8f8b` |
| AdminCap | `0xf6ff3f496b7471353dc2ea3c7732cd822f596cdb62d27bdb0362171862b60a00` |
| UpgradeCap | `0x40d481fc083c49ea5d1f48d25a60096ec07a49197370e9efe7a1cda3cd8e381e` |

## 模块

`achievement`, `checkin`, `deepbook_adapter`, `experience`, `market`, `mint`, `panda`, `panda_registry`, `strategy`, `trust_proof`

## 铸造入口

```text
{PACKAGE_ID}::mint::mint
```

参数：`registry` (PandaRegistry), `r` (Random), `clock` (Clock)

## 重新 publish

1. 删除或清空 `Published.toml` 中 `[published.testnet]` 段
2. `sui client publish --gas-budget 500000000`
3. 更新 `DEV_CONTEXT.md` §3、§9 与前后端 `.env`

## 升级（非重新 publish）

```bash
sui client upgrade --upgrade-capability 0x40d481fc083c49ea5d1f48d25a60096ec07a49197370e9efe7a1cda3cd8e381e
```

需使用持有该 UpgradeCap 的钱包（当前为 deployer `0xa459…`）。
