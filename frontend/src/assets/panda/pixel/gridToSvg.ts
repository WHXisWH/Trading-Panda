import { PIXEL_PALETTE } from "./palette";

export interface GridToSvgOptions {
  pixelSize?: number;
  offsetX?: number;
  offsetY?: number;
  id?: string;
}

/** Convert a character grid (. = transparent) to SVG <rect> pixels */
export function gridToSvg(
  rows: string[],
  options: GridToSvgOptions = {}
): string {
  const pixelSize = options.pixelSize ?? 3;
  const offsetX = options.offsetX ?? 0;
  const offsetY = options.offsetY ?? 0;
  const rects: string[] = [];

  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      const fill = PIXEL_PALETTE[ch as keyof typeof PIXEL_PALETTE];
      if (!fill || fill === "transparent") continue;
      rects.push(
        `<rect x="${offsetX + x * pixelSize}" y="${offsetY + y * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="${fill}"/>`
      );
    }
  });

  const inner = rects.join("");
  if (!options.id) return `<g>${inner}</g>`;
  return `<g id="${options.id}">${inner}</g>`;
}

/** Overlay grids: later rows overwrite earlier at same cell */
export function mergeGrids(...grids: string[][]): string[] {
  if (grids.length === 0) return [];
  const height = Math.max(...grids.map((g) => g.length));
  const width = Math.max(...grids.map((g) => Math.max(...g.map((r) => r.length), 0)));
  const out: string[] = [];

  for (let y = 0; y < height; y++) {
    let row = "";
    for (let x = 0; x < width; x++) {
      let ch = ".";
      for (const grid of grids) {
        const cell = grid[y]?.[x];
        if (cell && cell !== ".") ch = cell;
      }
      row += ch;
    }
    out.push(row);
  }
  return out;
}
