import { formatUsd } from "@/lib/trading/performanceMetrics";

/** User-facing disclaimer for virtual Training Ledger capital. */
export const PAPER_BALANCE_DISCLAIMER = "Paper trading balance (USD)";

export function formatPaperUsd(value: number): string {
  return formatUsd(value);
}
