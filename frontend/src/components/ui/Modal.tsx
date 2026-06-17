"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type ModalVariant = "light" | "product";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  variant?: ModalVariant;
  /** Danger styling for owner pause/revoke confirmations. */
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  loading?: boolean;
  hideClose?: boolean;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  variant = "light",
  danger = false,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  loading = false,
  hideClose = false,
}: ModalProps) {
  const isProduct = variant === "product";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-black/55 backdrop-blur-[2px]" />
        <Dialog.Content
          className={clsx(
            "fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[min(440px,95vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl p-6 shadow-lg animate-modal-in",
            isProduct
              ? "border border-product-line bg-product-panel text-product-text"
              : "bg-white text-neutral-900",
            danger && isProduct && "border-product-red/40",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title
                className={clsx(
                  "font-sans text-lg font-bold",
                  danger && isProduct ? "text-product-red" : "",
                )}
              >
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description
                  className={clsx(
                    "mt-2 text-[13px] leading-relaxed",
                    isProduct ? "text-product-muted" : "text-neutral-500",
                  )}
                >
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            {!hideClose ? (
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
            ) : null}
          </div>

          {children ? <div className="mt-4">{children}</div> : null}

          {footer ?? (onConfirm ? (
            <div className="mt-5 flex gap-2">
              <Dialog.Close asChild>
                <Button variant="outline" className="flex-1" disabled={loading}>
                  {cancelLabel}
                </Button>
              </Dialog.Close>
              <Button
                className={clsx("flex-1", danger && "bg-product-red hover:bg-product-red/90")}
                loading={loading}
                onClick={onConfirm}
              >
                {confirmLabel ?? "Confirm"}
              </Button>
            </div>
          ) : null)}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
