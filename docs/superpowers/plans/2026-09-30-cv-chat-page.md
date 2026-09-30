# CV Chat Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure, accessible `/cv` chat page that answers questions through the existing Render CV agent.

**Architecture:** Astro builds the static page and client controller. A same-origin Cloudflare Worker handles `/api/cv-config` and `/api/cv-chat`, validates each request and Turnstile token, rate-limits it, calls a fixed Render origin, and serves all other URLs from `env.ASSETS`. No credential or transcript is stored in the browser beyond page memory.

**Tech Stack:** Astro 7, TypeScript, Cloudflare Workers/Wrangler 4, Vitest for integration tests, Playwright for browser E2E.

**Spec:** `docs/superpowers/specs/2026-09-30-cv-chat-page-design.md`

## Global Constraints

- Keep Astro static and use the existing `Layout`, `Header`, `Breadcrumb`, `Main`, `Footer`, theme tokens, and centered `max-w-3xl` layout.
- Add one English `/cv` route; accept English and Spanish questions; no floating control, login, database, React, document downloads, or Render code changes.
- Keep the Render bearer key and Turnstile secret only in Cloudflare secrets `CV_AGENT_API_KEY` and `TURNSTILE_SECRET_KEY`; ordinary runtime variables are `CV_AGENT_URL` and `TURNSTILE_SITE_KEY`.
- Browser calls only same-origin `/api/cv-chat`; Worker calls fixed `POST /v1/responses` with a bounded `input` transcript and returns only answer text and source titles.
- Enforce `POST` JSON, same-origin, bounded request/answer sizes, server-side Turnstile verification, and approximate per-IP 10 requests/minute rate limiting. Chat/config responses use `Cache-Control: no-store`; no sensitive logging.
- Source markers `[[Source Title]]` become plain-text title chips; malformed markers remain text. Do not render untrusted HTML or link sources.
- Use `astro:page-load` without duplicate listeners; preserve drafts on failures; use Enter to submit and Shift+Enter for newline; include accessible status and focus states.
- Preserve the existing uncommitted social-link edits and include them as a separate commit. Remain on `feat/cv-chat-page`; do not merge, push, publish, create a Turnstile widget, or set production secrets without an explicit release decision.

## Review Focus

- Oversize/streamed request body: Worker rejects it before Turnstile or Render; Task 1 integration test `rejects_oversize_body_before_upstream`.
- Forged Origin or arbitrary upstream URL/instructions: Worker rejects or ignores it without forwarding attacker-controlled values; Task 1 integration test `rejects_cross_origin_and_fixed_upstream`.
- Reused/expired Turnstile token: Worker returns a stable challenge error and never calls Render; Task 1 integration test `rejects_failed_turnstile`.
- Malformed citations and HTML-looking answer text: UI displays literal text and only valid source titles; Task 2 unit test `formats_malformed_citations_as_text` and Task 3 E2E test `never_renders_answer_html`.
- Astro client-side navigation back to `/cv`: exactly one submit occurs per action; Task 3 E2E test `single_submit_after_navigation`.

---

### Task 1: Cloudflare API and integration tests

**Files:**
- Create: `src/worker/index.ts`, `src/worker/cv-chat.ts`, `src/worker/citations.ts`
- Modify: `wrangler.jsonc`, `package.json`, `pnpm-lock.yaml`
- Test: `tests/integration/cv-worker.test.ts`

**Interfaces:**
- Produces: `export default { fetch(request: Request, env: CvEnv): Promise<Response> }` from `src/worker/index.ts`; `CvEnv` has `ASSETS`, `CV_AGENT_URL`, `CV_AGENT_API_KEY`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and `CV_CHAT_RATE_LIMITER` (`limit({key}): Promise<{success:boolean}>`).
- Produces: `extractCitations(answer: string): { text: string; sources: string[] }` from `src/worker/citations.ts`.
- API: `GET /api/cv-config` returns `{siteKey:string}`; `POST /api/cv-chat` accepts `{messages:[{role:'user'|'assistant',content:string}], turnstileToken:string}` and returns `{answer:string,sources:string[]}` or `{error:'invalid_request'|'challenge_failed'|'rate_limited'|'agent_unavailable'|'timeout'|'not_configured'}`.
- Consumes: Render `POST /v1/responses` with bearer authorization and `{input:[{role,content}]}`; response has `output_text`.

- [ ] **Step 1: Write failing integration tests.** Cover valid proxy and citations; method/content-type/body shape; message/total/body bounds; same-origin; rate limit; Turnstile failure; Render 4xx/5xx/malformed/timeout; fixed upstream; no-store. Assert rejected requests never call Render and only the bearer is sent upstream.
- [ ] **Step 2: Run `pnpm exec vitest run tests/integration/cv-worker.test.ts`; confirm RED.** Add Vitest and a `test:integration` script as part of this task.
- [ ] **Step 3: Implement the minimal Worker.** Set concrete limits: 16 KiB request body, 8 messages, latest role `user`, 1–1000 characters per user question, 4000 characters total transcript, 16 KiB upstream body, 15-second upstream timeout, 10 requests per 60 seconds per client IP. Require origin matching request URL's origin; absent Origin is allowed for non-browser smoke tests. Validate `CV_AGENT_URL` as an HTTPS origin with no path/query/fragment and append `/v1/responses`. Use Cloudflare Turnstile `siteverify`; include remote IP. Return stable status codes: 400/405/415 for bad request, 403 challenge, 429 rate limit, 503 unavailable/not configured, 504 timeout. Serve all non-API paths from `env.ASSETS.fetch(request)`; unknown `/api/*` yields 404.
- [ ] **Step 4: Run the integration test, `pnpm exec astro check`, and `pnpm exec prettier --check` on touched files; confirm GREEN.**
- [ ] **Step 5: Commit only Task 1 files** with `feat: add guarded CV chat Worker API`.

