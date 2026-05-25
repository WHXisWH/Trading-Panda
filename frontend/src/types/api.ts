/** Wire-format API envelopes — aligned with docs/api-specification.md §6–§7 */

export type ApiErrorCode =
  // Generic
  | "INTERNAL_ERROR"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMIT_EXCEEDED"
  | "SERVICE_UNAVAILABLE"
  // Auth
  | "AUTH_UNAUTHORIZED"
  | "AUTH_TOKEN_EXPIRED"
  | "AUTH_INVALID_SIGNATURE"
  | "AUTH_INVALID_NONCE"
  | "AUTH_INVALID_ID_TOKEN"
  | "AUTH_PROVIDER_NOT_SUPPORTED"
  | "AUTH_MISSING_PARAMS"
  | "AUTH_REFRESH_EXPIRED"
  | "AUTH_REFRESH_INVALID"
  | "AUTH_REFRESH_REVOKED"
  | "AUTH_USER_NOT_FOUND"
  | "SURVEY_ALREADY_SUBMITTED"
  | "SURVEY_INVALID_FIELD"
  // Panda
  | "PANDA_NOT_FOUND"
  | "PANDA_NOT_OWNER"
  | "PANDA_MINT_DISABLED"
  | "PANDA_MAX_SUPPLY"
  | "PANDA_MINT_RATE_LIMIT"
  | "PANDA_TX_FAILED"
  | "PANDA_NAME_INVALID"
  | "PANDA_NAME_PROFANITY"
  | "PANDA_IS_TRADING"
  // Strategy
  | "STRATEGY_TEXT_TOO_SHORT"
  | "STRATEGY_TEXT_TOO_LONG"
  | "STRATEGY_BODY_EMPTY"
  | "STRATEGY_NO_VALID_RULES"
  | "STRATEGY_RULE_INVALID"
  | "STRATEGY_PARSE_FAILED"
  | "STRATEGY_RATE_LIMIT";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorBody {
  code: ApiErrorCode | string;
  message: string;
  details?: unknown;
  invalid_rules?: Array<{
    index: number;
    reason: string;
    indicator?: string;
  }>;
}

export interface ErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export type ApiResult<T> = SuccessResponse<T> | ErrorResponse;

export function isApiError(res: ApiResult<unknown>): res is ErrorResponse {
  return res.success === false;
}
