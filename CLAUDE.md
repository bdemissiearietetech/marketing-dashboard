# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Marketing Dashboard — Ariete Capital

Internal dashboard that aggregates Meta Ads costs, Calendly booked calls, and Airtable client/lead pipeline phases. Read-only. Protected by a simple frontend login when `DASHBOARD_PASSWORD` is set (see `src/proxy.ts` and `src/app/[locale]/login/`); leave it empty on localhost to disable the gate.

## Commands

```bash
npm run dev          # next dev — http://localhost:3000
npm run build        # next build
npm run start        # next start (production)
npm run lint         # eslint
```

There is no test suite configured.

## Stack

- Next.js 16 (App Router, Edge middleware), React 19, TypeScript strict
- Tailwind CSS v4 + shadcn/ui + Recharts
- next-intl (EN default + IT), next-themes (dark mode)
- nuqs for URL state (date range filters)
- pino logger, @t3-oss/env-nextjs for validated env vars
- next-safe-action for Server Actions

No database. The cache layer uses Next.js's built-in Data Cache (`unstable_cache`).

## Architecture

```
src/
├── app/[locale]/              # all routes are locale-prefixed (en default, /it/* for italian)
│   ├── layout.tsx             # html/body, providers (theme, intl, nuqs), Header, FeedbackButton
│   ├── page.tsx               # Server Component: orchestrates dashboard + pipeline tabs
│   ├── login/                 # password gate (page.tsx + LoginForm.tsx + actions.ts + logout.ts)
│   ├── loading.tsx
│   └── error.tsx
├── app/api/feedback/route.ts  # forwards floating-button submissions to N8N_FEEDBACK_WEBHOOK_URL
├── components/
│   ├── dashboard/             # KpiCard, DateRangePicker, HeroKpis, FunnelSection, TrendSection, BookedCallsSection, LeadsPhasesSection, ClientPhasesSection, MetricsLegend, SectionError
│   ├── feedback/              # floating feedback button + dialog
│   ├── layout/                # Header, ThemeToggle, LogoutButton
│   ├── providers/             # ThemeProvider wrapper
│   └── ui/                    # shadcn primitives
├── server/queries/            # data-fetching server modules (each wrapped with getCached)
│   ├── meta-ads.ts            # Meta Marketing API → spend + leads + CPL
│   ├── calendly.ts            # Calendly REST → /scheduled_events count + attendance
│   ├── airtable-clients.ts    # Airtable REST → aggregates by phase
│   ├── funnel.ts              # cross-source funnel computation
│   └── settings.ts            # reads TARGET_CAC from env
├── lib/                       # env, auth, logger, cache, format, date-range, utils, constants
├── i18n/                      # next-intl routing + request config
├── types/                     # shared interfaces
└── proxy.ts                   # Next 16 middleware: login gate + locale routing
```

Data flow: each section is an `async` Server Component that calls a `server/queries/*` function. Queries go through `getCached(key, ttlSec, fetcher)` in `lib/cache.ts`, which wraps `next/cache`'s `unstable_cache` — so repeated navigation does not hit external APIs within the TTL window. Default TTLs live in `lib/constants.ts` (`CACHE_TTL`: Meta/Calendar 600s, Airtable 300s). The cache is per-instance; deploys clear it.

Date range comes from URL params (`?from=YYYY-MM-DD&to=YYYY-MM-DD`) parsed in `lib/date-range.ts`. Default is the last 30 days. The Airtable phases sections ignore the range — they show current pipeline state, ordered by `PHASE_ORDER` in `lib/constants.ts`.

Env vars are validated through `@t3-oss/env-nextjs` in `lib/env.ts` — import from there, not `process.env`.

## Login gate

When `DASHBOARD_PASSWORD` is set, `src/proxy.ts` redirects unauthenticated requests to `/login` (or `/it/login`). The form submits the password to a Server Action which, on match, sets an HttpOnly cookie `dashboard_auth` containing `sha256(password)`. The middleware compares the cookie to that hash on every request. Rotating `DASHBOARD_PASSWORD` invalidates all existing sessions automatically. Cookie lifetime is 30 days. Leave `DASHBOARD_PASSWORD` empty to skip the gate (useful on localhost).

## Setup

### 1. Environment

```bash
cp .env.example .env.local
```

Fill in the required secrets:

| Variable | Where to get it |
|---|---|
| `META_ACCESS_TOKEN` | Business Manager → System Users → Generate token (long-lived). Required permissions: `ads_read`. |
| `META_AD_ACCOUNT_ID` | Ads Manager URL: `act_XXXXXXX` — paste only the digits, **without** the `act_` prefix. |
| `CALENDLY_API_TOKEN` | Calendly → Account → Integrations → API & Webhooks → "Generate New Token". The PAT inherits the generating user's permissions, so generate it from the account whose `scheduled_events` you want to count. |
| `CALENDLY_USER_URI` | After setting `CALENDLY_API_TOKEN`, run `curl -H "Authorization: Bearer $CALENDLY_API_TOKEN" https://api.calendly.com/users/me` and copy `resource.uri` (format `https://api.calendly.com/users/<uuid>`). |
| `AIRTABLE_API_KEY` | airtable.com → Account → Personal access token with `data.records:read` scope on the Ariete Capital base. |
| `AIRTABLE_BASE_ID` | Pre-filled: `appuQ0UBJRXSTztOH` (Ariete Capital Client Management). |
| `AIRTABLE_CLIENTS_TABLE` / `AIRTABLE_LEADS_TABLE` | Pre-filled: `Clients` / `Leads`. |
| `TARGET_CAC` | Optional. Reference CAC for the dashboard CAC card and the cohort table. |
| `DASHBOARD_PASSWORD` | Optional. When set, the dashboard is gated behind `/login`. |
| `N8N_FEEDBACK_WEBHOOK_URL` | Optional. n8n webhook receiving floating-button feedback (multipart: `text` + optional `image`). |

### 2. Run

```bash
npm run dev
```

Opens on `http://localhost:3000`.

## How to extend

- **Add a new metric to Meta Ads**: extend `MetaCampaignRow` in `src/types/meta-ads.ts`, add the field to the `fields=` query param, parse it in `meta-ads.ts`, render it in the relevant dashboard section.
- **Show details for booked calls**: Calendly returns only the count today. To list events with title/start/attendee, extend `CalendarResult` and rebuild the table in `BookedCallsSection`. Invitee names require a second call to `/scheduled_events/{uuid}/invitees` per event — N+1, mind the rate limit (10 req/s).
- **Add a new locale string**: add to both `messages/it.json` and `messages/en.json`. The `useTranslations()` hook will pick it up.
- **Invalidate cache manually**: call `revalidateTag(key)` from `next/cache`, where `key` matches the cache key passed to `getCached`. Cache TTLs are in `lib/constants.ts`.

## Notes

- `npm` cache is redirected to `./.npm-cache` to work around root-owned files in `~/.npm/_cacache/` on this machine. The dir is gitignored.
- `nextjs-template-spec.md` at the repo root is the original generator spec used to scaffold the project. Safe to delete once you no longer need the reference.
