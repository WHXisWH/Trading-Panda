"use client";
import Link from "next/link";
import Image from "next/image";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Dice5,
  Brain,
  TrendingUp,
  GitBranch,
  Sparkles,
  BarChart3,
  ArrowRight,
  Shield,
  Zap,
  ChevronRight,
} from "lucide-react";
import type { Panda } from "@/types";

const FEATURES = [
  {
    icon: Dice5,
    title: "On-chain Personality",
    desc: "Five personality axes permanently minted by sui::random. Every panda is provably unique and immutable.",
  },
  {
    icon: Brain,
    title: "Strategy Engine",
    desc: "Feed your panda trading rules with a visual builder or natural language. It trades autonomously.",
  },
  {
    icon: TrendingUp,
    title: "Verifiable Growth",
    desc: "Every 50 trades produce a Merkle Root on Sui. Your panda's track record is on-chain and auditable.",
  },
  {
    icon: GitBranch,
    title: "Strategy Memory",
    desc: "Old strategies decay through ghost weight, giving your panda realistic behavioral memory and adaptation.",
  },
];

const STEPS = [
  {
    step: "01",
    icon: Sparkles,
    title: "Mint Your Panda",
    desc: "Connect your wallet and mint a panda with unique on-chain personality. Gas is just ~0.03 SUI on Testnet.",
  },
  {
    step: "02",
    icon: BarChart3,
    title: "Teach It to Trade",
    desc: "Build trading strategies with visual blocks — pick indicators like RSI, MACD, or moving averages, set entry and exit rules.",
  },
  {
    step: "03",
    icon: Zap,
    title: "Watch It Grow",
    desc: "Your panda trains on the Training Ledger with real DeepBook market data. Track P&L, watch emotions evolve, and level up through experience.",
  },
];

