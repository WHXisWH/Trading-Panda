"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { clsx } from "clsx";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchAuthMe,
  submitOnboardingSurvey,
  type OnboardingSurveySubmit,
} from "@/lib/auth.service";
import { useAuthStore } from "@/stores/authStore";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";

const STEPS = 5;

const EXP_OPTIONS = [
  { value: "none", label: "零经验，纯新手" },
  { value: "beginner", label: "做过一些模拟/小额" },
  { value: "intermediate", label: "交易 1 年以上" },
  { value: "advanced", label: "资深交易者" },
] as const;

const STYLE_OPTIONS = [
  { value: "trend", label: "趋势跟踪" },
  { value: "swing", label: "波段" },
  { value: "scalp", label: "短线" },
  { value: "value", label: "价值投资" },
  { value: "grid", label: "网格" },
] as const;

const INDICATOR_OPTIONS = [
  { value: "ma", label: "MA" },
  { value: "rsi", label: "RSI" },
  { value: "macd", label: "MACD" },
  { value: "bollinger", label: "布林带" },
  { value: "volume", label: "成交量" },
  { value: "none", label: "都不熟悉" },
] as const;

const MAX_LOSS_OPTIONS = [5, 10, 20, 30] as const;

const AUTONOMY_LABELS: Record<number, string> = {
  1: "完全听我的",
  2: "偏保守",
  3: "平衡",
  4: "较自主",
  5: "让它自由发挥",
};

type Answers = {
  trading_exp: OnboardingSurveySubmit["trading_exp"] | null;
  style: OnboardingSurveySubmit["style"];
  max_loss: OnboardingSurveySubmit["max_loss"];
  indicators: OnboardingSurveySubmit["indicators"];
  panda_autonomy: OnboardingSurveySubmit["panda_autonomy"];
};

