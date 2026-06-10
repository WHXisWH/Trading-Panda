import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const FRONTEND_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO_ROOT = dirname(FRONTEND_ROOT);
const ROOT = join(FRONTEND_ROOT, "public/assets/panda");
const TMP_IMAGEGEN_ROOT = join(REPO_ROOT, "tmp/imagegen");
const WORKSPACE_ROOT = "frontend/public/assets/panda";
const IMAGE_SIZE = 1024;
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
];

const BBOX_POLICIES = [
  "fullExperience",
  "headband",
  "cape",
  "weaponSide",
  "bodySideMark",
  "monocle",
  "chestCore",
  "intuitionNoFaceFeatures",
  "groundProp",
  "groundSideProp",
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
    sublayer: "reticle",
    anchorPolicy: "rightEyeCenter",
    zIndex: 73,
    opacityRule: "trait",
    bboxPolicy: "monocle",
    role: "single analytical targeting reticle near the right-eye focus anchor",
    promptSubject: "one compact cyan targeting reticle and scan ticks near the right-eye focus anchor",
    forbidden: "second eye overlay, forehead band, cloth band, blindfold, mouth, full face, full panda, body props, background, text, watermark",
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
    sublayer: "brows",
    anchorPolicy: "eyesMidpoint",
    anchorOffset: { x: 0, y: -34 },
    zIndex: 81,
    opacityRule: "emotion",
    bboxPolicy: "emotionBrows",
    role: "compact black-titanium cyber brow modules only; facial hardware, not flat cartoon eyebrows",
    promptSubject: "only compact black-titanium cyber brow modules for the requested emotion",
    forbidden: "flat sticker eyebrows, blade-like slashes, body props, aura, full face, full panda, background, text, watermark",
  },
  {
    attribute: "emotion",
    sublayer: "mouth",
    anchorPolicy: "mouthCenter",
    zIndex: 82,
    opacityRule: "emotion",
    bboxPolicy: "emotionMouth",
    role: "compact black-titanium cyber mouth module only; small grille or light port around the mouth anchor",
    promptSubject: "only a compact black-titanium cyber mouth module for the requested emotion",
    forbidden: "flat sticker mouth, large lips, body props, aura, full face, full panda, background, text, watermark",
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
    case "contrarian/mark":
      drawRect(image, { x: 374, y: 292, width: 30 + 4 * growth, height: 30 + 4 * growth }, cinnabarSoft);
      drawLine(image, { x: 382, y: 304 }, { x: 402, y: 316 }, 4, red);
      break;
    case "focus/monocle":
      drawEllipse(image, { x: 304, y: 162 }, { x: 31 * medium, y: 25 * medium }, green, { stroke: 5 });
      drawLine(image, { x: 326, y: 182 }, { x: 350, y: 214 }, 3 + growth, green);
      break;
    case "focus/reticle":
      drawArc(image, { x: 318, y: 164 }, { x: 38 * medium, y: 31 * medium }, -0.15, Math.PI * 1.65, 3 + growth, green);
      drawLine(image, { x: 318, y: 132 }, { x: 318, y: 148 }, 2 + growth, pale);
      drawLine(image, { x: 318, y: 180 }, { x: 318, y: 198 }, 2 + growth, pale);
      drawLine(image, { x: 286, y: 164 }, { x: 302, y: 164 }, 2 + growth, pale);
      drawLine(image, { x: 334, y: 164 }, { x: 354, y: 164 }, 2 + growth, pale);
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
    case "emotion/brows":
      renderEmotionBrows(image, tier, { dark, red, amber, blue, green });
      break;
    case "emotion/mouth":
      renderEmotionMouth(image, tier, { dark, red, amber, blue, green, pale });
      break;
    case "emotion/extras":
      renderEmotionExtras(image, tier, { red, amber, blue, green, pale });
      break;
    default:
      throw new Error(`Unhandled sublayer ${layer.attribute}/${layer.sublayer}`);
  }

  return image;
}

const EMOTION_EYE_CENTERS = [
  { x: 206, y: 166, side: -1 },
  { x: 306, y: 166, side: 1 },
];

