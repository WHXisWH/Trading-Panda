"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  parsePandaStatsFromSearch,
  pandaStatsToSearchParams,
} from "@/lib/pandaLab";
import { PANDA_LAB_PRESETS } from "@/lib/pandaLabPresets";
import {
  DEFAULT_PANDA_STATS,
  mapApiEmotion,
  type PandaEmotion,
  type PandaStats,
} from "@/utils/pandaHelper";

const STORAGE_KEY = "trading-panda-lab-stats";

function clampStat(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function loadStored(): PandaStats | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PandaStats;
    if (typeof parsed.boldness !== "number") return null;
    return normalizeStats(parsed);
  } catch {
    return null;
  }
}

function normalizeStats(partial: {
  boldness?: number;
  patience?: number;
  intuition?: number;
  focus?: number;
  contrarian?: number;
  emotion?: string;
  experience?: number;
}): PandaStats {
  return {
    boldness: clampStat(partial.boldness ?? DEFAULT_PANDA_STATS.boldness),
    patience: clampStat(partial.patience ?? DEFAULT_PANDA_STATS.patience),
    intuition: clampStat(partial.intuition ?? DEFAULT_PANDA_STATS.intuition),
    focus: clampStat(partial.focus ?? DEFAULT_PANDA_STATS.focus),
    contrarian: clampStat(partial.contrarian ?? DEFAULT_PANDA_STATS.contrarian),
    emotion: mapApiEmotion(partial.emotion ?? DEFAULT_PANDA_STATS.emotion),
    experience: clampStat(partial.experience ?? DEFAULT_PANDA_STATS.experience),
  };
}

export function usePandaLabState() {
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<PandaStats>(DEFAULT_PANDA_STATS);
  const [hydrated, setHydrated] = useState(false);
  const [compareStats, setCompareStats] = useState<PandaStats | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [mintPreview, setMintPreview] = useState(true);

  useEffect(() => {
    const fromUrl = parsePandaStatsFromSearch(searchParams);
    const hasUrl = Object.values(fromUrl).some((v) => v !== undefined);
    const initial = hasUrl
      ? normalizeStats(fromUrl)
      : (loadStored() ?? DEFAULT_PANDA_STATS);
    setStats(initial);
    setHydrated(true);
  }, [searchParams]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    const qs = pandaStatsToSearchParams(stats);
    const next = `${window.location.pathname}?${qs}`;
    window.history.replaceState(null, "", next);
  }, [stats, hydrated]);

  const setAxis = useCallback(
    (key: keyof Omit<PandaStats, "emotion" | "experience">, value: number) => {
      setStats((s) => ({ ...s, [key]: clampStat(value) }));
    },
    []
  );

  const setExperience = useCallback((value: number) => {
    setStats((s) => ({ ...s, experience: clampStat(value) }));
  }, []);

  const setEmotion = useCallback((emotion: PandaEmotion) => {
    setStats((s) => ({ ...s, emotion }));
  }, []);

  const applyPreset = useCallback((id: string) => {
    const preset = PANDA_LAB_PRESETS.find((p) => p.id === id);
    if (preset) setStats(preset.stats);
  }, []);

  const randomize = useCallback(() => {
    const emotions: PandaEmotion[] = [
      "calm",
      "excited",
      "greedy",
      "cautious",
      "panic",
      "numb",
      "frustrated",
    ];
    setStats({
      boldness: Math.round(Math.random() * 100),
      patience: Math.round(Math.random() * 100),
      intuition: Math.round(Math.random() * 100),
      focus: Math.round(Math.random() * 100),
      contrarian: Math.round(Math.random() * 100),
      experience: Math.round(Math.random() * 100),
      emotion: emotions[Math.floor(Math.random() * emotions.length)]!,
    });
  }, []);

  const reset = useCallback(() => {
    setStats(DEFAULT_PANDA_STATS);
    setCompareStats(null);
    setShowCompare(false);
  }, []);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/panda-lab?${pandaStatsToSearchParams(stats)}`;
  }, [stats]);

  const copyShareLink = useCallback(async () => {
    await navigator.clipboard.writeText(shareUrl);
  }, [shareUrl]);

  const snapshotCompare = useCallback(() => {
    setCompareStats({ ...stats });
    setShowCompare(true);
  }, [stats]);

  return {
    stats,
    hydrated,
    compareStats,
    showCompare,
    mintPreview,
    setMintPreview,
    setAxis,
    setExperience,
    setEmotion,
    applyPreset,
    randomize,
    reset,
    shareUrl,
    copyShareLink,
    snapshotCompare,
    setShowCompare,
  };
}
