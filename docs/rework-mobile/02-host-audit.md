# Audit — host-mode

## Screens

### `app/host/_layout.tsx (host stack gate)` — **buggy**
Auth-gates the entire host/ group; redirects to sign-in (next=host) if no session; sets stack screen options.

**Bugs:**
- Hardcoded Arabic header title: Stack.Screen name='index' options={{ title: 'استضافتي' }} (line 41) — shown even when locale is English (the locked default) or French. Should be localized via L/pick like every other screen.
- All other host screens set headerShown:false and render their own SafeAreaView top bar, but the index screen relies on this native header — so the dashboard always shows an Arabic title regardless of language.
- Redirect params { next: 'host' } — verify the sign-in screen actually honors next='host' and routes back to /host after login (the value is a bare 'host', not a path).

**UX:**
- Loading state is a bare ActivityIndicator (the rest of the app uses designed skeletons) — inconsistent with the 'no bare spinners' standard stated in the screens.
- Back navigation animation flips on RTL (good), but the native header on index is the only inconsistent chrome in the whole host area.

### `app/host/index.tsx (host dashboard)` — **partial**
Headline stats (active listings, pending requests), tile grid (Reservations/Calendar/Earnings/Performance/Reviews/Create), and inline list of the host's own listings with status badges; tap a listing to edit in the wizard.

