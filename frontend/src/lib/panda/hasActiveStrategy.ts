import type { PandaDetailApi } from "@/types/panda";

/** True when the Panda has a live strategy (wire id or embedded current_strategy). */
export function hasActiveStrategy(
  panda: Pick<PandaDetailApi, "active_strategy_id" | "current_strategy"> | null | undefined,
): boolean {
  return Boolean(panda?.active_strategy_id ?? panda?.current_strategy);
}
