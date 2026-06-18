"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { clsx } from "clsx";
import {
  SUI_NATIVE_COPY,
  SUI_NATIVE_PAIRS,
} from "@/lib/landing/landingContent";

const SUI_NATIVE_ICONS = [Sparkles, ShieldCheck, KeyRound, XCircle] as const;

function previewStageAmbient(index: number): string {
  switch (index) {
    case 0:
      return "0 0 72px rgba(109,255,144,0.07)";
    case 1:
      return "0 0 72px rgba(225,186,92,0.09)";
    case 2:
      return "0 0 72px rgba(117,215,255,0.07)";
    default:
      return "0 0 72px rgba(255,95,86,0.08)";
  }
}

export function SuiNativeInteractive() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activePair = SUI_NATIVE_PAIRS[activeIndex] ?? SUI_NATIVE_PAIRS[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)] lg:gap-12">
      <div className="rounded-[2rem] bg-[#080a08] p-2 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-1">
          {SUI_NATIVE_PAIRS.map((pair, index) => {
            const Icon = SUI_NATIVE_ICONS[index] ?? Sparkles;
            const isActive = activeIndex === index;
            const isCompleted = index < activeIndex;

            return (
              <div key={pair.object} className="flex items-stretch gap-3 sm:gap-4">
                <div className="hidden w-12 shrink-0 flex-col items-center self-stretch sm:flex">
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
                    aria-label={`${pair.object}: ${pair.title}`}
                  >
                    <Icon className={clsx("h-5 w-5", isActive && "animate-pulse")} />
                  </motion.button>

                  {index < SUI_NATIVE_PAIRS.length - 1 ? (
                    <div className="relative my-1.5 min-h-[28px] w-1 flex-1 rounded-full bg-[#030403] shadow-[inset_0_2px_10px_rgba(0,0,0,0.85)]">
                      <motion.div
                        className="absolute left-0 top-0 w-full rounded-full bg-gradient-to-b from-product-green via-product-gold/90 to-product-green/70 shadow-[0_0_10px_rgba(109,255,144,0.45)]"
                        initial={{ height: 0 }}
                        animate={{
                          height: isCompleted || isActive ? "100%" : "0%",
                        }}
                        transition={{ duration: 0.45, ease: "easeInOut" }}
                      />
                    </div>
                  ) : null}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon
                      className={clsx(
                        "h-4 w-4 shrink-0 transition-colors sm:hidden",
                        isActive
                          ? "text-product-green"
                          : isCompleted
                            ? "text-product-gold/70"
                            : "text-product-muted",
                      )}
                    />
                    <span
                      className={clsx(
                        "font-mono text-[11px] font-black transition-colors",
                        isActive
                          ? "text-product-gold"
                          : isCompleted
                            ? "text-product-gold/60"
                            : "text-product-muted",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={clsx(
                        "product-chip text-[10px] uppercase tracking-wider",
                        isActive
                          ? "border-product-gold/30 bg-product-gold/10 text-product-gold"
                          : "opacity-55",
                      )}
                    >
                      {pair.object}
                    </span>
                    <span
                      className={clsx(
                        "product-chip text-[10px] uppercase tracking-wider",
                        isActive
                          ? "border-product-green/30 bg-product-green/10 text-product-green"
                          : "border-product-green/15 bg-product-green/[0.04] text-product-green/45",
                      )}
                    >
                      {SUI_NATIVE_COPY.controlLabel}
                    </span>
                  </div>

                  <h3
                    className={clsx(
                      "mt-2 text-xl font-black tracking-tight transition-colors",
                      isActive ? "text-product-text" : "text-product-muted",
                    )}
                  >
                    {pair.title}
                  </h3>

                  <AnimatePresence initial={false}>
                    {isActive ? (
                      <motion.p
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="mt-2 overflow-hidden text-sm leading-relaxed text-product-muted"
                      >
                        {pair.summary}
                      </motion.p>
                    ) : null}
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
            className="relative overflow-hidden rounded-[2rem] bg-black/28 backdrop-blur-xl"
            animate={{
              boxShadow: `0 24px 56px rgba(0,0,0,0.48), 0 0 0 1px rgba(225,186,92,0.055), inset 0 1px 0 rgba(225,186,92,0.1), ${previewStageAmbient(activeIndex)}`,
            }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(109,255,144,0.05)_0%,transparent_52%),radial-gradient(ellipse_at_50%_100%,rgba(0,0,0,0.55)_0%,transparent_62%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.028] [background-image:linear-gradient(to_right,rgba(225,186,92,0.45)_1px,transparent_1px),linear-gradient(to_bottom,rgba(109,255,144,0.25)_1px,transparent_1px)] [background-size:24px_24px]" />

            <div className="relative flex items-center justify-between bg-black/22 px-5 py-3 backdrop-blur-md shadow-[inset_0_-1px_0_rgba(225,186,92,0.07)]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-product-red/40" />
                  <div className="h-2.5 w-2.5 rounded-full bg-product-gold/40" />
                  <div className="h-2.5 w-2.5 rounded-full bg-product-green/40" />
                </div>
                <span className="ml-2 font-mono text-[10px] font-bold uppercase tracking-widest text-product-muted">
                  Move boundary preview
                </span>
              </div>
              <span className="rounded-full bg-black/35 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-product-muted shadow-[inset_0_1px_0_rgba(225,186,92,0.08)]">
                Move module
              </span>
            </div>

            <div className="relative min-h-[18rem] bg-black/12 p-5 shadow-[inset_0_1px_36px_rgba(0,0,0,0.28)] backdrop-blur-[3px] sm:p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePair.object}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="relative overflow-hidden rounded-[1.35rem] bg-[#030504] p-5 shadow-[inset_0_4px_32px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(225,186,92,0.14),0_0_48px_rgba(225,186,92,0.06)] sm:p-6"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_0%,rgba(225,186,92,0.12)_0%,transparent_46%),radial-gradient(ellipse_at_88%_100%,rgba(109,255,144,0.06)_0%,transparent_42%)]" />
                  <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,rgba(225,186,92,0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgba(109,255,144,0.28)_1px,transparent_1px)] [background-size:20px_20px]" />
                  <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-product-gold/35 to-transparent" />

                  <div className="relative space-y-3">
                    {activePair.enforce.modules.map((modulePath) => (
                      <div
                        key={modulePath}
                        className="font-mono text-[clamp(0.8rem,2.2vw,1.05rem)] font-bold leading-snug tracking-tight text-product-gold"
                      >
                        {modulePath}
                      </div>
                    ))}

                    {"onChainField" in activePair.enforce &&
                    activePair.enforce.onChainField ? (
                      <div className="rounded-xl bg-black/40 px-3 py-3 shadow-[inset_0_2px_12px_rgba(0,0,0,0.55)]">
                        <div className="flex items-center justify-between gap-3 font-mono text-[11px]">
                          <span className="text-product-muted">
                            {activePair.enforce.onChainField.name}
                          </span>
                          <span
                            className={clsx(
                              "font-bold",
                              activePair.enforce.onChainField.value === "0x0"
                                ? "text-product-red"
                                : "text-product-green",
                            )}
                          >
                            {activePair.enforce.onChainField.value}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-product-green/80">
                          <span
                            className={clsx(
                              "h-1.5 w-1.5 rounded-full shadow-[0_0_8px_rgba(109,255,144,0.55)]",
                              activePair.enforce.onChainField.value === "0x0"
                                ? "bg-product-red shadow-[0_0_8px_rgba(255,95,86,0.55)]"
                                : "bg-product-green",
                            )}
                          />
                          {activePair.enforce.onChainField.value === "0x0"
                            ? "Revoked on-chain"
                            : "Bound at setup"}
                        </div>
                      </div>
                    ) : null}

                    <div className="pt-1 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-product-gold/75">
                      {SUI_NATIVE_COPY.enforceLabel}
                    </div>

                    <h4 className="text-lg font-black tracking-tight text-product-text">
                      {activePair.enforce.title}
                    </h4>

                    <p className="text-sm leading-relaxed text-[#b8bdb0] sm:text-[15px]">
                      {activePair.enforce.description}
                    </p>
                  </div>

                  <div className="relative mt-6 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-product-gold/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-product-gold shadow-[0_0_8px_rgba(225,186,92,0.65)]" />
                    On-chain revert gate
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
