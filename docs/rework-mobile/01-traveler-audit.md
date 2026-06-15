# Audit — traveler

## Screens

### `app/_layout.tsx (root Stack)` — **working**
Loads fonts + locale, sets RTL via I18nManager before first render, wraps tree in I18nextProvider, declares the root Stack.

**Bugs:**
- No <SafeAreaProvider> from react-native-safe-area-context is mounted at the root, yet TabBar.tsx calls useSafeAreaInsets(). Without a provider the hook returns zero insets (or warns), so the bottom tab bar's safe-area padding silently collapses on devices with a home indicator. This is an app-wide correctness issue.
- Stack screenOptions sets animation 'slide_from_left' under RTL, but most screens render headerShown:false and use their own custom top bars, so the global header style/tint is largely dead config.

**UX:**
- Splash fallback is a bare centered ActivityIndicator (the brief says avoid bare spinners) — fine briefly, but there is no branded splash content.
- No global error boundary: a throw in any screen white-screens the whole app.

### `app/index.tsx` — **working**
Redirects to /(tabs).

### `app/onboarding.tsx` — **partial**
Language picker (AR/FR/EN); persists choice, forces RTL, reloads via expo-updates.

**Bugs:**
- setLocale() relies on expo-updates reloadAsync; in Expo Go / dev client it throws and only console.warns. The screen then resets `applying` to null but the language does NOT actually apply until a manual restart — the user sees the selection 'stick' with no effective change. The reloadHint text is only shown while `applying!==null`, which is cleared immediately, so the user gets no persistent instruction.
- Brand wordmark is hardcoded Arabic 'ضيافة' with arabicBold font regardless of selected locale — acceptable as a logo, but the heading uses RN_FONTS.arabicBold even in EN/FR.

**UX:**
- Presented as a modal from root but also used as the in-app 'Language' route from Profile via router.push('/onboarding') — there is no close/back affordance on the screen itself, so when opened from Profile (not as the first-launch modal) the user can get stuck if the modal gesture is unavailable.
- Uses SafeAreaView from react-native (deprecated, only pads top on iOS) instead of safe-area-context edges.
- Selecting the already-current locale is a no-op with no feedback.

### `app/(tabs)/_layout.tsx` — **partial**
Guest bottom-tab shell: <Slot/> + custom <TabBar/>; calls usePushRegistration().

**Bugs:**
- TabBar uses useSafeAreaInsets() but no SafeAreaProvider is mounted (see root layout) → bottom inset is 0, bar can sit under the home indicator.

**UX:**
- Tab switching uses router.replace(), which destroys per-tab navigation/scroll state on every switch (no stack-per-tab). Scroll position and in-progress state are lost moving between Explore/Trips/Inbox/etc.

### `app/(tabs)/index.tsx (Explore)` — **buggy**
Search-entry bar + curated rails (Popular in wilaya, Top rated, Beachfront, Sahara).

**Bugs:**
- Both the rail 'see all' (router.push('/search/results')) and there is no wiring of a rail's wilaya/type into results — results gets ZERO params and re-searches everything, so 'Popular in Oran → see all' shows all listings unfiltered. The label even reads pick(L.results) ('Results'), not 'See all'.
- Rails are built with 4 separate searchProperties() calls PLUS listWilayasWithListings + listActiveWilayas; each searchProperties() re-runs readApprovedSummaries() (full table scan of approved properties with all child joins). That's ~6 full reads of the same data per Explore load — heavy and redundant.
- Beachfront/Sahara rails are derived purely from a hardcoded wilaya-code list (COASTAL_WILAYAS/SAHARA_WILAYAS), not from any property attribute, so they are just 'top rated in these wilayas' mislabeled as Beachfront/Sahara.

**UX:**
- No pull-to-refresh: rails load once (rails===null guard) and never refresh on focus; a new listing or rating change won't appear without app restart.
- Uses SafeAreaView (react-native) — only top padding on iOS, nothing on Android; content can collide with the status bar on Android.
- Search-entry bar always shows 'Anywhere · Any dates · Guests' placeholder; it never reflects a prior search the user ran.
- Tagline uses RN_FONTS.arabicRegular for an Arabic-only string even when the UI locale is EN/FR.

