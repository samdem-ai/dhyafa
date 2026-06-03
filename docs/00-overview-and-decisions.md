# {{PLATFORM_NAME}} — Architecture Plan & Decisions

> **Status:** Built — milestones **M0–M7 complete** (monorepo, Supabase backend, customer/host/hotel/admin apps). Verified by full `turbo typecheck` (11/11), DB smoke tests, and an admin `next build`. Real Chargily round-trip + on-device visual QA are the remaining follow-ups (see `12-demo-runbook.md`).
> **Origin:** design generated 2026-05-31 via an 8-agent parallel pass + adversarial critic; implementation M0→M7 followed.

---

## 1. Locked decisions (chosen by the project owner)

| Area | Decision |
|---|---|
| Scope | **Full platform** — customer app, host mode, hotel web dashboard, admin dashboard, all to defense quality (build MVP-first, see §5) |
| Backend | **Supabase** — Postgres + Auth + Storage + Realtime + Row-Level Security + Edge Functions |
| Mobile (customer + host mode) | **React Native + Expo** (TypeScript) |
| Web (admin + hotel dashboards) | **Next.js** (React + TypeScript) + Tailwind CSS |
| Currency | **DZD only** (v1), whole-dinar `integer`. Western Arabic numerals for prices |
| Localization | **Arabic (RTL, primary)**, French, English — full RTL parity required |
| Geography | **69 wilayas** (current, since 16 Nov 2025) + communes; `is_active` flag, data-driven |
| Payments | **Chargily Pay** (Edahabia + CIB) for v1. **Baridi Pay deferred to v2** (no public Algérie Poste API); enum value reserved |
| Commission | **10%** (1000 bps), in `platform_settings` + nullable per-host override |
| Repo | pnpm workspaces + Turborepo monorepo |

## 2. Document index

| # | Doc | Covers |
|---|---|---|
| 01 | [Data model](01-data-model.md) | Postgres schema, enums, relationships, availability/inventory, indexing, seed tables |
| 02 | [Auth & RLS](02-auth-and-rls.md) | Roles, OTP verification, per-table Row-Level Security, storage policies, audit log |
| 03 | [Payments](03-payments.md) | Chargily checkout + webhooks, Baridi Pay QR, holds, commission, refunds, sequence diagrams |
| 04 | [Customer app](04-customer-app.md) | Expo screen inventory, navigation, search/map, sticky booking widget, state layer |
| 05 | [Host experience](05-host-experience.md) | Mobile host mode + hotel web dashboard, shared host API, staff roles |
| 06 | [Admin dashboard](06-admin-dashboard.md) | KPIs, moderation, payments/payouts, disputes, CMS, audit log |
| 07 | [Design system & i18n](07-design-system-and-i18n.md) | Tokens, type pairing, color, RTL strategy, i18next AR/FR/EN |
| 08 | [Repo, tooling & seed](08-repo-tooling-and-seed.md) | Monorepo tree, Supabase layout, env/secrets, seed data, build sequence |
| 09 | [Gaps & open questions](09-gaps-and-open-questions.md) | Critic output: contradictions, gaps, decisions to make, risks |
| **10** | [**Canonical spec**](10-canonical-spec.md) | **The single buildable source of truth — overrides 01–08. Start here for schema/enums/RLS/RPCs.** |
| 10v | [Canonical verification](10-verification.md) | Adversarial check: 13/13 contradictions resolved + 5 nits triaged |
| 11 | [Milestones](11-milestones.md) | MVP-first build sequence (M0→M7) mapped to deliverables |
| 12 | [Demo runbook](12-demo-runbook.md) | **How to run everything + demo script + accounts + follow-ups** |

## 3. Critical finding — these 8 docs are NOT yet one schema

Each subsystem was designed independently and in parallel. They disagree in ways that **will not compile** if dropped into one Supabase project as-is. The critic found **13 concrete contradictions** ([full list](09-gaps-and-open-questions.md)). The biggest:

- **Money unit** — data-model stores centimes (`*_minor bigint`); 4 other docs use whole-dinar `integer`. DZD has no circulating subunit and Chargily takes whole dinars → **whole-dinar `integer` wins**.
- **Booking state machine** — 5 docs assume 5 different lifecycles (`pending` vs `awaiting_payment` vs `pending_host` vs `requested/accepted`…). One canonical enum + transition table is required.
- **Table-name drift** — `app_user`/`profiles`, `booking`/`bookings`, `property_image`/`property_photos`, three different `hotel_staff` shapes. RLS policies bind to relations the data model doesn't define.
- **Duplicate conflicting enums** — `payment_method` defined twice with different members; two `CREATE TYPE` = migration failure.
- **Inventory holds** — three incompatible double-booking models (counter-on-availability vs separate `inventory_hold` table vs TTL spans).

