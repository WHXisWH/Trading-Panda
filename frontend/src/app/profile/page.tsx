// Profile Page — route: /profile
// Doc ref: docs/frontend-design.md §Profile
// My pandas list, daily check-in, trading stats summary

"use client";

export default function ProfilePage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="font-serif text-3xl">我的熊猫</h1>
      {/* TODO: CheckinCard (streak, today's reward) */}
      {/* TODO: PandaList (switch active panda) */}
      {/* TODO: StatsOverview (total trades, best ROI) */}
    </main>
  );
}
