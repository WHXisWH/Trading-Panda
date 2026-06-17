import { clsx } from "clsx";

interface GasFeeHintProps {
  muted?: boolean;
}

export function GasFeeHint({ muted = false }: GasFeeHintProps) {
  return (
    <div
      className={clsx(
        "mx-auto grid max-w-md gap-1 rounded-[18px] border border-product-line/80 px-4 py-3 text-center",
        muted ? "bg-white/[0.02] opacity-70" : "bg-white/[0.045]",
      )}
    >
      <span className="font-mono text-[10px] font-black uppercase tracking-wider text-product-green">
        Network · Gas
      </span>
      <strong className="text-sm text-product-text">~0.01 SUI · Sui Testnet</strong>
      <p className="text-[11px] leading-relaxed text-product-muted">
        Minting a Panda does not give it trading permission yet.
      </p>
    </div>
  );
}
