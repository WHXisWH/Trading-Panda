import { toast } from "sonner";

/** Short-lived feedback — durable facts must also live in drawers/cards (Epic 10). */

export function toastSubmitted(title: string, description?: string): void {
  toast.message(title, { description });
}

export function toastSuccess(title: string, description?: string): void {
  toast.success(title, { description });
}

export function toastQueued(title: string, description?: string): void {
  toast.message(title, { description: description ?? "Queued — check status on this page." });
}

export function toastFailedSafely(title: string, description?: string): void {
  toast.error(title, {
    description: description ?? "No ledger or policy change was applied.",
  });
}

export function toastSyncing(description?: string): void {
  toast.message("Mirror syncing", {
    description: description ?? "Chain result is authoritative; backend mirror is catching up.",
  });
}
