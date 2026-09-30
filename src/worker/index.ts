import { handleCvChat, type CvEnv } from "./cv-chat";

export type { CvEnv } from "./cv-chat";

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export default {
  async fetch(request: Request, env: CvEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/cv-config") {
      if (request.method !== "GET")
        return json({ error: "invalid_request" }, 405);
      if (
        request.headers.has("origin") &&
        request.headers.get("origin") !== url.origin
      ) {
        return json({ error: "invalid_request" }, 403);
      }
      return json({ siteKey: env.TURNSTILE_SITE_KEY ?? "" });
    }
    if (url.pathname === "/api/cv-chat") return handleCvChat(request, env);
    if (url.pathname.startsWith("/api/"))
      return json({ error: "invalid_request" }, 404);
    return env.ASSETS.fetch(request);
  },
};
