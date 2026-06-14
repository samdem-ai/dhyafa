## Overview
hotel

## Routes

### `/(auth)/sign-in` — **buggy**
Email+password sign-in; client signs in with anon Supabase, then POSTs tokens to /api/session for httpOnly cookie bridge. Server requireHost() re-checks role.

**Bugs:**
- No token-refresh anywhere in the app: the access-token cookie is capped at 1h (route.ts accessMaxAge = min(expires_in, 3600)) and nothing ever uses the 30-day refresh cookie to mint a new access token. After ~1h getHostSession() finds no access cookie and requireHost() redirects to /sign-in — the user is silently logged out every hour. There is no middleware or refresh route. This is the single biggest 'it keeps logging me out / not working' driver.
- Pre-check reads user_roles via the in-memory anon session before the cookie exists; if RLS hides the row the code intentionally proceeds, so a non-host can briefly pass the client gate (server requireHost still blocks — acceptable but the UX shows a flash).
- No 'forgot password', no resend, no rate-limit feedback; bad-credentials and not-host are the only two error states.

**UX:**
- Locale on sign-in is read from cookie only on the client (resolveLocaleFromCookie) so the marketing aside can flash the wrong direction on first paint.
- No loading state on the social/feature column; otherwise visually polished.

### `/(dashboard) [layout]` — **working**
Gates the whole group via requireHost('/'), resolves locale + capability flags (canManage/isOwner/staffRoleLabel), renders Sidebar shell.

**Bugs:**
- export const dynamic='force-dynamic' on every page plus per-request adminSupabase.auth.getUser(token) + 3 service-role lookups in getHostSession() on EVERY navigation — getHostSession is called twice per page (once in layout, once in the page) doubling the auth round-trips. No caching (e.g. React cache()) so each dashboard view fires 6+ privileged auth/role/profile queries.

**UX:**
- Capability gating is correct as an affordance, but it advertises features that are not actually wired (see Reservations / capability matrix mismatch).

### `/(dashboard)/ (Overview)` — **partial**
Landing KPIs: check-ins/check-outs today, occupancy %, net revenue this month, pending-actions queue (requests + unread messages), upcoming reservations.

**Bugs:**
- Unread-message KPI never decreases: messages are counted with read_at IS NULL AND sender_id<>me, but NO screen ever sets messages.read_at (MessagesClient opens a thread without marking read; no mark_messages_read RPC is called). The 'N unread guest messages' pending action is therefore permanently stuck.
- Occupancy denominator uses CURRENT total inventory_count * daysInMonth across ALL active room types, while the numerator (booked room-nights) is filtered by check_in within the month only — multi-night stays that started last month but occupy this month are excluded, and inventory added/removed mid-month skews it. Occupancy is at best a rough estimate, often misleading.
- Conversations are fetched with .limit(500) then messages counted via .in('conversation_id', convoIds) — breaks for hosts with >500 conversations and sends a huge IN list.
- Check-ins/check-outs KPIs are informational only — there is no action anywhere to actually perform a check-in or check-out (see cross-cutting).

**UX:**
- Pending-action links use plain <a> (full page reload) instead of next/link.
- No date/time-zone indicator; 'today' is computed in UTC (todayIso uses toISOString) so for Algeria (UTC+1) late-evening arrivals can roll to the wrong day.

### `/(dashboard)/reservations` — **buggy**
Filterable/searchable booking list (?status=&q=) with per-row Accept/Decline/Cancel actions.

