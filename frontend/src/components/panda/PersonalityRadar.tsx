"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { PERSONALITY_AXES, type PersonalityKey } from "@/lib/personality";
import { clsx } from "clsx";

interface Props {
  scores: Record<PersonalityKey, number>;
  size?: number;
  animated?: boolean;
  className?: string;
}

export function PersonalityRadar({
  scores,
  size = 220,
  animated = true,
  className,
}: Props) {
  const data = PERSONALITY_AXES.map((axis) => ({
    subject: axis.label,
    value: scores[axis.key],
    fullMark: 100,
  }));

  return (
    <div
      className={clsx(animated && "animate-radar-reveal", className)}
      style={{ width: "100%", maxWidth: "100%", height: size }}
    >
      <ResponsiveContainer width="100%" height={size}>
        <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="var(--color-border)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{
              fill: "var(--color-text-secondary)",
              fontSize: 12,
              fontFamily: "var(--font-body)",
            }}
          />
          <Radar
            name="性格"
            dataKey="value"
            stroke="var(--color-accent)"
            fill="var(--color-accent)"
            fillOpacity={0.2}
            strokeWidth={2}
            animationDuration={animated ? 500 : 0}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