### `app/(tabs)/trips.tsx` — **buggy**
Segmented Upcoming/Completed/Cancelled over the guest's own bookings; pay + review CTAs.

**Bugs:**
- The 'Leave review' CTA is shown on EVERY completed booking with no hasReviewedBooking() check, so already-reviewed stays still show 'Leave a review'; tapping leads to review/[bookingId] which then shows the 'already reviewed / ineligible' state — a dead-end loop. The copy.alreadyReviewed string exists but is unused here.
- load() ignores AbortController/race: rapidly switching buckets fires overlapping listMyBookings() calls; the last to resolve wins regardless of which bucket is active, so a slow earlier request can overwrite the current bucket's data.
- listMyBookings() selects BOOKING_SELECT with `*` plus full property_photos for every booking — pulls all photo rows per booking just to compute a cover; fine for demo size, wasteful at scale.

**UX:**
- Switching buckets sets data=null → full SkeletonList flash on every tab tap (no cached per-bucket data).
- Signed-out state uses generic EmptyState with no sign-in button (unlike Profile which has one).
- SafeAreaView (react-native) used; bottom list content can run under the tab bar (listContent has no extra bottom padding for the bar height).
- No haptic/feedback on bucket switch or card press.

### `app/(tabs)/inbox.tsx` — **buggy**
Unified conversations list (guest+host), realtime message refresh, unread hint.

**Bugs:**
- Realtime channel subscribes to ALL public.messages INSERTs (no filter), then calls load() on every insert app-wide. Any message between any two users triggers a full listConversations() re-fetch for this user. Noisy and leaks work; should scope to the user's conversations.
- CONVERSATION_SELECT pulls EVERY message of EVERY conversation (messages ( id, body, sender_id, created_at, read_at ) with no limit) just to derive the last message + unread client-side. For long threads this is a large over-fetch and the 'last message' is computed by sorting all messages in JS.
- Unread is computed from messages.read_at, but NO screen ever sets read_at (conversation/[id] never marks messages read) — so the unread dot is effectively permanent once any inbound message exists.
- load() guards on `if (myUid)` inside useFocusEffect but never clears data when the user signs out, so a previous user's conversations can linger in state.

**UX:**
- No skeleton-to-content for the realtime path; every inbound message causes a silent full reload (no optimistic update).
- Time uses formatDateTime (date + time) for every row — for older messages it shows full date, no relative 'time ago'.
- SafeAreaView (react-native); list bottom can hide under the tab bar.

### `app/(tabs)/wishlists.tsx` — **stub**
Wishlists/favorites tab.

**Bugs:**
- Hardcoded 'Coming soon' empty state despite the DB having full support: wishlists, wishlist_items tables, the favorites view, and wishlists_owner_all / wishlist_items_owner_all RLS all exist. No saving, no heart toggle, no collections — an entire core feature is unimplemented.
- Because there is no wishlist write path anywhere in the app, property cards/detail have no 'save/heart' affordance at all.

**UX:**
- Tab is a permanent dead end; Profile even links to it labeled 'Coming soon'.
- SafeAreaView (react-native).

### `app/(tabs)/profile.tsx` — **partial**
Identity card, shortcuts (Trips/Wishlists/Language), Switch-to-Hosting (become_host), sign-out.

**Bugs:**
- displayName reads user.user_metadata.display_name (sign-up metadata) and never reads the profiles row; if the user changed their profiles.display_name elsewhere (web), Profile shows the stale signup value or email.
- onSwitchToHosting calls becomeHost() every time the button is tapped, even for users who are already hosts — it relies on become_host being idempotent but makes a network write on every tap with only a generic loadError on failure.
- Avatar is a static emoji; profiles.avatar_path is never loaded/rendered.

**UX:**
- No edit-profile, no notification settings, no help/about, no currency/region — a thin profile.
- Trips/Wishlists shortcuts use router.replace('/(tabs)/trips') which swaps the tab destructively rather than switching tabs cleanly.
- Sign-out has no confirmation and no spinner; it just fires signOut().
- SafeAreaView (react-native).

### `app/(auth)/sign-in.tsx` — **working**
Email+password sign-in; honors ?next=host, else router.back.

