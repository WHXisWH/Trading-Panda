"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { clsx } from "clsx";
import {
  ArrowRight,
  Check,
  Copy,
  Flame,
  LayoutDashboard,
  PawPrint,
  ShieldAlert,
  User,
  Wallet,
} from "lucide-react";
import { ProductPageShell } from "@/components/layout/ProductPageShell";
import { ProfilePandaPortrait } from "@/components/profile/ProfilePandaPortrait";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { usePandaStore } from "@/stores/pandaStore";
import { fetchAgentWalletStatus } from "@/services/agentWallet.service";
import { fetchMyPandas, fetchPandaDetail } from "@/services/panda.service";
import { formatShortAddress } from "@/lib/formatAddress";
import { resolveProfilePrimaryAction } from "@/lib/profile/profileCta";
import { safetyPath, trainingLedgerPath } from "@/lib/ui/routeJump";
import type { AgentWalletStatusApi } from "@/types/agent-wallet";
import type { PandaDetailApi, PandaSummaryApi } from "@/types/panda";

interface CheckinStatus {
  checked_in_today: boolean;
  streak: number;
  history: string[];
}

interface SummaryMetric {
  label: string;
  value: string;
}

export default function ProfilePage() {
  const { user, isAuthed, jwt } = useAuth();
  const activePandaId = usePandaStore((state) => state.activePandaId);
  const setActivePanda = usePandaStore((state) => state.setActivePanda);
  const qc = useQueryClient();
  const [selectedPandaId, setSelectedPandaId] = useState<string | null>(null);

  const pandasQuery = useQuery({
    queryKey: ["panda", "my", jwt],
    enabled: !!jwt,
    queryFn: () => fetchMyPandas(jwt!),
  });

  const pandas = pandasQuery.data ?? [];
  const defaultPandaId = selectDefaultPandaId(pandas, activePandaId);
  const effectiveSelectedId =
    selectedPandaId && pandas.some((panda) => panda.id === selectedPandaId)
      ? selectedPandaId
      : defaultPandaId;
  const selectedPanda = pandas.find((panda) => panda.id === effectiveSelectedId) ?? null;

  useEffect(() => {
    if (!effectiveSelectedId || effectiveSelectedId === activePandaId) return;
    setActivePanda(effectiveSelectedId);
  }, [activePandaId, effectiveSelectedId, setActivePanda]);

  const detailQuery = useQuery({
    queryKey: ["panda-detail", effectiveSelectedId, jwt],
    enabled: !!jwt && !!effectiveSelectedId,
    queryFn: () => fetchPandaDetail(jwt!, effectiveSelectedId!),
  });

  const walletQuery = useQuery({
    queryKey: ["agent-wallet", effectiveSelectedId, jwt],
    enabled: !!jwt && !!effectiveSelectedId,
    queryFn: () => fetchAgentWalletStatus(jwt!, effectiveSelectedId!),
  });

  const checkinQuery = useQuery<CheckinStatus>({
    queryKey: ["checkin", jwt],
    enabled: !!jwt,
    queryFn: async () => {
      const res = await fetch("/api/checkin", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const json = await res.json();
      return json?.data ?? { checked_in_today: false, streak: 0, history: [] };
    },
  });

  const claim = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) throw new Error("checkin failed");
      return (await res.json())?.data;
    },
    onSuccess: (data) => {
      toast.success(
        data?.already_checked_in
          ? "Already checked in today"
          : `Checked in · ${data?.streak ?? 0}-day streak`,
      );
      qc.invalidateQueries({ queryKey: ["checkin"] });
    },
    onError: () => toast.error("Check-in failed. Try again."),
  });

  const primaryAction = resolveProfilePrimaryAction({
    primaryPanda: selectedPanda,
    pandaDetail: detailQuery.data,
    agentWallet: walletQuery.data,
  });
  const summary = useMemo(() => buildTrainingSummary(pandas), [pandas]);

  const handleSelectPanda = (pandaId: string) => {
    setSelectedPandaId(pandaId);
    setActivePanda(pandaId);
  };

  if (!isAuthed) {
    return (
      <ProductPageShell density="medium" className="flex min-h-[55vh] items-center justify-center">
        <EmptyPanel
          icon={<User className="h-8 w-8" />}
          title="Connect to open Profile"
          body="Profile is your account center once a wallet or zkLogin session is active."
        />
      </ProductPageShell>
    );
  }

  const isLoadingPandas = pandasQuery.isLoading;

  return (
    <ProductPageShell density="high" className="space-y-6">
      <ProfileHeader user={user} pandaCount={pandas.length} />

      {isLoadingPandas ? (
        <ProfileSkeleton />
      ) : !selectedPanda ? (
        <NoPandaState />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
            <PandaSidebar
              pandas={pandas}
              selectedPandaId={selectedPanda.id}
              onSelect={handleSelectPanda}
            />
            <SelectedPandaDetailCard
              panda={selectedPanda}
              detail={detailQuery.data}
              agentWallet={walletQuery.data}
              isLoadingDetail={detailQuery.isLoading || walletQuery.isLoading}
              action={primaryAction}
            />
            <div className="space-y-4 xl:order-none">
              <AccountCard walletAddress={user?.walletAddress ?? null} />
              <CheckinCard
                checkin={checkinQuery.data}
                isLoading={checkinQuery.isLoading}
                isClaiming={claim.isPending}
                onClaim={() => claim.mutate()}
              />
              <TrainingSummary metrics={summary} />
            </div>
          </div>
        </>
      )}
    </ProductPageShell>
  );
}

