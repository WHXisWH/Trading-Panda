// API client — thin wrapper around fetch with JWT injection
// All calls go to Next.js API routes (/api/*), which proxy to the Python backend.

const getJwt = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("trading-panda-auth");
    return raw ? JSON.parse(raw).state?.jwt : null;
  } catch {
    return null;
  }
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const jwt = getJwt();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? "Request failed");
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
