/**
 * Parse MintEvent / PandaMinted from a Sui transaction result or RPC events list.
 * Epic 1.1 — personality five axes · talent · object_id
 */

import { packageIdsForEventMatch } from "@/lib/sui/packageIds";

export interface ParsedMintEvent {
  objectId: string;
  boldness: number;
  patience: number;
  intuition: number;
  focus: number;
  contrarian: number;
  talent: number;
  generation: number;
  minter?: string;
}

function normalizeObjectId(value: string): string {
  const v = value.trim().toLowerCase();
  return v.startsWith("0x") ? v : `0x${v}`;
}

function eventSuffix(type: string, suffix: string): boolean {
  return type.toLowerCase().endsWith(`::panda::${suffix.toLowerCase()}`);
}

function coerceNum(value: unknown, fallback = 0): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return fallback;
}

type SuiEvent = {
  type?: string;
  parsedJson?: Record<string, unknown>;
  parsed_json?: Record<string, unknown>;
};

export function parseMintEventsFromList(
  events: SuiEvent[],
  packageIds: string | string[] = packageIdsForEventMatch(),
): ParsedMintEvent | null {
  const ids = (Array.isArray(packageIds) ? packageIds : [packageIds])
    .map((id) => id.toLowerCase())
    .filter(Boolean);
  let minted: ParsedMintEvent | null = null;
  let mintEvent: ParsedMintEvent | null = null;

  for (const ev of events) {
    const evType = String(ev.type ?? "").toLowerCase();
    if (ids.length && !ids.some((id) => evType.includes(id))) continue;
    const parsed = (ev.parsedJson ?? ev.parsed_json ?? {}) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") continue;

    if (eventSuffix(evType, "PandaMinted")) {
      minted = {
        objectId: normalizeObjectId(String(parsed.panda_id ?? "")),
        boldness: coerceNum(parsed.boldness),
        patience: coerceNum(parsed.patience),
        intuition: coerceNum(parsed.intuition),
        focus: coerceNum(parsed.focus),
        contrarian: coerceNum(parsed.contrarian),
        talent: coerceNum(parsed.talent),
        generation: coerceNum(parsed.generation, 1),
        minter: parsed.owner ? String(parsed.owner) : undefined,
      };
    } else if (eventSuffix(evType, "MintEvent")) {
      mintEvent = {
        objectId: normalizeObjectId(String(parsed.panda_id ?? "")),
        boldness: coerceNum(parsed.boldness),
        patience: coerceNum(parsed.patience),
        intuition: coerceNum(parsed.intuition),
        focus: coerceNum(parsed.focus),
        contrarian: coerceNum(parsed.contrarian),
        talent: coerceNum(parsed.talent),
        generation: coerceNum(parsed.generation, 1),
        minter: parsed.minter ? String(parsed.minter) : undefined,
      };
    }
  }

  return minted ?? mintEvent;
}

/** Extract tx digest from dapp-kit / Sui client execute result. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractTxDigest(txResult: any): string | null {
  const digest =
    txResult?.digest ??
    txResult?.effects?.transactionDigest ??
    txResult?.transactionDigest;
  return typeof digest === "string" ? digest : null;
}

/** Read events array from execute/waitForTransaction result when present. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractEventsFromTxResult(txResult: any): SuiEvent[] {
  if (Array.isArray(txResult?.events)) return txResult.events;
  if (Array.isArray(txResult?.effects?.events)) return txResult.effects.events;
  return [];
}
