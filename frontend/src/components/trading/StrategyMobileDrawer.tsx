"use client";

import { useEffect, type ReactNode } from "react";
import { clsx } from "clsx";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function StrategyMobileDrawer({ open, onOpenChange, children }: Props) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-bamboo-500 bg-bamboo-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg xl:hidden"
        aria-expanded={open}
        aria-controls="strategy-mobile-drawer"
      >
        编辑策略
      </button>

      {open && (
        <div className="fixed inset-0 z-50 xl:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="关闭"
            onClick={() => onOpenChange(false)}
          />
          <div
            id="strategy-mobile-drawer"
            className={clsx(
              "absolute bottom-0 left-0 right-0 flex max-h-[85dvh] flex-col",
              "rounded-t-2xl border border-[var(--color-border)] bg-paper-card shadow-xl",
            )}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <h2 className="font-serif text-[15px] font-semibold">策略积木</h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg px-2 py-1 text-[13px] text-ink-500 hover:bg-bamboo-50"
              >
                收起
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