### Task 2: Astro page and client interaction tests

**Files:**
- Create: `src/pages/cv.astro`, `src/scripts/cv-chat.ts`, `src/scripts/cv-chat-state.ts`
- Modify: `src/components/Header.astro`, `src/i18n/lang/en.ts`, `src/i18n/types.ts` (if required by actual type layout)
- Test: `tests/unit/cv-chat-state.test.ts`, `tests/integration/cv-page.test.ts`

**Interfaces:**
- Consumes: Task 1 `GET /api/cv-config`, `POST /api/cv-chat` payload and stable errors.
- Produces: `initCvChat(root: HTMLElement): void` in `src/scripts/cv-chat.ts`, invoked once per `astro:page-load` for the current page; pure `formatAnswer`/state helpers in `src/scripts/cv-chat-state.ts` for unit tests.
- DOM contract: `[data-cv-chat]`, `[data-cv-form]`, `[data-cv-input]`, `[data-cv-submit]`, `[data-cv-transcript]`, `[data-cv-status]`, `[data-cv-example]`, `[data-cv-turnstile]`.

- [ ] **Step 1: Write failing unit/integration tests.** Assert citation/plain-text formatting, empty/duplicate submit prevention, draft retention on failed send, success append, error mapping, and static `/cv` page output with nav/disclosure/contact. Use DOM-compatible tests without testing framework internals.
- [ ] **Step 2: Run `pnpm exec vitest run tests/unit/cv-chat-state.test.ts tests/integration/cv-page.test.ts`; confirm RED.** Add only the minimal DOM test dependency required.
- [ ] **Step 3: Implement the approved design.** Render semantic form, examples, intro, transcript, AI/privacy note and social/contact links; use theme tokens. Load Turnstile sitekey from config at runtime, obtain a fresh token per send, reset widget after each attempt. Keep only page-memory transcript, truncate outgoing history to Task 1 limits, use `textContent` for answers/sources, handle slow/error states, and guard duplicate initialization across `astro:page-load`.
- [ ] **Step 4: Run unit/integration tests, `pnpm exec astro check`, `pnpm run build`, lint, and format check; confirm GREEN.**
- [ ] **Step 5: Commit only Task 2 files** with `feat: add dedicated CV chat page`.

### Task 3: Browser E2E and local Worker smoke

**Files:**
- Create: `tests/e2e/cv-chat.spec.ts`, `playwright.config.ts`, `tests/e2e/fixtures/` as needed
- Modify: `package.json`, `pnpm-lock.yaml`, CI workflow under `.github/workflows/` if one exists

**Interfaces:**
- Consumes: Task 1/2 API and DOM contracts; Playwright starts the static Worker locally and intercepts only external Render/Turnstile traffic or uses a test-only local upstream binding (no production bypass).
- Produces: `pnpm run test:e2e` and documented local test setup.

- [ ] **Step 1: Write E2E tests** for page/nav/mobile and both themes, keyboard submit, bilingual question, valid citations, literal HTML, Turnstile rejection, rate limit, unavailable/timeout, draft retention, and one submit after Astro navigation. Mock external services deterministically; do not depend on live Render or a production Turnstile secret.
- [ ] **Step 2: Run `pnpm run test:e2e`; confirm RED** for the first unimplemented browser behavior or fixture.
- [ ] **Step 3: Add Playwright config/fixtures and make tests GREEN.** Use system Chromium locally when available, install Chromium in CI, and run the built static site through local Wrangler so the Worker route is exercised. If Wrangler mocking cannot safely intercept external Worker fetches, run a local fake origin via `CV_AGENT_URL` and isolate Turnstile verification through an injectable test-only dependency, never through a production env flag.
- [ ] **Step 4: Run `pnpm run test:e2e`, `pnpm run test:integration`, `pnpm run build`, lint, and format check; confirm GREEN.**
- [ ] **Step 5: Commit only Task 3 files** with `test: cover CV chat browser flow`.

### Task 4: Social edits, release documentation, and verification

**Files:**
- Modify: `astro-paper.config.ts`, `src/components/Socials.astro` (preserve existing user edits exactly unless a verified defect requires discussion)
- Create or modify: `docs/cv-chat-operations.md`

**Interfaces:**
- Consumes: Task 1–3 configuration and commands.
- Produces: non-secret setup instructions for `CV_AGENT_URL`, `TURNSTILE_SITE_KEY`, `CV_AGENT_API_KEY`, `TURNSTILE_SECRET_KEY`, rate-limit binding, Wrangler auth, local test commands, deploy/rollback, and post-deploy smoke checks.

- [ ] **Step 1: Verify the existing social-link diff and commit it separately** as `feat: add GitHub and LinkedIn social links`.
- [ ] **Step 2: Write operations documentation** without secret values or logs, including Turnstile widget creation as a human-controlled release step.
- [ ] **Step 3: Run all unit, integration, E2E, lint, format, and build checks; inspect `git diff main...HEAD` and `git status`; confirm GREEN.**
- [ ] **Step 4: Commit only documentation** with `docs: document CV chat deployment`.
- [ ] **Step 5: Request whole-branch code review.** Stop before pushing, merging, creating external resources, setting secrets, or publishing; present the reviewed branch and remaining production setup for a user release decision.
