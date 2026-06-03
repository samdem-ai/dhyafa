# Demo Runbook — Dyafa (دافة)

How to bring the whole platform up locally and run the end-to-end demo. Brand placeholder = **Dyafa**.

## 1. Prerequisites
- **Node 20+**, **pnpm 9** (`corepack enable`)
- **Docker Desktop** running (Supabase local stack runs in containers)
- Supabase CLI is a dev dependency (`pnpm exec supabase ...`) — no global install needed

## 2. One-time setup
```bash
pnpm install                       # install all workspaces
pnpm exec supabase start           # boot Postgres+Auth+Storage+… (first run pulls images)
pnpm db:reset                      # apply all migrations + seed (69 wilayas, 12 listings, demo users)
pnpm db:types                      # regenerate packages/types/src/database.types.ts from the live DB
```
Then create env files (never commit them — `.env*` is gitignored). Copy `.env.example` → `.env` and, per app, set:
- **apps/admin/.env.local** & **apps/hotel/.env.local**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **apps/customer/.env**: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
Get the local anon + service_role keys from the `supabase start` output (or `pnpm exec supabase status`).

## 3. Run the apps
```bash
pnpm --filter @dyafa/admin dev      # admin dashboard  → http://localhost:3001
pnpm --filter @dyafa/hotel dev      # hotel dashboard  → http://localhost:3002
pnpm --filter @dyafa/customer start # Expo (press i / a, or scan in Expo Go)
```
Supabase Studio: http://127.0.0.1:54323 · Inbucket (emails): http://127.0.0.1:54324

## 4. Demo accounts (seed; password = `password`)
| Role | Email | UUID suffix |
|---|---|---|
| Guest | `guest@demo.dyafa.dz` | …0001 |
| Host (individual) | `host.individual@demo.dyafa.dz` | …0002 |
| Host (hotel) | `host.hotel@demo.dyafa.dz` | …0003 |
| Hotel staff (reception) | `staff.reception@demo.dyafa.dz` | …0004 |
| Admin | `admin@demo.dyafa.dz` | …0005 |
| Super admin | `super.admin@demo.dyafa.dz` | …0006 |

## 5. Demo script (the core loop)
1. **Customer (Expo)** — sign in as guest → Explore: search a wilaya, filter, open a listing → sticky widget: pick dates/guests → **Book** (instant-book listing → `awaiting_payment`).
2. **Pay** — on the payment screen tap **"Simulate payment (dev)"** → booking flips to `confirmed` (this routes through the same `apply_payment_event` the real Chargily webhook uses). Trips → Upcoming shows it.
3. **Messaging** — "Message host" from the booking → realtime thread.
4. **After a completed stay** — leave a **review** (6 categories); the host replies from host mode / hotel dashboard.
5. **Host mode (same app, Switch to Hosting)** — create a listing → submit for review; manage calendar, reservations, earnings.
6. **Admin (web)** — moderate the pending listing (approve/reject), see KPIs, manage users/payments/payouts/disputes/CMS.
7. **Hotel dashboard (web)** — sign in as the hotel host → multi-room inventory, bulk calendar, reservations, analytics, staff.

## 6. Real Chargily payment (optional, for the live card flow)
1. dev.chargily.com → test app → copy **secret key** + **webhook secret** into root `.env` (`CHARGILY_SECRET_KEY`, `CHARGILY_WEBHOOK_SECRET`).
2. Re-enable `[edge_runtime] enabled = true` in `supabase/config.toml`; `pnpm exec supabase functions serve`.
3. Expose the webhook via a tunnel (e.g. `cloudflared`/`ngrok`) and register it in the Chargily dashboard.
4. In the customer pay screen use **"Pay with Edahabia/CIB"** → hosted checkout → webhook confirms the booking.

## 7. Verified vs. pending
**Verified (DB smoke tests, rolled back, + typecheck 11/11 + admin `next build` green):**
- `create_booking` (price snapshot + inventory hold), dev payment → `confirmed`, `submit_review`/`host_reply_review`, conversation/`send_message`, `mark_notifications_read`, `add_hotel_staff`, `set_availability_range`, `run_payouts`, admin approve/reject.

**Pending / follow-ups (not blockers for the demo):**
- Real Chargily round-trip (needs keys + edge runtime + tunnel — see §6).
- Visual RTL/accessibility QA on devices/browsers (logic is built; pixels unverified here).
- ESLint config for the two Next apps (`next lint` is currently unconfigured; typecheck is the active gate).
- Push-notification device-token storage + fan-out Edge Function (in-app + realtime work today).
- Full communes dataset (a representative sample is seeded; all 69 wilayas are complete).
