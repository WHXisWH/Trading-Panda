import { Suspense } from "react";
import ReviewJournalPageClient from "./ReviewJournalPageClient";

export default function ReviewJournalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40dvh] items-center justify-center text-[13px] text-neutral-500">
          Loading review journal…
        </div>
      }
    >
      <ReviewJournalPageClient />
    </Suspense>
  );
}
