/** Programmatic ink-wash SVG layer fragments (viewBox 0 0 512 512) */

const INK = "#1A1A1A";
const PAPER = "#F5F5F0";
const BAMBOO = "#2D5A3D";
const VERMILLION = "#C23A3A";
const ROUGE = "#D4727A";
const GOLD = "#C8A432";

/** Base panda body — scale varies by growth stage */
function baseBody(scale: number, bellyY: number): string {
  const cx = 256;
  const headR = 72 * scale;
  const bodyW = 110 * scale;
  const bodyH = 95 * scale;
  return `
    <g id="panda-base">
      <ellipse cx="${cx}" cy="${bellyY + 20}" rx="${bodyW}" ry="${bodyH}" fill="${INK}" opacity="0.92"/>
      <circle cx="${cx - 55 * scale}" cy="${bellyY - 70}" r="${28 * scale}" fill="${INK}"/>
      <circle cx="${cx + 55 * scale}" cy="${bellyY - 70}" r="${28 * scale}" fill="${INK}"/>
      <circle cx="${cx}" cy="${bellyY - 95}" r="${headR}" fill="${INK}"/>
      <ellipse cx="${cx - 38 * scale}" cy="${bellyY - 100}" rx="${22 * scale}" ry="${26 * scale}" fill="${PAPER}"/>
      <ellipse cx="${cx + 38 * scale}" cy="${bellyY - 100}" rx="${22 * scale}" ry="${26 * scale}" fill="${PAPER}"/>
      <ellipse cx="${cx}" cy="${bellyY - 55}" rx="${38 * scale}" ry="${32 * scale}" fill="${PAPER}"/>
      <ellipse cx="${cx - 22 * scale}" cy="${bellyY + 35}" rx="${18 * scale}" ry="${22 * scale}" fill="${PAPER}" opacity="0.9"/>
      <ellipse cx="${cx + 22 * scale}" cy="${bellyY + 35}" rx="${18 * scale}" ry="${22 * scale}" fill="${PAPER}" opacity="0.9"/>
    </g>`;
}

export const bodyLayers: Record<string, string> = {
  infant: baseBody(0.85, 280) + `<g><rect x="200" y="340" width="112" height="8" rx="4" fill="${BAMBOO}" opacity="0.3"/></g>`,
  apprentice:
    baseBody(1.0, 265) +
    `<g id="vest"><path d="M196 310 L316 310 L300 380 L212 380 Z" fill="${BAMBOO}" opacity="0.75"/><line x1="256" y1="310" x2="256" y2="380" stroke="${INK}" stroke-width="2" opacity="0.4"/></g>`,
  mature:
    baseBody(1.08, 255) +
    `<g id="robe"><path d="M175 295 Q256 270 337 295 L350 420 Q256 440 162 420 Z" fill="${INK}" opacity="0.85"/><path d="M190 300 Q256 285 322 300" stroke="${BAMBOO}" stroke-width="3" fill="none" opacity="0.6"/></g>`,
};

/** Patience: handheld item + posture hint */
export function patienceLayer(tier: number): string {
  const items: Record<number, string> = {
    1: `<g id="patience-t1"><rect x="340" y="200" width="24" height="36" rx="4" fill="${VERMILLION}" opacity="0.7"/><text x="352" y="195" font-size="20" text-anchor="middle">⏳</text></g>`,
    5: `<g id="patience-t5"><ellipse cx="370" cy="320" rx="28" ry="12" fill="${BAMBOO}" opacity="0.5"/><path d="M355 310 Q370 300 385 310" stroke="${BAMBOO}" fill="none"/></g>`,
    10: `<g id="patience-t10"><ellipse cx="365" cy="315" rx="32" ry="14" fill="#8B4513" opacity="0.8"/><path d="M350 300 Q365 285 380 300" stroke="#5c3a1e" fill="none"/><ellipse cx="365" cy="280" rx="40" ry="25" fill="${INK}" opacity="0.08"/><ellipse cx="365" cy="270" rx="30" ry="18" fill="${INK}" opacity="0.05"/></g>`,
  };
  if (items[tier]) return items[tier];
  const calm = tier >= 6;
  return `<g id="patience-t${tier}"><circle cx="370" cy="310" r="${8 + tier}" fill="${calm ? BAMBOO : VERMILLION}" opacity="${0.3 + tier * 0.05}"/></g>`;
}