**Bugs:**
- RECEPTION ACCEPT/DECLINE IS BROKEN. The page shows Accept/Decline for every 'requested' booking regardless of capability (showActions includes narrowed==='requested' unconditionally) and actions.ts comment claims 'Accept/decline is allowed for reception too'. But accept_booking_request / decline_booking_request RPCs require can_act_on_property(..., 'manager') OR is_staff() (admin). A reception user clicking Accept gets FORBIDDEN from the RPC, surfaced as a raw error. The documented capability matrix (stfCapReception: 'accept/decline requests') is false.
- No check-in / check-out / no-show actions at all. confirmed→checked_in, checked_in→completed, confirmed→no_show are permitted by the trigger guard and bookings_update RLS, but there is no UI or action to do them. Core reception-desk workflow is missing.
- Guest-name search is post-filtered client-side over only the rows already returned by the code-only ilike DB query (.ilike('code', q)); a guest-name search that doesn't also match a code returns 0 rows from the DB, so name search effectively never works unless the name happens to be in the first 100 code-matched rows.
- List capped at .limit(100) with no pagination — older reservations are invisible.
- No way to open the guest conversation or view full booking detail from a row (startConversation action exists in messages/actions.ts but is never wired here).

**UX:**
- Cards-in-a-list layout is heavy; no compact table option, no column sorting, no count.
- Cancel reason is required but there is no confirmation summary of refund amount (quote_refund exists but is not surfaced before cancelling).
- Filter select fires router.replace on every change (ok) but the search needs an explicit submit; inconsistent interaction.

### `/(dashboard)/calendar` — **buggy**
Per-room-type month grid of availability + bulk close/open/price-override/min-stay via set_availability_range; read-only rate-plan table.

**Bugs:**
- OFF-BY-ONE / SINGLE-DAY FAILURE (critical). set_availability_range treats p_to as EXCLUSIVE ('while v_d < p_to') and raises INVALID_RANGE when p_to <= p_from. CalendarBoard passes to = the user's inclusively-selected end date (to = rangeEnd ?? rangeStart) straight through actions.setAvailabilityRange. Result: (a) the LAST selected day is never updated; (b) selecting a SINGLE day (from===to) always fails with an RPC error ('INVALID_RANGE'). The action even allows from===to (only rejects from>to), so the failure is guaranteed. Bulk close/open is silently one day short and single-day blocking is impossible.
- set_availability_range INSERTs availability rows with units_open = room_types.inventory_count and on conflict only coalesces is_closed/price/min_stay — opening a previously-closed range never restores units_open to a custom value, and closing doesn't zero units_open (relies on is_closed flag only). Effective-availability still works via is_closed, but units_open drift is possible.
- Reception can open the calendar and the Close/Open buttons are shown (only the price field is hidden). availability_reception_write RLS DOES allow reception to write availability, so this is consistent — but the action strips price for reception correctly; OK. The min-stay write by reception is allowed by RLS too. (No bug, noted for completeness.)
- Room-type picker uses plain <a href> per room → full reload on every room switch.

**UX:**
- Price override shown on a day cell uses override.toLocaleString('en-US') (raw number, no DZD, always en-US grouping) — inconsistent with formatDZD used elsewhere and ignores locale.
- No way to clear a price override (passing empty leaves it; the RPC coalesces so an existing override can never be removed from the UI).
- No legend for min-stay; min-stay set on days is invisible on the grid.
- Selecting a range across a month boundary is awkward (must navigate; selection persists but the grid only shows one month).

### `/(dashboard)/properties` — **partial**
Grid of the host's properties (RLS-scoped) with cover, status, wilaya, room-type count, rating.

**Bugs:**
- room_types ( count ) counts ALL room types incl. inactive/soft-removed ones, so the 'N room types' badge overstates the live count (detail page filters is_active, list does not).
- No way to create a property from the web at all (empty-state copy says 'create from the mobile app'); submit_property_for_review RPC exists but is unused — a host with only draft listings can do nothing here.

**UX:**
- Uses <img> with no width/height (CLS) and plain <a> cards (full reload).
- No filter/sort by status; a host with many listings can't filter to drafts/pending.

### `/(dashboard)/properties/[id]` — **partial**
Property detail: header/status, photo gallery, description, room-type list with inline price/inventory editor (RoomTypeEditor) + add room (RoomTypeForm), amenities. Reception read-only.

