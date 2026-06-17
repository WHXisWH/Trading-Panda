import type { ReactNode } from "react";

/** Auth callback routes use a focused full-viewport shell (no page chrome). */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-var(--navbar-height))] flex-1 items-center justify-center px-4 py-10">
      {children}
    </div>
  );
}