export default function LandingPage() {
  const account = useCurrentAccount();
  const { jwt } = useAuth();

  const { data: pandas } = useQuery<Panda[]>({
    queryKey: ["pandas", jwt],
    enabled: !!jwt,
    queryFn: () =>
      fetch("/api/pandas", { headers: { Authorization: `Bearer ${jwt}` } }).then(
        (r) => r.json()
      ),
  });

  const hasPandas = pandas && pandas.length > 0;

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-white">
        {/* Background decoration */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          {/* Main gradient (brand-tinted, token-driven) */}
          <div className="absolute inset-0 bg-hero" />
          {/* Decorative grid lines */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(#0f973d 1px, transparent 1px), linear-gradient(90deg, #0f973d 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <PageContainer className="flex min-h-[calc(100dvh-var(--navbar-height))] flex-col items-center justify-center gap-6 py-20 lg:flex-row lg:gap-16 lg:text-left">
          {/* Left: Text + CTA */}
          <div className="flex max-w-xl flex-col items-center gap-6 text-center lg:items-start lg:text-left">
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600">
              <Shield className="h-3 w-3" />
              Live on Sui Testnet
            </span>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
                Raise an AI panda
                <br />
                <span className="text-primary-500">that trades for you</span>
              </h1>
              <p className="max-w-md text-base leading-relaxed text-neutral-500 sm:text-lg">
                Mint your panda NFT with on-chain personality. Teach it trading
                strategies. Watch it grow through autonomous simulated trading —
                every decision verifiable on Sui.
              </p>
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              {account && jwt ? (
                <>
                  <Link href="/mint">
                    <Button size="lg" className="shadow-lg shadow-primary-500/25">
                      Mint a Panda
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                  {hasPandas && (
                    <Link href={`/dashboard/${pandas[0].id}`}>
                      <Button size="lg" variant="outline">
                        Go to Dashboard
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <Link href="/mint">
                    <Button size="lg" className="shadow-lg shadow-primary-500/25">
                      Get Started
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                  <p className="text-xs text-neutral-400">
                    Connect your wallet to mint your first panda
                  </p>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-6 border-t border-neutral-100 pt-6">
              {[
                { value: "On-chain", label: "Personality" },
                { value: "8-step", label: "Decision Pipeline" },
                { value: "7-state", label: "Emotion System" },
                { value: "~0.03 SUI", label: "Mint Gas" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div className="text-lg font-bold text-neutral-900">{value}</div>
                  <div className="text-xs text-neutral-400">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Panda illustration */}
          <div className="relative flex shrink-0 items-center justify-center">
            {/* Glow behind logo */}
            <div
              className="absolute h-48 w-48 rounded-full blur-3xl"
              style={{ backgroundColor: "#0f973d15" }}
            />
            {/* Logo card */}
            <div className="lift relative rounded-3xl border border-neutral-200 bg-brand-soft p-10 shadow-lg">
              <Image
                src="/assets/ui-logo.svg"
                alt="TradingPanda"
                width={160}
                height={160}
                className="h-40 w-40"
                priority
              />
            </div>
          </div>
        </PageContainer>
      </section>

      {/* ── How it Works ── */}
      <section className="border-t border-neutral-100 bg-neutral-50/50">
        <PageContainer className="py-20">
          <div className="mx-auto mb-14 max-w-lg text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary-500">
              How it Works
            </span>
            <h2 className="mt-3 text-2xl font-bold text-neutral-900 sm:text-3xl">
              From wallet to trading panda in minutes
            </h2>
          </div>

          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
            {STEPS.map(({ step, icon: Icon, title, desc }, i) => (
              <div key={step} className="group relative">
                {/* Connector line (desktop) */}
                {i < STEPS.length - 1 && (
                  <div className="absolute left-full top-10 hidden h-px w-8 bg-neutral-200 md:block lg:w-16" />
                )}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lg shadow-primary-500/25 ring-4 ring-primary-50 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="mb-2 text-xs font-bold tracking-widest text-primary-400">
                    {step}
                  </span>
                  <h3 className="mb-2 font-semibold text-neutral-900">{title}</h3>
                  <p className="text-sm leading-relaxed text-neutral-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ── Features ── */}
      <section className="border-t border-neutral-100 bg-white">
        <PageContainer className="py-20">
          <div className="mx-auto mb-14 max-w-lg text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary-500">
              Why TradingPanda
            </span>
            <h2 className="mt-3 text-2xl font-bold text-neutral-900 sm:text-3xl">
              Built different from the ground up
            </h2>
            <p className="mt-3 text-sm text-neutral-500">
              Part trading bot, part digital pet — every aspect is verifiable on-chain.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <Card
                key={title}
                variant="default"
                className="lift group relative space-y-3 overflow-hidden hover:border-neutral-300"
              >
                {/* Brand accent bar at top */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-brand" />
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-neutral-900">{title}</h3>
                <p className="text-sm leading-relaxed text-neutral-500">{desc}</p>
              </Card>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ── CTA Banner ── */}
      <section className="border-t border-neutral-100 bg-dark-panel">
        <PageContainer className="py-16 text-center">
          <div className="mx-auto max-w-lg space-y-5">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to raise your trading panda?
            </h2>
            <p className="text-neutral-400">
              Mint your first panda in under a minute. Gas is just ~0.03 SUI on Testnet.
            </p>
            <Link
              href="/mint"
              className="group inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 text-sm font-semibold text-neutral-900 shadow-lg shadow-black/20 transition-all hover:scale-105 hover:shadow-xl active:scale-100"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </PageContainer>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-neutral-800 bg-dark-panel">
        <div className="mx-auto flex max-w-page flex-col items-center gap-4 px-6 py-8 text-center text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <Image
              src="/assets/ui-logo.svg"
              alt=""
              width={18}
              height={18}
              className="h-4.5 w-4.5 opacity-50"
            />
            <span className="text-neutral-400">TradingPanda</span>
          </div>
          <p>
            Sui Testnet · Simulated trading, not real orders · Built for Sui Overflow 2026
          </p>
        </div>
      </footer>
    </>
  );
}
