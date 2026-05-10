# TradingPanda 合约设计文档

> 版本 1.0 · 2026-05-08
> 基于：product-design.md、trading-behavior-mechanics.md、trust-model-options.md、panda.move Demo
> 链：Sui Move

---

## 一、模块总览

| 模块 | 文件名 | 职责 | 对象类型 |
|------|--------|------|----------|
| `panda` | panda.move | 核心 NFT：性格五轴 + 天赋 + 交易锁 + Display 注册 | Owned Object |
| `panda_registry` | panda_registry.move | 全局注册表：铸造统计、配额管理 | Shared Object |
| `strategy` | strategy.move | 策略哈希存储、策略变更历史（残影记录） | Dynamic Field on Panda |
| `experience` | experience.move | 经验等级 + Walrus blob_id 存储、里程碑事件 | Dynamic Field on Panda |
| `trust_proof` | trust_proof.move | Merkle Root 提交与验证、Nautilus TEE attestation 预留 | Dynamic Field on Panda |
| `achievement` | achievement.move | 成就定义注册表 + 解锁记录 | Shared Object + Dynamic Field |
| `market` | market.move | Kiosk 集成、TransferPolicy、版税规则、上架/下架/购买 | Kiosk / TransferPolicy |
| `checkin` | checkin.move | 链上奖励发放（管理员调用）；签到记录本身不上链 | AdminCap 控制 |
| `deepbook_adapter` | deepbook_adapter.move | DeepBook 交互接口：订单簿查询、模拟执行 | 无状态工具模块 |

---

## 二、数据结构定义

### 2.1 核心结构

```move
/// 熊猫 NFT 主体（Owned Object）
/// 性格五轴 + 天赋在铸造时固化，不可修改
/// 来源：product-design.md §4.1 — "性格五轴永久固化在 NFT struct 中"
public struct Panda has key, store {
    id: UID,
    // --- 性格五轴 (0-100)，铸造时 sui::random 生成，不可变 ---
    boldness: u8,       // 胆识：影响入场阈值、仓位比例
    patience: u8,       // 耐性：影响入场延迟、持仓耐心
    intuition: u8,      // 直觉：影响无规则时的直觉信号
    focus: u8,          // 专注：影响最大同时持仓资产数
    contrarian: u8,     // 逆向性：影响群体信号反向程度
    // --- 稀有天赋 (0-6)，加权随机，不可变 ---
    talent: u8,         // 0=无, 1=竹林禅心, 2=黑白视界, 3=冬眠反弹, 4=竹笋嗅觉, 5=镜像思维, 6=老熊记忆
    // --- 铸造信息，不可变 ---
    mint_time: u64,     // 铸造 epoch
    generation: u64,    // 全局铸造序号
    // --- 状态标记，可变 ---
    is_trading: bool,   // 交易锁：true 时禁止转让
    created_at: u64,    // 铸造时的 epoch_timestamp_ms
}
```

```move
/// 全局注册表（Shared Object）
/// 来源：需求——全局统计 + 铸造配额管理
public struct PandaRegistry has key {
    id: UID,
    total_minted: u64,       // 累计铸造总量
    active_count: u64,       // 活跃熊猫数量（未休眠）
    dormant_count: u64,      // 休眠熊猫数量
    max_supply: u64,         // 最大铸造上限（可由 AdminCap 调整）
    mint_enabled: bool,      // 铸造开关
}
```

```move
/// 管理员权限凭证
public struct AdminCap has key, store {
    id: UID,
}
```

```move
/// 铸造权凭证（可选：用于委托铸造场景）
public struct MintCap has key {
    id: UID,
    total_minted: u64,
}
```

### 2.2 策略相关结构

```move
/// 策略快照（Dynamic Field 挂载在 Panda 上）
/// key = b"current_strategy"
/// 来源：product-design.md §4.2 — "策略哈希存链上"
public struct StrategySnapshot has store, drop {
    strategy_hash: vector<u8>,   // 策略内容的 SHA-256 哈希
    strategy_type: String,       // 策略类型标签（如 "trend_following"）
    updated_at: u64,             // 最近更新 epoch_timestamp_ms
    proficiency: u16,            // 当前策略熟练度 (0-10000, 放大100倍)
}

/// 策略残影记录（Dynamic Field，key = b"strategy_shadow_{index}"）
/// 来源：trading-behavior-mechanics.md — "频繁换策惩罚: 熟练度重置，且残影叠加"
public struct StrategyShadow has store, drop {
    strategy_hash: vector<u8>,       // 被替换策略的哈希
    switch_timestamp: u64,           // 切换时间
    proficiency_at_switch: u16,      // 切换时的熟练度
    duration_epochs: u64,            // 该策略持续使用的 epoch 数
}

/// 策略残影索引（Dynamic Field，key = b"strategy_shadows"）
public struct StrategyShadowIndex has store, drop {
    count: u64,                      // 残影总数
    total_switches: u64,             // 累计策略切换次数
}
```

### 2.3 经验相关结构

```move
/// 经验摘要（Dynamic Field，key = b"experience"）
/// 来源：product-design.md §4.3 — "每 50 笔交易同步到 Walrus"
public struct ExperienceDigest has store, drop {
    level: u16,                  // 经验等级 (0-100)
    total_trades: u64,           // 累计交易笔数
    win_rate: u64,               // 胜率 × 10000（如 6523 = 65.23%）
    walrus_blob_id: String,      // Walrus 存储的 blob_id，指向完整经验数据
    last_updated: u64,           // 最后更新 epoch_timestamp_ms
}
```

### 2.4 信任证明结构

```move
/// Merkle Root 提交记录（Dynamic Field，key = b"trust_proof_{index}"）
/// 来源：trust-model-options.md §方案B — Merkle Root 定期提交
public struct MerkleProof has store, drop {
    root_hash: vector<u8>,       // 决策日志 Merkle Tree 的根哈希
    trade_count: u64,            // 本批次包含的交易笔数
    start_trade_id: u64,         // 起始交易 ID
    end_trade_id: u64,           // 结束交易 ID
    timestamp: u64,              // 提交时间 epoch_timestamp_ms
}

/// 信任证明索引（Dynamic Field，key = b"trust_proofs"）
public struct TrustProofIndex has store, drop {
    count: u64,                  // 已提交的 Merkle Root 数量
    total_verified_trades: u64,  // 已验证的总交易笔数
}

// === 正式版启用：Nautilus TEE Attestation ===
// 来源：trust-model-options.md §方案A — "黑客松直接上 Nautilus TEE"
//
// public struct NautilusAttestation has store, drop {
//     input_hash: vector<u8>,      // 输入哈希（性格参数 + 市场数据 + 策略）
//     output_hash: vector<u8>,     // 输出哈希（交易信号）
//     tee_identity: vector<u8>,    // TEE 身份证明
//     attestation_sig: vector<u8>, // 密码学签名
//     timestamp: u64,
// }
//
// public fun verify_nautilus_attestation(
//     panda: &Panda,
//     attestation: NautilusAttestation,
// ): bool { ... }
```

