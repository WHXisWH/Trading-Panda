import { trainingLedgerPath } from "@/lib/ui/routeJump";

export function legacyStrategyRedirectPath(pandaId: string): string {
  return trainingLedgerPath(pandaId, { feedStrategy: true });
}
