"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PandaCard } from "@/components/panda/PandaCard";
import { MarketFilters } from "@/components/market/MarketFilters";
import { MarketDetailModal } from "@/components/market/MarketDetailModal";
import { PurchaseConfirmModal } from "@/components/market/PurchaseConfirmModal";
import { MOCK_MARKET_LISTINGS, type MarketListing } from "@/lib/mockData";

const SORT_OPTIONS = [
  "最新上架",
  "价格低→高",
  "价格高→低",
  "经验高→低",
  "胜率高→低",
] as const;

export default function MarketPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]>("最新上架");
  const [talent, setTalent] = useState("全部");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10]);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<MarketListing | null>(null);
  const [purchase, setPurchase] = useState<MarketListing | null>(null);

  const filtered = useMemo(() => {
    let list = [...MOCK_MARKET_LISTINGS];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.suiObjectId.toLowerCase().includes(q)
      );
    }
    list = list.filter(
      (l) => l.priceSui >= priceRange[0] && l.priceSui <= priceRange[1]
    );
    if (sort === "价格低→高") list.sort((a, b) => a.priceSui - b.priceSui);
    if (sort === "价格高→低") list.sort((a, b) => b.priceSui - a.priceSui);
    if (sort === "经验高→低")
      list.sort((a, b) => b.experienceLevel - a.experienceLevel);
    if (sort === "胜率高→低") list.sort((a, b) => b.winRate - a.winRate);
    return list;
  }, [search, sort, priceRange]);

  const perPage = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <PageContainer className="space-y-6 py-8">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px] max-w-xl">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500">
            🔍
          </span>
          <input
            type="search"
            placeholder="搜索熊猫名 / NFT ID..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-white py-2.5 pl-10 pr-10 text-[13px]"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500"
              onClick={() => setSearch("")}
            >
              ✕
            </button>
          )}
        </div>
        <select
          className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-[13px]"
          value={sort}
          onChange={(e) => setSort(e.target.value as (typeof SORT_OPTIONS)[number])}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o} value={o}>
              📊 {o}
            </option>
          ))}
        </select>
      </div>

      <MarketFilters
        talent={talent}
        onTalentChange={setTalent}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
        onClear={() => {
          setTalent("全部");
          setPriceRange([0, 10]);
          setSearch("");
        }}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {pageItems.map((listing) => (
          <PandaCard
            key={listing.id}
            id={listing.id}
            name={listing.name}
            priceSui={listing.priceSui}
            talent={listing.talent}
            experienceLevel={listing.experienceLevel}
            winRate={listing.winRate}
            listedAt={listing.listedAt}
            personality={listing.personality}
            isRare={listing.isRare}
            onSelect={() => setDetail(listing)}
            onBuy={() => setPurchase(listing)}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 text-[13px]">
        <button
          type="button"
          disabled={page <= 1}
          className="text-bamboo-500 disabled:opacity-40"
          onClick={() => setPage((p) => p - 1)}
        >
          ← 上一页
        </button>
        <span>
          第 {page}/{totalPages} 页
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          className="text-bamboo-500 disabled:opacity-40"
          onClick={() => setPage((p) => p + 1)}
        >
          下一页 →
        </button>
      </div>

      <MarketDetailModal
        listing={detail}
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        onBuy={() => {
          setPurchase(detail);
          setDetail(null);
        }}
      />

      <PurchaseConfirmModal
        listing={purchase}
        open={!!purchase}
        onOpenChange={(o) => !o && setPurchase(null)}
        onConfirm={() => {
          toast.success("购买流程演示完成（Kiosk 待接入）");
          setPurchase(null);
        }}
      />
    </PageContainer>
  );
}
