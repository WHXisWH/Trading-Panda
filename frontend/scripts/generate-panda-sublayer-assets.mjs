import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const FRONTEND_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO_ROOT = dirname(FRONTEND_ROOT);
const ROOT = join(FRONTEND_ROOT, "public/assets/panda");
const TMP_IMAGEGEN_ROOT = join(REPO_ROOT, "tmp/imagegen");
const WORKSPACE_ROOT = "frontend/public/assets/panda";
const IMAGE_SIZE = 1254;
const CANVAS_SIZE = 512;
const TIERS = Array.from({ length: 10 }, (_, index) => index + 1);
const SMOKE_TIERS = new Set([1, 5, 10]);

const ANCHOR_POLICIES = [
  "faceTopCenter",
  "leftEyeCenter",
  "rightEyeCenter",
  "eyesMidpoint",
  "mouthCenter",
  "bodyCenter",
  "upperBodyCenter",
  "feetBase",
  "headCenterOffset",
  "worldAura",
];

const BBOX_POLICIES = [
  "fullExperience",
  "headband",
  "cape",
  "weaponSide",
  "auraPeripheral",
  "bodySideMark",
  "monocle",
  "chestCore",
  "intuitionNoFaceFeatures",
  "groundProp",
  "groundSideProp",
  "emotionEyes",
  "emotionBrows",
  "emotionMouth",
  "emotionExtras",
];

