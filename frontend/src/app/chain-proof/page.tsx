import { Suspense } from "react";
import ChainProofPageClient from "./ChainProofPageClient";

export default function ChainProofPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-[13px] text-neutral-500">Loading…</div>
      }
    >
      <ChainProofPageClient />
    </Suspense>
  );
}
