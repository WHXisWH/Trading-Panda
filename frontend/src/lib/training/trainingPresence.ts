import type { SessionPhase } from "@/hooks/useSimulationSession";

export type TrainingPresenceLabel = "Online" | "Offline" | "Starting…" | "Stopping…";

/** User-facing presence — keyed on PandaActor (`actor_active`), not DB `is_trading`. */
export function resolveTrainingPresenceLabel(
  actorActive: boolean,
  phase: SessionPhase,
): TrainingPresenceLabel {
  if (actorActive) {
    return "Online";
  }
  if (phase === "starting") {
    return "Starting…";
  }
  if (phase === "stopping") {
    return "Stopping…";
  }
  return "Offline";
}

/** Full-color portrait only when Actor is in backend memory. */
export function resolveTrainingPortraitOnline(actorActive: boolean): boolean {
  return actorActive;
}