**Bugs:**
- After sign-in with no next and no back stack it router.replace('/') which redirects to tabs — fine, but when reached from booking/confirm via router.replace('/(auth)/sign-in') (confirm replaces itself), a successful sign-in calls router.back() returning to... whatever is below, NOT back to the booking the user was completing — the in-progress booking context (dates/room/guests) is lost.
- All auth errors collapse to one generic message; rate-limit / unconfirmed-email / wrong-password are indistinguishable to the user.

**UX:**
- No 'forgot password' link/flow at all.
- SafeAreaView (react-native); header padding only.

### `app/(auth)/sign-up.tsx` — **working**
Email+password sign-up; shows 'check email' when confirmation required.

**Bugs:**
- On auto-confirm dev path it router.back()/replace('/') but does not honor a ?next param (sign-in does) — signing up mid-host-flow won't route to /host.
- Generic failure copy hides duplicate-email vs weak-password distinctions.

**UX:**
- 'Check your email' state has no resend-email action.
- SafeAreaView (react-native).

### `app/search/index.tsx` — **buggy**
Search entry: destination (wilaya), dates (calendar), guests; pushes /search/results with serialized params.

**Bugs:**
- The destination wilaya list is rendered inside a View with maxHeight:320 sitting INSIDE the outer ScrollView, but it is NOT itself scrollable (plain View) and is sliced to .slice(0,30). With 58 Algerian wilayas, wilayas 31–58 are unreachable from the picker; the height cap also clips rows with no inner scroll.
- Dates panel embeds DateRangePicker inside a fixed height:380 View inside the page ScrollView — vertical drag inside the calendar competes with the page scroll (nested scroll conflict).
- onSearch always sends guests=adults+children even when the user never opened the guests panel, and never sends min/max occupancy intent; a default of 1 adult is fine but there's no 'any guests' option.

**UX:**
- No recent searches / popular destinations.
- Wilaya search input has no clear button and no 'no matches' message when the query filters everything out.
- Calendar has no min-stay or unavailable-date awareness at search time (it's a blank range picker).
- SafeAreaView (react-native).

### `app/search/results.tsx` — **buggy**
Reads search params, runs searchProperties, List⇄Map(stub) toggle, Filters + Sort.

**Bugs:**
- All filtering and sorting is done CLIENT-SIDE after readApprovedSummaries() pulls the entire approved set with every child join — no pagination, no server-side wilaya/price filter. Scales badly and re-fetches the whole table on every param change (filtersKey).
- headerTitle derives the wilaya name from results[0].wilaya only when results exist; if the wilaya has 0 results the header shows generic 'Results' instead of the searched wilaya name, hiding what was searched.
- Map mode is a stub (acknowledged) — but the List/Map toggle persists 'map' in component state only, lost on any param change/refocus (useFocusEffect resets results but not mode; acceptable, but map gives no real geographic value).

**UX:**
- No pull-to-refresh on the results FlatList.
- Sort is a cycle-through-a-pill (tap to advance) rather than a labeled chooser — the user can't see all options or jump to one; easy to overshoot.
- Filters applied-count badge counts facets but the header pill doesn't reflect dates/guests.
- SafeAreaView (react-native); results bottom padding doesn't account for the tab bar when entered as a pushed route over tabs (it's pushed on root stack, so no tab bar — OK).

### `app/search/filters.tsx` — **partial**
Edit price/type/instant/rating/amenities; apply back to results.

**Bugs:**
- onApply uses router.navigate({pathname:'/search/results', params}) which, combined with results.tsx already being in the stack, can create a second results instance or no-op depending on expo-router dedupe; back-stack from filters→results is ambiguous (sometimes returns to the OLD results params).
- Price inputs accept any number with no min<=max validation; entering min=9999999 max=0 yields a silently empty result set with no hint.

**UX:**
- No live result-count preview on the 'Show results' button (common pattern: 'Show 12 stays').
- Amenities render as one flat chip wrap with no category grouping despite amenities.category existing in the schema.
- SafeAreaView (react-native).

### `app/property/[id].tsx` — **buggy**
Gallery, title/rating, amenities, rules, check-in/out, cancellation, rooms, reviews, message-host, sticky booking widget + overlays.

