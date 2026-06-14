The `INVALID_RANGE` exclusive-loop pattern is confirmed in the codebase. I have enough verified grounding — real token names (teal-800/terracotta-600/bone-200, the full status palette, `tabular-nums` targets, motion durations fast=140/base=220), the exact `notifications.type` CHECK set including the already-present `staff_invited`, and the `p_to`-exclusive availability bug. I'll now write the plan.

I've verified the load-bearing facts against the codebase. Here is the rework plan.

---

# Dyafa Admin & Hotel Dashboards — Rework Plan (source of truth)

This plan synthesizes the admin audit, hotel audit, backend inventory, and UX spec into one prioritized rebuild. Verified against the live code: token names in `packages/design-tokens/src/tokens.ts`, the `notifications.type` CHECK at `supabase/migrations/20260531120100_schema.sql` lines 667–674 (allowed set listed below), and the `set_availability_range` exclusive loop in `supabase/migrations/20260531120200_functions.sql`.

The architecture is sound (httpOnly-cookie bridge → `requireAdmin()`/`requireHost()` re-check → service-role writes + audit; user-JWT for self-authorizing RPCs). We are **not** rewriting the backend or auth model. We are: (a) building one shared visual/component layer both apps reuse, (b) fixing a small set of high-impact functional bugs, and (c) filling capability gaps that the schema already supports plus a handful of minimal RPCs.

---

## 1. Goals & principles

**What "good" means here.** Both dashboards must feel like one designed, branded product — not an admin template — and every visible action must actually work. Concretely: (1) one shared design language and component set, applied to 100% of routes (no bespoke per-page chrome); (2) zero "success looks like failure" bugs — every successful mutation shows success, every real failure shows a clear, localized error; (3) we only ship UI for capabilities the backend supports, and any backend gap is closed with the minimal migration/RPC named in §6; (4) every list is paginated, every async outcome is a toast, every destructive action is a confirm dialog, every page has designed loading/empty/error states.

**i18n / direction (locked).** English is the default and LTR; Arabic (RTL) and French are selectable. `DEFAULT_LOCALE='en'` — fix the two stale comments in `apps/admin/lib/i18n.ts` and the hotel dashboard-i18n header that claim Arabic is default (behavior is already correct; comments mislead). The shell sets `dir` on `<html>` once from the locale; components use **logical properties only** (`ps/pe/ms/me`, `text-start/end`, `start/end-0`) — no `pl/pr/left/right` anywhere. DZD currency via one shared formatter; the calendar price label bug (`toLocaleString('en-US')`) must route through it.

**Design direction (one paragraph).** Warm-Mediterranean editorial: a deep-teal (`teal-800 #0E3A3A`) persistent sidebar against a warm-bone (`bg #F7F3EC`) canvas, white (`surface`) cards floating on the bone, terracotta (`accent #C97B5A`) rationed to exactly one primary CTA per view plus prices, active states, and the focus ring. Design in grayscale first; color is meaningful, never decorative (status pills, toasts, validation only). Fraunces serif for page titles and KPI numbers; Plus Jakarta Sans for all functional text; IBM Plex Sans Arabic auto-swapped under `lang="ar"`. `tabular-nums` mandatory on every number/date/price. Calm motion (`fast` 140ms hover/focus, `base` 220ms overlays), honoring `prefers-reduced-motion`.

---

## 2. Design system & shared components

**Decision: create `@dyafa/ui`** (sibling to `@dyafa/design-tokens`/`@dyafa/i18n`), consumed by both apps. Three layers (shadcn convention), built on **Radix UI primitives** for focus management, ARIA, escape/dismiss/click-outside — do **not** hand-roll dialogs/menus/tooltips (that hand-rolling is the source of the "buggy" feel). Migrate `apps/admin`'s existing `components/ui.tsx` and `AdminShell` into this package as the first consumers, then delete the per-app copies.

Token usage is locked to real names: chrome `primary`/`primary-hover`/`primary-pressed`; canvas `bg`; cards `surface` + `rounded-card` (16) + `shadow-card` + `border`; sunken/skeleton base `surface-sunken`; accent `accent`/`accent-hover`; focus `focus-ring`; status `success|warning|error|info` (+ `-bg`); hairlines `border`/`border-strong`. Radius: `sm` (8) inputs/buttons/badges, `card` (16) cards/modals, `pill` status/nav-active/avatars. Motion: `fast` (140) hover/color/focus, `base` (220) overlay enter, easing `standard`.

**Build first (this is the foundation both apps reuse):**

