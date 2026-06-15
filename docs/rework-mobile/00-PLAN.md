All the load-bearing claims are confirmed against the actual code: photo upload path uses `${input.userId}/${input.propertyId}/` (line 348, should be host profile id), `setAvailabilityRange` JSDoc says `p_to` is inclusive (lines 190-193), root layout has no `SafeAreaProvider`/`GestureHandlerRootView` and a bare `ActivityIndicator` splash, and `package.json` lacks the native interaction stack. I have everything I need to write the source-of-truth plan.

# Dyafa Mobile (`apps/customer`) — Rework Plan

> Source of truth for rebuilding the Expo/React Native customer app (traveler + host mode). Synthesizes the traveler audit, host-mode audit, platform audit, and the mobile UX/design-system spec. Every section is prioritized; bug references are concrete and verified against the codebase (e.g. `src/lib/listings.ts:348`, `src/lib/wizard.tsx:151-179`, `app/_layout.tsx:95-101`).

---

## 1. Goals & principles

**What "good native" means here.** The web dashboards were just reworked onto the brand design system; mobile must feel like the same brand, but native: persistent tabs (no state loss), bottom sheets instead of in-screen overlays, skeletons instead of bare spinners, real icons instead of emoji, `expo-image` with blur-up instead of raw `<Image>`, haptics on commit actions, pull-to-refresh on every feed, sticky bottom CTAs above the home indicator, and 60fps virtualized lists. Equally important: **every flow must actually work** — today first-time hosting is fully broken (RLS blocks listing creation, photo upload, calendar writes), wishlists are a stub, booking cancellation is missing, message read-state is never written, and the booking flow loses all context on the sign-in detour.

**i18n/RTL stance (locked).** English is the default and LTR; Arabic is RTL (via `I18nManager.forceRTL`); French is LTR. All three selectable. The current code already sets direction before first render in `app/_layout.tsx`. We keep that, fix the stale "Arabic-default" doc comments, route every number/price/date through `@dyafa/i18n` formatters, set `writingDirection` on every `TextInput` (not just `textAlign`), use logical layout props (`marginStart/End`, `start/end`) instead of physical, and mirror only directional icons. Language change still requires a reload (`expo-updates`) — we make the "restart to apply" instruction persistent and add a `DevSettings.reload()` fallback for Expo Go.

**Design direction (one paragraph).** Warm-Mediterranean, calm, editorial. Bone canvas (`#F7F3EC`), white surfaces, deep teal (`#0E3A3A`) for all structure (headers, primary buttons, links, active nav), terracotta (`#C97B5A`) strictly rationed to one commit element per viewport (the Reserve/Pay CTA, price text, active selection, rating stars — never yellow stars). Fraunces for display headings (Plex Arabic substitutes in Arabic), Plus Jakarta for body (Plex Arabic in Arabic), DZD always formatted with Latin numerals and 0 fraction digits. Motion is decelerate/standard easing, no bounce except the sheet spring; everything gated by `useReducedMotion()`.

---

## 2. RN design system & shared components (build FIRST)

The app currently ships **none** of the modern RN interaction stack (`apps/customer/package.json` confirmed: no reanimated, gesture-handler, bottom-sheet, expo-haptics, expo-image, flash-list, icon set). This is the foundation; build it before touching screens.

### 2.1 Install the native foundation (Phase 0)
Install via `npx expo install` so versions match SDK 54. All work in Expo Go on SDK 54 except where noted:

| Library | Why |
|---|---|
| `react-native-reanimated` (v4) | Shimmer, sheet springs, layout animations, `useReducedMotion()`. Requires New Architecture — confirm `newArchEnabled: true` (default SDK 54), else pin v3. Add `react-native-reanimated/plugin` **last** in `babel.config.js` (currently missing — platform audit §6). |
| `react-native-gesture-handler` (v2) | Backs bottom-sheet; swipe-to-dismiss, gallery pan. Wrap root in `GestureHandlerRootView`. |
| `@gorhom/bottom-sheet` (v5) | The sheet system. Add `BottomSheetModalProvider` at root. |
| `expo-haptics` | Tactile feedback on commit/select/destructive. |
| `expo-image` | Blur-up, disk/memory cache, `contentFit` — replaces `RemoteImage.tsx` (raw `<Image>` + infinite pulse loop). |
| `@shopify/flash-list` (v2) | Virtualized lists (results, inbox, reservations, reviews). |
| `lucide-react-native` + `react-native-svg` | Real icons matching web (web uses lucide-react). Replaces all emoji glyphs. |

