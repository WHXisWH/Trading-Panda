(() => {
  let activeReplay = null;
  let activeToastTimer = null;

  const journeys = {
    mint: {
      eyebrow: "J0-J1",
      title: "Mint Panda Journey",
      intro: "从连接身份到铸造 Panda NFT。这里展示的是完整 Mint 页面如何随着用户步骤变化，而不是几张 UI 摘要卡片。",
      badges: ["Panda NFT = identity", "No trading authority yet", "Next: Agent Wallet"],
      productPage: "Mint Panda",
      navHint: "Identity Lab",
      steps: [
        step("disconnected", "01", "Disconnected", "wallet / zkLogin", "Connect wallet", "warn",
          agent("Unknown Panda", "Locked", "None", "Missing", "Missing", "Empty", "curious", "locked"),
          workspace("Mint gate", "Connect before minting", "The Mint page stays cinematic and simple: a looping Panda stage, one connect action, and a small safety hint that no trading permission exists yet.", {
            action: "Connect wallet",
            actionTone: "primary",
            tags: ["Panda Lab variants", "identity only", "mint disabled"],
            toast: ["Why this matters", "Mint creates identity only. Trading authority is a separate user-signed policy step."]
          }),
          evidence([["Auth nonce", "prepared", "Backend can verify wallet ownership"], ["Sui object", "none", "No chain object exists yet"], ["Risk scope", "zero", "No PandaVault or TradingPolicy"]]),
          notes("Connect wallet or zkLogin and approve session authentication.", "No chain object is created yet.", "Create auth nonce, verify session, load existing Panda list.", "If user already owns a Panda, show Open Training / Mint another instead of forcing mint.")),
        step("ready", "02", "Ready to mint", "mint ritual", "Ready", "good",
          agent("Bamboo-7", "Ready to mint", "None", "Missing", "Missing", "Empty", "focused", "ready"),
          workspace("Panda stage", "Choose the moment, then mint", "The connected Mint page stays minimal: no questionnaire, no cockpit. The PandaCarouselStage loops possible Panda Lab forms until the user starts the mint transaction.", {
            action: "Mint Panda NFT",
            actionTone: "primary",
            tags: ["wallet connected", "identity only", "gas estimated"]
          }),
          evidence([["Mint package", "0x5950...1465", "Target package is visible"], ["Creates", "Panda NFT", "Agent identity object"], ["Authority", "none", "No Agent Signer yet"]]),
          notes("Review generated identity and click Mint Panda NFT.", "No object exists until the transaction is signed and confirmed.", "Prepare expected package, registry, and event parser metadata.", "Wrong network or disconnected wallet disables the mint button.")),
        step("sign", "03", "Sign mint", "Sui transaction", "Wallet pending", "warn",
          agent("Bamboo-7", "Signing", "None", "Missing", "Missing", "Empty", "alert", "signing"),
          workspace("Wallet signing", "Transaction overlay on the same Mint page", "The full page remains visible while a signing modal blocks the primary action. The user sees exactly what the transaction creates.", {
            action: "Waiting for wallet",
            actionTone: "ghost",
            tags: ["ProgrammableTransaction", "mint::mint", "wallet prompt"],
            panels: [
              panel("Transaction summary", [["Kind", "ProgrammableTransaction"], ["Target", "mint::mint"], ["Creates", "Panda NFT"]], "dark"),
              panel("User sees", [["Gas", "testnet SUI"], ["Object changes", "Panda created"], ["Randomness", "sui::random personality"]])
            ],
            code: "PTB target: package::mint::mint\ncreates: Panda NFT\nrandomness: sui::random\npost-action: waitForTransaction(showObjectChanges)",
            overlay: ["Wallet confirmation", "Sign the mint transaction. Rejection returns to preview without creating backend records."]
          }),
          evidence([["Tx kind", "ProgrammableTransaction", "This is not a separate PTB signature"], ["Object parser", "armed", "Frontend waits for objectChanges"], ["Backend row", "not yet", "Created only after tx success"]]),
          notes("Sign the Sui transaction containing the mint PTB.", "Panda NFT is created only after transaction succeeds.", "Wait for tx digest and parse object changes / mint event.", "Rejected wallet prompt returns to preview; no Panda row is created.")),
        step("minting", "04", "Minting", "transaction pending", "Pending", "warn",
          agent("Bamboo-7", "Minting", "None", "Missing", "Missing", "Empty", "alert", "signing"),
          workspace("Mint pending", "The Panda stage slows while Sui confirms", "The page keeps the user in the mint ritual while waiting for transaction effects, object changes, and the backend registration path.", {
            action: "Confirming...",
            actionTone: "ghost",
            tags: ["tx submitted", "waiting objectChanges", "stage slowed"],
            overlay: ["Mint in progress", "Waiting for Sui confirmation and Panda object parsing."]
          }),
          evidence([["Tx digest", "pending", "Submitted to Sui testnet"], ["Object changes", "waiting", "Panda object id not parsed yet"], ["Backend row", "not yet", "Created after confirmation"]]),
          notes("Wait for transaction confirmation.", "Mint transaction is submitted and pending final object effects.", "Poll waitForTransaction(showObjectChanges) and prepare backend registration.", "If network times out, allow retry sync from tx digest.")),
        step("success", "05", "Mint success", "next wallet gate", "Minted", "good",
          agent("Bamboo-7", "Minted", "None", "Missing", "Missing", "Empty", "proud", "success"),
          workspace("Mint success", "Identity exists, execution still locked", "The page shows success toast, object id, personality, and the next gate: create PandaVault and TradingPolicy before training.", {
            action: "Create Agent Wallet",
            actionTone: "primary",
            tags: ["NFT minted", "object registered", "execution locked"],
            panels: [
              panel("Panda NFT", [["Object id", "0xpan...1024"], ["Owner", "0xuser...beef"], ["Growth", "newborn"]]),
              panel("Missing execution objects", [["PandaVault", "missing"], ["TradingPolicy", "missing"], ["authorized_agent", "missing"]], "dark")
            ],
            toast: ["Mint complete", "Bamboo-7 is alive, but cannot train until Agent Wallet setup is signed."]
          }),
          evidence([["Mint tx", "H8m...ZiQ3", "Confirmed on Sui testnet"], ["Panda object", "0xpan...1024", "Registered by backend"], ["Next proof", "none", "No PTB execution authority yet"]]),
          notes("Continue to Agent Wallet setup.", "Panda NFT exists with immutable personality fields.", "Register Panda object id, owner, tx digest, and personality snapshot.", "If backend registration fails, show retry sync from tx digest.")),
        step("failed", "06", "Mint failed", "retry safely", "Failed", "danger",
          agent("Bamboo-7", "Not minted", "None", "Missing", "Missing", "Empty", "concerned", "locked"),
          workspace("Mint failed", "Return to the stage and retry", "The stage returns to idle and explains the failure without exposing backend internals. Rejection, gas, network, and parsing errors get different friendly copy.", {
            action: "Retry mint",
            actionTone: "danger",
            tags: ["no object created", "safe retry", "identity still open"],
            toast: ["Mint not completed", "No Panda object was created. You can retry safely."]
          }),
          evidence([["Mint tx", "none", "No confirmed object"], ["Failure", "wallet rejected", "Example friendly reason"], ["Risk scope", "zero", "No authority was granted"]]),
          notes("Retry mint or reconnect wallet.", "No confirmed Panda object exists.", "Keep registration empty and preserve safe retry state.", "Never create Panda row without confirmed object id."))
      ]
    },

    "agent-wallet": {
      eyebrow: "J2",
      title: "Create Agent Wallet Journey",
      intro: "用户给熊猫创建 PandaVault 和 TradingPolicy。熊猫可以自动行动，但永远不能自己放宽项圈。",
      badges: ["PandaVault shared object", "TradingPolicy standalone", "authorized_agent"],
      productPage: "Agent Wallet Setup",
      navHint: "Policy Forge",
      steps: [
        step("no-vault", "01", "No vault", "execution locked", "Locked", "warn",
          agent("Bamboo-7", "Locked", "None", "Missing", "Missing", "Empty", "waiting", "locked"),
          workspace("Execution locked", "Minted identity without account boundary", "The full setup page explains that the Panda is alive but cannot train, submit proof, or mutate a ledger without a vault and policy.", {
            action: "Start setup",
            actionTone: "primary",
            tags: ["Panda minted", "vault missing", "policy missing"],
            panels: [
              panel("Missing container", [["PandaVault", "not created"], ["Ledger mode", "blocked"], ["PTB proof", "blocked"]]),
              panel("Missing collar", [["TradingPolicy", "not created"], ["Allowed pairs", "none"], ["Max loss", "none"]], "dark")
            ]
          }),
          evidence([["Panda NFT", "0xpan...1024", "Identity exists"], ["PandaVault", "missing", "No bounded account"], ["Training", "disabled", "Policy mirror unavailable"]]),
          notes("Open setup and choose Training Ledger mode.", "No chain action yet.", "Execution disabled because no policy mirror exists.", "Start Training remains disabled.")),
        step("draft", "02", "Draft policy", "risk collar", "Editing", "warn",
          agent("Bamboo-7", "Configuring", "None", "Draft", "Draft", "Empty", "measuring", "config"),
          workspace("Policy collar editor", "Define the Panda's safe playground", "The complete page lets the user choose allowed pairs, notional caps, daily loss, proof mode, and whether chain proofs are automatic or manual.", {
            action: "Review signer",
            actionTone: "primary",
            tags: ["SUI_USDC", "DEEP_USDC", "max 50 credit"],
            panels: [
              panel("Trading bounds", [["Allowed pairs", "SUI_USDC, DEEP_USDC"], ["Max notional", "50 PANDA_CREDIT"], ["Daily loss", "8%"]]),
              panel("Proof mode", [["Auto proof", "score >= 0.75"], ["Manual proof", "allowed"], ["Cooldown", "10 / day"]], "dark"),
              panel("Update rule", [["Tighten", "immediate"], ["Loosen", "user-signed"], ["Agent can loosen?", "No"]])
            ],
            progress: [["Risk budget", 50], ["Loss cap used", 8], ["Proof capacity", 30]]
          }),
          evidence([["Policy draft", "v1 candidate", "Not on-chain yet"], ["Pairs", "2 selected", "Must match monitor support"], ["Signer", "not reviewed", "Address shown next"]]),
          notes("Choose allowed pairs, notional, loss cap, and proof mode.", "None until signing.", "Validate draft against supported pairs and risk bounds.", "Invalid pair, invalid notional, or loosened preset is blocked before signing.")),
        step("review", "03", "Review signer", "robot pawprint", "Review", "warn",
          agent("Bamboo-7", "Reviewing", "None", "Draft", "Draft", "Empty", "alert", "signing"),
          workspace("Authorized Agent review", "Approve the automated pawprint, not the whole wallet", "The setup page focuses on the environment Agent Signer. Users see the address, scope, version, and why it cannot help another Panda or exceed policy.", {
            action: "Build setup transaction",
            actionTone: "primary",
            tags: ["0xagent...paws", "policy-bound", "testnet only"],
            panels: [
              panel("Authorized Agent", [["Address", "0xagent...paws"], ["Scope", "policy-bound"], ["Signer version", "2026.06"]], "dark"),
              panel("Plain English", [["Can trade user wallet?", "No"], ["Can loosen policy?", "No"], ["Can act for another Panda?", "No"]])
            ],
            toast: ["Trust checkpoint", "The signer is stored inside TradingPolicy and checked by Move paths."]
          }),
          evidence([["Signer", "0xagent...paws", "Environment-level demo signer"], ["Scope", "Panda + policy", "Bound by object ids"], ["Rotation", "user-signed", "Changing signer requires owner action"]]),
          notes("Review signer address and scope before signing.", "Next transaction stores authorized_agent in TradingPolicy.", "Expose current environment signer address and signer version.", "Signer mismatch blocks setup; rotation requires user-signed policy update.")),
        step("sign", "04", "Sign setup", "vault + policy PTB", "Wallet pending", "warn",
          agent("Bamboo-7", "Signing", "None", "Draft", "Creating", "Empty", "alert", "signing"),
          workspace("Create vault + policy", "One setup transaction with clear object creation", "The same setup page shows a wallet modal over the complete configuration. The user signs creation of PandaVault and standalone TradingPolicy.", {
            action: "Waiting for wallet",
            actionTone: "ghost",
            tags: ["create_panda_vault", "create_trading_policy", "shared objects"],
            panels: [
              panel("PTB creates", [["PandaVault", "shared object"], ["TradingPolicy", "standalone shared"], ["authorized_agent", "0xagent...paws"]], "dark"),
              panel("Initial balances", [["PANDA_CREDIT", "10,000"], ["Real funds", "0 moved"], ["Mode", "Training Ledger"]])
            ],
            code: "create_panda_vault(panda_id, owner)\ncreate_trading_policy(max_notional, daily_loss, allowed_pairs, authorized_agent)\nlink_policy_to_panda(panda_id, policy_id)",
            overlay: ["Wallet confirmation", "User signs setup. If rejected, the draft remains local and execution stays locked."]
          }),
          evidence([["Transaction", "pending", "Owner signature required"], ["Real funds", "none", "Mode 1 ledger only"], ["Move objects", "creating", "Vault and policy are separate objects"]]),
          notes("Sign create vault + policy transaction.", "PandaVault and TradingPolicy are created.", "Wait for tx, parse object ids, insert mirror rows.", "Rejected transaction leaves Panda minted but locked.")),
        step("active", "05", "Objects active", "mirror syncing", "Active", "good",
          agent("Bamboo-7", "Ready", "None", "Active", "Synced", "Empty", "ready", "ready"),
          workspace("Agent Wallet active", "Objects exist and backend mirror is catching up", "The page shows the PandaVault, policy version, allowed signer, and mirror sync status before allowing strategy and training.", {
            action: "Feed Strategy",
            actionTone: "primary",
            tags: ["PandaVault synced", "TradingPolicy v1", "Signer authorized"],
            panels: [
              panel("Move objects", [["PandaVault", "0xvault...88"], ["TradingPolicy", "0xpol...v1"], ["authorized_agent", "0xagent...paws"]], "dark"),
              panel("Policy mirror", [["Backend status", "synced"], ["Allowed pairs", "2"], ["Proof cap", "10 / day"]])
            ],
            toast: ["Setup complete", "Bamboo-7 can now receive strategy, but still cannot train without one."]
          }),
          evidence([["Vault", "0xvault...88", "Shared object"], ["Policy", "v1 active", "Standalone shared object"], ["Mirror", "synced", "Backend PolicyGate can enforce"]]),
          notes("Confirm active policy and continue.", "Objects exist and policy_version = 1.", "Insert panda_vaults and trading_policies mirror rows.", "If mirror stale, show degraded state and block training.")),
        step("ready", "06", "Ready for strategy", "next gate", "Ready", "good",
          agent("Bamboo-7", "Ready", "None", "Active", "Synced", "Empty", "focused", "success"),
          workspace("Ready to feed strategy", "The Panda has a vault and collar, but no trading brain yet", "The full page turns the next CTA into Strategy Builder and shows that policy is active before any market decision happens.", {
            action: "Go to Strategy Builder",
            actionTone: "primary",
            tags: ["execution bounded", "strategy missing", "training blocked"],
            panels: [
              panel("Current constraints", [["Max notional", "50"], ["Daily loss", "8%"], ["Proof cap", "10 / day"]], "dark"),
              panel("Next requirement", [["Active strategy", "missing"], ["Market pairs", "ready"], ["Training", "disabled until strategy"]])
            ]
          }),
          evidence([["PolicyGate", "ready", "Can reject future intents"], ["Agent signer", "authorized", "Only policy paths"], ["Strategy", "missing", "Next journey"]]),
          notes("Move to Strategy Builder or tighten policy.", "No new change.", "Panda status ready_for_strategy.", "Agent still cannot trade until strategy and market session are active."))
      ]
    },

    strategy: {
      eyebrow: "J3",
      title: "Feed Strategy Journey",
      intro: "策略是熊猫的训练口味，不是权限。它会进入决策引擎，但不能突破 TradingPolicy。",
      badges: ["Rule blocks", "Policy validation", "Ghost influence"],
      productPage: "Strategy Builder",
      navHint: "Training Taste",
      steps: [
        step("empty", "01", "Empty strategy", "cannot train", "Missing", "warn",
          agent("Bamboo-7", "Ready", "None", "Active", "Synced", "Empty", "waiting", "ready"),
          workspace("Strategy required", "The page is complete but the training CTA is blocked", "Users see templates, current policy, and why a Panda with no strategy cannot start the actor loop.", {
            action: "Choose template",
            actionTone: "primary",
            tags: ["Mean reversion", "Breakout", "Risk first"],
            panels: [panel("Available templates", [["Mean reversion", "ready"], ["Breakout", "ready"], ["Risk first", "ready"]]), panel("Training gate", [["Strategy", "missing"], ["Policy", "active"], ["Start training", "disabled"]], "dark")]
          }),
          evidence([["Policy", "v1 active", "Strategy must fit allowed pairs"], ["Skill memory", "empty", "No learned rules yet"], ["Actor", "not started", "No strategy"]]),
          notes("Choose a template or start from rule blocks.", "No chain change.", "Load policy, personality, and previous strategy history.", "Cannot start PandaActor without active strategy.")),
        step("build", "02", "Build rules", "rule blocks", "Editing", "warn",
          agent("Bamboo-7", "Learning setup", "None", "Active", "Synced", "Draft", "focused", "config"),
          workspace("Rule builder", "Entry, confirmation, and sizing become structured strategy", "The center workspace behaves like a real strategy editor. The Panda card updates as the strategy becomes compatible with its personality.", {
            action: "Validate strategy",
            actionTone: "primary",
            tags: ["RSI recovery", "Orderbook imbalance", "small entry"],
            panels: [panel("Signal stack", [["Entry", "RSI recovers below 30"], ["Confirm", "imbalance flips positive"], ["Sizing", "small range entry"]]), panel("Panda fit", [["Patience", "64"], ["Focus", "84"], ["Fit", "good"]], "dark")],
            progress: [["Rule completeness", 76], ["Policy fit", 88], ["Personality fit", 70]]
          }),
          evidence([["Strategy draft", "local", "Not active until saved"], ["Allowed pairs", "SUI/DEEP", "Policy-compatible"], ["Parser", "schema ok", "Blocks compile"]]),
          notes("Build or edit strategy blocks.", "No chain change.", "Draft can be parsed into rule schema and previewed.", "Unsupported indicator or malformed rule shows inline error.")),
        step("validate", "03", "Validate", "against policy", "Compatible", "good",
          agent("Bamboo-7", "Validating", "None", "Active", "Synced", "Draft", "alert", "signing"),
          workspace("Policy validation", "Strategy cannot expand permission", "The same Strategy page shows validation against TradingPolicy: pair scope, notional assumptions, and conflicts.", {
            action: "Save strategy",
            actionTone: "primary",
            tags: ["policy pass", "0 conflicts", "pair scope ok"],
            panels: [panel("Allowed pairs", [["SUI_USDC", "pass"], ["DEEP_USDC", "pass"], ["WAL_USDC", "not used"]]), panel("Risk check", [["Max notional", "pass"], ["Daily loss", "safe"], ["Conflict count", "0"]], "dark")]
          }),
          evidence([["Policy mirror", "v1", "Used for validation"], ["Strategy hash", "0xst...pre", "Preview digest"], ["Conflict", "0", "Save enabled"]]),
          notes("Click validate and review compatibility result.", "No chain change.", "Run StrategyFeed validation against TradingPolicy mirror.", "If strategy wants unauthorized pair, save button remains disabled.")),
        step("save", "04", "Save version", "commit", "Saving", "warn",
          agent("Bamboo-7", "Saving", "None", "Active", "Synced", "Learning", "focused", "signing"),
          workspace("Version commit", "Strategy becomes part of the decision pipeline", "The UI shows a save progress overlay and the strategy version that future decisions will reference.", {
            action: "Saving strategy",
            actionTone: "ghost",
            tags: ["v3", "ghost initialized", "decision ready"],
            panels: [panel("Commit payload", [["Version", "v3"], ["Ghost weight", "0.40"], ["Status", "activating"]], "dark"), panel("Pipeline reads", [["Personality", "loaded"], ["Policy", "v1"], ["Skill memory", "empty"]])],
            code: "strategy_version: v3\nstrategy_hash: 0xst...42\nghost_weight_from_previous: 0.40\nstatus: activating",
            overlay: ["Saving strategy", "Backend creates strategy version and initializes ghost influence."]
          }),
          evidence([["Strategy row", "creating", "PostgreSQL source of truth"], ["Ghost", "0.40", "Previous strategy influence"], ["Active after", "commit", "Actor can start next"]]),
          notes("Save strategy version.", "Future strategy digest may be submitted on-chain.", "Create strategy row and strategy_history ghost entry.", "Save failure keeps previous strategy active.")),
        step("active", "05", "Active strategy", "ghost attached", "Active", "good",
          agent("Bamboo-7", "Ready to watch", "None", "Active", "Synced", "v3", "ready", "success"),
          workspace("Strategy active", "The Panda now has taste, collar, and bounded account", "The page shows active strategy, ghost influence, and the CTA to Training Ledger. It still explains that strategy cannot bypass policy.", {
            action: "Start Training",
            actionTone: "primary",
            tags: ["v3 active", "ghost decay", "training ready"],
            panels: [panel("Active strategy", [["Current", "v3"], ["Previous", "v2 archived"], ["ghost_weight", "0.40 -> decay"]], "dark"), panel("Next loop", [["Market", "DeepBook mainnet"], ["Decision", "8-step engine"], ["Execution", "paper ledger"]])]
          }),
          evidence([["Strategy", "v3 active", "Loaded by PandaActor"], ["Policy", "still v1", "No permission expansion"], ["Training", "ready", "Next journey"]]),
          notes("Start training or continue editing.", "Future skill / strategy digest may be submitted on-chain.", "Panda status ready_to_train; strategy_history ghost initialized.", "Old strategy can influence decisions but cannot override policy."))
      ]
    },

    training: {
      eyebrow: "J4-J5 · 24h Loop",
      title: "Training Ledger Journey",
      intro: "这里展示一个真实 market tick 的完整页面生命周期：行情、决策、PolicyGate、账本、Trade Fact、时间线。",
      badges: ["DeepBook mainnet", "PolicyGate", "Trade Fact"],
      productPage: "Training Ledger",
      navHint: "Live Market Loop",
      steps: [
        step("waiting", "01", "Waiting", "actor online", "Idle loop", "warn",
          agent("Bamboo-7", "Watching", "HOLD", "Active", "Synced", "v3", "calm", "ready"),
          workspace("Training dashboard", "Actor is online, waiting for a fresh tick", "The dashboard is complete: Panda, K-line, decision chain, ledger, and proof status are visible even before the first fresh market event.", {
            action: "Stop training",
            actionTone: "ghost",
            tags: ["actor online", "market waiting", "policy v1"],
            chart: "waiting",
            panels: [panel("Session", [["Actor", "online"], ["Market", "waiting"], ["Strategy", "v3 active"]]), panel("Ledger", [["Cash", "10,000"], ["Position", "0 SUI"], ["PnL", "0.00%"]], "dark")]
          }),
          evidence([["Redis", "subscribed", "market:tick:SUI_USDC"], ["DeepBook", "waiting", "Freshness > 120s"], ["Policy", "v1", "Loaded in actor"]]),
          notes("Click Start Training and keep dashboard open or background session active.", "No chain action.", "Start PandaActor and subscribe to market:tick pairs.", "Market stale pauses decisions and shows degraded status.")),
        step("tick", "02", "Market tick", "DeepBook fresh", "Market fresh", "good",
          agent("Bamboo-7", "Watching", "HOLD", "Active", "Synced", "v3", "alert", "watching"),
          workspace("DeepBook radar", "Fresh mainnet tick updates the chart", "The Training Dashboard updates the chart, pair freshness, reference price, and signal preview while keeping the same page structure.", {
            action: "Live",
            actionTone: "ghost",
            tags: ["SUI_USDC", "fresh 3s", "reference price"],
            chart: "fresh",
            panels: [panel("Market tick", [["Pair", "SUI_USDC"], ["Reference", "3.42"], ["Freshness", "3s"]]), panel("Indicators", [["RSI", "31 -> 36"], ["Imbalance", "+0.18"], ["Volatility", "normal"]], "dark")]
          }),
          evidence([["Market source", "DeepBook mainnet", "Reference price from monitor"], ["Redis event", "market.tick", "Delivered to PandaActor"], ["Candles", "1m", "REST history + live tick"]]),
          notes("Watch market status and selected pair.", "No chain action.", "Normalize tick, compute indicators, load personality / strategy / skill memory.", "If Redis down, no new decisions; show degraded live feed.")),
        step("decision", "03", "Decision", "OrderIntent", "Thinking", "good",
          agent("Bamboo-7", "Thinking", "BUY", "Active", "Synced", "v3", "focused", "thinking"),
          workspace("Decision chain", "The Panda produces an OrderIntent", "The center workspace highlights the eight-step decision chain and shows the resulting BUY intent with confidence, reason, and execution threshold.", {
            action: "Autonomous",
            actionTone: "ghost",
            tags: ["score 0.78", "EXECUTE", "BUY SUI"],
            chart: "active",
            panels: [panel("OrderIntent", [["Side", "BUY"], ["Pair", "SUI_USDC"], ["Final score", "0.78"]], "dark"), panel("Reason", [["Entry", "RSI recovery"], ["Confirm", "imbalance positive"], ["Sizing", "small entry"]])],
            timeline: [["Step 1", "Signals vote", "PASS"], ["Step 4", "Ghost influence", "LOW"], ["Step 8", "Final score", "EXECUTE"]]
          }),
          evidence([["Decision hash", "0xdeci...78", "Linked to Trade Fact"], ["Threshold", "> 0.65", "Execute zone"], ["Skill memory", "v3 + empty", "No verified skill yet"]]),
          notes("No click required. User observes autonomous decision.", "No chain action for Mode 1 paper decision.", "Create OrderIntent with decision_hash and policy_version.", "HOLD stays visible in timeline but does not execute ledger mutation.")),
        step("policy", "04", "PolicyGate", "collar check", "Policy pass", "good",
          agent("Bamboo-7", "Policy checking", "BUY", "Active", "Synced", "v3", "alert", "signing"),
          workspace("PolicyGate", "The collar checks the executable intent", "The same dashboard switches focus to policy checks: allowed pair, notional cap, daily loss, and paused/revoked state.", {
            action: "Policy pass",
            actionTone: "ghost",
            tags: ["pair pass", "notional 42/50", "daily loss safe"],
            panels: [panel("Policy checks", [["Pair", "SUI_USDC pass"], ["Notional", "42 / 50"], ["Daily loss", "safe"]], "dark"), panel("Failure path", [["Unauthorized pair", "REJECTED_BY_POLICY"], ["Paused", "blocked"], ["Mirror stale", "degraded"]])]
          }),
          evidence([["TradingPolicy", "v1", "Snapshot attached"], ["PolicyGate", "pass", "Execution allowed"], ["Rejected events", "visible", "Never silently dropped"]]),
          notes("Inspect why intent passed or failed.", "No chain action in Mode 1.", "Snapshot policy into Trade Fact candidate.", "Policy violation creates REJECTED_BY_POLICY event, not silent drop.")),
        step("ledger", "05", "Ledger", "paper execution", "Executed", "good",
          agent("Bamboo-7", "Executing", "BUY", "Active", "Synced", "v3", "excited", "success"),
          workspace("Training Ledger", "Paper trade mutates the virtual account", "The dashboard updates cash, position, and unrealized exposure using the mainnet reference price. No real user funds move.", {
            action: "Paper executed",
            actionTone: "ghost",
            tags: ["mainnet ref price", "cash -42", "position +SUI"],
            chart: "active",
            panels: [panel("Before", [["Cash", "10,000"], ["Position", "0 SUI"], ["Exposure", "0"]]), panel("Execution", [["Side", "BUY"], ["Price", "3.42"], ["Notional", "42"]], "dark"), panel("After", [["Cash", "9,958"], ["Position", "+12.28 SUI"], ["PnL", "open"]])]
          }),
          evidence([["Ledger", "paper", "PostgreSQL virtual ledger"], ["Reference price", "DeepBook mainnet", "No testnet liquidity dependency"], ["Real funds", "0 moved", "Mode 1 simulation truth"]]),
          notes("Review ledger result and position change.", "No real asset moves.", "LedgerService writes entries in same DB transaction as Trade Fact commit.", "Ledger mutation failure marks intent failed; no partial position update.")),
        step("fact", "06", "Trade Fact", "evidence commit", "Committed", "good",
          agent("Bamboo-7", "Recording", "BUY", "Active", "Synced", "v3", "focused", "ready"),
          workspace("Trade Fact committed", "Market, decision, policy, and ledger state become canonical evidence", "The page shows the new timeline row, decision hash, ledger before/after, and proof eligibility marker.", {
            action: "View fact",
            actionTone: "primary",
            tags: ["tf_2049", "fact committed", "proof eligible later"],
            panels: [panel("Trade Fact", [["trade_fact_id", "tf_2049"], ["decision_hash", "0xdeci...78"], ["policy_version", "v1"]], "dark"), panel("Async jobs", [["Review", "wait for close"], ["Proof selector", "cooldown check"], ["Merkle", "batch later"]])],
            timeline: [["BUY", "SUI_USDC score 0.78", "PAPER_EXECUTED"], ["HOLD", "DEEP_USDC score 0.53", "DECIDED"]]
          }),
          evidence([["Trade Fact", "tf_2049", "Canonical evidence row"], ["Async queue", "pending", "Proof/review workers may run"], ["Merkle batch", "not yet", "Every 50 facts"]]),
          notes("Inspect committed Trade Fact.", "None unless Chain Proof is triggered.", "Commit market, decision, policy, and ledger snapshots atomically.", "Async side effects must not roll back the paper trade fact.")),
        step("inspect", "07", "Inspect", "loop continues", "Looping", "good",
          agent("Bamboo-7", "Watching", "HOLD", "Active", "Synced", "v3", "calm", "watching"),
          workspace("Decision timeline", "The user can explain every buy, sell, hold, or rejection", "The dashboard returns to live mode while the timeline keeps the full audit trail. The next tick starts the same loop again.", {
            action: "Prove selected fact",
            actionTone: "primary",
            tags: ["timeline expanded", "loop continues", "proof optional"],
            chart: "fresh",
            timeline: [["BUY", "SUI_USDC score 0.78. Policy passed.", "PAPER_EXECUTED"], ["HOLD", "DEEP_USDC score 0.53. Observation zone.", "DECIDED"], ["SELL", "Partial close. Realized PnL known.", "POSITION_CLOSED"]],
            panels: [panel("Current session", [["Actor", "running"], ["Open position", "+12.28 SUI"], ["Next tick", "waiting"]], "dark")]
          }),
          evidence([["Realtime", "panda:*", "Decision and trade events"], ["Proof", "manual available", "Selected Chain Proof Moment"], ["Review", "after close", "Skill update waits for realized PnL"]]),
          notes("Inspect decision chain or request manual proof on a Trade Fact.", "None unless Chain Proof is triggered.", "Publish panda:* events to realtime hub.", "Review and Chain Proof are async side effects, not required for every tick."))
      ]
    },

    "chain-proof": {
      eyebrow: "J6",
      title: "Chain Proof Journey",
      intro: "展示 selected Trade Fact 如何变成 testnet PTB 证明。Auto 和 Manual 共用同一条 pipeline，但 guardrail 不同。",
      badges: ["Auto / Manual entry", "Agent Signer", "Move policy check"],
      productPage: "Chain Proof",
      navHint: "Proof Console",
      steps: [
        step("eligible", "01", "Eligible", "select fact", "Checking", "warn",
          agent("Bamboo-7", "Proof candidate", "PROOF", "Active", "Synced", "v3", "alert", "watching"),
          workspace("Proof eligibility", "A selected Trade Fact can request testnet proof", "The product page shows the exact fact, auto/manual entry reason, cooldown, daily cap, policy version, and idempotency key.", {
            action: "Queue proof",
            actionTone: "primary",
            tags: ["tf_2049", "score 0.78", "cooldown pass"],
            panels: [panel("Auto entry", [["final_score", "0.78"], ["side", "BUY"], ["zone", "EXECUTE"]]), panel("Manual entry", [["User click", "allowed"], ["Policy", "still checked"], ["Duplicate", "blocked"]], "dark")]
          }),
          evidence([["Proof key", "tf_2049:v1:0xdeci", "Idempotency source"], ["Eligibility", "pass", "Cooldown and cap ok"], ["Ledger truth", "paper", "Proof does not decide PnL"]]),
          notes("Auto: no click. Manual: click Prove on-chain from Trade Fact.", "No chain action yet.", "ProofSelector evaluates proof_key = trade_fact_id + policy_version + decision_hash.", "Duplicate proof resolves to existing chain_execution_log.")),
        step("job", "02", "Job queued", "async path", "Queued", "good",
          agent("Bamboo-7", "Queued", "PROOF", "Active", "Synced", "v3", "focused", "ready"),
          workspace("Proof job", "Hot path complete, chain work goes async", "The page shows the durable async job and makes clear that paper ledger truth is already committed before the chain worker starts.", {
            action: "Waiting worker",
            actionTone: "ghost",
            tags: ["async_jobs", "chain_execution_worker", "retryable"],
            panels: [panel("Async job", [["job_id", "job_991"], ["type", "CHAIN_PROOF"], ["status", "queued"]], "dark"), panel("Why async?", [["Trading loop", "not blocked"], ["Retries", "safe"], ["Idempotency", "proof key"]])],
            code: "async_job:\n  type: CHAIN_PROOF\n  trade_fact_id: tf_2049\n  proof_key: tf_2049:v1:0xdeci"
          }),
          evidence([["Job", "job_991", "PostgreSQL durable queue"], ["Hot path", "complete", "No waiting for chain"], ["Retries", "bounded", "Idempotency prevents duplicates"]]),
          notes("Watch queued proof state.", "No chain action yet.", "Insert async_jobs row after Trade Fact commit.", "Worker failure retries without duplicating proof.")),
        step("ptb", "03", "Build PTB", "PandaCoin demo", "Building", "warn",
          agent("Bamboo-7", "Building PTB", "PROOF", "Active", "Synced", "v3", "alert", "signing"),
          workspace("PTB builder", "Testnet demo execution path", "The page exposes the selected Move path: demo_executor checks TradingPolicy, touches PandaVault, and emits a proof event with the Trade Fact reference.", {
            action: "Build transaction",
            actionTone: "ghost",
            tags: ["demo_executor", "PandaCoin", "policy check"],
            panels: [panel("Move path", [["Module", "demo_executor"], ["Vault", "0xvault...88"], ["Policy", "v1"]], "dark"), panel("Payload", [["side", "BUY"], ["pair", "SUI_USDC"], ["notional", "42"]])],
            code: "execute_demo_trade(\n  panda_vault,\n  trading_policy,\n  trade_fact_id,\n  side: BUY,\n  notional: 42\n)"
          }),
          evidence([["PTB", "built locally", "Not signed yet"], ["Move checks", "policy + signer", "Cannot bypass collar"], ["PandaCoin", "testnet demo", "Not real PnL source"]]),
          notes("No user action for auto proof; manual user watches build state.", "No submission until signer signs.", "Build transaction from chain_execution_logs payload.", "Malformed payload marks job failed and keeps Trade Fact intact.")),
        step("sign", "04", "Agent signs", "policy-bound", "Signing", "warn",
          agent("Bamboo-7", "Submitting", "PROOF", "Active", "Synced", "v3", "focused", "signing"),
          workspace("Agent Signer", "The automated pawprint signs only the authorized PTB", "The page shows signer address, policy scope, gas coin, and pending digest. This is where autonomous on-chain behavior becomes visible.", {
            action: "Submitting",
            actionTone: "ghost",
            tags: ["0xagent...paws", "testnet", "policy-bound"],
            panels: [panel("Signer", [["Address", "0xagent...paws"], ["Scope", "policy-bound"], ["Can loosen?", "No"]], "dark"), panel("Submission", [["Network", "Sui testnet"], ["Gas", "agent gas coin"], ["Status", "pending"]])],
            overlay: ["Submitting PTB", "Agent Signer signs and submits the transaction. Move will abort if policy is paused or signer revoked."]
          }),
          evidence([["Signer", "0xagent...paws", "Authorized in policy"], ["Digest", "pending", "Waiting for confirmation"], ["Rollback", "chain only", "Paper Trade Fact is not rolled back"]]),
          notes("Watch signer submit the transaction.", "PTB submitted to Sui testnet.", "Sign and execute via ChainExecutionWorker; record pending digest.", "If Move aborts, mark proof failed without changing paper ledger.")),
        step("confirmed", "05", "Confirmed", "Move event", "Confirmed", "good",
          agent("Bamboo-7", "Proved", "PROOF", "Active", "Synced", "v3", "proud", "success"),
          workspace("Proof confirmed", "Tx digest and Move event attach to the Trade Fact", "The final proof screen shows digest, event, policy version, and share link. It is a real testnet action tied back to the paper decision.", {
            action: "Share proof",
            actionTone: "primary",
            tags: ["tx confirmed", "DemoTradeExecuted", "shareable"],
            panels: [panel("Confirmed transaction", [["tx_digest", "8xPTB...42"], ["event", "DemoTradeExecuted"], ["policy_version", "v1"]], "dark"), panel("Attached to fact", [["trade_fact_id", "tf_2049"], ["decision_hash", "0xdeci...78"], ["proof_status", "confirmed"]])],
            toast: ["On-chain proof complete", "This selected action is now visible as a Sui testnet PTB proof."]
          }),
          evidence([["Tx digest", "8xPTB...42", "Confirmed testnet transaction"], ["Move event", "DemoTradeExecuted", "Emitted by demo_executor"], ["Trade Fact", "proof attached", "UI can share proof link"]]),
          notes("Open proof details or share proof link.", "Confirmed transaction is immutable on testnet.", "Update Trade Fact proof_status and chain_execution_logs status.", "Proof is demo proof only; PnL remains mainnet paper ledger.")),
        step("failed", "06", "Failed state", "guardrail visible", "Failed", "danger",
          agent("Bamboo-7", "Blocked", "REJECTED", "Paused", "Synced", "v3", "concerned", "locked"),
          workspace("Proof failed safely", "Failure is explicit and does not corrupt the ledger", "The product screen shows why the PTB failed: cooldown, cap, duplicate, policy pause, signer revocation, or testnet error.", {
            action: "View failure",
            actionTone: "danger",
            tags: ["Move abort", "policy paused", "ledger unchanged"],
            panels: [panel("Failure reason", [["Reason", "POLICY_PAUSED"], ["PTB", "aborted"], ["Paper ledger", "unchanged"]], "dark"), panel("Recovery", [["User action", "unpause or retry"], ["Duplicate", "safe"], ["Job", "failed_visible"]])]
          }),
          evidence([["Failure", "POLICY_PAUSED", "Move abort is expected"], ["Trade Fact", "unchanged", "Proof failure separate"], ["Next", "user control", "Agent cannot unpause itself"]]),
          notes("Read failure and decide whether to retry later.", "Failed PTB may have no state mutation.", "Mark chain_execution_logs failed with reason.", "Failure never rolls back the canonical paper trade."))
      ]
    },

    review: {
      eyebrow: "J7",
      title: "Review And Learn Journey",
      intro: "复盘是记忆法庭：只有平仓并确认 realized PnL 后，熊猫才能用证据更新 Skill Memory。",
      badges: ["Realized PnL", "Hypothesis lifecycle", "Skill Memory"],
      productPage: "Review Journal",
      navHint: "Memory Court",
      steps: [
        step("close", "01", "Position closes", "review eligible", "Closing", "warn",
          agent("Bamboo-7", "Review pending", "SELL", "Active", "Synced", "v3", "alert", "watching"),
          workspace("Closed trade", "A SELL creates review eligibility", "The review page shows the closed position, original decision, and why open unrealized PnL cannot update memory.", {
            action: "Open review",
            actionTone: "primary",
            tags: ["POSITION_CLOSED", "realized soon", "review queued"],
            timeline: [["SELL", "Reduced SUI_USDC exposure by 60%", "POSITION_CLOSED"]],
            panels: [panel("Review gate", [["Open PnL", "ignored"], ["Closed portion", "eligible"], ["Skill update", "pending evidence"]], "dark")]
          }),
          evidence([["Trade Fact", "tf_2049", "Original BUY evidence"], ["Close event", "tf_2077", "SELL reduced exposure"], ["Review", "queued", "Needs realized PnL"]]),
          notes("Inspect closed trade from timeline.", "No chain action unless related proof exists.", "Mark closed portion and enqueue review job.", "Open unrealized PnL cannot update Skill Memory.")),
        step("pnl", "02", "Realized PnL", "result known", "+3.2%", "good",
          agent("Bamboo-7", "Reviewing", "None", "Active", "Synced", "v3", "focused", "thinking"),
          workspace("Outcome known", "The result is visible but not yet a lesson", "The page shows entry/exit reference prices, realized PnL, and the warning that profit alone does not prove the strategy was correct.", {
            action: "Analyze evidence",
            actionTone: "primary",
            tags: ["+3.2%", "entry/exit refs", "not yet skill"],
            panels: [panel("Price refs", [["Entry", "3.42"], ["Exit", "3.53"], ["Realized PnL", "+3.2%"]]), panel("Learning rule", [["Profit", "not enough"], ["Evidence", "required"], ["Skill update", "after review"]], "dark")]
          }),
          evidence([["Entry ref", "DeepBook mainnet", "Paper ledger source"], ["Exit ref", "DeepBook mainnet", "Realized PnL source"], ["Review status", "eligible", "Outcome known"]]),
          notes("Open review draft.", "No chain action.", "Calculate realized PnL and attach to Trade Fact.", "Missing market reference marks review blocked.")),
        step("evidence", "03", "Evidence", "memory court", "Reviewing", "warn",
          agent("Bamboo-7", "Reviewing", "None", "Active", "Synced", "v3", "thinking", "thinking"),
          workspace("Evidence courtroom", "Original belief is compared to market outcome", "The review interface places the decision reason beside the actual outcome and asks whether the evidence supports the claim.", {
            action: "Update hypothesis",
            actionTone: "primary",
            tags: ["RSI recovered", "imbalance positive", "size too high"],
            panels: [panel("Original belief", [["Signal", "RSI recovered"], ["Confirm", "imbalance positive"], ["Sizing", "small entry"]], "dark"), panel("What happened", [["Price", "moved up"], ["Regime", "range"], ["Lesson", "smaller sizing"]])]
          }),
          evidence([["Decision reason", "stored", "No raw LLM invention"], ["Market facts", "attached", "Tick snapshots"], ["Ledger facts", "before/after", "Evidence references"]]),
          notes("Read evidence-backed explanation.", "No chain action.", "ReviewWorker compares decision reason against outcome.", "Weak evidence keeps hypothesis proposed, not supported.")),
        step("hypothesis", "04", "Hypothesis", "supported", "Supported", "good",
          agent("Bamboo-7", "Learning", "None", "Active", "Synced", "v3", "focused", "ready"),
          workspace("Hypothesis lifecycle", "A clue becomes supported, not instantly verified", "The page shows proposed, supported, verified, weakened, and retired states so users understand how the Panda grows responsibly.", {
            action: "Version skill",
            actionTone: "primary",
            tags: ["supported", "needs 2 cases", "not overfit"],
            panels: [panel("Lifecycle", [["Proposed", "done"], ["Supported", "current"], ["Verified", "needs 2 more cases"]], "dark"), panel("Guardrail", [["Lucky profit", "not verified"], ["Contradiction", "weakens"], ["Evidence count", "4 facts"]])]
          }),
          evidence([["Hypothesis", "hp_88", "Supported by facts"], ["Evidence refs", "4", "Decision + market + ledger"], ["Verification", "not yet", "Needs repeated support"]]),
          notes("See whether Panda learned a lesson or only observed a clue.", "No chain action yet.", "Update hypothesis status from proposed to supported.", "Lucky profit without signal quality cannot become verified skill.")),
        step("skill", "05", "Skill memory", "versioned", "Updated", "good",
          agent("Bamboo-7", "Ready", "None", "Active", "Synced", "v12", "proud", "success"),
          workspace("Skill Memory v12", "Evidence-backed learning enters future decisions", "The review page shows the new skill version, confidence, evidence refs, and digest. Future decisions can read this skill.", {
            action: "Continue training",
            actionTone: "primary",
            tags: ["Skill v12", "confidence 0.68", "digest 0xsk...42"],
            panels: [panel("Skill v12", [["Confidence", "0.68"], ["Evidence", "4 facts"], ["Digest", "0xsk...42"]], "dark"), panel("New rule", [["Regime", "range"], ["Entry", "smaller after RSI recovery"], ["Confirm", "orderbook imbalance"]])]
          }),
          evidence([["Skill version", "v12", "Created by SkillMemoryWorker"], ["Digest", "0xsk...42", "Can be submitted periodically"], ["Next decision", "reads skill", "Step 5 in decision pipeline"]]),
          notes("Review new skill and continue training.", "Skill digest may be submitted periodically.", "SkillMemoryWorker creates new version and links evidence refs.", "Raw LLM claims without evidence cannot update Skill Memory."))
      ]
    },

    safety: {
      eyebrow: "J8",
      title: "Emergency Controls Journey",
      intro: "安全不是线性流程，而是核按钮面板：Active policy 下，用户可以选择 Pause、Revoke 或 Tighten。",
      badges: ["Owner override", "Mode 1 blocked", "Mode 2 Move aborts"],
      productPage: "Emergency Controls",
      navHint: "Safety Desk",
      steps: [
        step("pause", "01", "Pause policy", "freeze actions", "Pause requested", "danger",
          agent("Bamboo-7", "Paused", "REJECTED", "Paused", "Synced", "v3", "concerned", "locked"),
          workspace("Pause policy", "Stop new execution immediately", "The emergency page shows exactly what will happen to Mode 1, Mode 2, open positions, and queued proof jobs before the user signs.", {
            action: "Sign pause_policy",
            actionTone: "danger",
            tags: ["owner action", "agent cannot reverse", "new execution blocked"],
            panels: [panel("Result", [["Mode 1", "blocked"], ["Mode 2", "Move aborts"], ["Open positions", "safe close only"]], "dark"), panel("Owner control", [["Unpause", "owner only"], ["Proof jobs", "cancel pending"], ["Reviews", "continue"]])],
            overlay: ["Owner signature required", "Agent cannot pause or unpause itself. This is a user override."]
          }),
          evidence([["Policy", "paused=true", "Owner-signed update"], ["Backend mirror", "degraded until sync", "Blocks execution"], ["Move path", "aborts", "Policy check fails"]]),
          notes("Sign pause_policy transaction.", "TradingPolicy.paused = true and event emitted.", "Mirror paused state; cancel pending chain proof jobs; allow reviews to continue.", "If mirror stale, backend enters degraded mode and blocks execution.")),
        step("revoke", "02", "Revoke agent", "remove signer", "Revoking", "danger",
          agent("Bamboo-7", "Signer revoked", "REJECTED", "Active", "Synced", "v3", "concerned", "locked"),
          workspace("Revoke authorized agent", "Remove the automated pawprint", "The page shows before/after signer state and confirms that even a leaked old signer cannot pass the Move policy check after revocation.", {
            action: "Sign revoke_agent",
            actionTone: "danger",
            tags: ["authorized_agent cleared", "proof blocked", "manual owner control"],
            panels: [panel("Before", [["authorized_agent", "0xagent...paws"], ["Proof worker", "enabled"], ["Scope", "policy-bound"]]), panel("After", [["authorized_agent", "none"], ["PTB proof", "blocked"], ["Mode 1", "blocked by mirror"]], "dark")]
          }),
          evidence([["Signer", "revoked", "Policy no longer authorizes agent"], ["Chain worker", "stopped", "No proof submission"], ["Recovery", "rotate signer", "Requires owner-signed update"]]),
          notes("Sign revoke_agent transaction.", "TradingPolicy authorized_agent cleared or invalidated.", "Stop ChainExecutionWorker for this Panda and mark signer revoked.", "Mode 1 should also block executable intents after revocation.")),
        step("tighten", "03", "Tighten limits", "smaller collar", "Tightening", "warn",
          agent("Bamboo-7", "Restricted", "HOLD", "Tightened", "Synced", "v3", "calm", "ready"),
          workspace("Tighten limits", "Make the collar smaller without granting new freedom", "The emergency page supports reducing notional, lowering daily loss, and removing pairs. Loosening remains a deliberate user-signed action.", {
            action: "Sign stricter policy",
            actionTone: "primary",
            tags: ["max notional 50 -> 25", "loss 8% -> 4%", "pairs 2 -> 1"],
            panels: [panel("Before", [["Max notional", "50"], ["Daily loss", "8%"], ["Pairs", "2"]]), panel("After", [["Max notional", "25"], ["Daily loss", "4%"], ["Pairs", "1"]], "dark")]
          }),
          evidence([["Policy version", "v2", "Increment after update"], ["Loosening", "blocked for agent", "Owner signature required"], ["Future intents", "use v2", "Old policy version rejected"]]),
          notes("Sign policy update with stricter limits.", "TradingPolicyUpdated event and policy_version increments.", "Refresh mirror; future intents must use new policy_version.", "Loosening policy requires explicit user-signed transaction; agent cannot do it."))
      ]
    }
  };

  function step(id, number, label, sub, status, tone, agentState, workspaceState, evidenceState, notesState) {
    return { id, number, label, sub, status, tone, agent: agentState, workspace: workspaceState, evidence: evidenceState, notes: notesState };
  }

  function agent(identity, state, intent, collar, vault, skill, mood, avatar) {
    return { identity, state, intent, collar, vault, skill, mood, avatar };
  }

  function workspace(kicker, title, body, options = {}) {
    return { kicker, title, body, ...options };
  }

  function panel(title, rows, tone = "") {
    return { title, rows, tone };
  }

  function evidence(items) {
    return items.map(([label, value, detail]) => ({ label, value, detail }));
  }

  function notes(user, chain, backend, failure) {
    return { user, chain, backend, failure };
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function status(text, tone = "good") {
    const toneClass = tone === "good" ? "" : ` ${tone}`;
    return `<span class="status${toneClass}">${esc(text)}</span>`;
  }

  const primaryFlows = {
    mint: {
      disconnected: { type: "step", step: "ready", toast: ["Wallet connected", "Session ownership is verified. The Panda is still only an identity candidate."] },
      ready: { type: "modal", title: "Mint Panda NFT", body: "The wallet signs one Sui transaction that creates the Panda identity object. No vault, policy, or trading authority is granted here.", confirmLabel: "Sign mint", nextStep: "minting", toast: ["Mint submitted", "Waiting for Sui object changes."] },
      sign: { type: "modal", title: "Wallet signature", body: "Approve the mint PTB in the wallet. Rejection returns to preview without creating backend records.", confirmLabel: "Approve", nextStep: "minting" },
      minting: { type: "step", step: "success", toast: ["Mint confirmed", "Bamboo-7 is alive. Execution is still locked."] },
      success: { type: "route", url: "agent-wallet.html#step=no-vault" },
      failed: { type: "step", step: "ready", toast: ["Safe retry ready", "No Panda object was created, so retrying will not duplicate identity."] }
    },
    "agent-wallet": {
      "no-vault": { type: "step", step: "draft", toast: ["Setup started", "Choose the Panda's bounded playground before signing."] },
      draft: { type: "modal", title: "Review Agent Signer", body: "This automated pawprint can only act through the TradingPolicy. It cannot loosen policy or spend the user wallet.", confirmLabel: "Signer looks right", nextStep: "review" },
      review: { type: "modal", title: "Build setup transaction", body: "The transaction creates a shared PandaVault and a standalone shared TradingPolicy with this signer address stored inside.", confirmLabel: "Build PTB", nextStep: "sign" },
      sign: { type: "modal", title: "Create vault + policy", body: "The owner signs the setup PTB. If rejected, the draft remains local and the Panda stays locked.", confirmLabel: "Approve setup", nextStep: "active", toast: ["Agent Wallet active", "PandaVault and TradingPolicy mirror are syncing."] },
      active: { type: "route", url: "strategy.html#step=empty" },
      ready: { type: "route", url: "strategy.html#step=empty" }
    },
    strategy: {
      empty: { type: "step", step: "build", toast: ["Template selected", "The Panda now has editable rule blocks, not extra authority."] },
      build: { type: "step", step: "validate", toast: ["Strategy validated", "Policy compatibility checks are visible before save."] },
      validate: { type: "modal", title: "Save strategy version", body: "Saving creates a versioned strategy row and initializes ghost influence from the previous strategy.", confirmLabel: "Save v3", nextStep: "save" },
      save: { type: "step", step: "active", toast: ["Strategy active", "Bamboo-7 can start the training loop."] },
      active: { type: "route", url: "training.html#step=waiting" }
    },
    training: {
      waiting: { type: "step", step: "tick", toast: ["Actor watching", "A fresh DeepBook mainnet tick will wake the decision loop."] },
      tick: { type: "step", step: "decision" },
      decision: { type: "step", step: "policy" },
      policy: { type: "step", step: "ledger" },
      ledger: { type: "step", step: "fact", toast: ["Paper trade executed", "Cash and position updated from the mainnet reference price."] },
      fact: { type: "drawer", detailKind: "evidence" },
      inspect: { type: "route", url: "chain-proof.html#step=eligible" }
    },
    "chain-proof": {
      eligible: { type: "step", step: "job", toast: ["Proof queued", "Hot path stays complete while chain work runs async."] },
      job: { type: "step", step: "ptb" },
      ptb: { type: "step", step: "sign" },
      sign: { type: "step", step: "confirmed", toast: ["PTB confirmed", "The selected Trade Fact now has a testnet proof."] },
      confirmed: { type: "drawer", detailKind: "proof" },
      failed: { type: "drawer", detailKind: "failure" }
    },
    review: {
      close: { type: "step", step: "pnl" },
      pnl: { type: "step", step: "evidence" },
      evidence: { type: "step", step: "hypothesis" },
      hypothesis: { type: "step", step: "skill", toast: ["Skill versioned", "The lesson is evidence-backed before it affects future decisions."] },
      skill: { type: "route", url: "training.html#step=waiting" }
    },
    safety: {
      pause: { type: "modal", title: "Pause policy", body: "New execution stops immediately. Reviews may continue, but the Panda cannot unpause itself.", confirmLabel: "Sign pause", toast: ["Policy paused", "Backend mirror blocks new executable intents."] },
      revoke: { type: "modal", title: "Revoke Agent Signer", body: "The old automated pawprint can no longer pass Move policy checks after revocation.", confirmLabel: "Sign revoke", toast: ["Signer revoked", "Chain proof worker is disabled for this Panda."] },
      tighten: { type: "drawer", detailKind: "policy" }
    }
  };

  function renderIntro(journey) {
    return `
      <aside class="detail-copy journey-intro">
        <div class="eyebrow">${esc(journey.eyebrow)}</div>
        <h1>${esc(journey.title)}</h1>
        <p>${esc(journey.intro)}</p>
        <div class="badge-row">${journey.badges.map((badge) => `<span class="badge">${esc(badge)}</span>`).join("")}</div>
        <a class="button ghost" href="../index.html">返回总览</a>
      </aside>
    `;
  }

  function renderController(journey) {
    return `
      <aside class="prototype-controller">
        <div class="controller-head">
          <span>Prototype Controller</span>
          <strong>${esc(journey.eyebrow)}</strong>
          <em>Stepper is not product UI. It drives the product screen state.</em>
        </div>
        <div class="viewport-toggle" role="group" aria-label="Viewport">
          <button type="button" data-viewport-target="desktop">Desktop</button>
          <button type="button" data-viewport-target="mobile">Mobile</button>
        </div>
        <nav class="journey-stepper">
          ${journey.steps.map((item) => `
            <button class="step-button" type="button" data-step-target="${esc(item.id)}">
              <b>${esc(item.number)}</b>
              <span><strong>${esc(item.label)}</strong><span>${esc(item.sub)}</span></span>
            </button>
          `).join("")}
        </nav>
        <section class="interaction-replay" data-replay-panel>
          ${journey.steps.map(renderReplay).join("")}
        </section>
      </aside>
    `;
  }

  function renderAppTop(journey, stepItem) {
    return `
      <header class="product-topbar">
        <div class="product-brand">
          <span class="mini-panda"></span>
          <div><strong>TradingPanda</strong><em>${esc(journey.navHint)}</em></div>
        </div>
        <nav class="product-tabs">
          <span class="is-active">${esc(journey.productPage)}</span>
          <span>Training</span>
          <span>Proof</span>
          <span>Safety</span>
        </nav>
        <div class="product-wallet">
          <span>Sui Testnet</span>
          <strong>0xuser...beef</strong>
        </div>
      </header>
      <div class="product-page-title">
        <div>
          <span class="screen-kicker">${esc(stepItem.workspace.kicker)}</span>
          <h2>${esc(stepItem.workspace.title)}</h2>
          <p>${esc(stepItem.workspace.body)}</p>
        </div>
        ${status(stepItem.status, stepItem.tone)}
      </div>
    `;
  }

  function renderPandaCard(agentState, compact = false) {
    const rows = [
      ["Agent state", agentState.state],
      ["Current intent", agentState.intent],
      ["Policy collar", agentState.collar],
      ["Vault", agentState.vault],
      ["Skill memory", agentState.skill]
    ];

    return `
      <aside class="panda-agent-card${compact ? " compact" : ""}" data-hotspot="panda-card">
        <div class="panda-face avatar-${esc(agentState.avatar)}"><span></span></div>
        <div class="panda-agent-copy">
          <span>Panda Agent</span>
          <h3>${esc(agentState.identity)}</h3>
          <p>Mood: ${esc(agentState.mood)}. Emotion is expressed visually, not as hidden coefficients.</p>
        </div>
        <div class="agent-stat-grid">
          ${rows.map(([label, value]) => `
            <div class="agent-stat"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>
          `).join("")}
        </div>
      </aside>
    `;
  }

  function renderWorkspace(workspaceState, compact = false) {
    return `
      <section class="workspace-shell${compact ? " compact" : ""}" data-hotspot="workspace">
        ${workspaceState.toast ? `<div class="product-toast" data-hotspot="toast"><strong>${esc(workspaceState.toast[0])}</strong><span>${esc(workspaceState.toast[1])}</span></div>` : ""}
        <div class="workspace-action-row">
          <div class="workspace-tags">${(workspaceState.tags || []).map((tag) => `<span>${esc(tag)}</span>`).join("")}</div>
          ${workspaceState.action ? `<button class="button ${esc(workspaceState.actionTone || "ghost")}" type="button" data-hotspot="primary-action" data-product-action="primary">${esc(workspaceState.action)}</button>` : ""}
        </div>
        ${workspaceState.chart ? renderChart(workspaceState.chart) : ""}
        <div class="workspace-panel-grid">
          ${(workspaceState.panels || []).map(renderWorkspacePanel).join("")}
        </div>
        ${workspaceState.progress ? renderProgress(workspaceState.progress) : ""}
        ${workspaceState.timeline ? renderTimeline(workspaceState.timeline) : ""}
        ${workspaceState.code ? `
          <div class="technical-summary product-code" data-hotspot="proof-panel">
            <span>Technical payload</span>
            <strong>Hidden until requested</strong>
            <button class="button ghost" type="button" data-product-action="secondary-details">Open payload notes</button>
          </div>
        ` : ""}
        ${workspaceState.overlay ? `<div class="product-overlay-card" data-hotspot="wallet-modal"><span>${esc(workspaceState.overlay[0])}</span><strong>${esc(workspaceState.overlay[1])}</strong></div>` : ""}
      </section>
    `;
  }

  function renderWorkspacePanel(item) {
    const hotspot = panelHotspot(item.title);
    return `
      <article class="workspace-card ${esc(item.tone)}" data-hotspot="${esc(hotspot)}">
        <h4>${esc(item.title)}</h4>
        ${(item.rows || []).map(([label, value]) => `<div class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("")}
      </article>
    `;
  }

  function renderProgress(items) {
    return `
      <div class="workspace-card progress-card">
        <h4>Signal meters</h4>
        ${items.map(([label, value]) => `
          <div class="trait"><span>${esc(label)}</span><div class="bar"><i style="width:${Math.max(0, Math.min(100, Number(value)))}%"></i></div><b>${esc(value)}</b></div>
        `).join("")}
      </div>
    `;
  }

  function renderTimeline(items) {
    return `
      <div class="timeline product-timeline" data-hotspot="timeline">
        ${items.map(([kind, detail, result]) => `
          <div class="timeline-row"><b>${esc(kind)}</b><span>${esc(detail)}</span><strong>${esc(result)}</strong></div>
        `).join("")}
      </div>
    `;
  }

  function renderChart(mode) {
    const candles = [
      ["8%", "28%", "60px", "#6dff90"],
      ["18%", "35%", "82px", "#6dff90"],
      ["28%", "31%", "50px", "#ff5f56"],
      ["38%", "42%", "90px", "#6dff90"],
      ["48%", "39%", "66px", "#ff5f56"],
      ["58%", "50%", "98px", "#6dff90"],
      ["68%", "48%", "72px", "#6dff90"],
      ["78%", "56%", "104px", "#6dff90"]
    ];
    return `
      <div class="product-chart ${esc(mode)}" data-hotspot="market-chart">
        <div class="chart-head"><strong>DeepBook mainnet</strong><span>${mode === "waiting" ? "waiting for fresh tick" : "SUI_USDC · 1m · live"}</span></div>
        ${candles.map(([x, b, h, c]) => `<i class="candle" style="--x:${x};--b:${b};--h:${h};--c:${c}"></i>`).join("")}
      </div>
    `;
  }

  function renderMobileEvidence(items, showSheet) {
    const summary = items.slice(0, 3).map((item) => `${item.label}: ${item.value}`).join(" · ");
    return `
      <div class="mobile-evidence" data-hotspot="evidence-rail">
        <span>Evidence Summary</span>
        <strong>${esc(summary)}</strong>
        ${showSheet ? `
          <div class="bottom-sheet" data-hotspot="proof-panel">
            <b>Proof details</b>
            ${items.map((item) => `<p><strong>${esc(item.label)}</strong> ${esc(item.value)} - ${esc(item.detail)}</p>`).join("")}
          </div>
        ` : `<button class="button ghost" type="button" data-product-action="details">View evidence</button>`}
      </div>
    `;
  }

  function productKind(journey) {
    const page = journey.productPage.toLowerCase();
    if (page.includes("mint")) return "mint";
    if (page.includes("training")) return "training";
    if (page.includes("proof")) return "proof";
    if (page.includes("emergency")) return "safety";
    if (page.includes("review")) return "review";
    if (page.includes("strategy")) return "strategy";
    return "wallet";
  }

  function renderAppChrome(journey) {
    return `
      <header class="product-topbar">
        <div class="product-brand">
          <span class="mini-panda"></span>
          <div><strong>TradingPanda</strong><em>${esc(journey.navHint)}</em></div>
        </div>
        <nav class="product-tabs">
          <span class="is-active">${esc(journey.productPage)}</span>
          <span>Training</span>
          <span>Proof</span>
          <span>Safety</span>
        </nav>
        <div class="product-wallet">
          <span>Sui Testnet</span>
          <strong>0xuser...beef</strong>
        </div>
      </header>
    `;
  }

  function renderPandaStage(agentState, item, compact = false) {
    const label = item.id === "success" ? agentState.identity : "Panda Lab variants";
    return `
      <section class="panda-carousel-stage${compact ? " compact" : ""} state-${esc(item.id)}" data-hotspot="panda-card">
        <div class="stage-halo"></div>
        <div class="panda-variant orbit-one"></div>
        <div class="panda-variant orbit-two"></div>
        <div class="panda-variant orbit-three"></div>
        <div class="mint-panda-core avatar-${esc(agentState.avatar)}"><span></span></div>
        <div class="stage-caption">
          <strong>${esc(label)}</strong>
          <span>${item.id === "success" ? "Identity revealed" : "looping generated forms"}</span>
        </div>
      </section>
    `;
  }

  function renderMintAction(item) {
    return `
      <div class="mint-action-zone">
        <button class="button ${esc(item.workspace.actionTone || "primary")}" type="button" data-hotspot="primary-action" data-product-action="primary">${esc(item.workspace.action || "Mint Panda NFT")}</button>
        ${item.id === "success" ? `<button class="button ghost" type="button" data-product-action="details">View mint details</button>` : ""}
        <div class="gas-fee-hint" data-hotspot="evidence-rail">
          <span>Gas estimate</span>
          <strong>${item.id === "disconnected" ? "Connect wallet to estimate" : "~0.01 SUI · Testnet"}</strong>
          <em>Minting creates identity only. No PandaVault, TradingPolicy, or trading authority yet.</em>
        </div>
      </div>
    `;
  }

  function renderMintProduct(journey, item, mobile = false) {
    if (mobile) {
      return `
        <div class="phone-frame mint-phone">
          <header class="mobile-appbar">
            <div><strong>TradingPanda</strong><span>Mint Panda</span></div>
            <em>Sui</em>
          </header>
          <main class="mint-ritual-screen mobile" data-hotspot="workspace">
            ${item.workspace.toast ? `<div class="product-toast mint-toast" data-hotspot="toast"><strong>${esc(item.workspace.toast[0])}</strong><span>${esc(item.workspace.toast[1])}</span></div>` : ""}
            <section class="mint-hero-copy">
              <span class="screen-kicker">${esc(item.workspace.kicker)}</span>
              <h2>${item.id === "success" ? "Panda alive." : "Mint Panda"}</h2>
              <p>Identity first. Trading permission comes later.</p>
              ${status(item.status, item.tone)}
            </section>
            ${renderPandaStage(item.agent, item, true)}
            ${renderMintAction(item)}
            ${item.workspace.overlay ? `<div class="product-overlay-card mint-overlay" data-hotspot="wallet-modal"><span>${esc(item.workspace.overlay[0])}</span><strong>${esc(item.workspace.overlay[1])}</strong></div>` : ""}
          </main>
        </div>
      `;
    }

    return `
      <div class="product-app mint-product-app${mobile ? " mobile" : ""}">
        ${renderAppChrome(journey)}
        <main class="mint-ritual-screen" data-hotspot="workspace">
          ${item.workspace.toast ? `<div class="product-toast mint-toast" data-hotspot="toast"><strong>${esc(item.workspace.toast[0])}</strong><span>${esc(item.workspace.toast[1])}</span></div>` : ""}
          <section class="mint-hero-copy">
            <span class="screen-kicker">${esc(item.workspace.kicker)}</span>
            <h2>${item.id === "success" ? "Your Panda is alive." : "Mint your autonomous Panda"}</h2>
            <p>A tiny agent identity for Sui market training. The collar, vault, and trading permissions come later.</p>
            ${status(item.status, item.tone)}
          </section>
          ${renderPandaStage(item.agent, item, mobile)}
          ${renderMintAction(item)}
          ${item.workspace.overlay ? `<div class="product-overlay-card mint-overlay" data-hotspot="wallet-modal"><span>${esc(item.workspace.overlay[0])}</span><strong>${esc(item.workspace.overlay[1])}</strong></div>` : ""}
        </main>
      </div>
    `;
  }

  function renderEmbeddedEvidence(items, title = "Product Evidence") {
    const summary = items.slice(0, 2);
    return `
      <aside class="embedded-evidence" data-hotspot="evidence-rail">
        <div class="rail-title"><span>${esc(title)}</span><strong>Evidence summary</strong></div>
        <p class="evidence-summary-copy">Only the decision-useful proof is visible by default. Raw ids, payloads, and system logs stay one click deeper.</p>
        ${summary.map((item) => `
          <div class="evidence-item compact">
            <span>${esc(item.label)}</span>
            <strong>${esc(item.value)}</strong>
          </div>
        `).join("")}
        <button class="button ghost evidence-detail-button" type="button" data-product-action="details">Open details drawer</button>
      </aside>
    `;
  }

  function renderMediumProduct(journey, item, kind) {
    const title = kind === "strategy" ? "Strategy compatibility" : kind === "review" ? "Evidence courtroom" : "Policy preview";
    return `
      <div class="product-app medium-product-app page-${esc(kind)}">
        ${renderAppTop(journey, item)}
        <div class="medium-product-grid">
          ${renderPandaCard(item.agent)}
          <section class="medium-workspace">
            ${renderWorkspace(item.workspace)}
            ${renderEmbeddedEvidence(item.evidence, title)}
          </section>
          ${renderDetailActionRow(kind, item)}
        </div>
      </div>
    `;
  }

  function renderTrainingProduct(journey, item) {
    return `
      <div class="product-app training-product-app">
        ${renderAppTop(journey, item)}
        <div class="training-status-strip">
          <span>Actor: online</span>
          <span>Pair: SUI_USDC</span>
          <span>Market: ${item.workspace.chart === "waiting" ? "waiting" : "fresh"}</span>
          <span>Policy: ${esc(item.agent.collar)}</span>
        </div>
        <div class="training-cockpit-grid">
          ${renderPandaCard(item.agent)}
          <section class="market-chart-panel">${item.workspace.chart ? renderChart(item.workspace.chart) : renderWorkspace(item.workspace)}</section>
          <aside class="ledger-panel" data-hotspot="ledger-panel">
            <h4>LedgerSummaryStrip</h4>
            ${ledgerSummary(item).map(([label, value]) => `<div class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("")}
            <button class="button ghost" type="button" data-product-action="details">View ledger evidence</button>
          </aside>
        </div>
        <div class="training-bottom-grid">
          ${item.workspace.timeline ? renderTimeline(item.workspace.timeline) : renderWorkspace(item.workspace)}
          ${renderEmbeddedEvidence(item.evidence, "Trade Fact Drawer")}
        </div>
        ${renderDetailActionRow("training", item)}
      </div>
    `;
  }

  function renderProofProduct(journey, item) {
    return `
      <div class="product-app proof-product-app">
        ${renderAppTop(journey, item)}
        <div class="proof-console-grid">
          <section class="proof-job-timeline" data-hotspot="timeline">
            <h4>ProofJobTimeline</h4>
            ${["Eligible", "Queued", "Build PTB", "Agent signs", "Confirmed"].map((label) => `<div class="proof-step ${item.label.includes(label.split(" ")[0]) ? "active" : ""}"><span>${esc(label)}</span></div>`).join("")}
          </section>
          <section class="ptb-preview-panel" data-hotspot="proof-panel">
            ${renderWorkspace(item.workspace)}
          </section>
          ${renderEmbeddedEvidence(item.evidence, "PTB / Move Evidence")}
        </div>
        ${renderDetailActionRow("proof", item)}
      </div>
    `;
  }

  function renderSafetyProduct(journey, item) {
    const actions = [["Pause", "Stop new execution"], ["Revoke", "Remove agent signer"], ["Tighten", "Reduce limits"]];
    return `
      <div class="product-app safety-product-app">
        ${renderAppTop(journey, item)}
        <div class="risk-status-banner ${esc(item.tone)}" data-hotspot="policy-panel">
          <span>RiskStatusBanner</span>
          <strong>${esc(item.status)}</strong>
          <em>Owner controls the collar. The Panda cannot reverse this action.</em>
        </div>
        <div class="safety-action-grid">
          ${actions.map(([label, body]) => `<article class="safety-action-card ${item.label.includes(label) ? "active" : ""}"><h4>${esc(label)}</h4><p>${esc(body)}</p></article>`).join("")}
        </div>
        <div class="safety-result-grid">
          ${renderWorkspace(item.workspace)}
          ${renderEmbeddedEvidence(item.evidence, "Policy Result Panel")}
        </div>
        ${renderDetailActionRow("safety", item)}
      </div>
    `;
  }

  function renderDetailActionRow(kind, item) {
    const labels = {
      wallet: ["View advanced objects", "Signer scope"],
      strategy: ["Validation details", "Raw rule preview"],
      training: ["Decision timeline", "Ledger details"],
      proof: ["PTB details", "Failure guardrails"],
      review: ["Evidence refs", "Skill diff"],
      safety: ["Policy details", "Affected jobs"]
    };
    const [first, second] = labels[kind] || labels.wallet;
    return `
      <div class="detail-action-row">
        <button class="button ghost" type="button" data-product-action="details">${esc(first)}</button>
        <button class="button ghost" type="button" data-product-action="secondary-details">${esc(second)}</button>
      </div>
    `;
  }

  function ledgerSummary(item) {
    const hasPosition = ["ledger", "fact", "inspect"].includes(item.id);
    const isOpen = ["decision", "policy", "ledger", "fact", "inspect"].includes(item.id);
    return [
      ["Cash", hasPosition ? "9,958" : "10,000"],
      ["Position", isOpen ? "+12.28 SUI" : "0 SUI"],
      ["PnL", hasPosition ? "Open" : "0.00%"],
      ["Mode", "Training Ledger"]
    ];
  }

  function renderProductByKind(journey, item, mobile = false) {
    const kind = productKind(journey);
    if (kind === "mint") return renderMintProduct(journey, item, mobile);
    if (mobile) return renderMobileProductByKind(journey, item, kind);
    if (kind === "training") return renderTrainingProduct(journey, item);
    if (kind === "proof") return renderProofProduct(journey, item);
    if (kind === "safety") return renderSafetyProduct(journey, item);
    return renderMediumProduct(journey, item, kind);
  }

  function renderMobileProductByKind(journey, item, kind) {
    return `
      <div class="phone-frame page-${esc(kind)}">
        <header class="mobile-appbar">
          <div><strong>TradingPanda</strong><span>${esc(journey.productPage)}</span></div>
          <em>Sui</em>
        </header>
        <div class="mobile-screen-title">
          <span>${esc(item.number)} · ${esc(item.label)}</span>
          ${status(item.status, item.tone)}
        </div>
        ${renderPandaCard(item.agent, true)}
        ${item.workspace.chart ? renderChart(item.workspace.chart) : ""}
        ${renderWorkspace(item.workspace, true)}
        ${renderMobileEvidence(item.evidence, false)}
      </div>
    `;
  }

  function renderDesktopScreen(journey, item) {
    const kind = productKind(journey);
    return `
      <section class="product-screen desktop-product product-kind-${esc(kind)}" data-product-screen data-step="${esc(item.id)}" data-viewport="desktop">
        <div class="replay-cursor" data-replay-cursor></div>
        ${renderProductByKind(journey, item)}
      </section>
    `;
  }

  function renderMobileScreen(journey, item) {
    const kind = productKind(journey);
    return `
      <section class="product-screen mobile-product product-kind-${esc(kind)}" data-product-screen data-step="${esc(item.id)}" data-viewport="mobile">
        <div class="replay-cursor" data-replay-cursor></div>
        ${renderProductByKind(journey, item, true)}
      </section>
    `;
  }

  function renderSystemNotes(item) {
    const blocks = [
      ["User action", item.notes.user, ""],
      ["Chain changes", item.notes.chain, ""],
      ["Backend changes", item.notes.backend, ""],
      ["Failure / Guardrail", item.notes.failure, "danger"]
    ];
    return `
      <details class="system-notes-panel" data-system-notes data-step="${esc(item.id)}">
        <summary class="system-notes-title">
          <span>System Notes</span>
          <strong>${esc(item.number)} · ${esc(item.label)}</strong>
        </summary>
        <div class="system-notes-grid">
          ${blocks.map(([title, body, tone]) => `
            <div class="fact-block ${tone}"><h4>${esc(title)}</h4><p>${esc(body)}</p></div>
          `).join("")}
        </div>
      </details>
    `;
  }

  function renderReplay(item) {
    const actions = item.replay || inferReplay(item);
    return `
      <div class="replay-sequence" data-replay-step="${esc(item.id)}">
        <div class="replay-head">
          <div><span>Interaction Replay</span><strong>${esc(item.number)} · ${esc(item.label)}</strong></div>
          <button type="button" class="button ghost replay-button" data-replay-start="${esc(item.id)}">Replay interaction</button>
        </div>
        <ol class="replay-actions">
          ${actions.map((action, index) => `
            <li class="replay-action actor-${esc(action.actor.toLowerCase())}" data-replay-action="${index}" data-target="${esc(action.target)}" data-verb="${esc(action.verb)}">
              <b>${esc(action.actor)}</b>
              <span><strong>${esc(action.label)}</strong>${action.detail ? `<em>${esc(action.detail)}</em>` : ""}</span>
            </li>
          `).join("")}
        </ol>
      </div>
    `;
  }

  function inferReplay(item) {
    const title = `${item.label} ${item.workspace.title}`.toLowerCase();
    const actions = [];

    if (title.includes("tick")) {
      actions.push(action("MARKET", "publish", "market-chart", "DeepBook publishes fresh tick", "market-monitor forwards the new reference price."));
      actions.push(action("BACKEND", "compute", "workspace", "Normalize indicators", "PandaActor prepares signals and market context."));
    } else if (title.includes("decision")) {
      actions.push(action("MARKET", "publish", "market-chart", "Fresh tick triggers decision loop", "The Panda wakes up on a real market event."));
      actions.push(action("AGENT", "compute", "panda-card", "Score BUY / SELL / HOLD", "Decision engine produces an OrderIntent."));
    } else if (title.includes("policy") || title.includes("collar")) {
      actions.push(action("BACKEND", "compute", "policy-panel", "Run PolicyGate checks", "Allowed pairs, notional, daily loss, pause, and signer scope are checked."));
    } else if (title.includes("ledger")) {
      actions.push(action("BACKEND", "compute", "ledger-panel", "Mutate virtual ledger", "Mainnet reference price updates cash and position."));
    } else if (title.includes("proof") || title.includes("ptb")) {
      actions.push(action("USER", "click", "primary-action", `Trigger ${item.label}`, "Auto or manual proof enters the proof pipeline."));
      actions.push(action("BACKEND", "compute", "proof-panel", "Build proof payload", "ProofSelector / ChainExecutionWorker prepares the PTB."));
    } else if (title.includes("sign") || title.includes("wallet")) {
      actions.push(action("USER", "click", "primary-action", `Click ${item.workspace.action || item.label}`, "The user requests the next signed action."));
      actions.push(action("APP", "show", "wallet-modal", "Open wallet confirmation", "The page stays visible while the wallet prompt is pending."));
    } else if (title.includes("success") || title.includes("confirmed") || title.includes("active")) {
      actions.push(action("CHAIN", "confirm", "evidence-rail", "Confirm transaction or object state", "The durable fact is now visible in evidence."));
    } else if (title.includes("review") || title.includes("hypothesis") || title.includes("skill")) {
      actions.push(action("BACKEND", "compute", "workspace", "Review evidence", "ReviewWorker compares original belief with the outcome."));
      actions.push(action("AGENT", "compute", "panda-card", "Update Panda learning state", "The Panda learns only from evidence-backed facts."));
    } else {
      actions.push(action("USER", "click", "primary-action", `Click ${item.workspace.action || item.label}`, "The user performs the visible next action."));
    }

    if (item.workspace.overlay && !actions.some((entry) => entry.target === "wallet-modal")) {
      actions.push(action("APP", "show", "wallet-modal", `Show ${item.workspace.overlay[0]}`, item.workspace.overlay[1]));
    }

    if (item.workspace.chart && !actions.some((entry) => entry.target === "market-chart")) {
      actions.push(action("MARKET", "pulse", "market-chart", "Pulse market area", "The market panel reflects the latest training context."));
    }

    if (item.workspace.timeline) {
      actions.push(action("APP", "show", "timeline", "Update timeline", "The relevant event appears in the product timeline."));
    }

    const chainText = item.notes.chain.toLowerCase();
    if (!chainText.includes("no chain") && !chainText.includes("none") && !actions.some((entry) => entry.actor === "CHAIN")) {
      actions.push(action("CHAIN", "confirm", "evidence-rail", "Reflect chain-side result", item.notes.chain));
    }

    actions.push(action("APP", "show", item.workspace.toast ? "toast" : "workspace", "Render current screen state", "The product screen now shows the selected step's final state."));
    return actions.slice(0, 5);
  }

  function action(actor, verb, target, label, detail = "") {
    return { actor, verb, target, label, detail };
  }

  function panelHotspot(title) {
    const text = title.toLowerCase();
    if (text.includes("policy") || text.includes("collar") || text.includes("risk")) return "policy-panel";
    if (text.includes("ledger") || text.includes("cash") || text.includes("execution") || text.includes("balance")) return "ledger-panel";
    if (text.includes("intent") || text.includes("decision") || text.includes("signal") || text.includes("strategy")) return "decision-panel";
    if (text.includes("proof") || text.includes("ptb") || text.includes("transaction") || text.includes("confirmed") || text.includes("move")) return "proof-panel";
    return "workspace";
  }

  function renderUiLayer() {
    return `
      <div class="prototype-toast-stack" data-toast-stack aria-live="polite"></div>
      <div class="prototype-modal-backdrop" data-modal hidden>
        <section class="prototype-modal" role="dialog" aria-modal="true">
          <button class="modal-close" type="button" data-ui-close>Close</button>
          <span class="screen-kicker" data-modal-kicker>Signature checkpoint</span>
          <h3 data-modal-title></h3>
          <p data-modal-body></p>
          <div class="prototype-modal-actions">
            <button class="button ghost" type="button" data-ui-close>Cancel</button>
            <button class="button primary" type="button" data-modal-confirm>Confirm</button>
          </div>
        </section>
      </div>
      <aside class="prototype-drawer" data-drawer hidden>
        <button class="modal-close" type="button" data-ui-close>Close</button>
        <span class="screen-kicker" data-drawer-kicker>Detail drawer</span>
        <h3 data-drawer-title></h3>
        <div class="prototype-drawer-body" data-drawer-body></div>
      </aside>
    `;
  }

  function getJourney(root) {
    return journeys[root.dataset.journeyKey];
  }

  function getActiveItem(root) {
    const journey = getJourney(root);
    return journey?.steps.find((item) => item.id === root.dataset.step) || journey?.steps[0];
  }

  function getInitialStep(journey) {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const target = params.get("step");
    return journey.steps.some((item) => item.id === target) ? target : journey.steps[0]?.id;
  }

  function handleProductAction(root, actionName) {
    cancelReplay(root);
    const kind = root.dataset.journeyKey;
    const item = getActiveItem(root);
    if (!item) return;

    if (actionName === "primary") {
      runFlowAction(root, primaryFlows[kind]?.[item.id] || { type: "details" });
      return;
    }

    if (actionName === "secondary-details") {
      openDrawer(root, secondaryDetailTitle(kind), renderNotesDetail(item));
      return;
    }

    openDrawer(root, drawerTitle(kind, item), renderEvidenceDetail(item));
  }

  function runFlowAction(root, flow) {
    if (!flow) return;
    if (flow.type === "step") {
      activateJourney(root, flow.step, root.dataset.viewport || "desktop");
      if (flow.toast) showToast(root, flow.toast[0], flow.toast[1]);
      return;
    }
    if (flow.type === "route") {
      window.location.href = flow.url;
      return;
    }
    if (flow.type === "modal") {
      openModal(root, flow);
      return;
    }
    if (flow.type === "drawer" || flow.type === "details") {
      const item = getActiveItem(root);
      const kind = root.dataset.journeyKey;
      if (flow.detailKind === "policy") {
        openDrawer(root, secondaryDetailTitle(kind), renderNotesDetail(item));
      } else {
        openDrawer(root, drawerTitle(kind, item), renderEvidenceDetail(item));
      }
    }
  }

  function openModal(root, flow) {
    closeUiLayer(root, { keepToast: true });
    const modal = root.querySelector("[data-modal]");
    if (!modal) return;
    root.pendingFlow = flow;
    modal.querySelector("[data-modal-title]").textContent = flow.title || "Confirm action";
    modal.querySelector("[data-modal-body]").textContent = flow.body || "Review the action before continuing.";
    modal.querySelector("[data-modal-confirm]").textContent = flow.confirmLabel || "Confirm";
    modal.hidden = false;
  }

  function openDrawer(root, title, bodyHtml) {
    closeUiLayer(root, { keepToast: true });
    const drawer = root.querySelector("[data-drawer]");
    if (!drawer) return;
    drawer.querySelector("[data-drawer-title]").textContent = title;
    drawer.querySelector("[data-drawer-body]").innerHTML = bodyHtml;
    drawer.hidden = false;
  }

  function confirmModal(root) {
    const flow = root.pendingFlow;
    closeUiLayer(root, { keepToast: true });
    if (!flow) return;
    if (flow.nextStep) activateJourney(root, flow.nextStep, root.dataset.viewport || "desktop");
    if (flow.toast) showToast(root, flow.toast[0], flow.toast[1]);
  }

  function closeUiLayer(root, options = {}) {
    if (!options.keepToast) clearToast(root);
    root.querySelector("[data-modal]")?.setAttribute("hidden", "");
    root.querySelector("[data-drawer]")?.setAttribute("hidden", "");
    root.pendingFlow = null;
  }

  function showToast(root, title, body) {
    const stack = root.querySelector("[data-toast-stack]");
    if (!stack) return;
    clearTimeout(activeToastTimer);
    stack.innerHTML = `<div class="prototype-toast"><strong>${esc(title)}</strong><span>${esc(body)}</span></div>`;
    activeToastTimer = setTimeout(() => clearToast(root), 3200);
  }

  function clearToast(root) {
    const stack = root.querySelector("[data-toast-stack]");
    if (stack) stack.innerHTML = "";
  }

  function drawerTitle(kind, item) {
    const titles = {
      mint: "Mint transaction details",
      "agent-wallet": "Agent Wallet object details",
      strategy: "Strategy validation evidence",
      training: "Trade Fact evidence",
      "chain-proof": item.id === "failed" ? "Proof failure guardrails" : "PTB proof details",
      review: "Review evidence references",
      safety: "Policy effect details"
    };
    return titles[kind] || "Product details";
  }

  function secondaryDetailTitle(kind) {
    const titles = {
      "agent-wallet": "Signer scope",
      strategy: "Compiled rule preview",
      training: "Backend system notes",
      "chain-proof": "Move guardrails",
      review: "Skill memory diff",
      safety: "Affected async jobs"
    };
    return titles[kind] || "System explanation";
  }

  function renderEvidenceDetail(item) {
    return `
      <div class="drawer-list">
        ${item.evidence.map((entry) => `
          <article class="drawer-fact">
            <span>${esc(entry.label)}</span>
            <strong>${esc(entry.value)}</strong>
            <p>${esc(entry.detail)}</p>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderNotesDetail(item) {
    const rows = [
      ["User action", item.notes.user],
      ["Chain changes", item.notes.chain],
      ["Backend changes", item.notes.backend],
      ["Failure / guardrail", item.notes.failure]
    ];
    return `
      <div class="drawer-list">
        ${rows.map(([label, value]) => `
          <article class="drawer-fact">
            <span>${esc(label)}</span>
            <p>${esc(value)}</p>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderJourney(root, journey) {
    root.innerHTML = `
      ${renderIntro(journey)}
      <section class="journey-player" data-journey>
        ${renderController(journey)}
        <div class="screen-stack">
          <div class="product-screen-stack">
            ${journey.steps.map((item) => `${renderDesktopScreen(journey, item)}${renderMobileScreen(journey, item)}`).join("")}
          </div>
          <div class="system-notes-stack">
            ${journey.steps.map(renderSystemNotes).join("")}
          </div>
        </div>
        ${renderUiLayer()}
      </section>
    `;

    const firstStep = getInitialStep(journey);
    const defaultViewport = window.matchMedia?.("(max-width: 760px)").matches ? "mobile" : "desktop";
    activateJourney(root, firstStep, defaultViewport);

    root.addEventListener("click", (event) => {
      const closeButton = event.target.closest("[data-ui-close]");
      if (closeButton && root.contains(closeButton)) {
        closeUiLayer(root);
        return;
      }

      const modalConfirm = event.target.closest("[data-modal-confirm]");
      if (modalConfirm && root.contains(modalConfirm)) {
        confirmModal(root);
        return;
      }

      const productAction = event.target.closest("[data-product-action]");
      if (productAction && root.contains(productAction)) {
        handleProductAction(root, productAction.dataset.productAction);
        return;
      }

      const replayButton = event.target.closest("[data-replay-start]");
      if (replayButton && root.contains(replayButton)) {
        replayCurrentStep(root, replayButton.dataset.replayStart);
        return;
      }

      const stepButton = event.target.closest("[data-step-target]");
      if (stepButton && root.contains(stepButton)) {
        cancelReplay(root);
        activateJourney(root, stepButton.dataset.stepTarget, root.dataset.viewport || "desktop");
        return;
      }

      const viewportButton = event.target.closest("[data-viewport-target]");
      if (viewportButton && root.contains(viewportButton)) {
        cancelReplay(root);
        activateJourney(root, root.dataset.step || firstStep, viewportButton.dataset.viewportTarget);
      }
    });

    window.addEventListener("hashchange", () => {
      const nextStep = getInitialStep(journey);
      if (nextStep && nextStep !== root.dataset.step) {
        cancelReplay(root);
        activateJourney(root, nextStep, root.dataset.viewport || defaultViewport, { skipHash: true });
      }
    });
  }

  function activateJourney(root, stepId, viewport, options = {}) {
    closeUiLayer(root, { keepToast: false });
    root.dataset.step = stepId;
    root.dataset.viewport = viewport;
    if (!options.skipHash) {
      window.history.replaceState(null, "", `#step=${encodeURIComponent(stepId)}`);
    }
    const player = root.querySelector("[data-journey]");
    if (player) {
      player.classList.toggle("is-mobile-mode", viewport === "mobile");
    }

    root.querySelectorAll("[data-step-target]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.stepTarget === stepId);
    });

    root.querySelectorAll("[data-viewport-target]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.viewportTarget === viewport);
    });

    root.querySelectorAll("[data-product-screen]").forEach((screen) => {
      const isActive = screen.dataset.step === stepId && screen.dataset.viewport === viewport;
      screen.classList.toggle("is-active", isActive);
    });

    root.querySelectorAll("[data-system-notes]").forEach((notesPanel) => {
      const isActive = notesPanel.dataset.step === stepId;
      notesPanel.classList.toggle("is-active", isActive);
      if (isActive) {
        notesPanel.open = false;
      }
    });

    root.querySelectorAll("[data-replay-step]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.replayStep === stepId);
    });
  }

  async function replayCurrentStep(root, stepId) {
    cancelReplay(root);
    const token = { canceled: false };
    activeReplay = token;

    const sequence = root.querySelector(`[data-replay-step="${cssEscape(stepId)}"]`);
    const screen = root.querySelector("[data-product-screen].is-active");
    if (!sequence || !screen) return;

    const actions = [...sequence.querySelectorAll("[data-replay-action]")];
    const cursor = screen.querySelector("[data-replay-cursor]");
    actions.forEach((item) => item.classList.remove("is-active", "is-done"));
    screen.querySelectorAll(".is-replay-target, .is-replay-clicked").forEach((target) => target.classList.remove("is-replay-target", "is-replay-clicked"));
    if (cursor) cursor.classList.add("is-visible");

    for (const item of actions) {
      if (token.canceled) break;
      closeUiLayer(root, { keepToast: true });
      const targetName = item.dataset.target;
      const verb = item.dataset.verb;
      const target = findHotspot(screen, targetName);
      item.classList.add("is-active");
      if (target) {
        moveReplayCursor(screen, cursor, target);
        target.classList.add("is-replay-target");
        if (["click", "approve", "sign"].includes(verb)) {
          target.classList.add("is-replay-clicked");
        }
      } else {
        console.warn(`Missing hotspot: ${targetName}`);
        moveReplayCursor(screen, cursor, screen);
      }
      showReplayEffect(root, targetName, verb);
      await wait(820);
      item.classList.remove("is-active");
      item.classList.add("is-done");
      if (target) target.classList.remove("is-replay-target", "is-replay-clicked");
      await wait(120);
    }

    if (cursor) cursor.classList.remove("is-visible");
    closeUiLayer(root, { keepToast: false });
    if (activeReplay === token) activeReplay = null;
  }

  function showReplayEffect(root, targetName, verb) {
    const item = getActiveItem(root);
    if (!item) return;
    if (targetName === "wallet-modal") {
      openModal(root, {
        title: item.workspace.overlay?.[0] || "Wallet confirmation",
        body: item.workspace.overlay?.[1] || item.notes.user,
        confirmLabel: "Replay only"
      });
      return;
    }
    if (targetName === "toast" || (verb === "show" && item.workspace.toast)) {
      const toast = item.workspace.toast || ["Current state rendered", "The product screen now shows this step's final state."];
      showToast(root, toast[0], toast[1]);
      return;
    }
    if (["evidence-rail", "proof-panel"].includes(targetName) && ["show", "confirm"].includes(verb)) {
      openDrawer(root, drawerTitle(root.dataset.journeyKey, item), renderEvidenceDetail(item));
    }
  }

  function cancelReplay(root) {
    if (activeReplay) activeReplay.canceled = true;
    activeReplay = null;
    root.querySelectorAll(".is-replay-target, .is-replay-clicked").forEach((target) => target.classList.remove("is-replay-target", "is-replay-clicked"));
    root.querySelectorAll(".replay-action").forEach((item) => item.classList.remove("is-active", "is-done"));
    root.querySelectorAll("[data-replay-cursor]").forEach((cursor) => cursor.classList.remove("is-visible"));
    closeUiLayer(root, { keepToast: false });
  }

  function findHotspot(screen, name) {
    return screen.querySelector(`[data-hotspot="${cssEscape(name)}"]`);
  }

  function moveReplayCursor(screen, cursor, target) {
    if (!cursor) return;
    const screenRect = screen.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const x = target === screen ? screenRect.width / 2 : targetRect.left - screenRect.left + targetRect.width / 2;
    const y = target === screen ? screenRect.height / 2 : targetRect.top - screenRect.top + Math.min(targetRect.height / 2, 120);
    cursor.style.left = `${Math.max(18, Math.min(screenRect.width - 18, x))}px`;
    cursor.style.top = `${Math.max(18, Math.min(screenRect.height - 18, y))}px`;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(value);
    return String(value).replace(/["\\]/g, "\\$&");
  }

  document.querySelectorAll("[data-journey-key]").forEach((root) => {
    const journey = journeys[root.dataset.journeyKey];
    if (!journey) return;
    renderJourney(root, journey);
  });
})();