- **`AppShell`** — Sidebar + TopBar + `<main>`; reads `dir`; mobile off-canvas drawer; collapse state persisted to `localStorage`. *This single component, applied everywhere, fixes the audit's #1 visual bug (moderation has no shell).*
- **`Sidebar`** — `bg-primary`; groups with `overline` section labels in `teal-400`; items 40px, `rounded-pill`, Lucide 20px icon + label; default `teal-200`; hover `teal-700/40`; **active** `bg-teal-700` + 3px `accent` start-edge bar + `aria-current="page"`; collapsed = icons + Radix tooltip. Driven by a per-app nav config object (§3).
- **`TopBar`** — `surface` white with `border-b border-border` (NOT teal — keeps two heavy bands from fighting); breadcrumb (last crumb = page title, `heading-3`); `⌘K` command-palette trigger (Radix Dialog + cmdk); language `DropdownMenu` (EN/AR/FR → cookie + `dir`); user menu; mobile hamburger.
- **`Button`** — `variant: primary(teal) | secondary | ghost | destructive(error) | link`; `size`; `loading` (keeps width, swaps to spinner); `iconStart/End`. **The single CTA per view may use accent.** This codifies the fix for "terracotta used for positive actions": Approve/Verify become `primary` or a new `success` treatment, never the generic accent fill.
- **`Card`, `PageHeader`, `FormField`, `Input`/`Textarea`, `Select`** (searchable variant for wilayas), **`Checkbox`/`Switch`/`Radio`, `Pill`/Badge** (variants `neutral|success|warning|error|info|accent`, `removable`, with one centralized `statusToPill()` mapper).
- **Feedback layer (currently absent — biggest consistency win):** **`Modal`** (Radix Dialog), **`ConfirmDialog`** (Radix AlertDialog, no click-outside dismiss, `requireTypeToConfirm` for high-stakes), **`Toast`/`ToastProvider`/`useToast()`** (bottom-end / bottom-start in RTL, `aria-live` polite, errors assertive + persistent).
- **`DataTable`** (TanStack Table headless + our primitives) — columns (sortable, align, sticky, cell renderer), `loading|error|empty` states it owns, `selectable` + bulk-action bar, `pagination` (default page size 25), density toggle. **`FilterBar`** (search + removable filter chips + popovers), **`EmptyState`** (two presets: no-data vs no-results), **`Skeleton`/`SkeletonTable`/`SkeletonCard`**.
- **`StatCard`** (overline label, Fraunces `display-lg` value `tabular-nums`, trend Pill), **`Tabs`** (underline + accent active), **`SegmentedControl`** (time-range/density), **`DropdownMenu`/`Tooltip`/`Popover`** (Radix wrappers, `shadow-raised`).

**Per-page acceptance checklist (every page must pass):** renders inside `AppShell`; tokens only (no hex/arbitrary spacing); logical properties only (RTL passes in `ar`); designed loading/empty/error-with-retry; async→toast, validation→inline, destructive→confirm; keyboard-reachable with visible terracotta focus ring; numbers/dates/DZD use `tabular-nums` + shared formatters; works at 768px (drawer + stacked-card tables); respects reduced motion.

---

## 3. Information architecture

`dir` set once on `<html>`. Each app passes a nav config to `Sidebar`; routes grouped into sections rather than one flat list.

### Admin (`apps/admin`) — nav config
- **Operations** — Overview `/` · Moderation `/moderation` (queue) · **Listings `/listings`** (NEW — all statuses) · Bookings `/bookings` · Disputes `/disputes` · Reviews `/reviews`
- **Finance** — Payments & payouts `/payments`
- **People** — Users `/users` (Hosts/Guests tabs) · **Roles `/roles`** (NEW, super_admin only)
- **Catalog (CMS)** — Content hub `/content` → collections / banners / rails / property-types / amenities / wilayas
- **System** — Audit log `/audit` · **Settings `/settings`** (NEW: platform_settings, super_admin only)

Role-gating: `session.primaryRole` gates super_admin-only items (**Roles**, **Settings**, lookup-table writes). Today `primaryRole` is computed but never gates anything — an `admin` sees identical capabilities to `super_admin`; fix by hiding/disabling those nav items and server-guarding the actions. Default post-login → `/` Overview (currently `/moderation`).

### Hotel (`apps/hotel`) — nav config
- **Front desk** — Overview `/` · Reservations `/reservations` · Messages `/messages`
- **Property** — Properties `/properties` · Calendar/Availability `/calendar` · Reviews `/reviews`
- **Business** — Earnings/Payouts `/payouts` · Analytics `/analytics`
- **Settings** — Staff `/staff` (owner only) · Account `/settings`

Role-gating by capability flags already resolved in the dashboard layout (`canManage`/`isOwner`/`staffRole`):
- **reception:** read bookings; **check-in/out/no-show** (after §6 adds the RPC + §5 fixes the matrix); write availability (close/open/min-stay, no price); messages; reviews read-only. **Hidden:** payments/payouts, room-type/property edits, staff, accept/decline (see §5 decision).
- **manager:** everything reception has + accept/decline/cancel, room_types/rate_plans/photos/property edits, review replies.
- **owner:** everything + Staff management + draft deletion + payouts.

---

## 4. Admin dashboard — feature spec

> Cross-cutting bug fixed once for all admin mutations: **notifications.type CHECK violations.** The constraint (schema.sql 667–674) allows exactly: `booking_requested, booking_accepted, booking_declined, booking_confirmed, booking_cancelled, booking_reminder, checkin_instructions, payment_succeeded, payment_failed, payment_expired, payout_paid, review_received, review_reply, message_received, listing_submitted, listing_approved, listing_rejected, listing_changes_requested, listing_suspended, dispute_opened, dispute_resolved, staff_invited`. The admin actions invent `account_suspended`/`account_reactivated`/`host_verified`/`booking_cancelled_admin`, which are NOT in the set, so the notification INSERT fails and the whole action returns `partial` "violates check constraint" on success. **Fix (§6 migration M-1):** extend the CHECK to add `account_suspended`, `account_reactivated`, `host_verified`, `host_rejected`, `account_update`; and change force-cancel to use the existing valid `booking_cancelled`. This single fix un-breaks suspend/unsuspend/verify-host/force-cancel.