**Bugs:**
- Message-host uses findMyBookingForProperty() which queries bookings by property_id with NO status/guest filter beyond RLS, then getOrCreateConversation(bookingId). For a guest with a booking this works; but findMyBookingForProperty returns the newest booking regardless of state, and getOrCreateConversation will create a 'booking' conversation even for a cancelled/expired booking — there is no inquiry-kind conversation path, so a guest who hasn't booked simply cannot message the host (only the 'book first' nudge).
- ReviewsSummary fetches listReviewsForProperty(propertyId) on focus, but getPropertyDetail ALREADY fetched reviews in its join (raw.reviews). Reviews are loaded twice (detail join + separate query).
- Gallery onScroll uses scrollEventThrottle=16 with a non-native onScroll setState per frame → index recompute every frame while swiping (jank on lower-end devices).
- Occupancy: the guests overlay caps adults at selectedRoom.max_adults ?? 16 and children at max_children ?? 10 independently; a user can pick adults=max_adults AND children=max_children exceeding max_occupancy, and the property screen never warns (only booking/confirm catches occupancyExceeded). The widget will compute a quote and let them Continue.

**UX:**
- The whole screen is a ScrollView with a sticky bottom widget but the gallery back button sits in a SafeAreaView absolutely positioned over the image — on Android (no top inset from RN SafeAreaView) the back button can overlap the status bar.
- No 'save to wishlist' / heart anywhere (feature missing).
- House rules and description show only the localized string with ar→fr→en fallback; if only Arabic exists, an EN user sees Arabic with no indicator.
- Map/location: there is no map or even approx area shown on the detail screen (geo_fuzzed exists) — only wilaya·commune text.
- Reviews section caps at 6 with a 'show all reviews' copy string defined (showAllReviews) but NO control rendered to actually see all reviews.
- Sticky widget 'dates' line nests a Pressable's onPress (guests) inside another Pressable's Text — tap targets for dates vs guests overlap and are tiny.

### `app/booking/confirm.tsx` — **buggy**
Confirm dates/guests, client price preview, guest details, create_booking; route to pay or detail.

**Bugs:**
- Not-signed-in handling: onSubmit does router.replace('/(auth)/sign-in') which REPLACES the confirm screen. After sign-in, sign-in.tsx router.back() returns to property (or wherever), and all the entered dates/room/guests/guest-details on confirm are gone — the user must rebuild the booking. create_booking is also never auto-retried.
- Guest details (fullName, phone) are concatenated into special_requests as a text blob ('Full name: X\nPhone: Y\n...') rather than written to profiles.full_name / profiles.phone_e164 — the structured columns exist but are ignored; host sees contact info buried in special_requests.
- occupancyExceeded only checks guests > room.max_occupancy (single unit, units=1 hardcoded). Multi-unit booking is impossible from the app (units:1 always), even though create_booking accepts p_units and the schema supports it.
- After createBooking it re-reads via getBookingDetail then branches on awaiting_payment vs else; a 'requested' (request-to-book) booking routes to /booking/[id] correctly, but a network failure on the re-read throws into the catch and shows bookingErrorMessage (UNKNOWN 'could not create booking') even though the booking WAS created — misleading.

**UX:**
- Price shown is explicitly a client estimate; service fee is always 0 in preview AND server (v_service_fee=0), so the 'estimate vs server' caveat is mostly noise — but there's no min-nights validation surfaced before submit (server raises MIN_NIGHTS, mapped, but the screen lets you submit a too-short stay first).
- Phone field has no E.164 validation/formatting for +213.
- KeyboardAvoidingView offset is hardcoded 80; the footer CTA can still be covered by the keyboard on some devices.
- SafeAreaView (react-native).

### `app/booking/[id]/index.tsx` — **buggy**
Trip/booking detail: status banner, property summary, dates/guests, authoritative price breakdown, code, message-host, pay/review CTAs.

