"use client";

import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import type { SafetyActionKind } from "@/hooks/useSafetyControls";
import type { PolicyDraft } from "@/types/agent-wallet";
import type { SafetyStatusApi } from "@/types/safety";

interface Props {
  status: SafetyStatusApi;
  highlightedAction: SafetyActionKind | null;
  currentDraft: PolicyDraft;
  tightenDraft: PolicyDraft;
  isPaused: boolean;
  onSign: () => void;
  onEditTighten: () => void;
  signDisabled?: boolean;
}

type ImpactTone = "default" | "danger" | "warn" | "pass";

function surfaceToneClass(tone: ImpactTone): string {
  if (tone === "danger") return "bg-product-red/6 ring-product-red/20";
  if (tone === "warn") return "bg-product-amber/6 ring-product-amber/18";
  if (tone === "pass") return "bg-product-green/6 ring-product-green/18";
  return "bg-black/30 ring-[rgba(225,186,92,0.1)]";
}

function ImpactSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <section>
      <p className="product-field-label">{title}</p>
      <dl className="mt-3">
        {rows.map(([label, value]) => (
          <div key={label} className="product-metric-row">
            <span>{label}</span>
            <strong className="max-w-[58%] text-right leading-snug">{value}</strong>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ImpactPanel({
  title,
  rows,
  tone = "default",
}: {
  title: string;
  rows: Array<[string, string]>;
  tone?: ImpactTone;
}) {
  return (
    <div
      className={clsx(
        "rounded-[18px] p-4 ring-1 ring-inset",
        surfaceToneClass(tone),
      )}
    >
      <ImpactSection title={title} rows={rows} />
    </div>
  );
}

function ModeOverviewPanel({
  mode1Rows,
  mode2Rows,
  mode2Tone = "default",
}: {
  mode1Rows: Array<[string, string]>;
  mode2Rows: Array<[string, string]>;
  mode2Tone?: ImpactTone;
}) {
  return (
    <div className="rounded-[18px] p-4 ring-1 ring-inset bg-black/30 ring-[rgba(225,186,92,0.1)]">
      <ImpactSection title="Mode 1 · Training Ledger" rows={mode1Rows} />
      <div className="my-4 border-t border-[rgba(225,186,92,0.12)]" />
      <div
        className={clsx(
          mode2Tone === "warn" && "rounded-[14px] bg-product-amber/6 px-3 py-2 ring-1 ring-inset ring-product-amber/18",
        )}
      >
        <ImpactSection title="Mode 2 · Chain Proof" rows={mode2Rows} />
      </div>
    </div>
  );
}

export function SafetyConsequencePanel({
  status,
  highlightedAction,
  currentDraft,
  tightenDraft,
  isPaused,
  onSign,
  onEditTighten,
  signDisabled,
}: Props) {
  const pendingCount = status.pending_job_count;

  if (!highlightedAction) {
    return (
      <div className="product-panel space-y-4 p-5 md:p-6">
        <div>
          <p className="product-eyebrow">Consequence preview</p>
          <h2 className="mt-2 font-sans text-lg font-bold text-product-text">
            What safety actions affect
          </h2>
          <p className="mt-2 text-[13px] text-product-muted">
            Select an action on the right to review before signing. Loosening policy is never
            available here.
          </p>
        </div>

        <ModeOverviewPanel
          mode1Rows={[
            ["Paper execution", "Stops on pause / revoke"],
            ["Open positions", "Safe close only when paused"],
            ["Reviews", "Continue after pause"],
          ]}
          mode2Rows={[
            ["New proof PTBs", "Blocked on pause / revoke"],
            ["Pending jobs", `${pendingCount} may be canceled`],
            ["Submitted proofs", "Tx status unchanged"],
          ]}
          mode2Tone={pendingCount > 0 ? "warn" : "default"}
        />
      </div>
    );
  }

  if (highlightedAction === "pause") {
    return (
      <div className="product-panel space-y-4 p-5 md:p-6">
        <div>
          <p className="product-eyebrow">Before you sign</p>
          <h2 className="mt-2 font-sans text-lg font-bold text-product-red">Pause policy</h2>
          <p className="mt-2 text-[13px] text-product-muted">
            Immediate stop for paper execution and queued Chain Proof jobs.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ImpactPanel
            title="Before"
            rows={[
              ["Mode 1", "Active"],
              ["Mode 2", "Eligible when selected"],
              ["Pending proofs", String(pendingCount)],
            ]}
          />
          <ImpactPanel
            title="After signature"
            rows={[
              ["Mode 1", "Blocked"],
              ["Mode 2", "Move aborts"],
              ["Pending proofs", "Canceled or blocked"],
            ]}
            tone="danger"
          />
        </div>
        <Button variant="danger" className="w-full" disabled={signDisabled} onClick={onSign}>
          Sign pause
        </Button>
      </div>
    );
  }

  if (highlightedAction === "unpause") {
    return (
      <div className="product-panel space-y-4 p-5 md:p-6">
        <div>
          <p className="product-eyebrow">Before you sign</p>
          <h2 className="mt-2 font-sans text-lg font-bold text-product-green">Resume execution</h2>
          <p className="mt-2 text-[13px] text-product-muted">
            Training Ledger may resume when strategy, vault, and market data are healthy.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ImpactPanel
            title="Before"
            rows={[
              ["Mode 1", "Blocked"],
              ["Mode 2", "Blocked"],
              ["Policy", "Paused"],
            ]}
            tone="danger"
          />
          <ImpactPanel
            title="After signature"
            rows={[
              ["Mode 1", "Active when healthy"],
              ["Mode 2", "Eligible when selected"],
              ["Policy", "Active"],
            ]}
            tone="pass"
          />
        </div>
        <Button className="w-full" disabled={signDisabled} onClick={onSign}>
          Sign resume
        </Button>
      </div>
    );
  }

  if (highlightedAction === "revoke") {
    return (
      <div className="product-panel space-y-4 p-5 md:p-6">
        <div>
          <p className="product-eyebrow">Before you sign</p>
          <h2 className="mt-2 font-sans text-lg font-bold text-product-red">Revoke agent</h2>
          <p className="mt-2 text-[13px] text-product-muted">
            Disable testnet Agent Signer for Chain Proof. Also pauses policy. Cannot be undone
            without new Agent Wallet setup.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ImpactPanel
            title="Before"
            rows={[
              ["Authorized agent", status.agent_signer_address ? "Configured" : "None"],
              ["Proof worker", status.agent_signer_address ? "Enabled" : "Off"],
              ["Mode 1", isPaused ? "Blocked" : "Active"],
            ]}
          />
          <ImpactPanel
            title="After signature"
            rows={[
              ["Authorized agent", "Removed"],
              ["PTB proof", "Blocked"],
              ["Mode 1", "Blocked by mirror"],
            ]}
            tone="danger"
          />
        </div>
        <Button variant="danger" className="w-full" disabled={signDisabled} onClick={onSign}>
          Sign revoke
        </Button>
      </div>
    );
  }

  return (
    <div className="product-panel space-y-4 p-5 md:p-6">
      <div>
        <p className="product-eyebrow">Before you sign</p>
        <h2 className="mt-2 font-sans text-lg font-bold text-product-gold">Tighten limits</h2>
        <p className="mt-2 text-[13px] text-product-muted">
          Lower caps or pairs — policy version increments. Loosening requires Agent Wallet setup.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ImpactPanel
          title="Current"
          rows={[
            ["Max notional", String(currentDraft.maxNotionalPerTrade)],
            ["Max daily loss", String(currentDraft.maxDailyLoss)],
            ["Allowed pairs", String(currentDraft.allowedPairs.length)],
          ]}
        />
        <ImpactPanel
          title="After tighten"
          rows={[
            ["Max notional", String(tightenDraft.maxNotionalPerTrade)],
            ["Max daily loss", String(tightenDraft.maxDailyLoss)],
            ["Policy version", `v${(status.policy?.version ?? 0) + 1}`],
          ]}
          tone="warn"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="gold" disabled={signDisabled} onClick={onEditTighten}>
          Edit & sign tighter limits
        </Button>
      </div>
    </div>
  );
}
