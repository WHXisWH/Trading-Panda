import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Pause,
  ShieldCheck,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import {
  HERO_COPY,
  SUI_NATIVE_COPY,
  SUI_NATIVE_EVIDENCE_CHAIN,
  WHY_COPY,
} from "@/lib/landing/landingContent";
import { PandaSpotlightCarousel } from "./PandaSpotlightCarousel";
import { WhyContrastDemo } from "./WhyContrastDemo";
import { WhyNarrative } from "./WhyNarrative";
import { HowItWorksInteractive } from "./HowItWorksInteractive";
import { SuiNativeInteractive } from "./SuiNativeInteractive";
import { TrainingLoopCircular } from "./TrainingLoopCircular";

export function LandingHero() {
  return (
    <section
      id="hero"
      className="grid min-h-[calc(100dvh-120px)] items-center gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(400px,0.9fr)] lg:gap-12 lg:py-10 xl:gap-16"
    >
      <div className="relative z-10 min-w-0 lg:max-w-[54rem]">
        <div className="product-eyebrow">{HERO_COPY.eyebrow}</div>
        <h1 className="mt-5 max-w-[16ch] text-balance font-display text-[clamp(2.5rem,5.4vw,5.5rem)] font-black leading-[0.9] tracking-normal text-product-text sm:max-w-none">
          {HERO_COPY.title}
        </h1>
        <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-[#d2d5c8] sm:text-[19px]">
          {HERO_COPY.subtitle}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/mint">
            <Button size="lg">{HERO_COPY.primaryCta}</Button>
          </Link>
          <Link href="#how-it-works">
            <Button size="lg" variant="ghost">
              {HERO_COPY.secondaryCta}
            </Button>
          </Link>
        </div>
        <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
          {[
            "Move-enforced policy",
            "DeepBook market data",
            "Evidence-backed learning",
          ].map((item) => (
            <div key={item} className="product-form-surface px-3 py-2">
              <span className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-product-muted">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-0 min-w-0">
        <PandaSpotlightCarousel />
      </div>
    </section>
  );
}

export function WhySection() {
  return (
    <section id="why" className="relative scroll-mt-24 py-10 sm:py-14">
      <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full bg-gradient-to-r from-transparent via-product-line/80 to-transparent" />
      <div className="relative">
        <div className="product-eyebrow">{WHY_COPY.eyebrow}</div>
        <div className="mt-8 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <WhyNarrative />
          <WhyContrastDemo />
        </div>
        <div className="mt-10 flex justify-center">
          <Link href="/mint">
            <Button size="lg" className="gap-2">
              {WHY_COPY.cta}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <LandingSection
      id="how-it-works"
      eyebrow="How it works"
      title="From minted identity to trained instinct."
    >
      <HowItWorksInteractive />
    </LandingSection>
  );
}

export function SuiNativeSection() {
  return (
    <LandingSection
      id="sui-native"
      eyebrow={SUI_NATIVE_COPY.eyebrow}
      title={SUI_NATIVE_COPY.title}
      description={SUI_NATIVE_COPY.description}
    >
      <SuiNativeInteractive />

      <div className="mt-8 flex flex-wrap gap-2">
        {SUI_NATIVE_COPY.chips.map((chip) => (
          <span
            key={chip}
            className="product-chip border-product-line bg-black/25 text-product-muted"
          >
            {chip}
          </span>
        ))}
      </div>

      <div className="product-panel mt-5 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-product-muted">
          <CheckCircle2 className="h-4 w-4 text-product-green" />
          {SUI_NATIVE_EVIDENCE_CHAIN.eyebrow}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-3">
          {SUI_NATIVE_EVIDENCE_CHAIN.steps.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-product-line bg-black/30 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-product-text sm:text-[11px]">
                {step}
              </span>
              {index < SUI_NATIVE_EVIDENCE_CHAIN.steps.length - 1 ? (
                <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-product-muted sm:block" />
              ) : null}
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-product-muted sm:text-sm">
          {SUI_NATIVE_EVIDENCE_CHAIN.footnote}
        </p>
      </div>
    </LandingSection>
  );
}

export function TrainingLoopSection() {
  return (
    <LandingSection
      id="training-loop"
      eyebrow="Training loop"
      title="A learning loop, not a signal button."
      description="TradingPanda is designed around a closed loop: the Panda watches markets, forms an intent, passes policy checks, acts inside the vault, records the outcome, and learns only from reviewed evidence."
    >
      <TrainingLoopCircular />
    </LandingSection>
  );
}

const SAFETY_GLASS_TEXTURE = (
  <>
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_0%,rgba(109,255,144,0.06)_0%,transparent_42%),radial-gradient(ellipse_at_88%_100%,rgba(225,186,92,0.05)_0%,transparent_38%),radial-gradient(ellipse_at_50%_100%,rgba(0,0,0,0.5)_0%,transparent_58%)]" />
    <div className="pointer-events-none absolute inset-0 opacity-[0.024] [background-image:linear-gradient(to_right,rgba(225,186,92,0.45)_1px,transparent_1px),linear-gradient(to_bottom,rgba(109,255,144,0.22)_1px,transparent_1px)] [background-size:24px_24px]" />
  </>
);

function safetyGlassShadow(ambient: "green" | "gold" | "red") {
  const glow =
    ambient === "red"
      ? "0 0 64px rgba(255,95,86,0.07)"
      : ambient === "gold"
        ? "0 0 64px rgba(225,186,92,0.08)"
        : "0 0 64px rgba(109,255,144,0.06)";

  return `0 24px 56px rgba(0,0,0,0.48), inset 0 1px 0 rgba(225,186,92,0.09), ${glow}`;
}

function SafetyGlassPanel({
  children,
  ambient = "green",
}: {
  children: ReactNode;
  ambient?: "green" | "gold" | "red";
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[2rem] bg-black/30 p-5 backdrop-blur-xl sm:p-6"
      style={{ boxShadow: safetyGlassShadow(ambient) }}
    >
      {SAFETY_GLASS_TEXTURE}
      <div className="relative">{children}</div>
    </div>
  );
}

const SAFETY_CONTROL_ACTIONS = [
  {
    title: "Pause",
    body: "Stop new trades immediately.",
    Icon: Pause,
    tone: "danger" as const,
  },
  {
    title: "Tighten",
    body: "Reduce pairs, size, or loss caps.",
    Icon: SlidersHorizontal,
    tone: "gold" as const,
  },
  {
    title: "Revoke",
    body: "Remove agent authorization.",
    Icon: XCircle,
    tone: "danger" as const,
    emphasis: true,
  },
  {
    title: "Withdraw",
    body: "Move available vault funds back to your wallet.",
    Icon: ExternalLink,
    tone: "gold" as const,
  },
] as const;

const SAFETY_CONTROL_STACK = [
  {
    label: "Panda agent",
    value: "acts autonomously",
    dotClass: "bg-product-green shadow-[0_0_12px_rgba(109,255,144,0.55)]",
    valueClass: "text-product-green",
  },
  {
    label: "TradingPolicy",
    value: "allows or blocks",
    dotClass: "bg-product-gold shadow-[0_0_12px_rgba(225,186,92,0.45)]",
    valueClass: "text-product-gold",
  },
  {
    label: "PandaVault",
    value: "holds available funds",
    dotClass: "bg-product-gold/80 shadow-[0_0_12px_rgba(225,186,92,0.35)]",
    valueClass: "text-product-text",
  },
] as const;

function SafetyControlActionTile({
  title,
  body,
  Icon,
  tone,
  emphasis = false,
}: (typeof SAFETY_CONTROL_ACTIONS)[number] & { emphasis?: boolean }) {
  const isDanger = tone === "danger";

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl p-4",
        "shadow-[inset_0_2px_14px_rgba(0,0,0,0.52)]",
        isDanger
          ? "bg-[linear-gradient(155deg,rgba(255,95,86,0.1),rgba(8,10,8,0.72))]"
          : "bg-[linear-gradient(155deg,rgba(225,186,92,0.08),rgba(8,10,8,0.72))]",
        emphasis &&
          "shadow-[inset_0_2px_14px_rgba(0,0,0,0.52),0_0_36px_rgba(255,95,86,0.14)]",
      )}
    >
      <div
        className={clsx(
          "pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl",
          isDanger ? "bg-product-red/25" : "bg-product-gold/20",
        )}
      />
      <div className="relative flex items-center gap-2.5">
        <div
          className={clsx(
            "flex h-9 w-9 items-center justify-center rounded-xl bg-black/45",
            "shadow-[inset_0_2px_10px_rgba(0,0,0,0.58)]",
            isDanger
              ? "shadow-[inset_0_2px_10px_rgba(0,0,0,0.58),0_0_14px_rgba(255,95,86,0.16)]"
              : "shadow-[inset_0_2px_10px_rgba(0,0,0,0.58),0_0_12px_rgba(225,186,92,0.12)]",
          )}
        >
          <Icon
            className={clsx(
              "h-4 w-4",
              isDanger ? "text-product-red" : "text-product-gold",
            )}
          />
        </div>
        <strong
          className={clsx(
            "text-sm",
            isDanger ? "text-product-red" : "text-product-gold",
          )}
        >
          {title}
        </strong>
      </div>
      <p className="relative mt-3 text-xs leading-relaxed text-product-muted">
        {body}
      </p>
    </div>
  );
}