**Bugs:**
- NO cancel-booking action anywhere, despite cancel_booking(p_booking_id,p_reason) and quote_refund(p_booking_id) RPCs existing. A guest cannot cancel a requested/awaiting_payment/confirmed booking from the app at all — a major missing flow.
- Price breakdown's first line label is `${nights} × ${booking.nights}` i.e. literally 'nights × N' (e.g. 'nights × 3') — it shows the word 'nights' then the count, not 'N nights × rate'; the per-night rate is omitted entirely (unlike confirm.tsx which shows rate × nights).
- Message-host calls getOrCreateConversation(id) directly with the booking id — correct — but on a declined/expired booking the RPC still creates a 'booking' conversation; there's no guard for terminal states.
- No realtime/refetch on status change: a host accepting a 'requested' booking won't update this screen unless the user manually re-focuses (useFocusEffect reloads on focus, so it's OK on navigation, but not live).

**UX:**
- Completed bookings show 'Leave review' even if already reviewed (no hasReviewedBooking check here either) → same dead-end as Trips.
- Booking code is presented but not copyable (no copy-to-clipboard).
- No cancellation-policy reminder or refund preview on this screen.
- SafeAreaView (react-native).

### `app/booking/[id]/pay.tsx` — **partial**
Payment: real Chargily Edge Function checkout + __DEV__ dev_simulate_payment; refresh on return.

**Bugs:**
- Real path opens the Chargily checkout_url via Linking.openURL (external browser) and relies on the user manually tapping 'Refresh status' on return — there is no deep-link return handler, no polling, and no realtime subscription on the booking/transaction. If the webhook confirms slightly later, the user sees a stale 'awaiting payment' until they manually refresh.
- payDev routes to /booking/[id] immediately after dev_simulate_payment resolves, but does not verify the returned status string ('applied'); if apply_payment_event returned anything else the user still gets bounced to detail as if paid.
- load() auto-redirects to /booking/[id] when status==='confirmed' on focus — but if the user lands here for a booking that is NOT awaiting_payment (e.g. still 'requested'), the screen shows Pay buttons that the server will reject (dev_simulate_payment raises NOT_AWAITING_PAYMENT), surfacing a raw Postgres error message to the user.

**UX:**
- Errors from the Edge Function / RPC are shown raw (rpcErr.message, e.message) — untranslated Postgres/JS error text leaks to the user.
- No countdown to payment_deadline; just a static formatted timestamp. An expired deadline is not detected client-side.
- Method note is hardcoded 'Edahabia / CIB · Chargily Pay' with no actual method selection (edahabia vs cib vs baridi_qr) even though payment_method enum has all three.
- SafeAreaView (react-native).

### `app/conversation/[id].tsx` — **buggy**
Message thread: header, bubbles, composer, send_message, realtime append.

**Bugs:**
- Messages are NEVER marked read. There is no mark-read RPC and the screen never updates messages.read_at, so opening a thread does not clear the inbox unread dot or the (message-derived) unread state. The messages_update RLS policy WOULD allow the recipient to set read_at, but nothing does it.
- onSend does an OPTIMISTIC-less flow: after sendMessage it calls listMessages(id) again (full refetch) AND the realtime INSERT also appends — double work; also there is a window where the realtime event for the user's own message arrives before the refetch, handled by dedupe, but the refetch can momentarily reorder/replace state.
- Realtime channel filter is conversation_id=eq.{id} (good), but listMessages already filters deleted_at IS NULL while the realtime append does not check deleted_at — a soft-deleted message inserted (unlikely) would appear.
- getConversationHeader/listMessages run only when myUid is set; if session is still loading the screen shows the skeleton, but if the user is signed out entirely there's no sign-in prompt (just perpetual skeleton then empty).

**UX:**
- Every bubble shows full date+time (formatDateTime) — no day separators, no grouping, very cluttered for back-and-forth chats.
- scrollToEnd fires on every messages change via requestAnimationFrame; on keyboard open + new message this can fight the keyboard.
- Send glyph is the same '➤' for LTR and RTL (the ternary returns '➤' both ways) then mirrored via scaleX — works, but the conditional is pointless.
- No typing indicator, no delivery/read receipts (read state unimplemented).
- SafeAreaView (react-native); composer bottom inset not handled for the home indicator.

### `app/notifications.tsx` — **partial**
List notifications, mark-read on tap + mark-all, route by type, realtime prepend.

