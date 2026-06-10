import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const FRONTEND_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO_ROOT = dirname(FRONTEND_ROOT);
const ASSET_ROOT = join(FRONTEND_ROOT, "public/assets/panda");
const EMOTION_LAYER_ORDER = ["brows", "mouth", "extras"];
const CONTACT_SHEET_PATH = join(
  REPO_ROOT,
  "tmp/imagegen/reports/panda-emotion-support-round-contact-sheet.png"
);

const IMAGE_SIZE = 1024;
const CANVAS_SIZE = 512;
const TIERS = Array.from({ length: 10 }, (_, index) => index + 1);
const FROM_ASSETS = process.argv.includes("--from-assets");

const EYE_CENTERS = [
  { x: 206, y: 166, side: -1 },
  { x: 306, y: 166, side: 1 },
];

const EYE_STYLES = {
  1: {
    label: "numb",
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
    label: "low-calm",
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
    label: "calm",
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
    label: "cautious",
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
    label: "focused",
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
    label: "excited",
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
    label: "frustrated",
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
    label: "greedy",
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
    label: "nervous",
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
    label: "panic",
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

function pad(value) {
  return String(value).padStart(2, "0");
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

function createImage(width = IMAGE_SIZE, height = IMAGE_SIZE) {
  return Buffer.alloc(width * height * 4);
}

function blendPixel(buffer, width, height, x, y, rgba) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const i = (y * width + x) * 4;
  const sourceA = rgba[3] / 255;
  const targetA = buffer[i + 3] / 255;
  const outA = sourceA + targetA * (1 - sourceA);
  if (outA <= 0) return;
  buffer[i] = Math.round((rgba[0] * sourceA + buffer[i] * targetA * (1 - sourceA)) / outA);
  buffer[i + 1] = Math.round((rgba[1] * sourceA + buffer[i + 1] * targetA * (1 - sourceA)) / outA);
  buffer[i + 2] = Math.round((rgba[2] * sourceA + buffer[i + 2] * targetA * (1 - sourceA)) / outA);
  buffer[i + 3] = Math.round(outA * 255);
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
        if (normalized <= 1 && inner >= 1) {
          blendPixel(buffer, IMAGE_SIZE, IMAGE_SIZE, x, y, rgba);
        }
      } else if (normalized <= 1) {
        blendPixel(buffer, IMAGE_SIZE, IMAGE_SIZE, x, y, rgba);
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
          blendPixel(buffer, IMAGE_SIZE, IMAGE_SIZE, x, y, rgba);
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
  drawEllipse(
    image,
    { x: gaze.x - eye.side * 1.5, y: gaze.y + 1 },
    { x: style.pupil, y: style.pupil + 1.5 },
    pupil
  );
  drawEllipse(image, { x: gaze.x - eye.side * 5, y: gaze.y - 6 }, { x: 3.8, y: 3.8 }, highlight);
  drawEllipse(
    image,
    { x: gaze.x + eye.side * 5.5, y: gaze.y + 5 },
    { x: 2.2, y: 2.2 },
    colorFromHex(style.iris, Math.min(150, style.irisAlpha))
  );
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

function drawCurveStroke(image, points, width, rgba) {
  for (let index = 0; index < points.length - 1; index += 1) {
    drawLine(image, points[index], points[index + 1], width, rgba);
  }
}

function drawSoftTick(image, from, to, width, rgba) {
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

function drawBrowPlate(image, basePoints, accentPoints, baseWidth, accentWidth, baseColor, accentColor, options = {}) {
  drawCurveStroke(image, basePoints, baseWidth, baseColor);
  drawCurveStroke(image, accentPoints, accentWidth, accentColor);
  drawEllipse(image, basePoints[0], { x: options.endSize ?? 1.8, y: options.endSize ?? 1.8 }, baseColor);
  drawEllipse(
    image,
    basePoints[basePoints.length - 1],
    { x: options.endSize ?? 1.8, y: options.endSize ?? 1.8 },
    baseColor
  );
  if (options.centerPulse) {
    drawTinyPulse(
      image,
      options.centerPulse,
      options.centerPulseColor ?? "#56DDE6",
      options.centerPulseAlpha ?? 84
    );
  }
  if (options.centerSparkle) {
    drawSparkle(
      image,
      options.centerSparkle,
      options.centerSparkleColor ?? "#56DDE6",
      options.centerSparkleAlpha ?? 84
    );
  }
}

function drawMouthPlate(image, basePoints, accentPoints, baseWidth, accentWidth, baseColor, accentColor, options = {}) {
  drawCurveStroke(image, basePoints, baseWidth, baseColor);
  drawCurveStroke(image, accentPoints, accentWidth, accentColor);
  drawEllipse(image, basePoints[0], { x: options.endSize ?? 1.5, y: options.endSize ?? 1.5 }, baseColor);
  drawEllipse(
    image,
    basePoints[basePoints.length - 1],
    { x: options.endSize ?? 1.5, y: options.endSize ?? 1.5 },
    baseColor
  );
  if (options.centerPulse) {
    drawTinyPulse(
      image,
      options.centerPulse,
      options.centerPulseColor ?? "#56DDE6",
      options.centerPulseAlpha ?? 70
    );
  }
}

function renderEmotionEyes(tier) {
  const image = createImage();
  const style = EYE_STYLES[tier] ?? EYE_STYLES[5];
  for (const eye of EYE_CENTERS) {
    renderRoundPandaEye(image, eye, style);
  }
  return image;
}

function renderEmotionBrows(tier) {
  const image = createImage();
  const dark = colorFromHex("#11151B", 210);
  const chrome = colorFromHex("#2A313B", 180);
  const teal = colorFromHex("#56DDE6", 170);
  const red = colorFromHex("#C23A3A", 176);
  const amber = colorFromHex("#D4A24A", 180);
  const pale = colorFromHex("#F1F6F9", 135);

  switch (tier) {
    case 1:
      drawBrowPlate(
        image,
        [{ x: 189, y: 141 }, { x: 206, y: 139 }, { x: 231, y: 141 }],
        [{ x: 191, y: 140 }, { x: 206, y: 138 }, { x: 228, y: 140 }],
        4.8,
        1.8,
        dark,
        chrome
      );
      drawBrowPlate(
        image,
        [{ x: 281, y: 141 }, { x: 306, y: 139 }, { x: 323, y: 141 }],
        [{ x: 284, y: 140 }, { x: 306, y: 138 }, { x: 321, y: 140 }],
        4.8,
        1.8,
        dark,
        chrome
      );
      break;
    case 2:
      drawBrowPlate(
        image,
        [{ x: 188, y: 140 }, { x: 206, y: 137 }, { x: 230, y: 139 }],
        [{ x: 191, y: 139 }, { x: 206, y: 136 }, { x: 228, y: 138 }],
        5,
        1.9,
        dark,
        chrome
      );
      drawBrowPlate(
        image,
        [{ x: 282, y: 139 }, { x: 306, y: 137 }, { x: 324, y: 140 }],
        [{ x: 284, y: 138 }, { x: 306, y: 136 }, { x: 321, y: 139 }],
        5,
        1.9,
        dark,
        chrome
      );
      break;
    case 3:
      drawBrowPlate(
        image,
        [{ x: 187, y: 138 }, { x: 206, y: 132 }, { x: 231, y: 137 }],
        [{ x: 190, y: 137 }, { x: 206, y: 131 }, { x: 228, y: 136 }],
        5,
        2,
        dark,
        teal,
        { centerPulse: { x: 256, y: 134 }, centerPulseColor: "#56DDE6", centerPulseAlpha: 72 }
      );
      drawBrowPlate(
        image,
        [{ x: 281, y: 137 }, { x: 306, y: 132 }, { x: 325, y: 138 }],
        [{ x: 284, y: 136 }, { x: 306, y: 131 }, { x: 322, y: 137 }],
        5,
        2,
        dark,
        teal,
        { centerPulse: { x: 256, y: 134 }, centerPulseColor: "#56DDE6", centerPulseAlpha: 72 }
      );
      break;
    case 4:
      drawBrowPlate(
        image,
        [{ x: 188, y: 140 }, { x: 206, y: 135 }, { x: 231, y: 136 }],
        [{ x: 191, y: 139 }, { x: 206, y: 134 }, { x: 228, y: 135 }],
        5,
        2.1,
        dark,
        teal,
        { centerPulse: { x: 256, y: 134 }, centerPulseColor: "#56DDE6", centerPulseAlpha: 90 }
      );
      drawBrowPlate(
        image,
        [{ x: 281, y: 136 }, { x: 306, y: 135 }, { x: 324, y: 140 }],
        [{ x: 284, y: 135 }, { x: 306, y: 134 }, { x: 321, y: 139 }],
        5,
        2.1,
        dark,
        teal,
        { centerPulse: { x: 256, y: 134 }, centerPulseColor: "#56DDE6", centerPulseAlpha: 90 }
      );
      break;
    case 5:
      drawBrowPlate(
        image,
        [{ x: 188, y: 139 }, { x: 206, y: 133 }, { x: 231, y: 138 }],
        [{ x: 190, y: 138 }, { x: 206, y: 132 }, { x: 229, y: 137 }],
        5.2,
        2.2,
        dark,
        teal,
        { centerPulse: { x: 256, y: 135 }, centerPulseColor: "#C7FFFF", centerPulseAlpha: 82 }
      );
      drawBrowPlate(
        image,
        [{ x: 281, y: 138 }, { x: 306, y: 133 }, { x: 324, y: 139 }],
        [{ x: 283, y: 137 }, { x: 306, y: 132 }, { x: 322, y: 138 }],
        5.2,
        2.2,
        dark,
        teal,
        { centerPulse: { x: 256, y: 135 }, centerPulseColor: "#C7FFFF", centerPulseAlpha: 82 }
      );
      break;
    case 6:
      drawBrowPlate(
        image,
        [{ x: 187, y: 136 }, { x: 206, y: 129 }, { x: 232, y: 135 }],
        [{ x: 190, y: 135 }, { x: 206, y: 128 }, { x: 229, y: 134 }],
        5.2,
        2.2,
        dark,
        teal,
        { centerPulse: { x: 255, y: 131 }, centerPulseColor: "#F2D889", centerPulseAlpha: 92 }
      );
      drawBrowPlate(
        image,
        [{ x: 280, y: 135 }, { x: 306, y: 129 }, { x: 325, y: 136 }],
        [{ x: 283, y: 134 }, { x: 306, y: 128 }, { x: 322, y: 135 }],
        5.2,
        2.2,
        dark,
        teal,
        { centerPulse: { x: 255, y: 131 }, centerPulseColor: "#F2D889", centerPulseAlpha: 92 }
      );
      break;
    case 7:
      drawBrowPlate(
        image,
        [{ x: 188, y: 139 }, { x: 205, y: 145 }, { x: 231, y: 136 }],
        [{ x: 191, y: 140 }, { x: 205, y: 143 }, { x: 229, y: 137 }],
        5.5,
        2.2,
        red,
        dark,
        { centerPulse: { x: 256, y: 142 }, centerPulseColor: "#F15A5A", centerPulseAlpha: 100 }
      );
      drawBrowPlate(
        image,
        [{ x: 281, y: 136 }, { x: 307, y: 145 }, { x: 324, y: 139 }],
        [{ x: 283, y: 137 }, { x: 307, y: 143 }, { x: 321, y: 138 }],
        5.5,
        2.2,
        red,
        dark,
        { centerPulse: { x: 256, y: 142 }, centerPulseColor: "#F15A5A", centerPulseAlpha: 100 }
      );
      break;
    case 8:
      drawBrowPlate(
        image,
        [{ x: 188, y: 136 }, { x: 206, y: 130 }, { x: 230, y: 134 }],
        [{ x: 191, y: 135 }, { x: 206, y: 129 }, { x: 228, y: 133 }],
        5.2,
        2.2,
        amber,
        chrome,
        { centerPulse: { x: 333, y: 130 }, centerPulseColor: "#F2D889", centerPulseAlpha: 90 }
      );
      drawBrowPlate(
        image,
        [{ x: 282, y: 134 }, { x: 306, y: 129 }, { x: 324, y: 136 }],
        [{ x: 284, y: 133 }, { x: 306, y: 128 }, { x: 321, y: 135 }],
        5.2,
        2.2,
        amber,
        chrome,
        { centerPulse: { x: 333, y: 130 }, centerPulseColor: "#F2D889", centerPulseAlpha: 90 }
      );
      break;
    case 9:
      drawBrowPlate(
        image,
        [{ x: 187, y: 132 }, { x: 205, y: 126 }, { x: 231, y: 131 }],
        [{ x: 190, y: 131 }, { x: 205, y: 125 }, { x: 228, y: 130 }],
        5.4,
        2.2,
        dark,
        red,
        { centerPulse: { x: 255, y: 128 }, centerPulseColor: "#C23A3A", centerPulseAlpha: 100 }
      );
      drawBrowPlate(
        image,
        [{ x: 281, y: 131 }, { x: 307, y: 126 }, { x: 325, y: 132 }],
        [{ x: 283, y: 130 }, { x: 307, y: 125 }, { x: 322, y: 131 }],
        5.4,
        2.2,
        dark,
        red,
        { centerPulse: { x: 255, y: 128 }, centerPulseColor: "#C23A3A", centerPulseAlpha: 100 }
      );
      drawSweatDrop(image, { x: 350, y: 145 }, 9, colorFromHex("#56DDE6", 155), pale);
      break;
    case 10:
      drawBrowPlate(
        image,
        [{ x: 186, y: 130 }, { x: 205, y: 123 }, { x: 231, y: 129 }],
        [{ x: 189, y: 129 }, { x: 205, y: 122 }, { x: 228, y: 128 }],
        5.6,
        2.2,
        red,
        chrome,
        { centerPulse: { x: 255, y: 124 }, centerPulseColor: "#F2D889", centerPulseAlpha: 105 }
      );
      drawBrowPlate(
        image,
        [{ x: 281, y: 129 }, { x: 307, y: 123 }, { x: 326, y: 130 }],
        [{ x: 283, y: 128 }, { x: 307, y: 122 }, { x: 323, y: 129 }],
        5.6,
        2.2,
        red,
        chrome,
        { centerPulse: { x: 255, y: 124 }, centerPulseColor: "#F2D889", centerPulseAlpha: 105 }
      );
      drawSweatDrop(image, { x: 350, y: 136 }, 10, colorFromHex("#56DDE6", 170), pale);
      break;
    default:
      break;
  }

  return image;
}

function renderEmotionMouth(tier) {
  const image = createImage();
  const dark = colorFromHex("#11151B", 210);
  const chrome = colorFromHex("#2A313B", 180);
  const red = colorFromHex("#C23A3A", 176);
  const amber = colorFromHex("#D4A24A", 180);
  const teal = colorFromHex("#56DDE6", 165);
  const pale = colorFromHex("#F1F6F9", 130);

  switch (tier) {
    case 1:
      drawMouthPlate(
        image,
        [{ x: 240, y: 225 }, { x: 256, y: 224 }, { x: 272, y: 225 }],
        [{ x: 243, y: 225 }, { x: 256, y: 224 }, { x: 269, y: 225 }],
        4.5,
        1.8,
        dark,
        chrome
      );
      break;
    case 2:
      drawMouthPlate(
        image,
        [{ x: 240, y: 225 }, { x: 256, y: 224 }, { x: 272, y: 225 }],
        [{ x: 243, y: 224 }, { x: 256, y: 223 }, { x: 269, y: 224 }],
        4.6,
        2,
        dark,
        chrome
      );
      break;
    case 3:
      drawMouthPlate(
        image,
        [{ x: 240, y: 225 }, { x: 256, y: 219 }, { x: 272, y: 225 }],
        [{ x: 243, y: 224 }, { x: 256, y: 218 }, { x: 269, y: 224 }],
        4.8,
        2.1,
        dark,
        teal,
        { centerPulse: { x: 256, y: 227 }, centerPulseColor: "#56DDE6", centerPulseAlpha: 72 }
      );
      break;
    case 4:
      drawMouthPlate(
        image,
        [{ x: 241, y: 223 }, { x: 256, y: 221 }, { x: 271, y: 223 }],
        [{ x: 244, y: 223 }, { x: 256, y: 220 }, { x: 268, y: 223 }],
        4.8,
        2.1,
        dark,
        chrome
      );
      break;
    case 5:
      drawMouthPlate(
        image,
        [{ x: 241, y: 224 }, { x: 256, y: 219 }, { x: 271, y: 224 }],
        [{ x: 244, y: 223 }, { x: 256, y: 218 }, { x: 268, y: 223 }],
        4.9,
        2.1,
        dark,
        teal,
        { centerPulse: { x: 256, y: 228 }, centerPulseColor: "#C7FFFF", centerPulseAlpha: 60 }
      );
      break;
    case 6:
      drawMouthPlate(
        image,
        [{ x: 243, y: 223 }, { x: 256, y: 214 }, { x: 269, y: 223 }],
        [{ x: 246, y: 222 }, { x: 256, y: 216 }, { x: 266, y: 222 }],
        4.8,
        2.1,
        dark,
        teal,
        { centerPulse: { x: 256, y: 224 }, centerPulseColor: "#69E6F0", centerPulseAlpha: 90 }
      );
      drawEllipse(image, { x: 256, y: 224 }, { x: 10, y: 8 }, colorFromHex("#69E6F0", 140));
      drawEllipse(image, { x: 256, y: 221 }, { x: 4, y: 3 }, pale);
      break;
    case 7:
      drawMouthPlate(
        image,
        [{ x: 241, y: 226 }, { x: 256, y: 230 }, { x: 271, y: 226 }],
        [{ x: 244, y: 225 }, { x: 256, y: 229 }, { x: 268, y: 225 }],
        4.8,
        2,
        dark,
        red
      );
      break;
    case 8:
      drawMouthPlate(
        image,
        [{ x: 243, y: 223 }, { x: 256, y: 219 }, { x: 269, y: 223 }],
        [{ x: 245, y: 222 }, { x: 256, y: 218 }, { x: 267, y: 222 }],
        4.9,
        2.1,
        dark,
        amber,
        { centerPulse: { x: 256, y: 228 }, centerPulseColor: "#F2D889", centerPulseAlpha: 78 }
      );
      break;
    case 9:
      drawMouthPlate(
        image,
        [{ x: 243, y: 224 }, { x: 256, y: 225 }, { x: 269, y: 224 }],
        [{ x: 245, y: 224 }, { x: 256, y: 224 }, { x: 267, y: 224 }],
        4.8,
        2,
        dark,
        chrome
      );
      drawEllipse(image, { x: 256, y: 225 }, { x: 12, y: 8 }, colorFromHex("#56DDE6", 145), { stroke: 3 });
      drawLine(image, { x: 248, y: 223 }, { x: 264, y: 223 }, 1.6, red);
      drawSweatDrop(image, { x: 345, y: 208 }, 8, colorFromHex("#56DDE6", 155), pale);
      break;
    case 10:
      drawMouthPlate(
        image,
        [{ x: 242, y: 223 }, { x: 256, y: 224 }, { x: 270, y: 223 }],
        [{ x: 245, y: 223 }, { x: 256, y: 223 }, { x: 267, y: 223 }],
        5,
        2.2,
        red,
        chrome
      );
      drawEllipse(image, { x: 256, y: 224 }, { x: 14, y: 10 }, colorFromHex("#56DDE6", 155), { stroke: 4 });
      drawEllipse(image, { x: 256, y: 225 }, { x: 7, y: 5 }, red);
      drawTinyPulse(image, { x: 258, y: 229 }, "#F2D889", 88);
      break;
    default:
      break;
  }

  return image;
}

function renderEmotionExtras(tier) {
  const image = createImage();
  const cyan = "#56DDE6";
  const red = "#C23A3A";
  const amber = "#D4A24A";
  const magenta = "#D86CF1";
  const pale = colorFromHex("#F1F6F9", 130);

  switch (tier) {
    case 1:
      drawSweatDrop(image, { x: 349, y: 203 }, 8, colorFromHex(cyan, 150), pale);
      break;
    case 2:
      drawSparkle(image, { x: 348, y: 194 }, cyan, 112);
      break;
    case 3:
      drawTinyPulse(image, { x: 174, y: 214 }, cyan, 90);
      break;
    case 4:
      drawSweatDrop(image, { x: 347, y: 191 }, 10, colorFromHex(cyan, 150), pale);
      break;
    case 5:
      drawTinyPulse(image, { x: 176, y: 214 }, cyan, 95);
      drawSparkle(image, { x: 367, y: 214 }, amber, 70);
      break;
    case 6:
      drawSparkle(image, { x: 176, y: 214 }, cyan, 110);
      drawSparkle(image, { x: 336, y: 214 }, cyan, 110);
      break;
    case 7:
      drawSweatDrop(image, { x: 349, y: 191 }, 10, colorFromHex(cyan, 150), pale);
      drawTinyPulse(image, { x: 366, y: 124 }, red, 100);
      break;
    case 8:
      drawSparkle(image, { x: 346, y: 142 }, amber, 110);
      drawTinyPulse(image, { x: 352, y: 142 }, amber, 90);
      break;
    case 9:
      drawSweatDrop(image, { x: 349, y: 194 }, 10, colorFromHex(cyan, 150), pale);
      drawTinyPulse(image, { x: 366, y: 218 }, magenta, 100);
      break;
    case 10:
      drawSweatDrop(image, { x: 349, y: 190 }, 11, colorFromHex(cyan, 160), pale);
      drawTinyPulse(image, { x: 360, y: 116 }, red, 105);
      drawSparkle(image, { x: 370, y: 212 }, amber, 90);
      break;
    default:
      break;
  }

  return image;
}

function renderEmotionAsset(layer, tier) {
  switch (layer) {
    case "eyes":
      return renderEmotionEyes(tier);
    case "brows":
      return renderEmotionBrows(tier);
    case "mouth":
      return renderEmotionMouth(tier);
    case "extras":
      return renderEmotionExtras(tier);
    default:
      throw new Error(`Unsupported emotion layer ${layer}`);
  }
}

function writePng(path, width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    pixels.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }

  const signature = Buffer.from("89504e470d0a1a0a", "hex");
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    Buffer.concat([
      signature,
      pngChunk("IHDR", ihdr),
      pngChunk("IDAT", deflateSync(raw)),
      pngChunk("IEND", Buffer.alloc(0)),
    ])
  );
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

function readUInt32(buffer, offset) {
  return buffer.readUInt32BE(offset);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilterScanlines(data, width, height, bpp) {
  const stride = width * bpp;
  const out = Buffer.alloc(stride * height);
  let src = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = data[src];
    src += 1;
    const rowStart = y * stride;
    const prevRowStart = rowStart - stride;

    for (let x = 0; x < stride; x += 1) {
      const raw = data[src + x];
      const left = x >= bpp ? out[rowStart + x - bpp] : 0;
      const up = y > 0 ? out[prevRowStart + x] : 0;
      const upLeft = y > 0 && x >= bpp ? out[prevRowStart + x - bpp] : 0;
      let value = raw;

      if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + up;
      else if (filter === 3) value = raw + Math.floor((left + up) / 2);
      else if (filter === 4) value = raw + paeth(left, up, upLeft);
      else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);

      out[rowStart + x] = value & 0xff;
    }
    src += stride;
  }

  return out;
}

function parseRgbaPng(path) {
  const buffer = readFileSync(path);
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error(`Invalid PNG signature for ${path}`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = readUInt32(buffer, offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = readUInt32(data, 0);
      height = readUInt32(data, 4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`Unsupported PNG format for ${path}; expected 8-bit RGBA.`);
  }

  return {
    width,
    height,
    pixels: unfilterScanlines(inflateSync(Buffer.concat(idat)), width, height, 4),
  };
}

function compositeOverlay(base, overlay) {
  if (base.width !== IMAGE_SIZE || base.height !== IMAGE_SIZE) {
    throw new Error(`Expected ${IMAGE_SIZE}x${IMAGE_SIZE} base image for contact sheet.`);
  }
  const out = Buffer.from(base.pixels);

  for (let i = 0; i < overlay.length; i += 4) {
    const sourceA = overlay[i + 3] / 255;
    if (sourceA <= 0) continue;
    const targetA = out[i + 3] / 255;
    const outA = sourceA + targetA * (1 - sourceA);
    out[i] = Math.round((overlay[i] * sourceA + out[i] * targetA * (1 - sourceA)) / outA);
    out[i + 1] = Math.round((overlay[i + 1] * sourceA + out[i + 1] * targetA * (1 - sourceA)) / outA);
    out[i + 2] = Math.round((overlay[i + 2] * sourceA + out[i + 2] * targetA * (1 - sourceA)) / outA);
    out[i + 3] = Math.round(outA * 255);
  }

  return out;
}

function fill(buffer, width, height, rgba) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      buffer[i] = rgba[0];
      buffer[i + 1] = rgba[1];
      buffer[i + 2] = rgba[2];
      buffer[i + 3] = rgba[3];
    }
  }
}