const EMOTION_EYE_STYLES = {
  1: {
    iris: "#6E7C84",
    irisAlpha: 95,
    glow: "#6E7C84",
    glowAlpha: 36,
    rx: 11,
    ry: 13,
    pupil: 5,
    pupilAlpha: 150,
    highlightAlpha: 20,
    lidAlpha: 72,
    gazeX: 0,
    gazeY: 2,
  },
  2: {
    iris: "#7896A5",
    irisAlpha: 115,
    glow: "#6FAFC0",
    glowAlpha: 42,
    rx: 12,
    ry: 14,
    pupil: 5.5,
    pupilAlpha: 150,
    highlightAlpha: 36,
    lidAlpha: 54,
    gazeX: 0,
    gazeY: 1,
  },
  3: {
    iris: "#4FC5D5",
    irisAlpha: 145,
    glow: "#5DE5F2",
    glowAlpha: 54,
    rx: 14,
    ry: 16,
    pupil: 6,
    pupilAlpha: 155,
    highlightAlpha: 70,
    lidAlpha: 36,
    gazeX: 0,
    gazeY: 0,
  },
  4: {
    iris: "#55AFC3",
    irisAlpha: 145,
    glow: "#67D8E5",
    glowAlpha: 46,
    rx: 13,
    ry: 15,
    pupil: 6,
    pupilAlpha: 160,
    highlightAlpha: 58,
    lidAlpha: 70,
    gazeX: 2,
    gazeY: 0,
  },
  5: {
    iris: "#43D8E4",
    irisAlpha: 165,
    glow: "#74F0F5",
    glowAlpha: 58,
    rx: 12.5,
    ry: 14.5,
    pupil: 5.8,
    pupilAlpha: 170,
    highlightAlpha: 78,
    lidAlpha: 40,
    gazeX: 0,
    gazeY: 0,
    reticle: true,
  },
  6: {
    iris: "#64DFEA",
    irisAlpha: 172,
    glow: "#96F7FA",
    glowAlpha: 70,
    rx: 17,
    ry: 18,
    pupil: 6.8,
    pupilAlpha: 150,
    highlightAlpha: 112,
    lidAlpha: 24,
    gazeX: 0,
    gazeY: -1,
    extraGlint: "#D6B15A",
  },
  7: {
    iris: "#5E9FB0",
    irisAlpha: 145,
    glow: "#C23A3A",
    glowAlpha: 38,
    rx: 13.5,
    ry: 15.5,
    pupil: 6.2,
    pupilAlpha: 175,
    highlightAlpha: 46,
    lidAlpha: 96,
    gazeX: -1,
    gazeY: 1,
    outerPulse: "#C23A3A",
  },
  8: {
    iris: "#D4A24A",
    irisAlpha: 178,
    glow: "#E6C45F",
    glowAlpha: 72,
    rx: 16,
    ry: 17,
    pupil: 7,
    pupilAlpha: 160,
    highlightAlpha: 94,
    lidAlpha: 28,
    gazeX: 1,
    gazeY: 0,
    sparkle: "#F2D889",
  },
  9: {
    iris: "#5CCFDC",
    irisAlpha: 168,
    glow: "#C23A3A",
    glowAlpha: 54,
    rx: 15,
    ry: 17,
    pupil: 7.2,
    pupilAlpha: 180,
    highlightAlpha: 80,
    lidAlpha: 58,
    gazeX: -1,
    gazeY: 1,
    stressRing: "#C23A3A",
  },
  10: {
    iris: "#69E6F0",
    irisAlpha: 188,
    glow: "#C23A3A",
    glowAlpha: 70,
    rx: 18,
    ry: 19,
    pupil: 8.8,
    pupilAlpha: 190,
    highlightAlpha: 120,
    lidAlpha: 36,
    gazeX: 0,
    gazeY: -1,
    stressRing: "#C23A3A",
    extraGlint: "#F2D889",
  },
};

function renderEmotionEyes(image, tier) {
  const style = EMOTION_EYE_STYLES[tier] ?? EMOTION_EYE_STYLES[5];
  for (const eye of EMOTION_EYE_CENTERS) {
    renderRoundPandaEye(image, eye, style);
  }
}

