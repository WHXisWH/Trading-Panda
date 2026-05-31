"use client";

import { Button } from "@/components/ui/Button";

interface Props {
  count: number;
  confirming?: boolean;
  onClear: () => void;
  onConfirm: () => void;
}

export function PoolConfirmBar({
  count,
  confirming = false,
  onClear,
  onConfirm,
}: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex h-[50px] items-center justify-between border-t border-[var(--color-border)] bg-paper-card px-6">
      <span className="text-[13px] font-medium">
        已选 {count} 个池子
      </span>
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={count === 0 || confirming}
        >
          清空
        </Button>
        <Button
          size="sm"
          disabled={count === 0 || confirming}
          loading={confirming}
          onClick={onConfirm}
        >
          {confirming ? "保存中…" : "确认选择"}
        </Button>
      </div>
    </div>
  );
}
