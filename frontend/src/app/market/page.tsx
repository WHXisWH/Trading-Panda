// Market Page — route: /market
// Doc ref: docs/PRD.md §3.6, docs/frontend-design.md §Market
// Sui Kiosk integration — list, buy, sell Panda NFTs
// Royalty: 2–5% enforced by Kiosk TransferPolicy

"use client";

export default function MarketPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="font-serif text-3xl">熊猫市场</h1>
      {/* TODO: PandaGrid (listings from Kiosk) */}
      {/* TODO: FilterBar (talent, experience range, price) */}
      {/* TODO: ListingModal (for sellers) */}
      {/* TODO: PurchaseFlow (Kiosk buy tx) */}
    </main>
  );
}
