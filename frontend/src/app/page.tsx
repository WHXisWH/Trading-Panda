"use client";

import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import type { Panda } from "@/types";

const SYSTEM_TILES = [
  {
    label: "Market source",
    value: "DeepBook mainnet",
    note: "Real market training — not testnet liquidity.",
    tone: "good" as const,
  },
  {
    label: "Sui core",
    value: "Objects + PTB",
    note: "PandaVault / TradingPolicy / demo executor.",
    tone: "gold" as const,
  },
  {
    label: "Execution truth",
    value: "Training Ledger",
    note: "Paper ledger PnL; Trade Facts keep evidence.",
    tone: "default" as const,
  },
  {
    label: "Autonomy proof",
    value: "Agent Signer",
    note: "Selected Chain Proof Moments on testnet.",
    tone: "good" as const,
  },
];

const JOURNEYS = [
  {
    id: "J0",
    page: "Mint",
    title: "Connect And Understand",
    desc: "Confirm the Panda only acts inside PandaVault and TradingPolicy — never your whole wallet.",
    bullets: ["Connect wallet / zkLogin", "Explain bounded agent wallet"],
    href: "/mint",
  },
  {
    id: "J1",
    page: "Mint",
    title: "Mint Panda Identity",
    desc: "Sign to mint a Panda NFT with immutable on-chain personality and agent identity.",
    bullets: ["User signs Sui transaction", "Backend registers Panda"],
    href: "/mint",
  },
  {
    id: "J2",
    page: "Wallet",
    title: "Create Agent Wallet",
    desc: "Create PandaVault and TradingPolicy — bounded vault plus risk collar.",
    bullets: ["Shared PandaVault", "Standalone TradingPolicy"],
    href: "/agent-wallet",
    needsPanda: false,
  },
  {
    id: "J3",
    page: "Strategy",
    title: "Feed Strategy Rules",
    desc: "Teach trading style inside policy boundaries; strategy never expands permissions.",
    bullets: ["Template + rule blocks", "Policy compatibility preview"],
    href: "/strategy",
    needsPanda: true,
  },
  {
    id: "J4",
    page: "Training",
    title: "Train On Real Markets",
    desc: "Watch DeepBook ticks drive decisions, paper execution, and Trade Facts.",
    bullets: ["market:tick consumption", "OrderIntent → Trade Fact"],
    href: "/training-ledger",
    needsPanda: true,
  },
  {
    id: "J5",
    page: "Proof",
    title: "Chain Proof Moment",
    desc: "Prove selected actions with testnet PandaCoin PTB without rolling back ledger PnL.",
    bullets: ["Manual or auto eligibility", "Idempotent proof jobs"],
    href: "/chain-proof",
    needsPanda: true,
  },
  {
    id: "J6",
    page: "Review",
    title: "Review And Learn",
    desc: "Turn closed trades into evidence-backed reviews and optional Skill Memory.",
    bullets: ["Hypothesis lifecycle", "No vibe-based learning"],
    href: "/review",
    needsPanda: true,
  },
  {
    id: "J7",
    page: "Safety",
    title: "Pause Or Tighten Risk",
    desc: "Owner controls block both Training Ledger execution and chain proof paths.",
    bullets: ["Pause / revoke / tighten", "Mirror sync from chain"],
    href: "/safety",
    needsPanda: true,
  },
];

function tileToneClass(tone: "good" | "gold" | "default") {
  if (tone === "good") return "border-product-green/25 bg-product-green/[0.06]";
  if (tone === "gold") return "border-product-gold/30 bg-product-gold/[0.08]";
  return "border-product-line bg-white/[0.03]";
}

