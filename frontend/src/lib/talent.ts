export const TALENT_META: Record<
  number,
  { name: string; emoji: string; desc: string }
> = {
  0: { name: "无天赋", emoji: "", desc: "普通熊猫，靠努力成长" },
  1: { name: "趋势猎手", emoji: "🏹", desc: "顺势信号权重 +15%" },
  2: { name: "反向嗅觉", emoji: "🦊", desc: "逆向信号权重 +15%" },
  3: { name: "铁手腕", emoji: "🪨", desc: "止损触发阈值收紧 20%" },
  4: { name: "快手", emoji: "⚡", desc: "决策延迟 -30ms" },
  5: { name: "深度学习", emoji: "🧠", desc: "经验积累速率 +20%" },
  6: { name: "情绪免疫", emoji: "🛡️", desc: "情绪偏差系数 ×0.5" },
};

export function talentMeta(id: number) {
  return TALENT_META[id] ?? TALENT_META[0];
}

export function hasTalent(id: number): boolean {
  return id > 0;
}