function renderRoundPandaEye(image, eye, style) {
  const gaze = {
    x: eye.x + style.gazeX * (eye.side === -1 ? 1 : -1),
    y: eye.y + style.gazeY,
  };
  const shadow = colorFromHex("#05070D", 112);
  const pupil = colorFromHex("#04070B", style.pupilAlpha);
  const iris = colorFromHex(style.iris, style.irisAlpha);
  const glow = colorFromHex(style.glow, style.glowAlpha);
  const highlight = colorFromHex("#F4FBFF", style.highlightAlpha);
  const lid = colorFromHex("#05070D", style.lidAlpha);

  drawEllipse(image, gaze, { x: style.rx + 9, y: style.ry + 7 }, glow);
  drawEllipse(image, gaze, { x: style.rx + 5, y: style.ry + 5 }, shadow);
  drawEllipse(image, gaze, { x: style.rx, y: style.ry }, iris);
  drawEllipse(image, { x: gaze.x - eye.side * 1.5, y: gaze.y + 1 }, { x: style.pupil, y: style.pupil + 1.5 }, pupil);
  drawEllipse(image, { x: gaze.x - eye.side * 5, y: gaze.y - 6 }, { x: 3.8, y: 3.8 }, highlight);
  drawEllipse(image, { x: gaze.x + eye.side * 5.5, y: gaze.y + 5 }, { x: 2.2, y: 2.2 }, colorFromHex(style.iris, Math.min(150, style.irisAlpha)));
  drawEllipse(image, { x: gaze.x, y: gaze.y - style.ry - 2 }, { x: style.rx + 11, y: 5.5 }, lid);

  if (style.reticle) {
    drawArc(image, gaze, { x: style.rx + 5, y: style.ry + 4 }, 0.08, Math.PI * 1.86, 1.6, colorFromHex("#C7FFFF", 104));
    drawLine(image, { x: gaze.x - 3, y: gaze.y - style.ry - 6 }, { x: gaze.x + 3, y: gaze.y - style.ry - 6 }, 1.4, colorFromHex("#C7FFFF", 94));
  }

  if (style.stressRing) {
    drawArc(image, gaze, { x: style.rx + 5, y: style.ry + 3 }, Math.PI * 0.08, Math.PI * 1.55, 2, colorFromHex(style.stressRing, 116));
  }

  if (style.outerPulse) {
    const pulseX = gaze.x + eye.side * 23;
    drawLine(image, { x: pulseX, y: gaze.y - 8 }, { x: pulseX + eye.side * 7, y: gaze.y - 13 }, 2.2, colorFromHex(style.outerPulse, 118));
    drawLine(image, { x: pulseX, y: gaze.y + 7 }, { x: pulseX + eye.side * 7, y: gaze.y + 12 }, 2.2, colorFromHex(style.outerPulse, 100));
  }

  if (style.sparkle) {
    drawSparkle(image, { x: gaze.x - eye.side * 11, y: gaze.y - 12 }, style.sparkle, 120);
  }

  if (style.extraGlint) {
    drawSparkle(image, { x: gaze.x + eye.side * 12, y: gaze.y + 10 }, style.extraGlint, 96);
  }
}

function drawSparkle(image, center, hex, alphaValue) {
  const color = colorFromHex(hex, alphaValue);
  drawLine(image, { x: center.x - 4, y: center.y }, { x: center.x + 4, y: center.y }, 1.5, color);
  drawLine(image, { x: center.x, y: center.y - 4 }, { x: center.x, y: center.y + 4 }, 1.5, color);
  drawEllipse(image, center, { x: 2, y: 2 }, color);
}

function rgbaWithAlpha(rgba, alphaValue) {
  return [rgba[0], rgba[1], rgba[2], alphaValue];
}

function mixRgba(a, b, amount, alphaValue) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * amount),
    Math.round(a[1] + (b[1] - a[1]) * amount),
    Math.round(a[2] + (b[2] - a[2]) * amount),
    alphaValue,
  ];
}

