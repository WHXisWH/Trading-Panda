import { gridToSvg, mergeGrids } from "./gridToSvg";

/** 32×32 logical grid → 96×96 viewBox at 3px per cell */

const BODY_CORE = [
  "................................",
  "..........KKKKKKKKKK............",
  "........KKWWWWWWWWWWKK..........",
  "......KKWWWWWWWWWWWWWWKK........",
  ".....KWWWWWWWWWWWWWWWWWWK.......",
  "....KWWKKKKWWWWWWKKKKWWWK......",
  "....KWWKKKKWWWWWWKKKKWWWK......",
  "....KWWWWWWWWWWWWWWWWWWWWK......",
  "....KWWWWWWWWWWWWWWWWWWWWK......",
  "....KWWWWWWWWWWWWWWWWWWWWK......",
  ".....KWWWWWWWWWWWWWWWWWWWK......",
  ".....KWWWWWWWWWWWWWWWWWWWK......",
  "......KWWWWWWWWWWWWWWWWWK.......",
  "......KWWWWWWWWWWWWWWWWWK.......",
  ".......KWWWWWWWWWWWWWWWK........",
  ".......KWWWWWWWWWWWWWWWK........",
  "........KWWWWWWWWWWWWWK.........",
  "........KWWWWWWWWWWWWWK.........",
  ".........KWWWWWWWWWWWK..........",
  ".........KWWWWWWWWWWWK..........",
  "..........KWWWWWWWWWK...........",
  "..........KKKKKKKKKKK...........",
  "...........KKKKKKKKK............",
  ".............KKKKK..............",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
];

const EARS = [
  "................................",
  "......KK.............KK.........",
  "...KKKKK...........KKKKK........",
  "..KKKKKK...........KKKKKK.......",
  "..KKKKKK...........KKKKKK.......",
  "................................",
];

const ARMS = [
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "KK..............................KK",
  "KKK............................KKK",
  "KKK............................KKK",
  "KK..............................KK",
  "................................",
];

const BODY_BASE = mergeGrids(BODY_CORE, EARS, ARMS);

const ROBE_MATURE = [
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "...........BBBBBBBB.............",
  "..........BBBBBBBBBB............",
  ".........BBBBBBBBBBBB...........",
  "........BBBBBBBBBBBBBB..........",
  ".......BBBBBBBBBBBBBBBB.........",
  "......BBBBBBBBBBBBBBBBBB........",
  ".....BBBBBBBBBBBBBBBBBBBB.......",
  "....BBBBBBBBBBBBBBBBBBBBBB......",
  "...BBBBBBBBBBBBBBBBBBBBBBBB.....",
  "....KKKKKKKKKKKKKKKKKKKKKK......",
];

const VEST_APPRENTICE = [
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "...........BBBBBBBB.............",
  "..........BBBBBBBBBB............",
  ".........BBBB..BBBBBB...........",
  "........BBBB....BBBBBB..........",
  ".......BBBB......BBBBBB.........",
  "......BBBB........BBBBBB........",
  ".....BBBB..........BBBBBB.......",
  "....BBBB............BBBBBB......",
  "................................",
];

function bodyWithExtras(extras: string[][]): string {
  return gridToSvg(mergeGrids(BODY_BASE, ...extras), { id: "panda-body" });
}

export const bodyLayers: Record<string, string> = {
  infant: `<g transform="translate(48,52) scale(0.82) translate(-48,-48)">${bodyWithExtras([])}</g>`,
  apprentice: bodyWithExtras([VEST_APPRENTICE]),
  mature: bodyWithExtras([ROBE_MATURE]),
};

/** Face overlays — eyes & mouth only (32×32, same coords as body) */
const FACE_OFFSET = { pixelSize: 3, id: "panda-face" };

const FACE_CALM = [
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "..........KK....KK..............",
  "..........KK....KK..............",
  "..........KK....KK..............",
  "................................",
  "................................",
  "................................",
  "................................",
  "............KKKKKK..............",
  "................................",
];

const FACE_EXCITED = [
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  ".........KKK....KKK.............",
  ".........KKK....KKK.............",
  ".........KKK....KKK.............",
  "........PP........PP............",
  "................................",
  "................................",
  "................................",
  "...........KK..KK...............",
  "..........K......K..............",
];

const FACE_GREEDY = [
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  ".........GKK....KKG.............",
  ".........KKK....KKK.............",
  ".........KKK....KKK.............",
  "................................",
  "................................",
  "................................",
  "................................",
  "............KKKKKK..............",
];

const FACE_CAUTIOUS = [
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "........KK........KK............",
  ".........KK......KK.............",
  "..........KK....KK..............",
  "................................",
  "................................",
  "................................",
  "................................",
  "............KKKK................",
];

const FACE_PANIC = [
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  ".........KKK....KKK.............",
  ".........KKK....KKK.............",
  ".........KKK....KKK.............",
  "................................",
  "................................",
  "................................",
  "................................",
  "...........KKKKKK...............",
  "..........K......K..............",
  ".........K........K.............",
];

const FACE_NUMB = [
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  ".........KKK....KKK.............",
  ".........KKK....KKK.............",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "............KKKK................",
];

const FACE_FRUSTRATED = [
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "........KKK......KKK............",
  ".........KKK....KKK.............",
  "..........KK....KK..............",
  "........PP........PP............",
  "................................",
  "................................",
  "................................",
  "............KKKK................",
  "...........R....R...............",
];