### 2.5 成就结构

```move
/// 成就定义注册表（Shared Object）
/// 来源：架构决策 — "成就解锁记录上链"
public struct AchievementRegistry has key {
    id: UID,
    total_achievements: u64,     // 已定义的成就总数
    // Dynamic Fields: achievement_id => AchievementDef
}

/// 成就定义（Dynamic Field on AchievementRegistry，key = achievement_id）
public struct AchievementDef has store, drop {
    achievement_id: u64,
    name: String,                // 成就名称，如 "首笔盈利"
    description: String,         // 成就描述
    category: u8,                // 分类：0=交易里程碑, 1=策略, 2=成长, 3=社交
    rarity: u8,                  // 稀有度：0=普通, 1=稀有, 2=史诗, 3=传说
}

/// 成就解锁记录（Dynamic Field on Panda，key = b"achievement_{achievement_id}"）
public struct AchievementUnlock has store, drop {
    achievement_id: u64,
    unlock_timestamp: u64,       // 解锁时间 epoch_timestamp_ms
    unlock_context: String,      // 解锁时的上下文描述（如 "第100笔交易"）
}

/// 成就解锁索引（Dynamic Field on Panda，key = b"achievements"）
public struct AchievementIndex has store, drop {
    unlocked_count: u64,         // 已解锁数量
    unlocked_ids: vector<u64>,   // 已解锁的 achievement_id 列表
}
```

### 2.6 生命周期事件辅助结构

```move
/// 休眠状态标记（Dynamic Field on Panda，key = b"dormancy"）
/// 来源：product-design.md §Q6 — "连续 30 天无操作 → 休眠"
public struct DormancyStatus has store, drop {
    is_dormant: bool,
    dormant_since: u64,          // 进入休眠时间
    experience_at_dormancy: u16, // 休眠时经验等级（用于衰减计算）
}
```

---

## 三、模块详细设计

### 3.1 panda 模块（核心 NFT）

基于现有 `panda.move` Demo 扩展。核心职责：NFT 铸造、Display 注册、性格查询、交易锁。

#### 常量与错误码

```move
// 错误码
const E_TRADING_IN_PROGRESS: u64 = 0;
const E_NOT_AUTHORIZED: u64 = 1;
const E_MINT_DISABLED: u64 = 2;
const E_MAX_SUPPLY_REACHED: u64 = 3;

// 天赋枚举
const TALENT_NONE: u8 = 0;
const TALENT_ZEN: u8 = 1;           // 竹林禅心 2% — 情绪永不进入恐慌
const TALENT_BW_VISION: u8 = 2;     // 黑白视界 3% — 震荡市信号加成
const TALENT_HIBERNATE: u8 = 3;     // 冬眠反弹 2% — 长期休眠后经验衰减减半
const TALENT_BAMBOO_NOSE: u8 = 4;   // 竹笋嗅觉 4% — 异常资金流检测加成
const TALENT_MIRROR: u8 = 5;        // 镜像思维 1% — 逆向操作时胜率加成
const TALENT_OLD_BEAR: u8 = 6;      // 老熊记忆 3% — 模式记忆容量 ×2
```

#### 初始化函数

```move
/// 模块初始化：创建 AdminCap，注册 Display<Panda>
fun init(otw: PANDA, ctx: &mut TxContext) {
    // 1. 创建 AdminCap 并转移给部署者
    transfer::transfer(
        AdminCap { id: object::new(ctx) },
        ctx.sender()
    );

    // 2. 注册 Display<Panda>
    let publisher = package::claim(otw, ctx);
    let mut display = display::new<Panda>(&publisher, ctx);
    display.add(string::utf8(b"name"), string::utf8(b"TradingPanda #{generation}"));
    display.add(string::utf8(b"description"), string::utf8(b"AI Trading Pet - Boldness:{boldness} Patience:{patience} Intuition:{intuition} Focus:{focus} Contrarian:{contrarian}"));
    display.add(string::utf8(b"image_url"), string::utf8(b"https://tradingpanda.xyz/api/panda/{id}/image"));
    display.add(string::utf8(b"project_url"), string::utf8(b"https://tradingpanda.xyz"));
    display.add(string::utf8(b"talent"), string::utf8(b"{talent}"));
    display::update_version(&mut display);

    transfer::public_transfer(publisher, ctx.sender());
    transfer::public_transfer(display, ctx.sender());
}
```

#### 铸造函数

```move
/// 铸造熊猫 NFT
/// 使用 sui::random 生成性格五轴 + 加权天赋
/// 来源：panda.move Demo + product-design.md §3.1
public entry fun mint_panda(
    registry: &mut PandaRegistry,
    r: &Random,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    // 检查铸造开关和配额
    assert!(registry.mint_enabled, E_MINT_DISABLED);
    assert!(registry.total_minted < registry.max_supply, E_MAX_SUPPLY_REACHED);

    let mut gen = random::new_generator(r, ctx);

    // 性格五轴 (0-100)
    let boldness = gen.generate_u8_in_range(0, 101);
    let patience = gen.generate_u8_in_range(0, 101);
    let intuition = gen.generate_u8_in_range(0, 101);
    let focus = gen.generate_u8_in_range(0, 101);
    let contrarian = gen.generate_u8_in_range(0, 101);

    // 加权天赋随机（15% 总概率有天赋）
    let talent_roll = gen.generate_u8_in_range(1, 101);
    let talent = if (talent_roll <= 2) TALENT_ZEN           // 2%
        else if (talent_roll <= 5) TALENT_BW_VISION          // 3%
        else if (talent_roll <= 7) TALENT_HIBERNATE           // 2%
        else if (talent_roll <= 11) TALENT_BAMBOO_NOSE        // 4%
        else if (talent_roll <= 12) TALENT_MIRROR              // 1%
        else if (talent_roll <= 15) TALENT_OLD_BEAR            // 3%
        else TALENT_NONE;                                      // 85%

    let now = clock::timestamp_ms(clock);
    registry.total_minted = registry.total_minted + 1;
    registry.active_count = registry.active_count + 1;

    let panda = Panda {
        id: object::new(ctx),
        boldness, patience, intuition, focus, contrarian,
        talent,
        mint_time: tx_context::epoch(ctx),
        generation: registry.total_minted,
        is_trading: false,
        created_at: now,
    };

    // 发出铸造事件
    event::emit(PandaMinted {
        panda_id: object::id(&panda),
        owner: ctx.sender(),
        boldness, patience, intuition, focus, contrarian,
        talent,
        generation: registry.total_minted,
        timestamp: now,
    });

    transfer::transfer(panda, ctx.sender());
}
```

