import { expect, test } from "@playwright/test";

const answer = "Built a dependable platform.";

test("missing static page returns the site's 404 through Wrangler", async ({
  request,
}) => {
  const response = await request.get("/missing-cv-review-page");
  expect(response.status()).toBe(404);
  expect(await response.text()).toContain("404");
});

test("Send retries failed initial config and sends only once", async ({
  page,
}) => {
  let configs = 0;
  let sends = 0;
  await page.route("**/api/cv-config", route => {
    configs += 1;
    return route.fulfill(
      configs === 1
        ? { status: 503, json: {} }
        : { json: { siteKey: "retry-key" } }
    );
  });
  await page.route("**/api/cv-chat", route => {
    sends += 1;
    return route.fulfill({ json: { answer, sources: [] } });
  });
  await page.goto("/cv");
  await expect(page.getByRole("status")).toContainText("could not load");
  await page
    .getByLabel("Ask about experience, projects, or research")
    .fill("Recover config");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".cv-message-assistant")).toHaveCount(1);
  expect(sends).toBe(1);
});

for (const recovery of ["Send", "navigation"] as const) {
  test(`failed Turnstile script recovers through ${recovery}`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.turnstile = undefined;
    });
    let loads = 0;
    let sends = 0;
    await page.route(
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
      route => {
        loads += 1;
        if (loads === 1) return route.abort();
        return route.fulfill({
          contentType: "application/javascript",
          body: `let callback; window.turnstile = {render: (container, options) => {callback = options.callback; return 'retry-widget';}, execute: () => callback('retry-token'), reset: () => {}};`,
        });
      }
    );
    await page.route("**/api/cv-chat", route => {
      sends += 1;
      return route.fulfill({ json: { answer, sources: [] } });
    });
    await page.goto("/cv");
    await expect(page.getByRole("status")).toContainText("could not load");
    if (recovery === "navigation") {
      await page
        .getByRole("navigation")
        .getByRole("link", { name: "About" })
        .click();
      await expect(page).toHaveURL(/\/about\/?$/);
      await page
        .getByRole("navigation")
        .getByRole("link", { name: "CV" })
        .click();
      await expect(page).toHaveURL(/\/cv\/?$/);
    }
    await page
      .getByLabel("Ask about experience, projects, or research")
      .fill("Recover verification");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.locator(".cv-message-assistant")).toHaveCount(1);
    expect(sends).toBe(1);
  });
}

test("a draft typed while awaiting an answer is preserved", async ({
  page,
}) => {
  let release: (() => void) | undefined;
  const waiting = new Promise<void>(resolve => {
    release = resolve;
  });
  await page.route("**/api/cv-chat", async route => {
    await waiting;
    await route.fulfill({ json: { answer, sources: [] } });
  });
  await page.goto("/cv");
  const input = page.getByLabel("Ask about experience, projects, or research");
  await input.fill("First question");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("status")).toContainText("Thinking");
  await input.fill("Next question draft");
  release?.();
  await expect(page.locator(".cv-message-assistant")).toBeVisible();
  await expect(input).toHaveValue("Next question draft");
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    let callback: ((token: string) => void) | undefined;
    window.turnstile = {
      render: (_container, options) => {
        callback = options.callback;
        return "test-widget";
      },
      execute: () => callback?.("fresh-browser-token"),
      reset: () => undefined,
    };
  });
  await page.route("**/api/cv-config", route =>
    route.fulfill({ json: { siteKey: "public-test-site-key" } })
  );
  await page.route("**/api/cv-chat", async route =>
    route.fulfill({
      json: {
        answer,
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
        ],
      },
    })
  );
});

test("CV page is discoverable, responsive, and available in both themes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cv");
  await expect(
    page.getByRole("heading", { name: "Ask about my work." })
  ).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "CV" })
  ).toBeVisible();
  await expect(page.locator("[data-cv-chat]")).toBeVisible();
  await expect(page.locator("[data-cv-chat] [data-cv-form]")).toBeVisible();
  await expect(page.locator("[data-cv-disclosure]")).toContainText(
    "AI-generated"
  );
  await expect(page.locator('a[href*="linkedin.com"]').first()).toBeAttached();
  await expect(page.locator("[data-cv-turnstile]")).not.toHaveClass(
    /\bhidden\b/
  );
  await expect(page.locator("[data-cv-turnstile]")).not.toHaveAttribute(
    "aria-hidden",
    "true"
  );
  await page.locator("#theme-btn").click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("[data-cv-input]")).toBeVisible();
  await page.locator("#theme-btn").click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "CV" })
  ).toBeVisible();
});

test("suggested questions ask about Othón and fill the same text into the draft", async ({
  page,
}) => {
  await page.goto("/cv");
  const input = page.getByLabel("Ask about experience, projects, or research");
  for (const question of [
    "What did Othón build at Teradata?",
    "What computer vision projects has Othón worked on?",
    "¿Qué ha hecho Othón con agentes de IA?",
  ]) {
    await page.getByRole("button", { name: question, exact: true }).click();
    await expect(input).toHaveValue(question);
  }
});

