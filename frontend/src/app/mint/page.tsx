"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useMintPanda } from "@/hooks/useMintPanda";
import { parseMintError } from "@/lib/sui/parseMintError";
import { fetchMyPandas } from "@/services/panda.service";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { PandaAvatar } from "@/components/panda/PandaAvatar";
import { PersonalityRadar } from "@/components/panda/PersonalityRadar";
import { TalentBadge } from "@/components/panda/TalentBadge";
import { PandaSvgRenderer } from "@/components/panda/PandaSvgRenderer";
import { statsFromPanda } from "@/utils/pandaHelper";
import type { PersonalityKey } from "@/lib/personality";

export default function MintPage() {
  const { jwt } = useAuth();
  const {
    effectiveStatus,
    result,
    errorMessage,
    errorKind,
    mint,
    reset,
    showRadar,
    showTalent,
    isSuccess,
  } = useMintPanda(jwt);

  const { data: existingPandas } = useQuery({
    queryKey: ["panda", "my", jwt],
    queryFn: () => fetchMyPandas(jwt!),
    enabled: !!jwt,
    staleTime: 30_000,
  });

  async function handleMint() {
    try {
      await mint();
      toast.success("熊猫铸造成功！");
    } catch (err: unknown) {
      toast.error(parseMintError(err).message);
    }
  }

  const minted = result
    ? {
        id: result.pandaId,
        boldness: result.personality.boldness,
        patience: result.personality.patience,
        intuition: result.personality.intuition,
        focus: result.personality.focus,
        contrarian: result.personality.contrarian,
        talent: result.talent,
        experience_level: 5,
      }
    : null;

  const personalityScores: Record<PersonalityKey, number> | null = minted
    ? {
        boldness: minted.boldness,
        patience: minted.patience,
        intuition: minted.intuition,
        focus: minted.focus,
        contrarian: minted.contrarian,
      }
    : null;

  const showRevealedAvatar =
    minted &&
    (effectiveStatus === "revealing" || effectiveStatus === "success");

  return (
    <PageContainer
      variant="mint"
      className="flex min-h-[calc(100dvh-var(--navbar-height))] flex-col items-center justify-center gap-8 py-12"
    >
      {existingPandas && existingPandas.length > 0 && effectiveStatus === "idle" && (
        <div className="rounded-lg border border-neutral-200 bg-primary-50/80 px-4 py-2 text-[12px] text-primary-600">
          你已拥有 {existingPandas.length} 只熊猫 ·{" "}
          <Link href={`/dashboard/${existingPandas[0].id}`} className="underline">
            进入模拟盘
          </Link>
        </div>
      )}

      <div className="max-w-lg space-y-2 text-center">
        <h1 className="font-sans text-[22px] font-bold md:text-3xl">
          铸造你的 AI 交易熊猫
        </h1>
        <p className="text-[13px] text-neutral-500">
          {effectiveStatus === "connecting"
            ? "连接 Sui Wallet 并登录，铸造独一无二的链上性格"
            : "每只熊猫的性格由链上随机数永久决定"}
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        {showRevealedAvatar ? (
          <div className="h-[120px] w-[120px] overflow-hidden rounded-full ring-4 ring-primary-500/30 animate-scale-in">
            <PandaSvgRenderer stats={statsFromPanda(minted)} />
          </div>
        ) : (
          <div className="h-[120px] w-[120px]">
            <PandaAvatar
              size="lg"
              variant={
                effectiveStatus === "confirming" || effectiveStatus === "minting"
                  ? "loading"
                  : "silhouette"
              }
            />
          </div>
        )}

        {effectiveStatus === "connecting" && (
          <Button size="lg" disabled>
            🔗 Connect Wallet
          </Button>
        )}

        {(effectiveStatus === "idle" || effectiveStatus === "error") && jwt && (
          <>
            <Button
              size="lg"
              onClick={() => void handleMint()}
              className="min-w-[200px]"
            >
              Mint Panda
            </Button>
            <p className="text-[11px] text-neutral-500">Gas ~0.03 SUI</p>
          </>
        )}

        {(effectiveStatus === "confirming" || effectiveStatus === "minting") && (
          <Button size="lg" loading disabled className="min-w-[200px]">
            {effectiveStatus === "confirming" ? "交易确认中..." : "链上铸造中..."}
          </Button>
        )}

        {effectiveStatus === "error" && errorMessage && (
          <div className="max-w-sm space-y-2 text-center">
            <p className="text-[13px] text-red-600">{errorMessage}</p>
            {errorKind === "insufficient_gas" && (
              <p className="text-[11px] text-neutral-500">
                <a
                  href="https://faucet.testnet.sui.io/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-600 underline"
                >
                  领取 Testnet SUI
                </a>
              </p>
            )}
            <Button size="lg" onClick={reset}>
              重试
            </Button>
          </div>
        )}

        {showRadar && personalityScores && minted && (
          <div className="bg-white border border-\[var(--color-border)\] rounded-xl shadow-sm animate-scale-in w-full max-w-sm p-4">
            <PersonalityRadar scores={personalityScores} animated />
            <div className="mt-3 grid grid-cols-2 gap-1 text-[11px] text-neutral-500">
              <span>胆识 {minted.boldness}</span>
              <span>耐性 {minted.patience}</span>
              <span>直觉 {minted.intuition}</span>
              <span>专注 {minted.focus}</span>
              <span className="col-span-2 text-center">
                逆向性 {minted.contrarian}
              </span>
            </div>
          </div>
        )}

        {showTalent && minted && (
          <div className="animate-fade-up">
            <TalentBadge talentId={minted.talent} reveal />
            {!minted.talent && (
              <p className="mt-2 text-center text-[11px] text-neutral-500">
                普通熊猫，靠努力成长
              </p>
            )}
          </div>
        )}

        {isSuccess && result && (
          <div className="flex flex-wrap justify-center gap-3">
            <h2 className="w-full text-center font-sans text-lg">
              Welcome{result.name ? ` ${result.name}` : ""} 加入你的战队
            </h2>
            <Link href={`/dashboard/${result.pandaId}`}>
              <Button size="lg">🎮 进入模拟盘</Button>
            </Link>
            <Link href="/pools">
              <Button size="lg" variant="outline">
                Pools
              </Button>
            </Link>
            <Button size="lg" variant="ghost" onClick={reset}>
              再养一只
            </Button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
