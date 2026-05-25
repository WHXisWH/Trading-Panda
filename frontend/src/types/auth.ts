/** Auth API types — docs/api-specification.md §3.1 */

import type { SuccessResponse } from "./api";
import type { User } from "./index";

export type AuthMethod = "wallet" | "zklogin";

export interface AuthConnectRequestWallet {
  method: "wallet";
  wallet_address: string;
  signature: string;
  nonce: string;
  public_key?: string;
}

export interface AuthConnectRequestZkLogin {
  method: "zklogin";
  wallet_address: string;
  id_token: string;
  provider: "google" | "apple";
  salt?: string;
}

export interface AuthNonceData {
  nonce: string;
  message: string;
  expires_in: number;
}

export type AuthNonceResponse = SuccessResponse<AuthNonceData>;

export type AuthConnectRequest =
  | AuthConnectRequestWallet
  | AuthConnectRequestZkLogin;

export interface AuthConnectData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    wallet_address: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
  };
}

export type AuthConnectResponse = SuccessResponse<AuthConnectData>;

export interface AuthRefreshData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export type AuthRefreshResponse = SuccessResponse<AuthRefreshData>;

export interface AuthMeData {
  id: string;
  wallet_address: string;
  zk_login_subject: string | null;
  display_name: string | null;
  avatar_url: string | null;
  auth_method: AuthMethod;
  panda_count: number;
  onboarding_survey: User["onboardingSurvey"];
  experience_level: User["experienceLevel"];
  created_at: string;
  updated_at: string;
}

export type AuthMeResponse = SuccessResponse<AuthMeData>;

function mapOnboardingSurvey(
  raw: AuthMeData["onboarding_survey"],
): User["onboardingSurvey"] {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as unknown as Record<string, unknown>;
  if ("trading_exp" in s) {
    return {
      tradingExp: String(s.trading_exp),
      style: Array.isArray(s.style) ? (s.style as string[]) : [],
      maxLoss: Number(s.max_loss ?? 10),
      indicators: Array.isArray(s.indicators) ? (s.indicators as string[]) : [],
      pandaAutonomy: Number(s.panda_autonomy ?? 3),
    };
  }
  return raw as unknown as User["onboardingSurvey"];
}

export function authUserFromMe(data: AuthMeData): User {
  return {
    id: data.id,
    walletAddress: data.wallet_address,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    experienceLevel: data.experience_level,
    onboardingSurvey: mapOnboardingSurvey(data.onboarding_survey),
    createdAt: data.created_at,
  };
}

export function authUserFromConnect(data: AuthConnectData["user"]): User {
  return {
    id: data.id,
    walletAddress: data.wallet_address,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    experienceLevel: null,
    onboardingSurvey: null,
    createdAt: data.created_at,
  };
}
