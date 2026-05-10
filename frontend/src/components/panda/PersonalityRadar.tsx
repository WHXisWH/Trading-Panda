"use client";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { PERSONALITY_AXES, type PersonalityKey } from "@/lib/personality";

interface Props {
  scores: Record<PersonalityKey, number>;
  size?: number;
}

export function PersonalityRadar({ scores, size = 220 }: Props) {
  const data = PERSONALITY_AXES.map((axis) => ({
    subject: axis.label,
    value: scores[axis.key],
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart
        data={data}
        margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
      >
        <PolarGrid stroke="#e8e0d8" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{
            fill: "#5c5248",
            fontSize: 12,
            fontFamily: "Noto Sans SC, sans-serif",
          }}
        />
        <Radar
          name="性格"
          dataKey="value"
          stroke="#4a7c59"
          fill="#4a7c59"
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