**Bugs:**
- Title, description, address, house rules, check-in/out times, cancellation tier, instant_book, amenities and photos are ALL read-only — none can be edited from the dashboard (properties_host_update RLS would allow manager edits). The only editable property data is room-type base/weekend price + inventory. For a 'property-manager dashboard' this is a large functional gap.
- No photo upload/reorder/cover management despite storage buckets + property_photos RLS supporting it.
- createRoomType never sets is_default; if a property somehow has no default room type the booking/pricing fallbacks that assume a default are unaffected here, but newly created rooms can never be made default from the UI.

**UX:**
- Gallery has no lightbox; cover star is tiny.
- Read-only notice for reception is a single info banner; individual controls just disappear, which can read as 'missing' rather than 'restricted'.

### `/(dashboard)/properties/[id] RoomTypeForm (Add room type)` — **working**
Inline create-room-type form (manager/owner) → createRoomType server action → RLS-scoped insert.

**Bugs:**
- Only name_en is written (name_ar/name_fr left null); for an Arabic-default platform the room shows the English name to Arabic guests until edited elsewhere (mobile). bed_config, size, max_adults/children, extra_guest_fee, cleaning default 0 — limited.
- Validation requires base>0 client+server; consistent. No server check that maxOccupancy/baseOccupancy fit DB smallint ranges (fine for realistic values).

**UX:**
- No success toast (form just closes + router.refresh); the new room appears but with no confirmation.

### `/(dashboard)/properties/[id] RoomTypeEditor (inline price/inventory)` — **working**
Edit base/weekend price + inventory (manager/owner) → updateRoomType; soft-remove (is_active=false) with last-room guard + window.confirm.

**Bugs:**
- Lowering inventory_count below the count of overlapping live bookings is not validated (DB has no guard on update); could let a manager oversell-correct in a way that breaks single-unit assumptions, but no integrity error is surfaced.
- updateRoomType writes updated_at manually though a trg_set_updated_at_room_types trigger already does it — harmless redundancy.

**UX:**
- Remove uses window.confirm (not the design-system modal) — jarring vs the rest of the polished UI.
- 'Saved' status text is transient state only (savedAt) with no auto-dismiss; minor.

### `/(dashboard)/calendar (rate plans table)` — **partial**
Read-only list of base/weekend/seasonal/long-stay rate plans for the selected room.

**Bugs:**
- Entirely read-only: no add/edit/deactivate rate plan (calAddRatePlan string exists but no UI). weekdayMaskLabels assumes bit 0 = Sunday, but schema comments the mask as 'Sat..Fri' — the weekday decode is likely shifted/wrong relative to how rate plans are authored on mobile.
- Percent adjust display shows raw adjust_value_dzd as a % (e.g. '+10%') but the column is named *_dzd; if mobile stores percent in a different field this label is misleading.

**UX:**
- Plain HTML table not using the shared TableCard/Th/Td primitives, so styling/RTL is inconsistent with Staff table.

### `/(dashboard)/messages` — **buggy**
Inbox (server-loaded conversations) + client thread with realtime INSERT subscription; send via send_message RPC.

**Bugs:**
- Messages are NEVER marked read. Opening a conversation only loads + subscribes; there is no UPDATE of read_at (no mark_messages_read RPC, though messages_update RLS would permit it). Consequence: Overview's unread badge never clears and there is no per-conversation unread indicator.
- No unread badges/counts in the conversation list at all — can't tell which threads need attention.
- startConversation/get_or_create_conversation is implemented in actions.ts but unreachable from the UI — a host cannot initiate a conversation with a guest from a booking.
- Realtime only subscribes to the ACTIVE conversation; new messages in other conversations don't bump the list or last_message_at live (list is server-rendered once). The Overview's 'live' claim is overstated; bookings/notifications realtime (published) is not used anywhere.
- Optimistic send appends a temp message; if the realtime event for staff is filtered out by RLS timing, dedupe relies on id match — generally OK but tmp-id rows can linger if the RPC returns '' (data not a string).

