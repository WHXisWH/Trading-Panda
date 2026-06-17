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

`achievement`, `agent_wallet`, `chain_proof_executor`, `checkin`, `deepbook_adapter`, `experience`, `market`, `mint`, `panda`, `panda_coin`, `panda_registry`, `panda_vault`, `strategy`, `trading_policy`, `trust_proof`

## 铸造入口

```text
{PACKAGE_ID}::mint::mint
```

参数：`registry` (PandaRegistry), `r` (Random), `clock` (Clock)

## 重新 publish

1. 删除或清空 `Published.toml` 中 `[published.testnet]` 段
2. `sui client publish --gas-budget 500000000`
3. 更新 `DEV_CONTEXT.md` §3、§9 与前后端 `.env`

## 升级（2026-06-18，v1 → v2）

| 项 | 值 |
|----|-----|
| CLI | `testnet-v1.73.1`（`~/.local/bin/sui-testnet`） |
| Transaction | `Ftg2Yu7dz94xHubPKdcqieK8DMJj3KjV4zRftkMA1cjB` |
| original-id（调用地址不变） | `0x595087bb3e5f6c5011585797e4eb4db513b55d39ce84f984bb357e9375c11465` |
| published-at（v2 对象） | `0x9e8a64e122e6a1486f169bfca2ac9ff5aff28da29ebea53e8b6c56e101d95262` |
| Version | 2 |

首次 upgrade 曾因 `panda_coin::init` 失败（`FeatureNotYetSupported`）；已改为 `setup_currency` 后成功。

升级后须 deployer 手动调用一次 `panda_coin::bootstrap_currency` 创建 TreasuryCap（v3+；需传入系统 `CoinRegistry` `0xc` 与 `AdminCap`）。

## 升级（2026-06-18，v2 → v3）

| 项 | 值 |
|----|-----|
| Transaction | `APAEyimP9KhCfHiDSsFQVSwkJu9gBXugoyiW3UMWSLXq` |
| published-at（v3 对象） | `0xb2c3e7152853ddcd41256a27a43466ab84b29a5bec2d9ca9543a1b4c43f162b8` |
| Version | 3 |
| 变更 | `panda_coin::bootstrap_currency` + `mint_training_credit`（`coin_registry` 路径） |

## 升级（2026-06-18，v3 → v4）

| 项 | 值 |
|----|-----|
| Transaction | `2ycsrXZHFK4xQ5iQQ42mYaoCexnDMoLdcUfuSoMZCfBr` |
| published-at（v4 对象） | `0x00d500fb909a63177ae0f88812a06b0ba071e151dd5cb80e9f51af250d6a6339` |
| Version | 4 |
| 变更 | `panda_vault::deposit_training_credit` / `withdraw_training_credit`（`PandaTrainingToken` dynamic field） |

## PandaCoin bootstrap（印钞机）

| 项 | 值 |
|----|-----|
| Transaction | `6229ATwhDTEnRNS4fyqcVj6wdXoax1yBps7d4mafhXPt` |
| TreasuryCap (`PandaTrainingToken`) | `0x3286e67193c94b1a46fbcc2d08632c30cc6c30dd5b4f31a8787942d8a04b98f6` |
| PandaCoinAdminCap | `0x44e4ee18e846133db694bd5cd82969230b3d3b55ace6e3acb4969118e213064a` |
| CoinRegistry（系统共享对象） | `0x000000000000000000000000000000000000000000000000000000000000000c` |

```bash
sui client call \
  --package 0xb2c3e7152853ddcd41256a27a43466ab84b29a5bec2d9ca9543a1b4c43f162b8 \
  --module panda_coin \
  --function bootstrap_currency \
  --args 0xf6ff3f496b7471353dc2ea3c7732cd822f596cdb62d27bdb0362171862b60a00 \
         0x000000000000000000000000000000000000000000000000000000000000000c \
  --gas-budget 200000000
```

铸币：`panda_coin::mint_training_credit`（非 legacy `mint`/`PANDA_COIN`）。

## Vault 存 PandaTrainingToken（v4）

兼容升级：余额存在 `PandaVault` 的 dynamic field（`TrainingCreditBalanceKey`），不改 legacy `panda_coin_balance: Balance<PANDA_COIN>` 字段。

| 入口 | 说明 |
|------|------|
| `deposit_training_credit(vault, coin, ctx)` | 主人存入 `Coin<PandaTrainingToken>` |
| `withdraw_training_credit(vault, amount, ctx)` | 主人取出 |
| `training_credit_balance(vault)` | 查询余额 |

```bash
# v4 upgrade 后（published-at 见 Published.toml）
sui client call --package 0x00d500fb909a63177ae0f88812a06b0ba071e151dd5cb80e9f51af250d6a6339 --module panda_vault \
  --function deposit_training_credit \
  --args <vault_id> <coin_object_id> --gas-budget 100000000
```

```bash
SUI_BIN=~/.local/bin/sui-testnet ./scripts/upgrade-testnet.sh
```

## 升级（非重新 publish）

```bash
sui client upgrade --upgrade-capability 0x40d481fc083c49ea5d1f48d25a60096ec07a49197370e9efe7a1cda3cd8e381e
```

需使用持有该 UpgradeCap 的钱包（当前为 deployer `0xa459…`）。
