import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { inflateSync } from "node:zlib";

const root =
  process.argv.find((arg) => arg.startsWith("--root="))?.slice("--root=".length) ??
  (existsSync("public/assets/panda")
    ? "public/assets/panda"
    : "frontend/public/assets/panda");
const allowMissing = process.argv.includes("--allow-missing");
const canvasSize = 512;
const alphaThreshold = 8;

const anchorPolicies = new Set([
  "faceTopCenter",
  "leftEyeCenter",
  "rightEyeCenter",
  "eyesMidpoint",
  "mouthCenter",
  "bodyCenter",
  "upperBodyCenter",
  "feetBase",
  "headCenterOffset",
]);

const bboxPolicies = new Set([
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
]);

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

function rectCenter(rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function rectTopCenter(rect) {
  return { x: rect.x + rect.width / 2, y: rect.y };
}

function averagePoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function pointWithOffset(point, offset) {
  if (!offset) return point;
  return { x: point.x + offset.x, y: point.y + offset.y };
}

function pointInRect(point, rect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function rectInsideCanvas(rect) {
  return (
    Number.isFinite(rect.x) &&
    Number.isFinite(rect.y) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    rect.width > 0 &&
    rect.height > 0 &&
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x + rect.width <= canvasSize &&
    rect.y + rect.height <= canvasSize
  );
}

function scaleRect(rect, fromSize, toSize = canvasSize) {
  const scale = toSize / fromSize;
  return {
    x: rect.x * scale,
    y: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

function rectPixelArea(rect, imageSize) {
  const scale = imageSize / canvasSize;
  return Math.max(1, rect.width * scale * rect.height * scale);
}

function rectArea(rect) {
  return Math.max(1, rect.width * rect.height);
}

function bboxAspectRatio(bbox) {
  if (!bbox || bbox.height <= 0) return Infinity;
  return bbox.width / bbox.height;
}

function rectScale(current, baseline) {
  const widthScale = baseline.width === 0 ? 1 : current.width / baseline.width;
  const heightScale = baseline.height === 0 ? 1 : current.height / baseline.height;
  return Math.sqrt(Math.max(0.01, widthScale * heightScale));
}

function placementKeyFromSrc(src) {
  return src.replace(/^\/assets\/panda\//, "").replace(/\.png$/, "");
}

function placementTemplateKeyForTier(assetKey, tierKey) {
  return assetKey.replace(/tier-\d{2}$/, tierKey);
}

function placementGroupKey(assetKey) {
  return assetKey.replace(/\/tier-\d{2}$/, "");
}

function tierNumber(tierKey) {
  return Number(tierKey.slice(-2));
}

function isTierKey(value) {
  return /^tier-\d{2}$/.test(value) && tierNumber(value) >= 1 && tierNumber(value) <= 10;
}

function tierDistance(a, b) {
  return Math.abs(tierNumber(a) - tierNumber(b));
}

function rotateVector(point, rotationDegrees) {
  const radians = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

function sourceBboxCenter(entry) {
  if (!entry?.bbox) {
    return {
      x: (entry?.canvasWidth ?? canvasSize) / 2,
      y: (entry?.canvasHeight ?? canvasSize) / 2,
    };
  }
  return {
    x: entry.bbox.x + entry.bbox.width / 2,
    y: entry.bbox.y + entry.bbox.height / 2,
  };
}

function sourceAnchorLocalVector(entry, rect) {
  const anchor = sourceBboxCenter(entry);
  return {
    x: (anchor.x / entry.canvasWidth) * rect.width - rect.width / 2,
    y: (anchor.y / entry.canvasHeight) * rect.height - rect.height / 2,
  };
}

function renderedSourceAnchor(rect, entry) {
  const center = rectCenter(rect);
  const local = sourceAnchorLocalVector(entry, rect);
  const rotated = rotateVector(local, rect.rotation ?? 0);
  return {
    x: center.x + rotated.x,
    y: center.y + rotated.y,
  };
}

function normalizedPlacementFromTemplate(assetKey, templateAssetKey, templateRect) {
  const currentEntry = sublayerSourceBboxes?.assets?.[assetKey];
  const templateEntry = sublayerSourceBboxes?.assets?.[templateAssetKey];

  if (
    !currentEntry ||
    !templateEntry ||
    currentEntry.missing ||
    templateEntry.missing ||
    !currentEntry.bbox ||
    !templateEntry.bbox
  ) {
    return null;
  }

  const targetAnchor = renderedSourceAnchor(templateRect, templateEntry);
  const currentLocal = sourceAnchorLocalVector(currentEntry, templateRect);
  const currentRotatedLocal = rotateVector(currentLocal, templateRect.rotation ?? 0);
  return {
    ...templateRect,
    x: targetAnchor.x - currentRotatedLocal.x - templateRect.width / 2,
    y: targetAnchor.y - currentRotatedLocal.y - templateRect.height / 2,
  };
}

function placementCandidateForKeyAndTier(assetKey, tierKey) {
  const rect = sublayerPlacement?.placements?.[assetKey]?.[tierKey];
  if (!rect) return null;
  return {
    assetKey,
    experienceTierKey: tierKey,
    rect,
  };
}

function nearestPlacementCandidateForKey(assetKey, targetTierKey) {
  const byTier = sublayerPlacement?.placements?.[assetKey];
  if (!byTier) return null;

  const candidates = Object.entries(byTier)
    .filter(([tierKey, rect]) => isTierKey(tierKey) && rect)
    .sort(([tierA], [tierB]) => {
      const distance = tierDistance(tierA, targetTierKey) - tierDistance(tierB, targetTierKey);
      if (distance !== 0) return distance;
      return tierNumber(tierA) - tierNumber(tierB);
    });

  const nearest = candidates[0];
  if (!nearest) return null;
  return {
    assetKey,
    experienceTierKey: nearest[0],
    rect: nearest[1],
  };
}

function sameGroupPlacementCandidate(assetKey, targetTierKey, requireTargetTier) {
  const groupKey = placementGroupKey(assetKey);
  const candidates = [];

  for (const [candidateAssetKey, byTier] of Object.entries(sublayerPlacement?.placements ?? {})) {
    if (placementGroupKey(candidateAssetKey) !== groupKey) continue;
    for (const [tierKey, rect] of Object.entries(byTier)) {
      if (!isTierKey(tierKey) || !rect) continue;
      if (requireTargetTier && tierKey !== targetTierKey) continue;
      candidates.push({
        assetKey: candidateAssetKey,
        experienceTierKey: tierKey,
        rect,
      });
    }
  }

  candidates.sort((a, b) => {
    const distance =
      tierDistance(a.experienceTierKey, targetTierKey) -
      tierDistance(b.experienceTierKey, targetTierKey);
    if (distance !== 0) return distance;
    return a.assetKey.localeCompare(b.assetKey);
  });

  return candidates[0] ?? null;
}

function resolveTemplatePlacementCandidate(assetKey, tierKey) {
  const preferredTemplateKey = placementTemplateKeyForTier(assetKey, tierKey);
  return (
    placementCandidateForKeyAndTier(preferredTemplateKey, tierKey) ??
    sameGroupPlacementCandidate(assetKey, tierKey, true) ??
    nearestPlacementCandidateForKey(preferredTemplateKey, tierKey) ??
    sameGroupPlacementCandidate(assetKey, tierKey, false)
  );
}

function placementResolutionForLayer(layer, tierKey) {
  if (!sublayerPlacement?.placements || !layer?.src) return null;
  const assetKey = placementKeyFromSrc(layer.src);
  const exactPlacement = sublayerPlacement.placements[assetKey]?.[tierKey];
  if (exactPlacement) {
    return {
      rect: exactPlacement,
      source: "exact",
      assetKey,
    };
  }

  const template = resolveTemplatePlacementCandidate(assetKey, tierKey);
  if (!template) return null;
  const normalized = normalizedPlacementFromTemplate(assetKey, template.assetKey, template.rect);
  return {
    rect: normalized ?? template.rect,
    source: normalized ? "template-normalized" : "template",
    assetKey,
    templateAssetKey: template.assetKey,
    templateExperienceTierKey: template.experienceTierKey,
  };
}

function transformSourcePoint(point, layer, currentRig, baselineRig) {
  if (!layer || !currentRig || !baselineRig) return point;
  const sourceAnchor = anchorForLayer(layer, baselineRig);
  const targetAnchor = anchorForLayer(layer, currentRig);
  const scale = rectScale(targetAnchor.rect, sourceAnchor.rect);
  return {
    x: targetAnchor.point.x + (point.x - sourceAnchor.point.x) * scale,
    y: targetAnchor.point.y + (point.y - sourceAnchor.point.y) * scale,
  };
}

function transformScaleForLayer(layer, currentRig, baselineRig) {
  if (!layer || !currentRig || !baselineRig) return 1;
  const sourceAnchor = anchorForLayer(layer, baselineRig);
  const targetAnchor = anchorForLayer(layer, currentRig);
  return rectScale(targetAnchor.rect, sourceAnchor.rect);
}

function transformPlacementPoint(point, placement) {
  const center = rectCenter(placement);
  const local = {
    x: (point.x / canvasSize) * placement.width - placement.width / 2,
    y: (point.y / canvasSize) * placement.height - placement.height / 2,
  };
  const rotated = rotateVector(local, placement.rotation ?? 0);
  return {
    x: center.x + rotated.x,
    y: center.y + rotated.y,
  };
}

function parsePng(path, rigTier, layer, baselineRig, placement) {
  const buffer = readFileSync(path);
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") throw new Error("Invalid PNG signature");

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  const metadataText = [];

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
    } else if (type === "tEXt" || type === "iTXt") {
      metadataText.push(data.toString("utf8"));
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8) throw new Error(`Unsupported bit depth ${bitDepth}; expected 8.`);

  const bpp = bytesPerPixel(colorType);
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = unfilterScanlines(raw, width, height, bpp);
  const hasAlpha = colorType === 6 || colorType === 4;
  const transformScale = placement
    ? Math.sqrt((placement.width * placement.height) / (canvasSize * canvasSize))
    : transformScaleForLayer(layer, rigTier, baselineRig);
  const transformedPixelArea = ((canvasSize / width) * transformScale) ** 2;
  const landmarkCounts = {
    leftEye: 0,
    rightEye: 0,
    mouth: 0,
    face: 0,
    body: 0,
  };

  let alphaPixels = 0;
  let minX = canvasSize;
  let minY = canvasSize;
  let maxX = -1;
  let maxY = -1;
  let sourceMinX = width;
  let sourceMinY = height;
  let sourceMaxX = -1;
  let sourceMaxY = -1;
  const sourceHalfBounds = {
    left: {
      minX: width,
      minY: height,
      maxX: -1,
      maxY: -1,
    },
    right: {
      minX: width,
      minY: height,
      maxX: -1,
      maxY: -1,
    },
  };
  const cornerAlpha = [];

  for (let y = 0; y < height; y += 1) {
    const row = y * width * bpp;
    for (let x = 0; x < width; x += 1) {
      const i = row + x * bpp;
      const alpha = colorType === 6 ? pixels[i + 3] : colorType === 4 ? pixels[i + 1] : 255;
      if ((x === 0 || x === width - 1) && (y === 0 || y === height - 1)) {
        cornerAlpha.push(alpha);
      }
      if (alpha > alphaThreshold) {
        alphaPixels += 1;
        sourceMinX = Math.min(sourceMinX, x);
        sourceMinY = Math.min(sourceMinY, y);
        sourceMaxX = Math.max(sourceMaxX, x);
        sourceMaxY = Math.max(sourceMaxY, y);
        const half = x < width / 2 ? sourceHalfBounds.left : sourceHalfBounds.right;
        half.minX = Math.min(half.minX, x);
        half.minY = Math.min(half.minY, y);
        half.maxX = Math.max(half.maxX, x);
        half.maxY = Math.max(half.maxY, y);

        const sourcePoint = {
          x: ((x + 0.5) / width) * canvasSize,
          y: ((y + 0.5) / height) * canvasSize,
        };
        const canvasPoint = placement
          ? transformPlacementPoint(sourcePoint, placement)
          : transformSourcePoint(sourcePoint, layer, rigTier, baselineRig);
        minX = Math.min(minX, canvasPoint.x);
        minY = Math.min(minY, canvasPoint.y);
        maxX = Math.max(maxX, canvasPoint.x);
        maxY = Math.max(maxY, canvasPoint.y);
        if (rigTier) {
          if (pointInRect(canvasPoint, rigTier.leftEye)) landmarkCounts.leftEye += 1;
          if (pointInRect(canvasPoint, rigTier.rightEye)) landmarkCounts.rightEye += 1;
          if (pointInRect(canvasPoint, rigTier.mouth)) landmarkCounts.mouth += 1;
          if (pointInRect(canvasPoint, rigTier.faceRect)) landmarkCounts.face += 1;
          if (pointInRect(canvasPoint, rigTier.bodyRect)) landmarkCounts.body += 1;
        }
      }
    }
  }

  const bbox =
    alphaPixels > 0
      ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
      : null;
  const sourceBbox =
    alphaPixels > 0
      ? {
          x: sourceMinX,
          y: sourceMinY,
          width: sourceMaxX - sourceMinX + 1,
          height: sourceMaxY - sourceMinY + 1,
        }
      : null;
  const scaledSourceBbox = sourceBbox ? scaleRect(sourceBbox, width) : null;
  const sourceHalfBboxes = {
    left:
      sourceHalfBounds.left.maxX >= sourceHalfBounds.left.minX
        ? {
            x: sourceHalfBounds.left.minX,
            y: sourceHalfBounds.left.minY,
            width: sourceHalfBounds.left.maxX - sourceHalfBounds.left.minX + 1,
            height: sourceHalfBounds.left.maxY - sourceHalfBounds.left.minY + 1,
          }
        : null,
    right:
      sourceHalfBounds.right.maxX >= sourceHalfBounds.right.minX
        ? {
            x: sourceHalfBounds.right.minX,
            y: sourceHalfBounds.right.minY,
            width: sourceHalfBounds.right.maxX - sourceHalfBounds.right.minX + 1,
            height: sourceHalfBounds.right.maxY - sourceHalfBounds.right.minY + 1,
          }
        : null,
  };
  const overlapRatios = rigTier
    ? {
      leftEye: (landmarkCounts.leftEye * transformedPixelArea) / rectArea(rigTier.leftEye),
        rightEye: (landmarkCounts.rightEye * transformedPixelArea) / rectArea(rigTier.rightEye),
        eyes:
          ((landmarkCounts.leftEye + landmarkCounts.rightEye) * transformedPixelArea) /
          (rectArea(rigTier.leftEye) + rectArea(rigTier.rightEye)),
        mouth: (landmarkCounts.mouth * transformedPixelArea) / rectArea(rigTier.mouth),
        face: alphaPixels === 0 ? 0 : landmarkCounts.face / alphaPixels,
        body: alphaPixels === 0 ? 0 : landmarkCounts.body / alphaPixels,
      }
    : { leftEye: 0, rightEye: 0, eyes: 0, mouth: 0, face: 0, body: 0 };

  return {
    width,
    height,
    hasAlpha,
    alphaPixels,
    coverage: alphaPixels / (width * height),
    bbox,
    sourceBbox: scaledSourceBbox,
    sourceHalfBboxes,
    transparentCorners: cornerAlpha.every((alpha) => alpha <= alphaThreshold),
    metadataText: metadataText.join("\n"),
    overlapRatios,
  };
}

function validateRigManifest(rig) {
  const errors = [];
  if (!rig || rig.version !== 1) return ["experience-rig.json version must be 1"];
  if (
    rig.coordinateSpace?.width !== canvasSize ||
    rig.coordinateSpace?.height !== canvasSize ||
    rig.coordinateSpace?.unit !== "px"
  ) {
    errors.push("experience-rig.json coordinateSpace must be 512x512 px");
  }

  for (let tier = 1; tier <= 10; tier += 1) {
    const key = `tier-${pad(tier)}`;
    const item = rig.tiers?.[key];
    if (!item) {
      errors.push(`${key} is missing from experience-rig.json`);
      continue;
    }
    if (item.image !== `/assets/panda/experience/${key}.png`) {
      errors.push(`${key}.image has unexpected path`);
    }
    for (const field of ["faceRect", "leftEye", "rightEye", "nose", "mouth", "bodyRect"]) {
      if (!rectInsideCanvas(item[field])) errors.push(`${key}.${field} must be inside 512x512`);
    }
    for (const field of ["headCenter", "feetBase"]) {
      const point = item[field];
      if (
        !Number.isFinite(point?.x) ||
        !Number.isFinite(point?.y) ||
        point.x < 0 ||
        point.x > canvasSize ||
        point.y < 0 ||
        point.y > canvasSize
      ) {
        errors.push(`${key}.${field} must be inside 512x512`);
      }
    }
    for (const field of ["leftEye", "rightEye", "mouth"]) {
      if (item.faceRect && item[field] && !pointInRect(rectCenter(item[field]), item.faceRect)) {
        errors.push(`${key}.${field} center must be inside faceRect`);
      }
    }
  }
  return errors;
}

function isValidLayer(layer) {
  return (
    layer &&
    typeof layer === "object" &&
    typeof layer.attribute === "string" &&
    typeof layer.sublayer === "string" &&
    Number.isInteger(layer.tier) &&
    layer.tier >= 1 &&
    layer.tier <= 10 &&
    typeof layer.src === "string" &&
    layer.src.startsWith("/assets/panda/") &&
    anchorPolicies.has(layer.anchorPolicy) &&
    bboxPolicies.has(layer.bboxPolicy) &&
    Number.isFinite(layer.zIndex) &&
    typeof layer.role === "string" &&
    ["trait", "emotion", "aura"].includes(layer.opacityRule)
  );
}

function validateSublayerManifest(manifest) {
  const errors = [];
  if (!manifest || manifest.version !== 1) return ["sublayer-manifest.json version must be 1"];
  if (
    manifest.coordinateSpace?.width !== canvasSize ||
    manifest.coordinateSpace?.height !== canvasSize ||
    manifest.coordinateSpace?.unit !== "px"
  ) {
    errors.push("sublayer-manifest.json coordinateSpace must be 512x512 px");
  }
  if (!Array.isArray(manifest.layers) || manifest.layers.length === 0) {
    errors.push("sublayer-manifest.json must define at least one layer");
    return errors;
  }

  const seen = new Set();
  for (const layer of manifest.layers) {
    if (!isValidLayer(layer)) {
      errors.push(`invalid sublayer manifest entry: ${JSON.stringify(layer)}`);
      continue;
    }
    const key = `${layer.attribute}/${layer.sublayer}/tier-${pad(layer.tier)}`;
    if (seen.has(key)) errors.push(`duplicate sublayer manifest entry: ${key}`);
    seen.add(key);
  }
  return errors;
}

function anchorForLayer(layer, rigTier) {
  const leftEyeCenter = rectCenter(rigTier.leftEye);
  const rightEyeCenter = rectCenter(rigTier.rightEye);
  const upperBodyRect = {
    x: rigTier.bodyRect.x,
    y: rigTier.bodyRect.y,
    width: rigTier.bodyRect.width,
    height: rigTier.bodyRect.height * 0.45,
  };

  switch (layer.anchorPolicy) {
    case "faceTopCenter":
      return {
        point: pointWithOffset(rectTopCenter(rigTier.faceRect), layer.anchorOffset),
        rect: rigTier.faceRect,
      };
    case "leftEyeCenter":
      return {
        point: pointWithOffset(leftEyeCenter, layer.anchorOffset),
        rect: rigTier.leftEye,
      };
    case "rightEyeCenter":
      return {
        point: pointWithOffset(rightEyeCenter, layer.anchorOffset),
        rect: rigTier.rightEye,
      };
    case "eyesMidpoint":
      return {
        point: pointWithOffset(averagePoint(leftEyeCenter, rightEyeCenter), layer.anchorOffset),
        rect: rigTier.faceRect,
      };
    case "mouthCenter":
      return {
        point: pointWithOffset(rectCenter(rigTier.mouth), layer.anchorOffset),
        rect: rigTier.mouth,
      };
    case "bodyCenter":
      return {
        point: pointWithOffset(rectCenter(rigTier.bodyRect), layer.anchorOffset),
        rect: rigTier.bodyRect,
      };
    case "upperBodyCenter":
      return {
        point: pointWithOffset(rectCenter(upperBodyRect), layer.anchorOffset),
        rect: upperBodyRect,
      };
    case "feetBase":
      return {
        point: pointWithOffset(rigTier.feetBase, layer.anchorOffset),
        rect: rigTier.bodyRect,
      };
    case "headCenterOffset":
      return {
        point: pointWithOffset(rigTier.headCenter, layer.anchorOffset),
        rect: rigTier.faceRect,
      };
    default:
      return { point: rectCenter(rigTier.bodyRect), rect: rigTier.bodyRect };
  }
}

function readPromptMap() {
  const candidates = [
    "tmp/imagegen/panda-sublayer-prompts.jsonl",
    "../tmp/imagegen/panda-sublayer-prompts.jsonl",
  ];
  const file = candidates.find((candidate) => existsSync(candidate));
  if (!file) return new Map();
  const map = new Map();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const item = JSON.parse(line);
      if (typeof item.target === "string") map.set(item.target, item);
    } catch {
      // Ignore malformed prompt rows; prompt generation is validated elsewhere.
    }
  }
  return map;
}

function fullAssetPath(src) {
  return join(root, src.replace("/assets/panda/", ""));
}

function promptTarget(src) {
  return `frontend/public${src}`;
}

function forbiddenPositivePromptTerms(layer, promptJob, metrics) {
  if (layer.attribute !== "intuition") return [];
  const text = [
    promptJob?.positive_prompt,
    promptJob?.metadata_prompt,
    metrics.metadataText,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  const forbidden = ["eye", "eyes", "pupil", "pupils", "brow", "brows", "eyebrow", "gaze"];
  return forbidden.filter((term) => new RegExp(`\\b${term}\\b`, "i").test(text));
}

function validateLayerMetrics(layer, metrics, rigTier, promptJob) {
  const hardFailures = [];
  const placementWarnings = [];
  const overlap = metrics.overlapRatios;
  const maxEye = Math.max(overlap.leftEye, overlap.rightEye);

  if (!metrics.hasAlpha) hardFailures.push("missing alpha channel");
  if (!metrics.transparentCorners) hardFailures.push("opaque corner pixels");
  if (!metrics.bbox) hardFailures.push("empty alpha mask");
  if (metrics.coverage > 0.28) hardFailures.push("non-experience sublayer likely contains a full panda");
  if (overlap.face > 0.72 && overlap.body > 0.22) {
    placementWarnings.push("non-experience sublayer looks like a complete panda or full face at current placement");
  }

  const unrelatedHits = [
    overlap.leftEye > 0.08 ? "leftEye" : null,
    overlap.rightEye > 0.08 ? "rightEye" : null,
    overlap.mouth > 0.08 ? "mouth" : null,
    overlap.face > 0.35 && !["emotionBrows", "emotionMouth", "emotionExtras", "monocle"].includes(layer.bboxPolicy)
      ? "face"
      : null,
    overlap.body > 0.45 && !["cape", "weaponSide", "bodySideMark", "chestCore", "groundProp", "groundSideProp"].includes(layer.bboxPolicy)
      ? "body"
      : null,
  ].filter(Boolean);

  if (
    unrelatedHits.length >= 2 &&
    !["emotionBrows", "emotionMouth", "emotionExtras"].includes(layer.bboxPolicy)
  ) {
    placementWarnings.push(`sublayer covers multiple unrelated landmarks at current placement: ${unrelatedHits.join(", ")}`);
  }

  switch (`${layer.attribute}/${layer.sublayer}`) {
    case "boldness/headband":
      if (maxEye > 0.05) placementWarnings.push("boldness/headband overlaps eye rect above 5%");
      if (metrics.bbox && metrics.bbox.y + metrics.bbox.height > Math.min(rectCenter(rigTier.leftEye).y, rectCenter(rigTier.rightEye).y)) {
        placementWarnings.push("boldness/headband is not above eye centers");
      }
      break;
    case "boldness/cape":
      if (maxEye > 0.1) placementWarnings.push("boldness/cape overlaps eye rect above 10%");
      break;
    case "focus/chest-core":
      if (overlap.face > 0.01) placementWarnings.push("focus/chest-core intersects faceRect");
      break;
    case "focus/monocle":
      if (overlap.leftEye > 0.05 && overlap.rightEye > 0.05) {
        placementWarnings.push("focus/monocle covers both eyes");
      }
      break;
    case "patience/ground-prop":
      if (metrics.bbox && rectCenter(metrics.bbox).y < rigTier.bodyRect.y) {
        placementWarnings.push("patience/ground-prop center is above bodyRect.y");
      }
      break;
    default:
      break;
  }

  if (layer.attribute === "intuition") {
    if (maxEye > 0.05 || overlap.mouth > 0.05) {
      placementWarnings.push("intuition sublayer overlaps eyes or mouth above 5%");
    }
    const terms = forbiddenPositivePromptTerms(layer, promptJob, metrics);
    if (terms.length > 0) {
      hardFailures.push(`intuition prompt or metadata contains eye-related positive semantics: ${terms.join(", ")}`);
    }
  }

  if (layer.attribute === "emotion" && layer.sublayer === "mouth") {
    if (overlap.mouth < 0.02) placementWarnings.push("emotions/mouth is not close to mouth");
  }

  return { hardFailures, placementWarnings };
}

const missing = [];
const hardFailures = [];
const placementWarnings = [];
const dimensionsByPath = {};
const reportItems = [];
const promptMap = readPromptMap();
let ok = 0;
let rig = null;
let sublayerManifest = null;
let sublayerPlacement = null;
let sublayerSourceBboxes = null;

try {
  rig = JSON.parse(readFileSync(join(root, "experience-rig.json"), "utf8"));
  hardFailures.push(...validateRigManifest(rig));
} catch (error) {
  hardFailures.push(`experience-rig.json is missing or invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  sublayerManifest = JSON.parse(readFileSync(join(root, "sublayer-manifest.json"), "utf8"));
  hardFailures.push(...validateSublayerManifest(sublayerManifest));
} catch (error) {
  hardFailures.push(`sublayer-manifest.json is missing or invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const placementPath = join(root, "sublayer-placement.json");
  sublayerPlacement = existsSync(placementPath)
    ? JSON.parse(readFileSync(placementPath, "utf8"))
    : { version: 1, coordinateSpace: { width: canvasSize, height: canvasSize, unit: "px" }, placements: {} };
} catch (error) {
  hardFailures.push(`sublayer-placement.json is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const sourceBboxPath = join(root, "sublayer-source-bboxes.json");
  sublayerSourceBboxes = existsSync(sourceBboxPath)
    ? JSON.parse(readFileSync(sourceBboxPath, "utf8"))
    : { version: 1, coordinateSpace: { width: canvasSize, height: canvasSize, unit: "px" }, alphaThreshold, assets: {} };
} catch (error) {
  hardFailures.push(`sublayer-source-bboxes.json is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
}

if (rig) {
  for (let tier = 1; tier <= 10; tier += 1) {
    const key = `tier-${pad(tier)}`;
    const path = join(root, "experience", `${key}.png`);
    if (!existsSync(path)) {
      missing.push(relative(process.cwd(), path));
      continue;
    }
    try {
      const metrics = parsePng(path, rig.tiers?.[key]);
      dimensionsByPath[relative(process.cwd(), path)] = `${metrics.width}x${metrics.height}`;
      if (!metrics.hasAlpha) hardFailures.push(`${relative(process.cwd(), path)} missing alpha channel`);
      if (!metrics.bbox) hardFailures.push(`${relative(process.cwd(), path)} empty alpha mask`);
      ok += 1;
    } catch (error) {
      hardFailures.push(`${relative(process.cwd(), path)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

if (sublayerManifest?.layers && rig) {
  const baselineRig = rig.tiers?.["tier-05"];
  for (const layer of sublayerManifest.layers) {
    const path = fullAssetPath(layer.src);
    const tierKey = `tier-${pad(layer.tier)}`;
    const rigTier = rig.tiers?.[tierKey];
    const placementResolution = placementResolutionForLayer(layer, tierKey);
    const placement = placementResolution?.rect ?? null;
    const promptJob = promptMap.get(promptTarget(layer.src));

    if (!existsSync(path)) {
      missing.push(relative(process.cwd(), path));
      reportItems.push({
        src: layer.src,
        attribute: layer.attribute,
        sublayer: layer.sublayer,
        tier: layer.tier,
        anchorPolicy: layer.anchorPolicy,
        bboxPolicy: layer.bboxPolicy,
        alphaBbox: null,
        sourceAlphaBbox: sublayerSourceBboxes?.assets?.[placementKeyFromSrc(layer.src)]?.bbox ?? null,
        anchor: rigTier ? anchorForLayer(layer, rigTier).point : null,
        placementSource: placementResolution?.source ?? "rig",
        placementTemplateAssetKey: placementResolution?.templateAssetKey ?? null,
        placementTemplateExperienceTierKey: placementResolution?.templateExperienceTierKey ?? null,
        overlapRatios: { leftEye: 0, rightEye: 0, eyes: 0, mouth: 0, face: 0, body: 0 },
        status: "missing",
        failures: ["asset file is missing"],
        placementWarnings: [],
      });
      continue;
    }

    try {
      const metrics = parsePng(path, rigTier, layer, baselineRig, placement);
      dimensionsByPath[relative(process.cwd(), path)] = `${metrics.width}x${metrics.height}`;
      const validation = validateLayerMetrics(layer, metrics, rigTier, promptJob);
      if (validation.hardFailures.length > 0) {
        hardFailures.push(`${relative(process.cwd(), path)}: ${validation.hardFailures.join("; ")}`);
      }
      if (validation.placementWarnings.length > 0) {
        placementWarnings.push(`${relative(process.cwd(), path)}: ${validation.placementWarnings.join("; ")}`);
      }
      if (validation.hardFailures.length === 0) ok += 1;
      reportItems.push({
        src: layer.src,
        attribute: layer.attribute,
        sublayer: layer.sublayer,
        tier: layer.tier,
        anchorPolicy: layer.anchorPolicy,
        bboxPolicy: layer.bboxPolicy,
        alphaBbox: metrics.bbox,
        sourceAlphaBbox: metrics.sourceBbox,
        anchor: placement ? rectCenter(placement) : anchorForLayer(layer, rigTier).point,
        placementSource: placementResolution?.source ?? "rig",
        placementTemplateAssetKey: placementResolution?.templateAssetKey ?? null,
        placementTemplateExperienceTierKey: placementResolution?.templateExperienceTierKey ?? null,
        overlapRatios: metrics.overlapRatios,
        status: validation.hardFailures.length > 0 ? "fail" : validation.placementWarnings.length > 0 ? "warning" : "pass",
        failures: validation.hardFailures,
        placementWarnings: validation.placementWarnings,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      hardFailures.push(`${relative(process.cwd(), path)}: ${message}`);
      reportItems.push({
        src: layer.src,
        attribute: layer.attribute,
        sublayer: layer.sublayer,
        tier: layer.tier,
        anchorPolicy: layer.anchorPolicy,
        bboxPolicy: layer.bboxPolicy,
        alphaBbox: null,
        sourceAlphaBbox: sublayerSourceBboxes?.assets?.[placementKeyFromSrc(layer.src)]?.bbox ?? null,
        anchor: rigTier ? anchorForLayer(layer, rigTier).point : null,
        placementSource: placementResolution?.source ?? "rig",
        placementTemplateAssetKey: placementResolution?.templateAssetKey ?? null,
        placementTemplateExperienceTierKey: placementResolution?.templateExperienceTierKey ?? null,
        overlapRatios: { leftEye: 0, rightEye: 0, eyes: 0, mouth: 0, face: 0, body: 0 },
        status: "fail",
        failures: [message],
        placementWarnings: [],
      });
    }
  }
}

const dimensionValues = Object.values(dimensionsByPath);
const uniqueDimensions = [...new Set(dimensionValues)];
if (uniqueDimensions.length > 1) {
  hardFailures.push(`asset dimensions are inconsistent: ${uniqueDimensions.join(", ")}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  root,
  expected: 10 + (sublayerManifest?.layers?.length ?? 0),
  ok,
  missing,
  hardFailures,
  placementWarnings,
  dimensions: uniqueDimensions,
  legacyFallbacks: sublayerManifest?.legacyFallbacks ?? null,
  items: reportItems,
};

const reportPath = join(root, "qa", "sublayer-report.json");
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify(report, null, 2));

if ((missing.length > 0 && !allowMissing) || hardFailures.length > 0) {
  process.exit(1);
}
