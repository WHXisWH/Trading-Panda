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
  children: ReactNode;
  className?: string;
  variant?: DrawerVariant;
}

/** Bottom sheet on mobile; right-side drawer on desktop (Epic 10 shared primitive). */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  variant = "light",
}: DrawerProps) {
  const isProduct = variant === "product";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/50 backdrop-blur-[1px]" />
        <Dialog.Content
          className={clsx(
            "fixed z-[var(--z-modal)] flex flex-col shadow-lg",
            isProduct
              ? "border border-product-line bg-product-panel text-product-text"
              : "bg-white",
            "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl",
            "md:inset-y-0 md:right-0 md:left-auto md:bottom-auto md:h-full md:max-h-none md:w-[min(420px,95vw)] md:rounded-none md:rounded-l-2xl",
            "animate-drawer-in",
            className,
          )}
        >
          <div
            className={clsx(
              "flex items-start justify-between gap-3 border-b px-5 py-4",
              isProduct ? "border-product-line" : "border-[var(--color-border)]",
            )}
          >
            <div className="min-w-0">
              <Dialog.Title
                className={clsx(
                  "font-sans text-base font-bold",
                  isProduct ? "text-product-text" : "text-neutral-900",
                )}
              >
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description
                  className={clsx(
                    "mt-1 text-[12px]",
                    isProduct ? "text-product-muted" : "text-neutral-500",
                  )}
                >
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              className={clsx(
                "rounded-lg p-1.5 transition-colors",
                isProduct
                  ? "text-product-muted hover:bg-product-panel-soft"
                  : "text-neutral-500 hover:bg-neutral-100",
              )}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