**UX:**
- No conversation search/filter; capped at 100.
- Attachments (messages.attachment_path exists) unsupported.
- Textarea is rows=1 with resize-none and no auto-grow; long messages are cramped.
- No avatars or guest context (property/booking code) in the thread header.

### `/(dashboard)/reviews` — **partial**
Published reviews for the host's approved properties with a one-time host reply (manager/owner) via host_reply_review.

**Bugs:**
- Only shows reviews of APPROVED properties (RLS reviews_public_read requires the property to be approved OR caller is author/admin; host is neither). Reviews for suspended/pending properties are invisible to the host.
- Only renders overall stars; the 6 category scores (cleanliness/accuracy/communication/location/value/checkin) stored on the row are fetched-but-not-shown — no breakdown.
- No aggregate header (avg rating / count / distribution); property_review_stats MV exists but is unused (and like other MVs is not granted to authenticated).
- No 'report review' affordance though report_review RPC exists.

**UX:**
- No filter by property or rating; capped at 100, no pagination.
- Reception sees the list with no indication replies are manager-only (reply button just absent).

### `/(dashboard)/analytics` — **buggy**
KPIs (occupancy, ADR, conversion, avg rating) + MV stats (gmv, bookings, response/cancel rate) + revenue/bookings columns, top room types, review trend. Reception: occupancy only.

**Bugs:**
- mv_host_performance is queried by the user-token (authenticated) client but NO 'grant select' exists for any analytics MV (only favorites + properties_public views are granted in the views migration). authenticated almost certainly gets 'permission denied for materialized view mv_host_performance'; perfRes.error is ignored, so avg_rating/gmv/bookings/response_rate/cancellation_rate KPIs silently render '—' on every host's dashboard.
- SECURITY: if that grant is added naively, materialized views bypass RLS — the page filters by .eq('host_profile_id', session.hostProfileId) in app code only, so any authenticated user could read ANY host's gmv/response-rate by querying the MV with a different id. Needs a SECURITY DEFINER accessor or per-host view, not a blanket grant.
- Occupancy denominator = current totalUnits * daysInWindow (≈ full 6-month window) but numerator only counts bookings whose check_in is within the window — long/edge stays are mis-bucketed and inventory changes over 6 months are ignored, so occupancy% is unreliable.
- Conversion% = realized/total over bookings whose check_in>=windowStart (not bookings CREATED in window), conflating future-dated bookings; mv_conversion_funnel (created-at based) is the correct source but is unused.
- bookings query .limit(2000) with no host filter relies entirely on RLS; for large hosts the cap silently truncates analytics.

**UX:**
- Reception view is a single lonely occupancy tile (which itself is the unreliable estimate) — feels broken/empty.
- Charts have no y-axis values, no tooltips beyond title attr, no totals/deltas; 'flat' compared to the rest of the polish.

### `/(dashboard)/payouts` — **partial**
Payout statements (owner/manager; reception gated) with total-paid/pending tiles and gross→commission→net breakdown.

**Bugs:**
- Read-only and depends entirely on run_payouts (admin-only) having been run; a host with confirmed bookings but no generated payout sees only an empty state with no explanation of WHEN/HOW payouts are created.
- statement_path (PDF in payout-statements bucket) is not surfaced — no download link for the statement, though the bucket + RLS exist.
- destination_rib displayed in full (unmasked) — potential PII exposure on screen.

**UX:**
- No date-range filter; capped at 100.
- No empty-vs-not-yet-generated distinction; 'No payouts yet' is ambiguous (could mean 'never earned' or 'not yet processed').

### `/(dashboard)/staff` — **buggy**
List hotel_staff (owner-only) and add a member via add_hotel_staff(user_id, role).