const SUBLAYERS = [
  {
    attribute: "boldness",
    sublayer: "headband",
    anchorPolicy: "faceTopCenter",
    zIndex: 64,
    opacityRule: "trait",
    bboxPolicy: "headband",
    role: "single high-forehead cinnabar courage band; must sit above eye centers",
    promptSubject: "one compact cinnabar ink headband above the forehead",
    forbidden: "eyes, pupils, eyebrows, mouth, full face, full panda, body props, background, text, watermark",
  },
  {
    attribute: "boldness",
    sublayer: "cape",
    anchorPolicy: "upperBodyCenter",
    zIndex: 42,
    opacityRule: "trait",
    bboxPolicy: "cape",
    role: "single shoulder cape brush shape behind upper body",
    promptSubject: "one red-black shoulder cape brush shape, upper body only",
    forbidden: "eyes, pupils, eyebrows, mouth, full face, full panda, diagonal face-crossing weapon, background, text, watermark",
  },
  {
    attribute: "boldness",
    sublayer: "weapon",
    anchorPolicy: "bodyCenter",
    zIndex: 46,
    opacityRule: "trait",
    bboxPolicy: "weaponSide",
    role: "single side weapon silhouette parked outside face until hand anchors exist",
    promptSubject: "one compact side weapon silhouette beside the torso",
    forbidden: "handheld weapon crossing the face, eyes, mouth, full panda, background, text, watermark",
  },
  {
    attribute: "contrarian",
    sublayer: "aura",
    anchorPolicy: "worldAura",
    zIndex: 12,
    opacityRule: "aura",
    bboxPolicy: "auraPeripheral",
    role: "single peripheral reversal aura around the character silhouette",
    promptSubject: "one asymmetric black ink reversal aura outside the invisible panda silhouette",
    forbidden: "dense smoke over face, symbols on eyes, full panda, opaque corners, background, text, watermark",
  },
  {
    attribute: "contrarian",
    sublayer: "mark",
    anchorPolicy: "upperBodyCenter",
    anchorOffset: { x: 128, y: -2 },
    zIndex: 58,
    opacityRule: "trait",
    bboxPolicy: "bodySideMark",
    role: "single abstract side seal mark near shoulder or torso",
    promptSubject: "one small abstract cinnabar seal mark beside the upper torso",
    forbidden: "readable characters, eye symbols, mouth coverage, full panda, background, text, watermark",
  },
  {
    attribute: "focus",
    sublayer: "monocle",
    anchorPolicy: "rightEyeCenter",
    zIndex: 72,
    opacityRule: "trait",
    bboxPolicy: "monocle",
    role: "single ring around the right-eye target; must not replace both eyes",
    promptSubject: "one thin bamboo-tech monocle ring around the right eye target",
    forbidden: "second eye overlay, full face, full panda, mouth, body props, background, text, watermark",
  },
  {
    attribute: "focus",
    sublayer: "headband",
    anchorPolicy: "faceTopCenter",
    zIndex: 66,
    opacityRule: "trait",
    bboxPolicy: "headband",
    role: "single analytical headband above eye centers",
    promptSubject: "one precise bamboo-green analytical headband above the forehead",
    forbidden: "eyes, pupils, eyebrows, mouth, full face, full panda, background, text, watermark",
  },
  {
    attribute: "focus",
    sublayer: "chest-core",
    anchorPolicy: "upperBodyCenter",
    zIndex: 54,
    opacityRule: "trait",
    bboxPolicy: "chestCore",
    role: "single compact analysis core on upper body below face",
    promptSubject: "one compact glowing analysis core on the upper torso",
    forbidden: "face overlay, eyes, mouth, full panda, background, text, watermark",
  },
  {
    attribute: "intuition",
    sublayer: "ear-radar",
    anchorPolicy: "headCenterOffset",
    anchorOffset: { x: -116, y: -18 },
    zIndex: 88,
    opacityRule: "trait",
    bboxPolicy: "intuitionNoFaceFeatures",
    role: "single external ear-side radar accent; not an eye or gaze asset",
    promptSubject: "one external ear-side sensing arc cluster",
    forbidden: "eyes, pupils, eyebrows, eye glow, eye rings, gaze beams, facial expression changes, full face, full panda, background, text, watermark",
  },
  {
    attribute: "intuition",
    sublayer: "particles",
    anchorPolicy: "headCenterOffset",
    anchorOffset: { x: 0, y: 0 },
    zIndex: 89,
    opacityRule: "trait",
    bboxPolicy: "intuitionNoFaceFeatures",
    role: "small ambient sensing particles around face perimeter; not eye-related",
    promptSubject: "small ambient insight particles around the outside of the face boundary",
    forbidden: "eyes, pupils, eyebrows, eye glow, eye rings, gaze beams, facial expression changes, full face, full panda, background, text, watermark",
  },
  {
    attribute: "intuition",
    sublayer: "halo",
    anchorPolicy: "headCenterOffset",
    anchorOffset: { x: 0, y: -92 },
    zIndex: 90,
    opacityRule: "trait",
    bboxPolicy: "intuitionNoFaceFeatures",
    role: "single external sensing halo above head; never covers eyes or mouth",
    promptSubject: "one compact external sensing halo above the head",
    forbidden: "eyes, pupils, eyebrows, eye glow, eye rings, gaze beams, facial expression changes, full face, full panda, background, text, watermark",
  },
  {
    attribute: "patience",
    sublayer: "ground-prop",
    anchorPolicy: "feetBase",
    zIndex: 18,
    opacityRule: "trait",
    bboxPolicy: "groundProp",
    role: "single ground mat or stone prop at the feet baseline",
    promptSubject: "one calm ground mat or stone prop under the feet baseline",
    forbidden: "face overlay, eye coverage, mouth coverage, floating body prop, full panda, background, text, watermark",
  },
  {
    attribute: "patience",
    sublayer: "bamboo",
    anchorPolicy: "feetBase",
    anchorOffset: { x: 154, y: -72 },
    zIndex: 48,
    opacityRule: "trait",
    bboxPolicy: "groundSideProp",
    role: "single side bamboo stalk rising from ground; must not cover face",
    promptSubject: "one side bamboo stalk rooted near the ground",
    forbidden: "face overlay, eyes, mouth, full panda, background, text, watermark",
  },
  {
    attribute: "patience",
    sublayer: "tea",
    anchorPolicy: "feetBase",
    anchorOffset: { x: -122, y: -26 },
    zIndex: 50,
    opacityRule: "trait",
    bboxPolicy: "groundSideProp",
    role: "single ground-side tea cup prop",
    promptSubject: "one small tea cup prop beside the feet",
    forbidden: "floating across face, eyes, mouth, full panda, background, text, watermark",
  },
  {
    attribute: "emotion",
    sublayer: "eyes",
    anchorPolicy: "eyesMidpoint",
    zIndex: 80,
    opacityRule: "emotion",
    bboxPolicy: "emotionEyes",
    role: "primary expression eye marks only",
    promptSubject: "only the eye marks for the requested emotion",
    forbidden: "body props, aura, full face, full panda, background, text, watermark",
  },
  {
    attribute: "emotion",
    sublayer: "brows",
    anchorPolicy: "eyesMidpoint",
    anchorOffset: { x: 0, y: -34 },
    zIndex: 81,
    opacityRule: "emotion",
    bboxPolicy: "emotionBrows",
    role: "primary expression brow marks only",
    promptSubject: "only the brow marks for the requested emotion",
    forbidden: "body props, aura, full face, full panda, background, text, watermark",
  },
  {
    attribute: "emotion",
    sublayer: "mouth",
    anchorPolicy: "mouthCenter",
    zIndex: 82,
    opacityRule: "emotion",
    bboxPolicy: "emotionMouth",
    role: "primary expression mouth mark only",
    promptSubject: "only the mouth mark for the requested emotion",
    forbidden: "body props, aura, full face, full panda, background, text, watermark",
  },
  {
    attribute: "emotion",
    sublayer: "extras",
    anchorPolicy: "eyesMidpoint",
    anchorOffset: { x: 112, y: 20 },
    zIndex: 83,
    opacityRule: "emotion",
    bboxPolicy: "emotionExtras",
    role: "small emotion extras near face edge only",
    promptSubject: "only small face-edge emotion extras such as sweat, blush, or coin spark",
    forbidden: "body props, aura, full face, full panda, background, text, watermark",
  },
];