/** Boldness: headband */
export function boldnessLayer(tier: number): string {
  const bands: Record<number, string> = {
    1: `<g id="boldness-t1"><rect x="210" y="155" width="92" height="28" rx="14" fill="#888" opacity="0.5"/><circle cx="230" cy="168" r="14" fill="#ccc" stroke="${INK}" stroke-width="2"/></g>`,
    5: `<g id="boldness-t5"><path d="M195 165 Q256 150 317 165 L315 180 Q256 168 197 180 Z" fill="${BAMBOO}" opacity="0.85"/></g>`,
    10: `<g id="boldness-t10"><path d="M188 160 Q256 140 324 160 L322 185 Q256 170 190 185 Z" fill="${VERMILLION}"/><circle cx="256" cy="158" r="8" fill="${VERMILLION}" opacity="0.9"/><path d="M200 155 Q256 135 312 155" stroke="${PAPER}" stroke-width="3" fill="none" opacity="0.4"/></g>`,
  };
  if (bands[tier]) return bands[tier];
  const color = tier < 5 ? "#ccc" : tier < 8 ? BAMBOO : VERMILLION;
  return `<g id="boldness-t${tier}"><path d="M200 168 Q256 ${160 - tier} 312 168 L310 178 Q256 172 202 178 Z" fill="${color}" opacity="${0.4 + tier * 0.06}"/></g>`;
}

/** Intuition: ears + aura */
export function intuitionLayer(tier: number): string {
  const earH = 15 + tier * 4;
  const aura = tier >= 5 ? `<ellipse cx="256" cy="200" rx="${60 + tier * 5}" ry="${50 + tier * 3}" fill="${INK}" opacity="${0.03 + tier * 0.008}"/>` : "";
  const special: Record<number, string> = {
    1: `<g id="intuition-t1"><ellipse cx="200" cy="175" rx="18" ry="10" fill="${INK}" transform="rotate(-25 200 175)"/><ellipse cx="312" cy="175" rx="18" ry="10" fill="${INK}" transform="rotate(25 312 175)"/></g>`,
    10: aura + `<g id="intuition-t10"><ellipse cx="185" cy="165" rx="22" ry="${earH}" fill="${INK}" transform="rotate(-35 185 165)"/><ellipse cx="327" cy="165" rx="22" ry="${earH}" fill="${INK}" transform="rotate(35 327 165)"/>${Array.from({ length: 6 }, (_, i) => `<circle cx="${220 + i * 15}" cy="${140 + (i % 2) * 10}" r="4" fill="${INK}" opacity="0.15"/>`).join("")}</g>`,
  };
  if (special[tier]) return special[tier];
  return `<g id="intuition-t${tier}">${aura}<ellipse cx="192" cy="168" rx="20" ry="${8 + tier}" fill="${INK}" transform="rotate(-${20 + tier} 192 168)"/><ellipse cx="320" cy="168" rx="20" ry="${8 + tier}" fill="${INK}" transform="rotate(${20 + tier} 320 168)"/></g>`;
}

/** Focus: eye rings + monocle at high tier */
export function focusLayer(tier: number): string {
  const ring = (cx: number) => {
    const r = 18 + (tier >= 7 ? 4 : 0);
    const stroke = tier >= 5 ? INK : "#666";
    const sw = tier >= 8 ? 5 : tier >= 5 ? 3 : 1.5;
    return `<ellipse cx="${cx}" cy="218" rx="${r}" ry="${r + 4}" fill="none" stroke="${stroke}" stroke-width="${sw}" opacity="${0.5 + tier * 0.05}"/>`;
  };
  const monocle =
    tier >= 7
      ? `<circle cx="294" cy="218" r="22" fill="none" stroke="${BAMBOO}" stroke-width="3"/><line x1="316" y1="218" x2="340" y2="200" stroke="${BAMBOO}" stroke-width="2"/>`
      : "";
  const pupils =
    tier >= 5
      ? `<circle cx="218" cy="220" r="6" fill="${INK}"/><circle cx="294" cy="220" r="6" fill="${INK}"/><circle cx="220" cy="218" r="2" fill="${PAPER}"/><circle cx="296" cy="218" r="2" fill="${PAPER}"/>`
      : `<circle cx="218" cy="222" r="5" fill="${INK}" opacity="0.7"/><circle cx="294" cy="224" r="4" fill="${INK}" opacity="0.5"/>`;
  return `<g id="focus-t${tier}">${ring(218)}${ring(294)}${pupils}${monocle}</g>`;
}

