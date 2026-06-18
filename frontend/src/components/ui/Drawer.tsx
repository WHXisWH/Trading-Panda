"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import { X } from "lucide-react";
import type { ReactNode } from "react";

type DrawerVariant = "light" | "product";

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: DrawerVariant;
}

/** Bottom sheet on mobile; right-side drawer on desktop (Epic 10 shared primitive). */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  eyebrow,
  children,
  footer,
  className,
  contentClassName,
  variant = "light",
}: DrawerProps) {
  const isProduct = variant === "product";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={clsx(
            "fixed inset-0 z-[var(--z-overlay)] backdrop-blur-[2px]",
            isProduct ? "bg-black/62" : "bg-black/50",
          )}
        />
        <Dialog.Content
          className={clsx(
            "fixed z-[var(--z-modal)] flex flex-col shadow-lg",
            isProduct
              ? "strategy-feed-drawer bg-[rgba(8,10,8,0.97)] text-product-text backdrop-blur-xl"
              : "bg-white",
            "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl",
            "md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:h-full md:max-h-none md:w-[min(420px,95vw)] md:rounded-none md:rounded-l-2xl",
            "animate-drawer-in",
            className,
          )}
        >
          <div
            className={clsx(
              "relative flex shrink-0 items-start justify-between gap-3 px-5 py-5 md:px-6",
              isProduct
                ? "strategy-feed-drawer-header"
                : "border-b border-[var(--color-border)] py-4",
            )}
          >
            <div className="min-w-0">
              {eyebrow ? (
                <p
                  className={clsx(
                    "font-mono text-[10px] font-extrabold uppercase tracking-[0.12em]",
                    isProduct ? "text-product-gold/80" : "text-neutral-500",
                  )}
                >
                  {eyebrow}
                </p>
              ) : null}
              <Dialog.Title
                className={clsx(
                  "font-sans font-bold tracking-[-0.03em]",
                  eyebrow ? "mt-2" : "",
                  isProduct
                    ? "text-[clamp(1.35rem,2.4vw,1.75rem)] leading-[1.05] text-product-text"
                    : "text-base text-neutral-900",
                )}
              >
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description
                  className={clsx(
                    "mt-2 max-w-xl text-[13px] leading-relaxed",
                    isProduct ? "text-[#c8dcc8]/88" : "text-[12px] text-neutral-500",
                  )}
                >
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              className={clsx(
                "rounded-full p-2 transition-colors",
                isProduct
                  ? "strategy-feed-drawer-close text-product-muted hover:text-product-text"
                  : "rounded-lg text-neutral-500 hover:bg-neutral-100",
              )}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div
            className={clsx(
              "min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6 md:py-6",
              contentClassName,
            )}
          >
            {children}
          </div>
          {footer ? (
            <div
              className={clsx(
                "shrink-0 px-5 py-4 md:px-6",
                isProduct ? "strategy-feed-drawer-footer" : "border-t border-[var(--color-border)]",
              )}
            >
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
