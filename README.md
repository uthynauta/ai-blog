# Uthynauta AI Blog

Personal Astro site for essays and notes about AI systems, LLMs, inference,
observability, agents, and software engineering.

## Stack

- Astro
- TypeScript
- Tailwind CSS
- Astro content collections
- Pagefind search
- RSS and sitemap generation
- Dynamic Open Graph images

## Commands

```bash
npm install
npm run lint
npx astro check
npm run build
```

For local development in this workspace, use:

```bash
astro dev --background
```

Manage it with:

```bash
astro dev status
astro dev logs
astro dev stop
```

## Browser tests

Run the CV chat browser suite with the repository's pinned pnpm version:

```bash
corepack pnpm@11.3.0 install --frozen-lockfile
corepack pnpm@11.3.0 exec playwright install chromium
corepack pnpm@11.3.0 run test:e2e
```

The suite builds the static site and serves it through local Wrangler. It uses
the system `/usr/bin/chromium` when available, otherwise Playwright's installed
Chromium. Browser tests mock the same-origin chat/config responses and Turnstile
at the browser boundary; a separate test exercises the real local Worker config
and its no-secret failure response. No Render credentials or production
Turnstile secret are needed.

## Content

Posts live in `src/content/posts/`.

Production URL: `https://uthynauta.dev`.
