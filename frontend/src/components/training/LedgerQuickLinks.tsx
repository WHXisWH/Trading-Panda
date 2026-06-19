"use client";

import Link from "next/link";
import { chainProofPath, reviewPath, safetyPath } from "@/lib/ui/routeJump";

interface Props {
  pandaId: string;
}

export function LedgerQuickLinks({ pandaId }: Props) {
  return (
    <div className="ledger-nav-rail flex flex-wrap gap-x-4 gap-y-2">
      <Link
        href={chainProofPath(pandaId)}
        className="text-[11px] font-medium text-product-green underline-offset-2 hover:underline"
      >
        Chain Proof
      </Link>
      <Link
        href={reviewPath(pandaId)}
        className="text-[11px] font-medium text-product-gold underline-offset-2 hover:underline"
      >
        Review Journal
      </Link>
      <Link
        href={safetyPath(pandaId)}
        className="text-[11px] font-medium text-product-red underline-offset-2 hover:underline"
      >
        Emergency controls
      </Link>
    </div>
  );
}