function ProfileHeader({
  user,
  pandaCount,
}: {
  user: { walletAddress?: string | null; displayName?: string | null } | null;
  pandaCount: number;
}) {
  const shortAddress = user?.walletAddress ? formatShortAddress(user.walletAddress) : "Session active";

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="product-eyebrow">Account Center</div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-product-text">Profile</h1>
        <p className="mt-1 text-sm text-product-muted">
          Continue the right Panda training loop from one place.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="product-chip rounded-full px-3 py-1.5 text-[11px]">
          {pandaCount} Panda{pandaCount === 1 ? "" : "s"}
        </span>
        <span className="product-chip rounded-full px-3 py-1.5 text-[11px]">
          {shortAddress}
        </span>
      </div>
    </div>
  );
}

function PandaSidebar({
  pandas,
  selectedPandaId,
  onSelect,
}: {
  pandas: PandaSummaryApi[];
  selectedPandaId: string;
  onSelect: (pandaId: string) => void;
}) {
  return (
    <aside className="flex flex-col xl:sticky xl:top-24 xl:h-[min(560px,calc(100dvh-220px))] xl:self-start">
      <div className="flex shrink-0 items-center justify-between gap-3 px-1">
        <h2 className="product-field-label">My Pandas</h2>
        <span className="text-[11px] text-product-muted">{pandas.length}</span>
      </div>
      <div className="mt-3 flex min-h-0 flex-1 gap-3 overflow-x-auto pb-1 xl:flex-col xl:overflow-y-auto xl:overflow-x-hidden xl:pr-1">
        {pandas.map((panda) => (
          <PandaSidebarCard
            key={panda.id}
            panda={panda}
            isSelected={panda.id === selectedPandaId}
            onSelect={() => onSelect(panda.id)}
          />
        ))}
      </div>
    </aside>
  );
}

