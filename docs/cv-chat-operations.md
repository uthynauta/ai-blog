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

Set the variables and secrets under the `ai-blog` Worker in Cloudflare's
dashboard. Never put secret values in `wrangler.jsonc`, source control, browser
code, command arguments, CI variables, or logs. Add the secret values directly
in the dashboard's secret fields; Cloudflare hides them after entry. Keep the
dashboard's final **Deploy** action for the approved release (see below).

`wrangler.jsonc` sets `keep_vars: true`. Cloudflare documents that Wrangler
otherwise removes dashboard-set plaintext variables during `wrangler deploy`,
while `keep_vars` preserves them; secrets are preserved independently. This
keeps `CV_AGENT_URL` and `TURNSTILE_SITE_KEY` editable in Cloudflare and
preserved by later code deployments. See the official [Wrangler deploy
options](https://developers.cloudflare.com/workers/wrangler/commands/workers/)
and [`keep_vars` configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).

Do not use `wrangler secret put` as a pre-release staging command: Cloudflare
[documents](https://developers.cloudflare.com/workers/configuration/secrets/)
that it creates a new Worker version and deploys it immediately.
Likewise, adding dashboard variables/secrets is not a non-deploying staging
step once you click **Deploy**. Treat that click as a production publish and
perform it only as part of the approved release.

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
Cloudflare Turnstile dashboard and adds the production hostname
`uthynauta.dev` and any intended preview hostname. The dashboard sets the
widget mode and allowed hostnames; `appearance` is configured by the page's
[`turnstile.render` options](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/).
Verify that `src/scripts/cv-chat.ts` sets
`appearance: "interaction-only"` and `execution: "execute"`; this lets a
challenge appear if Turnstile requires human interaction. Copy the public
sitekey to the `TURNSTILE_SITE_KEY` Worker variable and store the widget's
secret key as `TURNSTILE_SECRET_KEY`. Keep both key values out of this document
and the repository.

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

After review and explicit release approval, first create the Managed Turnstile
widget and hostname allowlist. In the dashboard for the existing `ai-blog`
Worker, add both ordinary variables (`CV_AGENT_URL` and `TURNSTILE_SITE_KEY`)
and both secrets (`CV_AGENT_API_KEY` and `TURNSTILE_SECRET_KEY`). Confirm the
Worker/account target and all four binding names and types, then deliberately
click **Deploy** to activate the configuration on the currently deployed code.
This dashboard action is itself a production change and publishes immediately;
do it only as part of the approved release. No production configuration or
deployment is performed during this task.

After that configuration deployment succeeds, build and deploy the reviewed
branch's new code:

```sh
corepack pnpm@11.3.0 run build
corepack pnpm@11.3.0 exec wrangler deploy
```

The `deploy` package script also builds before calling `wrangler deploy`.
`keep_vars: true` in `wrangler.jsonc` preserves the two dashboard-managed plain
variables during this code deployment; Cloudflare preserves secrets
independently. Keep a record of the successful deployment version ID from
Wrangler/Cloudflare so it can be selected for rollback. To roll back to a
known-good version, first inspect available versions, then use the exact ID
from the trusted deployment record:

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
