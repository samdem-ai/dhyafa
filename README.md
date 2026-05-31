# Dyafa (دافة) — Algerian vacation-rental & hotel booking platform

> Working brand name **Dyafa** ("hospitality") is a placeholder — rename freely; the spec uses `{{PLATFORM_NAME}}`.

A Booking.com/Airbnb-style marketplace for Algeria: hotels and individual hosts list stays; travelers search, book, pay, and review. Arabic-first (RTL) · French · English. Prices in DZD. Payments via Chargily Pay (Edahabia/CIB).

**Status: planning.** No application code yet — the architecture + decisions live in [`docs/`](docs/) and await sign-off before scaffolding begins.

## Start here

👉 **[docs/00-overview-and-decisions.md](docs/00-overview-and-decisions.md)** — decisions, document index, open-question resolutions, scope & risk.
👉 **[docs/10-canonical-spec.md](docs/10-canonical-spec.md)** — the single buildable source of truth (schema, enums, RLS, RPCs).
👉 **[docs/11-milestones.md](docs/11-milestones.md)** — MVP-first build sequence (M0→M7).

## Stack (locked)

| | |
|---|---|
| Backend | Supabase (Postgres + Auth + Storage + Realtime + RLS + Edge Functions) |
| Mobile (customer + host mode) | React Native + Expo (TypeScript) |
| Web (admin + hotel dashboards) | Next.js + Tailwind CSS |
| Payments | Chargily Pay (Edahabia + CIB) — v1; Baridi Pay deferred to v2 |
| Repo | pnpm workspaces + Turborepo monorepo |
