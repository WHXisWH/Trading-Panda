/** Build Hub WebSocket URL with JWT query param */

export function buildWsUrl(baseUrl: string, token: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    throw new Error("NEXT_PUBLIC_WS_URL is not set");
  }
  const url = new URL(trimmed);
  url.searchParams.set("token", token);
  return url.toString();
}

export function getWsBaseUrl(): string {
  return process.env.NEXT_PUBLIC_WS_URL ?? "";
}
