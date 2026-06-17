interface MintHeroCopyProps {
  subtitle?: string;
}

export function MintHeroCopy({ subtitle }: MintHeroCopyProps) {
  return (
    <div className="mint-hero-copy w-full space-y-1.5 text-center">
      <h1 className="font-display text-[clamp(1.65rem,4.8vw,3.25rem)] font-bold leading-[0.9] tracking-[-0.06em] text-product-text">
        Mint your autonomous Panda
      </h1>
      <p className="mx-auto max-w-xl text-[13px] leading-snug text-[#c6c8b9] md:text-sm">
        {subtitle ??
          "A tiny agent identity for Sui market training. Personality is sealed on-chain at mint."}
      </p>
    </div>
  );
}
