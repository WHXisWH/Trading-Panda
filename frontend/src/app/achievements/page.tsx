// Achievements Page — route: /achievements
// Doc ref: docs/PRD.md §3.7, docs/frontend-design.md §Achievements
// Locked/unlocked achievement grid. On-chain confirmed achievements show Sui tx link.

"use client";

export default function AchievementsPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="font-serif text-3xl">成就</h1>
      {/* TODO: AchievementGrid (common/rare/epic/legendary sections) */}
      {/* TODO: UnlockedBadge with chain_status indicator */}
    </main>
  );
}