**Bugs:**
- ADD-STAFF IS PRACTICALLY UNUSABLE. AddStaffForm requires pasting the member's raw auth user UUID (stfUserIdHint: 'Paste the member's account UUID'). There is no email/phone lookup, and no owner has another user's UUID. The schema has invite_token/invited_at/accepted_at for an email-invite flow that is completely unimplemented; add_hotel_staff also requires the user to already exist as a Dyafa account.
- No way to deactivate/remove a staff member or change their role from the UI (hotel_staff_owner_update/_delete RLS exist; no action calls them). Once added, staff are permanent from the dashboard's perspective.
- Status column labels !is_active as 'Invited' (stfInvited) — but add_hotel_staff always inserts is_active=true with accepted_at=now(), so 'Invited' never appears and is_active=false (a removed member) would be mislabeled 'Invited' rather than 'Inactive'.
- Capability legend (stfCapReception) advertises reception can 'check-in/out' and 'accept/decline requests' — both are false in the actual app (no check-in UI; accept/decline RPC rejects reception).

**UX:**
- Period column header reuses poPeriod ('Period') for what is actually the join/accepted date — mislabeled.
- No search; UUID input is error-prone with only a regex validity check.

## Cross-cutting bugs
- AUTH/SESSION: No refresh-token rotation. /api/session stores a 30-day refresh cookie but nothing ever exchanges it; the access cookie maxAge is capped at 1h and getHostSession() only reads the access cookie. After ~1 hour every user is bounced to /sign-in mid-session. This is the most likely root cause of the 'buggy/keeps logging out' complaint. Needs a refresh path (middleware or a /api/session refresh that calls supabase.auth.setSession/refreshSession).
- DATA FETCHING: getHostSession() runs adminSupabase.auth.getUser(token) + a user_roles query + host_profiles query (+ maybe hotel_staff) on EVERY request, and is invoked twice per page (layout + page) with no React cache()/memoization. Every dashboard navigation = 6-10 privileged round-trips. Should be wrapped in cache() per request.
- CAPABILITY MATRIX MISMATCH: The app advertises (sidebar gating + staff legend) that reception can accept/decline bookings and do check-in/out, but (a) accept/decline RPCs require manager and reject reception, and (b) no check-in/out UI exists. The reception role is effectively read-only for operations despite being marketed as the front-desk role.
- MISSING BOOKING LIFECYCLE: confirmed→checked_in, checked_in→completed, confirmed→no_show are supported by the trigger guard + bookings_update RLS but have NO server action and NO UI anywhere. The entire arrival/departure desk workflow is absent; Overview check-in/out KPIs are decorative.
- ANALYTICS MV ACCESS: mv_host_performance (and all mv_* / property_review_stats) have no GRANT SELECT to authenticated, so the user-token client can't read them — analytics secondary KPIs silently blank. And materialized views bypass RLS, so a blanket grant would leak cross-host financials (app-side .eq filter is not a security boundary).
- REALTIME: Only messages (active conversation) uses realtime. bookings + notifications + availability are in the supabase_realtime publication but no screen subscribes — new requests/messages/calendar changes don't appear live; Overview/Reservations require manual refresh. read_at is never written so unread state is permanently stale.
- TIME ZONE: 'today'/month bounds computed via toISOString() (UTC) across Overview/Calendar/Analytics. Algeria is UTC+1, so late-evening operations can land on the wrong calendar day for check-in/out counts and availability edits.
- PERFORMANCE/SCALE: Hard .limit() caps with no pagination on reservations(100), messages(100), conversations(500), reviews(100), payouts(100), analytics bookings(2000); guest/property/room names resolved via separate .in() lookups per page (N+1-ish). Large hosts silently lose data.
- RTL/i18n: Fully translated (ar/fr/en) and mostly RTL-aware (logical spacing, <bdi>, rtl: utilities). Exceptions: calendar day-cell price uses toLocaleString('en-US') (ignores locale/DZD); dashboard-i18n header comment falsely says Arabic is default (DEFAULT_LOCALE is 'en' per spec). Sign-in/error/not-found read locale from cookie client-side → possible direction flash.
- NAVIGATION: Many internal links use plain <a href> (Overview pending actions, properties cards, calendar room picker, room-type calendar link) causing full page reloads instead of next/link client transitions.
- FEEDBACK/CONFIRMATIONS: Inconsistent — RoomTypeEditor remove uses window.confirm; most successful mutations only router.refresh() with no toast; cancel-booking doesn't show the refund quote before committing; raw RPC error.message is shown to users on the 'rpc_failed' path (e.g. 'INVALID_RANGE', 'FORBIDDEN').