**Bugs:**
- notificationRoute routes review_* to /property/{property_id} but the host-side 'review_received' notification is for the HOST; in the customer app a guest tapping a routed review notification lands on the public property page, not their booking/review — minor mis-route for hosts using the same app in host mode.
- Realtime only handles INSERT (prepend). read_at UPDATEs from other devices/screens are not reflected here (the NotificationBell subscribes to '*', but this list does not), so cross-device read state can drift until manual refresh.
- onTap routes via router.push(route as Href) with a string cast; routes like '/conversation/{id}' are valid, but there is no validation that the target still exists (e.g. a deleted booking) → can push to a screen that then shows not-found.

**UX:**
- Glyphs are emoji per type; fine, but there's no grouping by day/'new vs earlier'.
- No swipe-to-dismiss or per-item delete.
- SafeAreaView (react-native).

### `app/review/[bookingId].tsx` — **working**
Six 1–5 category stars + optional comment → submit_review; eligibility guards.

**Bugs:**
- Eligibility load runs getBookingDetail then hasReviewedBooking — two sequential round-trips on every focus; acceptable but the screen is reachable from Trips/Detail which already showed a 'Leave review' button that didn't pre-check, so users frequently hit the 'ineligible' state here (UX dead-end described under Trips).
- submitReview passes p_overall:null so the server averages — correct; but on the rare server INVALID_SCORES the raw error message is shown (e instanceof Error ? e.message) rather than the localized reviewFailed.

**UX:**
- Comment field has no character counter/limit.
- On 'done' the only CTA is 'View trip' → router.back(); the new review isn't reflected anywhere the user can immediately see.
- KeyboardAvoidingView has no keyboardVerticalOffset; the submit footer can be covered on Android.
- SafeAreaView (react-native).