#### 交易锁与转让

```move
/// 锁定交易状态（链下 Agent 在开始交易前调用）
public entry fun lock_trading(panda: &mut Panda, _: &AdminCap) {
    panda.is_trading = true;
}

/// 解锁交易状态（链下 Agent 在交易完成后调用）
public entry fun unlock_trading(panda: &mut Panda, _: &AdminCap) {
    panda.is_trading = false;
}

/// 安全转让（检查交易锁）
/// 来源：tech-stack-sui-contract.md §验证项4 — "简单的状态锁即可解决"
public entry fun transfer_panda(
    panda: Panda,
    recipient: address,
    _ctx: &mut TxContext,
) {
    assert!(!panda.is_trading, E_TRADING_IN_PROGRESS);
    event::emit(PandaTransferred {
        panda_id: object::id(&panda),
        from: ctx.sender(),
        to: recipient,
        timestamp: /* clock */ 0,
    });
    transfer::transfer(panda, recipient);
}
```

#### 性格查询函数

```move
public fun get_personality(panda: &Panda): (u8, u8, u8, u8, u8) {
    (panda.boldness, panda.patience, panda.intuition, panda.focus, panda.contrarian)
}

public fun get_talent(panda: &Panda): u8 { panda.talent }
public fun get_talent_name(panda: &Panda): String { talent_name(panda.talent) }
public fun is_trading(panda: &Panda): bool { panda.is_trading }
public fun get_generation(panda: &Panda): u64 { panda.generation }
public fun get_mint_time(panda: &Panda): u64 { panda.mint_time }
```

#### 重置函数

```move
/// 重置熊猫（经验清零，性格不变）
/// 来源：product-design.md §Q6 — "用户觉得熊猫被练废了 → 重新开始"
public entry fun reset_panda(
    panda: &mut Panda,
    clock: &Clock,
    _ctx: &mut TxContext,
) {
    // 移除经验 dynamic_field
    if (df::exists_(&panda.id, string::utf8(b"experience"))) {
        df::remove<String, ExperienceDigest>(&mut panda.id, string::utf8(b"experience"));
    }
    // 移除策略 dynamic_field
    if (df::exists_(&panda.id, string::utf8(b"current_strategy"))) {
        df::remove<String, StrategySnapshot>(&mut panda.id, string::utf8(b"current_strategy"));
    }

    event::emit(PandaReset {
        panda_id: object::id(panda),
        owner: ctx.sender(),
        timestamp: clock::timestamp_ms(clock),
    });
}
```

---

### 3.2 panda_registry 模块

全局注册表，管理铸造统计和配额。作为 Shared Object 存在，所有铸造操作需引用它。

```move
module trading_panda::panda_registry {

    /// 初始化：创建全局注册表（Shared Object）
    fun init(ctx: &mut TxContext) {
        transfer::share_object(PandaRegistry {
            id: object::new(ctx),
            total_minted: 0,
            active_count: 0,
            dormant_count: 0,
            max_supply: 10_000,     // 初始上限
            mint_enabled: true,
        });
    }

    /// 管理员更新最大铸造量
    public entry fun set_max_supply(
        registry: &mut PandaRegistry,
        _admin: &AdminCap,
        new_max: u64,
    ) {
        registry.max_supply = new_max;
    }

    /// 管理员开关铸造
    public entry fun set_mint_enabled(
        registry: &mut PandaRegistry,
        _admin: &AdminCap,
        enabled: bool,
    ) {
        registry.mint_enabled = enabled;
    }

    /// 查询统计
    public fun get_stats(registry: &PandaRegistry): (u64, u64, u64, u64) {
        (registry.total_minted, registry.active_count, registry.dormant_count, registry.max_supply)
    }

    /// 更新休眠计数（从 panda 模块的休眠函数调用）
    public(package) fun increment_dormant(registry: &mut PandaRegistry) {
        registry.dormant_count = registry.dormant_count + 1;
        registry.active_count = registry.active_count - 1;
    }

    /// 更新唤醒计数
    public(package) fun decrement_dormant(registry: &mut PandaRegistry) {
        registry.dormant_count = registry.dormant_count - 1;
        registry.active_count = registry.active_count + 1;
    }
}
```

---

### 3.3 strategy 模块

管理策略哈希的链上存储和策略变更历史（残影记录）。策略的完整内容存于链下（Walrus），链上仅存哈希以保证不可篡改。

来源：product-design.md §4.2、trading-behavior-mechanics.md §维度2

```move
module trading_panda::strategy {

    const E_NO_STRATEGY: u64 = 10;

    /// 设置/更新当前策略
    /// 如果已有策略，旧策略会被记录为残影
    public entry fun update_strategy(
        panda: &mut Panda,
        _admin: &AdminCap,
        strategy_hash: vector<u8>,
        strategy_type: String,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        let now = clock::timestamp_ms(clock);
        let key = string::utf8(b"current_strategy");

        // 如果已有策略 → 记录残影
        if (df::exists_(&panda.id, key)) {
            let old: StrategySnapshot = df::remove(&mut panda.id, key);
            record_shadow(panda, old, now);
        }

        // 写入新策略
        df::add(&mut panda.id, key, StrategySnapshot {
            strategy_hash,
            strategy_type,
            updated_at: now,
            proficiency: 0,     // 新策略熟练度从 0 开始
        });

        event::emit(StrategyUpdated {
            panda_id: object::id(panda),
            strategy_hash,
            timestamp: now,
        });
    }

    /// 更新策略熟练度（链下 Agent 定期调用）
    public entry fun update_proficiency(
        panda: &mut Panda,
        _admin: &AdminCap,
        new_proficiency: u16,
        _ctx: &mut TxContext,
    ) {
        let key = string::utf8(b"current_strategy");
        assert!(df::exists_(&panda.id, key), E_NO_STRATEGY);
        let snapshot: &mut StrategySnapshot = df::borrow_mut(&mut panda.id, key);
        snapshot.proficiency = new_proficiency;
    }

    /// 内部函数：记录策略残影
    fun record_shadow(panda: &mut Panda, old: StrategySnapshot, now: u64) {
        let index_key = string::utf8(b"strategy_shadows");

        // 获取或创建索引
        let index = if (df::exists_(&panda.id, index_key)) {
            df::borrow_mut<String, StrategyShadowIndex>(&mut panda.id, index_key)
        } else {
            df::add(&mut panda.id, index_key, StrategyShadowIndex { count: 0, total_switches: 0 });
            df::borrow_mut(&mut panda.id, index_key)
        };

        let shadow_key = /* b"strategy_shadow_{index.count}" */ ;
        df::add(&mut panda.id, shadow_key, StrategyShadow {
            strategy_hash: old.strategy_hash,
            switch_timestamp: now,
            proficiency_at_switch: old.proficiency,
            duration_epochs: (now - old.updated_at),
        });

        index.count = index.count + 1;
        index.total_switches = index.total_switches + 1;

        event::emit(StrategySwitched {
            panda_id: object::id(panda),
            old_strategy_hash: old.strategy_hash,
            proficiency_at_switch: old.proficiency,
            timestamp: now,
        });
    }

    /// 查询当前策略
    public fun get_current_strategy(panda: &Panda): &StrategySnapshot {
        df::borrow(&panda.id, string::utf8(b"current_strategy"))
    }

    /// 查询策略切换总次数
    public fun get_switch_count(panda: &Panda): u64 {
        let key = string::utf8(b"strategy_shadows");
        if (df::exists_(&panda.id, key)) {
            df::borrow<String, StrategyShadowIndex>(&panda.id, key).total_switches
        } else {
            0
        }
    }
}
```

