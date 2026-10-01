import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type CvEnv } from "../../src/worker/index";

const origin = "https://blog.example";
const renderOrigin = "https://cv-agent.example";
const token = "turnstile-token";
const messages = [{ role: "user", content: "What have I worked on?" }];

function makeEnv(overrides: Partial<CvEnv> = {}): CvEnv {
  return {
    ASSETS: { fetch: vi.fn(async () => new Response("asset")) },
    CV_AGENT_URL: renderOrigin,
    CV_AGENT_API_KEY: "test-bearer",
    TURNSTILE_SITE_KEY: "public-site-key",
    TURNSTILE_SECRET_KEY: "test-secret",
    CV_CHAT_RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
    ...overrides,
  } as CvEnv;
}

function chatRequest(body: unknown, headers: HeadersInit = {}) {
  return new Request(`${origin}/api/cv-chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "cf-connecting-ip": "203.0.113.1",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function configureFetch(
  options: {
    turnstile?: Response | (() => Promise<Response>);
    render?: Response | (() => Promise<Response>);
  } = {}
) {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      const url = String(input);
      const configured = url.includes("siteverify")
        ? options.turnstile
        : options.render;
      if (typeof configured === "function") return configured();
      return configured ?? Response.json({ success: true });
    }
  );
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

async function successfulFetch(
  answer = "Built data systems [[Selected Work]]",
  responseFields: Record<string, unknown> = {}
) {
  const result = configureFetch({
    turnstile: Response.json({ success: true }),
    render: Response.json({ ...responseFields, output_text: answer }),
  });
  return result;
}

describe("CV chat Worker", () => {
  it("forwards only role and content from message objects", async () => {
    const { calls } = await successfulFetch();
    const response = await worker.fetch(
      chatRequest({
        messages: [
          {
            ...messages[0],
            instructions: { nested: "injected" },
            model: "untrusted",
          },
        ],
        turnstileToken: token,
      }),
      makeEnv()
    );
    expect(response.status).toBe(200);
    const upstream = calls.find(({ input }) =>
      String(input).includes("/v1/responses")
    )!;
    expect(JSON.parse(String(upstream.init?.body))).toEqual({
      input: [{ role: "user", content: "What have I worked on?" }],
    });
  });

  it("accepts an upstream response exactly at the byte limit", async () => {
    const body = JSON.stringify({ output_text: "Answer" });
    configureFetch({
      turnstile: Response.json({ success: true }),
      render: new Response(
        body + " ".repeat(16384 - new TextEncoder().encode(body).length)
      ),
    });
    const response = await worker.fetch(
      chatRequest({ messages, turnstileToken: token }),
      makeEnv()
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ answer: "Answer", sources: [] });
  });

  it("cancels an over-limit upstream stream and returns stable unavailable", async () => {
    let canceled = false;
    let pulls = 0;
    const chunk = new TextEncoder().encode("é".repeat(4096));
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(chunk);
      },
      cancel() {
        canceled = true;
      },
    });
    configureFetch({
      turnstile: Response.json({ success: true }),
      render: new Response(stream),
    });
    const response = await worker.fetch(
      chatRequest({ messages, turnstileToken: token }),
      makeEnv()
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "agent_unavailable" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(canceled).toBe(true);
    expect(pulls).toBeLessThanOrEqual(4);
  });
  beforeEach(() => vi.stubGlobal("AbortSignal", AbortSignal));
  afterEach(() => vi.unstubAllGlobals());

  it("proxies a validated transcript and returns safe documents for cited titles", async () => {
    const { calls } = await successfulFetch(
      "Built data systems\nSources: [[Selected Work]], [[Education]]",
      {
        source_documents: [
          {
            title: "Selected Work",
            documents: [
              { filename: "resume.pdf", path: "/v1/documents/doc_123/original" },
            ],
          },
          {
            title: "Education",
            documents: [
              { filename: "degree.pdf", path: "/v1/documents/doc-456/original" },
            ],
          },
        ],
      }
    );
    const response = await worker.fetch(
      chatRequest({ messages, turnstileToken: token }),
      makeEnv()
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      answer: "Built data systems",
      sources: [
        {
          title: "Selected Work",
          documents: [
            {
              filename: "resume.pdf",
              url: "https://cv-agent.example/v1/documents/doc_123/original",
            },
          ],
        },
        {
          title: "Education",
          documents: [
            {
              filename: "degree.pdf",
              url: "https://cv-agent.example/v1/documents/doc-456/original",
            },
          ],
        },
      ],
    });
    const renderCall = calls.find(({ input }) =>
      String(input).includes("/v1/responses")
    )!;
    expect(renderCall.input).toBe(`${renderOrigin}/v1/responses`);
    expect(renderCall.init?.method).toBe("POST");
    expect(new Headers(renderCall.init?.headers).get("authorization")).toBe(
      "Bearer test-bearer"
    );
    expect([...new Headers(renderCall.init?.headers).keys()]).toEqual([
      "authorization",
      "content-type",
    ]);
    expect(JSON.parse(String(renderCall.init?.body))).toEqual({
      input: messages,
    });
  });

  it("returns a safe dotted document ID as a public PDF link", async () => {
    await successfulFetch("Answer.\nSources: [[Profile]]", {
      source_documents: [{
        title: "Profile",
        documents: [{ filename: "CV.pdf", path: "/v1/documents/profile.v2/original" }],
      }],
    });
    const response = await worker.fetch(
      chatRequest({ messages, turnstileToken: token }), makeEnv()
    );
    expect(await response.json()).toEqual({
      answer: "Answer.",
      sources: [{
        title: "Profile",
        documents: [{ filename: "CV.pdf", url: "https://cv-agent.example/v1/documents/profile.v2/original" }],
      }],
    });
  });

  it("keeps cited titles when document metadata is absent or does not match", async () => {
    const { calls } = await successfulFetch(
      "Answer [[Known]] and [[Unknown]]",
      {
        source_documents: [
          {
            title: "Known",
            documents: [{ filename: "known.pdf", path: "/v1/documents/id1/original" }],
          },
        ],
      }
    );
    const response = await worker.fetch(
      chatRequest({ messages, turnstileToken: token }),
      makeEnv()
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      answer: "Answer and",
      sources: [
        { title: "Known", documents: [{ filename: "known.pdf", url: "https://cv-agent.example/v1/documents/id1/original" }] },
        { title: "Unknown", documents: [] },
      ],
    });
    expect(calls.some(({ input }) => String(input).includes("/v1/responses"))).toBe(true);
  });

  it.each([
    ["relative path outside the document route", "/other/id/original"],
    ["traversal path", "/v1/documents/../secret/original"],
    ["dot segment", "/v1/documents/./original"],
    ["parent segment", "/v1/documents/../original"],
    ["leading dot", "/v1/documents/.hidden/original"],
    ["leading underscore", "/v1/documents/_hidden/original"],
    ["encoded traversal path", "/v1/documents/%2e%2e/original"],
    ["absolute URL", "https://attacker.example/v1/documents/id/original"],
    ["query string", "/v1/documents/id/original?download=1"],
  ])("does not create PDF links for a %s", async (_label, path) => {
    await successfulFetch("Answer [[Selected Work]]", {
      source_documents: [
        {
          title: "Selected Work",
          documents: [{ filename: "resume.pdf", path }],
        },
      ],
    });
    const response = await worker.fetch(
      chatRequest({ messages, turnstileToken: token }),
      makeEnv()
    );
    expect(await response.json()).toEqual({
      answer: "Answer",
      sources: [{ title: "Selected Work", documents: [] }],
    });
  });

  it("returns title-only sources when document metadata is missing", async () => {
    await successfulFetch("Answer [[Selected Work]]");
    const response = await worker.fetch(
      chatRequest({ messages, turnstileToken: token }),
      makeEnv()
    );
    expect(await response.json()).toEqual({
      answer: "Answer",
      sources: [{ title: "Selected Work", documents: [] }],
    });
  });

  it("returns the public sitekey without caching it", async () => {
    const response = await worker.fetch(
      new Request(`${origin}/api/cv-config`),
      makeEnv()
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ siteKey: "public-site-key" });
  });

  it("rejects unsupported methods and content types before Render", async () => {
    const { calls } = configureFetch();
    const env = makeEnv();
    const get = await worker.fetch(new Request(`${origin}/api/cv-chat`), env);
    const form = await worker.fetch(
      new Request(`${origin}/api/cv-chat`, {
        method: "POST",
        headers: { origin, "content-type": "text/plain" },
        body: "x",
      }),
      env
    );
    expect(get.status).toBe(405);
    expect(form.status).toBe(415);
    expect(
      calls.some(({ input }) => String(input).includes("/v1/responses"))
    ).toBe(false);
  });

  it.each([
    ["missing messages", { turnstileToken: token }],
    [
      "empty question",
      { messages: [{ role: "user", content: "" }], turnstileToken: token },
    ],
    [
      "oversize question",
      {
        messages: [{ role: "user", content: "x".repeat(1001) }],
        turnstileToken: token,
      },
    ],
    [
      "latest role is assistant",
      {
        messages: [
          { role: "user", content: "Q" },
          { role: "assistant", content: "A" },
        ],
        turnstileToken: token,
      },
    ],
    [
      "too many messages",
      {
        messages: Array.from({ length: 9 }, () => ({
          role: "user",
          content: "Q",
        })),
        turnstileToken: token,
      },
    ],
    [
      "transcript too long",
      {
        messages: [
          { role: "assistant", content: "x".repeat(4000) },
          { role: "user", content: "Q" },
        ],
        turnstileToken: token,
      },
    ],
  ])("rejects %s before calling Render", async (_label, body) => {
    const { calls } = configureFetch();
    const response = await worker.fetch(chatRequest(body), makeEnv());
    expect(response.status).toBe(400);
    expect(
      calls.some(({ input }) => String(input).includes("/v1/responses"))
    ).toBe(false);
  });

  it("rejects an oversized request body before Turnstile or Render", async () => {
    const { calls } = configureFetch();
    const response = await worker.fetch(
      chatRequest({ messages, turnstileToken: token + "x".repeat(17 * 1024) }),
      makeEnv()
    );
    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("cancels reading a streamed body as soon as it exceeds the request bound", async () => {
    const { calls } = configureFetch();
    let canceled = false;
    let pulls = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new Uint8Array(8 * 1024));
      },
      cancel() {
        canceled = true;
      },
    });
    const request = new Request(`${origin}/api/cv-chat`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: stream,
      // @ts-expect-error Node's RequestInit requires this for streaming request bodies.
      duplex: "half",
    });
    const response = await worker.fetch(request, makeEnv());
    expect(response.status).toBe(400);
    expect(canceled).toBe(true);
    expect(pulls).toBeLessThan(4);
    expect(calls).toHaveLength(0);
  });

  it("rejects cross-origin requests before calling Render", async () => {
    const { calls } = configureFetch();
    const response = await worker.fetch(
      chatRequest(
        { messages, turnstileToken: token },
        { origin: "https://attacker.example" }
      ),
      makeEnv()
    );
    expect(response.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it("allows a non-browser request without Origin", async () => {
    const { calls } = configureFetch({
      turnstile: Response.json({ success: true }),
      render: Response.json({ output_text: "Answer" }),
    });
    const request = new Request(`${origin}/api/cv-chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages, turnstileToken: token }),
    });
    const response = await worker.fetch(request, makeEnv());
    expect(response.status).toBe(200);
    expect(
      calls.some(({ input }) => String(input).includes("/v1/responses"))
    ).toBe(true);
  });

  it("rejects failed Turnstile validation and sends the client IP to siteverify", async () => {
    const { calls } = configureFetch({
      turnstile: Response.json({ success: false }),
    });
    const response = await worker.fetch(
      chatRequest({ messages, turnstileToken: token }),
      makeEnv()
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "challenge_failed" });
    expect(calls).toHaveLength(1);
    const verification = calls[0];
    expect(verification.input).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    );
    const form = new URLSearchParams(String(verification.init?.body));
    expect(form.get("secret")).toBe("test-secret");
    expect(form.get("response")).toBe(token);
    expect(form.get("remoteip")).toBe("203.0.113.1");
  });

  it("rate limits by client IP before challenge and Render", async () => {
    const { calls } = configureFetch();
    const limiter = { limit: vi.fn(async () => ({ success: false })) };
    const response = await worker.fetch(
      chatRequest({ messages, turnstileToken: token }),
      makeEnv({ CV_CHAT_RATE_LIMITER: limiter })
    );
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "rate_limited" });
    expect(limiter.limit).toHaveBeenCalledWith({ key: "203.0.113.1" });
    expect(calls).toHaveLength(0);
  });

  it.each([
    ["4xx", new Response("private upstream detail", { status: 400 })],
    ["5xx", new Response("private upstream detail", { status: 503 })],
    ["malformed JSON", new Response("{", { status: 200 })],
    ["missing output_text", Response.json({ output: [] })],
  ])(
    "maps Render %s to a stable unavailable response",
    async (_label, render) => {
      const { calls } = configureFetch({
        turnstile: Response.json({ success: true }),
        render,
      });
      const response = await worker.fetch(
        chatRequest({ messages, turnstileToken: token }),
        makeEnv()
      );
      expect(response.status).toBe(503);
      const responseBody = await response.text();
      expect(JSON.parse(responseBody)).toEqual({ error: "agent_unavailable" });
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(responseBody).not.toContain("private upstream detail");
      expect(
        calls.some(({ input }) => String(input).includes("/v1/responses"))
      ).toBe(true);
    }
  );

  it("maps an upstream timeout to 504", async () => {
    const { calls } = configureFetch({
      turnstile: Response.json({ success: true }),
      render: async () => {
        throw new DOMException("aborted", "AbortError");
      },
    });
    const response = await worker.fetch(
      chatRequest({ messages, turnstileToken: token }),
      makeEnv()
    );
    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ error: "timeout" });
    expect(
      calls.some(({ input }) => String(input).includes("/v1/responses"))
    ).toBe(true);
  });

  it("uses the configured Render origin and never forwards browser control fields", async () => {
    const { calls } = configureFetch({
      turnstile: Response.json({ success: true }),
      render: Response.json({ output_text: "Answer" }),
    });
    const env = makeEnv({ CV_AGENT_URL: "https://allowed.example" });
    const response = await worker.fetch(
      chatRequest({
        messages,
        turnstileToken: token,
        model: "attacker-model",
        instructions: "attacker instructions",
        url: "https://attacker.example",
      }),
      env
    );
    expect(response.status).toBe(200);
    const renderCall = calls.find(({ input }) =>
      String(input).includes("/v1/responses")
    )!;
    expect(renderCall.input).toBe("https://allowed.example/v1/responses");
    expect(JSON.parse(String(renderCall.init?.body))).toEqual({
      input: messages,
    });
  });

  it("rejects a Render URL containing a path or insecure scheme", async () => {
    for (const url of [
      "https://allowed.example/path",
      "https://allowed.example?",
      "https://allowed.example#",
      "https://@allowed.example",
      "http://allowed.example",
    ]) {
      const { calls } = configureFetch();
      const response = await worker.fetch(
        chatRequest({ messages, turnstileToken: token }),
        makeEnv({ CV_AGENT_URL: url })
      );
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "not_configured" });
      expect(calls).toHaveLength(0);
    }
  });

  it("returns 404 for unknown API routes and serves static assets for non-API paths", async () => {
    const env = makeEnv();
    const api = await worker.fetch(new Request(`${origin}/api/nope`), env);
    const page = await worker.fetch(new Request(`${origin}/cv`), env);
    expect(api.status).toBe(404);
    expect(await page.text()).toBe("asset");
    expect(env.ASSETS.fetch).toHaveBeenCalledTimes(1);
  });
});