const LEGACY_ASSETS = {
  status: "temporary-fallback",
  compatibilityStrategy:
    "Old broad-layer directories are retained only as temporary archived assets. Sublayer manifest, renderer, audit, and Panda Lab QA now use sublayer assets only; do not load these broad-layer files in the renderer.",
  directories: [
    "traits/boldness/tier-*.png",
    "traits/intuition/tier-*.png",
    "emotions/tier-*.png",
  ],
};

const EMOTION_LABELS = {
  1: "numb",
  2: "low-calm",
  3: "calm",
  4: "cautious",
  5: "focused",
  6: "excited",
  7: "frustrated",
  8: "greedy",
  9: "nervous",
  10: "panic",
};

function pad(n) {
  return String(n).padStart(2, "0");
}

function publicSrc(attribute, sublayer, tier) {
  const file = `tier-${pad(tier)}.png`;
  if (attribute === "emotion") return `/assets/panda/emotions/${sublayer}/${file}`;
  return `/assets/panda/traits/${attribute}/${sublayer}/${file}`;
}

function localPathFromSrc(src) {
  return join(ROOT, src.replace("/assets/panda/", ""));
}

function scale(value) {
  return Math.round((value / CANVAS_SIZE) * IMAGE_SIZE);
}

function colorFromHex(hex, alpha = 255) {
  const normalized = hex.replace("#", "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
    alpha,
  ];
}

function createImage() {
  return Buffer.alloc(IMAGE_SIZE * IMAGE_SIZE * 4);
}

function blendPixel(buffer, x, y, rgba) {
  if (x < 0 || y < 0 || x >= IMAGE_SIZE || y >= IMAGE_SIZE) return;
  const i = (y * IMAGE_SIZE + x) * 4;
  const sourceA = rgba[3] / 255;
  const targetA = buffer[i + 3] / 255;
  const outA = sourceA + targetA * (1 - sourceA);
  if (outA <= 0) return;
  buffer[i] = Math.round((rgba[0] * sourceA + buffer[i] * targetA * (1 - sourceA)) / outA);
  buffer[i + 1] = Math.round((rgba[1] * sourceA + buffer[i + 1] * targetA * (1 - sourceA)) / outA);
  buffer[i + 2] = Math.round((rgba[2] * sourceA + buffer[i + 2] * targetA * (1 - sourceA)) / outA);
  buffer[i + 3] = Math.round(outA * 255);
}

function drawRect(buffer, rect, rgba) {
  const x0 = scale(rect.x);
  const y0 = scale(rect.y);
  const x1 = scale(rect.x + rect.width);
  const y1 = scale(rect.y + rect.height);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      blendPixel(buffer, x, y, rgba);
    }
  }
}