## Missing features
- Email/phone-based staff invitation flow (use invite_token/invited_at; let owner invite by email instead of pasting a UUID) + deactivate/remove staff + change staff role.
- Check-in / check-out / no-show actions on reservations (direct bookings UPDATE through a guarded server action) — the core front-desk workflow.
- Booking detail view (per-reservation page) with full money breakdown, guest contact, special requests, and an 'Open conversation' button (wire startConversation).
- Mark-messages-read (so unread badges work) + per-conversation unread counts + a conversation-level realtime/list refresh; message attachments.
- Editing core property fields from the web (title/description/house rules/check-in-out times/cancellation tier/instant_book) and photo upload/reorder/cover management.
- Rate-plan create/edit/deactivate UI (currently read-only) and a way to clear a price override / restore units_open on the calendar.
- Property creation + submit-for-review from the web (submit_property_for_review RPC is unused).
- Review enhancements: category-score breakdown, aggregate rating header (use property_review_stats), filter by property/rating, report-review.
- Payout statement PDF download (statement_path), RIB masking, and an explanation of the payout schedule when none exist.
- Notifications surface (bell): notifications table + mark_notifications_read RPC exist but there is no notifications UI in the dashboard.
- Pagination / infinite scroll across all list pages (reservations, messages, reviews, payouts) and analytics windows.
- A reception-appropriate dashboard: today's arrivals/departures as an actionable worklist rather than a static count.

## Top priorities
1. Fix the hourly logout: implement access-token refresh (middleware or a refresh endpoint using the stored refresh cookie + supabase.auth.setSession), so sessions survive past 1h. Highest-impact 'it's broken' fix.
2. Fix the calendar off-by-one / single-day failure: send p_to as end+1 (exclusive) from CalendarBoard/actions so the last selected day is included and single-day close/open works (currently always errors with INVALID_RANGE).
3. Reconcile reception capability with reality: either (a) allow reception accept/decline by relaxing the RPC to can_act_on_property('reception'), or (b) hide accept/decline from reception in the UI — and stop advertising it. Show a clean error instead of raw RPC messages.
4. Add the missing booking lifecycle actions (check-in / check-out / no-show) with a guarded server action; make Overview's check-in/out KPIs actionable. This is the front-desk workflow the dashboard exists for.
5. Fix analytics MV access securely: expose host performance via a SECURITY DEFINER RPC (or a per-host RLS-checked view) instead of a raw MV read; stop silently swallowing perfRes.error. Today the secondary KPIs are always blank.
6. Make messaging usable: mark messages read on open (clears the stuck unread badge), add unread counts in the inbox, and wire 'Open conversation' from a booking; consider realtime for the inbox list.
7. Replace UUID-only add-staff with an email/phone invite flow and add remove/role-change; fix the 'Invited' vs 'Inactive' status mislabel.
8. Add property editing + photo management from the web (title/description/rules/times/policy + photos), so managers aren't forced back to mobile for everything beyond price/inventory.
9. Recompute occupancy/ADR/conversion correctly (proper room-night overlap math, created-at based conversion via mv_conversion_funnel) and localize the calendar price label; fix UTC→Africa/Algiers date boundaries.
10. Add pagination + better feedback (design-system confirm modals, success toasts, refund-quote preview before cancel) across the list/mutation flows; switch plain <a> internal links to next/link.
