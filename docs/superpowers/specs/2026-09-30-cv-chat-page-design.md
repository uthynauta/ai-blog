# Dedicated CV chat page

## Intent and success

Visitors to uthynauta.dev should be able to ask grounded questions about Othón González's CV from a dedicated `/cv` page. The page should feel native to the existing AstroPaper blog, work on mobile and in both site themes, and accept questions in English or Spanish. It must not expose the Render agent's bearer key or the underlying private source documents.

Success means a visitor can find `/cv` from the main navigation, submit a question, read a useful answer with source titles, ask a follow-up, and understand loading or failure states. The existing blog pages must remain unchanged apart from the navigation link. The already-present local GitHub/LinkedIn social-link edits are part of the eventual site update, as separate changes.

## Scope

Build one English-language `/cv` page, a small client-side chat controller, and a same-origin Cloudflare Worker API route. Keep Astro's static build and current Tailwind/theme system. No floating chat control, React dependency, login, database, persistent conversation history, public document download, or Render agent code change is needed for the first release.

The page gives a brief professional introduction, a clear note that answers are AI-generated from CV material, example questions, and a link to the existing social/contact destinations. The chat accepts questions in either language and lets the agent respond in the language used by the visitor; there is no separate locale route or language switch in v1.

## Frontend design

`src/pages/cv.astro` uses the existing `Layout`, `Header`, `Breadcrumb`, `Main`, and `Footer` components and metadata conventions. Add a `CV` item to the existing navigation and English UI strings. Within the existing centered `max-w-3xl` layout, show an editorial introduction above a visually distinct conversation panel. Reuse `background`, `foreground`, `accent`, `muted`, and `border` theme tokens so light and dark modes remain consistent. Do not apply `app-prose` to interactive controls.

The panel contains example-question buttons, a transcript, a labelled textarea, a send button, and a small privacy/AI disclosure. Use native form behavior with Enter to send and Shift+Enter for a newline. Prevent empty or duplicate submissions; preserve the draft when a request fails. Announce progress and errors with a restrained `aria-live` region, keep visible focus styles and keyboard access, and respect reduced-motion preferences. Initialize client listeners on Astro's `astro:page-load` lifecycle without duplicating them after navigation.

Display answer text as text, not untrusted HTML. The Worker extracts `[[Source Title]]` citations into a source-title list adjacent to the answer; do not turn them into links until a reviewed public source URL exists. Unknown or malformed citation markup remains plain text. Keep the conversation in page memory only; reloading the page clears it.

## Data flow and Cloudflare configuration

The browser calls only same-origin `/api/cv-chat`. A Worker entry point added to `wrangler.jsonc` handles this route and serves all other requests through the existing static-assets binding. The Worker sends a bounded transcript to Render's existing `POST /v1/responses` endpoint using its bearer key. The latest user message and a small number of preceding turns are sent; the browser cannot set the upstream URL, authorization header, model, or arbitrary agent instructions. The Worker returns only the answer and source titles needed by the UI, not the upstream response object.

Cloudflare runtime configuration contains `CV_AGENT_URL` (ordinary variable), `CV_AGENT_API_KEY` (Secret), `TURNSTILE_SITE_KEY` (public variable), and `TURNSTILE_SECRET_KEY` (Secret). `GET /api/cv-config` serves the public sitekey to the page so it can be changed in Cloudflare without rebuilding static assets. No secret value goes in GitHub, `wrangler.jsonc`, browser JavaScript, or logs. These values are configured only when the implementation is ready for deployment.

## Abuse protection and failures

The public route accepts only `POST` JSON with a bounded body, question length, number of turns, and total transcript length. It checks a Cloudflare rate-limiting binding and validates a fresh Turnstile token server-side for each submitted question before calling Render. The initial per-client-IP limit is 10 requests per minute as a coarse safeguard; Turnstile provides the stronger bot check. This limiter is approximate and per Cloudflare location, not a hard spending cap, and visitors sharing an IP may occasionally hit it together. Reject cross-origin requests and return `Cache-Control: no-store` for chat/config responses. Use a fixed upstream host, an upstream timeout, and bounded response handling. Never log message bodies, bearer keys, or Turnstile tokens.

The UI distinguishes validation/Turnstile failure, rate limit, agent unavailable, timeout, and general network failure in plain language and allows a retry. The Worker maps upstream errors to stable, non-sensitive statuses instead of forwarding raw details. If the agent is unavailable, the page still renders its introduction and contact/social links.

## Testing and release

Test Worker request validation, rate-limit and Turnstile rejection, upstream failure mapping, and the successful proxy path with mocked external calls; verify that invalid requests never reach Render. Test the client formatter and form state transitions, including malformed citations and repeated navigation. Run repository lint, format check, Astro check/build, and a local Worker smoke test. Before production release, verify the page on mobile and desktop in both themes, keyboard use, bilingual questions, citations, rate limiting, and the unavailable-agent state.

Keep the implementation on a feature branch and review it before merging. Configure Cloudflare secrets without exposing them in command output, deploy only after checks pass, then verify `/cv` and a real question through the production route. Existing uncommitted social-link edits are preserved and included as a separate commit in the eventual update.

## References

- [Astro routing](https://docs.astro.build/en/guides/routing/), [components](https://docs.astro.build/en/basics/astro-components/), and [styling](https://docs.astro.build/en/guides/styling/)
- [Cloudflare Worker static assets](https://developers.cloudflare.com/workers/static-assets/) and [secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) and [Worker rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
