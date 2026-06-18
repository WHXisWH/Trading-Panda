import { Transaction } from "@mysten/sui/transactions";
import { packageIdForMoveCall, packageIdsForEventMatch } from "@/lib/sui/packageIds";
import { parseMintEventsFromList } from "@/lib/sui/parseMintEvent";

/** Loosely typed tx block — avoids @mysten/sui version skew between dapp-kit and app. */
export type MintTransactionBlock = {
  objectChanges?: Array<{
    type: string;
    objectId?: string;
    objectType?: string;
    owner?: unknown;
    reference?: { objectId: string };
  }> | null;
  events?: Array<{ type?: string; parsedJson?: unknown }> | null;
  effects?: { status?: { status?: string } } | null;
};

export type MintSuiClient = {
  waitForTransaction(input: {
    digest: string;
    options?: {
      showObjectChanges?: boolean;
      showEvents?: boolean;
      showEffects?: boolean;
    };
  }): Promise<MintTransactionBlock>;
};

const PACKAGE_ID = packageIdForMoveCall();
const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_ID!;
const RANDOM_OBJ = "0x0000000000000000000000000000000000000000000000000000000000000008";
const CLOCK_OBJ  = "0x0000000000000000000000000000000000000000000000000000000000000006";

export function buildMintTx(): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::mint::mint`,
    arguments: [
      tx.object(REGISTRY_ID),
      tx.object(RANDOM_OBJ),
      tx.object(CLOCK_OBJ),
    ],
  });
  return tx;
}

export interface PandaFields {
  suiObjectId: string;
  boldness: number;
  patience: number;
  intuition: number;
  focus: number;
  contrarian: number;
  talent: number;
  generation: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchPandaFields(client: any, suiObjectId: string): Promise<PandaFields> {
  const obj = await client.getObject({ id: suiObjectId, options: { showContent: true } });
  const fields = (obj?.data?.content as { fields?: Record<string, unknown> })?.fields ?? {};
  return {
    suiObjectId,
    boldness: Number(fields.boldness ?? 50),
    patience: Number(fields.patience ?? 50),
    intuition: Number(fields.intuition ?? 50),
    focus: Number(fields.focus ?? 50),
    contrarian: Number(fields.contrarian ?? 50),
    talent: Number(fields.talent ?? 0),
    generation: Number(fields.generation ?? 1),
  };
}

function hasAddressOwner(owner: unknown): boolean {
  return typeof owner === "object" && owner !== null && "AddressOwner" in owner;
}

/** Parse Panda NFT object id from a full RPC transaction block (objectChanges + events). */
export function extractPandaObjectIdFromTxBlock(txBlock: MintTransactionBlock): string | null {
  const events = (txBlock.events ?? []).map((e) => ({
    type: e.type,
    parsedJson:
      e.parsedJson && typeof e.parsedJson === "object"
        ? (e.parsedJson as Record<string, unknown>)
        : undefined,
  }));
  const fromEvent = parseMintEventsFromList(events, packageIdsForEventMatch());
  if (fromEvent?.objectId) return fromEvent.objectId;

  const created = (txBlock.objectChanges ?? []).filter((c) => c.type === "created");

  const pandaCreated = created.find(
    (c) =>
      hasAddressOwner(c.owner) &&
      (c.objectType?.toLowerCase().includes("::panda::panda") ?? false),
  );
  if (pandaCreated?.objectId) return pandaCreated.objectId;

  const anyOwned = created.find((c) => hasAddressOwner(c.owner));
  return anyOwned?.objectId ?? null;
}

/**
 * After signAndExecute returns only digest, load the finalized tx via RPC (方案 2).
 */
export async function resolvePandaObjectIdFromDigest(
  client: MintSuiClient,
  digest: string,
): Promise<string> {
  const txBlock = await client.waitForTransaction({
    digest,
    options: {
      showObjectChanges: true,
      showEvents: true,
      showEffects: true,
    },
  });

  const status = txBlock.effects?.status?.status;
  if (status === "failure") {
    throw new Error("链上铸造交易执行失败");
  }

  const objectId = extractPandaObjectIdFromTxBlock(txBlock);
  if (!objectId) {
    throw new Error("未找到铸造的熊猫 Object ID");
  }
  return objectId;
}

/** @deprecated Prefer resolvePandaObjectIdFromDigest — dapp-kit often returns no objectChanges */
export function extractPandaObjectId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  txResult: any,
): string | null {
  if (txResult?.objectChanges || txResult?.events) {
    return extractPandaObjectIdFromTxBlock(txResult as MintTransactionBlock);
  }
  const legacyCreated = txResult?.effects?.created;
  if (Array.isArray(legacyCreated)) {
    const pandaObj = legacyCreated.find(
      (obj: { owner?: unknown }) =>
        obj.owner && typeof obj.owner === "object" && "AddressOwner" in obj.owner,
    );
    return (
      pandaObj?.reference?.objectId ??
      pandaObj?.objectId ??
      null
    );
  }
  return null;
}
