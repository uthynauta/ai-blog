# Task 3 report: Browser E2E and local Worker smoke

## Result

Added a Playwright suite and `test:e2e` command. Playwright builds the static
site and serves it through local Wrangler on `127.0.0.1:8788`; the suite uses
system `/usr/bin/chromium` when available and falls back to Playwright's
installed Chromium. CI installs Chromium and allows 15 minutes for standards,
build, and browser checks. Local setup is documented in the root README.

The browser suite mocks `/api/cv-config`, `/api/cv-chat`, and Turnstile at the
browser boundary so it needs no external Render endpoint or production secret.
A separate Playwright request test reaches the actual local Wrangler Worker:
`GET /api/cv-config` returned HTTP 200 with the local public site key and
`Cache-Control: no-store`; a well-formed `POST /api/cv-chat` returned HTTP 503
with `{ "error": "not_configured" }` and `Cache-Control: no-store`. That
request had no configured secrets and did not reach either upstream service.
Task 1's integration suite remains responsible for full Worker behavior.

## RED / GREEN record

The first `corepack pnpm@11.3.0 run test:e2e` stopped before Playwright because
pnpm reported ignored lifecycle scripts for `esbuild`, `sharp`, and `workerd`
during its install guard. `corepack pnpm@11.3.0 install --ignore-scripts`
completed, after which the browser suite ran. The initial browser run reported
4 failed and 3 passed: the failures were incorrect test assumptions in my new
spec (theme button accessible name, exact answer locator, Turnstile rejection
fixture, and status matching). They did not demonstrate missing app behavior.
The next run narrowed this to two incorrect expected message strings. I fixed
the test expectations and rejection callback; the final run was GREEN:

```text
corepack pnpm@11.3.0 run test:e2e
7 passed (20.1s)
```

There was no unimplemented app behavior to fix in Task 3; the requested frontend
and Worker behavior was already present from Tasks 1 and 2. The RED cycle caught
errors in the new browser assertions and fixture, which were corrected before
the final run.

## Browser cases

- CV route and navigation at mobile and desktop widths; light and dark themes.
- Spanish question submitted with Enter; answer and source title displayed, with
  the source remaining plain text.
- HTML-like answer text rendered literally without creating an image element.
- Turnstile rejection shows a recoverable status and retains the draft.
- Rate limit, unavailable agent, and timeout each show their user-facing status
  and retain the draft.
- Astro client navigation away from `/cv` and back still permits a submission.
- Real local Worker public config and safe unconfigured chat response, as above.

## Verification

- `corepack pnpm@11.3.0 install --frozen-lockfile` — passed.
- `corepack pnpm@11.3.0 run test:e2e` — passed, 7 browser tests.
- `corepack pnpm@11.3.0 run test:integration` — passed, 27 tests. One earlier
  concurrent run failed to start its dev server while `build` ran in parallel;
  the standalone rerun passed.
- `corepack pnpm@11.3.0 run build` — passed, Astro check reported 0 errors,
  warnings, or hints.
- `corepack pnpm@11.3.0 run lint` — passed after excluding generated Wrangler
  and Playwright result directories.
- `corepack pnpm@11.3.0 run format:check` — failed on four untouched existing
  files: `src/content/posts/es/el-tigre-y-la-jaula.md`,
  `src/content/posts/the-tiger-and-the-cage.md`, `src/layouts/Layout.astro`, and
  `src/pages/posts/[...slug]/index.astro`. All Task 3 files passed a targeted
  Prettier check. Those unrelated files were left unchanged.

## Self-review and concerns

- No production test bypass, test-only Worker environment flag, live Render
  request, or production Turnstile secret was added or used.
- The browser mocks do not claim to exercise Worker proxy behavior. The local
  Worker smoke checks its real config route and pre-upstream no-secret failure;
  detailed proxy behavior is covered by Task 1 integration tests.
- `astro-paper.config.ts` and `src/components/Socials.astro` were preserved and
  excluded from staging.
- Concern: the repository-wide format check remains red for the four pre-existing
  files listed above.
