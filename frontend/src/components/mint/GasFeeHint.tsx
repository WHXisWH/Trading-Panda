interface GasFeeHintProps {
  muted?: boolean;
}

export function GasFeeHint({ muted = false }: GasFeeHintProps) {
  return (
    <div
      className={
        muted
          ? "space-y-1 text-center text-[11px] text-neutral-500"
          : "space-y-1 text-center text-[11px] text-neutral-400"
      }
    >
      <p>Gas estimate: ~0.01 SUI · Sui Testnet</p>
      <p className="text-neutral-500">
        Minting a Panda does not give it trading permission yet.
      </p>
    </div>
  );
}