function rgbaLuma(rgba) {
  return rgba[0] * 0.2126 + rgba[1] * 0.7152 + rgba[2] * 0.0722;
}

function rgbaChroma(rgba) {
  return Math.max(rgba[0], rgba[1], rgba[2]) - Math.min(rgba[0], rgba[1], rgba[2]);
}

function drawPlainCurveStroke(image, points, width, rgba) {
  for (let index = 0; index < points.length - 1; index += 1) {
    drawLine(image, points[index], points[index + 1], width, rgba);
  }
}

function drawCyberNode(image, center, signalRgba, size = 2.3) {
  drawEllipse(image, center, { x: size + 1.8, y: size + 1.8 }, colorFromHex("#03060B", 165));
  drawEllipse(image, center, { x: size + 0.8, y: size + 0.8 }, colorFromHex("#1A2630", 210));
  drawEllipse(image, center, { x: size * 0.42, y: size * 0.42 }, rgbaWithAlpha(signalRgba, Math.min(175, signalRgba[3])));
}

function drawCyberMouthPort(image, center, radius, signalRgba, options = {}) {
  const inner = options.innerRgba ?? colorFromHex("#05080E", 210);
  drawEllipse(
    image,
    center,
    { x: radius.x + 5, y: radius.y + 4 },
    rgbaWithAlpha(signalRgba, options.glowAlpha ?? 46)
  );
  drawEllipse(image, center, { x: radius.x + 3, y: radius.y + 2.2 }, colorFromHex("#02050A", 225));
  drawEllipse(image, center, { x: radius.x + 1.1, y: radius.y + 0.9 }, colorFromHex("#18242C", 225));
  drawEllipse(image, center, radius, rgbaWithAlpha(signalRgba, options.signalAlpha ?? 170), {
    stroke: options.stroke ?? 3.2,
  });
  drawEllipse(image, center, { x: radius.x * 0.58, y: radius.y * 0.5 }, inner);
  drawLine(
    image,
    { x: center.x - radius.x * 0.42, y: center.y - radius.y * 0.62 },
    { x: center.x + radius.x * 0.42, y: center.y - radius.y * 0.62 },
    1.5,
    colorFromHex("#D7FBFF", options.highlightAlpha ?? 82)
  );
  if (options.coreRgba) {
    drawEllipse(image, { x: center.x, y: center.y + radius.y * 0.18 }, { x: radius.x * 0.24, y: radius.y * 0.22 }, options.coreRgba);
  }
}

function drawCurveStroke(image, points, width, rgba) {
  const mouthStroke = points.every(
    (point) => point.x >= 220 && point.x <= 292 && point.y >= 190 && point.y <= 255
  );
  const modulePoints = mouthStroke
    ? points.map((point) => ({ x: 256 + (point.x - 256) * 1.34, y: point.y + 0.2 }))
    : points;
  const moduleWidth = mouthStroke ? width + 1.2 : width;
  const neutralDark = rgbaLuma(rgba) < 72 && rgbaChroma(rgba) < 32;
  const signal = neutralDark
    ? colorFromHex("#6FAFC0", Math.min(145, Math.round(rgba[3] * 0.68)))
    : rgbaWithAlpha(rgba, Math.min(190, Math.round(rgba[3] * 0.9)));
  const glow = rgbaWithAlpha(signal, neutralDark ? 24 : 38);
  const body = mixRgba(
    colorFromHex("#111820", Math.min(232, rgba[3] + 14)),
    rgba,
    neutralDark ? 0.06 : 0.24,
    Math.min(235, Math.round(rgba[3] * 1.04))
  );
  const edge = neutralDark
    ? colorFromHex("#A9C7CE", 92)
    : mixRgba(colorFromHex("#D4F5F8", 114), rgba, 0.22, 116);
  const upperEdgePoints = modulePoints.map((point) => ({ x: point.x, y: point.y - 1.25 }));
  const signalPoints = modulePoints.map((point) => ({ x: point.x, y: point.y + 0.55 }));

  drawPlainCurveStroke(image, modulePoints, moduleWidth + 6.5, glow);
  drawPlainCurveStroke(image, modulePoints, moduleWidth + 4, colorFromHex("#02050A", Math.min(232, rgba[3] + 22)));
  drawPlainCurveStroke(image, modulePoints, moduleWidth + 1.8, body);
  drawPlainCurveStroke(image, upperEdgePoints, Math.max(1.7, moduleWidth * 0.34), edge);
  drawPlainCurveStroke(image, signalPoints, Math.max(1.8, moduleWidth * 0.42), signal);

  if (moduleWidth >= 4) {
    drawCyberNode(image, modulePoints[0], signal, mouthStroke ? 2.45 : 2.25);
    drawCyberNode(image, modulePoints[modulePoints.length - 1], signal, mouthStroke ? 2.45 : 2.25);
    if (modulePoints.length > 2) {
      drawCyberNode(image, modulePoints[Math.floor(modulePoints.length / 2)], signal, mouthStroke ? 1.85 : 1.65);
    }
  }
}