function drawEllipse(buffer, center, radius, rgba, options = {}) {
  const cx = scale(center.x);
  const cy = scale(center.y);
  const rx = Math.max(1, scale(radius.x));
  const ry = Math.max(1, scale(radius.y));
  const stroke = options.stroke ? Math.max(1, scale(options.stroke)) : 0;
  const xStart = cx - rx - stroke;
  const xEnd = cx + rx + stroke;
  const yStart = cy - ry - stroke;
  const yEnd = cy + ry + stroke;

  for (let y = yStart; y <= yEnd; y += 1) {
    for (let x = xStart; x <= xEnd; x += 1) {
      const normalized =
        ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry);
      if (stroke > 0) {
        const innerRx = Math.max(1, rx - stroke);
        const innerRy = Math.max(1, ry - stroke);
        const inner =
          ((x - cx) * (x - cx)) / (innerRx * innerRx) +
          ((y - cy) * (y - cy)) / (innerRy * innerRy);
        if (normalized <= 1 && inner >= 1) blendPixel(buffer, x, y, rgba);
      } else if (normalized <= 1) {
        blendPixel(buffer, x, y, rgba);
      }
    }
  }
}

function drawLine(buffer, from, to, width, rgba) {
  const x0 = scale(from.x);
  const y0 = scale(from.y);
  const x1 = scale(to.x);
  const y1 = scale(to.y);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const radius = Math.max(1, Math.round(scale(width) / 2));

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const cx = Math.round(x0 + dx * t);
    const cy = Math.round(y0 + dy * t);
    for (let y = cy - radius; y <= cy + radius; y += 1) {
      for (let x = cx - radius; x <= cx + radius; x += 1) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= radius * radius) {
          blendPixel(buffer, x, y, rgba);
        }
      }
    }
  }
}

function drawArc(buffer, center, radius, start, end, width, rgba) {
  const steps = Math.max(16, Math.ceil(Math.abs(end - start) * 36));
  let previous = null;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const angle = start + (end - start) * t;
    const point = {
      x: center.x + Math.cos(angle) * radius.x,
      y: center.y + Math.sin(angle) * radius.y,
    };
    if (previous) drawLine(buffer, previous, point, width, rgba);
    previous = point;
  }
}