---

### 3.4 experience 模块

管理经验等级的链上摘要和 Walrus blob_id。链下 Agent 在经验等级变更时调用，将里程碑同步到链上。

来源：product-design.md §3.4（成长阶段表）、§4.3（经验数据存储）

```move
module trading_panda::experience {

    const E_LEVEL_NOT_CHANGED: u64 = 20;
    const E_INVALID_LEVEL: u64 = 21;

    /// 更新经验里程碑
    /// 仅在等级发生变化时由链下 Agent 调用
    public entry fun update_milestone(
        panda: &mut Panda,
        _admin: &AdminCap,
        level: u16,
        total_trades: u64,
        win_rate: u64,
        walrus_blob_id: String,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        assert!(level <= 100, E_INVALID_LEVEL);
        let now = clock::timestamp_ms(clock);
        let key = string::utf8(b"experience");

        // 移除旧记录（如有）
        if (df::exists_(&panda.id, key)) {
            let old: ExperienceDigest = df::remove(&mut panda.id, key);
            // 可选：验证等级确实变化了
        };

        df::add(&mut panda.id, key, ExperienceDigest {
            level,
            total_trades,
            win_rate,
            walrus_blob_id,
            last_updated: now,
        });

        // 判断成长阶段并发出对应事件
        let stage = if (level < 25) { 0 }       // 幼年
            else if (level < 65) { 1 }            // 成长
            else { 2 };                            // 成熟

        event::emit(ExperienceMilestone {
            panda_id: object::id(panda),
            level,
            total_trades,
            win_rate,
            stage,
            walrus_blob_id,
            timestamp: now,
        });
    }

    /// 查询经验摘要
    public fun get_experience(panda: &Panda): &ExperienceDigest {
        df::borrow(&panda.id, string::utf8(b"experience"))
    }

    /// 查询经验等级（便捷函数）
    public fun get_level(panda: &Panda): u16 {
        if (df::exists_(&panda.id, string::utf8(b"experience"))) {
            df::borrow<String, ExperienceDigest>(&panda.id, string::utf8(b"experience")).level
        } else {
            0
        }
    }
}
```

---

### 3.5 trust_proof 模块

Merkle Root 提交与验证。MVP 阶段使用 Merkle Root 兜底方案，预留 Nautilus TEE attestation 接口。

来源：trust-model-options.md、架构决策 — "先用 Merkle Root 兜底，预留 Nautilus TEE attestation 接口"

```move
module trading_panda::trust_proof {

    const E_INVALID_ROOT: u64 = 30;
    const E_TRADE_COUNT_MISMATCH: u64 = 31;
    const MERKLE_ROOT_LENGTH: u64 = 32;  // SHA-256 = 32 bytes

    /// 提交 Merkle Root
    /// 链下 Agent 每 50 笔交易计算 Merkle Tree 并提交 root
    public entry fun submit_merkle_root(
        panda: &mut Panda,
        _admin: &AdminCap,
        root_hash: vector<u8>,
        trade_count: u64,
        start_trade_id: u64,
        end_trade_id: u64,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        assert!(vector::length(&root_hash) == MERKLE_ROOT_LENGTH, E_INVALID_ROOT);

        let now = clock::timestamp_ms(clock);
        let index_key = string::utf8(b"trust_proofs");

        // 获取或创建索引
        let index = if (df::exists_(&panda.id, index_key)) {
            df::borrow_mut<String, TrustProofIndex>(&mut panda.id, index_key)
        } else {
            df::add(&mut panda.id, index_key, TrustProofIndex { count: 0, total_verified_trades: 0 });
            df::borrow_mut(&mut panda.id, index_key)
        };

        let proof_key = /* b"trust_proof_{index.count}" */;
        df::add(&mut panda.id, proof_key, MerkleProof {
            root_hash,
            trade_count,
            start_trade_id,
            end_trade_id,
            timestamp: now,
        });

        index.count = index.count + 1;
        index.total_verified_trades = index.total_verified_trades + trade_count;

        event::emit(MerkleRootSubmitted {
            panda_id: object::id(panda),
            root_hash,
            trade_count,
            batch_index: index.count - 1,
            timestamp: now,
        });
    }

    /// 查询最新 Merkle Root 信息
    public fun get_latest_proof_index(panda: &Panda): (u64, u64) {
        let key = string::utf8(b"trust_proofs");
        if (df::exists_(&panda.id, key)) {
            let idx = df::borrow<String, TrustProofIndex>(&panda.id, key);
            (idx.count, idx.total_verified_trades)
        } else {
            (0, 0)
        }
    }

    /// 验证某条交易日志属于已提交的 Merkle Tree
    /// proof: Merkle 路径上的兄弟节点哈希列表
    /// leaf_hash: 待验证的交易日志哈希
    /// batch_index: 对应的 Merkle Root 批次
    public fun verify_trade_log(
        panda: &Panda,
        batch_index: u64,
        leaf_hash: vector<u8>,
        proof: vector<vector<u8>>,
        leaf_index: u64,
    ): bool {
        let proof_key = /* b"trust_proof_{batch_index}" */;
        let merkle_proof = df::borrow<String, MerkleProof>(&panda.id, proof_key);

        // 从叶子节点沿 proof path 重建 root
        let computed_root = compute_merkle_root(leaf_hash, proof, leaf_index);
        computed_root == merkle_proof.root_hash
    }

    /// 内部：计算 Merkle Root（SHA-256 哈希链）
    fun compute_merkle_root(
        leaf: vector<u8>,
        proof: vector<vector<u8>>,
        index: u64,
    ): vector<u8> {
        // 伪代码：逐层拼接哈希
        // let mut current = leaf;
        // for sibling in proof {
        //     if index % 2 == 0: current = sha256(current || sibling)
        //     else: current = sha256(sibling || current)
        //     index = index / 2;
        // }
        // return current;
        leaf // placeholder
    }

    // ====================================================================
    // === 正式版升级路径：Nautilus TEE Attestation ===
    // ====================================================================
    //
    // 正式版将 Merkle Root 方案升级为 Nautilus TEE 实时证明：
    //
    // public entry fun submit_tee_attestation(
    //     panda: &mut Panda,
    //     input_hash: vector<u8>,
    //     output_hash: vector<u8>,
    //     tee_identity: vector<u8>,
    //     attestation_sig: vector<u8>,
    //     clock: &Clock,
    //     ctx: &mut TxContext,
    // ) {
    //     // 1. 验证 attestation_sig 是否由已注册的 TEE 签发
    //     // 2. 验证 input_hash 包含 panda 的性格参数
    //     // 3. 存储 attestation 到 dynamic_field
    //     // 4. emit TeeAttestationSubmitted 事件
    // }
    //
    // public fun verify_tee_attestation(
    //     panda: &Panda,
    //     attestation_index: u64,
    // ): bool {
    //     // 验证 TEE 身份 + 签名有效性
    // }
}
```

