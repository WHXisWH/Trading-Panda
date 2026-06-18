import { clsx } from "clsx";

export type GasFeeHintVariant = "mint" | "agent-wallet";

interface GasFeeHintProps {
  muted?: boolean;
  compact?: boolean;
  variant?: GasFeeHintVariant;
}

const GAS_NETWORK = "Sui Testnet";
const GAS_FEE = "~0.03 SUI";

const VARIANT_COPY: Record<
  GasFeeHintVariant,
  { detail: string; compactDetail?: string }
> = {
  mint: {
    detail: "Minting a Panda does not give it trading permission yet.",
  },
  "agent-wallet": {
    detail:
      "Creates PandaVault + TradingPolicy on-chain. Paper trading balance (USD) stays off-chain. Paid from your wallet.",
    compactDetail: "Vault + Policy on-chain · paper balance off-chain · your wallet pays gas",
  },
};

export function GasFeeHint({
  muted = false,
  compact = false,
  variant = "mint",
}: GasFeeHintProps) {
  const copy = VARIANT_COPY[variant];

  if (compact) {
    const compactLine =
      variant === "agent-wallet" && copy.compactDetail
        ? `${GAS_NETWORK} · ${GAS_FEE} · ${copy.compactDetail}`
        : `${GAS_NETWORK} · ${GAS_FEE}`;
    return (
      <p
        className={clsx(
          "font-mono text-[10px] tracking-wide",
          muted ? "text-product-muted/80" : "text-product-muted",
        )}
      >
        {compactLine}
      </p>
    );
  }

  return (
    <div
      className={clsx(
        "mx-auto grid max-w-md gap-1 rounded-[18px] border border-product-line/80 px-4 py-3 text-center",
        muted ? "bg-white/[0.02] opacity-70" : "bg-white/[0.045]",
      )}
    >
      <span className="font-mono text-[10px] font-black uppercase tracking-wider text-product-green">
        {GAS_NETWORK}
      </span>
      <strong className="text-sm text-product-text">{GAS_FEE}</strong>
      <p className="font-mono text-[10px] uppercase tracking-wide text-product-muted">
        Network · Gas
      </p>
      <p className="text-[11px] leading-relaxed text-product-muted">{copy.detail}</p>
    </div>
  );
}
