import { getZkLoginSignature } from "@mysten/zklogin";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import type { Transaction } from "@mysten/sui/transactions";
import { APP_SUI_NETWORK } from "@/lib/sui/network";
import type { MintSuiClient, MintTransactionBlock } from "@/lib/sui/mintPanda";
import {
  assertZkLoginSessionActive,
  getEphemeralKeypair,
  type ZkLoginPersistedSession,
} from "@/lib/sui/zkLoginSession";

function suiClient(): SuiClient {
  return new SuiClient({ url: getFullnodeUrl(APP_SUI_NETWORK) });
}

export async function signAndExecuteZkLoginTransaction(
  session: ZkLoginPersistedSession,
  transaction: Transaction,
): Promise<MintTransactionBlock & { digest: string }> {
  await assertZkLoginSessionActive(session);

  const client = suiClient();
  const keypair = getEphemeralKeypair(session);
  transaction.setSender(session.walletAddress);

  const { bytes, signature: userSignature } = await transaction.sign({
    client,
    signer: keypair,
  });

  const zkLoginSignature = getZkLoginSignature({
    inputs: session.proofInputs,
    maxEpoch: session.maxEpoch,
    userSignature,
  });

  const result = await client.executeTransactionBlock({
    transactionBlock: bytes,
    signature: zkLoginSignature,
    options: {
      showEffects: true,
      showObjectChanges: true,
      showEvents: true,
    },
  });

  const digest = result.digest;
  if (!digest) {
    throw new Error("Transaction digest not found");
  }

  return {
    digest,
    ...(result as MintTransactionBlock),
  };
}

export function asMintSuiClient(client: SuiClient): MintSuiClient {
  return {
    waitForTransaction: (input) => client.waitForTransaction(input),
  };
}