## Cross-cutting
- SAFE AREA: Every traveler screen uses SafeAreaView imported from 'react-native' (top-only, iOS-only) instead of react-native-safe-area-context edges. No <SafeAreaProvider> is mounted at the root, yet TabBar.tsx calls useSafeAreaInsets() → the tab bar's bottom safe-area padding is effectively 0. Bottom content (lists, composers, sticky CTAs) can sit under the home indicator / nav bar across the app.
- DATA FETCHING: Discovery is entirely client-side. searchProperties() → readApprovedSummaries() pulls ALL approved properties WITH property_photos + room_types + wilaya + property_type joins on every call, and Explore calls it ~4× per load plus 2 wilaya lookups. No pagination, no server filtering by wilaya/price, no caching layer (no react-query/SWR) — each screen re-fetches from scratch on focus. Will not scale past the demo dataset.
- NAVIGATION/STATE LOSS: Tabs use router.replace() (no stack-per-tab) so scroll/nav state is destroyed on tab switch. Auth interception in booking/confirm uses router.replace('/(auth)/sign-in'), losing all in-progress booking input on return. Search 'see all' and rail taps push /search/results with no params.
- REALTIME: Inbox subscribes to ALL public.messages INSERTs unfiltered (every message between any users triggers a full reload for this user). Multiple channels are created across NotificationBell + notifications + inbox + conversation; teardown is correct (removeChannel in cleanup) but the unfiltered inbox channel is wasteful and a privacy-adjacent over-subscription.
- READ-STATE NEVER WRITTEN: messages.read_at is never set anywhere (conversation screen doesn't mark read), so inbox unread indicators are permanent once any inbound message exists, even though messages_update RLS permits the recipient to set read_at.
- I18N/RTL: Many Latin/EN/FR strings are styled with RN_FONTS.arabic* families (e.g. titles, search tagline, body paragraphs) regardless of locale — Arabic font applied to French/English text. The 'localizedName' ar→fr→en fallback silently shows Arabic content to EN/FR users with no language indicator. RTL itself is handled (I18nManager.forceRTL + logical props + writingDirection:'ltr' on prices) but applying a language requires expo-updates reloadAsync, which fails in Expo Go with only a console.warn.
- ERROR HANDLING: Catch blocks broadly collapse to one generic localized message (loadError) OR leak raw Postgres/JS error strings to the user (pay screen rpcErr.message/e.message, report sheet, review submit, dev_simulate_payment NOT_AWAITING_PAYMENT). create_booking error classifier maps by string-matching the error message, which is fragile.
- FEEDBACK/HAPTICS: No haptics anywhere (no expo-haptics) on key actions (book, pay, send, switch tabs, select). Pressed states are opacity-only.
- MISSING PULL-TO-REFRESH: Explore, Search results, Property detail, Booking detail, Conversation have no pull-to-refresh; only Trips, Inbox, Notifications do.
- PERF: Several full-table reads with all child joins (discovery summaries, bookings BOOKING_SELECT with all photos, inbox pulling all messages per conversation). Gallery onScroll setState per frame. No FlatList virtualization tuning (initialNumToRender/windowSize) on long lists.

## Missing features
- Wishlists / favorites entirely unimplemented (tab is a 'Coming soon' stub) despite full DB support (wishlists, wishlist_items, favorites view, RLS). No save/heart affordance on any property card or detail screen.
- Cancel booking: no UI for cancel_booking + quote_refund anywhere; guests cannot cancel or even see a refund quote.
- Multi-unit booking: app hardcodes units:1; create_booking/p_units and schema support multiple units but there's no quantity selector.
- Real map: results map is a labeled stub; no interactive map and no location/approx-area map on property detail (geo_fuzzed/approx_lat/approx_lng unused).
- Inquiry conversations: messaging a host requires an existing booking (kind='booking'); the conversation_kind 'inquiry' is never used, so pre-booking questions are impossible.
- Forgot/reset password: no flow in (auth).
- Profile editing: no edit of profiles.full_name/phone_e164/avatar_path/preferred_locale/default_wilaya_code from the app; avatar never rendered.
- Message read receipts / mark-as-read: read_at never written; no delivery/read UI.
- Phone verification (phone_e164/phone_verified_at columns exist) — no flow.
- Show-all-reviews screen: property detail caps at 6 reviews with a 'show all' copy string but no control/route to view the rest.
- Saved/recent searches and 'any guests' option on the search entry.
- Disputes: open_dispute/disputes UI absent (schema + RLS exist) — no way for a guest to open a dispute from a trip.
- Booking-code copy-to-clipboard and add-to-calendar for confirmed trips.
- Push notifications: usePushRegistration() is called but device-token storage is a noted follow-up; no settings to manage notifications.

## Top priorities
1. Mount react-native-safe-area-context <SafeAreaProvider> at the root and replace every react-native SafeAreaView with safe-area-context (edges incl. bottom) so the tab bar, lists, composers, and sticky CTAs respect the home indicator — currently TabBar's useSafeAreaInsets() returns 0 with no provider.
2. Implement message read-state: mark messages read on opening conversation/[id] (set read_at via the permitted messages_update RLS), and scope the inbox realtime channel to the user's conversations instead of all public.messages. This fixes permanent unread dots and the noisy global subscription.
3. Build the Wishlists feature end-to-end (heart toggle on cards/detail, default wishlist via wishlist_items, list + collections) — it's a core traveler feature with full DB support sitting unused.
4. Add a Cancel-booking flow on booking/[id] using quote_refund (show refund preview) + cancel_booking, with a confirmation and localized errors.
5. Fix booking-flow context loss: keep the user's dates/room/guests when sign-in is required (pass them as params / return to confirm with ?next), and persist guest contact to profiles.full_name/phone_e164 instead of cramming them into special_requests.
6. Wire Explore rails 'see all' and rail context (wilaya/type) into /search/results params, and fix Beachfront/Sahara rails to use real attributes; stop calling searchProperties() ~4× per Explore load (single fetch + client-side bucketing).
7. Move discovery filtering/sorting/pagination server-side (or at least de-duplicate the full-table+joins fetches and add a caching layer), and stop double-fetching reviews on property detail.
8. Stop showing 'Leave review' on already-reviewed completed bookings (check hasReviewedBooking in Trips and booking/[id]) to remove the ineligible dead-end loop.
9. Harden the payment screen: handle Chargily return (deep link or poll/realtime on the transaction/booking), guard non-awaiting_payment states, and replace raw error strings with localized copy; surface a payment_deadline countdown.
10. Audit i18n font usage so EN/FR text doesn't use Arabic font families, indicate when content falls back to another language, and make language change robust outside expo-updates (clear restart instruction when reloadAsync is unavailable).
