/** App Sui network — must match wallet extension network for signing. */

export type AppSuiNetwork = "testnet" | "mainnet";

export const APP_SUI_NETWORK = (
  process.env.NEXT_PUBLIC_SUI_NETWORK === "mainnet" ? "mainnet" : "testnet"
) as AppSuiNetwork;

export function expectedSuiChain(network: AppSuiNetwork = APP_SUI_NETWORK): string {
  return `sui:${network}`;
}

export function isAccountOnAppNetwork(account: {
  chains: readonly string[];
}): boolean {
  const expected = expectedSuiChain();
  return account.chains.includes(expected);
}

export function networkMismatchHint(network: AppSuiNetwork = APP_SUI_NETWORK): string {
  const label = network === "testnet" ? "Testnet（测试网）" : "Mainnet（主网）";
  return `请在钱包扩展中切换到 ${label}，与本站一致后再签名登录`;
}