function writePng(path, pixels) {
  const raw = Buffer.alloc((IMAGE_SIZE * 4 + 1) * IMAGE_SIZE);
  for (let y = 0; y < IMAGE_SIZE; y += 1) {
    const row = y * (IMAGE_SIZE * 4 + 1);
    raw[row] = 0;
    pixels.copy(raw, row + 1, y * IMAGE_SIZE * 4, (y + 1) * IMAGE_SIZE * 4);
  }

  const chunks = [];
  const signature = Buffer.from("89504e470d0a1a0a", "hex");
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(IMAGE_SIZE, 0);
  ihdr.writeUInt32BE(IMAGE_SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  chunks.push(signature, pngChunk("IHDR", ihdr), pngChunk("IDAT", deflateSync(raw)), pngChunk("IEND", Buffer.alloc(0)));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.concat(chunks));
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function strength(tier, min = 0.55, max = 1) {
  return min + ((tier - 1) / 9) * (max - min);
}

function alpha(tier, base = 210) {
  return Math.round(base * strength(tier, 0.62, 1));
}

function renderSublayer(layer, tier) {
  const image = createImage();
  const red = colorFromHex("#C23A3A", alpha(tier, 230));
  const dark = colorFromHex("#1A1A1A", alpha(tier, 210));
  const green = colorFromHex("#2D5A3D", alpha(tier, 220));
  const amber = colorFromHex("#D4A24A", alpha(tier, 210));
  const blue = colorFromHex("#5A7892", alpha(tier, 190));
  const pale = colorFromHex("#F5F5F0", alpha(tier, 235));
  const cinnabarSoft = colorFromHex("#C23A3A", alpha(tier, 120));

  const growth = strength(tier, 0.75, 1.3);
  const medium = strength(tier, 0.8, 1.15);

  switch (`${layer.attribute}/${layer.sublayer}`) {
    case "boldness/headband":
      drawRect(image, { x: 188 - 10 * growth, y: 92 - 4 * growth, width: 112 + 18 * growth, height: 13 + 4 * growth }, red);
      drawLine(image, { x: 190, y: 91 }, { x: 324, y: 88 }, 3 + growth, dark);
      break;
    case "boldness/cape":
      drawEllipse(image, { x: 172, y: 318 }, { x: 38 * growth, y: 84 * growth }, red);
      drawEllipse(image, { x: 340, y: 318 }, { x: 38 * growth, y: 84 * growth }, red);
      drawLine(image, { x: 174, y: 260 }, { x: 146, y: 386 }, 5, dark);
      drawLine(image, { x: 338, y: 260 }, { x: 366, y: 386 }, 5, dark);
      break;
    case "boldness/weapon":
      drawLine(image, { x: 394, y: 292 }, { x: 438, y: 414 }, 7 + growth, dark);
      drawLine(image, { x: 386, y: 306 }, { x: 414, y: 286 }, 5, red);
      break;
    case "contrarian/aura":
      drawArc(image, { x: 256, y: 292 }, { x: 188 * medium, y: 220 * medium }, -2.7, -0.2, 5 + growth, dark);
      drawArc(image, { x: 256, y: 292 }, { x: 174 * medium, y: 204 * medium }, 0.35, 2.45, 5 + growth, dark);
      drawEllipse(image, { x: 118, y: 318 }, { x: 12, y: 22 }, dark);
      drawEllipse(image, { x: 404, y: 190 }, { x: 10, y: 18 }, dark);
      break;
    case "contrarian/mark":
      drawRect(image, { x: 374, y: 292, width: 30 + 4 * growth, height: 30 + 4 * growth }, cinnabarSoft);
      drawLine(image, { x: 382, y: 304 }, { x: 402, y: 316 }, 4, red);
      break;
    case "focus/monocle":
      drawEllipse(image, { x: 304, y: 162 }, { x: 31 * medium, y: 25 * medium }, green, { stroke: 5 });
      drawLine(image, { x: 326, y: 182 }, { x: 350, y: 214 }, 3 + growth, green);
      break;
    case "focus/headband":
      drawRect(image, { x: 190 - 6 * growth, y: 82 - 2 * growth, width: 120 + 8 * growth, height: 12 + 3 * growth }, green);
      drawLine(image, { x: 206, y: 82 }, { x: 306, y: 80 }, 2 + growth, pale);
      break;
    case "focus/chest-core":
      drawEllipse(image, { x: 256, y: 318 }, { x: 22 * growth, y: 22 * growth }, amber);
      drawEllipse(image, { x: 256, y: 318 }, { x: 34 * growth, y: 34 * growth }, green, { stroke: 4 });
      break;
    case "intuition/ear-radar":
      drawArc(image, { x: 140, y: 142 }, { x: 24 * growth, y: 32 * growth }, -1.2, 1.1, 4, amber);
      drawArc(image, { x: 140, y: 142 }, { x: 40 * growth, y: 52 * growth }, -1.15, 1.05, 3, green);
      drawEllipse(image, { x: 134, y: 142 }, { x: 5, y: 5 }, amber);
      break;
    case "intuition/particles":
      for (const point of [
        { x: 164, y: 118 },
        { x: 368, y: 116 },
        { x: 145, y: 222 },
        { x: 384, y: 222 },
        { x: 256, y: 66 },
      ]) {
        drawEllipse(image, point, { x: 5 + tier / 5, y: 5 + tier / 5 }, amber);
      }
      break;
    case "intuition/halo":
      drawArc(image, { x: 256, y: 70 }, { x: 72 * medium, y: 20 * medium }, Math.PI, Math.PI * 2, 4 + growth, amber);
      drawArc(image, { x: 256, y: 72 }, { x: 56 * medium, y: 14 * medium }, Math.PI * 0.08, Math.PI * 0.92, 3, green);
      break;
    case "patience/ground-prop":
      drawEllipse(image, { x: 256, y: 462 }, { x: 84 * medium, y: 18 * medium }, green);
      drawArc(image, { x: 256, y: 456 }, { x: 62 * medium, y: 14 * medium }, 0, Math.PI, 3, amber);
      break;
    case "patience/bamboo":
      drawLine(image, { x: 398, y: 288 }, { x: 398, y: 454 }, 7, green);
      drawLine(image, { x: 398, y: 340 }, { x: 430, y: 320 }, 5, green);
      drawLine(image, { x: 398, y: 378 }, { x: 366, y: 360 }, 5, green);
      drawEllipse(image, { x: 432, y: 318 }, { x: 16, y: 7 }, green);
      drawEllipse(image, { x: 364, y: 358 }, { x: 16, y: 7 }, green);
      break;
    case "patience/tea":
      drawRect(image, { x: 134, y: 420, width: 48 * medium, height: 24 * medium }, amber);
      drawArc(image, { x: 166, y: 410 }, { x: 18, y: 28 }, -1.4, -0.2, 3, blue);
      drawArc(image, { x: 180, y: 410 }, { x: 18, y: 28 }, -1.3, -0.1, 3, blue);
      break;
    case "emotion/eyes":
      renderEmotionEyes(image, tier, { dark, amber, red, blue });
      break;
    case "emotion/brows":
      renderEmotionBrows(image, tier, { dark, red });
      break;
    case "emotion/mouth":
      renderEmotionMouth(image, tier, { dark, red });
      break;
    case "emotion/extras":
      renderEmotionExtras(image, tier, { red, amber, blue });
      break;
    default:
      throw new Error(`Unhandled sublayer ${layer.attribute}/${layer.sublayer}`);
  }

  return image;
}

function renderEmotionEyes(image, tier, colors) {
  if (tier <= 2) {
    drawLine(image, { x: 196, y: 164 }, { x: 232, y: 164 }, 5, colors.dark);
    drawLine(image, { x: 280, y: 164 }, { x: 316, y: 164 }, 5, colors.dark);
  } else if (tier === 3) {
    drawArc(image, { x: 214, y: 158 }, { x: 20, y: 10 }, 0.1, Math.PI - 0.1, 4, colors.dark);
    drawArc(image, { x: 298, y: 158 }, { x: 20, y: 10 }, 0.1, Math.PI - 0.1, 4, colors.dark);
  } else if (tier === 4) {
    drawEllipse(image, { x: 214, y: 160 }, { x: 15, y: 12 }, colors.dark);
    drawEllipse(image, { x: 300, y: 160 }, { x: 18, y: 12 }, colors.dark);
  } else if (tier === 6) {
    drawEllipse(image, { x: 214, y: 160 }, { x: 17, y: 15 }, colors.amber);
    drawEllipse(image, { x: 300, y: 160 }, { x: 17, y: 15 }, colors.amber);
    drawEllipse(image, { x: 219, y: 155 }, { x: 4, y: 4 }, colors.dark);
    drawEllipse(image, { x: 305, y: 155 }, { x: 4, y: 4 }, colors.dark);
  } else if (tier >= 8) {
    drawEllipse(image, { x: 214, y: 160 }, { x: 20, y: 17 }, tier === 8 ? colors.amber : colors.blue);
    drawEllipse(image, { x: 300, y: 160 }, { x: 20, y: 17 }, tier === 8 ? colors.amber : colors.blue);
    drawEllipse(image, { x: 214, y: 160 }, { x: 8, y: 8 }, colors.dark);
    drawEllipse(image, { x: 300, y: 160 }, { x: 8, y: 8 }, colors.dark);
  } else {
    drawLine(image, { x: 198, y: 166 }, { x: 232, y: 154 }, 6, colors.dark);
    drawLine(image, { x: 282, y: 154 }, { x: 316, y: 166 }, 6, colors.dark);
  }
}

function renderEmotionBrows(image, tier, colors) {
  if (tier === 7 || tier >= 9) {
    drawLine(image, { x: 192, y: 130 }, { x: 236, y: 142 }, 5, colors.red);
    drawLine(image, { x: 278, y: 142 }, { x: 322, y: 130 }, 5, colors.red);
  } else if (tier === 3 || tier === 6 || tier === 8) {
    drawArc(image, { x: 214, y: 136 }, { x: 18, y: 7 }, Math.PI + 0.1, Math.PI * 2 - 0.1, 3, colors.dark);
    drawArc(image, { x: 298, y: 136 }, { x: 18, y: 7 }, Math.PI + 0.1, Math.PI * 2 - 0.1, 3, colors.dark);
  } else if (tier === 4 || tier === 5) {
    drawLine(image, { x: 194, y: 138 }, { x: 236, y: 132 }, 4, colors.dark);
    drawLine(image, { x: 278, y: 132 }, { x: 322, y: 138 }, 4, colors.dark);
  } else if (tier <= 2) {
    drawLine(image, { x: 198, y: 142 }, { x: 232, y: 142 }, 3, colors.dark);
    drawLine(image, { x: 284, y: 142 }, { x: 318, y: 142 }, 3, colors.dark);
  }
}

function renderEmotionMouth(image, tier, colors) {
  if (tier <= 2) {
    drawLine(image, { x: 238, y: 226 }, { x: 278, y: 226 }, 4, colors.dark);
  } else if (tier === 3) {
    drawArc(image, { x: 256, y: 226 }, { x: 26, y: 18 }, 0.15, Math.PI - 0.15, 4, colors.dark);
  } else if (tier === 6 || tier >= 9) {
    drawEllipse(image, { x: 256, y: 232 }, { x: 22, y: 15 }, tier >= 9 ? colors.red : colors.dark);
  } else if (tier === 7) {
    drawLine(image, { x: 238, y: 230 }, { x: 280, y: 224 }, 5, colors.dark);
  } else {
    drawArc(image, { x: 256, y: 236 }, { x: 24, y: 12 }, Math.PI + 0.1, Math.PI * 2 - 0.1, 4, colors.dark);
  }
}

function renderEmotionExtras(image, tier, colors) {
  if (tier <= 3 || tier === 5) {
    drawEllipse(image, { x: 348, y: 198 }, { x: 5, y: 9 }, colors.blue);
  } else if (tier === 4 || tier >= 9) {
    drawEllipse(image, { x: 348, y: 190 }, { x: 8, y: 16 }, colors.blue);
    if (tier >= 9) drawEllipse(image, { x: 366, y: 218 }, { x: 7, y: 13 }, colors.blue);
  } else if (tier === 6) {
    drawEllipse(image, { x: 176, y: 214 }, { x: 12, y: 7 }, colors.red);
    drawEllipse(image, { x: 336, y: 214 }, { x: 12, y: 7 }, colors.red);
  } else if (tier === 8) {
    drawEllipse(image, { x: 346, y: 142 }, { x: 7, y: 7 }, colors.amber);
    drawLine(image, { x: 340, y: 142 }, { x: 352, y: 142 }, 3, colors.amber);
    drawLine(image, { x: 346, y: 136 }, { x: 346, y: 148 }, 3, colors.amber);
  } else if (tier === 7) {
    drawLine(image, { x: 346, y: 128 }, { x: 358, y: 116 }, 4, colors.red);
    drawLine(image, { x: 354, y: 128 }, { x: 366, y: 116 }, 4, colors.red);
  }
}

function manifestEntries() {
  const layers = [];
  for (const sublayer of SUBLAYERS) {
    for (const tier of TIERS) {
      layers.push({
        attribute: sublayer.attribute,
        sublayer: sublayer.sublayer,
        tier,
        src: publicSrc(sublayer.attribute, sublayer.sublayer, tier),
        anchorPolicy: sublayer.anchorPolicy,
        ...(sublayer.anchorOffset ? { anchorOffset: sublayer.anchorOffset } : {}),
        zIndex: sublayer.zIndex,
        opacityRule: sublayer.opacityRule,
        bboxPolicy: sublayer.bboxPolicy,
        role: sublayer.role,
      });
    }
  }
  return layers;
}

function promptJobs() {
  const common =
    "Transparent PNG. Single visual element only. No full panda. No full face. No background. No text or watermark. Designed for 512x512 avatar compositing. Keep alpha bounding box tight around the declared anchor. Do not cover eyes, mouth, or nose unless this is an emotion sublayer.";
  const jobs = [];

  for (const sublayer of SUBLAYERS) {
    for (const tier of TIERS) {
      const emotionClause =
        sublayer.attribute === "emotion"
          ? `This is a facial expression sublayer for ${EMOTION_LABELS[tier]}. Only draw the requested ${sublayer.sublayer} component. Do not draw body, props, aura, or a complete face.`
          : "";
      const intuitionClause =
        sublayer.attribute === "intuition"
          ? "This is not an eye, pupil, eyebrow, gaze, or eye glow asset. Do not alter facial expression. Represent intuition using ear radar, ambient particles, halo, or external sensing symbols only."
          : "";

      jobs.push({
        target: `frontend/public${publicSrc(sublayer.attribute, sublayer.sublayer, tier)}`,
        attribute: sublayer.attribute,
        sublayer: sublayer.sublayer,
        tier,
        anchor: sublayer.anchorPolicy,
        anchorOffset: sublayer.anchorOffset ?? { x: 0, y: 0 },
        bboxPolicy: sublayer.bboxPolicy,
        positive_prompt: `${sublayer.promptSubject}, tier ${tier}/10, Chinese ink wash game avatar accessory, tight transparent alpha bbox, premium brush texture`,
        forbidden_terms: sublayer.forbidden.split(", "),
        prompt: [
          common,
          `Attribute: ${sublayer.attribute}. Sublayer: ${sublayer.sublayer}. Tier: ${tier}/10. Element anchor: ${sublayer.anchorPolicy}.`,
          `Positive request: ${sublayer.promptSubject}.`,
          emotionClause,
          intuitionClause,
          `Hard exclusions: ${sublayer.forbidden}.`,
        ]
          .filter(Boolean)
          .join(" "),
      });
    }
  }

  return jobs;
}

function main() {
  for (const sublayer of SUBLAYERS) {
    for (const tier of TIERS) {
      const src = publicSrc(sublayer.attribute, sublayer.sublayer, tier);
      writePng(localPathFromSrc(src), renderSublayer(sublayer, tier));
    }
  }

  const manifest = {
    version: 1,
    coordinateSpace: { width: CANVAS_SIZE, height: CANVAS_SIZE, unit: "px" },
    sourceImageSize: { width: IMAGE_SIZE, height: IMAGE_SIZE, unit: "px" },
    anchorPolicies: ANCHOR_POLICIES,
    bboxPolicies: BBOX_POLICIES,
    legacyFallbacks: LEGACY_ASSETS,
    layers: manifestEntries(),
  };

  mkdirSync(ROOT, { recursive: true });
  writeFileSync(join(ROOT, "sublayer-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(ROOT, "legacy-assets.json"), `${JSON.stringify(LEGACY_ASSETS, null, 2)}\n`);

  const jobs = promptJobs();
  mkdirSync(TMP_IMAGEGEN_ROOT, { recursive: true });
  writeFileSync(
    join(TMP_IMAGEGEN_ROOT, "panda-asset-prompts.jsonl"),
    `${jobs.map((job) => JSON.stringify(job)).join("\n")}\n`
  );
  writeFileSync(
    join(TMP_IMAGEGEN_ROOT, "panda-sublayer-prompts.jsonl"),
    `${jobs.map((job) => JSON.stringify(job)).join("\n")}\n`
  );
  writeFileSync(
    join(TMP_IMAGEGEN_ROOT, "panda-sublayer-prompts-smoke.jsonl"),
    `${jobs.filter((job) => SMOKE_TIERS.has(job.tier)).map((job) => JSON.stringify(job)).join("\n")}\n`
  );
  writeFileSync(
    join(TMP_IMAGEGEN_ROOT, "panda-asset-prompts-smoke.jsonl"),
    `${jobs.filter((job) => SMOKE_TIERS.has(job.tier)).map((job) => JSON.stringify(job)).join("\n")}\n`
  );

  console.log(
    `Generated ${SUBLAYERS.length * TIERS.length} sublayer PNGs, ${jobs.length} prompt jobs, and ${WORKSPACE_ROOT}/sublayer-manifest.json`
  );
}

main();