function drawSoftTick(image, from, to, width, rgba) {
  if (width >= 3.5) {
    drawCurveStroke(image, [from, to], width, rgba);
    return;
  }
  drawLine(image, from, to, width, rgba);
  drawEllipse(image, from, { x: width * 0.3, y: width * 0.3 }, rgba);
  drawEllipse(image, to, { x: width * 0.3, y: width * 0.3 }, rgba);
}

function drawSweatDrop(image, center, size, rgba, highlightRgba) {
  drawEllipse(image, center, { x: size * 0.58, y: size * 0.82 }, rgba);
  drawLine(
    image,
    { x: center.x, y: center.y + size * 0.34 },
    { x: center.x, y: center.y + size * 1.16 },
    size * 0.22,
    rgba
  );
  if (highlightRgba) {
    drawEllipse(
      image,
      { x: center.x - size * 0.18, y: center.y - size * 0.24 },
      { x: size * 0.14, y: size * 0.18 },
      highlightRgba
    );
  }
}

function drawTinyPulse(image, center, colorHex, alphaValue) {
  const color = colorFromHex(colorHex, alphaValue);
  drawLine(image, { x: center.x - 4, y: center.y }, { x: center.x + 4, y: center.y }, 1.3, color);
  drawLine(image, { x: center.x, y: center.y - 4 }, { x: center.x, y: center.y + 4 }, 1.3, color);
  drawEllipse(image, center, { x: 1.7, y: 1.7 }, color);
}

