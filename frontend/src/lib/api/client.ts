// API client — fetch to Next.js BFF (/api/*) with JWT injection

import type { ApiResult, ErrorResponse } from "@/types/api";
import { isApiError } from "@/types/api";

const getAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("trading-panda-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      state?: { accessToken?: string; jwt?: string };
    };
    return parsed.state?.accessToken ?? parsed.state?.jwt ?? null;
  } catch {
    return null;
  }
};

export class ApiClientError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T extends ApiResult<unknown>>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = (await res.json().catch(() => null)) as T | ErrorResponse | null;

  if (!res.ok) {
    if (data && isApiError(data as ApiResult<unknown>)) {
      const err = data as ErrorResponse;
      throw new ApiClientError(err.error.message, res.status, err.error.code);
    }
    throw new ApiClientError(
      (data as { message?: string })?.message ?? res.statusText,
      res.status,
    );
  }

  if (data === null) {
    throw new ApiClientError("Empty response", res.status);
  }

  return data as T;
}

export const apiClient = {
  get: <T extends ApiResult<unknown>>(path: string) => request<T>(path),
  post: <T extends ApiResult<unknown>>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T extends ApiResult<unknown>>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T extends ApiResult<unknown>>(path: string) =>
    request<T>(path, { method: "DELETE" }),
};
