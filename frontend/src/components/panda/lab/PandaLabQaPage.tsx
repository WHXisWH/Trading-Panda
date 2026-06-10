"use client";

import { useEffect, useMemo, useState } from "react";
import { PandaCanvasRenderer } from "@/components/panda/PandaCanvasRenderer";
import {
  PANDA_EMOTION_TIER_LABELS,
  canvasSublayerAssetsFor,
  canvasSublayerOptions,
  type PandaCanvasAssetLayer,
  type PandaCanvasSublayerAttributeKey,
} from "@/lib/pandaCanvasAssets";
import { getExperienceRigTier } from "@/lib/pandaExperienceRigManifest";
import type {
  ExperienceRigPoint,
  ExperienceRigRect,
  ExperienceRigTierManifest,
} from "@/lib/pandaExperienceRig";
import type { PandaStats } from "@/utils/pandaHelper";

interface QaReportItem {
  src: string;
  attribute: string;
  sublayer?: string;
  tier: number;
  anchorPolicy?: string;
  bboxPolicy?: string;
  alphaBbox?: ExperienceRigRect | null;
  anchor?: ExperienceRigPoint | null;
  overlapRatios: {
    leftEye: number;
    rightEye: number;
    eyes: number;
    mouth: number;
    face: number;
    body: number;
  };
  status: "pass" | "fail" | "warning" | "missing";
  failures: string[];
  placementWarnings?: string[];
}

interface QaReport {
  generatedAt: string;
  items: QaReportItem[];
}

const DEFAULT_STATS: PandaStats = {
  boldness: 82,
  patience: 74,
  intuition: 68,
  focus: 76,
  contrarian: 64,
  emotion: "calm",
  experience: 48,
};

const COMPOSITE_CASES: Array<{ label: string; stats: PandaStats }> = [
  {
    label: "低经验 / calm / headband",
    stats: {
      boldness: 30,
      patience: 74,
      intuition: 18,
      focus: 42,
      contrarian: 25,
      emotion: "calm",
      experience: 5,
    },
  },
  {
    label: "中经验 / excited / cape",
    stats: {
      boldness: 82,
      patience: 36,
      intuition: 55,
      focus: 70,
      contrarian: 28,
      emotion: "excited",
      experience: 48,
    },
  },
  {
    label: "高经验 / panic / intuition",
    stats: {
      boldness: 68,
      patience: 18,
      intuition: 94,
      focus: 46,
      contrarian: 72,
      emotion: "panic",
      experience: 92,
    },
  },
  {
    label: "高专注 / cautious / monocle",
    stats: {
      boldness: 34,
      patience: 50,
      intuition: 42,
      focus: 96,
      contrarian: 22,
      emotion: "cautious",
      experience: 68,
    },
  },
  {
    label: "逆向高压 / frustrated",
    stats: {
      boldness: 52,
      patience: 28,
      intuition: 76,
      focus: 64,
      contrarian: 100,
      emotion: "frustrated",
      experience: 32,
    },
  },
  {
    label: "麻木小头像 / numb",
    stats: {
      boldness: 12,
      patience: 65,
      intuition: 40,
      focus: 24,
      contrarian: 42,
      emotion: "numb",
      experience: 74,
    },
  },
  {
    label: "贪婪表情 / greedy",
    stats: {
      boldness: 58,
      patience: 24,
      intuition: 62,
      focus: 80,
      contrarian: 38,
      emotion: "greedy",
      experience: 58,
    },
  },
];

function tierValue(tier: number): number {
  return tier >= 10 ? 100 : (tier - 1) * 10 + 5;
}

function pct(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "n/a";
  return `${Math.round(value * 1000) / 10}%`;
}

function rectCenter(rect: ExperienceRigRect): ExperienceRigPoint {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function rectTopCenter(rect: ExperienceRigRect): ExperienceRigPoint {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y,
  };
}

function averagePoint(a: ExperienceRigPoint, b: ExperienceRigPoint): ExperienceRigPoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function pointWithOffset(
  point: ExperienceRigPoint,
  offset?: ExperienceRigPoint
): ExperienceRigPoint {
  if (!offset) return point;
  return { x: point.x + offset.x, y: point.y + offset.y };
}