function renderEmotionBrows(image, tier, colors) {
  const pale = colorFromHex("#F1F6F9", 130);
  switch (tier) {
    case 1:
      drawCurveStroke(image, [{ x: 189, y: 141 }, { x: 206, y: 139 }, { x: 231, y: 141 }], 4, colors.dark);
      drawCurveStroke(image, [{ x: 281, y: 141 }, { x: 306, y: 139 }, { x: 323, y: 141 }], 4, colors.dark);
      break;
    case 2:
      drawCurveStroke(image, [{ x: 188, y: 140 }, { x: 206, y: 137 }, { x: 230, y: 139 }], 4.5, colors.dark);
      drawCurveStroke(image, [{ x: 282, y: 139 }, { x: 306, y: 137 }, { x: 324, y: 140 }], 4.5, colors.dark);
      break;
    case 3:
      drawCurveStroke(image, [{ x: 187, y: 138 }, { x: 206, y: 132 }, { x: 231, y: 137 }], 4.5, colors.green ?? colors.dark);
      drawCurveStroke(image, [{ x: 281, y: 137 }, { x: 306, y: 132 }, { x: 325, y: 138 }], 4.5, colors.green ?? colors.dark);
      break;
    case 4:
      drawCurveStroke(image, [{ x: 188, y: 140 }, { x: 206, y: 135 }, { x: 231, y: 136 }], 4.5, colors.dark);
      drawCurveStroke(image, [{ x: 281, y: 136 }, { x: 306, y: 135 }, { x: 324, y: 140 }], 4.5, colors.dark);
      drawTinyPulse(image, { x: 256, y: 134 }, "#56DDE6", 90);
      break;
    case 5:
      drawCurveStroke(image, [{ x: 188, y: 139 }, { x: 206, y: 133 }, { x: 231, y: 138 }], 4.8, colors.dark);
      drawCurveStroke(image, [{ x: 281, y: 138 }, { x: 306, y: 133 }, { x: 324, y: 139 }], 4.8, colors.dark);
      drawTinyPulse(image, { x: 256, y: 135 }, "#C7FFFF", 78);
      break;
    case 6:
      drawCurveStroke(image, [{ x: 187, y: 136 }, { x: 206, y: 129 }, { x: 232, y: 135 }], 5, colors.blue ?? colors.green ?? colors.dark);
      drawCurveStroke(image, [{ x: 280, y: 135 }, { x: 306, y: 129 }, { x: 325, y: 136 }], 5, colors.blue ?? colors.green ?? colors.dark);
      drawTinyPulse(image, { x: 255, y: 131 }, "#F2D889", 85);
      break;
    case 7:
      drawCurveStroke(image, [{ x: 188, y: 139 }, { x: 205, y: 145 }, { x: 231, y: 136 }], 5.2, colors.red);
      drawCurveStroke(image, [{ x: 281, y: 136 }, { x: 307, y: 145 }, { x: 324, y: 139 }], 5.2, colors.red);
      drawSoftTick(image, { x: 198, y: 142 }, { x: 208, y: 140 }, 2.2, colorFromHex("#F15A5A", 150));
      break;
    case 8:
      drawCurveStroke(image, [{ x: 188, y: 136 }, { x: 206, y: 130 }, { x: 230, y: 134 }], 5, colors.amber);
      drawCurveStroke(image, [{ x: 282, y: 134 }, { x: 306, y: 129 }, { x: 324, y: 136 }], 5, colors.amber);
      drawSparkle(image, { x: 333, y: 130 }, "#F2D889", 95);
      break;
    case 9:
      drawCurveStroke(image, [{ x: 187, y: 132 }, { x: 205, y: 126 }, { x: 231, y: 131 }], 5, colors.dark);
      drawCurveStroke(image, [{ x: 281, y: 131 }, { x: 307, y: 126 }, { x: 325, y: 132 }], 5, colors.dark);
      drawTinyPulse(image, { x: 255, y: 128 }, "#C23A3A", 95);
      drawSweatDrop(image, { x: 350, y: 145 }, 9, colorFromHex("#56DDE6", 155), pale);
      break;
    case 10:
      drawCurveStroke(image, [{ x: 186, y: 130 }, { x: 205, y: 123 }, { x: 231, y: 129 }], 5.4, colors.red);
      drawCurveStroke(image, [{ x: 281, y: 129 }, { x: 307, y: 123 }, { x: 326, y: 130 }], 5.4, colors.red);
      drawTinyPulse(image, { x: 255, y: 124 }, "#F2D889", 105);
      drawSweatDrop(image, { x: 350, y: 136 }, 10, colorFromHex("#56DDE6", 170), pale);
      break;
    default:
      break;
  }
}

const EMOTION_MOUTH_BASE_CENTER = { x: 256, y: 225 };
const EMOTION_MOUTH_CENTERS = {
  1: { x: 259.1, y: 209.3 },
  2: { x: 260.6, y: 228.3 },
  3: { x: 257.3, y: 251.3 },
  4: { x: 254.9, y: 227.2 },
  5: { x: 255, y: 226.8 },
  6: { x: 257.3, y: 223.4 },
  7: { x: 254.6, y: 229.6 },
  8: { x: 257.9, y: 220.2 },
  9: { x: 255.8, y: 208.4 },
  10: { x: 258.3, y: 199.8 },
};

