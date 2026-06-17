import type { ReactNode } from "react";

/** Mint ritual fits one viewport below the navbar — no page scroll. */
export default function MintLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-[calc(100dvh-var(--mint-chrome-offset))] min-h-0 overflow-hidden">
      {children}
    </div>
  );
}
