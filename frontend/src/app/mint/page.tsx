"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { buildMintTx, fetchPandaFields, extractPandaObjectId } from "@/lib/sui/mintPanda";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { PandaAvatar } from "@/components/panda/PandaAvatar";
import { PersonalityRadar } from "@/components/panda/PersonalityRadar";
import { TalentBadge } from "@/components/panda/TalentBadge";
import { PandaSvgRenderer } from "@/components/panda/PandaSvgRenderer";
import { statsFromPanda } from "@/utils/pandaHelper";
import type { PersonalityKey } from "@/lib/personality";

type MintState =
  | "idle"
  | "connecting"
  | "confirming"
  | "minting"
  | "revealing"
  | "done"
  | "error";

interface MintedPanda {
  id: string;
  boldness: number;
  patience: number;
  intuition: number;
  focus: number;
  contrarian: number;
  talent: number;
}

export default function MintPage() {
  const account = useCurrentAccount();
  const { jwt } = useAuth();
  const signAndExecute = useSignAndExecuteTransaction() as {
    mutateAsync: (args: { transaction: unknown }) => Promise<unknown>;
  };

  const [mintState, setMintState] = useState<MintState>("idle");
  const [minted, setMinted] = useState<MintedPanda | null>(null);
  const [showRadar, setShowRadar] = useState(false);
  const [showTalent, setShowTalent] = useState(false);

  const effectiveState: MintState = !account || !jwt ? "connecting" : mintState;

  async function handleMint() {
    if (!account || !jwt) {
      toast.error("请先连接钱包");
      return;
    }
    try {
      setMintState("confirming");
      const tx = buildMintTx();
      const result = await signAndExecute.mutateAsync({ transaction: tx });
      setMintState("minting");
      const objectId = extractPandaObjectId(result);
      if (!objectId) throw new Error("未找到铸造的熊猫 Object ID");

      const fields = await fetchPandaFields(null, objectId).catch(() => null);

      const res = await fetch("/api/pandas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          sui_object_id: objectId,
          boldness: fields?.boldness ?? 50 + Math.floor(Math.random() * 30),
          patience: fields?.patience ?? 50 + Math.floor(Math.random() * 30),
          intuition: fields?.intuition ?? 50 + Math.floor(Math.random() * 30),
          focus: fields?.focus ?? 50 + Math.floor(Math.random() * 30),
          contrarian: fields?.contrarian ?? 50 + Math.floor(Math.random() * 30),
          talent: fields?.talent ?? (Math.random() < 0.15 ? 1 + Math.floor(Math.random() * 6) : 0),
          generation: fields?.generation ?? 1,
        }),
      });
      if (!res.ok) throw new Error("后端注册失败");
      const panda = await res.json();

      setMinted({
        id: panda.id,
        boldness: panda.boldness,
        patience: panda.patience,
        intuition: panda.intuition,
        focus: panda.focus,
        contrarian: panda.contrarian,
        talent: panda.talent,
      });

      setMintState("revealing");
      toast.success("熊猫铸造成功！");
      setTimeout(() => setShowRadar(true), 400);
      setTimeout(() => setShowTalent(true), 1400);
      setTimeout(() => setMintState("done"), 2200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "铸造失败，请重试";
      toast.error(msg);
      setMintState("error");
    }
  }

  const personalityScores: Record<PersonalityKey, number> | null = minted
    ? {
        boldness: minted.boldness,
        patience: minted.patience,
        intuition: minted.intuition,
        focus: minted.focus,
        contrarian: minted.contrarian,
      }
    : null;

  return (
    <PageContainer
      variant="mint"
      className="flex min-h-[calc(100dvh-var(--navbar-height))] flex-col items-center justify-center gap-8 py-12"
    >
      <div className="text-center space-y-2 max-w-lg">
        <h1 className="font-serif text-[22px] font-bold md:text-3xl">
          铸造你的 AI 交易熊猫
        </h1>
        <p className="text-[13px] text-ink-500">
          {effectiveState === "connecting"
            ? "连接 Sui Wallet，铸造独一无二的链上性格"
            : "每只熊猫的性格由链上随机数永久决定"}
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        {minted && mintState !== "idle" ? (
          <div className="h-[120px] w-[120px] overflow-hidden rounded-full ring-4 ring-bamboo-500/30 animate-scale-in">
            <PandaSvgRenderer stats={statsFromPanda({ ...minted, experience_level: 5 })} />
          </div>
        ) : (
          <div className="h-[120px] w-[120px]">
            <PandaAvatar
              size="lg"
              variant={
                mintState === "confirming" || mintState === "minting"
                  ? "loading"
                  : "silhouette"
              }
            />
          </div>
        )}

        {effectiveState === "connecting" && (
          <Button size="lg" disabled>
            🔗 连接钱包
          </Button>
        )}

        {(effectiveState === "idle" || effectiveState === "error") && account && jwt && (
          <>
            <Button
              size="lg"
              loading={false}
              onClick={handleMint}
              className="min-w-[200px]"
            >
              🐼 铸造熊猫
            </Button>
            <p className="text-[11px] text-ink-500">Gas ~0.03 SUI</p>
          </>
        )}

        {(effectiveState === "confirming" || effectiveState === "minting") && (
          <Button size="lg" loading disabled className="min-w-[200px]">
            {effectiveState === "confirming" ? "交易确认中..." : "链上铸造中..."}
          </Button>
        )}

        {showRadar && personalityScores && (
          <div className="w-full max-w-sm animate-radar-reveal card-white p-4">
            <PersonalityRadar scores={personalityScores} animated />
            <div className="mt-3 grid grid-cols-2 gap-1 text-[11px] text-ink-500">
              <span>胆识 {minted!.boldness}</span>
              <span>耐性 {minted!.patience}</span>
              <span>直觉 {minted!.intuition}</span>
              <span>专注 {minted!.focus}</span>
              <span className="col-span-2 text-center">逆向性 {minted!.contrarian}</span>
            </div>
          </div>
        )}

        {showTalent && minted && (
          <div className="animate-spring-up">
            <TalentBadge talentId={minted.talent} reveal />
            {!minted.talent && (
              <p className="mt-2 text-center text-[11px] text-ink-500">普通熊猫，靠努力成长</p>
            )}
          </div>
        )}

        {mintState === "done" && minted && (
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href={`/dashboard/${minted.id}`}>
              <Button size="lg">🎮 进入模拟盘</Button>
            </Link>
            <Link href="/pools">
              <Button size="lg" variant="outline">
                选择交易池
              </Button>
            </Link>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => {
                setMinted(null);
                setMintState("idle");
                setShowRadar(false);
                setShowTalent(false);
              }}
            >
              再养一只
            </Button>
          </div>
        )}

        {mintState === "error" && (
          <Button size="lg" onClick={() => setMintState("idle")}>
            重试
          </Button>
        )}
      </div>
    </PageContainer>
  );
}
