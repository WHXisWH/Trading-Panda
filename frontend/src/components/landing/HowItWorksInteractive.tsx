"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as RadixSlider from "@radix-ui/react-slider";
import {
  Sparkles,
  SlidersHorizontal,
  Radar,
  Activity,
  Eye,
  Brain,
  ShieldCheck,
  Lock,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";
import { HOW_STEPS } from "@/lib/landing/landingContent";
import { PandaCanvasRenderer } from "@/components/panda/PandaCanvasRenderer";
import type { PandaStats, PandaEmotion } from "@/utils/pandaHelper";

const HOW_ICONS = [Sparkles, SlidersHorizontal, Radar, Activity, Eye, Brain] as const;

function previewStageAmbient(index: number): string {
  switch (index) {
    case 0:
      return "0 0 72px rgba(109,255,144,0.07)";
    case 1:
      return "0 0 72px rgba(225,186,92,0.09)";
    case 2:
      return "0 0 72px rgba(117,215,255,0.07)";
    case 3:
      return "0 0 72px rgba(225,186,92,0.08)";
    case 4:
      return "0 0 72px rgba(225,186,92,0.07)";
    default:
      return "0 0 72px rgba(109,255,144,0.08)";
  }
}

export function HowItWorksInteractive() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)] lg:gap-12">
      <div className="rounded-[2rem] bg-[#080a08] p-2 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-1">
          {HOW_STEPS.map((step, index) => {
            const Icon = HOW_ICONS[index] ?? Sparkles;
            const isActive = activeIndex === index;
            const isCompleted = index < activeIndex;

            return (
              <div key={step.title} className="flex items-stretch gap-3 sm:gap-4">
                <div className="hidden sm:flex w-12 shrink-0 flex-col items-center self-stretch">
                  <motion.button
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={clsx(
                      "z-10 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-all duration-300",
                      isActive
                        ? "bg-[#030504] text-product-green shadow-[inset_0_3px_12px_rgba(0,0,0,0.85),0_0_16px_rgba(109,255,144,0.2)]"
                        : isCompleted
                          ? "bg-black/50 text-product-gold/80 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]"
                          : "bg-black/40 text-product-muted hover:bg-black/55",
                    )}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    aria-label={`Step ${index + 1}: ${step.title}`}
                  >
                    <Icon className={clsx("h-5 w-5", isActive && "animate-pulse")} />
                  </motion.button>

                  {index < HOW_STEPS.length - 1 && (
                    <div
                      className="relative my-1.5 w-1 flex-1 min-h-[28px] rounded-full bg-[#030403] shadow-[inset_0_2px_10px_rgba(0,0,0,0.85)]"
                    >
                      <motion.div
                        className="absolute left-0 top-0 w-full rounded-full bg-gradient-to-b from-product-green via-product-gold/90 to-product-green/70 shadow-[0_0_10px_rgba(109,255,144,0.45)]"
                        initial={{ height: 0 }}
                        animate={{
                          height: isCompleted || isActive ? "100%" : "0%",
                        }}
                        transition={{ duration: 0.45, ease: "easeInOut" }}
                      />
                    </div>
                  )}
                </div>

                <motion.article
                  onClick={() => setActiveIndex(index)}
                  initial={false}
                  animate={{
                    scale: isActive ? 0.996 : 1,
                    y: isActive ? 2 : 0,
                  }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className={clsx(
                    "min-w-0 flex-1 cursor-pointer rounded-2xl px-4 py-4 transition-[background-color,box-shadow] duration-300 sm:px-5 sm:py-5",
                    isActive
                      ? "shadow-[inset_0_4px_28px_rgba(0,0,0,0.82),inset_0_2px_0_rgba(0,0,0,0.55),inset_0_1px_0_rgba(225,186,92,0.12)]"
                      : "hover:bg-black/30",
                  )}
                  style={
                    isActive
                      ? {
                          backgroundColor: "#030504",
                          backgroundImage:
                            "linear-gradient(180deg, rgba(109,255,144,0.07) 0%, rgba(3,5,4,1) 55%)",
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={clsx(
                        "h-4 w-4 shrink-0 transition-colors sm:hidden",
                        isActive ? "text-product-green" : isCompleted ? "text-product-gold/70" : "text-product-muted",
                      )}
                    />
                    <span
                      className={clsx(
                        "font-mono text-[11px] font-black transition-colors",
                        isActive ? "text-product-gold" : isCompleted ? "text-product-gold/60" : "text-product-muted",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={clsx(
                        "product-chip text-[10px] uppercase tracking-wider",
                        isActive ? "text-product-green" : "opacity-55",
                      )}
                    >
                      {step.object}
                    </span>
                  </div>
                  <h3
                    className={clsx(
                      "mt-2 text-xl font-black tracking-tight transition-colors",
                      isActive ? "text-product-text" : "text-product-muted",
                    )}
                  >
                    {step.title}
                  </h3>
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="mt-2 overflow-hidden text-sm leading-relaxed text-product-muted"
                      >
                        {step.body}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.article>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <div className="sticky top-24">
          <motion.div
            className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-black/28 backdrop-blur-xl sm:aspect-square lg:aspect-[4/5]"
            animate={{
              boxShadow: `0 24px 56px rgba(0,0,0,0.48), 0 0 0 1px rgba(225,186,92,0.055), inset 0 1px 0 rgba(225,186,92,0.1), ${previewStageAmbient(activeIndex)}`,
            }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(109,255,144,0.05)_0%,transparent_52%),radial-gradient(ellipse_at_50%_100%,rgba(0,0,0,0.55)_0%,transparent_62%)]"
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.028] [background-image:linear-gradient(to_right,rgba(225,186,92,0.45)_1px,transparent_1px),linear-gradient(to_bottom,rgba(109,255,144,0.25)_1px,transparent_1px)] [background-size:24px_24px]"
            />

            <div
              className="relative flex items-center justify-between bg-black/22 px-5 py-3 backdrop-blur-md shadow-[inset_0_-1px_0_rgba(225,186,92,0.07)]"
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-product-red/40" />
                  <div className="h-2.5 w-2.5 rounded-full bg-product-gold/40" />
                  <div className="h-2.5 w-2.5 rounded-full bg-product-green/40" />
                </div>
                <span className="ml-2 font-mono text-[10px] font-bold uppercase tracking-widest text-product-muted">
                  TradingPanda OS Preview
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(225,186,92,0.06)]">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-product-green shadow-[0_0_6px_rgba(109,255,144,0.7)]" />
                <span className="font-mono text-[9px] font-bold text-product-green">LIVE</span>
              </div>
            </div>

            <div className="relative h-[calc(100%-3rem)] bg-black/12 p-6 shadow-[inset_0_1px_36px_rgba(0,0,0,0.28)] backdrop-blur-[3px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="h-full w-full"
                >
                  {renderPreview(activeIndex)}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.div
            key={`caption-${activeIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-center"
          >
            <p className="font-mono text-[11px] font-bold uppercase tracking-tighter text-product-gold">
              Step {activeIndex + 1} of 6
            </p>
            <p className="mt-1 text-xs text-product-muted italic">
              Click any step on the left to explore the system
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function renderPreview(index: number) {
  switch (index) {
    case 0:
      return <PandaNftPreview />;
    case 1:
      return <PolicyPreview />;
    case 2:
      return <MarketPreview />;
    case 3:
      return <VaultPreview />;
    case 4:
      return <TradeFactPreview />;
    case 5:
      return <SkillMemoryPreview />;
    default:
      return null;
  }
}

// --- Preview Sub-components ---

function PandaNftPreview() {
  const [stats, setStats] = useState<PandaStats>({
    boldness: 65,
    patience: 45,
    intuition: 70,
    focus: 55,
    contrarian: 40,
    emotion: "calm",
    experience: 15,
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const handleRandomize = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    let count = 0;
    const interval = setInterval(() => {
      setStats({
        boldness: Math.floor(Math.random() * 60) + 20,
        patience: Math.floor(Math.random() * 60) + 20,
        intuition: Math.floor(Math.random() * 60) + 20,
        focus: Math.floor(Math.random() * 60) + 20,
        contrarian: Math.floor(Math.random() * 60) + 20,
        emotion: ["calm", "excited", "greedy", "cautious", "panic", "numb", "frustrated"][
          Math.floor(Math.random() * 7)
        ] as PandaEmotion,
        experience: Math.floor(Math.random() * 30) + 5,
      });
      count++;
      if (count > 6) {
        clearInterval(interval);
        setIsGenerating(false);
      }
    }, 100);
  };

  return (
    <div className="flex h-full flex-col items-center justify-between py-2">
      {/* Circle Stage with Scanning Line */}
      <div className="relative flex-1 flex items-center justify-center w-full">
        <div className="relative h-60 w-60 rounded-full bg-gradient-to-b from-product-green/5 to-transparent p-1 shadow-[0_0_30px_rgba(109,255,144,0.12)] overflow-hidden">
          {/* Scanning Line */}
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-product-green shadow-[0_0_10px_#6dff90] z-20"
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          />
          {/* Panda Canvas Renderer */}
          <div className="h-full w-full overflow-hidden rounded-full bg-black/20">
            <PandaCanvasRenderer
              stats={stats}
              showBackground={false}
              className="h-full w-full max-w-none origin-center scale-[1.12] -translate-y-1"
            />
          </div>
        </div>
      </div>

      {/* Attributes & Dynamic Radar Chart */}
      <div className="grid grid-cols-[1fr_120px] gap-4 w-full items-center rounded-2xl bg-black/35 p-3 shadow-[inset_0_2px_10px_rgba(0,0,0,0.45)]">
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-product-text font-black">Panda Identity</span>
            <span className="font-mono text-[10px] text-product-gold">#8827</span>
          </div>
          <div className="text-sm font-black text-product-text">
            {stats.boldness > 60 ? "Bold Veteran" : "Balanced Scout"}
          </div>
          <div className="flex flex-wrap gap-1">
            <span className="rounded bg-product-green/12 px-1.5 py-0.5 text-[9px] font-bold text-product-green uppercase">
              {stats.emotion}
            </span>
            <span className="rounded bg-product-gold/12 px-1.5 py-0.5 text-[9px] font-bold text-product-gold">
              LVL {Math.floor(stats.experience / 10) + 1}
            </span>
          </div>
        </div>

        {/* Mini Radar Chart */}
        <div className="h-[100px] w-[100px] flex items-center justify-center relative">
          <RadarChart stats={stats} />
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleRandomize}
        disabled={isGenerating}
        className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-product-green/12 hover:bg-product-green/20 text-product-green font-mono text-xs font-bold py-2.5 transition-all"
      >
        <RefreshCw className={clsx("h-3.5 w-3.5", isGenerating && "animate-spin")} />
        {isGenerating ? "GENERATING..." : "GENERATE IDENTITY"}
      </button>
    </div>
  );
}

// Custom SVG Radar Chart
function RadarChart({ stats }: { stats: PandaStats }) {
  const angles = [
    -Math.PI / 2,
    -Math.PI / 2 + (2 * Math.PI) / 5,
    -Math.PI / 2 + (4 * Math.PI) / 5,
    -Math.PI / 2 + (6 * Math.PI) / 5,
    -Math.PI / 2 + (8 * Math.PI) / 5,
  ];

  const maxRadius = 35;
  const center = 50;

  const dataPoints = angles.map((angle, i) => {
    const val = [
      stats.focus,
      stats.boldness,
      stats.intuition,
      stats.contrarian,
      stats.patience,
    ][i];
    const r = (val / 100) * maxRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(" ");

  const labels = ["FOC", "BLD", "INT", "CON", "PAT"];

  return (
    <svg className="h-full w-full" viewBox="0 0 100 100">
      {/* Background Grids */}
      {[10, 20, 30, 35].map((r) => {
        const points = angles.map((angle) => {
          const x = center + r * Math.cos(angle);
          const y = center + r * Math.sin(angle);
          return `${x},${y}`;
        }).join(" ");
        return (
          <polygon
            key={r}
            points={points}
            fill="none"
            stroke="rgba(109, 255, 144, 0.08)"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Axis Lines */}
      {angles.map((angle, i) => {
        const x = center + maxRadius * Math.cos(angle);
        const y = center + maxRadius * Math.sin(angle);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke="rgba(109, 255, 144, 0.12)"
            strokeWidth="0.5"
            strokeDasharray="1 1"
          />
        );
      })}

      {/* Data Polygon */}
      <polygon
        points={dataPoints}
        fill="rgba(109, 255, 144, 0.25)"
        stroke="#6dff90"
        strokeWidth="1.5"
        className="transition-all duration-300 ease-out"
      />

      {/* Labels */}
      {angles.map((angle, i) => {
        const x = center + (maxRadius + 10) * Math.cos(angle);
        const y = center + (maxRadius + 10) * Math.sin(angle);
        return (
          <text
            key={i}
            x={x}
            y={y + 2}
            textAnchor="middle"
            className="font-mono text-[6px] font-bold fill-product-muted"
          >
            {labels[i]}
          </text>
        );
      })}
    </svg>
  );
}

function HowItWorksRangeSlider({
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
  fillClassName = "bg-gradient-to-r from-product-green-soft to-product-green",
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  fillClassName?: string;
}) {
  return (
    <RadixSlider.Root
      className="relative flex h-5 w-full touch-none select-none items-center"
      value={[value]}
      onValueChange={(v) => onChange(v[0])}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
    >
      <RadixSlider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-product-line/12">
        <RadixSlider.Range className={clsx("absolute h-full rounded-full", fillClassName)} />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        className="block h-3.5 w-3.5 rounded-full bg-product-green shadow-[0_0_10px_rgba(109,255,144,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-product-green/30"
        aria-label={ariaLabel}
      />
    </RadixSlider.Root>
  );
}

function PolicyPreview() {
  const [tradingFunds, setTradingFunds] = useState(2400);
  const [maxSize, setMaxSize] = useState(1500);
  const [dailyLoss, setDailyLoss] = useState(4.5);
  const [allowedPairs, setAllowedPairs] = useState<Record<string, boolean>>({
    "SUI-USDC": true,
    "DEEP-SUI": true,
    "WAL-USDC": false,
  });

  const isPassed = maxSize <= 3000 && Object.values(allowedPairs).some(Boolean);
  const isWarning = maxSize > 3000 && maxSize <= 4500 && isPassed;
  const isRejected = maxSize > 4500 || !Object.values(allowedPairs).some(Boolean);

  return (
    <div className="flex h-full flex-col gap-3 py-1">
      <div
        className="rounded-2xl bg-product-gold/[0.07] p-3.5 shadow-[inset_0_2px_12px_rgba(0,0,0,0.4)]"
      >
        <div className="flex items-center gap-2 text-product-gold pb-2 shadow-[inset_0_-1px_0_rgba(225,186,92,0.12)]">
          <Lock className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">PandaVault</span>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-bold text-product-muted">Trading funds</span>
            <span className="font-mono font-bold text-product-gold">
              ${tradingFunds.toLocaleString()}
            </span>
          </div>
          <HowItWorksRangeSlider
            value={tradingFunds}
            min={500}
            max={10000}
            step={100}
            onChange={setTradingFunds}
            ariaLabel="Trading funds"
          />
          <p className="text-[10px] leading-relaxed text-product-muted">
            Paper capital reserved inside the vault for autonomous training trades.
          </p>
        </div>
      </div>

      <div
        className="flex flex-1 flex-col rounded-2xl bg-black/30 p-3.5 shadow-[inset_0_2px_12px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center gap-2 text-product-green pb-2 shadow-[inset_0_-1px_0_rgba(109,255,144,0.1)]">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Trading Policy</span>
        </div>

        <div className="mt-3 space-y-3.5">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-product-muted">Max order (USD)</span>
              <span className="font-mono font-bold text-product-text">
                ${maxSize.toLocaleString()}
              </span>
            </div>
            <HowItWorksRangeSlider
              value={maxSize}
              min={100}
              max={5000}
              step={100}
              onChange={setMaxSize}
              ariaLabel="Max order USD"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-product-muted">Daily Loss Limit</span>
              <span className="font-mono font-bold text-product-text">{dailyLoss}%</span>
            </div>
            <HowItWorksRangeSlider
              value={dailyLoss}
              min={1}
              max={10}
              step={0.5}
              onChange={setDailyLoss}
              ariaLabel="Daily loss limit"
            />
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-bold text-product-muted">Allowed Pairs</span>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(allowedPairs).map((pair) => (
                <button
                  key={pair}
                  type="button"
                  onClick={() =>
                    setAllowedPairs((prev) => ({ ...prev, [pair]: !prev[pair] }))
                  }
                  className={clsx(
                    "rounded-xl px-1 py-2 font-mono text-[10px] font-bold transition-all",
                    allowedPairs[pair]
                      ? "bg-product-green/15 text-product-green shadow-[inset_0_0_12px_rgba(109,255,144,0.08)]"
                      : "bg-black/35 text-product-muted hover:bg-black/50",
                  )}
                >
                  {pair}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className={clsx(
          "rounded-2xl p-3.5 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.35)]",
          isPassed && !isWarning && "bg-product-green/[0.06]",
          isWarning && "bg-product-gold/[0.06]",
          isRejected && "bg-product-red/[0.06]",
        )}
      >
        <div className="flex items-center gap-2">
          {isPassed && !isWarning && (
            <>
              <div className="h-2 w-2 rounded-full bg-product-green animate-pulse" />
              <span className="font-mono text-[10px] font-black text-product-green uppercase tracking-wider">
                POLICY GATE: PASSED
              </span>
            </>
          )}
          {isWarning && (
            <>
              <div className="h-2 w-2 rounded-full bg-product-gold animate-pulse" />
              <span className="font-mono text-[10px] font-black text-product-gold uppercase tracking-wider">
                POLICY GATE: WARNING
              </span>
            </>
          )}
          {isRejected && (
            <>
              <div className="h-2 w-2 rounded-full bg-product-red animate-pulse" />
              <span className="font-mono text-[10px] font-black text-product-red uppercase tracking-wider">
                POLICY GATE: REJECTED
              </span>
            </>
          )}
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-product-muted">
          {isPassed && !isWarning && "Safe configuration. Bounded execution is fully active inside the vault."}
          {isWarning && "High exposure. Vault risks are elevated but within acceptable limits."}
          {isRejected && !Object.values(allowedPairs).some(Boolean) && "At least one trading pair must be allowed."}
          {isRejected && maxSize > 4500 && "Max position size exceeds vault safety threshold ($4,500)."}
        </p>
      </div>
    </div>
  );
}

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

function MarketPreview() {
  const [candles, setCandles] = useState<Candle[]>(() => {
    const initial: Candle[] = [];
    let currentPrice = 3.84;
    for (let i = 0; i < 22; i++) {
      const change = (Math.random() - 0.5) * 0.12;
      const open = currentPrice;
      const close = currentPrice + change;
      const high = Math.max(open, close) + Math.random() * 0.06;
      const low = Math.min(open, close) - Math.random() * 0.06;
      initial.push({ open, high, low, close });
      currentPrice = close;
    }
    return initial;
  });

  // Tick the last candle
  useEffect(() => {
    const interval = setInterval(() => {
      setCandles((prev) => {
        const next = [...prev];
        const lastIndex = next.length - 1;
        const last = next[lastIndex];
        const tick = (Math.random() - 0.5) * 0.015;
        const newClose = last.close + tick;
        next[lastIndex] = {
          ...last,
          close: newClose,
          high: Math.max(last.high, newClose),
          low: Math.min(last.low, newClose),
        };
        return next;
      });
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Scroll candles
  useEffect(() => {
    const interval = setInterval(() => {
      setCandles((prev) => {
        const next = prev.slice(1);
        const last = prev[prev.length - 1];
        const open = last.close;
        const change = (Math.random() - 0.5) * 0.1;
        const close = open + change;
        next.push({
          open,
          close,
          high: Math.max(open, close) + Math.random() * 0.05,
          low: Math.min(open, close) - Math.random() * 0.05,
        });
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const minPrice = Math.min(...candles.map((c) => c.low));
  const maxPrice = Math.max(...candles.map((c) => c.high));
  const priceRange = maxPrice - minPrice || 0.1;

  const width = 280;
  const height = 130;
  const candleWidth = width / candles.length;

  // Compute 5-period MA
  const maPoints = candles
    .map((_, idx) => {
      if (idx < 4) return null;
      const sum = candles.slice(idx - 4, idx + 1).reduce((acc, c) => acc + c.close, 0);
      const avg = sum / 5;
      const x = idx * candleWidth + candleWidth / 2;
      const y = height - ((avg - minPrice) / priceRange) * height;
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");

  const lastPrice = candles[candles.length - 1]?.close ?? 3.84;
  const prevPrice = candles[candles.length - 2]?.close ?? 3.84;
  const isUp = lastPrice >= prevPrice;

  return (
    <div className="flex h-full flex-col justify-between py-1">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 shadow-[inset_0_-1px_0_rgba(225,186,92,0.06)]">
        <div className="flex items-center gap-2 text-product-blue">
          <Radar className="h-5 w-5 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider">DeepBook Feed</span>
        </div>
        <span className="font-mono text-[10px] text-product-muted">SUI-USDC</span>
      </div>

      {/* Live Candlestick Chart */}
      <div className="flex-1 my-3 rounded-2xl bg-black/45 p-3 flex items-center justify-center relative shadow-[inset_0_2px_12px_rgba(0,0,0,0.5)]">
        <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {/* Horizontal Grid lines */}
          {[0.25, 0.5, 0.75].map((ratio, i) => (
            <line
              key={i}
              x1="0"
              y1={height * ratio}
              x2={width}
              y2={height * ratio}
              stroke="rgba(109, 255, 144, 0.04)"
              strokeWidth="1"
            />
          ))}

          {/* Render Candles */}
          {candles.map((candle, i) => {
            const isCandleGreen = candle.close >= candle.open;
            const x = i * candleWidth + candleWidth * 0.15;
            const w = candleWidth * 0.7;

            const yHigh = height - ((candle.high - minPrice) / priceRange) * height;
            const yLow = height - ((candle.low - minPrice) / priceRange) * height;
            const yOpen = height - ((candle.open - minPrice) / priceRange) * height;
            const yClose = height - ((candle.close - minPrice) / priceRange) * height;

            const yTop = Math.min(yOpen, yClose);
            const yBottom = Math.max(yOpen, yClose);
            const bodyHeight = Math.max(yBottom - yTop, 1.5);

            return (
              <g key={i}>
                {/* Wick */}
                <line
                  x1={x + w / 2}
                  y1={yHigh}
                  x2={x + w / 2}
                  y2={yLow}
                  stroke={isCandleGreen ? "#6dff90" : "#ff6d6d"}
                  strokeWidth="1"
                />
                {/* Body */}
                <rect
                  x={x}
                  y={yTop}
                  width={w}
                  height={bodyHeight}
                  fill={isCandleGreen ? "rgba(109, 255, 144, 0.3)" : "rgba(255, 109, 109, 0.3)"}
                  stroke={isCandleGreen ? "#6dff90" : "#ff6d6d"}
                  strokeWidth="1"
                  rx="1"
                />
              </g>
            );
          })}

          {/* Moving Average Line */}
          {maPoints && (
            <polyline
              fill="none"
              stroke="#ffd700"
              strokeWidth="1.5"
              points={maPoints}
              className="opacity-80"
            />
          )}
        </svg>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-black/35 p-2.5 flex justify-between items-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)]">
          <div>
            <div className="text-[9px] text-product-muted uppercase font-bold">Last Price</div>
            <div className={clsx("mt-0.5 font-mono text-xs font-bold", isUp ? "text-product-green" : "text-product-red")}>
              ${lastPrice.toFixed(3)}
            </div>
          </div>
          {isUp ? <TrendingUp className="h-4 w-4 text-product-green" /> : <TrendingDown className="h-4 w-4 text-product-red" />}
        </div>
        <div className="rounded-xl bg-black/35 p-2.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)]">
          <div className="text-[9px] text-product-muted uppercase font-bold">Liquidity</div>
          <div className="mt-0.5 font-mono text-xs font-bold text-product-green">HIGH (DEEPBOOK)</div>
        </div>
      </div>
    </div>
  );
}

function VaultPreview() {
  return (
    <div className="flex h-full flex-col items-center justify-between py-2">
      {/* Pure Energy Digital Shield */}
      <div className="relative flex-1 flex items-center justify-center w-full">
        <div className="relative h-48 w-44 flex items-center justify-center">
          {/* Concentric Rotating Hexagons & Rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
            className="absolute h-40 w-40 border border-dashed border-product-gold/20 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, ease: "linear", duration: 18 }}
            className="absolute h-36 w-36 border border-product-gold/10 rounded-[2rem]"
          />
          <motion.div
            animate={{ rotate: 180 }}
            transition={{ repeat: Infinity, ease: "linear", duration: 12 }}
            className="absolute h-28 w-28 border border-dashed border-product-gold/30 rounded-xl"
          />

          {/* Holographic Shield Glow */}
          <div className="absolute h-24 w-24 rounded-full bg-product-gold/5 blur-xl animate-pulse" />

          {/* Center Lock Icon with Pulsing Aura */}
          <div className="relative z-10 grid h-16 w-14 place-items-center rounded-2xl bg-black/70 shadow-[0_0_25px_rgba(255,215,0,0.2),inset_0_2px_8px_rgba(0,0,0,0.5)]">
            <Lock className="h-6 w-6 text-product-gold animate-pulse" />
          </div>

          {/* Particle Dots Floating */}
          <div className="absolute inset-0 pointer-events-none">
            {[
              { top: "15%", left: "20%", delay: 0 },
              { top: "80%", left: "15%", delay: 0.5 },
              { top: "30%", left: "85%", delay: 1 },
              { top: "75%", left: "80%", delay: 1.5 },
            ].map((p, i) => (
              <motion.div
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full bg-product-gold"
                animate={{ scale: [0.3, 1.2, 0.3], opacity: [0.2, 0.8, 0.2] }}
                transition={{ repeat: Infinity, duration: 2, delay: p.delay }}
                style={{ top: p.top, left: p.left }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Vault Info Panel */}
      <div className="w-full space-y-3">
        <div className="text-center">
          <div className="text-xs font-black text-product-text uppercase tracking-wider">PandaVault Secured</div>
          <div className="text-[11px] text-product-muted">On-chain multi-sig & owner-only withdrawal rights</div>
        </div>
        <div className="rounded-2xl bg-black/35 p-3.5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.4)]">
          <div className="flex justify-between items-center">
            <span className="text-xs text-product-muted">Vault Balance</span>
            <span className="font-mono text-xs font-bold text-product-text">1,240.50 SUI</span>
          </div>
          <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-product-line/30">
            <motion.div
              className="h-full bg-product-gold shadow-[0_0_8px_#ffd700]"
              initial={{ width: 0 }}
              animate={{ width: "66%" }}
              transition={{ duration: 1, delay: 0.2 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TradeFactPreview() {
  const [isReviewed, setIsReviewd] = useState(false);

  return (
    <div className="flex h-full flex-col justify-between py-1">
      {/* Header */}
      <div className="flex items-center gap-2 text-product-gold pb-2 shadow-[inset_0_-1px_0_rgba(225,186,92,0.06)]">
        <Eye className="h-5 w-5" />
        <span className="text-xs font-bold uppercase tracking-wider">Trade Fact Explorer</span>
      </div>

      {/* Fact Ledger */}
      <div className="space-y-2 my-3 flex-1 flex flex-col justify-center">
        <div className="rounded-xl bg-black/35 p-2.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-product-green" />
            <span className="text-[9px] font-bold uppercase text-product-muted">Signal</span>
          </div>
          <div className="mt-0.5 text-xs text-product-text font-mono">Bullish divergence on SUI-USDC 5m</div>
        </div>
        <div className="rounded-xl bg-product-green/[0.06] p-2.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-product-green" />
            <span className="text-[9px] font-bold uppercase text-product-green">Policy Check</span>
          </div>
          <div className="mt-0.5 text-xs text-product-text font-mono">PASSED · Size $450 within $1,500 limit</div>
        </div>
        <div className="rounded-xl bg-black/35 p-2.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-product-blue" />
            <span className="text-[9px] font-bold uppercase text-product-muted">Execution</span>
          </div>
          <div className="mt-0.5 text-xs text-product-text font-mono">BUY 117.2 SUI @ $3.84</div>
        </div>
      </div>

      {/* Interactive Review Button */}
      <AnimatePresence mode="wait">
        {!isReviewed ? (
          <motion.div
            key="review-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between rounded-xl bg-product-gold/12 p-2.5"
          >
            <span className="text-[9px] font-bold text-product-gold uppercase tracking-wider">PENDING REVIEW</span>
            <button
              onClick={() => setIsReviewd(true)}
              className="rounded-lg bg-product-gold hover:bg-product-gold/80 px-3.5 py-1 text-[10px] font-bold text-black transition-all"
            >
              Review Fact
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="reviewed-status"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center gap-2 rounded-xl bg-product-green/12 p-2.5 text-product-green"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">REVIEW COMPLETED · MEMORY WRITTEN</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SkillMemoryPreview() {
  const [percent, setPercent] = useState(75);

  useEffect(() => {
    const interval = setInterval(() => {
      setPercent((prev) => (prev >= 100 ? 50 : prev + 5));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-between py-2">
      {/* Neural Synapses Brain Visual */}
      <div className="relative flex-1 flex items-center justify-center w-full">
        <div className="relative h-36 w-36">
          <svg className="h-full w-full" viewBox="0 0 100 100">
            {/* Outer Progress Circle */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="rgba(109, 255, 144, 0.06)"
              strokeWidth="5"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeDasharray="276"
              animate={{ strokeDashoffset: 276 - (276 * percent) / 100 }}
              className="text-product-green"
              strokeLinecap="round"
              transition={{ duration: 0.5 }}
            />
          </svg>
          {/* Synapses Brain Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative">
              <Brain className="h-10 w-10 text-product-green animate-pulse" />
              {/* Pulsing synaptic lines */}
              <div className="absolute inset-[-6px] rounded-full bg-product-green/10 animate-ping" />
            </div>
            <span className="mt-2 font-mono text-sm font-black text-product-text">{percent}%</span>
          </div>
        </div>
      </div>

      {/* Memory Growth Panel */}
      <div className="w-full space-y-3">
        <div className="text-center">
          <div className="text-xs font-black text-product-text uppercase tracking-wider">Skill Memory Growth</div>
          <div className="text-[11px] text-product-muted">Evidence-backed learning from reviewed Trade Facts</div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-black/35 p-2 text-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)]">
            <div className="text-[9px] text-product-muted uppercase font-bold">Patience</div>
            <div className="mt-0.5 font-mono text-xs font-bold text-product-green">+12</div>
          </div>
          <div className="rounded-xl bg-black/35 p-2 text-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)]">
            <div className="text-[9px] text-product-muted uppercase font-bold">Boldness</div>
            <div className="mt-0.5 font-mono text-xs font-bold text-product-gold">+5</div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-product-green">
          <TrendingUp className="h-3.5 w-3.5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Level Up Imminent</span>
        </div>
      </div>
    </div>
  );
}
