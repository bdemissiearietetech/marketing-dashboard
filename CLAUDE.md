# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Marketing Dashboard — Ariete Capital

Internal dashboard that aggregates Meta Ads costs, Google Calendar booked calls, and Airtable client pipeline phases. Read-only. Protected by HTTP Basic Auth when `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD` are set (see `src/proxy.ts`); leave them empty on localhost to disable.

## Commands

```bash
npm run dev          # next dev — http://localhost:3000 (redirects to /it)
npm run build        # next build
npm run start        # next start (production)
npm run lint         # eslint
npm run db:push      # prisma db push — apply schema to local Postgres
npm run db:studio    # prisma studio
npm run db:generate  # prisma generate (also runs postinstall)
docker-compose up -d # start the local Postgres 16 container
```

There is no test suite configured.

## Stack

- Next.js 16 (App Router), React 19, TypeScript strict
- Tailwind CSS v4 + shadcn/ui + Recharts
- Postgres 16 (docker-compose) + Prisma 6 (used as a generic API cache layer)
- next-intl (IT default + EN), next-themes (dark mode)
- nuqs for URL state (date range filters)
- pino logger, @t3-oss/env-nextjs for validated env vars
- next-safe-action ready for any future Server Actions

## Architecture

```
src/
├── app/[locale]/              # all routes are locale-prefixed (IT/EN)
│   ├── layout.tsx             # html/body, providers (theme, intl, nuqs), Header
│   ├── page.tsx               # Server Component: orchestrates the 3 sections
│   ├── loading.tsx
│   └── error.tsx
├── components/
│   ├── dashboard/             # MetaAdsSection, BookedCallsSection, ClientPhasesSection, KpiCard, DateRangePicker, funnel chart
│   ├── layout/                # Header, ThemeToggle, LocaleSwitcher
│   ├── providers/             # ThemeProvider wrapper
│   └── ui/                    # shadcn primitives
├── server/queries/            # data-fetching server modules (each wrapped with getCached)
│   ├── meta-ads.ts            # Meta Marketing API → spend + leads + CPL per campaign
│   ├── calendly.ts            # Calendly REST → /scheduled_events count via PAT
│   └── airtable-clients.ts    # Airtable REST → aggregate count by phase
├── lib/                       # env, logger, cache, format, date-range, utils, constants
├── i18n/                      # next-intl routing + request config
├── db/client.ts               # PrismaClient singleton
├── types/                     # shared interfaces
└── middleware.ts              # next-intl locale middleware
```

Data flow: each section is an `async` Server Component that calls a `server/queries/*` function. Queries go through `getCached(key, ttlSec, fetcher)` in `lib/cache.ts` — a Postgres-backed `CacheEntry` table (key, payload JSON, fetchedAt, ttlSec) — so repeated navigation does not hit external APIs. Default TTLs live in `lib/constants.ts` (`CACHE_TTL`: Meta/Calendar 600s, Airtable 300s).

Date range comes from URL params (`?from=YYYY-MM-DD&to=YYYY-MM-DD`) parsed in `lib/date-range.ts`. Default is the last 30 days. The Airtable phases section ignores the range — it shows current pipeline state, ordered by `PHASE_ORDER` in `lib/constants.ts`.

Env vars are validated through `@t3-oss/env-nextjs` in `lib/env.ts` — import from there, not `process.env`.

## Setup

### 1. Database

```bash
docker-compose up -d
npm run db:push
```

Prisma schema lives at `prisma/schema.prisma`. The only model is `CacheEntry` (key, payload JSON, fetchedAt, ttlSec). Use `npm run db:studio` to inspect.

### 2. Environment

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
| `AIRTABLE_CLIENTS_TABLE` | Pre-filled: `Clients`. |

### 3. Run

```bash
npm run dev
```

Opens on `http://localhost:3000` and redirects to `/it`.

## How to extend

- **Add a new metric to Meta Ads**: extend `MetaCampaignRow` in `src/types/meta-ads.ts`, add the field to the `fields=` query param, parse it in `meta-ads.ts`, render it in `MetaAdsSection.tsx`.
- **Show details for booked calls**: Calendly returns only the count today (`{ total, range }`). To list events with title/start/attendee, extend `CalendarResult` and rebuild the table in `BookedCallsSection`. Invitee names require a second call to `/scheduled_events/{uuid}/invitees` per event — N+1, mind the rate limit (10 req/s).
- **Add a new locale string**: add to both `messages/it.json` and `messages/en.json`. The `useTranslations()` hook will pick it up.
- **Invalidate cache manually**: call `invalidateCache(prefix?)` from `lib/cache.ts` (e.g. `meta-ads:` to force a Meta refetch). Cache TTLs are in `lib/constants.ts`.

## Notes

- Postgres 7 has a breaking config change; this project pins **Prisma 6** (see `package.json`). Don't bump to v7 without migrating to the new `prisma.config.ts` adapter pattern.
- `npm` cache is redirected to `./.npm-cache` to work around root-owned files in `~/.npm/_cacache/` on this machine. The dir is gitignored.
- `nextjs-template-spec.md` at the repo root is the original generator spec used to scaffold the project. Safe to delete once you no longer need the reference.
