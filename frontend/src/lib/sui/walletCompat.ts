/** Wallet feature checks for personal-message login. */

export function walletSupportsPersonalMessageLogin(features: {
  "sui:signPersonalMessage"?: unknown;
  "sui:signMessage"?: unknown;
}): boolean {
  return Boolean(features["sui:signPersonalMessage"] || features["sui:signMessage"]);
}
