"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { buildMintTx, fetchPandaFields, extractPandaObjectId } from "@/lib/sui/mintPanda";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PERSONALITY_AXES } from "@/lib/personality";

type Step = "idle" | "signing" | "registering" | "done";

export default function MintPage() {
  const router = useRouter();
  const account = useCurrentAccount();
  const { jwt } = useAuth();
  const signAndExecute = useSignAndExecuteTransaction() as any;

  const [step, setStep] = useState<Step>("idle");

  async function handleMint() {
    if (!account || !jwt) {
      toast.error("请先连接钱包");
      return;
    }
    try {
      setStep("signing");
      const tx = buildMintTx();
      const result = await signAndExecute.mutateAsync({ transaction: tx });
      const objectId = extractPandaObjectId(result);
      if (!objectId) throw new Error("未找到铸造的熊猫 Object ID");

      setStep("registering");
      const fields = await fetchPandaFields(null, objectId).catch(() => null);

      const res = await fetch("/api/pandas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          sui_object_id: objectId,
          boldness: fields?.boldness ?? 50,
          patience: fields?.patience ?? 50,
          intuition: fields?.intuition ?? 50,
          focus: fields?.focus ?? 50,
          contrarian: fields?.contrarian ?? 50,
          talent: fields?.talent ?? 0,
          generation: fields?.generation ?? 1,
        }),
      });
      if (!res.ok) throw new Error("后端注册失败");
      const panda = await res.json();

      setStep("done");
      toast.success("熊猫铸造成功！");
      setTimeout(() => router.push(`/dashboard/${panda.id}`), 800);
    } catch (err: any) {
      toast.error(err?.message ?? "铸造失败，请重试");
      setStep("idle");
    }
  }

  return (
    <PageContainer className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center gap-10">
      {/* Intro */}
      <div className="text-center space-y-3 max-w-lg">
        <h1 className="font-serif text-4xl font-bold text-bamboo-900">铸造你的熊猫</h1>
        <p className="text-ink-500">
          每只熊猫的性格由 Sui 链上随机数永久决定，铸造后不可更改。
          15% 概率获得稀有天赋，影响整个成长轨迹。
        </p>
      </div>

      {/* Preview card */}
      <Card variant="ink" className="w-full max-w-sm text-center space-y-6 py-8">
        <div className="text-[80px] leading-none animate-panda-breathe inline-block">
          🐼
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-bamboo-900">未知的熊猫</p>
          <p className="text-sm text-ink-500">铸造后性格由链上随机数决定</p>
        </div>

        {/* Personality axes preview */}
        <div className="space-y-2 text-left px-2">
          {PERSONALITY_AXES.map((axis) => (
            <div key={axis.key} className="flex items-center gap-3">
              <span className="w-8 text-xs text-ink-500 text-right shrink-0">
                {axis.label}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-ink-100 animate-pulse"
                  style={{ width: "60%", backgroundColor: axis.color + "55" }}
                />
              </div>
              <span className="w-6 text-xs text-ink-500">?</span>
            </div>
          ))}
        </div>

        <Button
          size="lg"
          className="w-full"
          loading={step !== "idle" && step !== "done"}
          onClick={handleMint}
          disabled={!account || !jwt}
        >
          {step === "idle" && "🐾 开始铸造"}
          {step === "signing" && "等待钱包签名…"}
          {step === "registering" && "注册熊猫…"}
          {step === "done" && "✅ 铸造成功！"}
        </Button>

        {(!account || !jwt) && (
          <p className="text-xs text-ink-500">请先在顶部连接钱包</p>
        )}
      </Card>

      {/* Odds info */}
      <div className="flex gap-6 text-center text-sm text-ink-500">
        <div>
          <div className="font-semibold text-bamboo-900">85%</div>
          <div>普通熊猫</div>
        </div>
        <div>
          <div className="font-semibold text-bamboo-900">15%</div>
          <div>天赋熊猫</div>
        </div>
        <div>
          <div className="font-semibold text-bamboo-900">6种</div>
          <div>可能的天赋</div>
        </div>
      </div>
    </PageContainer>
  );
}
