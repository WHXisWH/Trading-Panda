"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Eye,
  Radar,
  ShieldCheck,
  Lock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { clsx } from "clsx";
import { TRAINING_LOOP } from "@/lib/landing/landingContent";
import { PandaCanvasRenderer } from "@/components/panda/PandaCanvasRenderer";
import { canvasTier, type PandaCanvasRenderOptions } from "@/lib/pandaCanvasAssets";
import { DEFAULT_PANDA_STATS, type PandaEmotion } from "@/utils/pandaHelper";

const LOOP_ICONS = [
  Radar,
  Brain,
  ShieldCheck,
  Lock,
  Eye,
  CheckCircle2,
  TrendingUp,
];

const LOOP_RENDER_OPTIONS: PandaCanvasRenderOptions = {
  tierMode: "discrete",
  traitOpacityMode: "solid",
};

const SEGMENT_COUNT = TRAINING_LOOP.length;
const STEP_MS = 3800;
const TICK_MS = 50;
const RING_COMPLETE_MS = 650;
const RING_SIZE = 600;
const RING_CENTER = RING_SIZE / 2;
const RING_RADIUS = 280;
const NODE_RADIUS = RING_RADIUS;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const GLOW_GREEN = "#6dff90";
/** One visual experience tier per full loop (canvasTier steps every ~10). */
const EXPERIENCE_PER_LOOP = 10;
const MAX_EXPERIENCE = 100;

/** Step 1 node sits at sector center — progress starts here, grows clockwise. */
const RING_START_ANGLE = ((0.5) / SEGMENT_COUNT) * 360 - 90;

function nodeCenterAngleDeg(index: number) {
  return ((index + 0.5) / SEGMENT_COUNT) * 360 - 90;
}

function nodePosition(index: number) {
  const nodeCenter = nodeCenterAngleDeg(index);
  const angleRad = (nodeCenter * Math.PI) / 180;
  return {
    x: Math.cos(angleRad) * NODE_RADIUS,
    y: Math.sin(angleRad) * NODE_RADIUS,
  };
}

function getPandaEmotion(index: number): PandaEmotion {
  if (index === 1 || index === 6) return "excited";
  if (index === 2 || index === 3) return "cautious";
  if (index === 4) return "greedy";
  return "calm";
}

function getStepDescription(index: number): string {
  const descriptions = [
    "Panda monitors DeepBook's real-time order book and price action.",
    "The agent's personality and strategy layers form a trading intent.",
    "Move-enforced rules check the intent against your risk boundaries.",
    "The authorized trade is executed within the secure PandaVault.",
    "A cryptographic evidence record is generated for the transaction.",
    "You review the trade outcome to provide reinforcement.",
    "The verified experience is written into the Panda's Skill Memory.",
  ];
  return descriptions[index] || "";
}

type LoopFillState = {
  activeIndex: number;
  stepProgress: number;
};