function PandaSidebarCard({
  panda,
  isSelected,
  onSelect,
}: {
  panda: PandaSummaryApi;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const name = panda.name || `Panda ${panda.id.slice(0, 6)}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={clsx(
        "product-panel flex min-w-[220px] shrink-0 items-center gap-3 p-3 text-left transition-colors xl:min-w-0 xl:w-full",
        isSelected
          ? "border-product-green/45 bg-product-green/[0.08] ring-1 ring-product-green/30"
          : "hover:border-product-line/80 hover:bg-white/[0.03]",
      )}
    >
      <ProfilePandaPortrait panda={panda} size="sidebar" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-product-text">{name}</p>
        <p className="mt-0.5 font-mono text-[11px] text-product-muted">
          Lv.{panda.experience_level} · {formatGrowthStage(panda.growth_stage)}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-product-muted">
          {panda.is_trading ? "Training" : "Idle"}
        </p>
      </div>
    </button>
  );
}

function SelectedPandaDetailCard({
  panda,
  detail,
  agentWallet,
  isLoadingDetail,
  action,
}: {
  panda: PandaSummaryApi;
  detail?: PandaDetailApi;
  agentWallet?: AgentWalletStatusApi;
  isLoadingDetail: boolean;
  action: ReturnType<typeof resolveProfilePrimaryAction>;
}) {
  const name = panda.name || `Panda ${panda.id.slice(0, 6)}`;
  const status = primaryStatusLabel(panda, detail, agentWallet);

  return (
    <section className="product-panel overflow-hidden p-0">
      <div className="flex flex-col">
        <div className="relative flex items-center justify-center border-b border-product-line/50 bg-[radial-gradient(circle_at_50%_28%,rgba(109,255,144,0.16),transparent_34%),linear-gradient(180deg,rgba(225,186,92,0.12),transparent)] px-6 py-8">
          <ProfilePandaPortrait panda={panda} size="detail" />
        </div>

        <div className="flex min-w-0 flex-col gap-6 p-5 md:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              <span className="product-chip rounded-full px-2.5 py-1 text-[10px]">
                {panda.talent.name}
              </span>
            </div>
            <h2 className="mt-4 truncate text-2xl font-bold text-product-text">{name}</h2>
            <p className="mt-1 text-sm text-product-muted">
              Lv.{panda.experience_level} · {formatGrowthStage(panda.growth_stage)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile label="Trades" value={formatInteger(panda.total_trades)} />
            <MetricTile label="Win rate" value={formatPercent(panda.win_rate)} />
            <MetricTile
              label="Agent Wallet"
              value={agentWallet?.setup_state === "ready" ? "Ready" : "Setup needed"}
              loading={isLoadingDetail && !agentWallet}
            />
          </div>

          <div className="rounded-2xl border border-product-line bg-product-panel-soft/70 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="product-field-label">Next action</p>
                <p className="mt-1 text-sm text-product-muted">{action.helper}</p>
              </div>
              <Link href={action.href} className="shrink-0">
                <Button size="lg">
                  {action.label}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={trainingLedgerPath(panda.id)} className="flex-1 sm:flex-none">
              <Button size="sm" variant="ghost">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Open Training Ledger
              </Button>
            </Link>
            <Link href={safetyPath(panda.id)}>
              <Button size="sm" variant="ghost" aria-label="Emergency controls">
                <ShieldAlert className="h-3.5 w-3.5" />
                Emergency controls
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckinCard({
  checkin,
  isLoading,
  isClaiming,
  onClaim,
}: {
  checkin?: CheckinStatus;
  isLoading: boolean;
  isClaiming: boolean;
  onClaim: () => void;
}) {
  const last7 = buildLast7(checkin?.history ?? []);

  return (
    <section className="product-panel space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-product-gold/25 bg-product-gold/10 text-product-gold">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <p className="product-field-label">Daily Check-in</p>
            {isLoading ? (
              <Skeleton variant="product" className="mt-2 h-4 w-24" />
            ) : (
              <p className="mt-1 text-sm font-semibold text-product-text">
                {checkin?.streak ?? 0}-day streak
              </p>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant={checkin?.checked_in_today ? "ghost" : "gold"}
          disabled={checkin?.checked_in_today || isClaiming}
          loading={isClaiming}
          onClick={onClaim}
        >
          {checkin?.checked_in_today ? "Checked" : "Check in"}
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {last7.map((day) => (
          <div key={day.date} className="min-w-0" title={day.date}>
            <div
              className={clsx(
                "flex h-8 items-center justify-center rounded-lg border font-mono text-[10px] font-bold",
                day.done
                  ? "border-product-green/45 bg-product-green/15 text-product-green"
                  : "border-product-line bg-product-panel-soft text-product-muted",
              )}
            >
              {day.done ? <Check className="h-3.5 w-3.5" /> : day.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AccountCard({ walletAddress }: { walletAddress: string | null }) {
  const copy = async () => {
    if (!walletAddress) return;
    await navigator.clipboard?.writeText(walletAddress);
    toast.success("Wallet copied");
  };

  return (
    <section className="product-panel space-y-4 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-product-line bg-white/[0.04] text-product-muted">
          <Wallet className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="product-field-label">Account</p>
          <p className="mt-1 truncate font-mono text-sm text-product-text">
            {walletAddress ? formatShortAddress(walletAddress) : "Connected"}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          disabled={!walletAddress}
          className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-product-muted transition-colors hover:border-product-line hover:text-product-text disabled:opacity-40"
          aria-label="Copy wallet address"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

function TrainingSummary({ metrics }: { metrics: SummaryMetric[] }) {
  return (
    <section className="product-panel space-y-3 p-5">
      <p className="product-field-label">Training Summary</p>
      <div className="grid gap-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex items-center justify-between gap-3 rounded-xl border border-product-line bg-product-panel-soft/70 px-3 py-2.5"
          >
            <p className="text-[11px] text-product-muted">{metric.label}</p>
            <p className="font-mono text-sm font-bold text-product-text">{metric.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function NoPandaState() {
  return (
    <div className="product-panel flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-product-gold/25 bg-product-gold/10 text-product-gold">
        <PawPrint className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-product-text">Mint your first Panda</h2>
      <p className="mt-2 max-w-md text-sm text-product-muted">
        Profile becomes your training center after your first Panda NFT exists.
      </p>
      <Link href="/mint" className="mt-6">
        <Button size="lg">
          Mint Panda
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

function EmptyPanel({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="product-panel max-w-md p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-product-line bg-white/[0.04] text-product-muted">
        {icon}
      </div>
      <h2 className="mt-5 text-lg font-bold text-product-text">{title}</h2>
      <p className="mt-2 text-sm text-product-muted">{body}</p>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
      <div className="flex flex-col xl:h-[min(560px,calc(100dvh-220px))]">
        <Skeleton variant="product" className="h-4 w-24 shrink-0 rounded-md" />
        <div className="mt-3 flex min-h-0 flex-1 gap-3 overflow-hidden xl:flex-col">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="product" className="h-[74px] min-w-[220px] rounded-[20px] xl:min-w-0 xl:w-full" />
          ))}
        </div>
      </div>
      <Skeleton variant="product" className="h-[380px] rounded-[20px]" />
      <div className="space-y-4">
        <Skeleton variant="product" className="h-28 rounded-[20px]" />
        <Skeleton variant="product" className="h-36 rounded-[20px]" />
        <Skeleton variant="product" className="h-52 rounded-[20px]" />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="rounded-full border border-product-line bg-product-panel-soft px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-product-muted">
      {status}
    </span>
  );
}

function MetricTile({
  label,
  value,
  loading = false,
}: {
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-product-line bg-product-panel-soft/70 p-3">
      <p className="product-field-label">{label}</p>
      {loading ? (
        <Skeleton variant="product" className="mt-2 h-5 w-20" />
      ) : (
        <p className="mt-1 font-mono text-lg font-bold text-product-text">{value}</p>
      )}
    </div>
  );
}

function selectDefaultPandaId(
  pandas: PandaSummaryApi[],
  activePandaId: string | null,
): string | null {
  if (pandas.length === 0) return null;
  return pandas.find((panda) => panda.id === activePandaId)?.id ?? pandas[0].id;
}

function buildTrainingSummary(pandas: PandaSummaryApi[]): SummaryMetric[] {
  const totalTrades = pandas.reduce((sum, panda) => sum + panda.total_trades, 0);
  const winRates = pandas
    .map((panda) => panda.win_rate)
    .filter((value): value is number => typeof value === "number");
  const averageWinRate =
    winRates.length > 0
      ? winRates.reduce((sum, value) => sum + value, 0) / winRates.length
      : null;
  const activeTrainings = pandas.filter((panda) => panda.is_trading).length;

  return [
    { label: "Owned Pandas", value: formatInteger(pandas.length) },
    { label: "Total trades", value: formatInteger(totalTrades) },
    { label: "Average win", value: formatPercent(averageWinRate) },
    { label: "Training now", value: formatInteger(activeTrainings) },
  ];
}

function primaryStatusLabel(
  panda: PandaSummaryApi,
  detail?: PandaDetailApi,
  agentWallet?: AgentWalletStatusApi,
): string {
  if (panda.is_trading) return "Training";
  if (!agentWallet || agentWallet.setup_state !== "ready") return "Needs wallet setup";
  if (!detail?.active_strategy_id) return "Needs strategy";
  return "Ready";
}

function buildLast7(history: string[]): { date: string; label: string; done: boolean }[] {
  const set = new Set(history);
  const days: { date: string; label: string; done: boolean }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({
      date: iso,
      label: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()],
      done: set.has(iso),
    });
  }
  return days;
}

function formatGrowthStage(stage: string): string {
  return stage
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number") return "—";
  return `${Math.round(value * 100)}%`;
}

