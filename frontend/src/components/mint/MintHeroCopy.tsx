interface MintHeroCopyProps {
  subtitle?: string;
}

export function MintHeroCopy({ subtitle }: MintHeroCopyProps) {
  return (
    <div className="max-w-lg space-y-2 text-center">
      <h1 className="font-sans text-[22px] font-bold text-white md:text-3xl">
        Mint your autonomous Panda
      </h1>
      <p className="text-[13px] text-neutral-400">
        {subtitle ??
          "A tiny agent identity for Sui market training. Personality is set on-chain at mint."}
      </p>
    </div>
  );
}