---

### 3.6 achievement 模块

成就定义注册表（Shared Object）+ 成就解锁记录（挂载在 Panda 上）。

来源：架构决策 — "成就解锁记录上链"

```move
module trading_panda::achievement {

    const E_ACHIEVEMENT_NOT_FOUND: u64 = 40;
    const E_ALREADY_UNLOCKED: u64 = 41;

    /// 初始化：创建成就注册表（Shared Object）
    fun init(ctx: &mut TxContext) {
        transfer::share_object(AchievementRegistry {
            id: object::new(ctx),
            total_achievements: 0,
        });
    }

    /// 管理员定义新成就
    public entry fun define_achievement(
        registry: &mut AchievementRegistry,
        _admin: &AdminCap,
        name: String,
        description: String,
        category: u8,
        rarity: u8,
        _ctx: &mut TxContext,
    ) {
        let achievement_id = registry.total_achievements;
        df::add(&mut registry.id, achievement_id, AchievementDef {
            achievement_id,
            name,
            description,
            category,
            rarity,
        });
        registry.total_achievements = achievement_id + 1;

        event::emit(AchievementDefined {
            achievement_id,
            name,
            category,
            rarity,
        });
    }

    /// 解锁成就（链下 Agent 在满足条件时调用）
    public entry fun unlock_achievement(
        panda: &mut Panda,
        registry: &AchievementRegistry,
        _admin: &AdminCap,
        achievement_id: u64,
        unlock_context: String,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        // 验证成就存在
        assert!(df::exists_(&registry.id, achievement_id), E_ACHIEVEMENT_NOT_FOUND);

        // 检查未重复解锁
        let achievement_key = /* b"achievement_{achievement_id}" */;
        assert!(!df::exists_(&panda.id, achievement_key), E_ALREADY_UNLOCKED);

        let now = clock::timestamp_ms(clock);

        // 写入解锁记录
        df::add(&mut panda.id, achievement_key, AchievementUnlock {
            achievement_id,
            unlock_timestamp: now,
            unlock_context,
        });

        // 更新索引
        let index_key = string::utf8(b"achievements");
        if (df::exists_(&panda.id, index_key)) {
            let idx = df::borrow_mut<String, AchievementIndex>(&mut panda.id, index_key);
            idx.unlocked_count = idx.unlocked_count + 1;
            vector::push_back(&mut idx.unlocked_ids, achievement_id);
        } else {
            let mut ids = vector::empty<u64>();
            vector::push_back(&mut ids, achievement_id);
            df::add(&mut panda.id, index_key, AchievementIndex {
                unlocked_count: 1,
                unlocked_ids: ids,
            });
        };

        event::emit(AchievementUnlocked {
            panda_id: object::id(panda),
            achievement_id,
            unlock_context,
            timestamp: now,
        });
    }

    /// 查询已解锁成就列表
    public fun get_unlocked_achievements(panda: &Panda): vector<u64> {
        let key = string::utf8(b"achievements");
        if (df::exists_(&panda.id, key)) {
            df::borrow<String, AchievementIndex>(&panda.id, key).unlocked_ids
        } else {
            vector::empty()
        }
    }

    /// 查询成就定义
    public fun get_achievement_def(
        registry: &AchievementRegistry,
        achievement_id: u64,
    ): &AchievementDef {
        df::borrow(&registry.id, achievement_id)
    }
}
```

---

### 3.7 market 模块

Kiosk 集成，处理 NFT 上架/下架/购买，配置 TransferPolicy 和版税规则。

来源：product-design.md §3.5、tech-stack-sui-contract.md §验证项3