function anchorForAsset(
  asset: PandaCanvasAssetLayer,
  rig: ExperienceRigTierManifest
): ExperienceRigPoint {
  const leftEyeCenter = rectCenter(rig.leftEye);
  const rightEyeCenter = rectCenter(rig.rightEye);
  const upperBodyRect = {
    x: rig.bodyRect.x,
    y: rig.bodyRect.y,
    width: rig.bodyRect.width,
    height: rig.bodyRect.height * 0.45,
  };

  switch (asset.anchorPolicy) {
    case "faceTopCenter":
      return pointWithOffset(rectTopCenter(rig.faceRect), asset.anchorOffset);
    case "leftEyeCenter":
      return pointWithOffset(leftEyeCenter, asset.anchorOffset);
    case "rightEyeCenter":
      return pointWithOffset(rightEyeCenter, asset.anchorOffset);
    case "eyesMidpoint":
      return pointWithOffset(averagePoint(leftEyeCenter, rightEyeCenter), asset.anchorOffset);
    case "mouthCenter":
      return pointWithOffset(rectCenter(rig.mouth), asset.anchorOffset);
    case "bodyCenter":
      return pointWithOffset(rectCenter(rig.bodyRect), asset.anchorOffset);
    case "upperBodyCenter":
      return pointWithOffset(rectCenter(upperBodyRect), asset.anchorOffset);
    case "feetBase":
      return pointWithOffset(rig.feetBase, asset.anchorOffset);
    case "headCenterOffset":
      return pointWithOffset(rig.headCenter, asset.anchorOffset);
    default:
      return rectCenter(rig.bodyRect);
  }
}

function rectMarkup(rect: ExperienceRigRect, className: string, label: string) {
  return (
    <g key={label}>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        className={className}
        vectorEffect="non-scaling-stroke"
      />
      <text x={rect.x + 4} y={rect.y + 12} className="fill-current text-[10px]">
        {label}
      </text>
    </g>
  );
}

