/** Map wallet / Sui mint errors to user-facing copy (Epic 1.5). */

export type MintErrorKind = "rejected" | "insufficient_gas" | "network" | "unknown";

export interface ParsedMintError {
  kind: MintErrorKind;
  message: string;
}

export function parseMintError(err: unknown): ParsedMintError {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err ?? "铸造失败");

  const lower = raw.toLowerCase();

  if (
    /user rejected|rejected the request|cancelled|canceled|declined/i.test(raw)
  ) {
    return {
      kind: "rejected",
      message: "你已取消签名，可稍后重试",
    };
  }

  if (
    /insufficient|not enough|gas|balance|coin/i.test(lower) &&
    /sui|gas|balance|fund/i.test(lower)
  ) {
    return {
      kind: "insufficient_gas",
      message: "SUI 余额不足，请领取测试币后重试（约需 0.03 SUI）",
    };
  }

  if (/network|timeout|fetch failed|econnrefused/i.test(lower)) {
    return {
      kind: "network",
      message: "网络异常，请检查连接后重试",
    };
  }

  if (/未找到|registration failed|mint/i.test(raw)) {
    return { kind: "unknown", message: raw };
  }

  return { kind: "unknown", message: raw || "铸造失败，请重试" };
}
