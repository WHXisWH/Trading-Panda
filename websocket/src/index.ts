import { extractToken, verifyJwt } from "./jwt.js";
import type { Env } from "./types.js";
import { WS_CLOSE } from "./types.js";
import { UserHub } from "./user-hub.js";

export { UserHub };

function closeResponse(code: number, reason: string): Response {
  return new Response(reason, {
    status: 401,
    headers: {
      "X-WebSocket-Close-Code": String(code),
      "X-WebSocket-Close-Reason": reason,
    },
  });
}

async function handleHealth(): Promise<Response> {
  return Response.json({
    status: "ok",
    service: "trading-panda-websocket-hub",
    timestamp: new Date().toISOString(),
  });
}

async function handleWebSocket(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!env.JWT_SECRET) {
    return new Response("JWT_SECRET not configured", { status: 500 });
  }

  const token = extractToken(request);
  if (!token) {
    return closeResponse(WS_CLOSE.INVALID_TOKEN, "Missing token");
  }

  const verified = await verifyJwt(token, env.JWT_SECRET);
  if (!verified.ok) {
    const reason =
      verified.code === WS_CLOSE.TOKEN_EXPIRED ? "Token expired" : "Invalid token";
    return closeResponse(verified.code, reason);
  }

  const id = env.USER_HUB.idFromName(`user:${verified.userId}`);
  const stub = env.USER_HUB.get(id);
  const headers = new Headers(request.headers);
  headers.set("X-User-Id", verified.userId);

  return stub.fetch(
    new Request(request.url, {
      method: request.method,
      headers,
    }),
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return handleHealth();
    }

    if (url.pathname === "/ws" || url.pathname === "/") {
      const upgrade = request.headers.get("Upgrade");
      if (upgrade?.toLowerCase() === "websocket") {
        return handleWebSocket(request, env);
      }
      if (url.pathname === "/") {
        return Response.json({
          service: "trading-panda-websocket-hub",
          ws_path: "/ws",
          health: "/health",
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