function SafetyStatePill({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "red";
}) {
  const isRed = tone === "red";

  return (
    <span
      className={clsx(
        "rounded-full px-3 py-1 text-sm font-semibold shadow-[inset_0_2px_8px_rgba(0,0,0,0.38)]",
        isRed
          ? "bg-product-red/12 text-product-red"
          : "bg-product-green/12 text-product-green",
      )}
    >
      {label}
    </span>
  );
}

function SafetyStackRow({
  label,
  value,
  dotClass,
  valueClass,
  isLast,
}: (typeof SAFETY_CONTROL_STACK)[number] & { isLast: boolean }) {
  return (
    <div className="relative flex gap-3">
      <div className="flex w-4 shrink-0 flex-col items-center">
        <span className={clsx("mt-2 block h-2 w-2 rounded-full", dotClass)} />
        {!isLast ? (
          <span className="my-1.5 w-px flex-1 bg-gradient-to-b from-product-gold/35 via-product-green/20 to-transparent" />
        ) : null}
      </div>
      <div
        className={clsx(
          "min-w-0 flex-1 rounded-xl bg-black/22 px-3 py-2.5",
          "shadow-[inset_0_2px_10px_rgba(0,0,0,0.42)]",
          !isLast && "mb-2.5",
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <strong className="text-sm text-product-text">{label}</strong>
          <span className={clsx("text-xs font-semibold", valueClass)}>{value}</span>
        </div>
      </div>
    </div>
  );
}

export function SafetySection() {
  return (
    <LandingSection
      id="safety"
      eyebrow="Control the Panda"
      title="You can pause it, tighten it, revoke it, or withdraw available vault funds."
      description="Safety is about ownership, not promises. The Panda may act on its own, but only inside the rules you signed and the control panel you keep."
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.85fr)]">
        <SafetyGlassPanel ambient="red">
          <div className="grid gap-3 sm:grid-cols-2">
            {SAFETY_CONTROL_ACTIONS.map((action) => (
              <SafetyControlActionTile key={action.title} {...action} />
            ))}
          </div>

          <div className="mt-6 pt-5 shadow-[inset_0_1px_0_rgba(225,186,92,0.07)]">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-product-muted">
              <ShieldCheck className="h-4 w-4 text-product-green" />
              State transition
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
              <SafetyStatePill label="Authorized" tone="green" />
              <ArrowRight className="h-4 w-4 text-product-muted/70" />
              <SafetyStatePill label="Paused / Revoked" tone="red" />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-product-muted">
              The control state changes with your signature, not the Panda&apos;s
              mood.
            </p>
          </div>
        </SafetyGlassPanel>

        <SafetyGlassPanel ambient="gold">
          <div className="flex items-center justify-between gap-3">
            <p className="product-eyebrow">Owner control panel</p>
            <span className="rounded-full bg-product-green/10 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-product-green shadow-[inset_0_1px_0_rgba(109,255,144,0.12),0_0_18px_rgba(109,255,144,0.08)]">
              Live controls
            </span>
          </div>

          <div className="mt-5">
            {SAFETY_CONTROL_STACK.map((row, index) => (
              <SafetyStackRow
                key={row.label}
                {...row}
                isLast={index === SAFETY_CONTROL_STACK.length - 1}
              />
            ))}
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl bg-[linear-gradient(155deg,rgba(255,95,86,0.12),rgba(8,10,8,0.78))] p-4 shadow-[inset_0_2px_14px_rgba(0,0,0,0.48),0_0_28px_rgba(255,95,86,0.1)]">
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-product-red">
              blocked state
            </span>
            <p className="mt-2 text-sm leading-relaxed text-product-muted">
              Once paused or revoked, new trades stop until you sign a new
              control action.
            </p>
          </div>
        </SafetyGlassPanel>
      </div>
    </LandingSection>
  );
}

export function FinalCtaSection() {
  return (
    <section id="cta" className="py-10">
      <div className="product-panel flex flex-col items-center gap-5 p-8 text-center sm:p-10">
        <div className="h-20 w-20 bg-[url('/assets/ui-logo.png')] bg-contain bg-center bg-no-repeat drop-shadow-[0_0_24px_rgba(109,255,144,0.22)]" />
        <div>
          <h2 className="text-3xl font-black tracking-tight text-product-text">
            Ready to train your first Panda agent?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-product-muted">
            Mint the identity, set the rules, and start building a wallet that
            learns under your control.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/mint">
            <Button size="lg">Mint your Panda</Button>
          </Link>
          <Link href="/profile">
            <Button size="lg" variant="ghost">
              Open the app
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function LandingSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-10 sm:py-14">
      <div className="mb-6 max-w-3xl">
        <div className="product-eyebrow">{eyebrow}</div>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-product-text sm:text-5xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-4 text-base leading-relaxed text-product-muted">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
