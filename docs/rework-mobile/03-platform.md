I have everything needed for a thorough cross-cutting audit. Here is the report.

---

# Customer Mobile App — Platform Audit (`apps/customer`)

Audited as cross-cutting concerns (not per-screen). File paths are absolute. Severity tags: **[BLOCKER]** breaks at runtime / core flow, **[HIGH]** wrong behavior or major UX/perf, **[MED]** quality/consistency, **[LOW]** polish.

## 1. NAVIGATION

The app uses a root `<Stack>` (`app/_layout.tsx`) over a custom-built tab system, with auth/host/property/booking pushed as sibling stacks. The biggest structural decision — **not using `@react-navigation/bottom-tabs`** — drives most of the navigation problems.

- **[BLOCKER] Tab switching uses `router.replace()` and a `<Slot/>`, so each tab is destroyed on switch.** `app/(tabs)/_layout.tsx` renders only `<Slot/>` + a custom `<TabBar/>`; `TabBar.tsx:64` does `router.replace(tab.href)`. This means tabs are **not** persistent siblings — there is one mounted child at a time, swapped by replace. Consequences: (a) scroll position, in-progress input, and fetched data in every tab are lost on each switch; (b) no per-tab back stack (e.g. Inbox → conversation → tap Explore → back does not behave like native tabs); (c) `useFocusEffect` refetches everything every time (see Data section). This is the single highest-impact thing to change. The "we must not add native deps" rationale is now obsolete — **`react-native-screens` (4.16) and `react-native-safe-area-context` (5.6) are already dependencies**, and expo-router's `<Tabs>` is built on `@react-navigation/bottom-tabs` which ships transitively with `expo-router`. Recommend migrating to expo-router `<Tabs>` (lazy-mounted, state-preserving, free RTL + a11y + headers).

- **[HIGH] Tab count mismatch with the documented IA.** The `(tabs)/_layout.tsx` docstring says "Explore / Trips / Wishlists / Profile" (4), but `TabBar.useTabDefs` renders **5** tabs: Explore, Trips, **Inbox**, Wishlists, Profile. Five tabs with emoji glyphs + labels is cramped on small devices and off-spec. Decide the canonical IA. Recommended: Explore / Wishlists / Trips / Inbox / Profile, and drop emoji glyphs for a real icon set (see Perf).

- **[HIGH] Active-tab detection is fragile string matching.** `TabBar.isActive` (`TabBar.tsx:39`) hand-parses `usePathname()` (`'/'`, `''`, `'/(tabs)'`, leaf prefixes). This breaks for nested tab routes and is exactly what `<Tabs>`/`useSegments()` solve for free. Several `Href` casts (`tab.href as Href`, `route as Href` in `notifications.tsx:122`, `tile.href as Href` in `host/index.tsx`) defeat typed-routes safety — `typedRoutes: true` is enabled in `app.json` but bypassed everywhere via `as Href`/`string` hrefs.

- **[HIGH] Guest↔Host toggle is one-directional and inconsistent.** Forward path: Profile → `becomeHost()` → `router.push('/host')` (`profile.tsx:72`). There is **no in-app "Back to Travelling" control** anywhere in `app/host/*` (grep confirms host screens only push deeper). The only way back to guest mode is the OS back gesture / header back arrow on `host/index`. The spec frames this as a first-class "toggle Travelling ↔ Hosting"; it should be a visible, idempotent switch in both modes. Also, because host is `push`ed onto the root stack over the tabs, the tab bar disappears entirely in host mode with no equivalent host navigation chrome.

- **[MED] No deep-link / `linking` configuration despite associated domains.** `app.json` declares iOS `associatedDomains: applinks:dyafa.dz` and Android `autoVerify` intent filters for `https://dyafa.dz`, and `scheme: "dyafa"` — but there is no `linking` config and no testing of these routes. expo-router auto-derives paths from the file tree, but the route-group dirs (`(tabs)`, `(auth)`) and dynamic segments mean an inbound `https://dyafa.dz/property/<id>` will work only if the file-tree mapping is verified. Notification routing (`notifications.ts:notificationRoute`) returns string paths like `/booking/<id>` that assume this mapping. This needs explicit testing; right now it is unverified.