```move
module trading_panda::market {

    const E_PANDA_IS_TRADING: u64 = 50;
    const E_INVALID_ROYALTY: u64 = 51;

    // 版税范围 2-5%（以 basis points 存储，200-500）
    const MIN_ROYALTY_BPS: u64 = 200;
    const MAX_ROYALTY_BPS: u64 = 500;

    /// 初始化 TransferPolicy 并设置版税规则
    /// 部署时由管理员调用一次
    public entry fun setup_transfer_policy(
        publisher: &Publisher,
        royalty_bps: u64,
        ctx: &mut TxContext,
    ) {
        assert!(royalty_bps >= MIN_ROYALTY_BPS && royalty_bps <= MAX_ROYALTY_BPS, E_INVALID_ROYALTY);

        let (mut policy, policy_cap) = transfer_policy::new<Panda>(publisher, ctx);

        // 添加版税规则（使用 sui::kiosk 的 royalty_rule）
        royalty_rule::add(&mut policy, &policy_cap, royalty_bps, /* min_amount */ 0);

        // 共享 TransferPolicy，使所有 Kiosk 交易遵守
        transfer::public_share_object(policy);
        transfer::public_transfer(policy_cap, ctx.sender());
    }

    /// 上架熊猫到卖家 Kiosk
    /// 检查 is_trading 锁：交易中的熊猫不可上架
    public entry fun list_panda(
        kiosk: &mut Kiosk,
        kiosk_cap: &KioskOwnerCap,
        panda: Panda,
        price: u64,
        _ctx: &mut TxContext,
    ) {
        assert!(!panda.is_trading, E_PANDA_IS_TRADING);
        let panda_id = object::id(&panda);

        kiosk::place(kiosk, kiosk_cap, panda);
        kiosk::list<Panda>(kiosk, kiosk_cap, panda_id, price);

        event::emit(PandaListed {
            panda_id,
            price,
            seller: ctx.sender(),
        });
    }

    /// 下架熊猫
    public entry fun delist_panda(
        kiosk: &mut Kiosk,
        kiosk_cap: &KioskOwnerCap,
        panda_id: ID,
        _ctx: &mut TxContext,
    ) {
        kiosk::delist<Panda>(kiosk, kiosk_cap, panda_id);
        let panda = kiosk::take<Panda>(kiosk, kiosk_cap, panda_id);

        event::emit(PandaDelisted { panda_id });

        transfer::transfer(panda, ctx.sender());
    }

    /// 购买熊猫
    /// 买家调用，支付 price + 版税
    public entry fun purchase_panda(
        kiosk: &mut Kiosk,
        panda_id: ID,
        payment: Coin<SUI>,
        policy: &mut TransferPolicy<Panda>,
        ctx: &mut TxContext,
    ) {
        let (panda, mut request) = kiosk::purchase<Panda>(kiosk, panda_id, payment);

        // 版税规则自动从 payment 中扣除
        royalty_rule::pay(&mut request, policy, /* payment proof */);

        transfer_policy::confirm_request(policy, request);

        event::emit(PandaPurchased {
            panda_id,
            buyer: ctx.sender(),
            // price, royalty 从事件中获取
        });

        transfer::transfer(panda, ctx.sender());
    }
}
```

---

### 3.8 checkin 模块（轻量链上）

签到记录本身存于链下 PostgreSQL，不上链。仅在需要链上奖励发放时，由管理员调用发放函数。

来源：架构决策 — "签到记录不上链（存PostgreSQL），但连续签到奖励的发放可能需要链上逻辑"

```move
module trading_panda::checkin {

    const E_ALREADY_CLAIMED: u64 = 60;

    /// 奖励发放记录（防重放，Dynamic Field on Panda，key = b"checkin_reward_{reward_id}"）
    public struct CheckinReward has store, drop {
        reward_id: u64,          // 奖励批次 ID
        reward_type: u8,         // 0=经验加成, 1=道具, 2=SUI
        amount: u64,             // 奖励数量
        claimed_at: u64,         // 领取时间
    }

    /// 管理员发放签到奖励
    /// 链下服务验证签到连续性后，调用此函数发放链上奖励
    public entry fun grant_checkin_reward(
        panda: &mut Panda,
        _admin: &AdminCap,
        reward_id: u64,
        reward_type: u8,
        amount: u64,
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        let key = /* b"checkin_reward_{reward_id}" */;
        assert!(!df::exists_(&panda.id, key), E_ALREADY_CLAIMED);

        let now = clock::timestamp_ms(clock);
        df::add(&mut panda.id, key, CheckinReward {
            reward_id,
            reward_type,
            amount,
            claimed_at: now,
        });

        event::emit(CheckinRewardGranted {
            panda_id: object::id(panda),
            reward_id,
            reward_type,
            amount,
            timestamp: now,
        });
    }
}
```

---

### 3.9 deepbook_adapter 模块

与 DeepBook V2 的交互接口。提供订单簿数据查询和模拟执行能力。

来源：product-design.md §八 — "模拟盘数据 → DeepBook"

```move
module trading_panda::deepbook_adapter {

    use deepbook::clob_v2::{Self as clob, Pool};
    use deepbook::custodian_v2::AccountCap;

    /// 查询 DeepBook 订单簿最优买卖价
    /// 返回 (best_bid, best_ask)
    public fun get_best_prices<BaseAsset, QuoteAsset>(
        pool: &Pool<BaseAsset, QuoteAsset>,
    ): (u64, u64) {
        let (bids, asks) = clob::get_market_price(pool);
        // 返回最优买价和最优卖价
        (bids, asks)
    }

    /// 查询订单簿深度（前 N 档）
    public fun get_order_book_depth<BaseAsset, QuoteAsset>(
        pool: &Pool<BaseAsset, QuoteAsset>,
        depth: u64,
    ): (vector<u64>, vector<u64>, vector<u64>, vector<u64>) {
        // 返回 (bid_prices, bid_quantities, ask_prices, ask_quantities)
        clob::get_level2_book_status_bid_side(pool, /* price_low */ 0, /* price_high */ u64::MAX, depth);
        // + ask side
    }

    /// 模拟市价单执行（testnet 用）
    /// 计算以当前订单簿深度，market_order 会成交在什么价位
    public fun simulate_market_order<BaseAsset, QuoteAsset>(
        pool: &Pool<BaseAsset, QuoteAsset>,
        is_buy: bool,
        quantity: u64,
    ): (u64, u64) {
        // 返回 (average_price, total_cost)
        // 遍历订单簿对手方，累加成交量直到满足 quantity
        // 伪代码实现
        (0, 0)
    }

    /// 下限价单（通过 Panda 的 Agent 调用）
    /// MVP 阶段仅在 testnet 模拟执行
    public entry fun place_limit_order<BaseAsset, QuoteAsset>(
        pool: &mut Pool<BaseAsset, QuoteAsset>,
        account_cap: &AccountCap,
        price: u64,
        quantity: u64,
        is_bid: bool,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        clob::place_limit_order(
            pool,
            account_cap,
            price,
            quantity,
            /* self_matching_prevention */ 0,
            is_bid,
            /* expire_timestamp */ clock::timestamp_ms(clock) + 86400000, // 24h
            /* restriction */ 0,
            clock,
            ctx,
        );
    }
}
```

---

## 四、事件定义

所有 Move 事件用于链下系统通过 Sui Event Subscription 进行索引和响应。

