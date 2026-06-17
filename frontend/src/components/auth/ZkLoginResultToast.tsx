"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { consumeZkLoginDeferredResult } from "@/lib/sui/zkLogin";

/** Shows deferred zkLogin success/error toast after redirect back to the origin page. */
export function ZkLoginResultToast() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/auth/zklogin-callback")) return;

    const result = consumeZkLoginDeferredResult();
    if (!result) return;

    if (result.kind === "success") {
      toast.success(result.message ?? "Signed in with Google", {
        id: "zklogin-success",
        description: "Your zkLogin wallet is ready. You can mint on-chain from this page.",
      });
      return;
    }

    toast.error(result.message ?? "Google sign-in failed", {
      id: "zklogin-error",
      description: "Please try again or connect a Sui wallet instead.",
    });
  }, [pathname]);

  return null;
}