- **[MED] Root stack `animation` is computed once at module/JSX eval time from `I18nManager.isRTL`** (`_layout.tsx:121`, repeated in `(auth)/_layout`, `host/_layout`). Correct in practice (RTL change forces a reload), but it's a latent footgun — same pattern as the `textAlign` consts below.

- **[LOW] `index.tsx` redirects to `/(tabs)`** which is fine, but combined with the custom tab system it means cold-start lands on Explore with no deep-link restoration.

**Recommended IA:** Adopt expo-router `<Tabs>` for the 5 (or 4) tabs with real persistence; keep `(auth)` as a modal-presented stack group; promote host mode to either its own `<Tabs>` group (`app/(host)/`) or a clearly-chromed stack with a persistent "Switch to Travelling" header action; add an explicit `linking` smoke test for the declared universal links.

## 2. AUTH / SESSION

Generally sound. The Supabase client (`src/lib/supabase.ts`) is correctly anon-key-only, persists to AsyncStorage, enables `autoRefreshToken`, and wires `AppState` to start/stop auto-refresh on foreground/background — all best-practice for RN.

- **[HIGH] `expo-secure-store` is in plugins but the Supabase session is stored in plain AsyncStorage.** `app.json` loads `expo-secure-store` and i18n uses it for the locale, but the **auth tokens** (refresh token included) live in unencrypted AsyncStorage (`supabase.ts:38`). On a rooted/jailbroken or backed-up device the refresh token is readable. Best practice for RN Supabase is a SecureStore-backed storage adapter (with the known ~2 KB size caveat — chunk or use `expo-secure-store` only for the refresh token). Worth fixing before launch.

- **[HIGH] No global session-expiry / route-protection strategy.** `useSession()` (`src/lib/auth.ts`) is solid (cold-start `getSession` + `onAuthStateChange`, `loading` only for first resolve). But it is consumed ad-hoc per screen. Only the **host** group is gated (`host/_layout.tsx` redirects to sign-in). Guest tabs that require a user (Inbox, Trips, Notifications) each independently render a sign-in prompt — inconsistent and easy to forget. There is **no handling of mid-session token-refresh failure / `SIGNED_OUT` event**: if the refresh token is revoked, `onAuthStateChange` fires `SIGNED_OUT`, every screen flips to its empty state, but the user is not routed anywhere or told why. Recommend a small `<AuthGate>`/context at the layout level and an explicit `SIGNED_OUT` → toast + route reset.

- **[MED] `signUpWithPassword` does not surface the email-confirmation path.** `auth.ts:86` calls `supabase.auth.signUp` and the sign-in screen treats success as "go back/home". If the Supabase project requires email confirmation, `signUp` returns a user with no session and the user silently lands unauthenticated. There's no "check your email" state. Verify the project's confirm-email setting and handle the no-session-after-signup case.

- **[MED] Post-auth redirect (`next`) is stringly-typed and limited.** `sign-in.tsx:51` only understands `next === 'host'`; any other origin falls to `router.back()`/`/`. A user who hit sign-in from, say, the booking flow won't be returned there. Generalize `next` to a (validated) pathname.

- **[LOW] `signOut()` swallows errors** (`auth.ts:100` no try/catch on the caller in `profile.tsx`), and there's no global "signing out…" feedback.

## 3. DATA / STATE

All data access is **raw `supabase-js` calls wrapped in per-feature lib modules** (`discovery.ts`, `messaging.ts`, `notifications.ts`, `listings.ts`, `host.ts`, `reviews.ts`, `bookings.ts`). **There is no caching layer (no React Query / SWR).** Each screen holds `useState<T | null>` + `useFocusEffect`/`useEffect` and refetches on focus. This is the second-biggest cross-cutting weakness after navigation.

- **[HIGH] No client cache → redundant network on every focus, no shared state.** Because tabs are `replace`d (Navigation §1), `useFocusEffect` refetches the entire Explore rail set, inbox, notifications, etc., on every return. The Explore loader (`(tabs)/index.tsx:58`) issues **6 sequential-ish queries** (2 lookups, then 4 rails), and **each rail calls `searchProperties()` which re-runs `readApprovedSummaries()` from scratch** (`discovery.ts:316-343`). So one Explore render hits `properties` (full approved set) **4+ times** in parallel — a clear N+1/over-fetch. A query cache (TanStack Query) would dedupe these, give stale-while-revalidate, retries, and consistent loading/error, and is the single highest-leverage data change. At minimum, fetch the approved set **once** and derive all rails client-side.