export default function LandingPage() {
  const { jwt } = useAuth();

  const { data: pandas } = useQuery<Panda[]>({
    queryKey: ["pandas", jwt],
    enabled: !!jwt,
    queryFn: () =>
      fetch("/api/pandas", { headers: { Authorization: `Bearer ${jwt}` } }).then((r) => r.json()),
  });

  const pandaId = pandas?.[0]?.id;

  const resolveHref = (j: (typeof JOURNEYS)[number]) => {
    if (!j.needsPanda || !pandaId) {
      if (j.href === "/agent-wallet" && pandaId) return `${j.href}?panda=${pandaId}`;
      return j.href;
    }
    if (j.href === "/chain-proof" || j.href === "/review") {
      return `${j.href}?panda=${pandaId}`;
    }
    if (j.href === "/safety") return `${j.href}/${pandaId}`;
    return `${j.href}/${pandaId}`;
  };

  return (
    <PageContainer variant="wide" className="pb-16 pt-2">
      <section className="mb-8 grid items-end gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <div>
          <div className="product-eyebrow">Cyber Panda Agent Wallet OS</div>
          <h1 className="mt-4 max-w-4xl font-display text-[clamp(2.25rem,6vw,4.5rem)] font-bold leading-[0.9] tracking-[-0.06em] text-product-text">
            Train a Move-constrained autonomous trading Panda.
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-[#c6c8b9]">
            The control room for J0–J8: mint identity, create bounded wallet, feed strategy, train on
            real DeepBook data, prove selected actions on-chain, review outcomes, and tighten risk.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/mint">
              <Button size="lg">Start with Mint</Button>
            </Link>
            {pandaId ? (
              <Link href={`/training-ledger/${pandaId}`}>
                <Button size="lg" variant="ghost">
                  Open Training Ledger
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        <aside className="product-panel p-5">
          <h2 className="text-lg font-bold tracking-tight text-product-text">Agent Wallet Thesis</h2>
          <p className="mt-2 text-sm leading-relaxed text-product-muted">
            The user is training a Move-constrained autonomous trading wallet.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              "Panda NFT = agent identity",
              "TradingPolicy = risk collar",
              "PandaVault = bounded account",
              "Chain Proof = selected PTB proof",
            ].map((pill) => (
              <span key={pill} className="product-chip w-full justify-center rounded-2xl px-3 py-2.5 text-[11px]">
                {pill}
              </span>
            ))}
          </div>
        </aside>
      </section>

      <section className="mb-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SYSTEM_TILES.map((tile) => (
          <div
            key={tile.label}
            className={clsx("product-panel flex flex-col gap-1 p-4", tileToneClass(tile.tone))}
          >
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-product-muted">
              {tile.label}
            </span>
            <strong className="text-base font-bold tracking-tight text-product-text">{tile.value}</strong>
            <em className="text-[12px] not-italic leading-snug text-product-muted">{tile.note}</em>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-product-text">All user journeys</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-product-muted">
              Each card answers one user question and links to the live product route.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {JOURNEYS.map((j) => (
            <article key={j.id} className="product-panel flex min-h-[240px] flex-col gap-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-[17px] bg-gradient-to-br from-product-gold to-[#fff0a8] font-mono text-[13px] font-black text-[#071108] shadow-[var(--glow-gold)]">
                  {j.id}
                </span>
                <span className="rounded-full border border-product-green/25 bg-product-green/[0.08] px-2.5 py-1 font-mono text-[10px] font-extrabold uppercase tracking-wider text-product-green">
                  {j.page}
                </span>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-product-text">{j.title}</h3>
              <p className="flex-1 text-sm leading-relaxed text-product-muted">{j.desc}</p>
              <ul className="grid gap-1.5">
                {j.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-center gap-2 font-mono text-[11px] font-bold text-[#c5c1ad]"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-product-gold shadow-[0_0_14px_rgba(225,186,92,0.6)]" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link href={resolveHref(j)} className="mt-auto w-fit">
                <Button variant="ghost" size="sm">
                  Enter {j.page} journey
                </Button>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 product-panel flex flex-col items-center gap-4 p-8 text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-product-green/20 blur-3xl" />
          <Image
            src="/assets/ui-logo.png"
            alt="TradingPanda"
            width={96}
            height={96}
            className="relative h-24 w-24"
          />
        </div>
        <h2 className="text-2xl font-bold text-product-text">Ready to raise your trading Panda?</h2>
        <p className="max-w-md text-sm text-product-muted">
          Mint your first Panda in under a minute. Gas is ~0.03 SUI on Testnet.
        </p>
        <Link href="/mint">
          <Button size="lg">Get started</Button>
        </Link>
      </section>

      <footer className="mt-10 border-t border-product-line/50 pt-8 text-center text-xs text-product-muted">
        <p>TradingPanda · Sui Testnet · Training Ledger paper execution · Sui Overflow 2026</p>
      </footer>
    </PageContainer>
  );
}