function SublayerOverlay({
  rig,
  asset,
  reportItem,
}: {
  rig: ExperienceRigTierManifest;
  asset: PandaCanvasAssetLayer;
  reportItem?: QaReportItem;
}) {
  const anchor = reportItem?.anchor ?? anchorForAsset(asset, rig);
  const bbox = reportItem?.alphaBbox;

  return (
    <svg
      viewBox="0 0 512 512"
      className="pointer-events-none absolute inset-0 h-full w-full text-bamboo-700"
      aria-hidden="true"
    >
      {rectMarkup(rig.faceRect, "fill-transparent stroke-bamboo-500", "face")}
      {rectMarkup(rig.leftEye, "fill-transparent stroke-red-500", "leftEye")}
      {rectMarkup(rig.rightEye, "fill-transparent stroke-red-500", "rightEye")}
      {rectMarkup(rig.mouth, "fill-transparent stroke-amber-500", "mouth")}
      {rectMarkup(rig.bodyRect, "fill-transparent stroke-sky-600", "body")}
      {bbox &&
        rectMarkup(
          bbox,
          reportItem?.status === "fail"
            ? "fill-red-500/10 stroke-red-600"
            : reportItem?.status === "warning"
              ? "fill-amber-500/10 stroke-amber-600"
            : "fill-bamboo-500/10 stroke-bamboo-700",
          "alpha"
        )}
      <line
        x1={anchor.x - 10}
        y1={anchor.y}
        x2={anchor.x + 10}
        y2={anchor.y}
        className="stroke-ink-900"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={anchor.x}
        y1={anchor.y - 10}
        x2={anchor.x}
        y2={anchor.y + 10}
        className="stroke-ink-900"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={anchor.x}
        cy={anchor.y}
        r={4}
        className="fill-white stroke-ink-900"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function MetricGrid({ item }: { item?: QaReportItem }) {
  const metrics = item?.overlapRatios;
  const rows = [
    ["eye overlap", metrics?.eyes],
    ["mouth overlap", metrics?.mouth],
    ["face overlap", metrics?.face],
    ["body overlap", metrics?.body],
  ] as const;

  return (
    <div className="grid gap-2 sm:grid-cols-4">
      {rows.map(([label, value]) => (
        <div key={label} className="border border-[var(--color-border)] bg-white px-3 py-2">
          <div className="text-[11px] text-ink-500">{label}</div>
          <div className="mt-1 font-mono text-sm text-ink-900">{pct(value)}</div>
        </div>
      ))}
    </div>
  );
}

export function PandaLabQaPage() {
  const options = useMemo(() => canvasSublayerOptions(), []);
  const [attribute, setAttribute] = useState<PandaCanvasSublayerAttributeKey>(
    options[0]?.attribute ?? "boldness"
  );
  const [sublayer, setSublayer] = useState(options[0]?.sublayer ?? "headband");
  const [tier, setTier] = useState(5);
  const [experienceTier, setExperienceTier] = useState(5);
  const [report, setReport] = useState<QaReport | null>(null);

  useEffect(() => {
    fetch("/assets/panda/qa/sublayer-report.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: QaReport | null) => setReport(data))
      .catch(() => setReport(null));
  }, []);

  const sublayerOptions = options.filter((item) => item.attribute === attribute);
  const selectedAsset = useMemo(
    () => canvasSublayerAssetsFor(attribute, sublayer, tier)[0],
    [attribute, sublayer, tier]
  );
  const stats = useMemo(
    () => ({
      ...DEFAULT_STATS,
      experience: tierValue(experienceTier),
      emotion:
        tier >= 10
          ? "panic"
          : tier >= 8
            ? "greedy"
            : tier >= 6
              ? "excited"
              : tier >= 4
                ? "cautious"
                : tier <= 1
                  ? "numb"
                  : "calm",
      [attribute === "emotion" ? "focus" : attribute]: tierValue(tier),
    }),
    [attribute, experienceTier, tier]
  ) as PandaStats;
  const rig = getExperienceRigTier(experienceTier);
  const reportItem = selectedAsset
    ? report?.items.find((item) => item.src === selectedAsset.src)
    : undefined;

  function onAttributeChange(nextAttribute: PandaCanvasSublayerAttributeKey) {
    setAttribute(nextAttribute);
    setSublayer(options.find((item) => item.attribute === nextAttribute)?.sublayer ?? "");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink-900">
            Panda Lab 子层验收
          </h1>
          <p className="mt-1 max-w-3xl text-[13px] text-ink-500">
            按 attribute / sublayer / tier / experience tier 单独检查挂载效果、锚点、alpha bbox 与 landmark overlap。
          </p>
        </div>
        <div
          className={
            report
              ? "border border-bamboo-500 bg-bamboo-50 px-3 py-2 text-[12px] text-bamboo-700"
              : "border border-amber-400 bg-amber-50 px-3 py-2 text-[12px] text-amber-700"
          }
        >
          {report
            ? `QA report ${new Date(report.generatedAt).toLocaleString()}`
            : "QA report 未生成"}
        </div>
      </header>

      <section className="grid gap-4 border border-[var(--color-border)] bg-white p-4 lg:grid-cols-[260px_1fr]">
        <div className="grid content-start gap-3">
          <label className="grid gap-1 text-[12px] text-ink-500">
            Attribute
            <select
              value={attribute}
              onChange={(event) =>
                onAttributeChange(event.target.value as PandaCanvasSublayerAttributeKey)
              }
              className="border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-ink-900"
            >
              {options
                .map((item) => item.attribute)
                .filter((item, index, items) => items.indexOf(item) === index)
                .map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[12px] text-ink-500">
            Sublayer
            <select
              value={sublayer}
              onChange={(event) => setSublayer(event.target.value)}
              className="border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-ink-900"
            >
              {sublayerOptions.map((item) => (
                <option key={`${item.attribute}/${item.sublayer}`} value={item.sublayer}>
                  {item.sublayer}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[12px] text-ink-500">
            Tier
            <select
              value={tier}
              onChange={(event) => setTier(Number(event.target.value))}
              className="border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-ink-900"
            >
              {Array.from({ length: 10 }, (_, index) => index + 1).map((item) => (
                <option key={item} value={item}>
                  tier-{String(item).padStart(2, "0")}
                  {attribute === "emotion"
                    ? ` · ${PANDA_EMOTION_TIER_LABELS[item]}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[12px] text-ink-500">
            Experience Tier
            <select
              value={experienceTier}
              onChange={(event) => setExperienceTier(Number(event.target.value))}
              className="border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-ink-900"
            >
              {Array.from({ length: 10 }, (_, index) => index + 1).map((item) => (
                <option key={item} value={item}>
                  tier-{String(item).padStart(2, "0")}
                </option>
              ))}
            </select>
          </label>

          {selectedAsset && (
            <div className="grid gap-1 border border-[var(--color-border)] bg-paper px-3 py-2 text-[12px] text-ink-600">
              <div className="font-mono text-[11px] text-ink-900">{selectedAsset.src}</div>
              <div>anchor: {selectedAsset.anchorPolicy}</div>
              <div>bbox: {selectedAsset.bboxPolicy}</div>
              <div>zIndex: {selectedAsset.zIndex}</div>
              <div
                className={
                  reportItem?.status === "fail"
                    ? "font-semibold text-red-600"
                    : reportItem?.status === "warning"
                      ? "font-semibold text-amber-600"
                    : "font-semibold text-bamboo-700"
                }
              >
                status: {reportItem?.status ?? "n/a"}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <MetricGrid item={reportItem} />

          {reportItem?.failures.length ? (
            <div className="border border-red-300 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {reportItem.failures.join(" / ")}
            </div>
          ) : null}

          {reportItem?.placementWarnings?.length ? (
            <div className="border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
              {reportItem.placementWarnings.join(" / ")}
            </div>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-[384px_120px_128px]">
            <div>
              <div className="mb-2 text-[11px] font-medium text-ink-500">
                单子层挂载 · 384px
              </div>
              <div className="relative w-[384px] max-w-full bg-[#efece3] p-3">
                {selectedAsset && (
                  <>
                    <PandaCanvasRenderer
                      stats={stats}
                      showBackground={false}
                      renderOptions={{ tierMode: "discrete" }}
                      debugAssets={[selectedAsset]}
                    />
                    <SublayerOverlay
                      rig={rig}
                      asset={selectedAsset}
                      reportItem={reportItem}
                    />
                  </>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[11px] font-medium text-ink-500">
                Mint · 120px
              </div>
              <div className="h-[120px] w-[120px] overflow-hidden rounded-full bg-[#efece3]">
                {selectedAsset && (
                  <PandaCanvasRenderer
                    stats={stats}
                    showBackground
                    className="h-full w-full"
                    renderOptions={{ tierMode: "discrete" }}
                    debugAssets={[selectedAsset]}
                  />
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[11px] font-medium text-ink-500">
                Dashboard · 128px
              </div>
              <div className="h-[128px] w-[128px] overflow-hidden rounded-full bg-[#efece3]">
                {selectedAsset && (
                  <PandaCanvasRenderer
                    stats={stats}
                    showBackground
                    className="h-full w-full"
                    renderOptions={{ tierMode: "discrete" }}
                    debugAssets={[selectedAsset]}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="text-sm font-semibold text-ink-900">最终组合验收</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {COMPOSITE_CASES.map((testCase) => (
            <div
              key={testCase.label}
              className="border border-[var(--color-border)] bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink-900">{testCase.label}</h3>
                <span className="text-[11px] text-ink-500">
                  exp {testCase.stats.experience} / {testCase.stats.emotion}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_128px]">
                <div className="bg-[#efece3] p-3">
                  <PandaCanvasRenderer
                    stats={testCase.stats}
                    showBackground={false}
                    renderOptions={{ tierMode: "discrete" }}
                  />
                </div>
                <div className="h-[128px] w-[128px] overflow-hidden rounded-full bg-[#efece3]">
                  <PandaCanvasRenderer
                    stats={testCase.stats}
                    showBackground
                    className="h-full w-full"
                    renderOptions={{ tierMode: "discrete" }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
