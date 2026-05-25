/**
 * BFF → Python backend proxy template.
 * Server routes call `proxyBackend` to forward JWT and optional internal key.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function getBackendBaseUrl(): string {
  return (
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    "http://localhost:8000"
  ).replace(/\/$/, "");
}

export type ProxyBackendOptions = {
  method?: string;
  body?: unknown;
  /** Backend path without leading slash, e.g. `auth/connect` or `pandas/abc` */
  backendPath: string;
  /** Forward Authorization from incoming request (default true) */
  forwardAuth?: boolean;
  /** Attach X-Internal-Key for Decision Engine internal routes */
  useInternalKey?: boolean;
  /** Extra headers merged after defaults */
  headers?: Record<string, string>;
};

function buildHeaders(
  req: NextRequest,
  opts: ProxyBackendOptions,
  hasJsonBody: boolean,
): Record<string, string> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (hasJsonBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (opts.forwardAuth !== false) {
    const auth = req.headers.get("authorization");
    if (auth) headers["Authorization"] = auth;
  }
  if (opts.useInternalKey) {
    const secret = process.env.INTERNAL_SECRET;
    if (secret) headers["X-Internal-Key"] = secret;
  }
  return headers;
}

/** Low-level fetch to backend; returns raw Response. */
export async function fetchBackend(
  req: NextRequest,
  opts: ProxyBackendOptions,
): Promise<Response> {
  const base = getBackendBaseUrl();
  const path = opts.backendPath.replace(/^\//, "");
  const method = opts.method ?? req.method;
  const hasBody = opts.body !== undefined && method !== "GET" && method !== "HEAD";
  const headers = buildHeaders(req, opts, hasBody);

  return fetch(`${base}/${path}`, {
    method,
    headers,
    body: hasBody ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
}

/** Proxy and return JSON NextResponse (passes through backend status + body). */
export async function proxyBackend(
  req: NextRequest,
  opts: ProxyBackendOptions,
): Promise<NextResponse> {
  const res = await fetchBackend(req, opts);
  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  return NextResponse.json(data, { status: res.status });
}
