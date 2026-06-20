"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { ArrowRight, CircleDot, ShieldCheck, Vault } from "lucide-react";
import { PandaHeroPortrait } from "@/components/panda/PandaHeroPortrait";
import { PANDA_HERO_ARCHETYPES, type PandaArchetype } from "@/lib/landing/landingContent";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

function toneClasses(tone: PandaArchetype["tone"]) {
  switch (tone) {
    case "bold":
      return {
        accent: "from-product-gold via-product-green to-product-gold",
        glow: "shadow-[0_0_52px_rgba(225,186,92,0.24)]",
        text: "text-product-gold",
        chip: "border-product-gold/35 bg-product-gold/10 text-[#f3dda6]",
      };
    case "patient":
      return {
        accent: "from-product-blue via-product-green to-product-blue",
        glow: "shadow-[0_0_56px_rgba(117,215,255,0.2)]",
        text: "text-product-blue",
        chip: "border-product-blue/30 bg-product-blue/10 text-[#bceeff]",
      };
    case "contrarian":
      return {
        accent: "from-product-red via-product-gold to-product-green",
        glow: "shadow-[0_0_58px_rgba(255,95,86,0.16)]",
        text: "text-product-red",
        chip: "border-product-red/30 bg-product-red/10 text-[#ffc9c5]",
      };
    default:
      return {
        accent: "from-product-green via-product-gold to-product-green",
        glow: "shadow-[0_0_52px_rgba(109,255,144,0.2)]",
        text: "text-product-green",
        chip: "border-product-green/30 bg-product-green/10 text-[#c8ffd6]",
      };
  }
}