function copyScaled(source, sourceWidth, sourceHeight, target, targetWidth, targetHeight, dx, dy, size) {
  for (let y = 0; y < size; y += 1) {
    const sy = Math.min(sourceHeight - 1, Math.floor((y / size) * sourceHeight));
    for (let x = 0; x < size; x += 1) {
      const sx = Math.min(sourceWidth - 1, Math.floor((x / size) * sourceWidth));
      const si = (sy * sourceWidth + sx) * 4;
      blendPixel(target, targetWidth, targetHeight, dx + x, dy + y, [
        source[si],
        source[si + 1],
        source[si + 2],
        source[si + 3],
      ]);
    }
  }
}

function createContactSheet(overlaysByLayer) {
  const basesByTier = Object.fromEntries(
    TIERS.map((tier) => [tier, parseRgbaPng(join(ASSET_ROOT, `experience/tier-${pad(tier)}.png`))])
  );
  const cols = 10;
  const rows = EMOTION_LAYER_ORDER.length;
  const cell = 128;
  const gap = 10;
  const width = cols * cell + (cols + 1) * gap;
  const height = rows * cell + (rows + 1) * gap;
  const sheet = createImage(width, height);
  fill(sheet, width, height, colorFromHex("#EFE8DA", 255));

  EMOTION_LAYER_ORDER.forEach((layer, row) => {
    overlaysByLayer[layer].forEach((overlay, index) => {
      const base = basesByTier[overlay.tier];
      const x = gap + index * (cell + gap);
      const y = gap + row * (cell + gap);
      const composite = compositeOverlay(base, overlay.pixels);
      copyScaled(composite, base.width, base.height, sheet, width, height, x, y, cell);
    });
  });

  writePng(CONTACT_SHEET_PATH, width, height, sheet);
}