export default function OnboardingPage() {
  const router = useRouter();
  const { jwt } = useAuth();
  const { setAuth, refreshToken } = useAuthStore();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [resultTags, setResultTags] = useState<string[] | null>(null);
  const [answers, setAnswers] = useState<Answers>({
    trading_exp: null,
    style: [],
    max_loss: 10,
    indicators: [],
    panda_autonomy: 3,
  });

  function canNext(): boolean {
    if (step === 1) return answers.trading_exp !== null;
    if (step === 2) return answers.style.length > 0;
    if (step === 3) return true;
    if (step === 4) return answers.indicators.length > 0;
    if (step === 5) return true;
    return false;
  }

  function goNext() {
    if (!canNext()) {
      toast.error("请先完成当前步骤");
      return;
    }
    if (step < STEPS) setStep(step + 1);
  }

  function goBack() {
    if (step > 1) setStep(step - 1);
  }

  async function handleSubmit() {
    if (!jwt || answers.trading_exp === null) {
      toast.error("请先Connect Wallet并登录");
      return;
    }
    if (answers.style.length === 0 || answers.indicators.length === 0) {
      toast.error("请完成所有问题");
      return;
    }

    setSubmitting(true);
    try {
      const body: OnboardingSurveySubmit = {
        trading_exp: answers.trading_exp,
        style: answers.style,
        max_loss: answers.max_loss,
        indicators: answers.indicators,
        panda_autonomy: answers.panda_autonomy,
      };
      const data = await submitOnboardingSurvey(jwt, body);
      setResultTags(data.recommended_strategy_tags);

      const me = await fetchAuthMe();
      setAuth(me, jwt, refreshToken ?? undefined);

      toast.success("问卷已保存");
      window.setTimeout(() => router.push("/mint"), 2000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer className="mx-auto max-w-lg py-10">
      <div className="mb-8 flex gap-2">
        {Array.from({ length: STEPS }, (_, i) => (
          <div
            key={i}
            className={clsx(
              "h-1 flex-1 rounded-full transition-colors",
              i + 1 <= step ? "bg-primary-600" : "bg-neutral-200",
            )}
          />
        ))}
      </div>

      {resultTags ? (
        <div className="card-white animate-fade-up space-y-4 p-6 text-center">
          <h2 className="font-sans text-xl font-bold">了解你了！</h2>
          <p className="text-[13px] text-neutral-500">推荐策略方向</p>
          <div className="flex flex-wrap justify-center gap-2">
            {resultTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary-100 px-3 py-1 text-[12px] text-primary-600"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-neutral-500">2 秒后前往铸造页…</p>
        </div>
      ) : (
        <>
          {step === 1 && (
            <section className="space-y-4">
              <h1 className="font-sans text-[22px] font-bold">你有多少交易经验？</h1>
              <div className="grid gap-2">
                {EXP_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setAnswers((a) => ({
                        ...a,
                        trading_exp: opt.value,
                      }))
                    }
                    className={clsx(
                      "rounded-lg border px-4 py-3 text-left text-[14px] transition",
                      answers.trading_exp === opt.value
                        ? "border-primary-600 bg-primary-50 scale-[1.02]"
                        : "border-neutral-200 hover:border-primary-500",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <h1 className="font-sans text-[22px] font-bold">你偏好什么交易风格？</h1>
              <p className="text-[13px] text-neutral-500">可多选</p>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_OPTIONS.map((opt) => {
                  const on = answers.style.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setAnswers((a) => ({
                          ...a,
                          style: on
                            ? a.style.filter((s) => s !== opt.value)
                            : [...a.style, opt.value],
                        }))
                      }
                      className={clsx(
                        "rounded-lg border px-3 py-2 text-[13px] transition",
                        on
                          ? "border-primary-600 bg-primary-50"
                          : "border-neutral-200",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
              <h1 className="font-sans text-[22px] font-bold">
                单笔最多能接受亏多少？
              </h1>
              <div className="flex flex-wrap gap-2">
                {MAX_LOSS_OPTIONS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, max_loss: pct }))}
                    className={clsx(
                      "min-w-[64px] rounded-lg border px-4 py-2 text-[14px]",
                      answers.max_loss === pct
                        ? "border-primary-600 bg-primary-600 text-white"
                        : "border-neutral-200",
                    )}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <p className="text-center text-2xl" aria-hidden>
                {answers.max_loss <= 10 ? "👍" : answers.max_loss >= 20 ? "😰" : "🐼"}
              </p>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-4">
              <h1 className="font-sans text-[22px] font-bold">你熟悉哪些技术指标？</h1>
              <p className="text-[13px] text-neutral-500">不熟悉也没关系</p>
              <div className="grid grid-cols-2 gap-2">
                {INDICATOR_OPTIONS.map((opt) => {
                  const on = answers.indicators.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setAnswers((a) => ({
                          ...a,
                          indicators: on
                            ? a.indicators.filter((i) => i !== opt.value)
                            : [...a.indicators, opt.value],
                        }))
                      }
                      className={clsx(
                        "rounded-lg border px-3 py-2 text-[13px]",
                        on ? "border-primary-600 bg-primary-50" : "border-neutral-200",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 5 && (
            <section className="space-y-4">
              <h1 className="font-sans text-[22px] font-bold">你希望熊猫多自主？</h1>
              <input
                type="range"
                min={1}
                max={5}
                value={answers.panda_autonomy}
                onChange={(e) =>
                  setAnswers((a) => ({
                    ...a,
                    panda_autonomy: Number(e.target.value) as Answers["panda_autonomy"],
                  }))
                }
                className="w-full accent-primary-600"
              />
              <p className="text-center text-[14px] text-neutral-600">
                {AUTONOMY_LABELS[answers.panda_autonomy]}
              </p>
            </section>
          )}

          <div className="mt-8 flex justify-between gap-3">
            {step > 1 ? (
              <Button variant="outline" onClick={goBack}>
                上一步
              </Button>
            ) : (
              <span />
            )}
            {step < STEPS ? (
              <Button onClick={goNext} disabled={!canNext()}>
                下一步
              </Button>
            ) : (
              <Button loading={submitting} onClick={() => void handleSubmit()}>
                完成
              </Button>
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
}