**Therefore the next deliverable is `10-canonical-spec.md`** — one reconciled source of truth that overrides all conflicts. It is produced *after* the open questions below are answered.

## 4. Proposed resolutions (my defaults — confirm or override)

These are the recommended answers to the [12 open questions](09-gaps-and-open-questions.md). Items marked **[CONFIRM]** are business calls that are genuinely yours; items marked **[default]** are engineering picks you can override on review.

| # | Question | Proposed resolution |
|---|---|---|
| 1 | Money unit | **[default]** Whole-dinar `integer amount_dzd` everywhere. No centimes. |
| 2 | Baridi Pay | ✅ **DEFERRED to v2.** v1 ships **Chargily only**. `payment_method` keeps a reserved `baridi_qr` value + the gateway abstraction so it can be added later, but no Baridi flow/UI is built in v1. |
| 3 | Phone OTP for +213 | **[CONFIRM]** **Email verification is the hard gate**; phone OTP best-effort (Twilio Verify / WhatsApp fallback) and a stretch. De-risks the defense. |
| 4 | Commission | ✅ **CONFIRMED 10%** = `platform_settings.commission_bps` default **1000** + nullable `host_profiles.commission_bps_override`. Basis points only. |
| 5 | Cancellation tiers | **[default]** Table-driven (`cancellation_policy_def` is authoritative). Flexible = 100% until 24h before; Moderate = 50% until 5 days before; Strict = 0%. Service fee non-refundable. |
| 6 | Wilaya count | ✅ **CONFIRMED: seed all 69** (current reality since 16 Nov 2025); `is_active` flag retained, data-driven (no `CHECK(1..58)`). |
| 7 | Booking lifecycle | **[default]** One enum: `requested → accepted/declined`, `awaiting_payment → confirmed/expired`, `checked_in → completed`, plus `cancelled`/`no_show`. Defined in canonical spec. |
| 8 | Inventory concurrency | **[default]** Separate `inventory_hold` table with TTL; availability rows never mutated for transient holds. Cleaner expiry logic. |
| 9 | Hotel staff model | **[default]** One `hotel_staff` table scoped to `host_profile` + `staff_role` (reception/manager) + capability matrix. Staff act across that hotel's properties. |
| 10 | Geo privacy | **[default]** Public/anon reads get a **fuzzed coordinate** (~400m) via a view; exact `lat/lng` revealed only after a confirmed booking. |
| 11 | Host-mode toggle | **[default]** Lazy-create `host_profile` on first toggle; root-navigator swap between Travelling ↔ Hosting. |
| 12 | Featured collections / home rails / promo banners | ✅ **INCLUDED in v1** (scope = full platform): `featured_collections`, `collection_items`, `promo_banners`, `home_rails` added to the canonical spec; admin CMS manages them. |

## 5. Top risk & recommended scope

The #1 risk (critic): **scope overload for a solo student** — 3 frontends + ~30 tables + payments + RLS + 3-language full RTL is multiple projects.

**Scope is confirmed FULL PLATFORM**, so the mitigation is *ordering*, not cutting: build the **vertical MVP loop first** (guest discovers → books → pays via Chargily sandbox → confirmed → reviews; host lists → admin approves), then layer hotel dashboard → payouts → analytics → messaging → merchandising on top (spec §13 → §14). Each milestone is independently demoable, so if time runs short you still have a working defense. Deferring Baridi to v2 already removed the single least-tractable item. Pre-record a Chargily sandbox webhook run as a defense-day backup (local webhook delivery needs a fragile public tunnel). The full ordering lands in `11-milestones.md`.

## 6. Next steps

1. ✅ **Done** — [CONFIRM] questions answered (full platform · Chargily-only v1 · 10% · 69 wilayas).
2. ✅ **Done** — [`10-canonical-spec.md`](10-canonical-spec.md) produced: one reconciled schema + enum catalog + booking state machine + RLS naming map + RPCs/Edge Functions, overriding every conflict in §3. Verified `clean` ([10-verification.md](10-verification.md)): 13/13 contradictions resolved.
3. ✅ **Done** — [`11-milestones.md`](11-milestones.md): M0→M7 build sequence mapped to deliverables (§14).
4. ⏳ **Gate — your sign-off.** Review this folder. On approval, scaffold **M0** (monorepo + Supabase migrations `0001_schema`/`0002_enums` + RLS + seed). No application code is written before then.