**Bugs:**
- getHostPerformance() runs even for a brand-new host whose JWT lacks the host_id claim; reads are RLS-scoped so they return empty rather than error, but pendingRequests/listingCount will silently read 0 until the token is refreshed with the host_id claim (see cross_cutting #1).
- Editing a listing routes to /host/new?propertyId=… but the wizard only hydrates property columns + rooms + amenities; photos are re-fetched per step. If the wizard draft can't write (host_id claim missing) edits silently fail on Next (see cross_cutting #1).
- rejection_note is read as item.rejection_note — column exists (schema line 186), OK.

**UX:**
- Absolutely-positioned bottom 'Create listing' CTA overlaps the last FlatList row; listContent paddingBottom:96 mitigates but the CTA also duplicates the 'Create' tile and the empty-state — three create entry points.
- StatCard label uses RN_FONTS.arabicMedium for all locales (fine visually but the naming/loading of Arabic font for Latin text is a code smell repeated app-wide).
- Tile glyphs are emoji, not the brand icon set — inconsistent with the design-system goal.

### `app/host/new/_layout.tsx + src/lib/wizard.tsx (wizard shell + state)` — **broken**
Wraps the 9 step routes in WizardProvider; holds the in-progress draft; ensureDraft() lazily becomes host then inserts a draft properties row.

**Bugs:**
- CRITICAL: ensureDraft() calls becomeHost() then immediately createDraftProperty() in the SAME session. host_id is a custom JWT claim minted by custom_access_token_hook at token issue/refresh time. After become_host the in-memory access token still has host_id=null, so properties_host_insert (with check host_profile_id = my_host_id()) fails with an RLS violation for every first-time host. No supabaseClient.auth.refreshSession() is called after becomeHost(). (functions.sql my_host_id line 51; rls properties_host_insert line 140-145).
- listings.ts header comment (lines 9-11) is factually wrong: it claims RLS allows inserts via host_profiles.owner_id = auth.uid(); the real policies require host_profile_id = public.my_host_id(). The whole data layer was written against an assumption that does not match the deployed RLS.
- createDraftProperty inserts only host_profile_id/property_type_id/listing_kind/wilaya_code/status — relies entirely on my_host_id() matching draft.hostProfileId; if the claim is stale/absent the insert is rejected.
- WizardProvider state is in-memory only; backgrounding the app or a reload loses the entire draft (propertyId included) — though photos/rooms already persisted server-side become orphaned drafts.

**UX:**
- gestureEnabled:false disables swipe-back on all steps (intentional) but there is no confirm-on-exit; the ✕ in WizardChrome calls router.back() and silently abandons the in-progress draft with no 'save draft / discard' prompt.
- No persistence of draft across app restarts; a host who gets interrupted loses progress.

### `app/host/new/index.tsx (step 1 — type + kind)` — **partial**
Pick property type + listing kind (single_unit/multi_room); also the hydration entry when ?propertyId is present.

**Bugs:**
- Hydration effect depends only on [params.propertyId] with exhaustive-deps disabled; if draft already has a different propertyId it can mismatch, but the guard handles the common case.
- Hydration is best-effort and swallows errors (catch {} ) — if getPropertyWithChildren fails (e.g. RLS), the host silently sees an empty wizard and may create a duplicate draft.
- Switching kind to single_unit collapses rooms to rooms[0]; if rooms[0] was a named multi-room it keeps its name on a single-unit (name is ignored later, minor).

**UX:**
- nextDisabled only checks propertyTypeId; listingKind always has a default so it's fine, but there's no validation feedback explaining why Next is disabled.
- Property-type list has no empty/error distinction beyond the generic ErrorState.

### `app/host/new/location.tsx (step 2 — location)` — **broken**
Wilaya (required) + commune (optional) + address + manual lat/lng; persists draft on Next (this is the first DB write via saveProperty→ensureDraft).

**Bugs:**
- This is where the host_id-claim RLS failure first surfaces: onNext→saveProperty→ensureDraft inserts the draft property. For a first-time host the insert is rejected (see wizard cross-cutting). The catch shows a generic 'Could not save location' with no indication it's an auth/claim issue.
- Wilaya chips render ALL 58 wilayas as wrapping pills with no search/filter — heavy and hard to use, but functional.
- lat/lng are free-text with no range validation (parseCoord only checks finite); a host can save lat=999. Map is a stub so no correction path.

**UX:**
- 58 wilaya chips with no search is a poor mobile picker; commune list similarly unbounded.
- Map stub with manual coordinate entry is effectively unusable for non-technical hosts (acknowledged stub).
- No 'use my location' affordance.

### `app/host/new/photos.tsx (step 3 — photos)` — **broken**
Pick from library (expo-image-picker base64), upload to listing-photos bucket, grid with cover badge + remove; >=1 photo required to continue.

**Bugs:**
- CRITICAL: uploadPhoto builds the storage path as `${userId}/${propertyId}/...` using the AUTH USER id, but the storage RLS 'listing photos host upload' policy requires (storage.foldername(name))[1] = public.my_host_id()::text — i.e. the HOST_PROFILE id, not the user id (rls.sql line 549-555). The first path segment will never equal my_host_id(), so EVERY photo upload is rejected by storage RLS. Since >=1 photo is a hard submit requirement, listings cannot be created from mobile at all. Fix: upload under `${hostProfileId}/${propertyId}/...`.
- Compounding: even with the correct folder, the upload policy also requires the host_id claim to be present (my_host_id() non-null) AND a host_* role — both depend on a token refresh after become_host (see wizard cross-cutting).
- uploadPhoto inserts property_photos with upsert:false; on the auth/role failure the user just sees generic 'Upload failed.' with no diagnostic.
- deletePhoto removes the storage object first then the row; storage delete policy also keys on my_host_id() so deletes fail for the same reason if the path/claim is wrong.
- load() has exhaustive-deps disabled and omits ensureDraft/draft.propertyId — calling ensureDraft() inside load can create a draft property merely by visiting the photos step even if the host never adds a photo, leaving orphan drafts.

**UX:**
- No reordering of photos (sort_order is fixed by add order); cover is always the first — host cannot choose a different cover.
- No multi-select picker (one image per tap), tedious for a real listing.
- Cover badge logic `idx === 0 || p.is_cover` can show two covers if a non-first photo also has is_cover true.
- No image-size/aspect guidance or compression beyond picker defaults; base64 upload of full-res photos is memory-heavy on device.

### `app/host/new/details.tsx (step 4 — title + description)` — **partial**
Per-locale title/description (ar/fr/en tabs); >=1 title required; persists on Next.

**Bugs:**
- saveProperty→ensureDraft will fail for first-time hosts (same host_id claim issue) — generic 'Could not save.'
- LocaleTabs default tab is the UI locale; a host editing in English may not realize ar/fr title fields exist (only the active tab's emptiness is reflected by hasTitle, which checks all three — OK).

**UX:**
- No per-field character counter or min-length guidance for title/description.
- Multiline description field has no large/expandable affordance.
- Switching locale tabs doesn't indicate which locales already have content (no per-tab filled indicator).

### `app/host/new/amenities.tsx (step 5 — amenities)` — **buggy**
Multi-select amenities grouped by category; synced to property_amenities on Next.

**Bugs:**
- setAmenities(id, …) writes property_amenities which is manager-write RLS via can_act_on_property → my_host_id(); fails for first-time hosts until token refresh (same root cause).
- Category group title renders the RAW DB category slug (a.category, e.g. 'essentials'/'kitchen') untranslated and only textTransform:capitalize'd — not localized into ar/fr/en. The L copy table is not consulted for category names.

**UX:**
- No search/filter for a long amenity list.
- Category headings in English-only slugs break the multilingual promise, jarring in Arabic/French UI.
- No 'select all in category' or counts.

### `app/host/new/rules.tsx (step 6 — rules + times)` — **partial**
Per-locale house rules + check-in/check-out times (free-text HH:MM validated by regex); persists on Next.

**Bugs:**
- saveProperty appends ':00' to times → 'HH:MM:00' for a Postgres time column (OK). But if a host clears a time field, draft.checkinTime becomes '' → TIME_RE fails → Next disabled with the bad-time error; recovery is fine.
- Same ensureDraft/host_id write failure path on Next.

**UX:**
- Times are free-text HH:MM with a keyboard, not a time picker — error-prone (e.g. '2pm', '14.00'); a native time wheel would be far better on mobile.
- House rules field shares the LocaleTabs but unlike details there's no FieldLabel-per-tab indicator of which locales are filled.

### `app/host/new/pricing.tsx (step 7 — pricing/room types)` — **buggy**
single_unit: one default room (price/occupancy/cleaning/weekend); multi_room: add/remove rooms each with name/price/occupancy/inventory. Held in draft; persisted on review step.

**Bugs:**
- Multi-room name is bound ONLY to nameAr: value={room.nameAr || room.nameFr || room.nameEn}, onChangeText writes updateRoom(idx, { nameAr: t }). So a French/English-only host types a room name that is stored as the Arabic name; there is no per-locale room-name entry. Downstream localizedName picks ar first, so it 'works' but the data is mis-tagged (a French name lands in name_ar).
- toInt strips non-digits, so '8 000' or '8,000' → 8000 (good) but '8.5' → 85 (silently wrong for cleaning/price).
- weekend price and cleaning fee have no validation that weekend >= base or that cleaning is sane; negative not possible (digits only).

**UX:**
- No thousands separators while typing price (DZD amounts are large; raw 8000 is hard to read).
- Remove room has no confirmation.
- Single-unit hides inventory (forced 1) — correct, but the occupancy/price layout reuses the multi-room card with no clear 'this is your whole place' framing.

### `app/host/new/policy.tsx (step 8 — policy)` — **working**
Cancellation tier (flexible/moderate/strict) + instant book toggle + minimum nights; patched to draft on Next.

**Bugs:**
- minNights is kept in LOCAL state and only patched into the draft on onNext; if the host edits minNights then taps the WizardChrome ✕ or back, the value is lost (minor, since back re-reads draft.minNights).
- No upper bound / max_nights handling (schema has max_nights but the wizard never sets it).

**UX:**
- Cancellation tiers show generic descriptions, not the actual refund windows from cancellation_policies (host can't see what 'moderate' really means in hours).
- minNights uses number-pad free text rather than a stepper.

### `app/host/new/review.tsx (step 9 — review + submit)` — **buggy**
Summary with OK/Missing pills; on submit: ensureDraft, persist policy cols, reconcile room types (insert/update), sync amenities, call submit_property_for_review; success screen.

**Bugs:**
- persistRooms + setAmenities + updateProperty all run as direct table writes gated by my_host_id() RLS; a first-time host (stale token) gets a generic 'Submit failed' even though the real cause is the missing host_id claim.
- Submit is multi-step and NON-transactional: if persistRooms succeeds but submitForReview fails, rooms/amenities are written but status stays draft; re-submitting re-runs persistRooms which (for single_unit) updates the existing default room (idempotent) but for multi_room with room.id unset will INSERT DUPLICATE rooms each retry (rooms in the draft never get their new id back, because persistRooms doesn't write ids back into the wizard draft). Repeated submit attempts duplicate room_types.
- hasRoom local check (basePrice>0 && maxOccupancy>0) can pass while server requires a persisted room_type; if persistRooms silently no-ops (e.g. draft.rooms[0] undefined) submit_property_for_review raises 'at least one room type required'.
- Policy summary prints draft.cancellationTier RAW ('moderate') instead of the localized label.

**UX:**
- Success screen replaces to /host but the in-memory wizard draft is never reset() — re-entering /host/new immediately shows the just-submitted listing's data.
- Checklist explaining requirements only appears when !canSubmit; once one item is missing the host must scroll to find which pill says 'Missing'.
- No edit-jump from a 'Missing' section back to its step.

### `app/host/reservations.tsx (requests + upcoming)` — **buggy**
Two tabs: incoming requests (accept/decline) and upcoming/active stays (confirmed/checked_in) with Message guest.

**Bugs:**
- STATUS GAP: acceptBookingRequest → accept_booking_request RPC moves the booking 'requested' → 'awaiting_payment' (functions.sql line 436-438), NOT 'confirmed'. After accepting, the card is optimistically removed from Requests, but the booking is NOT in UPCOMING_STAY_STATUSES (['confirmed','checked_in']) — so an accepted-but-not-yet-paid booking disappears from BOTH tabs. The host has no view of awaiting_payment bookings at all.
- NO check-in / check-out action: there is no RPC for host-driven confirmed→checked_in or checked_in→completed (only the admin cron complete_stays). The Upcoming tab shows confirmed/checked_in stays but offers only 'Message guest' — the host can never mark a guest checked in/out. Missing core feature flagged in the brief.
- listBookingRequests orders by created_at desc but the doc/comment says 'soonest check-in first'; ordering does not match the stated intent (cosmetic).
- declineBookingRequest is called with no reason; decline_booking_request accepts p_reason but the UI never collects one (lost audit info).
- Optimistic removeBooking on accept/decline isn't reconciled with a refetch; if the RPC partially fails after the catch path the list state can drift.

**UX:**
- No way to message a guest BEFORE accepting (Message only on Upcoming tab) — hosts often want to ask questions before accepting a request.
- Decline has no confirmation and no reason prompt.
- No badge/count on the Requests tab segment.
- Accepted bookings vanishing (status gap above) is a confusing UX dead-end with no 'awaiting payment' surface.
- Back chevron is a raw '←'/'→' Text glyph, not the icon set.

### `app/host/calendar.tsx (calendar & pricing)` — **broken**
Pick listing → room type → month grid decorated with closed/override markers → select range → block/price/min-stay → set_availability_range.

**Bugs:**
- OFF-BY-ONE (same class as the already-fixed hotel-web bug, NOT fixed here): set_availability_range loops `while v_d < p_to` (p_to EXCLUSIVE) and raises INVALID_RANGE when p_to <= p_from (m5_m6_hotel_admin.sql line 60, 73). The mobile screen computes rangeEnd = checkOut − 1 day (the inclusive last night) and passes to: toDateParam(rangeEnd). So: (a) the LAST selected night is never written (server stops before rangeEnd); (b) a SINGLE-DAY selection (checkOut null → rangeEnd === checkIn → from === to) triggers INVALID_RANGE and the apply fails. The hotel web app fixes this by sending end+1day exclusive (apps/hotel/.../calendar/actions.ts line 83-95); mobile must do the same (send checkOut as-is, exclusive — or rangeEnd+1).
- set_availability_range write authorization goes through can_act_on_property→my_host_id(); fails if host_id claim absent (host can read availability via reception USING but writes need the claim).
- listAvailability reads with .gte('date', from).lte('date', to) over a 180-day window; availability rows for a DRAFT/pending property are readable to the host via availability_reception_write USING, but availability_public_read requires status='approved' — for a draft the host relies on the reception policy; OK for owner but confirm can_act_on_property resolves (depends on host_id claim again).
- priceOverride/minStay: passing null leaves them unchanged on existing rows (server coalesce) but for NEW rows inserts NULL — fine. However toggling 'block' off then applying sends isClosed:false which the server coalesces; un-blocking works, but you cannot CLEAR a price override back to base (no way to send an explicit null-to-clear).

**UX:**
- The off-by-one means a host blocking 'June 10–12' actually blocks only the 10th and 11th — silent data error the host won't notice until a guest books the 12th.
- Single-day block silently fails with a generic 'Could not apply' — very confusing.
- Listing/room pills truncate; no indication of which listings are draft vs approved (a host can 'set availability' on a draft that has no live rooms).
- No legend entry for 'available/open'; only closed + override are explained.
- Calendar re-fetches the full 180-day window after every apply (no incremental update).

### `app/host/earnings.tsx (payouts + per-booking)` — **working**
Payouts tab (gross/commission/net by status, upcoming vs paid summary) and per-booking earnings (total/commission/host payout) for money-committed bookings.

**Bugs:**
- listPayouts filters by host_profile_id from getMyHostProfileId() (reads host_profiles by owner_id — works without the host_id claim). Payouts read RLS uses host_profile_id = my_host_id() (rls payouts policy) — so even though the query passes the right id, the RLS USING clause needs my_host_id(); if the host_id claim is absent the payouts read returns EMPTY (not an error). Earnings will look empty for a freshly-promoted host until token refresh.
- listEarningBookings selects host_payout_dzd/commission_amount_dzd directly from bookings (columns exist, schema lines 331-332) and is RLS-scoped — OK.
- upcomingTotal/paidTotal sum net_dzd client-side; consistent with server values (no client money math beyond summation) — OK.

**UX:**
- No date filtering / period selector for payouts or bookings.
- Per-booking tab has no link into the booking/conversation detail.
- Empty state can't distinguish 'no earnings yet' from 'RLS returned empty due to missing claim'.

### `app/host/performance.tsx (metrics)` — **partial**
Cards: listings, total/confirmed/completed bookings, 30-day occupancy estimate, realized revenue; Views shown as em-dash (no view tracking).

**Bugs:**
- getHostPerformance reads properties + bookings RLS-scoped; for a host whose token lacks host_id, properties read via can_act_on_property (my_host_id) returns nothing and bookings (host-scoped) return nothing → all zeros, shown as the empty state. Same root cause.
- Occupancy denominator = totalUnits × 30 using inventory_count, numerator = booked nights overlapping next 30 days for EARNING_STATUSES; this counts PAST nights of an in-progress stay only via overlap with [today, today+30] (overlapNights clamps) — reasonable, but completed-but-future is impossible so fine.
- Revenue sums host_payout_dzd for confirmed/checked_in/completed — note these payouts may not yet be realized (confirmed != paid out); labeled 'realized revenue' which is misleading vs the payouts screen's paid total.

**UX:**
- 'Views' card always em-dash with a note — fine, but reserves space for a metric that will confuse hosts.
- Occupancy is a single 30-day number with no trend; no time-range control.
- Revenue card labeled differently from earnings ('realized' vs 'paid') invites mismatch confusion.

### `app/host/reviews.tsx (host reviews + reply)` — **working**
Lists reviews on the host's properties with score, category breakdown, comment, author; reply composer calls host_reply_review; reply renders inline.

**Bugs:**
- listHostReviews / hostReplyReview live in src/lib/reviews.ts (M3) — host_reply_review RPC. Reply write is RLS/RPC-gated on host ownership (my_host_id via the review→property chain); a host without the host_id claim can't reply (same root cause) — but reading reviews of approved properties works.
- onReplied fabricates a synthetic reply id `${reviewId}-reply` and uses new Date() locally; a subsequent refresh will replace it with the real row (acceptable optimistic update).
- Imports localizedName from '@/lib/discovery' here vs '@/lib/listings' elsewhere — two localizedName implementations in the codebase (duplication risk if they diverge).

**UX:**
- No filter (e.g. unreplied only) or sort control.
- No overall rating header / aggregate across listings.
- Reply composer has no character guidance; submit disabled on empty (good).

### `app/(tabs)/profile.tsx → Switch to Hosting entry` — **buggy**
Auth-gated 'Switch to Hosting' CTA: become_host() then router.push('/host').

**Bugs:**
- After becomeHost() succeeds it pushes to /host WITHOUT refreshing the session. The new host_individual role + host_id claim are only minted on the next token refresh (custom_access_token_hook runs at issue/refresh). So immediately after switching, the host's JWT still lacks host_id and host role → the very first listing-creation/photo-upload/calendar-write all fail with RLS errors until the token auto-refreshes (default ~1h) or the app is restarted. Fix: call supabaseClient.auth.refreshSession() after becomeHost() before navigating.
- Errors from becomeHost are shown as the generic loadError ('Failed to load') with no hint about what went wrong.

**UX:**
- No explanation of what hosting entails before committing; one tap silently creates a host_profile.
- No way to 'switch back to travelling' indicator — the toggle is one-directional from the UI's perspective.
- Spinner-only loading on the CTA (no skeleton), and the CTA is plain primary, not the brand host accent.

## Cross-cutting
- ROOT-CAUSE #1 (blocks nearly all host writes): Every host-side write policy — properties insert/delete, room_types, property_amenities, availability, payouts read, storage uploads, accept/decline/cancel, set_availability_range, host_reply_review — resolves authorization through public.my_host_id(), which reads the 'host_id' custom JWT claim injected ONLY by public.custom_access_token_hook (functions.sql line 44-52, 101-131). This hook must be REGISTERED in the Supabase project's Auth (GoTrue) 'Custom Access Token' hook setting to fire. If it is not enabled, my_host_id() is always NULL and the entire host data layer fails with RLS violations. The mobile customer client (src/lib/supabase.ts) is a plain anon-key client; nothing verifies the claim exists. AUDIT/CONFIRM the hook is enabled in the project, and that the JWT actually carries host_id.
- ROOT-CAUSE #2 (stale token after become_host): Even with the hook enabled, become_host() grants the role + creates host_profile but the in-memory access token is NOT refreshed. host_id/app_roles claims are minted at token issue/refresh time, so the SAME session that just became a host still has host_id=null. The wizard (ensureDraft) and the profile 'Switch to Hosting' both navigate straight into host writes without calling supabaseClient.auth.refreshSession(). First-time hosting therefore fails until the next auto-refresh/app restart. FIX: refreshSession() after every become_host() (in wizard.ensureDraft and profile.onSwitchToHosting).
- ROOT-CAUSE #3 (photo upload path mismatch): src/lib/listings.ts uploadPhoto uses path `${userId}/${propertyId}/...` (auth uid) but storage policy 'listing photos host upload' requires foldername[1] = my_host_id() (host_profile id) (rls.sql 549-563). Independently of the claim issue, the path is simply wrong — must be `${hostProfileId}/${propertyId}/...`. listings.ts comment block (lines 9-11) documents the wrong RLS model and should be corrected.
- CALENDAR off-by-one (set_availability_range p_to is EXCLUSIVE): mobile sends an inclusive last-night date so the last day is dropped and single-day selections error with INVALID_RANGE. The hotel web app already fixed this by sending end+1 day (apps/hotel/.../calendar/actions.ts 83-95); mobile host/calendar.tsx + lib/host.ts setAvailabilityRange were NOT updated. The lib/host.ts JSDoc even mislabels p_to as 'inclusive'.
- BOOKING lifecycle gap in mobile: accept_booking_request → 'awaiting_payment' (not 'confirmed'), but reservations.tsx only surfaces 'requested' and ['confirmed','checked_in']. There is no 'awaiting_payment' view and no host-driven check-in/check-out RPC at all — so a whole segment of the lifecycle (accepted-awaiting-payment, mark checked-in, mark checked-out/no-show) is invisible/unactionable in host mode.
- i18n inconsistency: host/_layout sets a hardcoded Arabic native header title; amenities step shows raw English DB category slugs; review/policy print raw enum values (cancellationTier) instead of localized labels. English is the locked default + Arabic/French selectable, so these are user-visible regressions.
- Generic error handling everywhere: every host screen catches and shows L.loadError / 'Could not save' / 'Submit failed' with no differentiation between network, auth/claim, RLS, and validation failures — which makes the (very real) RLS/claim failures above undebuggable for the user and support.
- Two localizedName implementations (src/lib/listings.ts and src/lib/discovery.ts) are imported interchangeably across host screens — duplication that risks divergent locale fallback behavior.
- Wizard draft is in-memory only (no AsyncStorage persistence) and is never reset() after a successful submit; combined with non-transactional submit, retries can duplicate room_types and re-entry shows stale data.
- Back chevrons across host screens are raw '←'/'→' Text glyphs and tile icons are emoji — not the intended RN design system / brand icon set; touch targets rely on hitSlop rather than proper 44pt targets.

## Missing features
- Host check-in / check-out / no-show actions: no RPC or UI to move confirmed→checked_in→completed (or →no_show); only an admin cron (complete_stays) exists. Hosts cannot manage stays day-of.
- 'Awaiting payment' reservations view: accepted bookings sit in awaiting_payment with a payment_deadline and are completely hidden from the host.
- Host-side booking cancellation UI: cancelBooking exists in lib/host.ts (returns refund DZD) but NO host screen calls it — there is no cancel-confirmed-booking flow with reason in the app.
- Decline reason capture: decline_booking_request supports p_reason but the UI never collects it.
- Per-locale room-type names: pricing step only writes name_ar; no ar/fr/en tabs for room names (mis-tags non-Arabic names).
- Photo management: no reordering, no choose-cover, no multi-select, no captions.
- Listing lifecycle management: no unpublish/pause, no delete-draft, no edit-after-approval flow surfaced (the wizard re-edit path exists but writes are blocked by the claim issue).
- Draft persistence + 'save and exit': abandoning the wizard loses all in-memory progress and can orphan a draft property + uploaded photos.
- Calendar: no clear-override-to-base, no copy-pricing-across-days, no per-day tap detail, no bookings overlay on the host calendar.
- Payout method/RIB management (ccp/bank destination_rib) — hosts can see payouts but cannot set where money goes.
- Real map for location (acknowledged Mapbox stub) — coordinate entry is effectively unusable.
- Performance: no trends/time ranges; no real views metric.
- No notifications/badges for new requests or low-availability within host mode.

## Top priorities
1. Fix the host_id-claim lifecycle: (a) confirm custom_access_token_hook is enabled in the Supabase Auth settings; (b) call supabaseClient.auth.refreshSession() immediately after become_host() in BOTH src/lib/wizard.tsx ensureDraft() and app/(tabs)/profile.tsx onSwitchToHosting() so the new host_id/role claims are present before any host write. Without this, listing creation, photo upload, calendar writes, accept/decline, and reply all fail for new hosts.
2. Fix photo upload path in src/lib/listings.ts uploadPhoto: store under `${hostProfileId}/${propertyId}/${filename}` (host_profile id, not auth uid) to satisfy the storage 'host upload/update/delete' policies; thread hostProfileId through UploadPhotoInput and the photos step. Correct the misleading RLS comment block at the top of listings.ts.
3. Fix the calendar off-by-one: in app/host/calendar.tsx / src/lib/host.ts setAvailabilityRange, send p_to as EXCLUSIVE (pass the picker's checkOut as-is, or rangeEnd+1 day) so the last selected night is written and single-day selections don't raise INVALID_RANGE — mirroring the hotel web fix. Update the JSDoc that wrongly says p_to is inclusive.
4. Close the booking-lifecycle gap: add an 'Awaiting payment' state to host reservations (so accepted bookings remain visible) and add host check-in/check-out (and no-show) actions — which also requires a host-callable RPC for confirmed→checked_in→completed/no_show (currently none exists).
5. Surface host-side cancellation: wire the existing cancelBooking() into the Upcoming/confirmed cards with a reason prompt and refund preview; capture decline reason for declines.
6. Make wizard submit transactional/idempotent: write room_type ids back into the draft after insert (or do an upsert) so retrying submit_property_for_review never duplicates room_types; reset() the wizard draft on success.
7. Differentiate error states across all host screens: distinguish auth/claim/RLS vs network vs validation so the failures above are diagnosable instead of a blanket 'Could not save'.
8. Localize host UI: remove the hardcoded Arabic header title in host/_layout.tsx; translate amenity category headings (don't render raw DB slugs); render localized cancellation-tier labels in review/policy.
9. Add per-locale room-type name entry in the pricing step (don't dump all names into name_ar); add character/format guidance and DZD thousands formatting.
10. Persist the wizard draft to AsyncStorage (and add save/discard-on-exit) so interruptions don't lose progress or orphan drafts/photos; add photo reorder + choose-cover + multi-select.
