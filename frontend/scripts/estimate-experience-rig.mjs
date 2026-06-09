import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { inflateSync } from "node:zlib";

const root =
  process.argv.find((arg) => arg.startsWith("--root="))?.slice("--root=".length) ??
  (existsSync("public/assets/panda")
    ? "public/assets/panda"
    : "frontend/public/assets/panda");
const output =
  process.argv.find((arg) => arg.startsWith("--output="))?.slice("--output=".length) ??
  (existsSync("public/assets/panda")
    ? "public/assets/panda/experience-rig.initial.json"
    : "frontend/public/assets/panda/experience-rig.initial.json");
const canvasSize = 512;

function pad(n) {
  return String(n).padStart(2, "0");
}

function readUInt32(buffer, offset) {
  return buffer.readUInt32BE(offset);
}

function bytesPerPixel(colorType) {
  if (colorType === 6) return 4;
  if (colorType === 4) return 2;
  if (colorType === 2) return 3;
  if (colorType === 0) return 1;
  throw new Error(`Unsupported PNG color type ${colorType}`);
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

function parsePng(path) {
  const buffer = readFileSync(path);
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("Invalid PNG signature");
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

  if (bitDepth !== 8) throw new Error(`Unsupported bit depth ${bitDepth}`);
  const bpp = bytesPerPixel(colorType);
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = unfilterScanlines(raw, width, height, bpp);

  return { width, height, colorType, bpp, pixels };
}

function sample(png, x, y) {
  const i = (y * png.width + x) * png.bpp;
  const r = png.pixels[i] ?? 0;
  const g = png.pixels[i + 1] ?? r;
  const b = png.pixels[i + 2] ?? r;
  const alpha = png.colorType === 6 ? png.pixels[i + 3] : png.colorType === 4 ? png.pixels[i + 1] : 255;
  return { r, g, b, alpha, luma: 0.2126 * r + 0.7152 * g + 0.0722 * b };
}

function bboxForPixels(png, predicate) {
  let count = 0;
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (!predicate(sample(png, x, y), x, y)) continue;
      count += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return count > 0
    ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, count }
    : null;
}

function toCanvasRect(rect, png) {
  return {
    x: Number(((rect.x / png.width) * canvasSize).toFixed(1)),
    y: Number(((rect.y / png.height) * canvasSize).toFixed(1)),
    width: Number(((rect.width / png.width) * canvasSize).toFixed(1)),
    height: Number(((rect.height / png.height) * canvasSize).toFixed(1)),
  };
}

function clampRect(rect) {
  const x = Math.max(0, Math.min(canvasSize - 4, rect.x));
  const y = Math.max(0, Math.min(canvasSize - 4, rect.y));
  return {
    x: Number(x.toFixed(1)),
    y: Number(y.toFixed(1)),
    width: Number(Math.max(4, Math.min(canvasSize - x, rect.width)).toFixed(1)),
    height: Number(Math.max(4, Math.min(canvasSize - y, rect.height)).toFixed(1)),
  };
}

function splitEyes(faceRect) {
  const eyeY = faceRect.y + faceRect.height * 0.4;
  const eyeW = faceRect.width * 0.2;
  const eyeH = faceRect.height * 0.26;
  return [
    clampRect({
      x: faceRect.x + faceRect.width * 0.24,
      y: eyeY,
      width: eyeW,
      height: eyeH,
    }),
    clampRect({
      x: faceRect.x + faceRect.width * 0.58,
      y: eyeY,
      width: eyeW,
      height: eyeH,
    }),
  ];
}

function estimateTier(tier) {
  const image = `/assets/panda/experience/tier-${pad(tier)}.png`;
  const path = join(root, "experience", `tier-${pad(tier)}.png`);
  if (!existsSync(path)) throw new Error(`${path} is missing`);

  const png = parsePng(path);
  const bodyPx = bboxForPixels(png, (px) => px.alpha > 8);
  if (!bodyPx) throw new Error(`${path} has no visible alpha pixels`);
  const bodyRect = clampRect(toCanvasRect(bodyPx, png));

  const upperLimit = bodyPx.y + bodyPx.height * 0.52;
  const darkPx = bboxForPixels(
    png,
    (px, _x, y) => px.alpha > 12 && px.luma < 116 && y <= upperLimit
  );
  const faceRect = darkPx
    ? clampRect(toCanvasRect(darkPx, png))
    : clampRect({
        x: bodyRect.x + bodyRect.width * 0.22,
        y: bodyRect.y,
        width: bodyRect.width * 0.56,
        height: bodyRect.height * 0.42,
      });

  const [leftEye, rightEye] = splitEyes(faceRect);
  const nose = clampRect({
    x: faceRect.x + faceRect.width * 0.45,
    y: faceRect.y + faceRect.height * 0.61,
    width: faceRect.width * 0.14,
    height: faceRect.height * 0.09,
  });
  const mouth = clampRect({
    x: faceRect.x + faceRect.width * 0.38,
    y: faceRect.y + faceRect.height * 0.72,
    width: faceRect.width * 0.24,
    height: faceRect.height * 0.08,
  });

  return {
    image,
    faceRect,
    leftEye,
    rightEye,
    nose,
    mouth,
    bodyRect,
    headCenter: {
      x: Number((faceRect.x + faceRect.width / 2).toFixed(1)),
      y: Number((faceRect.y + faceRect.height * 0.18).toFixed(1)),
    },
    feetBase: {
      x: Number((bodyRect.x + bodyRect.width / 2).toFixed(1)),
      y: Number((bodyRect.y + bodyRect.height).toFixed(1)),
    },
  };
}

const manifest = {
  version: 1,
  coordinateSpace: { width: canvasSize, height: canvasSize, unit: "px" },
  tiers: {},
};
const failures = [];

for (let tier = 1; tier <= 10; tier += 1) {
  try {
    manifest.tiers[`tier-${pad(tier)}`] = estimateTier(tier);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
    manifest.tiers[`tier-${pad(tier)}`] = {
      image: `/assets/panda/experience/tier-${pad(tier)}.png`,
      faceRect: { x: 140, y: 80, width: 232, height: 172 },
      leftEye: { x: 185, y: 140, width: 52, height: 44 },
      rightEye: { x: 276, y: 140, width: 52, height: 44 },
      nose: { x: 236, y: 190, width: 40, height: 24 },
      mouth: { x: 224, y: 220, width: 64, height: 14 },
      bodyRect: { x: 120, y: 250, width: 272, height: 220 },
      headCenter: { x: 256, y: 100 },
      feetBase: { x: 256, y: 470 },
    };
  }
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, failures }, null, 2));
