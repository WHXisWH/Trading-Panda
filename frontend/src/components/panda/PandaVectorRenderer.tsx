"use client";

import { useId } from "react";
import { clsx } from "clsx";
import {
  buildPandaVisualModel,
  type PandaTraitKey,
} from "@/utils/pandaVisualModel";
import type { PandaStats } from "@/utils/pandaHelper";

interface PandaVectorRendererProps {
  stats: PandaStats;
  className?: string;
  showBackground?: boolean;
}

const TRAIT_ACCENTS: Record<PandaTraitKey, string> = {
  boldness: "#cf4b3f",
  patience: "#4f8f5f",
  intuition: "#c3a64b",
  focus: "#4f83a5",
  contrarian: "#925a86",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mix(min: number, max: number, value: number): number {
  return min + (max - min) * clamp(value, 0, 1);
}

function hasTrait(activeTraits: PandaTraitKey[], trait: PandaTraitKey): boolean {
  return activeTraits.includes(trait);
}

export function PandaVectorRenderer({
  stats,
  className,
  showBackground = true,
}: PandaVectorRendererProps) {
  const rawId = useId().replace(/:/g, "");
  const model = buildPandaVisualModel(stats);
  const activeTraits = model.activeTraits;
  const primaryAccent = TRAIT_ACCENTS[model.primaryTrait];

  const bold = model.traits.boldness.score;
  const patient = model.traits.patience.score;
  const intuitive = model.traits.intuition.score;
  const focused = model.traits.focus.score;
  const contrary = model.traits.contrarian.score;

  const leftArmRotation = -18 - model.pose.armSpread * 0.35;
  const rightArmRotation = 18 + model.pose.armSpread * 0.35;
  const stanceOffset = model.pose.stance;
  const gazeShift = model.pose.gazeShift;
  const eyeOpen = mix(0.9, 2.9, model.expression.eyeOpen);
  const blushOpacity = model.expression.blush;
  const smile = model.expression.smile;
  const browTilt = model.expression.browTilt;
  const strongBoldness = hasTrait(activeTraits, "boldness") && bold >= 0.78;
  const strongPatience = hasTrait(activeTraits, "patience") && patient >= 0.78;
  const strongIntuition = hasTrait(activeTraits, "intuition") && intuitive >= 0.78;
  const strongFocus = hasTrait(activeTraits, "focus") && focused >= 0.78;
  const strongContrarian = hasTrait(activeTraits, "contrarian") && contrary >= 0.78;

  const mouthPath =
    smile < -0.25
      ? "M45.4 50.6 Q50 47.8 54.6 50.6"
      : smile < 0.12
        ? "M45.4 50.2 L54.6 50.2"
        : `M45.4 49.3 Q50 ${50.2 + smile * 5.2} 54.6 49.3`;

  return (
    <div
      className={clsx(
        "vector-panda aspect-square w-full max-w-[384px] select-none",
        className
      )}
    >
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        role="img"
        aria-label="Trading Panda avatar"
      >
        <defs>
          <linearGradient id={`${rawId}-fur`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fffdf7" />
            <stop offset="100%" stopColor="#ede6d9" />
          </linearGradient>
          <linearGradient id={`${rawId}-ink`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#242728" />
            <stop offset="100%" stopColor="#111514" />
          </linearGradient>
          <linearGradient id={`${rawId}-accent`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={primaryAccent} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#2f6c49" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id={`${rawId}-cheek`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e98591" stopOpacity="0.48" />
            <stop offset="100%" stopColor="#e98591" stopOpacity="0" />
          </radialGradient>
        </defs>

        {showBackground && (
          <>
            <rect width="100" height="100" rx="10" fill="#f2eee5" />
            <path
              d="M9 76 C24 68 38 69 53 76 C68 84 82 84 93 78"
              fill="none"
              stroke="#d9cdbb"
              strokeWidth="1"
              opacity="0.65"
            />
            <path
              d="M11 24 C22 19 31 19 42 23 M61 19 C72 15 82 17 91 22"
              fill="none"
              stroke="#d9cdbb"
              strokeWidth="1"
              opacity="0.42"
            />
          </>
        )}

        <ellipse cx="50" cy="86" rx="24" ry="5.2" fill="#1d1f1d" opacity="0.14" />
        <path
          d="M28 83 C39 88 61 88 72 83"
          fill="none"
          stroke={primaryAccent}
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.45"
        />

        {hasTrait(activeTraits, "boldness") && (
          <path
            d="M29 55 C21 61 18 73 24 81 C32 77 34 65 31 55 Z"
            fill="#cf4b3f"
            opacity={strongBoldness ? 0.6 : 0.34}
          />
        )}

        <g
          transform={`translate(50 66) scale(${model.pose.bodyScale}) translate(-50 -66)`}
        >
          <ellipse
            cx={41 - stanceOffset * 0.6}
            cy="79.5"
            rx="7"
            ry="5"
            fill={`url(#${rawId}-ink)`}
            transform={`rotate(${-8 - stanceOffset} ${41 - stanceOffset * 0.6} 79.5)`}
          />
          <ellipse
            cx={59 + stanceOffset * 0.6}
            cy="79.5"
            rx="7"
            ry="5"
            fill={`url(#${rawId}-ink)`}
            transform={`rotate(${8 + stanceOffset} ${59 + stanceOffset * 0.6} 79.5)`}
          />

          <g transform={`rotate(${leftArmRotation} 36 61)`}>
            <path
              d="M35 58 C26 60 23 70 29 73 C36 76 39 68 39 61 Z"
              fill={`url(#${rawId}-ink)`}
            />
            {hasTrait(activeTraits, "patience") && (
              <circle cx="30.5" cy="69" r="1.8" fill="#4f8f5f" opacity="0.85" />
            )}
          </g>
          <g transform={`rotate(${rightArmRotation} 64 61)`}>
            <path
              d="M65 58 C74 60 77 70 71 73 C64 76 61 68 61 61 Z"
              fill={`url(#${rawId}-ink)`}
            />
          </g>

          <ellipse cx="50" cy="65" rx="17.2" ry="19.8" fill={`url(#${rawId}-ink)`} />
          <ellipse cx="50" cy="67.5" rx="12.2" ry="14.6" fill={`url(#${rawId}-fur)`} />

          {model.stage === "apprentice" && (
            <path
              d="M37 58 C43 62 57 62 63 58 L61 76 C56 79 44 79 39 76 Z"
              fill="#3f7b51"
              opacity="0.78"
            />
          )}
          {model.stage === "mature" && (
            <>
              <path
                d="M34 58 C42 55 58 55 66 58 L64 78 C58 82 42 82 36 78 Z"
                fill="#25372c"
                opacity="0.86"
              />
              <path
                d="M38 59 C43 64 57 64 62 59"
                fill="none"
                stroke="#bda653"
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.9"
              />
            </>
          )}

          {hasTrait(activeTraits, "focus") && (
            <g opacity={strongFocus ? 0.95 : 0.68}>
              <circle cx="50" cy="66.5" r={strongFocus ? 4.1 : 3.2} fill="none" stroke="#4f83a5" strokeWidth="1.2" />
              <circle cx="50" cy="66.5" r="1.7" fill="#4f83a5" opacity="0.78" />
            </g>
          )}

          {hasTrait(activeTraits, "boldness") && (
            <path
              d="M37 55 C44 58 56 58 63 55 L63 59 C56 63 44 63 37 59 Z"
              fill="#cf4b3f"
              opacity={strongBoldness ? 0.95 : 0.76}
            />
          )}
        </g>

        {hasTrait(activeTraits, "patience") && (
          <g transform="translate(71 63)" opacity={strongPatience ? 0.95 : 0.72}>
            <path
              d="M0 17 C4 9 4 3 1 -4"
              fill="none"
              stroke="#4f8f5f"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <ellipse cx="-2" cy="5" rx="4.2" ry="2.1" fill="#4f8f5f" transform="rotate(-25 -2 5)" />
            <ellipse cx="3" cy="10" rx="4.3" ry="2.1" fill="#4f8f5f" transform="rotate(25 3 10)" />
          </g>
        )}

        <g
          transform={`translate(50 38) scale(${model.pose.headScale}) translate(-50 -38)`}
        >
          {hasTrait(activeTraits, "intuition") && (
            <g opacity={strongIntuition ? 0.78 : 0.45}>
              <path
                d="M24 35 C29 22 39 15 50 14 C61 15 71 22 76 35"
                fill="none"
                stroke="#c3a64b"
                strokeWidth="1"
                strokeLinecap="round"
                strokeDasharray="2.2 3"
              />
              <circle cx="24" cy="35" r="1.2" fill="#c3a64b" />
              <circle cx="76" cy="35" r="1.2" fill="#c3a64b" />
            </g>
          )}

          <g transform={`rotate(${-8 - model.pose.earTilt} 33 22)`}>
            <circle cx="33" cy="22" r="8.4" fill={`url(#${rawId}-ink)`} />
            <circle cx="33" cy="22" r="4.2" fill="#3b3e39" opacity="0.52" />
          </g>
          <g transform={`rotate(${8 + model.pose.earTilt} 67 22)`}>
            <circle cx="67" cy="22" r="8.4" fill={`url(#${rawId}-ink)`} />
            <circle cx="67" cy="22" r="4.2" fill="#3b3e39" opacity="0.52" />
          </g>

          <ellipse cx="50" cy="39" rx="25" ry="21" fill={`url(#${rawId}-fur)`} />
          <path
            d="M29 34 C31 24 39 20 46 24 C42 29 40 36 41 44 C36 44 31 40 29 34 Z"
            fill={`url(#${rawId}-ink)`}
          />
          <path
            d="M71 34 C69 24 61 20 54 24 C58 29 60 36 59 44 C64 44 69 40 71 34 Z"
            fill={`url(#${rawId}-ink)`}
          />

          {hasTrait(activeTraits, "contrarian") && (
            <g opacity={strongContrarian ? 0.96 : 0.72}>
              <path
                d="M45 19 C48 11 54 13 54 20 C58 15 63 19 58 25 C53 23 49 22 45 19 Z"
                fill="#f8f5ec"
                stroke="#1c211f"
                strokeWidth="0.8"
              />
              <path
                d="M55 18 C57 15 60 16 60 20"
                fill="none"
                stroke="#925a86"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </g>
          )}

          {model.stage === "infant" && (
            <g>
              <circle cx="50" cy="52" r="3.3" fill="#e7aab4" stroke="#1c211f" strokeWidth="0.8" />
              <path
                d="M47.8 54.2 C48.6 58 51.4 58 52.2 54.2"
                fill="none"
                stroke="#e7aab4"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </g>
          )}

          {hasTrait(activeTraits, "boldness") && (
            <path
              d="M30.5 31 C39 28 61 28 69.5 31 L68.5 35 C59 32 41 32 31.5 35 Z"
              fill="#cf4b3f"
              opacity={strongBoldness ? 0.96 : 0.68}
            />
          )}

          {hasTrait(activeTraits, "focus") && (
            <path
              d="M47.2 28.5 L50 25.8 L52.8 28.5 L50 31.2 Z"
              fill="#4f83a5"
              opacity={strongFocus ? 0.95 : 0.68}
            />
          )}

          <g transform={`translate(${gazeShift} 0)`}>
            <ellipse cx="39" cy="39.4" rx="3.1" ry={eyeOpen} fill="#fffaf0" />
            <ellipse cx="61" cy="39.4" rx="3.1" ry={eyeOpen} fill="#fffaf0" />
            <circle cx="39.2" cy="39.2" r="1.25" fill="#111514" />
            <circle cx="61.2" cy="39.2" r="1.25" fill="#111514" />
            <circle cx="38.7" cy="38.6" r="0.45" fill="#fffdf7" />
            <circle cx="60.7" cy="38.6" r="0.45" fill="#fffdf7" />
          </g>

          {browTilt > 0.2 && (
            <g opacity={clamp(browTilt, 0.35, 0.95)}>
              <path
                d="M35 33.6 L43 36"
                stroke="#111514"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <path
                d="M65 33.6 L57 36"
                stroke="#111514"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </g>
          )}

          <circle cx="35" cy="46" r="5" fill={`url(#${rawId}-cheek)`} opacity={blushOpacity} />
          <circle cx="65" cy="46" r="5" fill={`url(#${rawId}-cheek)`} opacity={blushOpacity} />
          <path d="M46.4 45.3 Q50 42.8 53.6 45.3 Q50 48 46.4 45.3 Z" fill="#111514" />
          <path
            d={mouthPath}
            fill="none"
            stroke="#111514"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {model.emotion === "excited" && (
            <path
              d="M47 51.2 Q50 54.6 53 51.2 Q50 56.1 47 51.2 Z"
              fill="#d87582"
              opacity="0.85"
            />
          )}

          {model.emotion === "greedy" && (
            <g opacity="0.86">
              <circle cx="27" cy="31" r="2.1" fill="#c3a64b" />
              <circle cx="73" cy="34" r="1.8" fill="#c3a64b" />
              <path
                d="M52.7 50 C53 52.8 54.6 53.6 55.8 52.4"
                fill="none"
                stroke="#6fb5c7"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </g>
          )}

          {(model.emotion === "cautious" || model.emotion === "panic") && (
            <path
              d="M71 39 C73 41.8 72.2 44 70.3 44 C68.5 44 68 41.8 71 39 Z"
              fill="#6ca6c8"
              opacity={model.emotion === "panic" ? 0.9 : 0.65}
            />
          )}

          {model.emotion === "frustrated" && (
            <g opacity="0.72">
              <path d="M38 43 C37 49 36.3 52 34.8 54" fill="none" stroke="#5e9cc1" strokeWidth="1.1" strokeLinecap="round" />
              <path d="M62 43 C63 49 63.7 52 65.2 54" fill="none" stroke="#5e9cc1" strokeWidth="1.1" strokeLinecap="round" />
            </g>
          )}

          {strongContrarian && (
            <path
              d="M68 28 L71 31 M71 28 L68 31"
              stroke="#925a86"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          )}
        </g>

        {hasTrait(activeTraits, "intuition") && (
          <g opacity={strongIntuition ? 0.9 : 0.58}>
            <path d="M23 53 L25 56 L28 54 L25.8 57 L28 60 L24.8 58 L22 60 L24 56.8 Z" fill="#c3a64b" />
          </g>
        )}
      </svg>
    </div>
  );
}
