import { ApiClientError, apiClient } from "@/lib/api/client";
import type {
  AuthConnectRequest,
  AuthConnectResponse,
  AuthMeResponse,
  AuthNonceResponse,
  AuthRefreshResponse,
} from "@/types/auth";
import { authUserFromConnect, authUserFromMe } from "@/types/auth";
import type { User } from "@/types";

export function authErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    const map: Record<string, string> = {
      AUTH_INVALID_SIGNATURE: "钱包签名无效，请重新连接",
      AUTH_INVALID_NONCE: "登录已过期，请重新Connect Wallet",
      AUTH_MISSING_PARAMS: "登录参数不完整",
      SERVICE_UNAVAILABLE: "认证服务暂不可用，请稍后重试",
    };
    return map[err.code ?? ""] ?? err.message;
  }
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : "登录失败";
  if (/Authorization page could not be loaded/i.test(msg)) {
    return "钱包扩展授权页加载失败，请更新 Slush/Sui Wallet 后重试，或使用 Google 登录";
  }
  if (/User rejected|rejected the request|Cancelled/i.test(msg)) {
    return "你已取消签名";
  }
  return msg || "登录失败";
}

export async function fetchAuthNonce(walletAddress: string) {
  const qs = `?wallet_address=${encodeURIComponent(walletAddress)}`;
  const res = await apiClient.get<AuthNonceResponse>(`/api/auth/nonce${qs}`);
  return res.data;
}

export async function connectAuth(
  body: AuthConnectRequest,
): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const res = await apiClient.post<AuthConnectResponse>("/api/auth/connect", body);
  return {
    user: authUserFromConnect(res.data.user),
    accessToken: res.data.access_token,
    refreshToken: res.data.refresh_token,
  };
}

export async function refreshAuthSession(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const res = await apiClient.post<AuthRefreshResponse>("/api/auth/refresh", {
    refresh_token: refreshToken,
  });
  return {
    accessToken: res.data.access_token,
    refreshToken: res.data.refresh_token,
  };
}

export async function fetchAuthMe(): Promise<User> {
  const res = await apiClient.get<AuthMeResponse>("/api/auth/me");
  return authUserFromMe(res.data);
}

export interface OnboardingSurveySubmit {
  trading_exp: "none" | "beginner" | "intermediate" | "advanced";
  style: ("trend" | "swing" | "scalp" | "value" | "grid")[];
  max_loss: 5 | 10 | 20 | 30;
  indicators: ("ma" | "rsi" | "macd" | "bollinger" | "volume" | "none")[];
  panda_autonomy: 1 | 2 | 3 | 4 | 5;
}

export interface OnboardingSurveyResult {
  experience_level: string;
  recommended_strategy_tags: string[];
  ui_complexity: string;
}

export async function submitOnboardingSurvey(
  jwt: string,
  body: OnboardingSurveySubmit,
): Promise<OnboardingSurveyResult> {
  const res = await fetch("/api/auth/onboarding-survey", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    success: boolean;
    data?: OnboardingSurveyResult;
    error?: { message: string };
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? "问卷提交失败");
  }
  return json.data;
}
