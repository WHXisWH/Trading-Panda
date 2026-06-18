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
  const isBlindTrust = activeTab === "blindTrust";

  return (
    <div
      className={clsx(
        "why-contrast-shell p-5 sm:p-8 md:p-10",
        isBlindTrust ? "why-contrast-shell--red" : "why-contrast-shell--green",
      )}
    >
      <div className="relative mb-8 flex why-contrast-tab-rail">
        <button
          type="button"
          onClick={() => setActiveTab("blindTrust")}
          className={clsx(
            "why-contrast-tab flex flex-1 items-center justify-center gap-2 px-3 py-3.5 font-mono text-[10px] font-black uppercase tracking-[0.16em] sm:px-4 sm:text-[11px]",
            isBlindTrust
              ? "why-contrast-tab--active-red"
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
            "why-contrast-tab flex flex-1 items-center justify-center gap-2 px-3 py-3.5 font-mono text-[10px] font-black uppercase tracking-[0.16em] sm:px-4 sm:text-[11px]",
            !isBlindTrust
              ? "why-contrast-tab--active-green"
              : "text-product-muted hover:text-product-text",
          )}
        >
          <ShieldCheck className="h-4 w-4 shrink-0" />
          {WHY_DEMO.tabs.yourPanda}
        </button>
      </div>

      {isBlindTrust ? (
        <p className="relative mb-6 text-base leading-relaxed text-product-muted sm:text-lg">
          {WHY_COPY.painQuestion.before}{" "}
          <span className="font-semibold text-product-red">{WHY_COPY.painQuestion.highlight}</span>
          {WHY_COPY.painQuestion.after}
        </p>
      ) : null}

      <div className="relative min-h-[17rem] font-mono text-sm">
        <AnimatePresence mode="wait">
          {isBlindTrust ? (
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
              <div className="why-contrast-panel--red space-y-3 p-5 sm:p-6">
                <div className="why-contrast-divider--red flex items-center justify-between pb-3">
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

              <div className="why-contrast-panel--green space-y-3 p-5 sm:p-6">
                <div className="why-contrast-divider--green flex flex-wrap gap-2 pb-3">
                  <span className="why-contrast-badge why-contrast-badge--green">
                    {WHY_DEMO.yourPanda.badges.boundedAutonomy}
                  </span>
                  <span className="why-contrast-badge why-contrast-badge--gold">
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
