"use client";

import { clsx } from "clsx";
import { DashboardPandaPanel } from "@/components/panda/DashboardPandaPanel";
import type { AccountPanelSnapshot } from "@/components/trading/AccountPanel";

interface PandaProps {
  pandaId: string;
  name?: string;
  boldness: number;
  patience: number;
  intuition: number;
  focus: number;
  contrarian: number;
  talent: number;
  experienceLevel: number;
  emotionState: string;
  pandas: { id: string; name?: string }[];
}

interface Props {
  panda: PandaProps;
  account: AccountPanelSnapshot;
  className?: string;
}

export function DashboardLeftColumn({ panda, account, className }: Props) {
  return (
    <aside
      className={clsx(
        "dashboard-col-left flex min-w-0 max-w-full flex-col",
        "lg:max-h-[calc(100dvh-var(--navbar-height)-1rem)] lg:overflow-y-auto",
        className,
      )}
    >
      <DashboardPandaPanel
        pandaId={panda.pandaId}
        name={panda.name}
        boldness={panda.boldness}
        patience={panda.patience}
        intuition={panda.intuition}
        focus={panda.focus}
        contrarian={panda.contrarian}
        talent={panda.talent}
        experienceLevel={panda.experienceLevel}
        emotionState={panda.emotionState}
        pandas={panda.pandas}
        account={account}
      />
    </aside>
  );
}