/** Contrarian: back seal */
export function contrarianLayer(tier: number): string {
  if (tier <= 2) return `<g id="contrarian-t${tier}"></g>`;
  const invert = tier >= 7 ? `<rect x="175" y="250" width="162" height="140" fill="${INK}" opacity="${(tier - 6) * 0.12}" rx="20"/>` : "";
  const seal =
    tier >= 5
      ? `<text x="256" y="330" text-anchor="middle" font-size="${20 + tier * 2}" fill="${tier >= 8 ? VERMILLION : INK}" font-family="serif" opacity="0.85">${tier >= 9 ? "悟" : tier >= 5 ? "逆" : "正"}</text>`
      : "";
  return `<g id="contrarian-t${tier}">${invert}${seal}</g>`;
}

export const emotionLayers: Record<string, string> = {
  calm: `<g id="emo-calm"><path d="M228 235 Q256 245 284 235" stroke="${INK}" stroke-width="3" fill="none" opacity="0.6"/></g>`,
  excited: `<g id="emo-excited"><ellipse cx="210" cy="248" rx="12" ry="8" fill="${ROUGE}" opacity="0.5"/><ellipse cx="302" cy="248" rx="12" ry="8" fill="${ROUGE}" opacity="0.5"/><path d="M230 250 Q256 270 282 250" stroke="${INK}" stroke-width="3" fill="none"/><text x="180" y="180" font-size="16">✨</text><text x="320" y="175" font-size="14">✨</text></g>`,
  greedy: `<g id="emo-greedy"><text x="218" y="225" font-size="14">★</text><text x="290" y="225" font-size="14">★</text><path d="M232 248 Q256 262 280 248" stroke="${INK}" stroke-width="3" fill="none"/><circle cx="150" cy="200" r="6" fill="${GOLD}" opacity="0.7"/><circle cx="360" cy="210" r="5" fill="${GOLD}" opacity="0.6"/></g>`,
  cautious: `<g id="emo-cautious"><path d="M205 212 L230 218" stroke="${INK}" stroke-width="2"/><path d="M307 212 L282 218" stroke="${INK}" stroke-width="2"/><line x1="248" y1="252" x2="264" y2="252" stroke="${INK}" stroke-width="3"/><text x="256" y="155" text-anchor="middle" font-size="18">?</text></g>`,
  panic: `<g id="emo-panic"><ellipse cx="218" cy="222" rx="3" ry="8" fill="${INK}"/><ellipse cx="294" cy="222" rx="3" ry="8" fill="${INK}"/><ellipse cx="256" cy="258" rx="18" ry="14" fill="${PAPER}"/><text x="170" y="190" font-size="14">💦</text><text x="330" y="195" font-size="12">💦</text></g>`,
  numb: `<g id="emo-numb"><line x1="230" y1="222" x2="250" y2="222" stroke="#999" stroke-width="2"/><line x1="262" y1="222" x2="282" y2="222" stroke="#999" stroke-width="2"/><line x1="248" y1="252" x2="264" y2="252" stroke="#999" stroke-width="2"/><circle cx="380" cy="160" r="20" fill="#ddd" opacity="0.4"/></g>`,
  frustrated: `<g id="emo-frustrated"><path d="M200 208 L235 220" stroke="${VERMILLION}" stroke-width="3"/><path d="M312 208 L277 220" stroke="${VERMILLION}" stroke-width="3"/><rect x="240" y="248" width="32" height="6" rx="2" fill="${INK}"/><text x="256" y="145" text-anchor="middle" font-size="20">💢</text></g>`,
};

/** Build full layer maps for tiers 1-10 */
function buildTierMap(fn: (t: number) => string): Record<number, string> {
  const m: Record<number, string> = {};
  for (let t = 1; t <= 10; t++) m[t] = fn(t);
  return m;
}

export const patienceLayers = buildTierMap(patienceLayer);
export const boldnessLayers = buildTierMap(boldnessLayer);
export const intuitionLayers = buildTierMap(intuitionLayer);
export const focusLayers = buildTierMap(focusLayer);
export const contrarianLayers = buildTierMap(contrarianLayer);
