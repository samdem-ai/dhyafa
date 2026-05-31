# @dyafa/admin — Internal Control Center

Next.js 14 (App Router) admin dashboard for the Dyafa platform.

- **Port:** 3001 (`next dev -p 3001`)
- **Primary locale:** Arabic (RTL default)
- **Auth:** Supabase (admin/super_admin roles only — enforced in middleware + Server Actions)

## Setup

### 1. Install dependencies (from the monorepo root)

```bash
pnpm install
```

> Builds all `@dyafa/*` workspace packages as a prerequisite (Turborepo handles the order).

### 2. Environment variables

Copy `.env.example` from the monorepo root to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required for this app:

| Variable | Where used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser client (anon, RLS-gated) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser client |
| `SUPABASE_URL` | Server-only client (service-role) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only — **never expose to browser** |

### 3. Run the dev server

```bash
# From monorepo root (Turborepo):
pnpm --filter @dyafa/admin dev

# Or directly from apps/admin:
pnpm dev
```

App starts at **http://localhost:3001**

### 4. Build for production

```bash
pnpm --filter @dyafa/admin build
pnpm --filter @dyafa/admin start
```

## Architecture notes

- `lib/supabase/client.ts` — browser client (anon key). Import in `'use client'` components only.
- `lib/supabase/server.ts` — service-role client. Import **only** in Server Actions / Route Handlers.
- `lib/i18n.ts` — per-request locale resolution + `getI18n()` helper for Server Components.
- Locale is stored in the `dyafa_locale` cookie; defaults to `ar` (RTL).
- Tailwind uses logical utilities (`ps-*`, `pe-*`, `ms-*`, `me-*`) so RTL mirrors automatically.
