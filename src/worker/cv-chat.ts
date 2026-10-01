import { extractCitations } from "./citations";

export interface CvMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CvEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
  CV_AGENT_URL?: string;
  CV_AGENT_API_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  CV_CHAT_RATE_LIMITER?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
}

const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_UPSTREAM_BYTES = 16 * 1024;
const MAX_MESSAGES = 8;
const MAX_TOTAL_CHARS = 4000;
const MAX_USER_CHARS = 1000;
const UPSTREAM_TIMEOUT_MS = 15_000;
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: JSON_HEADERS });
}

function validAgentUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const authority = value.match(/^https:\/\/([^/?#]*)/i)?.[1];
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      authority?.includes("@") ||
      url.pathname !== "/" ||
      value.includes("?") ||
      value.includes("#")
    )
      return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

function validDocumentPath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    /^\/v1\/documents\/[A-Za-z0-9][A-Za-z0-9._-]*\/original$/.test(path)
  );
}

function documentsForTitle(
  sourceDocuments: unknown,
  title: string,
  agentOrigin: string
): Array<{ filename: string; url: string }> {
  if (!Array.isArray(sourceDocuments)) return [];
  const source = sourceDocuments.find(
    entry =>
      entry &&
      typeof entry === "object" &&
      (entry as { title?: unknown }).title === title
  );
  if (!source || typeof source !== "object") return [];
  const documents = (source as { documents?: unknown }).documents;
  if (!Array.isArray(documents)) return [];
  return documents.flatMap(document => {
    if (!document || typeof document !== "object") return [];
    const { filename, path } = document as {
      filename?: unknown;
      path?: unknown;
    };
    if (typeof filename !== "string" || !filename || !validDocumentPath(path))
      return [];
    return [{ filename, url: `${agentOrigin}${path}` }];
  });
}

function validMessages(value: unknown): value is CvMessage[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_MESSAGES)
    return false;
  let total = 0;
  for (const message of value) {
    if (!message || typeof message !== "object") return false;
    const { role, content } = message as Record<string, unknown>;
    if (
      (role !== "user" && role !== "assistant") ||
      typeof content !== "string"
    )
      return false;
    if (
      role === "user" &&
      (content.trim().length < 1 || content.length > MAX_USER_CHARS)
    )
      return false;
    total += content.length;
    if (total > MAX_TOTAL_CHARS) return false;
  }
  return value.at(-1)?.role === "user";
}

async function readBounded(
  response: Response,
  maxBytes: number
): Promise<string | undefined> {
  if (response.body === null) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

async function readRequestBody(request: Request): Promise<string | undefined> {
  if (request.body === null) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

export async function handleCvChat(
  request: Request,
  env: CvEnv
): Promise<Response> {
  if (request.method !== "POST") return json({ error: "invalid_request" }, 405);
  if (
    request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase() !== "application/json"
  ) {
    return json({ error: "invalid_request" }, 415);
  }
  if (
    request.headers.has("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  ) {
    return json({ error: "invalid_request" }, 403);
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES)
    return json({ error: "invalid_request" }, 400);
  let raw: string | undefined;
  try {
    raw = await readRequestBody(request);
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  if (raw === undefined) return json({ error: "invalid_request" }, 400);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  if (!body || typeof body !== "object")
    return json({ error: "invalid_request" }, 400);
  const payload = body as Record<string, unknown>;
  if (
    !validMessages(payload.messages) ||
    typeof payload.turnstileToken !== "string" ||
    payload.turnstileToken.trim().length === 0
  ) {
    return json({ error: "invalid_request" }, 400);
  }
  const agentOrigin = validAgentUrl(env.CV_AGENT_URL);
  if (
    !agentOrigin ||
    !env.CV_AGENT_API_KEY ||
    !env.TURNSTILE_SECRET_KEY ||
    !env.CV_CHAT_RATE_LIMITER
  ) {
    return json({ error: "not_configured" }, 503);
  }
  const clientIp = request.headers.get("cf-connecting-ip") ?? "unknown";
  try {
    const limit = await env.CV_CHAT_RATE_LIMITER.limit({ key: clientIp });
    if (!limit.success) return json({ error: "rate_limited" }, 429);
  } catch {
    return json({ error: "not_configured" }, 503);
  }

  try {
    const form = new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: payload.turnstileToken,
    });
    if (clientIp !== "unknown") form.set("remoteip", clientIp);
    const verification = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      }
    );
    if (!verification.ok) return json({ error: "challenge_failed" }, 403);
    const result: unknown = await verification.json();
    if (
      !result ||
      typeof result !== "object" ||
      (result as { success?: unknown }).success !== true
    ) {
      return json({ error: "challenge_failed" }, 403);
    }
  } catch {
    return json({ error: "challenge_failed" }, 403);
  }

  try {
    const upstream = await fetch(`${agentOrigin}/v1/responses`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.CV_AGENT_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        input: payload.messages.map(({ role, content }) => ({ role, content })),
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!upstream.ok) return json({ error: "agent_unavailable" }, 503);
    const upstreamText = await readBounded(upstream, MAX_UPSTREAM_BYTES);
    if (upstreamText === undefined)
      return json({ error: "agent_unavailable" }, 503);
    const data: unknown = JSON.parse(upstreamText);
    const answer =
      data && typeof data === "object"
        ? (data as { output_text?: unknown }).output_text
        : undefined;
    if (typeof answer !== "string" || answer.length === 0)
      return json({ error: "agent_unavailable" }, 503);
    const citations = extractCitations(answer);
    const sourceDocuments = (data as { source_documents?: unknown })
      .source_documents;
    return json({
      answer: citations.text,
      sources: citations.sources.map(title => ({
        title,
        documents: documentsForTitle(sourceDocuments, title, agentOrigin),
      })),
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      return json({ error: "timeout" }, 504);
    }
    return json({ error: "agent_unavailable" }, 503);
  }
}