### 4.1 Overview `/` (working → polish)
- **Does:** platform KPIs over `?range=` (bookings, GMV, commission, conversion, active listings, new users) + charts, from `mv_daily_metrics` + `mv_conversion_funnel` + live property counts.
- **Rework:** Replace ad-hoc tiles with `StatCard` row (Fraunces value, trend Pill); `SegmentedControl` 7/30/90/custom. Add a **"Data as of {timestamp}"** indicator (MVs only reflect the last `refresh_analytics()`); add a **Refresh analytics** action (§6 M-9 wraps the service-role RPC). Surface the unused rich MVs as drill-downs: `mv_top_destinations`, `mv_revenue_by_period`. Charts get axis labels + tooltips (Recharts), faint horizontal gridlines only.
- **Backend:** add `admin_dashboard_summary()` (§6 M-8) to replace 4 awaited client queries with one jsonb scorecard.
- **Bugs to fix:** add root `loading.tsx` (skeleton StatCards + chart placeholders); `trendOf` returns null <4 days silently — show "—" with tooltip "needs ≥4 days"; reconcile MV-derived tiles vs live base-table counts (label live ones "live").

### 4.2 Moderation queue `/moderation` + detail `/moderation/[id]` (buggy/partial → flagship)
- **Does:** pending-listing queue → full property review → approve/reject.
- **#1 fix:** **bring both pages under `AppShell`.** They currently render a bespoke `<header className="bg-primary">` with no sidebar — the single biggest "plain/ugly/inconsistent" problem, on the flagship flow. List → `DataTable` (this is the reference implementation per the UX spec); detail → `PageHeader` (Fraunces title + status Pill + actions) + 2-col layout, decision in a sticky side-rail card.
- **Bugs to fix:** detail page hard-codes a yellow "Pending" badge regardless of real status (it's reused as the generic property-detail target from `/bookings`) — drive the badge from actual `status`. Approve button is terracotta (`accent`) → make it `success`/`primary`; reject stays `error`. Photos use raw `<img>` → `next/image` + lightbox for moderation scrutiny.
- **Data/RPCs:** today admin mutates `properties` raw with inline audit. Replace with audited RPCs **`approve_property` / `reject_property(reason, note)` / `suspend_property(reason)`** (§6 M-2): set status + `reviewed_by` + audit + valid notification (`listing_approved`/`listing_rejected`/`listing_suspended`). Guard on current status server-side.
- **UX:** `FilterBar` (wilaya/host/date, sort); stacked-card layout <768px.

### 4.3 Listings `/listings` (NEW — closes the biggest missing capability)
- **Does:** browse/search **all** properties by status (pending/approved/rejected/suspended), the thing "Listings" nav implies but doesn't deliver today.
- **How:** `DataTable` over `properties` (RLS staff bypass) + `FilterBar` status/wilaya/type/host/date. Row → `/moderation/[id]` (now correctly status-aware). Row/bulk action **Suspend** (live→suspended) and **Unsuspend/restore**, via `suspend_property`/`approve_property` (§6 M-2). `property_status` enum already has `suspended` and `notifications` has `listing_suspended` — schema supports this; only the action+UI are missing.
- **Backend:** optional `admin_pending_properties` view (M-8 group) for the queue join; the main list reads base tables.

### 4.4 Users `/users` + `/users/[id]` (buggy → fixed)
- **Does:** search profiles; profile + host account + booking history; suspend/unsuspend; verify host.
- **Bugs to fix:** (1) **notification CHECK bug** (§6 M-1) — the worst "success shows red error" in the app. (2) Fake pagination — `/users` footer prints `"Filters: Name or phone…"` as a "load more"; replace with real `DataTable` pagination (offset/cursor). (3) `verifyHost` is one-way (only `verified`) — add reject/reset and `payout_status` via **`set_host_verification(host_id, identity_status, payout_status, reason)`** (§6 M-3) with audit + a **signed-URL accessor for KYC docs** (`id_doc_path` in private `kyc-docs`). (4) Verify button is terracotta → `success`. (5) Suspend has no enforcement teeth (only flips `is_active`); add an RLS/sign-in block as a backend follow-up (M-3 note) — flag in §9 if product wants hard enforcement now.
- **UX:** Users tabs (Hosts/Guests) + status/role filters; quick-suspend from the list with `ConfirmDialog`; booking history → embedded paginated `DataTable` with "View all in Bookings filtered by guest".

### 4.5 Bookings `/bookings` + `/bookings/[id]` (working/buggy → fixed)
- **Does:** all bookings with filters; booking breakdown + parties + transactions + linked dispute + admin force-cancel via `cancel_booking` (admin-JWT path).
- **Bugs to fix:** (1) **force-cancel notification** uses invalid `booking_cancelled_admin` → change to valid `booking_cancelled` (§6 M-1). (2) **`CANCELLABLE` includes `checked_in`** but `cancel_booking` raises `ILLEGAL_TRANSITION` for it → remove `checked_in` from the client set (or extend the RPC; remove is simpler). (3) **fake pagination** (footer prints `"Filters — 30"`) → real pagination. (4) **Guest-name search advertised but only `code` is queried** → implement guest-name search (join/ilike on guest profile) or correct the copy. (5) Property link points to `/moderation/{id}` mislabeling it → point to a status-aware detail (now fixed in 4.2) or `/listings/[id]`. (6) Resolution-note green-box bug (see 4.7).
- **Note:** admin force-cancel depends on `custom_access_token_hook` injecting `app_roles` into the admin JWT so `cancel_booking`'s `is_staff()` passes — confirm the hook is configured in this env (§9).

### 4.6 Payments & payouts `/payments` (partial → corrected)
- **Bugs to fix:** (1) **"Collected (paid)" KPI overstates revenue** — it sums `amount_dzd` across `paid|partially_refunded|refunded` **without** `kind='payment'`, counting refund-kind rows and fully-refunded payments as revenue. Fix: filter `kind='payment'` and subtract refunded gross. (2) **fake pagination** on payouts/transactions → real. (3) `markTransactionRefunded` is a bookkeeping flag only (no provider refund, no refund-kind txn, no `booking.refund_amount_dzd`) and can diverge from `cancel_booking`'s refunds — back it with **`mark_payout_paid(payout_id, reference, statement_path)`** for payouts (§6 M-6) and document that transaction-refund is a record-only flag (or wire a real refund path; flag in §9).
- **Adds:** `RunPayoutsForm` preview ("N bookings / M hosts will be included") before commit; date-range on KPIs; `statement_path` PDF link (§6 M-6 populates it).
- **Correct as-is:** `markPayoutPaid` uses valid `payout_paid`; `run_payouts`/`markTransactionRefunded` write audit-only (no CHECK risk).

### 4.7 Disputes `/disputes` + `/disputes/[id]` (working/partial → real outcomes)
- **Bugs to fix:** (1) **resolution_note rendered in a green `bg-success` box even when `rejected`** (both `bookings/[id]` and `disputes/[id]`) — style by outcome (rejected → neutral/error tone). (2) No state-machine guard — `resolveDispute` doesn't `.eq` on a non-final status, allowing re-resolve; guard server-side. (3) Open/under_review not visually prioritized despite stated intent — sort them to top + status Pills.
- **Adds (real money + thread):** wire resolution to outcomes via **`resolve_dispute(dispute_id, status, resolution_note, refund_amount_dzd?)`** (§6 M-5): writes `disputes.refund_amount_dzd` and, for `category='refund'`, issues a refund txn; audited; valid `dispute_resolved` notification. Add an admin **compose box** to post into the dispute thread (`dispute_messages`). Render `evidence_path` as a signed-URL link/thumbnail, not a raw path.

### 4.8 Reviews `/reviews` (partial → precise)
- **Bugs to fix:** (1) **Reported-tab false positives** — it loads all `disputes.category='other'` and joins reviews by `booking_id`; genuine "other" disputes surface unrelated reviews. `report_review` prefixes the description with `Reported review <id>:` — filter on that prefix (or better, add a typed link). (2) Restoring sets `status='published'` but not `published_at` — set it. (3) Tiny ghost buttons + destructive "remove" has no confirm → `ConfirmDialog`.
- **Adds:** show all 6 category sub-scores + property/booking context inline; back hide/remove/restore with audited **`moderate_review(review_id, action)`** (§6 M-4). `setReviewStatus` is already CHECK-safe (no notification).

### 4.9 Content/CMS `/content/*` (working/partial/buggy → fixed)
- **Bugs to fix:** (1) **`property_types` & `amenities` use `max(id)+1`** for non-identity smallint PKs — race-prone, collides as generic `update_failed`. Fix via **§6 M-7: convert both PKs to identity/sequence** (migration) so inserts are atomic. (2) **`amenities.category` is free-text** but DB CHECKs 6 values (`general/kitchen/bathroom/safety/accessibility/outdoor`) → constrained `Select`. (3) Banner list title falls back to raw `image_path` as heading → show a placeholder.
- **Adds (the big CMS gap — no image upload anywhere):** a **Supabase Storage `ImageUpload` component** for promo banner images, collection `cover_photo_path` (EntityEditor has no field for it today), and type/amenity icons (icon picker). **Collection item picker** with property search/typeahead + drag-reorder (today operators paste raw UUIDs). Rails get a reorder UI. Wilayas get grouped/searchable list + active filter (69 entries).

### 4.10 Audit `/audit` (working → navigable)
- **Bugs to fix:** fake-ish footer + no pagination/date filter (`PAGE_SIZE=60`, old entries fall off) → real pagination + date-range filter; pretty-print before/after JSON (expandable diff). Backend: add `(action, created_at desc)` index (§6 M-10) for the feed.
- **Note:** today only `grant_role` writes audit; once §6 admin RPCs (M-2..M-6) all write audit, this page finally has comprehensive data.

### 4.11 Roles `/roles` (NEW) & Settings `/settings` (NEW) — super_admin only
- **Roles:** UI for `grant_role` RPC (grant/revoke admin/staff). Gated by `session.primaryRole === 'super_admin'`; server-guarded.
- **Settings:** editor for `platform_settings` (commission_bps, payout_period, payment_window_minutes, request_expiry_hours, payout_hold_hours, geo_fuzz_meters, feature_flags) — currently all DB-only with no UI. super_admin RLS already allows the UPDATE.

### 4.12 Sign-in `/(auth)/sign-in` + `/api/session` (working → session refresh)
- **Fix:** hourly forced re-login (access cookie capped 1h; refresh token stored but never used). See §7.

---

## 5. Hotel dashboard — feature spec

### 5.1 Sign-in (buggy → refresh) & Layout (working → cached)
- **Fix #1 (highest-impact "it's broken"):** **hourly logout** — same root cause as admin (§7).
- **Fix #2 (perf):** `getHostSession()` runs `auth.getUser` + role + host_profiles (+ hotel_staff) lookups and is **called twice per page** (layout + page), with `force-dynamic` everywhere → 6–10 privileged round-trips per navigation. Wrap in React `cache()` per request.

### 5.2 Overview `/` (partial → actionable front desk)
- **Bugs to fix:** (1) **unread-message KPI never decreases** — nothing ever sets `messages.read_at`; fixed by §5.5 mark-read. (2) **occupancy math wrong** — denominator uses current total inventory × days while numerator counts only check-ins within the month, excluding multi-night carryover. Recompute with proper room-night overlap (and replace with `host_dashboard_summary()` §6 M-11). (3) conversations `.limit(500)` then huge `IN` list — breaks >500 convos; move counting server-side via the summary RPC. (4) **UTC "today"** (`toISOString()`) rolls late-evening Algeria (UTC+1) arrivals to the wrong day — compute in `Africa/Algiers`. (5) pending-action links use plain `<a>` → `next/link`.
- **Adds:** today's arrivals/departures as an **actionable worklist** (check-in/out buttons inline, §5.3), not a static count.

### 5.3 Reservations `/reservations` (buggy → core desk workflow)
- **Bugs to fix:** (1) **Reception Accept/Decline is broken** — UI shows Accept/Decline for every `requested` booking unconditionally, but `accept_booking_request`/`decline_booking_request` require manager/admin; reception gets a raw `FORBIDDEN`. **Decision (recommend option A):** hide Accept/Decline from reception in the UI and stop advertising it in the staff legend. *(Option B — relax the RPC to `can_act_on_property('reception')` — only if the owner wants reception to accept; that's a backend change + policy call, see §9.)* Either way, never surface raw `FORBIDDEN`; map to a friendly localized error. (2) **No check-in/out/no-show actions** — the entire arrival/departure workflow is missing though the trigger guard + RLS permit the transitions. Add via **§6 M-12 RPCs** `check_in_booking`/`check_out_booking`/`mark_no_show` + UI buttons (reception-allowed). (3) **Guest-name search is fake** — DB query is `.ilike('code', q)` only, then client-filters names over the first 100 code-matched rows → name search never works; do it in the query. (4) `.limit(100)` no pagination → real pagination. (5) No way to open conversation/detail from a row — wire `startConversation`/`get_or_create_conversation` and a booking-detail link.
- **Adds:** **booking detail page** (full money breakdown, guest contact, special requests, "Open conversation"); cancel flow shows the **refund quote** (`quote_refund`) before committing, in a `ConfirmDialog`; compact table option via `DataTable`.

### 5.4 Calendar `/calendar` (buggy → correct)
- **Bug to fix (critical):** **off-by-one / single-day failure.** `set_availability_range` treats `p_to` as **exclusive** (`while v_d < p_to`, raises `INVALID_RANGE` when `p_to <= p_from` — confirmed in functions.sql). `CalendarBoard` passes the inclusively-selected end date straight through, so (a) the last selected day is never updated and (b) a single day (`from===to`) always errors. **Fix:** send `p_to = end + 1` (exclusive) from the action; allow `from===to`. Verify by closing one day and a 2-day range.
- **Other fixes:** opening a previously-closed range never restores `units_open` (RPC coalesces) — add a way to clear a price override / restore units (§6 M-13 note, small RPC tweak or explicit "clear" param). Localize the day-cell price (currently `toLocaleString('en-US')` → shared DZD formatter). Min-stay set on days is invisible → grid legend. Room-type picker uses plain `<a>` → `next/link`.
- **Rate plans:** currently read-only with a likely **weekday-mask decode bug** (`weekdayMaskLabels` assumes bit 0 = Sunday but schema comments "Sat..Fri") and a `*_dzd`-labeled percent value — confirm the mask orientation against how mobile authors plans (§9) before adding create/edit; ship read-only-but-correct first, then add CRUD.
- **Note (correct as-is):** reception writing availability (close/open/min-stay, no price) is allowed by `availability_reception_write` RLS; the action correctly strips price for reception.

### 5.5 Messages `/messages` (buggy → usable)
- **Bugs to fix:** (1) **messages never marked read** → add `mark_messages_read` on thread open (`messages_update` RLS permits it; §6 M-14 if an RPC is cleaner) — this clears the stuck Overview badge. (2) **No unread counts in the inbox** → add per-conversation unread badges. (3) **`startConversation` unreachable** → wire "Open conversation" from a booking. (4) Realtime only on the active conversation → subscribe the inbox list (bookings/notifications already in `supabase_realtime`).
- **Adds:** conversation search, attachments (`attachment_path`), auto-grow textarea, guest/booking context in thread header.

### 5.6 Properties `/properties` + `/properties/[id]` (partial → editable)
- **Bugs to fix:** room-type `count` includes inactive rooms (overstates) → filter `is_active`. `<img>` without dimensions (CLS) + plain `<a>` cards → `next/image` + `next/link`.
- **Adds (large gap):** **edit core property fields from web** (title/description/house rules/check-in-out times/cancellation tier/instant_book/amenities) — `properties_host_update` RLS already allows manager edits; only UI is missing. **Photo upload/reorder/cover** (storage + `property_photos` RLS support it). Property **create + submit-for-review** (`submit_property_for_review` RPC is unused; empty-state currently says "use the mobile app"). RoomTypeForm should also write `name_ar`/`name_fr` (today only `name_en`, so Arabic guests see English until edited on mobile) and allow setting `is_default`.
- **Fix UX:** RoomTypeEditor remove uses `window.confirm` → `ConfirmDialog`; add success toasts (today most mutations just `router.refresh()` with no confirmation).

### 5.7 Reviews `/reviews` (partial → complete)
- **Adds:** show 6 category sub-scores (fetched-but-hidden today); aggregate header (avg/count/distribution) via `property_review_stats` (needs safe access — §6 M-15); filter by property/rating + pagination; one-time host reply via `host_reply_review` (manager/owner). Reviews of suspended/pending properties are invisible to the host by RLS design — note in §9 if hosts should see them.

### 5.8 Analytics `/analytics` (buggy → secure + correct)
- **Bugs to fix (security-critical):** (1) `mv_host_performance` is queried by the user-token client but **no GRANT exists**, so KPIs silently render "—" (and `perfRes.error` is swallowed — stop swallowing it). (2) A naive blanket GRANT would **leak cross-host financials** because MVs bypass RLS (the app-side `.eq('host_profile_id', …)` is not a security boundary). **Fix:** expose via **SECURITY DEFINER RPC `host_dashboard_summary()` / `host_performance()` scoped to `my_host_id()`** (§6 M-11/M-15) — never a raw MV grant. (3) Occupancy/conversion math wrong (same overlap + created-at-vs-check-in issues as Overview) → recompute; use `mv_conversion_funnel` (created-at based) for conversion. (4) bookings `.limit(2000)` silently truncates large hosts.
- **UX:** reception's lone occupancy tile feels broken → give reception a small but real summary (arrivals/departures/occupancy) or hide the page for reception. Charts get axis values/tooltips/totals.

### 5.9 Payouts `/payouts` (partial → clear) & 5.10 Staff `/staff` (buggy → invite flow)
- **Payouts:** read-only and empty until admin runs `run_payouts` — add an explainer distinguishing "never earned" vs "not yet processed"; surface `statement_path` PDF download (bucket + RLS exist); **mask `destination_rib`** (PII currently shown in full); date-range + pagination.
- **Staff:** (1) **add-staff is practically unusable** — requires pasting the member's raw auth UUID; no owner has that. Replace with **email/phone invite flow** using existing `invite_token`/`invited_at`/`accepted_at` columns via **§6 M-16 `invite_hotel_staff(email, role)` + `accept_staff_invite(token)`** (valid `staff_invited` notification already exists in the CHECK set). (2) No remove/role-change despite RLS support → add via `hotel_staff_owner_update/_delete`. (3) **Status mislabel** — `!is_active` shows "Invited" but `add_hotel_staff` always inserts `is_active=true`, so a removed member is wrongly "Invited" → fix labels (Active/Inactive/Invited driven by `accepted_at`). (4) **Capability legend lies** (claims reception can accept/decline + check-in/out) → align to §5.3 reality. "Period" column is actually the accepted/join date → relabel.

### Reception-vs-Manager capability matrix (final, post-fix)

| Capability | Reception | Manager | Owner |
|---|---|---|---|
| View bookings | ✅ | ✅ | ✅ |
| Accept / decline requests | ❌ (hidden; RPC requires manager) | ✅ | ✅ |
| Check-in / check-out / no-show | ✅ (after M-12) | ✅ | ✅ |
| Cancel booking (with refund quote) | ❌ | ✅ | ✅ |
| Availability close/open/min-stay | ✅ | ✅ | ✅ |
| Price override on calendar | ❌ (stripped) | ✅ | ✅ |
| Edit room types / rate plans | ❌ | ✅ | ✅ |
| Edit property fields / photos | ❌ | ✅ | ✅ |
| Messages (read/send/mark-read) | ✅ | ✅ | ✅ |
| Reviews: read / reply | read | read+reply | read+reply |
| Payouts / earnings | ❌ | ✅ | ✅ |
| Analytics | occupancy summary only | ✅ | ✅ |
| Staff management | ❌ | ❌ | ✅ |

---

## 6. Backend additions needed (minimal — schema already covers most)

Each is small and audited. Group into ~3 migrations. The admin-moderation RPCs replace today's raw table mutations (which write inconsistent/no audit).

- **M-1 — notifications.type CHECK extend (migration).** Add `account_suspended`, `account_reactivated`, `host_verified`, `host_rejected`, `account_update` to the constraint at schema.sql 667–674. Update admin actions: suspend/unsuspend→`account_suspended`/`account_reactivated`; verifyHost→`host_verified`; **force-cancel→ existing `booking_cancelled`** (don't invent `booking_cancelled_admin`). *Unblocks the 4 "success looks like failure" bugs.*
- **M-2 — `approve_property` / `reject_property(reason, note)` / `suspend_property(reason)`** SECURITY DEFINER RPCs: status + `reviewed_by` + audit + valid notification, guarded on current status.
- **M-3 — `set_host_verification(host_id, identity_status, payout_status, reason)`** + **`kyc_doc_signed_url(host_id)`** accessor (mint signed URL for private `kyc-docs`); audited. (Optional hard-suspend enforcement noted for §9.)
- **M-4 — `moderate_review(review_id, action)`** (hide/remove/restore; sets `published_at` on restore) + audit.
- **M-5 — `resolve_dispute(dispute_id, status, resolution_note, refund_amount_dzd?)`** : writes `refund_amount_dzd`, issues refund txn for `category='refund'`, guards non-final status, audit + `dispute_resolved` notification.
- **M-6 — `mark_payout_paid(payout_id, reference, statement_path)`** + `generate_payout_statement` (or populate `statement_path` in `run_payouts`); audited + payout txn.
- **M-7 — Convert `property_types.id` and `amenities.id` to identity/sequence** (migration) to kill the `max(id)+1` race; backfill sequence to `max(id)+1`.
- **M-8 — `admin_dashboard_summary()`** (single jsonb: today's GMV, pending-approval, open-dispute, awaiting-payment counts) + optional `admin_pending_properties` view.
- **M-9 — `trigger_refresh_analytics()`** admin-callable wrapper (or scheduled job) so MV KPIs aren't silently stale + expose last-refresh time.
- **M-10 — Index `audit_log (action, created_at desc)`** for the activity feed.
- **M-11 — `host_dashboard_summary()`** SECURITY DEFINER, scoped to `my_host_id()` (occupancy %, ADR, RevPAR, arrivals/departures today, revenue MTD).
- **M-12 — `check_in_booking` / `check_out_booking` / `mark_no_show`** guarded RPCs (reception-allowed) for confirmed→checked_in→completed and confirmed→no_show, with stamps + notifications.
- **M-13 — `set_availability_range` clear-override support** (small param/coalesce tweak so an existing `price_override`/custom `units_open` can be cleared). *(Note: the off-by-one is a client fix in §5.4, not a migration.)*
- **M-14 — `mark_messages_read(conversation_id)`** RPC (if cleaner than a direct RLS UPDATE) so unread badges work.
- **M-15 — `host_performance()` / per-host review-stats accessor** SECURITY DEFINER over `mv_host_performance` / `property_review_stats`, scoped to `my_host_id()` — **never a blanket MV grant**.
- **M-16 — `invite_hotel_staff(email, role)` + `accept_staff_invite(token)`** using existing `invite_token`/`invited_at`/`accepted_at`; valid `staff_invited` notification.

Deferred / decide later (not blocking): `listing_views`/`analytics_events` ingest so `mv_conversion_funnel.listing_views` (hardcoded 0) becomes real; `host_create_manual_booking(...)` for walk-ins; realtime publication for `conversations`/`disputes`/`payouts`.

---

## 7. Cross-cutting fixes

- **Auth / session refresh (both apps, top priority).** Access cookie capped at 1h; the stored 30-day refresh token is never used, so users get bounced to sign-in ~hourly. Add a refresh path — either adopt `@supabase/ssr` or add `/api/session` refresh + `middleware.ts` that, on a missing/expired access cookie, exchanges the refresh token (`supabase.auth.setSession`/`refreshSession`) and re-sets the httpOnly cookie before `requireAdmin()`/`requireHost()`. Keep the secure-cookie-from-`x-forwarded-proto` fix.
- **Middleware defense-in-depth.** Add `middleware.ts` to both apps as a coarse auth gate so a new route that forgets `requireAdmin()`/`requireHost()` isn't unprotected (per-page checks stay authoritative).
- **Data fetching.** Wrap `getHostSession()`/`requireAdmin()` session resolution in React `cache()` (called twice per page today). Move list counting/aggregation server-side (kill the conversations `.limit(500)` + huge `IN`). Replace every hard `.limit()` with real pagination (admin: `/users /bookings /payments /reviews /disputes /audit`; hotel: `/reservations /messages /reviews /payouts` + analytics windows). Resolve N+1 name lookups via joins where possible.
- **i18n / RTL.** Logical properties only across `@dyafa/ui`. Fix stale "Arabic is default" comments (admin `lib/i18n.ts`, hotel dashboard-i18n). Route the calendar price label and all currency through one DZD formatter. Fix sign-in/error/not-found locale read so direction doesn't flash (resolve `dir` server-side).
- **Time zone.** Compute "today"/month bounds in `Africa/Algiers` (UTC+1), not `toISOString()` UTC — affects Overview/Calendar/Analytics/arrivals.
- **Error / empty / loading.** Add `error.tsx` boundaries (branded `ErrorState` + Retry) to both apps — multi-query `Promise.all` reads (overview, payments, analytics) currently fall to Next's default unstyled error. Add root `loading.tsx` (admin Overview missing one). `DataTable` owns the 4 states; distinguish empty-no-data vs empty-filtered.
- **Toasts / confirmations.** Provide `ToastProvider` once per shell; async outcome→toast, validation→inline, destructive→`ConfirmDialog`. Never show raw RPC error strings (`INVALID_RANGE`, `FORBIDDEN`) — map to localized messages. Surface refund quote before cancel.
- **Navigation.** Replace plain `<a>` internal links with `next/link` (hotel Overview pending actions, properties cards, calendar room picker, room-type link).
- **Accessibility (WCAG 2.2 AA).** Radix gives focus trap/restore/escape; ensure 2px terracotta `focus-ring` + offset everywhere; `aria-current` on active nav; `aria-sort` on sortable headers; sticky header must not obscure focused rows; labels on all inputs; targets ≥24px (44px mobile); respect `prefers-reduced-motion`.
- **Responsiveness.** ≥1024 full shell + 2-col detail; 768–1024 sidebar→icons + single-column detail; <768 off-canvas drawer + **tables→stacked cards** (never horizontal-scroll a wide table on phone).
- **Button color semantics.** Approve/Verify/Save use `primary` or a `success` treatment, not the generic terracotta `accent`; reserve `accent` for the one CTA + prices + active states.

---

## 8. Build sequence (phased; each milestone independently testable by running locally + clicking through)

**Phase 0 — Backend unblock (parallel-safe, ship first).** M-1 (notifications CHECK) + the §5.4 calendar off-by-one client fix + M-7 (PK identity). *Verify:* suspend/verify/force-cancel show success not red error; close a single calendar day and a 2-day range; create two amenities back-to-back. These are pure-win bug fixes with no UI dependency.

**Phase 1 — `@dyafa/ui` foundation.** AppShell + Sidebar + TopBar → Button/Card/Pill/Input/Select/FormField → Toast/ConfirmDialog/Modal → DataTable/FilterBar/EmptyState/Skeleton → StatCard/Tabs/SegmentedControl. Migrate admin `/moderation` (list→DataTable) and `/moderation/[id]` (→PageHeader detail) **into AppShell as the reference implementation**. *Verify:* moderation now matches the rest of the app; toasts/confirms work; RTL passes in `ar`.

**Phase 2 — Cross-cutting platform.** Session refresh + middleware (both apps); React `cache()` on session; `error.tsx`/`loading.tsx`; real pagination wired through DataTable; TZ + DZD formatter + plain-`<a>`→`next/link`. *Verify:* stay logged in past 1h; paginate every list; no unstyled error screens.

**Phase 3 — Admin features.** Roll AppShell + the §4 fixes across all admin routes; add Listings (4.3) + M-2; Users/host-verification (4.4) + M-3; Payments KPI fix + M-6; Disputes outcomes (4.7) + M-5; Reviews (4.8) + M-4; CMS image upload + category select + collection picker (4.9); Roles + Settings (4.11) gated by primaryRole; Audit pagination + M-10; Overview drill-downs + M-8/M-9. *Verify:* click every admin action end-to-end; confirm audit log fills.

**Phase 4 — Hotel features.** Roll AppShell across hotel; check-in/out/no-show (5.3) + M-12; messaging mark-read/unread/open-conversation (5.5) + M-14; calendar clear-override (5.4) + M-13; property editing + photos + create/submit (5.6); reviews category scores + aggregate (5.7) + M-15; analytics secure summary (5.8) + M-11; payouts statement/RIB-mask (5.9) + M-6; staff invite flow (5.10) + M-16; Overview actionable worklist + summary (5.2). Fix the reception capability matrix everywhere. *Verify:* run reception and manager logins; confirm the matrix; perform a real check-in.

**Phase 5 — Polish & a11y pass.** Command palette (`⌘K`), charts with axes/tooltips, density toggles, reduced-motion audit, full keyboard/contrast/focus sweep against the §10 acceptance checklist on every page.

---

## 9. Open questions for the owner

1. **Reception accept/decline:** hide it from reception (recommended, no backend change) or relax `accept_booking_request`/`decline_booking_request` to allow `can_act_on_property('reception')`? This is a policy decision.
2. **Suspend enforcement:** should suspending a user (`is_active=false`) actually block sign-in/actions now (needs an RLS/auth-hook change), or remain a soft flag for v1?
3. **Transaction/dispute refunds:** should `markTransactionRefunded` and `resolve_dispute(refund)` trigger a **real provider refund** (Chargily), or stay bookkeeping-only with the actual refund handled out-of-band?
4. **Rate-plan weekday mask:** confirm the bit orientation (schema comment "Sat..Fri" vs the dashboard's bit-0=Sunday assumption) before we build rate-plan CRUD — which is authoritative, mobile or the comment?
5. **`custom_access_token_hook`:** is it configured in this VPS/Supabase env? Admin force-cancel and `run_payouts` depend on `app_roles` in the admin JWT; if not, those RPCs return `FORBIDDEN`.
6. **listing_views tracking:** invest in a `listing_views`/`analytics_events` ingest path so the conversion funnel (hardcoded 0 today) is real, or keep conversion hidden until then?
7. **Host visibility of non-approved reviews:** should hosts see reviews on suspended/pending properties (currently hidden by RLS), or is hidden correct?
8. **Manual/walk-in bookings:** do hotel owners need `host_create_manual_booking` for offline guests in this phase, or defer?

---

Key file references for implementers: tokens at `C:\Users\debai\Desktop\1275\packages\design-tokens\src\tokens.ts`; the notification CHECK at `C:\Users\debai\Desktop\1275\supabase\migrations\20260531120100_schema.sql` (lines 667–674); the availability RPC at `C:\Users\debai\Desktop\1275\supabase\migrations\20260531120200_functions.sql`; calendar client at `C:\Users\debai\Desktop\1275\apps\hotel\app\(dashboard)\calendar\CalendarBoard.tsx` + `actions.ts`; the reference moderation page to migrate at `C:\Users\debai\Desktop\1275\apps\admin\app\moderation\page.tsx`.