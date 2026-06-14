## Overview
apps/admin is a Next.js 14 App Router admin console. It is FAR more complete and polished than the user's "plain/ugly + buggy" complaint implies: there is a real design system (components/ui.tsx, AdminShell with a deep-teal sidebar, StatCard/TrendPill/StatusPill/TableShell/EmptyState/ErrorState), a robust auth bridge (lib/auth.ts httpOnly-cookie + service-role role re-check), full RTL via CSS logical utilities, en/ar/fr inline i18n, loading.tsx skeletons on most routes, and audit logging on every privileged write. The architecture (server-component reads via service-role; Server Actions re-verify admin; user-JWT client for self-authorizing RPCs cancel_booking/run_payouts) is sound and matches the spec. The biggest CONCRETE functional defect is a systemic one: several Server Actions insert notifications with `type` values that are NOT in the notifications.type CHECK constraint (schema.sql lines 667-674), so suspend/unsuspend user, verify host, and admin force-cancel booking all fail their notification insert and return a 'partial' error to the operator even though the primary mutation succeeded — making working features LOOK broken. The second-biggest issue is purely visual/structural: the entire Moderation section (the flagship admin flow) does NOT use AdminShell — it renders a bespoke bg-primary top bar with NO sidebar, so it looks like a different, plainer app than every other page. Beyond those, most routes are working with smaller bugs and UX gaps (no image-upload UI in CMS, property-UUID-paste-only collection management, no error.tsx boundaries, a few status/RPC edge-case mismatches).

## Routes

### `/ (app/page.tsx) — Overview / KPI dashboard` — **working**
Platform KPIs (bookings, GMV, commission, conversion, active listings, new users) over a ?range= window, with SVG bar/line charts, backed by mv_daily_metrics + mv_conversion_funnel and live property counts.

**Bugs:**
- Trend pills compare second-half vs first-half of the range from already-fetched daily rows — fine, but trendOf returns null for <4 days so 7d-ish ranges may show no trend silently.
- Reads MVs (mv_daily_metrics, mv_conversion_funnel) which only reflect data as of the last refresh_analytics() run; if pg_cron/Edge refresh isn't wired in this environment the dashboard shows stale/zero numbers and there is no 'last refreshed' indicator. force-dynamic only re-runs the query, it does not refresh the MV.
- activeListings/pending live counts come from base `properties` (always current), so they can disagree with the MV-derived tiles, which can look inconsistent.

**UX:**
- No skeleton/loading.tsx at the root route (other routes have one); first paint waits on 4 awaited queries.
- Charts have empty-state text but no axis labels/tooltips; day labels are just day-of-month numbers.

### `/moderation (list) — pending-listing queue` — **buggy**
Lists properties with status='pending' (newest submitted_at first) joining host/wilaya/type/photo-count; links to the review detail.

**Bugs:**
- Only ever shows status='pending'. There is NO way to view approved/rejected/suspended listings, re-open a decided listing, or SUSPEND a live (approved) listing — property_status enum has 'suspended' and notifications has 'listing_suspended', but no admin action sets it. Major missing capability for a 'Listings' nav item.
- Cross-checks against schema are correct (status enum, submitted_at, property_photos(count) aggregate embedding is valid PostgREST).