export const faceLayers: Record<string, string> = {
  calm: gridToSvg(FACE_CALM, FACE_OFFSET),
  excited: gridToSvg(FACE_EXCITED, FACE_OFFSET),
  greedy: gridToSvg(FACE_GREEDY, FACE_OFFSET),
  cautious: gridToSvg(FACE_CAUTIOUS, FACE_OFFSET),
  panic: gridToSvg(FACE_PANIC, FACE_OFFSET),
  numb: gridToSvg(FACE_NUMB, FACE_OFFSET),
  frustrated: gridToSvg(FACE_FRUSTRATED, FACE_OFFSET),
};

function traitBand(tier: number, low: string, mid: string, high: string): string {
  if (tier <= 3) return low;
  if (tier <= 7) return mid;
  return high;
}

function replaceAt(row: string, index: number, ch: string): string {
  return row.slice(0, index) + ch + row.slice(index + 1);
}

const BOLDNESS_LOW = [
  "................................",
  "..........SSSSSSSSSS............",
  ".........SSSSSSSSSSSS...........",
  "................................",
];

const BOLDNESS_MID = [
  "................................",
  "..........BBBBBBBBBB............",
  ".........BBBBBBBBBBBB...........",
  "................................",
];

const BOLDNESS_HIGH = [
  "................................",
  "..........RRRRRRRRRR............",
  ".........RRRRRRRRRRRR...........",
  "............RRRRRR..............",
];

export function boldnessLayer(tier: number): string {
  return traitBand(
    tier,
    gridToSvg(BOLDNESS_LOW, { id: "boldness-low" }),
    gridToSvg(BOLDNESS_MID, { id: "boldness-mid" }),
    gridToSvg(BOLDNESS_HIGH, { id: "boldness-high" })
  );
}

export function patienceLayer(tier: number): string {
  const prop = (ch: string, x: number, y: number) => {
    const rows = Array(32).fill("................................");
    rows[y] = replaceAt(rows[y], x, ch);
    rows[y + 1] = replaceAt(rows[y + 1], x, ch);
    return rows;
  };
  return traitBand(
    tier,
    gridToSvg(prop("R", 26, 14), { id: "patience-low" }),
    gridToSvg(prop("B", 26, 12), { id: "patience-mid" }),
    gridToSvg(
      mergeGrids(
        prop("D", 25, 11),
        prop("D", 27, 11),
        ["................................", "........................W......."]
      ),
      { id: "patience-high" }
    )
  );
}

export function intuitionLayer(tier: number): string {
  const ear = (x: number, tall: boolean) => {
    const rows = Array(32).fill("................................");
    rows[2] = replaceAt(rows[2], x, "K");
    rows[3] = replaceAt(rows[3], x, "K");
    if (tall) {
      rows[1] = replaceAt(rows[1], x, "K");
      rows[4] = replaceAt(rows[4], x, "B");
    }
    return rows;
  };
  return traitBand(
    tier,
    gridToSvg(mergeGrids(ear(7, false), ear(24, false)), { id: "intuition-low" }),
    gridToSvg(mergeGrids(ear(6, true), ear(25, true)), { id: "intuition-mid" }),
    gridToSvg(
      mergeGrids(
        ear(5, true),
        ear(26, true),
        [
          "................................",
          "..........BBBBBBBB............",
          ".........BB......BB...........",
        ]
      ),
      { id: "intuition-high" }
    )
  );
}

export function focusLayer(tier: number): string {
  const ring = (x: number, w: number) => {
    const rows = Array(32).fill("................................");
    for (let i = -w; i <= w; i++) {
      rows[6] = replaceAt(rows[6], x + i, "S");
      rows[7] = replaceAt(rows[7], x + i, "S");
    }
    return rows;
  };
  return traitBand(
    tier,
    gridToSvg(mergeGrids(ring(11, 1), ring(20, 1)), { id: "focus-low" }),
    gridToSvg(mergeGrids(ring(11, 2), ring(20, 2)), { id: "focus-mid" }),
    gridToSvg(
      mergeGrids(
        ring(11, 2),
        ring(20, 2),
        ["................................", "....................B..........."]
      ),
      { id: "focus-high" }
    )
  );
}

export function contrarianLayer(tier: number): string {
  const stamp = (ch: string) => {
    const rows = Array(32).fill("................................");
    for (let x = 13; x <= 16; x++) {
      rows[17] = replaceAt(rows[17], x, ch);
      rows[18] = replaceAt(rows[18], x, ch);
    }
    return rows;
  };
  return traitBand(
    tier,
    "",
    gridToSvg(stamp("S"), { id: "contrarian-mid" }),
    gridToSvg(stamp("R"), { id: "contrarian-high" })
  );
}

function buildTierMap(fn: (t: number) => string): Record<number, string> {
  const m: Record<number, string> = {};
  for (let t = 1; t <= 10; t++) m[t] = fn(t);
  return m;
}

export const boldnessLayers = buildTierMap(boldnessLayer);
export const patienceLayers = buildTierMap(patienceLayer);
export const intuitionLayers = buildTierMap(intuitionLayer);
export const focusLayers = buildTierMap(focusLayer);
export const contrarianLayers = buildTierMap(contrarianLayer);
