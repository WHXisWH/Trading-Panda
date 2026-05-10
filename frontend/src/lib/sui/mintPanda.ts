import { Transaction } from "@mysten/sui/transactions";

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;
const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_ID!;
const RANDOM_OBJ = "0x0000000000000000000000000000000000000000000000000000000000000008";
const CLOCK_OBJ  = "0x0000000000000000000000000000000000000000000000000000000000000006";

export function buildMintTx(): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::panda::mint`,
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

export function extractPandaObjectId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  txResult: any,
): string | null {
  const created: Array<{ reference: { objectId: string }; owner: unknown }> =
    txResult?.effects?.created ?? txResult?.objectChanges?.filter((c: { type: string }) => c.type === "created") ?? [];
  const pandaObj = created.find(
    (obj) => obj.owner && typeof obj.owner === "object" && "AddressOwner" in obj.owner,
  );
  return pandaObj?.reference?.objectId ?? (pandaObj as { objectId?: string })?.objectId ?? null;
}
