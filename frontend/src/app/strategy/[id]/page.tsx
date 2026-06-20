import { redirect } from "next/navigation";
import { legacyStrategyRedirectPath } from "@/lib/ui/strategyRedirect";

interface StrategyCompatPageProps {
  params: {
    id: string;
  };
}

export default function StrategyCompatPage({ params }: StrategyCompatPageProps) {
  redirect(legacyStrategyRedirectPath(params.id));
}