Also at root (`app/_layout.tsx`): mount `SafeAreaProvider` (currently absent — `TabBar.useSafeAreaInsets()` returns 0, bottom inset collapses), `GestureHandlerRootView`, `BottomSheetModalProvider`, `ToastProvider`, and a global error boundary (today any throw white-screens the app).

### 2.2 The elevated component set → `apps/customer/src/ui/`
Builds directly on `@dyafa/design-tokens` `rnTheme` (re-export as `@/theme`). Keep existing `ui.tsx`/`fields.tsx` as thin re-exports during migration, then delete.

- **`Screen`** — `useSafeAreaInsets()` wrapper + bg + optional `scroll`/`refreshing`/`onRefresh`/`footer` (sticky CTA above home indicator). Replaces every `SafeAreaView from 'react-native'` (used on **every** screen today — top-only, iOS-only).
- **`Header`** — 56dp + top inset, RTL-mirrored back chevron, `rightSlot`, `transparent` variant (property gallery overlay with scrim). Replaces hardcoded Arabic native header in `host/_layout.tsx` and raw `←/→` Text glyphs in host screens.
- **`Text` / `Heading`** *(highest leverage)* — `variant` → `{fontSize, lineHeight}` from tokens; **auto-selects Arabic face by locale**. Kills the per-screen `RN_FONTS.arabicRegular`-on-Latin-text smell and the duplicated module-level `const textAlign = I18nManager.isRTL ? ...`. `lineHeight` from `rnTheme` is **absolute px** — never re-multiply (invariant). `allowFontScaling` on, `maxFontSizeMultiplier` capped on chrome.
- **`Button`** — `variant: primary(teal) | secondary | tertiary(terracotta, one commit CTA) | danger | ghost`; `size sm/md/lg` (≥44 effective); `loading` (inline spinner, width held, `accessibilityState.busy`); `haptic`.
- **`Card`** / **`ListItem`(Row)** — surface + `shadow.card`; Row has leading/title+subtitle/trailing, 44+dp target, RTL chevron.
- **`TextField`** / **`Select`** / **`SearchBar`** — TextField adds **`writingDirection`** (RTL cursor/delete fix `fields.tsx` lacks), error state, `keyboardType`/`autoComplete`. Select = Row opening a sheet. SearchBar = pill with clear + `returnKeyType='search'`.
- **`Chip`** / **`SegmentedControl`** — Chip with count + removable ×; SegmentedControl powers Trips buckets, locale tabs, and the Travelling↔Hosting toggle.
- **`Badge` / `StatusPill`** — decoupled from labels: pass `tone` + localized `label` (current `STATUS_BADGE` hardcodes 4 statuses). Cover all booking + listing statuses.
- **`Avatar`** (expo-image + initials fallback), **`RatingStars`** (terracotta, half-star, `selection` haptic), **`PriceText`** (wraps `formatDZD`, bidi-isolated so Arabic doesn't reorder).
- **`BottomSheet` / `ConfirmSheet`** — the interaction backbone; replaces in-screen `type Overlay = 'dates' | 'guests'` and all `Alert.alert`. Pads `insets.bottom`.
- **`Toast`** (bottom, above tab bar, live-region), **`Skeleton`** (shimmer + presets: PropertyCard/Detail/Row/Conversation), **`EmptyState` / `ErrorState`** (Lucide icon in tinted circle + working Retry).
- **`List` / `Refreshable`** — FlashList preset with built-in empty/loading/refresh/pagination; teal `RefreshControl`.
- **`WizardProgress`** (stepper + sticky keyboard-aware nav bar), **`PhotoGallery` / `Carousel`** (paged expo-image, counter, RTL paging), **`Map`** (stub, stable API).

---

## 3. Navigation & IA

**Adopt expo-router `<Tabs>`** (built on `@react-navigation/bottom-tabs`, ships transitively; `react-native-screens` + `safe-area-context` already deps). This replaces the custom `<Slot/>` + `router.replace()` tab system (`TabBar.tsx:64`) that destroys per-tab scroll/nav/data state and forces `useFocusEffect` refetch storms. Keep the custom-styled `TabBar` as a `tabBar={}` render prop so we keep the brand look but get lazy mount + state preservation + free a11y. Render a real Lucide icon set (active = teal/filled, inactive = ink-300), unread badges on Inbox/Trips, hide on conversation (keyboard).

**Final tabs (Travelling mode):** Explore · Wishlists · Trips · Inbox · Profile (5, matching `TabBar`; fix the 4-vs-5 docstring mismatch). Stop using `as Href`/`string` casts that defeat `typedRoutes: true`.

**Travelling ↔ Hosting toggle (bidirectional).** Entry in Profile as a prominent Row + (once host) a header affordance on Explore. Switching **pushes the `host/` stack** (clean boundary, don't swap the tab bar in place). Host home gets its own bottom nav context (Today/Reservations/Listings/Calendar/Earnings). Add a persistent **"Switch to Travelling"** affordance in the host header (currently one-directional — only OS back). First switch confirms via ConfirmSheet.

**Modal vs push (codify in `app/_layout.tsx`):** Push = search flow, property detail, checkout, booking detail, conversation, wizard, host. Modal = onboarding (already), auth (consider `formSheet` iOS), image viewer, review composer. Sheet = dates, guests, sort, filters, share/report, confirms. Keep RTL-aware `animation`; disable swipe-back on `booking/[id]/pay.tsx` mid-transaction.

**Deep links.** `app.json` declares `applinks:dyafa.dz` + autoVerify + `scheme:"dyafa"` but there's no verified linking. Add an explicit linking smoke test for `property/[id]`, `booking/[id]`, `conversation/[id]` so push-notification taps land correctly (`notifications.ts:notificationRoute` already returns these paths).

---

## 4. Traveler experience — per-screen spec

> Every screen: wrap in `<Screen>`, replace `SafeAreaView`, skeleton→content, EmptyState/ErrorState with Retry, pull-to-refresh, FlashList for remote lists, Lucide icons, haptics on commit, `<Text>/<Heading>` typography. Below = screen-specific behavior + the audited bugs each must fix.

### 4.1 Root + onboarding
- **`app/_layout.tsx`** — mount `SafeAreaProvider` (fixes app-wide bottom-inset collapse), `GestureHandlerRootView`, `BottomSheetModalProvider`, `ToastProvider`, error boundary. Replace bare `ActivityIndicator` splash (`:95-101`) with branded splash. Add TanStack Query `QueryClientProvider` (§6). Fix stale "Arabic primary" doc comments.
- **`onboarding.tsx`** — language picker. Fix: `setLocale()` relies on `expo-updates.reloadAsync` which throws in Expo Go and only `console.warn`s — show a **persistent** "Restart to apply Arabic/RTL" notice (don't clear it immediately) and call `DevSettings.reload()` fallback. Add a close/back affordance (it's reachable from Profile via `router.push('/onboarding')` with no escape). Use safe-area-context edges. No-op when selecting current locale should give feedback. Heading shouldn't force `arabicBold` in EN/FR.

### 4.2 Explore — `(tabs)/index.tsx` (buggy)
Hero greeting + SearchBar + curated rails. **Fixes:**
- Fetch the approved set **once** (TanStack Query, cached) and derive all rails client-side. Today 4× `searchProperties()` + 2 wilaya lookups each re-run `readApprovedSummaries()` (full table + all joins) → ~6 full reads per load.
- Wire rail "see all" + rail context (wilaya/type) into `/search/results` **params** (today pushes zero params → re-searches everything; label wrongly reads "Results" not "See all").
- Beachfront/Sahara rails: derive from real property attributes, not the hardcoded `COASTAL_WILAYAS`/`SAHARA_WILAYAS` code lists.
- Add pull-to-refresh (rails currently load once, never refresh on focus). Rails → `FlashList horizontal` (not `.map` in ScrollView). expo-image with blur-up. Search bar reflects the last search. Don't use Arabic font for the tagline in EN/FR.

### 4.3 Trips — `(tabs)/trips.tsx` (buggy)
SegmentedControl Upcoming/Completed/Cancelled. **Fixes:**
- Add `hasReviewedBooking()` check before showing "Leave review" (today every completed booking shows it → dead-end loop into the "already reviewed" state; `copy.alreadyReviewed` exists but unused).
- AbortController/request-id guard on `load()` (rapid bucket switching → last-resolve-wins race overwrites the active bucket).
- Cache per-bucket data so switching doesn't flash a full skeleton each tap.
- Signed-out state gets a sign-in button (parity with Profile). Bottom padding clears the tab bar. Haptics on bucket switch/card press. (Perf: trim `BOOKING_SELECT` to a cover photo, not all photos per booking.)

### 4.4 Inbox — `(tabs)/inbox.tsx` (buggy)
**Fixes:**
- Scope the realtime channel to the user's conversations (today subscribes to **all** `public.messages` INSERTs and calls full `listConversations()` on every insert app-wide).
- Stop pulling every message of every conversation just to compute last-message/unread; fetch last message + unread count server-side (or limited select).
- Unread now actually works once `conversation/[id]` writes `read_at` (§4.13). Clear state on sign-out (today a prior user's conversations linger). Relative "time ago" instead of full date. FlashList + bottom padding for tab bar.

### 4.5 Wishlists — `(tabs)/wishlists.tsx` (stub → build end-to-end)
Currently hardcoded "Coming soon" despite full DB support (`wishlists`, `wishlist_items`, `favorites` view, RLS). **Build:**
- Heart toggle on every PropertyCard + detail (optimistic flip + `selection` haptic + rollback toast). Default wishlist via `wishlist_items`; collections list. Grid via `<List>`, optimistic remove + undo toast. Remove the "Coming soon" link in Profile.

### 4.6 Profile — `(tabs)/profile.tsx` (partial)
**Fixes:**
- Read `display_name`/avatar from the `profiles` row, not `user_metadata` (stale signup value otherwise). Render `profiles.avatar_path`.
- `onSwitchToHosting`: only call `becomeHost()` for non-hosts, and **call `supabase.auth.refreshSession()` after** before navigating (host_id/role claims are minted only at token refresh — see §5/§6 root cause). Differentiate the error (not generic loadError).
- Switch tabs cleanly (not `router.replace`). Sign-out gets ConfirmSheet + spinner. Add edit-profile, notification settings, currency/region rows (thin today).

### 4.7 Auth — `(auth)/sign-in.tsx`, `sign-up.tsx` (working, gaps)
**Fixes:**
- Generalize `next` to a validated pathname so booking/checkout returns to the in-progress booking with context intact (today only understands `next='host'`; booking detour loses dates/room/guests — see §4.11). Honor `next` in sign-up too.
- Differentiate auth errors (rate-limit / unconfirmed-email / wrong-password). Add **forgot-password** flow. Add resend-email action on "check your email". Move auth tokens to a SecureStore-backed Supabase storage adapter (currently plain AsyncStorage — `supabase.ts:38`).

### 4.8 Search entry — `search/index.tsx` (buggy)
**Fixes:**
- Destination wilaya list: make it a proper scrollable/searchable list — today it's a plain `View maxHeight:320` `.slice(0,30)` inside the page ScrollView, so wilayas 31–58 are unreachable and rows clip with no inner scroll. Move to a BottomSheet picker with search + clear + "no matches".
- Dates: move `DateRangePicker` into a BottomSheet (today nested in `height:380` View inside the page ScrollView → drag conflict).
- Add "any guests" option; recent/popular destinations.

### 4.9 Search results — `search/results.tsx` (buggy)
**Fixes:**
- Move filtering/sorting/pagination server-side (RPC or PostgREST filters + `onEndReached`); today it pulls the entire approved set with all joins client-side on every `filtersKey` change.
- Header shows the searched wilaya name even with 0 results (today derives from `results[0].wilaya`, falls back to generic "Results").
- Sort becomes a labeled chooser in a sheet (not a cycle-through pill). Add pull-to-refresh. FlashList. Default to List; Map is an honest stub.

### 4.10 Filters — `search/filters.tsx` (partial)
Move into a **BottomSheet** over results (no second results instance / ambiguous back-stack from `router.navigate`). **Fixes:** validate min≤max price (today `min=9999999,max=0` silently empties results); live "Show N stays" count on the apply button; group amenities by `amenities.category`.

### 4.11 Property detail — `property/[id].tsx` (buggy)
Gallery, rating, amenities, rules, rooms, reviews, sticky booking widget. **Fixes:**
- **Pre-booking messaging:** support `conversation_kind='inquiry'` so a guest who hasn't booked can message the host (today `findMyBookingForProperty` + `getOrCreateConversation(bookingId)` requires a booking and even creates a conversation off a cancelled/expired one).
- Stop double-fetching reviews (`getPropertyDetail` already joins `raw.reviews`; ReviewsSummary re-queries on focus).
- Occupancy guard: enforce `max_occupancy` in the guests sheet (today adults and children cap independently and can exceed `max_occupancy`; only checkout catches it).
- Gallery: move to `<PhotoGallery>` (paged expo-image); stop per-frame `setState` onScroll jank.
- Add heart/wishlist (§4.5). Add a "show all reviews" route (copy string `showAllReviews` exists, no control). Indicate when content falls back to another language (ar→fr→en). Transparent `<Header>` with scrim (fixes Android back button overlapping status bar). Separate dates vs guests tap targets (today nested Pressables overlap).

### 4.12 Booking confirm + pay — `booking/confirm.tsx`, `booking/[id]/pay.tsx` (buggy)
**Confirm fixes:**
- Preserve booking context across the sign-in detour: pass dates/room/guests/guest-details as params and return to confirm via `?next` (today `router.replace('/(auth)/sign-in')` destroys confirm; user rebuilds the booking).
- Write guest contact to `profiles.full_name`/`profiles.phone_e164` (structured columns), not crammed into `special_requests`. E.164 validation for +213.
- Multi-unit: add a quantity selector (`create_booking` accepts `p_units`; today hardcoded `units:1`).
- Surface MIN_NIGHTS before submit. Don't show "could not create booking" when the booking *was* created and only the re-read failed.

**Pay fixes:**
- Handle Chargily return: deep-link return handler + realtime subscription/poll on the booking/transaction (today relies on manual "Refresh status" after `Linking.openURL`).
- Guard non-`awaiting_payment` states (today shows Pay buttons that the server rejects with a raw `NOT_AWAITING_PAYMENT` Postgres error).
- Verify `dev_simulate_payment` returns `'applied'` before bouncing to detail. Localize all errors (today raw `rpcErr.message`/`e.message`). Add a `payment_deadline` countdown + expired detection. Add method selection (edahabia/cib/baridi_qr — enum exists). `success` haptic on confirmed.

### 4.13 Booking detail + conversation + review — `booking/[id]/index.tsx`, `conversation/[id].tsx`, `review/[bookingId].tsx`
- **Booking detail (buggy):** add **Cancel booking** flow — `quote_refund` (show refund preview) → ConfirmSheet → `cancel_booking(p_booking_id, p_reason)` (entirely missing today). Fix price line label (today literally renders "nights × N" with no per-night rate). Add `hasReviewedBooking` check on "Leave review". Realtime/refetch on status change. Copy-to-clipboard booking code. Guard terminal-state message-host.
- **Conversation (buggy):** **mark messages read** on open — set `read_at` via the permitted `messages_update` RLS (never written anywhere today → permanent unread dot). Optimistic send (drop the redundant `listMessages()` refetch after `sendMessage` that double-works with realtime). Day separators + grouping instead of full date+time per bubble. Composer above keyboard; sign-in prompt when signed out. Filter realtime appends by `deleted_at IS NULL`.
- **Review (working):** localize `INVALID_SCORES` (don't leak raw). Character counter on comment. Reflect the new review on return. KeyboardAvoidingView offset on Android.

### 4.14 Notifications — `notifications.tsx` (partial)
Handle `read_at` UPDATEs in realtime (not just INSERT) so cross-device read-state syncs. Validate route targets before push (deleted booking → not-found). Group by day (New vs Earlier). Swipe-to-dismiss. Gate `usePushRegistration()` behind a dev-build check + don't prompt for permission until a backend exists (push is a no-op in Expo Go SDK 54).

---

## 5. Host mode — per-screen spec

> **Root cause #1 blocks nearly all host writes.** Every host write resolves authorization through `public.my_host_id()`, which reads the `host_id` JWT claim minted only by `custom_access_token_hook` at token issue/refresh. (a) **Confirm the hook is enabled** in Supabase Auth settings (otherwise `my_host_id()` is always NULL). (b) **Call `supabase.auth.refreshSession()` immediately after `becomeHost()`** in both `src/lib/wizard.tsx` `ensureDraft()` (`:151-179`, confirmed: `becomeHost()` then `createDraftProperty()` same session, no refresh) and `app/(tabs)/profile.tsx` `onSwitchToHosting`. Without this, first-time hosting fails entirely until the ~1h auto-refresh or app restart.

### 5.1 Host gate + dashboard — `host/_layout.tsx`, `host/index.tsx`
- Remove the hardcoded Arabic native header title `'استضافتي'` (`host/_layout.tsx:41`); localize via `<Header>`. Verify sign-in honors `next='host'` and returns to `/host`. Replace bare `ActivityIndicator` with skeleton.
- Dashboard: stats + tile grid + own listings. Consolidate the three "Create" entry points (CTA + tile + empty-state). Real Lucide tiles (not emoji). Empty/zero states distinguish "new host (claim refreshing)" from "genuinely empty".

### 5.2 Listing wizard — `host/new/*` + `src/lib/wizard.tsx` (BROKEN → make it work)
The whole wizard is currently unusable for first-time hosts. **Critical fixes:**
- **host_id claim** (root cause #1): refresh session after `becomeHost()` in `ensureDraft()`.
- **Photo upload path** (`src/lib/listings.ts:348`, confirmed): build path as `${hostProfileId}/${propertyId}/${filename}` — today it uses `${input.userId}/...` (auth uid), but the storage policy requires `foldername[1] = my_host_id()` (host_profile id), so **every** upload is rejected and ≥1 photo is a hard submit requirement → listings cannot be created from mobile at all. Thread `hostProfileId` through `UploadPhotoInput`; same for `deletePhoto`. Fix the misleading RLS comment block at the top of `listings.ts` and the path doc at `:339-341`.
- **Transactional/idempotent submit** (`review.tsx`): write `room_type` ids back into the draft after insert (or upsert) so retrying `submit_property_for_review` never duplicates `room_types`; `reset()` the draft on success (today re-entry shows the just-submitted data).
- **Draft persistence:** persist the wizard draft to AsyncStorage + add save/discard-on-exit (today in-memory only — backgrounding loses everything and orphans server-side drafts/photos; `ensureDraft` inside `photos.tsx` `load()` can even create orphan drafts on mere visit).

**Per-step UX:** location step (`location.tsx`) → searchable wilaya BottomSheet (not 58 chips) + lat/lng range validation; details/rules → per-tab "filled" indicators; **amenities** → localize category headings (today renders raw DB slugs like `essentials`); **pricing** → per-locale room-name tabs (today binds only `nameAr`, mis-tagging FR/EN names) + DZD thousands formatting + fix `toInt` so `'8.5'`→8.5 isn't mangled to 85; **policy/review** → render localized cancellation-tier labels (not raw `moderate`) + real refund windows; **rules** → native time picker (not free-text HH:MM); **photos** → multi-select, reorder, choose-cover, expo-image previews. Differentiate error states (auth/claim vs network vs validation) on every step.

### 5.3 Reservations — `host/reservations.tsx` (buggy → close lifecycle gap)
- **Awaiting-payment view:** `accept_booking_request` moves `requested → awaiting_payment`, but the screen only surfaces `requested` and `['confirmed','checked_in']`, so accepted-unpaid bookings **vanish from both tabs**. Add an "Awaiting payment" segment so they stay visible (with `payment_deadline`).
- **Check-in/check-out/no-show:** add host actions for `confirmed → checked_in → completed`/`no_show` (requires a new host-callable RPC — see §7). Today only the admin cron `complete_stays` exists; hosts can't manage stays day-of.
- **Decline reason:** capture `p_reason` via ConfirmSheet (today declines with no reason). Message-guest available before accepting. Requests-tab count badge. Reconcile optimistic accept/decline with a refetch.

### 5.4 Calendar — `host/calendar.tsx` + `src/lib/host.ts` (broken → off-by-one)
- **Fix the off-by-one** (confirmed: `setAvailabilityRange` JSDoc says `p_to` is inclusive, `src/lib/host.ts:190-193`): `set_availability_range` treats `p_to` as **exclusive** and raises `INVALID_RANGE` when `p_to <= p_from`. Mobile sends `rangeEnd = checkOut − 1 day` (inclusive last night), so (a) the last selected night is never written and (b) single-day selections error. Send `p_to` **exclusive** (pass the picker's `checkOut` as-is, or `rangeEnd + 1 day`), mirroring the already-fixed hotel-web app. Update the wrong JSDoc.
- Add clear-override-to-base, bookings overlay on the calendar, draft-vs-approved listing indicator, and a legend entry for available/open.

### 5.5 Earnings / Performance / Reviews — `host/earnings.tsx`, `host/performance.tsx`, `host/reviews.tsx`
Mostly working; all depend on the host_id claim (empty results until refresh — root cause #1, now fixed). **Fixes:** add host-side **cancel-confirmed-booking** (`cancelBooking()` exists in `lib/host.ts` but no screen calls it) with reason + refund preview; localize via the single `localizedName` (today two implementations across `lib/listings.ts` and `lib/discovery.ts` — consolidate); reviews filter (unreplied) + aggregate header; date/period selectors on earnings/performance; relabel "realized revenue" vs payouts "paid total" to avoid confusion. Payout RIB/method management (set destination) is a follow-up.

---

## 6. Cross-cutting fixes

- **Auth/session + token refresh:** SecureStore-backed Supabase storage adapter (refresh token off plain AsyncStorage). Single `<AuthGate>` at the layout level + explicit `SIGNED_OUT` handling (toast + route reset) instead of ad-hoc per-screen prompts. **`refreshSession()` after `become_host()`** (root cause #2). Verify email-confirmation path.
- **Data fetching/caching:** introduce **TanStack Query** — fetch the approved-property set once (kills the Explore N+1 and per-focus refetch storms caused by `router.replace` tabs), stale-while-revalidate, retries, dedupe, uniform loading/error. Move discovery filter/sort/pagination server-side. Stop double-fetching reviews on property detail; trim over-fetching selects (bookings all-photos, inbox all-messages).
- **Realtime:** scope inbox channel to the user's conversations (not all `public.messages`); write `messages.read_at` on conversation open; handle notification `read_at` UPDATEs; filter `deleted_at` on appends.
- **i18n/RTL:** consolidate onto one system (formalize `copy.ts` *or* i18next `t()` — not both; remove the three `pick()` implementations). Fix stale "Arabic-default" doc comments. `writingDirection` on all TextInputs. Logical layout props everywhere. Route all numbers/prices/dates through `@dyafa/i18n` with bidi isolation. Persistent restart instruction + `DevSettings.reload()` fallback for language change.
- **List perf:** FlashList for all remote lists; `React.memo` rows + stable `renderItem`; horizontal FlashList for rails.
- **Images:** `expo-image` everywhere (disk cache, downsample, blurhash); kill `RemoteImage`'s infinite pulse loops.
- **Error/empty/loading:** skeleton presets (not spinners); EmptyState/ErrorState with Retry; classify errors (auth/claim vs network vs RLS vs validation) instead of generic `loadError` / raw Postgres strings.
- **Haptics/feedback:** centralize `ui/haptics.ts`; `success` on booking/pay/publish/accept, `warning` on destructive sheets, `selection` on chips/stars/steppers, `tap` on primaries; respect reduce-motion/pref.
- **Accessibility:** roles + labels + states on all interactive elements; ≥44×44 targets; Dynamic Type without clipping; AA contrast (watch `text-muted` on bone); grouped card labels; live regions; reduce-motion.
- **Payment flow:** see §4.12 — deep-link/realtime return, state guards, localized errors, deadline countdown, method selection.

---

## 7. Backend additions needed (keep minimal)

Most RPCs exist (`create_booking`, `accept/decline_booking_request`, `cancel_booking`, `quote_refund`, `set_availability_range`, `submit_review`, `become_host`, `submit_property_for_review`, `dev_simulate_payment`, etc.). Genuinely missing:

1. **Host stay-lifecycle RPCs** — `host_check_in`, `host_check_out`, `host_mark_no_show` (or one parameterized RPC) for `confirmed → checked_in → completed`/`no_show`, authorized via `my_host_id()`. Today only the admin cron `complete_stays` exists; hosts cannot manage stays (§5.3).
2. **Mark-messages-read** — either a small `mark_conversation_read(p_conversation_id)` RPC or rely on a direct `messages_update` set of `read_at` (RLS already permits the recipient). Prefer the RPC for atomic batch update (§4.13).
3. **Push backend (deferred):** a `device_tokens` table + write path if/when push ships (currently no storage; `getExpoPushTokenAsync` needs a dev build + real EAS `projectId`).
4. **Confirm (not add):** `custom_access_token_hook` is **enabled** in the Supabase Auth settings — this is a config check, not a migration, but it gates all of host mode (§5).

Everything else (wishlists, cancellation, inquiry conversations, multi-unit, structured guest contact) uses existing tables/RPCs/RLS.

---

## 8. Build sequence (phased, each testable on Expo Go via running Expo + scanning)

- **Phase 0 — Foundation libs & root wiring.** Install §2.1 stack; mount `SafeAreaProvider` + `GestureHandlerRootView` + `BottomSheetModalProvider` + `ToastProvider` + error boundary + QueryClient; add reanimated babel plugin; dedupe splash config; real EAS `projectId`. *Verify: app boots, tab bar respects home indicator.*
- **Phase 1 — Design system.** Build `Screen`, `Header`, `Text/Heading`, `haptics`, `motion`, then Button/Card/ListItem/inputs/Chip/Segmented/Badge/Avatar/RatingStars/PriceText/BottomSheet/Toast/Skeleton/Empty/Error/List/WizardProgress/PhotoGallery. Re-export old `ui.tsx`/`fields.tsx`. *Verify: a sandbox screen renders all variants in EN + AR.*
- **Phase 2 — Navigation + cross-cutting.** Migrate to expo-router `<Tabs>`; TanStack Query; SecureStore auth + AuthGate + SIGNED_OUT; bidirectional Hosting toggle; i18n consolidation + RTL audit. *Verify: tab state persists, no refetch storm.*
- **Phase 3 — Host blockers (highest functional priority).** `refreshSession()` after become_host (wizard + profile); photo upload path fix; calendar off-by-one; wizard idempotent submit + draft persistence. *Verify: a brand-new account can create + submit a listing and set availability end-to-end.*
- **Phase 4 — Traveler conversion path.** Explore (single fetch + rail wiring) → Search → Property detail (sheets, gallery, occupancy guard, inquiry messaging) → Checkout (context preservation, structured contact, payment hardening). *Verify: search → book → pay (dev) → confirmed.*
- **Phase 5 — Engagement & lifecycle.** Wishlists end-to-end; message read-state + inbox realtime scoping; Trips/booking-detail (cancel flow, review dedup); notifications; host reservations (awaiting-payment + check-in/out) + earnings/reviews. *Verify each flow on device.*
- **Phase 6 — Polish & sign-off.** Delete legacy `ui.tsx`/`fields.tsx`; full per-screen acceptance checklist (safe area, states, lists, P2R, 44pt, typography, color rationing, icons, RTL, haptics, a11y, perf); RTL full pass with reload.

---

## 9. Open questions for the owner

1. **Real map vs stub.** Keep the branded `<Map>` stub for now, or commit to a `expo-dev-client` build with native Mapbox/MapLibre (enables real results map + property location from `geo_fuzzed`)? The stub API is designed for a one-file swap either way.
2. **Push notifications scope.** Defer entirely (gate `usePushRegistration` behind a dev build, no prompts), or invest now in the `device_tokens` table + EAS `projectId` + a dev/standalone build so push actually delivers?
3. **i18n single source of truth.** Standardize on i18next `t()` with namespaces, or formalize `copy.ts` as the one system? (Affects how much screen copy gets rewritten in Phase 2.)
4. **Server-side discovery.** OK to add a discovery RPC / PostgREST-filtered query with pagination now, or keep client-side filtering for the demo dataset and defer the server work until real inventory?
5. **First-run device locale.** Honor the device locale on first launch (Arabic/French phones open in their language), or always start English until the user picks? (`expo-localization` is installed but unused today.)
6. **Confirm the `custom_access_token_hook` is enabled** in the Supabase project Auth settings — needed before host mode can be verified at all (§5/§7).

**Key files referenced:** `apps/customer/app/_layout.tsx`, `apps/customer/app/(tabs)/_layout.tsx`, `apps/customer/src/components/TabBar.tsx`, `apps/customer/src/lib/wizard.tsx` (`:151-179`), `apps/customer/src/lib/listings.ts` (`:348`, `:339-341`, comment block), `apps/customer/src/lib/host.ts` (`:190-193`, `setAvailabilityRange`), `apps/customer/src/lib/discovery.ts`, `apps/customer/src/components/{ui,fields,RemoteImage}.tsx`, `apps/customer/app/host/_layout.tsx` (`:41`), `apps/customer/package.json`.