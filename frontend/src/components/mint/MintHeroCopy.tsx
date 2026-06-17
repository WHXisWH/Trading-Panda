interface MintHeroCopyProps {
  subtitle?: string;
}

export function MintHeroCopy({ subtitle }: MintHeroCopyProps) {
  return (
    <div className="mint-hero-copy max-w-3xl space-y-3 text-center">
      <h1 className="font-display text-[clamp(2.5rem,6.4vw,4.75rem)] font-bold leading-[0.86] tracking-[-0.08em] text-product-text">
        Mint your autonomous Panda
      </h1>
      <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-[#c6c8b9] md:text-base">
        {subtitle ??
          "A tiny agent identity for Sui market training. Personality is sealed on-chain at mint."}
      </p>
    </div>
  );
}
