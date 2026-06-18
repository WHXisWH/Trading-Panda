"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";
import { WHY_COPY, WHY_DEMO } from "@/lib/landing/landingContent";
import { WhyPandaPortrait } from "./WhyPandaPortrait";

type WhyDemoTab = "blindTrust" | "yourPanda";

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

export function WhyContrastDemo() {
  const [activeTab, setActiveTab] = useState<WhyDemoTab>("blindTrust");
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="product-panel group relative overflow-hidden rounded-[2rem] border border-product-line/80 bg-white/[0.02] p-5 shadow-2xl backdrop-blur-xl sm:rounded-[2.5rem] sm:p-8 md:p-10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-product-green/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative mb-8 flex rounded-2xl border border-product-line bg-black/35 p-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("blindTrust")}
          className={clsx(
            "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3.5 font-mono text-[10px] font-black uppercase tracking-[0.16em] transition-all sm:px-4 sm:text-[11px]",
            activeTab === "blindTrust"
              ? "border border-product-red/30 bg-product-red/10 text-product-red shadow-[0_0_20px_rgba(255,95,86,0.18)]"
              : "text-product-muted hover:text-product-text",
          )}
        >
          <LockKeyhole className="h-4 w-4 shrink-0" />
          {WHY_DEMO.tabs.blindTrust}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("yourPanda")}
          className={clsx(
            "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3.5 font-mono text-[10px] font-black uppercase tracking-[0.16em] transition-all sm:px-4 sm:text-[11px]",
            activeTab === "yourPanda"
              ? "border border-product-green/35 bg-product-green/12 text-product-green shadow-[var(--glow-green)]"
              : "text-product-muted hover:text-product-text",
          )}
        >
          <ShieldCheck className="h-4 w-4 shrink-0" />
          {WHY_DEMO.tabs.yourPanda}
        </button>
      </div>

      {activeTab === "blindTrust" ? (
        <p className="relative mb-6 text-base leading-relaxed text-product-muted sm:text-lg">
          {WHY_COPY.painQuestion.before}{" "}
          <span className="font-semibold text-product-red">{WHY_COPY.painQuestion.highlight}</span>
          {WHY_COPY.painQuestion.after}
        </p>
      ) : null}

      <div className="relative min-h-[17rem] font-mono text-sm">
        <AnimatePresence mode="wait">
          {activeTab === "blindTrust" ? (
            <motion.div
              key="blindTrust"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3 text-base font-bold text-product-red sm:text-lg">
                <AlertTriangle
                  className={clsx("h-5 w-5 shrink-0", !reducedMotion && "animate-bounce")}
                />
                {WHY_DEMO.blindTrust.alert}
              </div>
              <div className="space-y-3 rounded-3xl border border-product-red/20 bg-product-red/5 p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-product-red/10 pb-3">
                  <span className="font-mono text-[10px] font-black uppercase tracking-wider text-product-muted">
                    {WHY_DEMO.blindTrust.modeLabel}
                  </span>
                  <span className="font-black text-product-red">{WHY_DEMO.blindTrust.modeValue}</span>
                </div>
                {WHY_DEMO.blindTrust.rows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-product-muted">{row.label}</span>
                    <span className={clsx("font-bold", row.tone === "bad" ? "text-product-red" : "text-product-text")}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="yourPanda"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: reducedMotion ? 0 : 0.2 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-4">
                <WhyPandaPortrait className="h-16 w-16 sm:h-20 sm:w-20" />
                <div className="flex items-center gap-3 text-base font-bold text-product-green sm:text-lg">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  {WHY_DEMO.yourPanda.alert}
                </div>
              </div>

              <div className="space-y-3 rounded-3xl border border-product-green/20 bg-product-green/[0.06] p-5 sm:p-6">
                <div className="flex flex-wrap gap-2 border-b border-product-green/10 pb-3">
                  <span className="product-chip border-product-green/30 bg-product-green/10 text-product-green">
                    {WHY_DEMO.yourPanda.badges.boundedAutonomy}
                  </span>
                  <span className="product-chip border-product-gold/30 bg-product-gold/10 text-product-gold">
                    {WHY_DEMO.yourPanda.badges.rulesYouOwn}
                  </span>
                </div>
                {WHY_DEMO.yourPanda.rows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-product-muted">{row.label}</span>
                    <span className={clsx("font-bold", row.tone === "good" ? "text-product-green" : "text-product-text")}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-xs leading-relaxed text-product-muted sm:text-sm">
                {WHY_DEMO.yourPanda.trainingFootnote}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
