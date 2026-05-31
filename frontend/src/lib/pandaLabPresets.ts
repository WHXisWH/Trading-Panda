import type { PandaStats } from "@/utils/pandaHelper";

export interface PandaLabPreset {
  id: string;
  label: string;
  description: string;
  stats: PandaStats;
}

export const PANDA_LAB_PRESETS: PandaLabPreset[] = [
  {
    id: "balanced",
    label: "均衡",
    description: "五维中等，幼年学徒之间",
    stats: {
      boldness: 50,
      patience: 50,
      intuition: 50,
      focus: 50,
      contrarian: 50,
      emotion: "calm",
      experience: 35,
    },
  },
  {
    id: "bold-mature",
    label: "大胆成体",
    description: "高胆识 + 高经验",
    stats: {
      boldness: 92,
      patience: 40,
      intuition: 55,
      focus: 60,
      contrarian: 30,
      emotion: "excited",
      experience: 85,
    },
  },
  {
    id: "patient-calm",
    label: "耐心大师",
    description: "高耐性、低胆识",
    stats: {
      boldness: 18,
      patience: 88,
      intuition: 45,
      focus: 72,
      contrarian: 55,
      emotion: "calm",
      experience: 72,
    },
  },
  {
    id: "contrarian",
    label: "逆向者",
    description: "高逆向 + 谨慎脸",
    stats: {
      boldness: 45,
      patience: 50,
      intuition: 70,
      focus: 48,
      contrarian: 95,
      emotion: "cautious",
      experience: 55,
    },
  },
  {
    id: "panic-test",
    label: "恐慌测试",
    description: "极端情绪 + 幼年",
    stats: {
      boldness: 60,
      patience: 25,
      intuition: 80,
      focus: 35,
      contrarian: 60,
      emotion: "panic",
      experience: 12,
    },
  },
  {
    id: "boundary",
    label: "边界值",
    description: "全轴 0/100 与阶段临界",
    stats: {
      boldness: 100,
      patience: 0,
      intuition: 100,
      focus: 0,
      contrarian: 100,
      emotion: "frustrated",
      experience: 31,
    },
  },
];
