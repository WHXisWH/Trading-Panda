"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { PandaAvatar } from "@/components/panda/PandaAvatar";
import { PersonalityRadar } from "@/components/panda/PersonalityRadar";
import { TalentBadge } from "@/components/panda/TalentBadge";
import { Button } from "@/components/ui/Button";
import type { MarketListing } from "@/lib/mockData";

interface Props {
  listing: MarketListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBuy?: () => void;
}

export function MarketDetailModal({
  listing,
  open,
  onOpenChange,
  onBuy,
}: Props) {
  if (!listing) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--color-overlay)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(800px,95vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-6 shadow-lg animate-modal-in">
          <Dialog.Title className="font-sans text-xl font-bold">
            {listing.name}
          </Dialog.Title>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-4">
              <PandaAvatar
                panda={{
                  ...listing.personality,
                  experience_level: listing.experienceLevel,
                }}
                size="xl"
              />
              <TalentBadge talentId={listing.talent} />
            </div>
            <div className="space-y-4">
              <PersonalityRadar scores={listing.personality} size={200} />
              <div className="grid grid-cols-2 gap-2 text-[13px]">
                <span className="text-neutral-500">经验</span>
                <span>Lv.{listing.experienceLevel}</span>
                <span className="text-neutral-500">胜率</span>
                <span>{Math.round(listing.winRate * 100)}%</span>
                <span className="text-neutral-500">价格</span>
                <span className="font-mono text-xl font-bold text-primary-500">
                  {listing.priceSui} SUI
                </span>
              </div>
              <Button className="w-full" onClick={onBuy}>
                购买
              </Button>
            </div>
          </div>
          <Dialog.Close className="absolute right-4 top-4 text-neutral-500 hover:text-neutral-900">
            ✕
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