test("Enter submits a bilingual question and displays a clickable PDF citation", async ({
  page,
}) => {
  await page.goto("/cv");
  const input = page.getByLabel("Ask about experience, projects, or research");
  await input.fill("¿Qué construiste?");
  await input.press("Enter");
  await expect(
    page.getByText("¿Qué construiste?", { exact: true })
  ).toBeVisible();
  await expect(
    page.locator(".cv-message-assistant .cv-message-body")
  ).toContainText("Built a dependable platform.");
  const link = page
    .locator(".cv-message-assistant")
    .getByRole("link", { name: "resume.pdf" });
  await expect(link).toHaveAttribute(
    "href",
    "https://cv-agent.example/v1/documents/doc_123/original"
  );
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

test("source titles stay literal and title-only sources have no orphan separators", async ({
  page,
}) => {
  await page.route("**/api/cv-chat", route =>
    route.fulfill({
      json: {
        answer,
        sources: [
          {
            title: "**Research & <img src=x>**",
            documents: [
              {
                filename: "research.pdf",
                url: "https://cv-agent.example/v1/documents/doc_456/original",
              },
            ],
          },
          { title: "\\textit{Selected Work}", documents: [] },
        ],
      },
    })
  );
  await page.goto("/cv");
  await page
    .getByLabel("Ask about experience, projects, or research")
    .fill("Where can I read more?");
  await page.getByRole("button", { name: "Send" }).click();

  const assistant = page.locator(".cv-message-assistant");
  await expect(assistant.getByRole("link", { name: "research.pdf" })).toHaveAttribute(
    "href",
    "https://cv-agent.example/v1/documents/doc_456/original"
  );
  await expect(assistant).toContainText("**Research & <img src=x>**");
  await expect(assistant).toContainText("\\textit{Selected Work}");
  await expect(assistant.locator("img")).toHaveCount(0);
  await expect(assistant.locator(".cv-source-list")).not.toContainText(/,\s*(?:$|\\textit)/);
});

test("assistant response containing HTML is rendered literally", async ({
  page,
}) => {
  await page.route("**/api/cv-chat", route =>
    route.fulfill({
      json: { answer: "<img src=x onerror=alert(1)>", sources: [] },
    })
  );
  await page.goto("/cv");
  await page
    .getByLabel("Ask about experience, projects, or research")
    .fill("Tell me about your work");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".cv-message-assistant")).toContainText(
    "<img src=x onerror=alert(1)>"
  );
  await expect(page.locator(".cv-message-assistant img")).toHaveCount(0);
});

test("Turnstile rejection leaves the draft available to retry", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let fail: (() => void) | undefined;
    window.turnstile = {
      render: (_container, options) => {
        fail = options["error-callback"];
        (
          window as Window & { __rejectChallenge?: () => void }
        ).__rejectChallenge = () => fail?.();
        return "test-widget";
      },
      execute: () => undefined,
      reset: () => undefined,
    };
  });
  await page.goto("/cv");
  const input = page.getByLabel("Ask about experience, projects, or research");
  await input.fill("Keep this question");
  await page.getByRole("button", { name: "Send" }).click();
  await page.evaluate(() =>
    (
      window as Window & { __rejectChallenge?: () => void }
    ).__rejectChallenge?.()
  );
  await expect(page.getByRole("status")).toContainText(/couldn’t verify/i);
  await expect(input).toHaveValue("Keep this question");
});

test("rate limit, unavailable agent, and timeout show recoverable messages and keep drafts", async ({
  page,
}) => {
  let responseIndex = 0;
  const responses = [
    { status: 429, body: { error: "rate_limited" } },
    { status: 503, body: { error: "agent_unavailable" } },
    { status: 504, body: { error: "timeout" } },
  ];
  await page.route("**/api/cv-chat", route => {
    const response = responses[responseIndex++];
    return route.fulfill({ status: response.status, json: response.body });
  });
  await page.goto("/cv");
  const input = page.getByLabel("Ask about experience, projects, or research");
  for (const expected of [
    "There have been several questions recently.",
    "The CV assistant is temporarily unavailable.",
    "That’s taking longer than expected.",
  ]) {
    await input.fill("Retry this question");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("status")).toContainText(expected);
    await expect(input).toHaveValue("Retry this question");
  }
});

test("a question can be submitted after Astro navigates away and back", async ({
  page,
}) => {
  await page.goto("/cv");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "About" })
    .click();
  await expect(page).toHaveURL(/\/about\/?$/);
  await page.getByRole("navigation").getByRole("link", { name: "CV" }).click();
  await expect(page).toHaveURL(/\/cv\/?$/);
  await page
    .getByLabel("Ask about experience, projects, or research")
    .fill("After navigation");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".cv-message-user")).toContainText(
    "After navigation"
  );
  await expect(page.locator(".cv-message-assistant")).toContainText(
    "Built a dependable platform."
  );
});

test("local Worker serves public config and rejects chat without configured secrets", async ({
  request,
}) => {
  const config = await request.get("/api/cv-config");
  expect(config.status()).toBe(200);
  expect(await config.json()).toEqual({ siteKey: "local-test-site-key" });
  expect(config.headers()["cache-control"]).toBe("no-store");

  const chat = await request.post("/api/cv-chat", {
    data: {
      messages: [{ role: "user", content: "Hello" }],
      turnstileToken: "local-token",
    },
  });
  expect(chat.status()).toBe(503);
  expect(await chat.json()).toEqual({ error: "not_configured" });
  expect(chat.headers()["cache-control"]).toBe("no-store");
});