function renderEmotionMouth(image, tier, colors) {
  const pale = colorFromHex("#F1F6F9", 130);
  const target = EMOTION_MOUTH_CENTERS[tier] ?? EMOTION_MOUTH_BASE_CENTER;
  const offset = {
    x: target.x - EMOTION_MOUTH_BASE_CENTER.x,
    y: target.y - EMOTION_MOUTH_BASE_CENTER.y,
  };
  const point = (value) => ({ x: value.x + offset.x, y: value.y + offset.y });
  const points = (values) => values.map(point);
  const drawMouthCurve = (values, width, rgba) => drawCurveStroke(image, points(values), width, rgba);
  const drawMouthTick = (from, to, width, rgba) => drawSoftTick(image, point(from), point(to), width, rgba);
  const drawMouthPulse = (center, colorHex, alphaValue) => drawTinyPulse(image, point(center), colorHex, alphaValue);
  const drawMouthPort = (center, radius, signalRgba, options = {}) =>
    drawCyberMouthPort(image, point(center), radius, signalRgba, options);

  switch (tier) {
    case 1:
      drawMouthTick({ x: 240, y: 225 }, { x: 272, y: 225 }, 4, colors.dark);
      break;
    case 2:
      drawMouthCurve([{ x: 240, y: 225 }, { x: 256, y: 224 }, { x: 272, y: 225 }], 4, colors.dark);
      break;
    case 3:
      drawMouthCurve([{ x: 240, y: 225 }, { x: 256, y: 218 }, { x: 272, y: 225 }], 4, colors.green ?? colors.blue ?? colors.dark);
      break;
    case 4:
      drawMouthCurve([{ x: 241, y: 223 }, { x: 256, y: 221 }, { x: 271, y: 223 }], 4.2, colors.dark);
      break;
    case 5:
      drawMouthCurve([{ x: 241, y: 224 }, { x: 256, y: 219 }, { x: 271, y: 224 }], 4.4, colors.dark);
      drawMouthPulse({ x: 256, y: 228 }, "#C7FFFF", 55);
      break;
    case 6:
      drawMouthCurve([{ x: 243, y: 223 }, { x: 256, y: 214 }, { x: 269, y: 223 }], 4.6, colors.blue ?? colors.green ?? colors.dark);
      drawMouthPort({ x: 256, y: 224 }, { x: 11, y: 7.5 }, colorFromHex("#69E6F0", 165), {
        innerRgba: colorFromHex("#0A1118", 210),
        coreRgba: pale,
        glowAlpha: 38,
        signalAlpha: 150,
        stroke: 2.6,
      });
      break;
    case 7:
      drawMouthCurve([{ x: 242, y: 226 }, { x: 256, y: 230 }, { x: 270, y: 226 }], 4.4, colors.red);
      break;
    case 8:
      drawMouthCurve([{ x: 243, y: 223 }, { x: 256, y: 219 }, { x: 269, y: 223 }], 4.6, colors.amber);
      drawMouthPulse({ x: 256, y: 228 }, "#F2D889", 72);
      break;
    case 9:
      drawMouthPort({ x: 256, y: 225 }, { x: 12, y: 8 }, colorFromHex("#56DDE6", 170), {
        innerRgba: colorFromHex("#090D13", 220),
        coreRgba: colors.red,
        glowAlpha: 44,
        signalAlpha: 168,
      });
      break;
    case 10:
      drawMouthPort({ x: 256, y: 224 }, { x: 14, y: 10 }, colorFromHex("#56DDE6", 185), {
        innerRgba: colorFromHex("#090D13", 230),
        coreRgba: colors.red,
        glowAlpha: 54,
        signalAlpha: 180,
        stroke: 3.6,
      });
      drawMouthPulse({ x: 258, y: 229 }, "#F2D889", 80);
      break;
    default:
      break;
  }
}

