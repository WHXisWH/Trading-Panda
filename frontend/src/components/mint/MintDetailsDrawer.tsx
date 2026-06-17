"use client";

import { Drawer } from "@/components/ui/Drawer";

interface MintDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  txDigest: string;
  objectId: string;
  packageId?: string;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </dt>
      <dd className="break-all font-mono text-[12px] text-neutral-800">{value}</dd>
    </div>
  );
}

/** Progressive disclosure for tx digest / object id (page-mint §9). */
export function MintDetailsDrawer({
  open,
  onOpenChange,
  txDigest,
  objectId,
  packageId,
}: MintDetailsDrawerProps) {
  const pkg = packageId ?? process.env.NEXT_PUBLIC_PACKAGE_ID ?? "—";

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Mint details"
      description="On-chain identifiers for your Panda NFT."
    >
      <dl className="space-y-4">
        <DetailRow label="Transaction digest" value={txDigest} />
        <DetailRow label="Panda object id" value={objectId} />
        <DetailRow label="Package id" value={pkg} />
      </dl>
    </Drawer>
  );
}