```move
// === panda 模块事件 ===

/// 熊猫铸造
public struct PandaMinted has copy, drop {
    panda_id: ID,
    owner: address,
    boldness: u8,
    patience: u8,
    intuition: u8,
    focus: u8,
    contrarian: u8,
    talent: u8,
    generation: u64,
    timestamp: u64,
}

/// 熊猫转让
public struct PandaTransferred has copy, drop {
    panda_id: ID,
    from: address,
    to: address,
    timestamp: u64,
}

/// 熊猫重置
public struct PandaReset has copy, drop {
    panda_id: ID,
    owner: address,
    timestamp: u64,
}

/// 熊猫休眠
public struct PandaDormant has copy, drop {
    panda_id: ID,
    timestamp: u64,
}

/// 熊猫唤醒
public struct PandaAwakened has copy, drop {
    panda_id: ID,
    timestamp: u64,
    experience_after_decay: u16,
}

// === strategy 模块事件 ===

/// 策略更新
public struct StrategyUpdated has copy, drop {
    panda_id: ID,
    strategy_hash: vector<u8>,
    timestamp: u64,
}

/// 策略切换（残影记录）
public struct StrategySwitched has copy, drop {
    panda_id: ID,
    old_strategy_hash: vector<u8>,
    proficiency_at_switch: u16,
    timestamp: u64,
}

// === experience 模块事件 ===

/// 经验里程碑
public struct ExperienceMilestone has copy, drop {
    panda_id: ID,
    level: u16,
    total_trades: u64,
    win_rate: u64,
    stage: u8,               // 0=幼年, 1=成长, 2=成熟
    walrus_blob_id: String,
    timestamp: u64,
}

// === trust_proof 模块事件 ===

/// Merkle Root 提交
public struct MerkleRootSubmitted has copy, drop {
    panda_id: ID,
    root_hash: vector<u8>,
    trade_count: u64,
    batch_index: u64,
    timestamp: u64,
}

// === achievement 模块事件 ===

/// 成就定义
public struct AchievementDefined has copy, drop {
    achievement_id: u64,
    name: String,
    category: u8,
    rarity: u8,
}

/// 成就解锁
public struct AchievementUnlocked has copy, drop {
    panda_id: ID,
    achievement_id: u64,
    unlock_context: String,
    timestamp: u64,
}

// === market 模块事件 ===

/// 熊猫上架
public struct PandaListed has copy, drop {
    panda_id: ID,
    price: u64,
    seller: address,
}

/// 熊猫下架
public struct PandaDelisted has copy, drop {
    panda_id: ID,
}

/// 熊猫购买
public struct PandaPurchased has copy, drop {
    panda_id: ID,
    buyer: address,
}

// === checkin 模块事件 ===

/// 签到奖励发放
public struct CheckinRewardGranted has copy, drop {
    panda_id: ID,
    reward_id: u64,
    reward_type: u8,
    amount: u64,
    timestamp: u64,
}
```

---

## 五、权限与安全

### 5.1 权限矩阵

| 函数 | 调用者 | 权限凭证 | 说明 |
|------|--------|----------|------|
| `mint_panda` | 任何用户 | 无（公开铸造） | 受 PandaRegistry 配额限制 |
| `lock_trading` / `unlock_trading` | 链下 Agent | `AdminCap` | 防止未授权锁定 |
| `transfer_panda` | Panda 所有者 | Owned Object 所有权 | 检查 `is_trading` 锁 |
| `reset_panda` | Panda 所有者 | Owned Object 所有权 | 经验清零，性格不变 |
| `update_strategy` | 链下 Agent | `AdminCap` | 策略哈希写入 |
| `update_proficiency` | 链下 Agent | `AdminCap` | 熟练度更新 |
| `update_milestone` | 链下 Agent | `AdminCap` | 经验里程碑更新 |
| `submit_merkle_root` | 链下 Agent | `AdminCap` | Merkle Root 提交 |
| `verify_trade_log` | 任何人 | 无 | 公开只读验证 |
| `define_achievement` | 管理员 | `AdminCap` | 成就定义 |
| `unlock_achievement` | 链下 Agent | `AdminCap` | 成就解锁 |
| `setup_transfer_policy` | 管理员 | `Publisher` | 一次性配置 |
| `list_panda` / `delist_panda` | Kiosk 所有者 | `KioskOwnerCap` | 上架/下架 |
| `purchase_panda` | 任何用户 | 无 | 需要支付 SUI |
| `grant_checkin_reward` | 链下 Agent | `AdminCap` | 奖励发放 |
| `set_max_supply` / `set_mint_enabled` | 管理员 | `AdminCap` | 注册表管理 |

### 5.2 is_trading 锁机制

```
交易流程：
  1. 链下 Agent 准备执行交易 → 调用 lock_trading(panda, admin_cap)
  2. panda.is_trading = true
  3. 执行交易（链下模拟盘 or DeepBook）
  4. 交易完成 → 调用 unlock_trading(panda, admin_cap)
  5. panda.is_trading = false

锁定期间：
  - transfer_panda() → assert 失败，拒绝转让
  - list_panda() → assert 失败，拒绝上架
  - reset_panda() → 建议也检查 is_trading 锁

安全保障：
  - lock/unlock 需要 AdminCap → 只有授权的链下 Agent 能操作
  - 防止用户在交易执行过程中转让 NFT 导致状态不一致
```

### 5.3 AdminCap 设计

```
AdminCap 管理原则：
  - 部署时创建唯一 AdminCap，归部署者所有
  - 不创建多个 AdminCap（避免权限分散）
  - 链下 Agent 通过部署者钱包签名调用需 AdminCap 的函数
  - 正式版考虑 multi-sig 或 DAO 管理 AdminCap

安全约束：
  - AdminCap 是 key + store → 可转让但不可复制
  - 所有写入操作（策略/经验/信任证明/成就/锁定）都需要 AdminCap
  - 只读查询函数无需权限
```

---

## 六、与链下系统的交互

### 6.1 链下读取链上数据

```
┌─────────────┐     Sui JSON-RPC      ┌──────────────┐
│  后端服务     │ ◄──────────────────── │  Sui 全节点    │
│  (Python)    │     sui_getObject     │              │
│              │     sui_getDynField   │              │
│              │                       │              │
│              │     Event             │              │
│              │ ◄──── Subscription ── │              │
└─────────────┘                       └──────────────┘

读取方式：
  1. sui_getObject(panda_id) → 获取 Panda 静态字段（性格/天赋/交易锁）
  2. sui_getDynamicFieldObject(panda_id, "experience") → 获取经验摘要
  3. sui_getDynamicFieldObject(panda_id, "current_strategy") → 获取当前策略
  4. sui_getDynamicFieldObject(panda_id, "achievements") → 获取成就索引

实时监听：
  - 订阅 PandaMinted 事件 → 新熊猫注册到后端
  - 订阅 StrategyUpdated 事件 → 触发策略解析流程
  - 订阅 ExperienceMilestone 事件 → 更新排行榜
  - 订阅 AchievementUnlocked 事件 → 前端通知
  - 订阅 PandaTransferred 事件 → 更新所有权映射
```

### 6.2 链下提交数据上链

