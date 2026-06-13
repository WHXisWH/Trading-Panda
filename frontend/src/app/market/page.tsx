"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { PandaCard } from "@/components/panda/PandaCard";
import { MarketFilters } from "@/components/market/MarketFilters";
import { MarketDetailModal } from "@/components/market/MarketDetailModal";
import { PurchaseConfirmModal } from "@/components/market/PurchaseConfirmModal";
import { MOCK_MARKET_LISTINGS, type MarketListing } from "@/lib/mockData";

const SORT_OPTIONS = [
  "Newest",
  "Price: Low → High",
  "Price: High → Low",
  "XP: High → Low",
  "Win Rate: High → Low",
] as const;

export default function MarketPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]>("Newest");
  const [talent, setTalent] = useState("All");
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
    if (sort === "Price: Low → High") list.sort((a, b) => a.priceSui - b.priceSui);
    if (sort === "Price: High → Low") list.sort((a, b) => b.priceSui - a.priceSui);
    if (sort === "XP: High → Low")
      list.sort((a, b) => b.experienceLevel - a.experienceLevel);
    if (sort === "Win Rate: High → Low") list.sort((a, b) => b.winRate - a.winRate);
    return list;
  }, [search, sort, priceRange]);

  const perPage = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <PageContainer className="space-y-6 py-8">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px] max-w-xl">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            type="search"
            placeholder="Search by name or ID..."
            className="pl-10 pr-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"
              onClick={() => setSearch("")}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <Select
          aria-label="Sort"
          className="w-auto"
          value={sort}
          onValueChange={(v) => setSort(v as (typeof SORT_OPTIONS)[number])}
          options={SORT_OPTIONS.map((o) => ({ value: o, label: o }))}
        />
      </div>

      <MarketFilters
        talent={talent}
        onTalentChange={setTalent}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
        onClear={() => {
          setTalent("All");
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
          className="text-primary-500 disabled:opacity-40"
          onClick={() => setPage((p) => p - 1)}
        >
          ← Prev
        </button>
        <span className="text-neutral-500">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          className="text-primary-500 disabled:opacity-40"
          onClick={() => setPage((p) => p + 1)}
        >
          Next →
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
