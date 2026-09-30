# CV chat operations

This page documents the release steps for `/cv` and its same-origin Cloudflare
Worker API. Production setup is a human-controlled release action. No production
widget, secret, or deployment is created by this change.

## Cloudflare configuration

The Worker reads two public runtime variables and two secrets:

| Name | Cloudflare type | Value |
| --- | --- | --- |
| `CV_AGENT_URL` | Variable | `https://banorte-cv-agent.onrender.com` |
| `TURNSTILE_SITE_KEY` | Variable | Public sitekey from the production Managed Turnstile widget |
| `CV_AGENT_API_KEY` | Secret | Bearer key for the Render agent |
| `TURNSTILE_SECRET_KEY` | Secret | Secret key for the Managed Turnstile widget |

Set the variables under the `ai-blog` Worker in Cloudflare's dashboard, or with
Wrangler for the appropriate deployed environment. Never put secret values in
`wrangler.jsonc`, source control, browser code, command arguments, CI variables,
or logs. Set each secret interactively so its value is entered at the local
prompt and is not echoed:

```sh
corepack pnpm@11.3.0 exec wrangler secret put CV_AGENT_API_KEY
corepack pnpm@11.3.0 exec wrangler secret put TURNSTILE_SECRET_KEY
```

Wrangler authentication is required for configuration and deployment. Run
`corepack pnpm@11.3.0 exec wrangler login` in a trusted interactive terminal,
complete Cloudflare's browser authorization, then confirm the intended account
with `corepack pnpm@11.3.0 exec wrangler whoami`. Do not paste or share an API
token in chat or terminal logs.

`CV_CHAT_RATE_LIMITER` is already declared in `wrangler.jsonc`: 10 requests per
60 seconds, using binding namespace `2026093001`. Preserve this binding and
limit in deployment configuration. The per-location Cloudflare limit is a
coarse safeguard and is not a hard spending cap.

### Turnstile widget release step

Before deployment, a release operator creates a **Managed** widget in the
Cloudflare Turnstile dashboard. Add the production hostname `uthynauta.dev`
and any intended preview hostname. Configure the widget with
`appearance: interaction-only`; the page executes verification on submission,
and the widget can appear if Turnstile requires human interaction. Copy the
public sitekey to the `TURNSTILE_SITE_KEY` Worker variable and store the
widget's secret key as `TURNSTILE_SECRET_KEY`. Verify the hostname list and
widget mode before proceeding. Keep both key values out of this document and
the repository.

## Local checks

Use the repository-pinned package manager, pnpm 11.3.0. That version was pinned
in commit `1329c60` to align CI with the official Docker image and uses a frozen
lockfile. Earlier commit `5369626` records deployment build errors as the
reason for version pinning. Install dependencies reproducibly and run:

```sh
corepack pnpm@11.3.0 install --frozen-lockfile
corepack pnpm@11.3.0 run test:integration
corepack pnpm@11.3.0 exec playwright install chromium
corepack pnpm@11.3.0 run test:e2e
corepack pnpm@11.3.0 run lint
corepack pnpm@11.3.0 run format:check
corepack pnpm@11.3.0 run build
```

The E2E suite mocks chat/config and Turnstile in the browser and includes a
local Wrangler smoke check. It does not need production credentials or call
the live Render agent. For local Wrangler work that does require test-only
bindings, use a private ignored `.dev.vars` file and local-only values; never
reuse or copy production secrets into it. Do not enable a production bypass.

## Deploy and rollback

Once review is complete and a release is approved, configure the two variables,
create and configure the widget, set both secrets, then build and deploy from
the reviewed branch:

```sh
corepack pnpm@11.3.0 run build
corepack pnpm@11.3.0 exec wrangler deploy
```

The `deploy` package script also builds before calling `wrangler deploy`. Keep a
record of the successful deployment version ID from Wrangler/Cloudflare so it
can be selected for rollback. To roll back to a known-good version, first
inspect available versions, then use the exact ID from the trusted deployment
record:

```sh
corepack pnpm@11.3.0 exec wrangler versions list
corepack pnpm@11.3.0 exec wrangler rollback <VERSION_ID>
```

Check the Wrangler prompt and target account before confirming. A rollback
changes the active Worker version; it does not remove configured variables or
secrets. If a key is compromised, rotate it at its issuing service and update
the corresponding Cloudflare secret separately.

## Post-deploy smoke checks

After deployment, check the public page and API without placing credentials in
the request:

```sh
curl --fail --silent --show-error https://uthynauta.dev/cv
curl --fail --silent --show-error https://uthynauta.dev/api/cv-config
```

Confirm `/cv` renders with its contact links, the config response contains the
public sitekey and `Cache-Control: no-store`, and no secret is returned. In a
browser, verify desktop and mobile layouts in both themes, keyboard submission,
and that an interactive Turnstile challenge is usable if presented. Submit one
real question and confirm a useful answer and source titles render. Then verify
rejection of a missing/invalid challenge and a rate-limited request, and check
Cloudflare Worker logs/metrics only for status and runtime health; do not log or
capture message bodies, Turnstile tokens, or authorization headers.

If the agent is unavailable, confirm the page remains usable and the UI shows a
recoverable error. Do not expose upstream response bodies in the report.