```
┌─────────────┐     Move Transaction   ┌──────────────┐
│  后端服务     │ ────────────────────► │  Sui 网络     │
│  (Python)    │                       │              │
└─────────────┘                       └──────────────┘

提交场景：

1. 策略哈希提交
   触发条件：用户输入新策略 → DeepSeek V3 解析 → 得到策略 JSON
   链上调用：strategy::update_strategy(panda, admin_cap, sha256(strategy_json), type, clock)
   频率：仅策略新建/修改时（低频）

2. 经验里程碑提交
   触发条件：经验等级变化（如 24→25 = 幼年→成长阶段切换）
   链上调用：experience::update_milestone(panda, admin, level, trades, win_rate, blob_id, clock)
   频率：每升一级提交一次（中频，约每 20-50 笔交易一次）

3. Merkle Root 提交
   触发条件：每 50 笔交易
   链上调用：trust_proof::submit_merkle_root(panda, admin, root, count, start, end, clock)
   频率：每 50 笔交易一次（中频）

4. 成就解锁
   触发条件：链下检测到成就条件达成
   链上调用：achievement::unlock_achievement(panda, registry, admin, id, context, clock)
   频率：低频（每个成就仅解锁一次）
```

### 6.3 Walrus blob_id 的读写

```
写入流程：
  1. 链下 Agent 每 50 笔交易将经验数据库快照上传到 Walrus
  2. Walrus 返回 blob_id
  3. Agent 调用 experience::update_milestone() 将 blob_id 写入链上 dynamic_field
  4. blob_id 作为 ExperienceDigest.walrus_blob_id 持久化

读取流程（NFT 转让后新主人恢复数据）：
  1. 新主人的后端从链上读取 panda 的 ExperienceDigest
  2. 获取 walrus_blob_id
  3. 从 Walrus 网络下载经验数据 blob
  4. 解压恢复到本地 SQLite 数据库
  5. 继续从上次的经验状态开始运行

数据完整性：
  - blob 的内容哈希可与链上 Merkle Root 交叉验证
  - 确保数据未被篡改
```

---

## 七、升级路径

### 7.1 Merkle Root → Nautilus TEE Attestation

```
阶段 1（MVP / 黑客松）：
  - 使用 Merkle Root 方案
  - 链下 Agent 每 50 笔交易提交 Merkle Root
  - 任何人可验证单条交易日志属于已提交的 Merkle Tree
  - 信任等级：事后可验证（不可篡改，但无法证明"AI 确实跑了"）

阶段 2（正式版）：
  - 部署 Nautilus TEE（AWS Nitro Enclaves）
  - 决策引擎运行在 TEE 中
  - 每次决策生成密码学 attestation
  - 链上 Move 合约验证 attestation 后执行
  - 信任等级：实时可证明（从"日志没被改"升级到"计算确实在 TEE 中执行"）

迁移方案：
  - trust_proof 模块已预留 NautilusAttestation 结构体（注释状态）
  - 升级时：
    1. 取消注释 NautilusAttestation 相关代码
    2. 新增 TEE identity 注册函数
    3. submit_tee_attestation 替代 submit_merkle_root 成为主要信任提交方式
    4. Merkle Root 保留为辅助验证层（双重保障）
  - 旧数据兼容：已提交的 Merkle Root 记录保留，不影响新 attestation 写入
```

### 7.2 合约升级策略

```
Sui Move 支持通过 UpgradeCap 进行合约升级：

package::UpgradeCap 管理：
  - 部署时自动生成 UpgradeCap
  - 由部署者持有
  - 正式版转交 multi-sig 或 DAO 管理

升级兼容性规则（Sui 强制）：
  - 不可删除已有 struct 定义
  - 不可修改已有 struct 的字段
  - 可以新增 struct 和函数
  - 可以修改函数实现逻辑
  - dynamic_field 天然支持扩展（新增 key-value 对不影响已有数据）

升级计划：
  MVP → v1.0：
    - 启用 NautilusAttestation
    - 新增社交模块（师承关系、群体信号）
    - 新增道具系统模块（冷静竹等）

  v1.0 → v2.0：
    - 策略模板 NFT 化（Kiosk 交易策略模板）
    - 多熊猫 portfolio 链上索引
    - 实盘接入模块（Cetus / Bluefin adapter）

安全措施：
  - 升级前：在 testnet 完整回归测试
  - 升级时：通过 UpgradeCap 发布新 package 版本
  - 升级后：验证所有 dynamic_field 数据可正常读取
  - 回滚方案：Sui 不支持版本回滚，因此升级必须慎重
```

---

## 附录：上链 vs 不上链决策总结

| 数据 | 是否上链 | 存储位置 | 原因 |
|------|----------|----------|------|
| 性格五轴 + 天赋 | 上链 | Panda struct 静态字段 | NFT 稀缺性根基，不可变 |
| 策略哈希 | 上链 | Dynamic Field | 可验证策略身份，不暴露策略细节 |
| 策略残影记录 | 上链 | Dynamic Field | 策略变更历史可追溯 |
| 经验等级 + Walrus blob_id | 上链 | Dynamic Field | 里程碑摘要，完整数据指向 Walrus |
| 决策日志 Merkle Root | 上链 | Dynamic Field | 每 50 笔一个 root，可验证 |
| 成就解锁记录 | 上链 | Dynamic Field | 成就不可伪造 |
| 生命周期事件 | 上链（Event） | 链上事件日志 | 铸造/转让/重置/休眠 |
| 每笔交易细节 | 不上链 | PostgreSQL + Walrus | 数据量大，上链成本过高 |
| 情绪日志 | 不上链 | 内存 / PostgreSQL | 实时状态，无需持久化上链 |
| 中间计算（决策熔炉） | 不上链 | 内存 | 临时数据 |
| 熊猫日记文本 | 不上链 | PostgreSQL | 展示层数据，无需上链 |
| 签到记录 | 不上链 | PostgreSQL | 低价值高频数据 |
| 完整经验数据库 | 不上链 | PostgreSQL + Walrus | 数据量大，blob_id 上链即可 |

---

## 附录：测试策略

合约测试使用 `sui move test`，详见 `testing-strategy.md` 第二节。

覆盖范围：
- panda 模块：铸造 + 供应上限 + 交易锁 + 性格不可变
- strategy 模块：设置/更新/历史 + 权限拒绝
- trust_proof 模块：Merkle Root 提交/验证 + 无效 proof
- achievement 模块：解锁 + 重复解锁拒绝
- market 模块：Kiosk 上架/版税范围/交易中拒绝上架
- checkin 模块：签到 + 重复签到拒绝
