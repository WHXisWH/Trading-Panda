import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

const root =
  process.argv.find((arg) => arg.startsWith("--root="))?.slice("--root=".length) ??
  (existsSync("public/assets/panda")
    ? "public/assets/panda"
    : "frontend/public/assets/panda");
const canvasSize = 512;
const alphaThreshold = 8;

function readUInt32(buffer, offset) {
  return buffer.readUInt32BE(offset);
}

function bytesPerPixel(colorType) {
  if (colorType === 6) return 4;
  if (colorType === 4) return 2;
  if (colorType === 2) return 3;
  if (colorType === 0) return 1;
  throw new Error(`Unsupported PNG color type ${colorType}; expected RGBA, RGB, gray, or gray-alpha.`);
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

function placementKeyFromSrc(src) {
  return src.replace(/^\/assets\/panda\//, "").replace(/\.png$/, "");
}

function fullAssetPath(src) {
  return join(root, src.replace("/assets/panda/", ""));
}

function readPngAlphaBbox(path) {
  const buffer = readFileSync(path);
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") throw new Error("Invalid PNG signature");

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

  if (bitDepth !== 8) throw new Error(`Unsupported bit depth ${bitDepth}; expected 8.`);

  const bpp = bytesPerPixel(colorType);
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = unfilterScanlines(raw, width, height, bpp);
  let alphaPixels = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    const row = y * width * bpp;
    for (let x = 0; x < width; x += 1) {
      const i = row + x * bpp;
      const alpha = colorType === 6 ? pixels[i + 3] : colorType === 4 ? pixels[i + 1] : 255;
      if (alpha > alphaThreshold) {
        alphaPixels += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return {
    canvasWidth: width,
    canvasHeight: height,
    alphaPixels,
    bbox:
      alphaPixels > 0
        ? {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
          }
        : null,
  };
}

const manifest = JSON.parse(readFileSync(join(root, "sublayer-manifest.json"), "utf8"));
const assets = {};

for (const layer of manifest.layers ?? []) {
  const key = placementKeyFromSrc(layer.src);
  const path = fullAssetPath(layer.src);
  if (!existsSync(path)) {
    assets[key] = {
      canvasWidth: canvasSize,
      canvasHeight: canvasSize,
      alphaPixels: 0,
      bbox: null,
      missing: true,
    };
    continue;
  }

  assets[key] = readPngAlphaBbox(path);
}

const output = {
  version: 1,
  coordinateSpace: {
    width: canvasSize,
    height: canvasSize,
    unit: "px",
  },
  alphaThreshold,
  assets: Object.fromEntries(Object.entries(assets).sort(([a], [b]) => a.localeCompare(b))),
};

writeFileSync(join(root, "sublayer-source-bboxes.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      root,
      assets: Object.keys(output.assets).length,
      output: join(root, "sublayer-source-bboxes.json"),
    },
    null,
    2
  )
);
