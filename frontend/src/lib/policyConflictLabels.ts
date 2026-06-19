import type { PolicyConflictDetail } from "@/types/strategy";

const CONFLICT_LABELS: Record<string, string> = {
  POLICY_NOTIONAL_EXCEEDED: "Order size per trade",
  POLICY_PAIR_NOT_ALLOWED: "Trading pair",
  POLICY_PAUSED: "Policy status",
};

export function policyConflictLabel(code: string): string {
  return CONFLICT_LABELS[code] ?? "Policy limit";
}

export function policyConflictDetail(conflict: PolicyConflictDetail): string {
  return conflict.message;
}