export function PandaSpotlightCarousel() {
  const reducedMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [hasManualSelection, setHasManualSelection] = useState(false);
  const activePanda = PANDA_HERO_ARCHETYPES[activeIndex] ?? PANDA_HERO_ARCHETYPES[0];
  const tone = useMemo(() => toneClasses(activePanda.tone), [activePanda.tone]);
  const shouldRotate = !reducedMotion && !isPaused && !hasManualSelection;

  useEffect(() => {
    if (!shouldRotate) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % PANDA_HERO_ARCHETYPES.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [shouldRotate]);

  return (
    <section
      aria-label="Panda agent archetype carousel"
      className={clsx(
        "hero-spotlight-card min-h-[620px] p-4 sm:p-6 lg:min-h-[690px] lg:p-8",
        tone.glow,
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
        <div className="hero-spotlight-grid" />
        <div className="hero-spotlight-vignette" />
        <div className="hero-spotlight-rim" />
        <div className="hero-spotlight-corner hero-spotlight-corner--tl" />
        <div className="hero-spotlight-corner hero-spotlight-corner--tr" />
        <div className="hero-spotlight-corner hero-spotlight-corner--bl" />
        <div className="hero-spotlight-corner hero-spotlight-corner--br" />
        <div className="absolute inset-x-10 top-[4.5rem] h-px bg-gradient-to-r from-transparent via-product-green/30 to-transparent" />
        <div className="absolute -right-24 top-12 h-80 w-80 rounded-full bg-product-gold/12 blur-3xl" />
        <div className="absolute -left-20 bottom-12 h-72 w-72 rounded-full bg-product-green/10 blur-3xl" />
        <div className="absolute left-1/2 top-[38%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-product-green/[0.04] blur-3xl" />
      </div>

      <div className="relative z-10 flex h-full min-h-[560px] flex-col justify-between gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <SceneNode label="DeepBook" value="market trace" />
          <SceneNode label="TradingPolicy" value="on-chain rules" emphasized />
          <SceneNode label="Evidence" value="decision trail" />
        </div>

        <div className="relative flex flex-1 items-center justify-center overflow-visible py-2">
          <div
            className={clsx(
              "absolute left-4 right-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r opacity-60",
              tone.accent,
              shouldRotate && "animate-pulse",
            )}
          />

          <div className="relative h-[min(80vw,430px)] w-[min(80vw,430px)] overflow-visible">
            <FloatingSceneTag
              animationClass={reducedMotion ? undefined : "animate-panda-tag-a"}
              className="left-[2%] top-[34%] md:left-[4%]"
              icon={<CircleDot className="h-3 w-3" />}
              label="Signal"
              tone="green"
            />
            <FloatingSceneTag
              animationClass={reducedMotion ? undefined : "animate-panda-tag-b"}
              className="right-[2%] top-[34%] md:right-[4%]"
              icon={<ArrowRight className="h-3 w-3" />}
              label="Evidence"
              tone="gold"
              trailing
            />
            <FloatingSceneTag
              animationClass={reducedMotion ? undefined : "animate-panda-tag-c"}
              className="right-[0%] top-[8%] sm:right-[2%]"
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              label="Rule ring"
              sublabel="Policy checked"
              tone="gold"
              variant="card"
            />
            <FloatingSceneTag
              animationClass={reducedMotion ? undefined : "animate-panda-tag-d"}
              className="bottom-[10%] left-[0%] sm:left-[2%]"
              icon={<Vault className="h-3.5 w-3.5" />}
              label="PandaVault"
              sublabel="Bounded action"
              tone="blue"
              variant="card"
            />

            <div className="relative grid h-full w-full place-items-center">
              <div className="absolute h-full w-full rounded-full border border-product-gold/20" />
              <div className="absolute h-[86%] w-[86%] rounded-full border border-product-green/25 shadow-[inset_0_0_28px_rgba(109,255,144,0.08)]" />

              <div className="relative h-[78%] w-[78%] overflow-hidden rounded-full border border-product-gold/35 bg-[#efece3] p-2 shadow-[0_28px_90px_rgba(0,0,0,0.54)]">
                <PandaHeroPortrait
                  archetypeId={activePanda.id}
                  priority
                  alt={`${activePanda.name} panda agent portrait`}
                  className="h-full w-full max-w-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="hero-spotlight-glass p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={clsx("font-mono text-[11px] font-extrabold uppercase tracking-wider", tone.text)}>
                  Active Panda archetype
                </p>
                <h3 className="mt-1 text-2xl font-black tracking-tight text-product-text">
                  {activePanda.name}
                </h3>
              </div>
              <span className={clsx("rounded-full border px-3 py-1 font-mono text-[10px] font-extrabold uppercase tracking-wider", tone.chip)}>
                {activePanda.tone}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-product-muted">{activePanda.tags}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PANDA_HERO_ARCHETYPES.map((panda, index) => {
              const selected = panda.id === activePanda.id;
              return (
                <button
                  type="button"
                  key={panda.id}
                  aria-pressed={selected}
                  onClick={() => {
                    setActiveIndex(index);
                    setHasManualSelection(true);
                  }}
                  className={clsx(
                    "group rounded-2xl border p-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-product-green/45",
                    selected
                      ? "border-product-green/55 bg-product-green/10 shadow-[var(--glow-green)]"
                      : "border-product-line/80 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-product-gold/35 hover:bg-white/[0.07]",
                  )}
                >
                  <div className="mx-auto h-16 w-16 overflow-hidden rounded-full bg-[#efece3] ring-1 ring-product-gold/25">
                    <PandaHeroPortrait
                      archetypeId={panda.id}
                      sizes="64px"
                      alt={`${panda.name} thumbnail`}
                      className="h-full w-full max-w-none"
                    />
                  </div>
                  <strong className="mt-2 block truncate text-center text-[11px] font-black text-product-text">
                    {panda.name}
                  </strong>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatingSceneTag({
  animationClass,
  className,
  icon,
  label,
  sublabel,
  tone,
  trailing = false,
  variant = "chip",
}: {
  animationClass?: string;
  className?: string;
  icon: ReactNode;
  label: string;
  sublabel?: string;
  tone: "green" | "gold" | "blue";
  trailing?: boolean;
  variant?: "chip" | "card";
}) {
  const toneStyle = {
    green: {
      border: "border-product-green/30",
      text: "text-product-green",
    },
    gold: {
      border: "border-product-gold/30",
      text: "text-product-gold",
    },
    blue: {
      border: "border-product-blue/30",
      text: "text-product-blue",
    },
  }[tone];

  if (variant === "card") {
    return (
      <div
        className={clsx(
          "absolute z-20 hidden rounded-2xl border bg-black/55 px-3 py-2 text-left shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur sm:block",
          toneStyle.border,
          animationClass,
          className,
        )}
      >
        <div
          className={clsx(
            "flex items-center gap-2 font-mono text-[10px] font-extrabold uppercase tracking-wider",
            toneStyle.text,
          )}
        >
          {icon}
          {label}
        </div>
        {sublabel ? <p className="mt-1 text-[11px] text-product-muted">{sublabel}</p> : null}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "absolute z-20 hidden items-center gap-2 rounded-full border bg-black/45 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider shadow-[0_10px_28px_rgba(0,0,0,0.28)] backdrop-blur md:flex",
        toneStyle.border,
        toneStyle.text,
        animationClass,
        className,
      )}
    >
      {!trailing ? icon : null}
      {label}
      {trailing ? icon : null}
    </div>
  );
}

function SceneNode({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={clsx(
        "hero-spotlight-glass px-3 py-2",
        emphasized && "hero-spotlight-glass--emphasis",
      )}
    >
      <p className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-product-muted">
        {label}
      </p>
      <p className="mt-1 truncate text-[12px] font-bold text-product-text">{value}</p>
    </div>
  );
}
