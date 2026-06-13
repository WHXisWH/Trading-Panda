"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";
import type { MarketListing } from "@/lib/mockData";

interface Props {
  listing: MarketListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
}

export function PurchaseConfirmModal({
  listing,
  open,
  onOpenChange,
  onConfirm,
}: Props) {
  if (!listing) return null;
  const royalty = listing.priceSui * 0.025;
  const gas = 0.01;
  const total = listing.priceSui + royalty + gas;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--color-overlay)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(400px,95vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-lg animate-scale-in">
          <Dialog.Title className="font-sans text-lg font-bold">
            确认购买
          </Dialog.Title>
          <dl className="mt-4 space-y-2 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-neutral-500">熊猫</dt>
              <dd className="font-medium">{listing.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">价格</dt>
              <dd>{listing.priceSui} SUI</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">版税 (2.5%)</dt>
              <dd>{royalty.toFixed(3)} SUI</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Gas</dt>
              <dd>~{gas} SUI</dd>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <dt>总计</dt>
              <dd className="text-primary-500">{total.toFixed(2)} SUI</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-red-600">
            MVP 为模拟市场展示；真实购买需 Kiosk 交易签名。
          </p>
          <div className="mt-4 flex gap-2">
            <Dialog.Close asChild>
              <Button variant="outline" className="flex-1">
                取消
              </Button>
            </Dialog.Close>
            <Button className="flex-1" onClick={onConfirm}>
              确认购买
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