- **[HIGH] Client-side search/filter/sort won't scale.** `discovery.ts` explicitly fetches **all** approved properties and filters/sorts in JS ("the demo dataset is ~12 listings — no pagination needed yet", `searchProperties:304`). There is no pagination, no `FlatList` `onEndReached`, no server-side filtering. This is fine for a demo but is a real cliff for production data volume; results/Explore will load every listing and every listing's photos+rooms join on each query. Plan server-side filtering (an RPC or PostgREST filters) + pagination before real inventory.

- **[HIGH] Realtime inbox subscribes to *all* message inserts and refetches the whole list.** `inbox.tsx:79` subscribes to `messages` INSERT with **no filter**, and on any insert calls `load()` (a full `listConversations` requery). Every message anyone sends (that RLS lets you see) triggers a complete inbox refetch. The `notif-bell` (`NotificationBell.tsx`) and `conversation` channels are correctly filtered; the inbox one is not. Filter by participant or at least debounce + patch the affected row.

- **[MED] Conversation send double-fetches.** `conversation/[id].tsx:onSend` sends, then **immediately `listMessages()` again** "as a fallback" on top of the realtime INSERT path (`[id].tsx:126`). With realtime working this is a redundant round-trip per send and can cause a flicker. Prefer optimistic append + reconcile, drop the unconditional refetch.

- **[MED] Error handling is consistent in shape but lossy.** Every screen does `catch { setError(pick(L.loadError, locale)); setData([]) }` — a single generic localized string, original error discarded (`catch {}` with no binding). Good for UX consistency, bad for diagnosability and for distinguishing auth errors (401) from network from empty. No retry/backoff. Centralizing fetch in a query lib would fix this uniformly.

- **[MED] Loading conventions are good but reimplemented per screen.** `null = loading → Skeleton`, `[] + error → ErrorState`, `[] → EmptyState`. Consistent and well done, but it's boilerplate repeated in every screen; a `useResource` hook (or React Query) would collapse it.

- **[LOW] Realtime channels: cleanup is correct everywhere** (`removeChannel` in cleanup). No leaks observed. Good.

## 4. i18n / RTL

The i18n foundation is correct and English-default is properly wired at the package level — but the mobile app **largely bypasses i18next** and the inline docs are stale/misleading.

- **[HIGH] Two parallel translation systems; i18next is barely used.** The package ships `common/auth/booking` namespaces (`createI18n.ts`), but screens overwhelmingly use a hand-rolled `src/lib/copy.ts` (`L` + `pick(msg, locale)`) and per-screen inline `COPY` objects (e.g. `sign-in.tsx:16`, `host/index.tsx:45`). `useTranslation('common')` is imported almost everywhere **only to read `i18n.language`**, not to call `t()`. Result: translations are scattered across `copy.ts` + many files, the bundled JSON namespaces drift, missing-key detection (`missingKeyHandler`) never fires for the inline copy, and there are **three different `pick()` implementations** (copy.ts, sign-in.tsx local, notifications.ts inline chains). This is the central i18n debt. Consolidate onto i18next `t()` with proper namespaces, or formalize `copy.ts` as the single source — but not both.

- **[HIGH] Stale docs assert Arabic-default; behavior is English-default — verify the contract holds end-to-end.** `src/lib/i18n.ts` header comments still say "falls back to DEFAULT_LOCALE ('ar')" and "Arabic is the PRIMARY locale" (`i18n.ts:4`, `onboarding.tsx:8`), and `createI18n.ts` JSDoc says `defaults to ... ('ar')`. The actual `DEFAULT_LOCALE` is `'en'` (`rtl.ts:14`) and `SUPPORTED_LOCALES = ['en','ar','fr']`. The code is correct (English default/LTR), but the contradictory comments are a real hazard for the rework. Also note `fallbackLng: ['en','fr']` in `createI18n` vs the `notificationTitle`/`Body` fallback chains that go `en → fr → ar` — consistent enough, but the doc comment in `notifications.ts:64` still says "ar → fr → en fallback" which is wrong for `en`/`fr` locales.

