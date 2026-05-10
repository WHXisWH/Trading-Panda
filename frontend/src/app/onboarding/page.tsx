// Onboarding Page — route: /onboarding
// Doc ref: docs/PRD.md §3.0, docs/frontend-design.md §Onboarding
// Shows 5-step survey for new users. Redirects to /mint on completion.
// Survey fields: trading_exp / style[] / max_loss / indicators[] / panda_autonomy

"use client";

export default function OnboardingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="font-serif text-3xl">初次见面</h1>
      <p className="mt-2 text-ink-500">让我们先了解你的交易风格</p>
      {/* TODO: 5-step survey form with zod validation */}
      {/* Step 1: 交易经验 */}
      {/* Step 2: 偏好风格 */}
      {/* Step 3: 最大亏损容忍 */}
      {/* Step 4: 熟悉指标 */}
      {/* Step 5: 熊猫自主度 */}
    </main>
  );
}