function renderEmotionExtras(image, tier, colors) {
  const pale = colorFromHex("#F1F6F9", 130);
  switch (tier) {
    case 1:
      drawSweatDrop(image, { x: 349, y: 203 }, 8, colorFromHex("#56DDE6", 150), pale);
      break;
    case 2:
      drawSparkle(image, { x: 348, y: 194 }, "#56DDE6", 112);
      break;
    case 3:
      drawTinyPulse(image, { x: 174, y: 214 }, "#56DDE6", 90);
      break;
    case 4:
      drawSweatDrop(image, { x: 347, y: 191 }, 10, colorFromHex("#56DDE6", 150), pale);
      break;
    case 5:
      drawTinyPulse(image, { x: 176, y: 214 }, "#56DDE6", 95);
      drawSparkle(image, { x: 367, y: 214 }, "#D4A24A", 70);
      break;
    case 6:
      drawSparkle(image, { x: 176, y: 214 }, "#56DDE6", 110);
      drawSparkle(image, { x: 336, y: 214 }, "#56DDE6", 110);
      break;
    case 7:
      drawSweatDrop(image, { x: 349, y: 191 }, 10, colorFromHex("#56DDE6", 150), pale);
      drawTinyPulse(image, { x: 366, y: 124 }, "#C23A3A", 100);
      break;
    case 8:
      drawSparkle(image, { x: 346, y: 142 }, "#D4A24A", 110);
      drawTinyPulse(image, { x: 352, y: 142 }, "#D4A24A", 90);
      break;
    case 9:
      drawSweatDrop(image, { x: 349, y: 194 }, 10, colorFromHex("#56DDE6", 150), pale);
      drawTinyPulse(image, { x: 366, y: 218 }, "#D86CF1", 100);
      break;
    case 10:
      drawSweatDrop(image, { x: 349, y: 190 }, 11, colorFromHex("#56DDE6", 160), pale);
      drawTinyPulse(image, { x: 360, y: 116 }, "#C23A3A", 105);
      drawSparkle(image, { x: 370, y: 212 }, "#D4A24A", 90);
      break;
    default:
      break;
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

function selectedSublayersForRun() {
  const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
  if (!onlyArg) return SUBLAYERS;

  const requested = new Set(
    onlyArg
      .slice("--only=".length)
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
  );
  const selected = SUBLAYERS.filter((sublayer) =>
    requested.has(`${sublayer.attribute}/${sublayer.sublayer}`)
  );

  if (selected.length === 0) {
    throw new Error(`No matching sublayers for --only=${[...requested].join(",")}`);
  }

  return selected;
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
      const emotionStyleClause =
        sublayer.attribute === "emotion" && sublayer.sublayer === "brows"
          ? "Use compact black-titanium cyber brow modules with beveled chrome edges and tiny LED signal lines. They should feel like polished facial hardware, not flat cartoon eyebrow marks or blade-like slashes."
          : sublayer.attribute === "emotion" && sublayer.sublayer === "mouth"
            ? "Use a compact black-titanium cyber mouth grille or small illuminated light port. Keep it mouth-anchored, face-safe, and more like hardware than a flat cartoon mouth."
            : sublayer.attribute === "emotion" && sublayer.sublayer === "extras"
              ? "Use tiny face-edge accents only: sweat drops, pulses, and sparkles. Keep them compact and peripheral."
              : "";
      const intuitionClause =
        sublayer.attribute === "intuition"
          ? "This is not an eye, pupil, eyebrow, gaze, or eye glow asset. Do not alter facial expression. Represent intuition using ear radar, head-perimeter signal arcs, halo, or external sensing symbols only."
          : "";

      jobs.push({
        target: `frontend/public${publicSrc(sublayer.attribute, sublayer.sublayer, tier)}`,
        attribute: sublayer.attribute,
        sublayer: sublayer.sublayer,
        tier,
        anchor: sublayer.anchorPolicy,
        anchorOffset: sublayer.anchorOffset ?? { x: 0, y: 0 },
        bboxPolicy: sublayer.bboxPolicy,
        positive_prompt: `${sublayer.promptSubject}, tier ${tier}/10, cyber designer-toy avatar accessory, black chrome and precise LED micro-detail, tight transparent alpha bbox`,
        forbidden_terms: sublayer.forbidden.split(", "),
        prompt: [
          common,
          `Attribute: ${sublayer.attribute}. Sublayer: ${sublayer.sublayer}. Tier: ${tier}/10. Element anchor: ${sublayer.anchorPolicy}.`,
          `Positive request: ${sublayer.promptSubject}.`,
          emotionClause,
          emotionStyleClause,
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
  const selectedSublayers = selectedSublayersForRun();

  for (const sublayer of selectedSublayers) {
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
    `Generated ${selectedSublayers.length * TIERS.length} sublayer PNGs, ${jobs.length} prompt jobs, and ${WORKSPACE_ROOT}/sublayer-manifest.json`
  );
}

main();