export function TrainingLoopCircular() {
  const [fillState, setFillState] = useState<LoopFillState>({ activeIndex: 0, stepProgress: 0 });
  const [isRingComplete, setIsRingComplete] = useState(false);
  const [experience, setExperience] = useState(DEFAULT_PANDA_STATS.experience);
  const [isEvolving, setIsEvolving] = useState(false);

  const { activeIndex, stepProgress } = fillState;

  const nodes = useMemo(
    () => TRAINING_LOOP.map((_, i) => nodePosition(i)),
    [],
  );

  useEffect(() => {
    if (isRingComplete) return;

    const intervalId = window.setInterval(() => {
      setFillState((current) => {
        const nextProgress = current.stepProgress + TICK_MS / STEP_MS;
        if (nextProgress < 1) {
          return { ...current, stepProgress: nextProgress };
        }

        if (current.activeIndex >= SEGMENT_COUNT - 1) {
          setExperience((currentExperience) => {
            const prevTier = canvasTier(currentExperience);
            const nextExperience = Math.min(
              MAX_EXPERIENCE,
              currentExperience + EXPERIENCE_PER_LOOP,
            );
            if (canvasTier(nextExperience) > prevTier) {
              setIsEvolving(true);
              window.setTimeout(() => setIsEvolving(false), 700);
            }
            return nextExperience;
          });
          setIsRingComplete(true);
          window.setTimeout(() => {
            setIsRingComplete(false);
            setFillState({ activeIndex: 0, stepProgress: 0 });
          }, RING_COMPLETE_MS);
          return { activeIndex: current.activeIndex, stepProgress: 1 };
        }

        return { activeIndex: current.activeIndex + 1, stepProgress: 0 };
      });
    }, TICK_MS);

    return () => window.clearInterval(intervalId);
  }, [isRingComplete]);

  const ActiveStepIcon = LOOP_ICONS[activeIndex];
  const experienceTier = canvasTier(experience);
  const ringIsFull = isRingComplete || (activeIndex === SEGMENT_COUNT - 1 && stepProgress >= 1);
  const fillRatio = ringIsFull ? 1 : (activeIndex + stepProgress) / SEGMENT_COUNT;
  const filledLength = fillRatio * CIRCUMFERENCE;
  const progressOffset = CIRCUMFERENCE - filledLength;

  return (
    <div
      className="product-panel relative mx-auto w-full max-w-5xl overflow-hidden border-product-line/30 bg-black/60 p-8 backdrop-blur-md sm:p-12"
    >
      <div className="flex flex-col items-center">
        <div
          className="relative h-[560px] w-[560px] sm:h-[600px] sm:w-[600px]"
          aria-hidden="true"
        >
          <svg
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            className="absolute inset-0 h-full w-full"
            role="presentation"
          >
            <circle
              cx={RING_CENTER}
              cy={RING_CENTER}
              r={RING_RADIUS}
              fill="none"
              stroke="rgba(109, 255, 144, 0.08)"
              strokeWidth={2}
            />

            {isEvolving ? (
              <motion.circle
                cx={RING_CENTER}
                cy={RING_CENTER}
                r={RING_RADIUS}
                fill="none"
                stroke="var(--product-gold)"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={0}
                transform={`rotate(${RING_START_ANGLE} ${RING_CENTER} ${RING_CENTER})`}
                initial={{ opacity: 0.45 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
              />
            ) : (
              filledLength > 0 && (
                <circle
                  cx={RING_CENTER}
                  cy={RING_CENTER}
                  r={RING_RADIUS}
                  fill="none"
                  stroke={GLOW_GREEN}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={progressOffset}
                  transform={`rotate(${RING_START_ANGLE} ${RING_CENTER} ${RING_CENTER})`}
                  style={{
                    filter: "drop-shadow(0 0 6px rgba(109, 255, 144, 0.5))",
                    transition: "stroke-dashoffset 80ms linear",
                  }}
                />
              )
            )}
          </svg>

          <div className="pointer-events-none absolute inset-0 z-10">
            {nodes.map((pos, i) => {
              const Icon = LOOP_ICONS[i];
              const isActive = activeIndex === i && !isRingComplete;
              const isDone = i < activeIndex || ringIsFull;

              return (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: `calc(50% + ${pos.x}px)`,
                    top: `calc(50% + ${pos.y}px)`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div
                    className={clsx(
                      "flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-500",
                      isActive
                        ? "bg-black/90 text-product-green shadow-[0_0_22px_rgba(109,255,144,0.4)]"
                        : isDone
                          ? "bg-black/85 text-product-green/55 shadow-[0_0_10px_rgba(109,255,144,0.1)]"
                          : "bg-black/90 text-product-muted",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex flex-col items-center">
              <motion.div
                animate={{ scale: isEvolving || isRingComplete ? 1.04 : 1 }}
                transition={{ duration: 0.35 }}
                className="relative h-[280px] w-[280px] sm:h-[300px] sm:w-[300px]"
              >
                <div
                  className={clsx(
                    "absolute inset-[6%] rounded-full blur-2xl transition-colors duration-500",
                    isEvolving || isRingComplete
                      ? "bg-product-gold/20"
                      : "bg-product-green/12",
                  )}
                />
                <div className="relative h-full w-full overflow-hidden rounded-full bg-[#efece3]">
                  <PandaCanvasRenderer
                    stats={{
                      ...DEFAULT_PANDA_STATS,
                      experience: Math.floor(experience),
                      emotion: getPandaEmotion(activeIndex),
                    }}
                    showBackground
                    renderOptions={LOOP_RENDER_OPTIONS}
                    className="h-full w-full max-w-none"
                  />
                </div>
              </motion.div>

              <div className="mt-4">
                <div
                  className={clsx(
                    "rounded-full bg-black/90 px-6 py-2 backdrop-blur-md transition-all duration-300",
                    isEvolving
                      ? "shadow-[0_0_25px_rgba(225,186,92,0.35)]"
                      : "shadow-[0_0_25px_rgba(255,215,0,0.15)]",
                  )}
                >
                  <div className="flex items-center gap-5">
                    <span className="font-mono text-[12px] font-black uppercase tracking-tighter text-product-gold">
                      LVL {experienceTier}
                    </span>
                    <div className="h-4 w-px bg-product-line/30" />
                    <span className="font-mono text-[12px] font-black text-product-green">
                      {Math.floor(experience)}% XP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 w-full max-w-md px-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeIndex}-${isRingComplete}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.26 }}
              className="rounded-2xl bg-[linear-gradient(180deg,rgba(11,15,11,0.95)_0%,rgba(5,6,5,0.98)_100%)] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-product-green/10 text-product-green shadow-[inset_0_0_12px_rgba(109,255,144,0.08)]"
                >
                  {ActiveStepIcon && <ActiveStepIcon className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-product-green">
                    {isRingComplete
                      ? "Loop complete"
                      : `Step ${activeIndex + 1} of ${SEGMENT_COUNT}`}
                  </p>
                  <h4 className="mt-1 text-lg font-black tracking-tight text-product-text">
                    {isRingComplete ? "Skill Memory locked in" : TRAINING_LOOP[activeIndex]}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-product-muted">
                    {isRingComplete
                      ? "The training loop resets — watch the ring charge again from Market signal."
                      : getStepDescription(activeIndex)}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="h-1 overflow-hidden rounded-full bg-product-line/12">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-product-green-soft to-product-green"
                    style={{ width: `${fillRatio * 100}%` }}
                    transition={{ duration: 0.08 }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  {TRAINING_LOOP.map((_, i) => {
                    const stepFillRatio =
                      i < activeIndex ? 1 : i === activeIndex ? stepProgress : 0;
                    const isLit = ringIsFull || stepFillRatio > 0;

                    return (
                      <div
                        key={i}
                        className={clsx(
                          "h-1.5 rounded-full transition-all duration-300",
                          i === activeIndex && !isRingComplete ? "w-5" : "w-1.5",
                          isLit ? "bg-product-green" : "bg-product-line/20",
                          isLit && stepFillRatio < 1 && !isRingComplete && "opacity-70",
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] [background-image:linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] [background-size:40px_40px]"
      />
    </div>
  );
}