**UX:**
- Does NOT render inside AdminShell — uses a custom <header className='bg-primary'> with only a 'Back to dashboard' link and NO sidebar nav. Visually inconsistent with every other page and is the page the user most likely calls 'plain'.
- No search/filter (can't filter by wilaya/host/date or sort).
- No loading skeleton wired to this layout style (loading.tsx exists but the bespoke header won't match).
- Mobile: the 6-col grid collapses to stacked rows with no field labels, so columns are ambiguous.

### `/moderation/[id] — listing review + approve/reject` — **partial**
Full property detail (photos from listing-photos bucket, all-locale title/description/house-rules, room types, amenities, host/location/meta) with DecisionPanel to approve or reject (reason enum + note).

**Bugs:**
- approveListing/rejectListing themselves are correct: status guarded on .eq('status','pending'), audit_log + notification (listing_approved/listing_rejected ARE valid notification types). Logic is sound.
- Bucket is correct (listing-photos is the canonical bucket per rls.sql).
- Reused as the generic 'property detail' target from /bookings (Property link -> /moderation/{id}); renders any property regardless of status, but the page chrome/title hard-codes a 'Pending' badge so an already-approved property still shows a yellow 'Pending' pill — misleading.

**UX:**
- Like the list, does NOT use AdminShell — bespoke bg-primary header, no sidebar.
- Approve button is styled bg-accent (terracotta) — terracotta reads as a warning/accent, not a positive 'approve'; success/teal would be clearer. Reject is correctly error-styled.
- Photos use raw <img> (no next/image), no lightbox/zoom for moderation scrutiny.
- Hardcoded 'Pending' badge regardless of actual status.

### `/users (list)` — **working**
Search profiles by display_name/full_name/phone (?q=), show host badge + identity verification + active/suspended pill, link to profile.

**Bugs:**
- Hosts resolved via a second query on host_profiles.owner_id IN (...) — correct.
- PAGE_SIZE=25 with no real pagination; the 'more results' hint just prints the filter label/placeholder text (lines 174-178) which is meaningless to the operator (looks like a bug).

**UX:**
- No status/role filter (guest vs host, active vs suspended) — only free-text search.
- The 'rows.length === PAGE_SIZE' footer renders `{filters}: {searchPlaceholder}` i.e. 'Filters: Name or phone…' — confusing copy, not a Load-more control.
- Suspended users still show but there's no bulk action or quick suspend from the list.

### `/users/[id] + UserActionsPanel + actions.ts` — **buggy**
Profile + host account + guest booking history; suspend/unsuspend (profiles.is_active) and verifyHost (host_profiles.identity_status='verified').

**Bugs:**
- BUG (data): suspendUser/unsuspendUser insert notifications with type 'account_suspended'/'account_reactivated' and verifyHost inserts 'host_verified'. NONE of these are in the notifications.type CHECK constraint (allowed set in schema.sql lines 667-674). The notification INSERT fails, so EVERY suspend/unsuspend/verify returns code:'partial' with a CHECK-violation message even though profiles/host_profiles was updated correctly. Operator sees 'Action failed — new row violates check constraint'.
- Suspending only flips profiles.is_active=false; nothing in auth/RLS actually blocks a suspended user from signing in or acting — so 'suspend' has no enforcement teeth (product gap).
- verifyHost can only set 'verified' — no way to set 'rejected' or 'pending' identity_status, and no payout_status verification action despite the column existing.
- revalidatePath('/users/${before.owner_id}') in verifyHost is correct (users route is keyed by profile id = owner_id).

**UX:**
- Because of the CHECK bug, the success path shows a red error toast — the single worst 'looks broken' UX in the app.
- Suspend uses bg-error fill; verify uses bg-accent (terracotta) which doesn't read as a positive/verify action.
- Booking history capped at 50 with no pagination or link to full bookings filtered by guest.

### `/bookings (list)` — **working**
All bookings, filter by status/wilaya/from/to and search by code; joins property+wilaya.

**Bugs:**
- Uses properties!inner join and filters properties.wilaya_code — valid. status/date/code filters correct.
- PAGE_SIZE=30, no real pagination; footer hint prints 'Filters — 30' (line 226-229) which is not a control.
- Guest-name search is advertised in the file header ('searchable by booking code or guest name') but only code is searched (ilike on code); guest name is not actually queried.

**UX:**
- Footer 'load more' is fake (static text).
- No total count / result count shown.
- Date filter applies to check_in only; label doesn't clarify which date field.

### `/bookings/[id] + CancelPanel + actions.ts (force-cancel)` — **buggy**
Booking breakdown, parties, transactions, linked dispute, admin force-cancel via cancel_booking RPC (admin-JWT path) computing refund.

**Bugs:**
- BUG (data): forceCancelBooking notifies guest AND host with type 'booking_cancelled_admin', which is NOT in the notifications.type CHECK list (the valid value is 'booking_cancelled'). Both notification inserts fail, so a successful force-cancel returns code:'partial' with check-violation message(s). The cancel + refund themselves succeed.
- BUG (logic): CANCELLABLE set includes 'checked_in', but the cancel_booking RPC only handles requested/awaiting_payment/confirmed and raises ILLEGAL_TRANSITION for checked_in — so force-cancelling a checked_in booking fails with rpc_failed.
- Depends on the custom_access_token_hook injecting app_roles into the admin JWT so cancel_booking's internal is_staff()/has_role('admin') passes via userSupabase(); if the hook isn't configured the RPC returns FORBIDDEN.
- Property link points to /moderation/{id} (the only property-detail page), which mislabels the property as a moderation item.

**UX:**
- Force-cancel success surface is warning-toned but the notification failure flips it to a red 'Action failed' due to the CHECK bug.
- No way to issue a partial/custom refund or override the computed refund; refund amount is RPC-driven only.
- Transactions list has no refund action here (only on /payments).

### `/payments + PaymentControls + actions.ts` — **partial**
Commission KPIs, payouts (run_payouts admin-JWT + markPayoutPaid service-role), transactions with manual refund recording.

**Bugs:**
- KPI 'Collected (paid)' sums amount_dzd across status in (paid, partially_refunded, refunded) WITHOUT filtering kind='payment' — so refund-kind transactions and fully-refunded payments are counted as collected revenue, overstating GMV/commission. 'Refunded' KPI sums refunded_dzd which is fine, but the gross figure is inaccurate.
- markPayoutPaid notifies with 'payout_paid' (VALID type) — this one is correct. runPayouts/markTransactionRefunded write audit only (no notification) — correct.
- markTransactionRefunded only records a refund row-state change (status + refunded_dzd); it does NOT call any provider refund and does NOT create a refund-kind transaction or touch the booking.refund_amount_dzd — purely a bookkeeping flag, which can diverge from cancel_booking's refund transactions.
- run_payouts RPC self-checks has_role('admin') via the admin JWT (userSupabase) — depends on the access-token hook being configured.

**UX:**
- KPIs are all-time with no date range (file says 'rolling, all-time for v1').
- Payouts/transactions both capped at 30 with no pagination.
- RunPayoutsForm has two raw date inputs and a Run button with no preview of how many bookings/hosts will be included before committing.
- No statement_path / PDF handling for payouts despite the column existing.

### `/reviews + ReviewModeration + actions.ts` — **partial**
Reported tab (reviews flagged via disputes category='other' from report_review RPC) + All tab (filter by status); hide/remove/restore.

**Bugs:**
- setReviewStatus is correct (sets status, audits as review.remove, no notification so no CHECK risk).
- Reported tab heuristic is fragile: it loads ALL disputes with category='other' and joins reviews by booking_id, but category='other' is a general dispute category — a genuine 'other' booking dispute (not a review report) whose booking happens to have a review will surface that review in the Reported tab with the dispute description shown as the 'report reason'. report_review prefixes the description with 'Reported review <id>:' but the query does not filter on that prefix, so false positives are possible.
- Restoring a review sets status='published' but does NOT set published_at; property_review_stats MV filters status='published' (works) but properties.rating_avg/review_count recompute depends on a trigger (not verified here).

**UX:**
- No way to see the full review (all category sub-scores) or the property/booking context inline; only overall ★ + comment.
- Reported tab can show reviews intermixed from non-review disputes (see issues).
- Hide/Remove/Restore are tiny ghost buttons at the card footer; remove has an optional-note inline input but no confirm modal for the destructive 'removed'.

### `/disputes (list)` — **working**
All disputes, filter by status + category; joins booking code + opener.

**Bugs:**
- Query/joins/enums all match schema. Default order is created_at desc (the file comment claims open/under-review float to top 'by default' but there is no such ordering — it's purely newest-first).
- PAGE_SIZE=40, no pagination.

**UX:**
- No 'against' party column; no quick-resolve from the list.
- Open/under_review are not visually prioritized despite the stated intent.

### `/disputes/[id] + ResolvePanel + actions.ts` — **partial**
Dispute context + message thread + take-under-review/resolve/reject (note required on final); notifies both parties.

**Bugs:**
- resolveDispute uses notification type 'dispute_resolved' (VALID) — correct, no CHECK bug here.
- Resolution never touches disputes.refund_amount_dzd nor issues any refund/booking change — disputes are resolved as text-only outcomes even for category='refund'; the refund_amount_dzd column is dead in the admin flow.
- On 'rejected' the booking detail page still renders resolution_note inside a GREEN success-styled box (bookings/[id] and disputes/[id] both style resolution_note as bg-success), which misrepresents a rejection as a positive resolution.
- No state-machine guard on transitions (e.g., can 'resolve' straight from 'open' without 'under_review' — acceptable, but also can re-resolve since update isn't guarded on current status; ResolvePanel hides controls when closed, but the action itself doesn't .eq on a non-final status).

**UX:**
- evidence_path is shown as a raw storage path string, not a viewable link/thumbnail.
- Admin cannot post a message into the dispute thread (no compose box) — resolution note is the only channel.
- No refund/compensation control in the resolve flow.

### `/audit` — **working**
Read-only append-only audit_log viewer, filter by action/target/actor with before/after JSON in <details>.

**Bugs:**
- Solid. Actor names resolved via one follow-up profiles query. Filters validated against allow-lists. No write path (correct).
- PAGE_SIZE=60, no pagination/date filter — old entries fall off.

**UX:**
- No date-range filter and no pagination, so high-volume logs are not navigable.
- before/after shown as raw single-line JSON in a code span (hard to diff).

### `/content (hub)` — **working**
CMS index with live counts per catalog (collections, banners, rails, property_types, amenities, wilayas).

**Bugs:**
- Six head/count queries in parallel — correct.

**UX:**
- Cards are functional but flat; counts only, no last-updated or active/inactive breakdown.

### `/content/collections + CollectionItems + EntityEditor` — **partial**
CRUD featured_collections and manage collection_items.

**Bugs:**
- saveCollection/toggle/delete/add/removeItem all correct (service-role + audit). deleteCollection manually clears collection_items first (collection_items FK is ON DELETE CASCADE in schema, so the manual delete is harmless/redundant).
- EntityEditor has no field for cover_photo_path, so a collection's cover image can never be set from admin.

**UX:**
- Adding properties to a collection requires pasting raw property UUIDs (CollectionItems) — no search/typeahead/picker; operator must copy ids from other pages.
- No drag-reorder; sort order is a manual number input.
- No image upload (cover) UI.

### `/content/banners` — **partial**
CRUD promo_banners with schedule + target URL.

**Bugs:**
- Actions correct (image_path required, schedule slice(0,16) for datetime-local). No notification risk.

**UX:**
- image_path is a free-text storage-path input — no upload widget and no preview, so operators must already know the exact storage object path (impractical).
- List title falls back to image_path when no title — shows a raw path as the heading.

### `/content/rails` — **working**
Edit-only home_rails (labels/sort/active).

**Bugs:**
- Edit-only by design (key+kind fixed). saveRail correct.

**UX:**
- No reorder UI; sort is a number. Cannot preview where each rail appears on the storefront.

### `/content/property-types` — **buggy**
CRUD property_types (numeric PK assigned via max(id)+1).

**Bugs:**
- savePropertyType computes new id as max(id)+1 client-... server-side via a query (property_types.id is a non-identity smallint PK). This is RACE-PRONE (two concurrent creates collide on PK) and will eventually exceed smallint range only theoretically — the real risk is the concurrent-insert PK conflict returning a generic update_failed.
- Otherwise correct (kind validated, l10n name columns).

**UX:**
- icon is a free-text string (no icon picker); kind is a bare select of enum literals.

### `/content/amenities` — **buggy**
CRUD amenities (numeric PK via max(id)+1).

**Bugs:**
- Same max(id)+1 race condition as property-types for amenities.id (smallint PK).
- category is free-text but the DB has a CHECK (category in general/kitchen/bathroom/safety/accessibility/outdoor); typing any other value will fail the CHECK with a generic update_failed and no field-level hint.

**UX:**
- category should be a select constrained to the 6 allowed values; as a free-text input it invites CHECK-violation failures.
- No icon picker.

### `/content/wilayas` — **working**
Toggle wilaya is_active; show commune counts (read-only).

**Bugs:**
- toggleWilayaActive correct; communes read-only by design.

**UX:**
- 69 wilayas in one ungrouped/unsearchable list; no filter for active/inactive.

### `/(auth)/sign-in + /api/session` — **working**
Email/password sign-in -> POST tokens to /api/session (httpOnly cookies) -> redirect.

**Bugs:**
- Solid. Friendly client-side admin pre-check + authoritative server gate. Secure cookie flag derived from x-forwarded-proto (correct fix for plain-HTTP VPS). DELETE clears cookies.
- Default post-login destination is /moderation (not / overview) — minor.
- No refresh-token rotation: access cookie capped at 1h; when it expires the next server request sees no valid token and redirects to sign-in (the stored refresh token is never used to mint a new access token server-side), so admins get bounced to sign-in roughly hourly.

**UX:**
- Polished split-panel layout (good). Mobile wraps the teal LocaleSwitcher in a dark chip (good).
- Hourly forced re-login due to no refresh flow is an operational annoyance.

## Cross-cutting bugs
- NOTIFICATION CHECK-CONSTRAINT VIOLATIONS (highest-impact functional bug): lib/audit.ts notify() inserts whatever `type` string it is given, but notifications.type has a CHECK constraint (schema.sql 667-674). The admin actions use invented types that are NOT in the list: 'account_suspended' & 'account_reactivated' (users/actions.ts suspend/unsuspend), 'host_verified' (users/actions.ts verifyHost), and 'booking_cancelled_admin' (bookings/actions.ts forceCancel, sent to BOTH guest and host). Every one of these mutations succeeds on the primary write but then fails the notification insert and returns code:'partial' with a 'violates check constraint' message — so core admin actions appear broken to the operator. Fix: map to allowed types (booking_cancelled, listing_suspended, etc.) or extend the CHECK constraint via migration. ('payout_paid' and 'dispute_resolved' are correctly within the allowed set.)
- MODERATION SECTION DOESN'T USE AdminShell: app/moderation/page.tsx and app/moderation/[id]/page.tsx render a bespoke <header className='bg-primary'> with NO sidebar nav, while every other route uses AdminShell (teal rail + top bar + breadcrumb). This is the single biggest 'plain/ugly + inconsistent' visual problem and it's on the flagship moderation flow. Bring both under AdminShell.
- FAKE PAGINATION across all list pages: /users, /bookings, /payments, /reviews, /disputes, /audit all cap at a PAGE_SIZE and either show nothing or print a static placeholder string as a 'load more' footer (e.g. /users prints 'Filters: Name or phone…', /bookings prints 'Filters — 30'). There is no offset/cursor paging anywhere, so data beyond the first page is unreachable.
- max(id)+1 PRIMARY-KEY ASSIGNMENT for property_types and amenities (content/actions.ts) is race-prone for the non-identity smallint PKs; concurrent creates can collide and surface as a generic update_failed.
- FREE-TEXT INPUTS THAT MAP TO DB CHECK/ENUM COLUMNS: amenities.category is a free-text field but the DB constrains it to 6 values; banner/collection image paths are free-text storage paths with no upload UI — both invite CHECK violations or broken images with no field-level validation.
- NO error.tsx BOUNDARIES anywhere in app/: detail pages handle the single .maybeSingle() DB error inline, but the multi-query Promise.all reads (overview, payments) and any unexpected throw fall through to Next's default unstyled error screen instead of a branded ErrorState.
- NO MIDDLEWARE / edge auth: every page calls requireAdmin() individually (correct and safe), but there's no middleware.ts as defense-in-depth; a newly added route that forgets requireAdmin() would be unprotected.
- SESSION REFRESH GAP: /api/session stores a refresh token but nothing ever uses it server-side; the access cookie is capped at 1h and requireAdmin() only validates the access token, so admins are redirected to sign-in ~hourly with no silent refresh.
- RESOLUTION-NOTE STYLING: bookings/[id] and disputes/[id] render disputes.resolution_note inside a green success box even when the dispute was 'rejected', misrepresenting a rejection as a positive outcome.
- STALE COMMENT vs behavior: lib/i18n.ts says it 'Falls back to Arabic (DEFAULT_LOCALE)' but @dyafa/i18n DEFAULT_LOCALE is 'en' (matches the spec's English-default/LTR lock). Behavior is correct; the comment is wrong and could mislead maintainers. (DB profiles.preferred_locale defaults to 'ar', which is a separate, intended user-preference default.)
- ACCENT (terracotta) USED FOR POSITIVE ACTIONS: Approve listing, Verify host, and most CMS Save buttons use bg-accent (terracotta). Terracotta is the brand accent, not a success color, so positive/destructive affordances aren't visually differentiated (approve vs reject both feel 'colored'). Consider success/teal for confirmations.

## Missing features
- Listing lifecycle beyond pending: no way to view approved/rejected/suspended listings, browse/search all listings, or SUSPEND a live listing (property_status 'suspended' + notification 'listing_suspended' exist in the schema but no admin action uses them). The 'Listings' nav effectively means 'pending queue only'.
- Host identity workflow is one-way: verifyHost only sets 'verified' — no reject/reset to pending, no view of KYC docs (id_doc_path / kyc-docs bucket), and no payout_status verification action.
- Dispute resolution issues no money: disputes.refund_amount_dzd is never written and no refund/booking action is taken on resolve, even for category='refund'. Admins also cannot post into the dispute message thread.
- Image upload UI is entirely absent in the CMS: banners, collections (cover_photo_path), property_types/amenities icons all require typing raw storage paths/strings; no Supabase Storage upload component anywhere.
- Collection item management has no property picker — operators must paste UUIDs; no search/typeahead and no drag-reorder.
- No platform_settings editor: commission_bps, payout_period, payment_window_minutes, geo_fuzz_meters, feature_flags are all in the DB with no admin UI to change them.
- Manual/partial refund control is weak: markTransactionRefunded only flips a bookkeeping flag (no provider refund, no refund transaction, no booking.refund_amount_dzd update); force-cancel offers no override of the RPC-computed refund.
- No role-management UI: grant_role RPC (super_admin only) and the super_admin vs admin distinction exist, but there's no screen to grant/revoke admin/staff roles; primaryRole is computed but never gates any UI (an 'admin' sees identical capabilities to 'super_admin').
- No date-range/pagination on payments KPIs and audit log; no CSV/export anywhere.
- No analytics depth: the rich MVs (mv_top_destinations, mv_host_performance, mv_revenue_by_period) are never surfaced — only mv_daily_metrics + mv_conversion_funnel feed the overview.
- No way to trigger refresh_analytics() from the UI, so MV-backed KPIs can silently go stale.
- Guest-name booking search is documented but not implemented (only booking code is searched).

## Top priorities
1. Fix the notifications.type CHECK violations: change 'account_suspended'/'account_reactivated' (users actions), 'host_verified' (verifyHost), and 'booking_cancelled_admin' (forceCancel) to allowed types — e.g. use existing 'booking_cancelled', and add new types ('account_suspended','account_reactivated','host_verified', or a generic 'account_update') via a migration that extends the notifications.type CHECK. This single fix makes suspend/unsuspend/verify-host/force-cancel stop reporting 'Action failed' on success.
2. Put /moderation and /moderation/[id] inside AdminShell (sidebar + top bar) so the flagship flow matches the rest of the app; this is the biggest visual-consistency win and likely the core of the user's 'plain/ugly' complaint.
3. Implement real pagination (offset or cursor) on /users, /bookings, /payments, /reviews, /disputes, /audit and remove the fake 'load more' placeholder footers.
4. Add an image-upload component (Supabase Storage) for promo banners, collection covers, and type/amenity icons; replace raw storage-path/text inputs. Constrain amenities.category to a select of the 6 allowed values.
5. Expand listing management: a Listings view that filters by status (pending/approved/rejected/suspended), plus a 'suspend listing' admin action (property_status='suspended' + 'listing_suspended' notification + audit).
6. Fix the property_type/amenity create race by using a DB sequence/identity or an atomic upsert, and add field-level validation/error surfacing instead of generic update_failed.
7. Correct force-cancel state coverage (remove 'checked_in' from CANCELLABLE or handle it in cancel_booking) and the Payments 'Collected (paid)' KPI (filter kind='payment' and exclude refunded gross) so revenue numbers are accurate.
8. Add platform_settings and role-management (grant_role) admin screens, and gate super_admin-only capabilities by session.primaryRole.
9. Wire dispute resolution to real outcomes for refund-category disputes (write refund_amount_dzd / trigger a refund) and let admins reply in the dispute thread; stop showing resolution_note in green for 'rejected' disputes.
10. Add a session refresh path (use the stored refresh token to mint a new access token, or adopt @supabase/ssr) so admins aren't bounced to sign-in roughly every hour; add error.tsx boundaries and a root loading.tsx.