function bboxForSide(pixels, side) {
  const threshold = 8;
  const leftSide = side === "left";
  let minX = IMAGE_SIZE;
  let minY = IMAGE_SIZE;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < IMAGE_SIZE; y += 1) {
    for (let x = 0; x < IMAGE_SIZE; x += 1) {
      if (leftSide ? x >= IMAGE_SIZE / 2 : x < IMAGE_SIZE / 2) continue;
      const alpha = pixels[(y * IMAGE_SIZE + x) * 4 + 3];
      if (alpha <= threshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;
  const factor = CANVAS_SIZE / IMAGE_SIZE;
  return {
    width: (maxX - minX + 1) * factor,
    height: (maxY - minY + 1) * factor,
  };
}

function main() {
  const overlaysByLayer = Object.fromEntries(
    EMOTION_LAYER_ORDER.map((layer) => [layer, []])
  );

  for (const layer of EMOTION_LAYER_ORDER) {
    const outputRoot = join(ASSET_ROOT, "emotions", layer);
    mkdirSync(outputRoot, { recursive: true });

    for (const tier of TIERS) {
      const path = join(outputRoot, `tier-${pad(tier)}.png`);
      const pixels = FROM_ASSETS ? parseRgbaPng(path).pixels : renderEmotionAsset(layer, tier);
      if (!FROM_ASSETS) writePng(path, IMAGE_SIZE, IMAGE_SIZE, pixels);
      overlaysByLayer[layer].push({ tier, pixels });

      if (layer === "eyes") {
        const left = bboxForSide(pixels, "left");
        const right = bboxForSide(pixels, "right");
        const leftRatio = left ? (left.width / left.height).toFixed(2) : "n/a";
        const rightRatio = right ? (right.width / right.height).toFixed(2) : "n/a";
        console.log(
          `tier-${pad(tier)} ${EYE_STYLES[tier].label}: left ratio ${leftRatio}, right ratio ${rightRatio}`
        );
      }
    }
  }

  createContactSheet(overlaysByLayer);
  console.log(
    `${FROM_ASSETS ? "Read" : "Generated"} ${
      TIERS.length * EMOTION_LAYER_ORDER.length
    } emotion overlays in ${join(ASSET_ROOT, "emotions")}`
  );
  console.log(`Wrote contact sheet to ${CONTACT_SHEET_PATH}`);
}

main();