- **[HIGH] Device-locale detection is effectively dead.** `i18n.ts` docstring claims "Detects device locale via expo-localization", but `initLocale()` only reads SecureStore and otherwise keeps `DEFAULT_LOCALE` — **`expo-localization` is never called** (it's in deps + plugins but unused in the locale resolver). First launch is always English regardless of an Arabic/French device. Decide intentionally: either honor device locale on first run or keep English-always, and fix the comment.

- **[MED] RTL flip relies on `expo-updates` reload, which is unavailable in Expo Go / dev.** `setLocale()` (`i18n.ts:77`) calls `Updates.reloadAsync()` and on failure just `console.warn`s; the onboarding screen shows a tri-lingual "restart the app" hint. In Expo Go (the stated dev runtime), switching to Arabic sets `forceRTL` but **does not reload**, so the app is in a half-applied state until manual restart. For dev ergonomics consider `expo-dev-client` + a `DevSettings.reload()` fallback, and gate the picker UX accordingly.

- **[MED] RTL layout uses module-level `const textAlign = I18nManager.isRTL ? 'right' : 'left'`** in nearly every screen (e.g. `inbox.tsx:46`, `results.tsx:252`, `conversation/[id].tsx:45`, `profile.tsx:163`). This is evaluated **once at module load**. It's correct *only* because the language switch forces a full reload — but it's brittle: any future in-place locale change, or RN Fast Refresh during dev, leaves stale alignment. Prefer logical props: RN supports `textAlign: 'left'` auto-flipping under `I18nManager.isRTL` for many cases, and `writingDirection`, plus logical margins (`marginStart/End`, already used well in places like `NotificationBell`). Mixing absolute `right/left` (NotificationBell badge) with logical `start/end` is inconsistent.

- **[MED] Fixed icon glyphs for back/RTL are hand-mirrored** (`I18nManager.isRTL ? '→' : '←'` across conversation/results/notifications). Works, but fragile and ad-hoc; a real icon component with automatic mirroring would be cleaner.

- **[LOW] DZD/number formatting is well-designed.** `format.ts` pins `nu-latn` Latin digits, `maximumFractionDigits: 0` for DZD, `دج`/`DZD` symbol, and the docstring correctly notes the `<bdi>`/`unicodeBidi:'isolate'` requirement — **but I did not find that bidi isolation applied at the RN call sites** (e.g. price pins in `results.tsx:229`). Under Arabic RTL, `"12 000 دج"` adjacent to other text can reorder. Wrap price `Text` in an isolating container or apply `writingDirection`.

## 5. PERF / QUALITY

- **[HIGH] Horizontal rails render via `.map()` inside `ScrollView`, not a virtualized list.** `(tabs)/index.tsx:Rail` maps all items into a horizontal `ScrollView` (`index.tsx:187`), and `MapStub` (`results.tsx:220`) maps **all** results into a vertical `ScrollView`. The vertical results list and inbox correctly use `FlatList`, but rails + map-stub don't virtualize. With the current ~12-listing demo this is invisible; with real inventory the rails (and especially the map-stub list) will mount every card + every `RemoteImage` at once. Use `FlatList horizontal` for rails.

- **[HIGH] `RemoteImage` uses RN's built-in `<Image>` with no caching/downsampling.** `RemoteImage.tsx` deliberately avoids `expo-image` ("must not add native deps"). RN `<Image>` has weak disk caching, no `contentFit`/blurhash, no automatic resizing — so full-resolution Supabase Storage images are fetched repeatedly (and re-fetched after each tab `replace` remount). The blur-up is faked with an `Animated` pulse loop **that runs an infinite animation per image until load** (`RemoteImage.tsx:52`) — many simultaneous loops on a rail. `expo-image` is now an Expo-managed module (works in dev client, and the constraint that blocked it has been relaxed since `react-native-screens` is already present); switching would give disk cache, downsampling, real blurhash, and kill the pulse loops. This is a high-leverage image/perf fix.

- **[MED] No `React.memo` on list row/card components** (`ConversationRow`, `ResultCard`, `RailCard`, `MessageBubble`). Combined with `renderItem` inline closures (e.g. `inbox.tsx:124`, `results.tsx:187`) every list re-render re-creates rows. For FlatList correctness add `keyExtractor` (present) + memoized rows + stable `renderItem`.

- **[MED] `useFocusEffect` + full refetch on every focus** (covered in Data) is also a perf cost — re-runs animations, image loads, and queries each time.

- **[MED] Emoji used as the entire iconography** (tab glyphs, host tiles, notification glyphs, send arrow, fallback `🏚️`). Emojis render inconsistently across Android/iOS versions, don't theme, and aren't crisp — a notable gap vs "the same brand executed natively." The rework should introduce a real RN icon set.

- **[LOW] `MapStub`** is a clearly-labeled placeholder (no native Mapbox in Expo Go) — acceptable for now; just ensure the List/Map toggle defaults to List and the stub is visually honest.

- **[LOW] `JSON.stringify(params)` as a memo key** in `results.tsx:66` works but is a smell; derive a stable key from the parsed `SearchState`.

## 6. BUILD / RUNTIME HEALTH (SDK 54)

The dependency set is **internally consistent for SDK 54** (expo `~54.0.0`, RN `0.81.5`, React `19.1.0`, expo-router `~6.0.24`, react-native-screens `~4.16`, safe-area `~5.6`). No version conflicts spotted. Metro is correctly configured for the pnpm monorepo (`watchFolders` + `nodeModulesPaths` + `disableHierarchicalLookup`). Findings:

- **[HIGH] `expo-notifications` push tokens are non-functional in Expo Go on SDK 53+.** `push.ts` dynamically imports `expo-notifications` and degrades to no-op if missing — but on SDK 54 **`getExpoPushTokenAsync`/remote push are removed from Expo Go** and require a development build. The code already treats the token as "not persisted (follow-up)" and there's **no `device_tokens` table**, so server push is entirely absent. Net: push is effectively a stub. Fine if intentional for now, but the `usePushRegistration()` call on every tab mount (`(tabs)/_layout.tsx:25`) will try (and fail/permission-prompt) on devices — gate it behind a dev-build check and don't prompt for permission until there's actually a backend to deliver push.

- **[MED] `babel.config.js` has no `react-native-reanimated/plugin`.** The comment says to add it when Reanimated lands. The rework explicitly wants native-feeling animation; the moment Reanimated (or `react-native-gesture-handler`, needed for proper bottom sheets/gestures) is added, this plugin must be last. Flagging so it isn't missed.

- **[MED] `app.json` ships placeholder EAS project id** (`"projectId": "REPLACE_WITH_EAS_PROJECT_ID"`). `getExpoPushTokenAsync()` needs a real `projectId` on SDK 54 — another reason push currently can't work. Also blocks EAS builds/updates (and `expo-updates` `reloadAsync`, the i18n RTL reload path, depends on EAS Update being configured).

- **[MED] Splash configured twice** — top-level `expo.splash` **and** the `expo-splash-screen` plugin (`app.json:10` and `:51`). SDK 54 prefers the plugin; the top-level block is legacy and the two can disagree (different `imageWidth`/resize). Consolidate to the plugin.

- **[LOW] Font loading gates the whole app on 3 Google-font families (11 weights).** `_layout.tsx` blocks render until Fraunces + Plus Jakarta + IBM Plex Arabic all load. On a cold network this lengthens splash. Consider loading the Arabic family lazily when locale=ar, or shipping fonts as assets via `expo-font` config plugin (it's already in plugins) rather than runtime `useFonts`.

- **[LOW] `userInterfaceStyle: "light"`** is pinned (fine — brand is light-only) but there is no dark-mode handling anywhere; confirm that's intended.

---

## Top priorities for the rework (ranked)
1. **Replace the custom `<Slot/>` + `router.replace` tab system with expo-router `<Tabs>`** — fixes state loss, refetch storms, back behavior, active-state fragility, and the 4-vs-5 IA question. (Nav §1, Data §3, Perf §5)
2. **Introduce a query/cache layer (TanStack Query)** and fetch the approved-property set once — eliminates the Explore N+1 and the per-focus refetching. (Data §3)
3. **Consolidate i18n onto one system and fix the stale "Arabic-default" docs / dead device-locale detection.** (i18n §4)
4. **Adopt `expo-image` + virtualize rails** for real image caching/downsampling and list perf. (Perf §5)
5. **Move auth tokens to SecureStore, add a single `<AuthGate>` and `SIGNED_OUT` handling, and make the Host↔Travelling toggle bidirectional.** (Auth §2, Nav §1)
6. **Resolve SDK-54 runtime gaps:** real EAS `projectId`, dedupe splash config, gate push behind a dev build + add the missing `device_tokens` backend (or explicitly defer push), and pre-stage the Reanimated babel plugin. (Build §6)