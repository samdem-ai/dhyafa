# Phase 8 — UI redesign spec (Airbnb-style)

Goal: remove the "generic / AI-looking" feel and fix layout bugs by rebuilding the
**presentation layer** on one coherent, opinionated design language. The data
layer (`src/lib/*`), backend, RPCs, navigation, and tokens stay; only the
component + screen visuals change.

## Design DNA (non-negotiable rules)

1. **Photo-first, borderless cards.** List/rail cards have NO surface box, NO
   shadow, NO border — a rounded photo (`radius.lg`), then title / place / price
   as plain text directly on the page background. (See `ResultCard`/`RailCard` in
   `src/components/discovery.tsx` — the reference.)
2. **Whitespace is the layout.** Generous padding (`space.xl` = screen gutters,
   `space.2xl` between sections). Don't fill space with chrome.
3. **Outline icons only — never emoji.** Use `lucide-react-native` (stroke ~2,
   `theme.color` for color). Banned in UI: 🔍 ⚡ ★ 💳 🗺️ ❤️ etc. Replace with
   `Search`, `Zap`, `Star`, `CreditCard`, `MapPin`, `Heart`.
4. **Type through primitives.** Always `<Heading>` / `<Text>` from `@/ui` (they
   pick the locale-correct font + weight + line-height). Never hand-roll
   `fontFamily: RN_FONTS.*` in screens. Serif display (`Heading`) for big screen
   titles only; **sans bold** (`Text variant="title" weight="bold"`) for section
   headers (Airbnb-like).
5. **Minimal elevation.** Cards: none. Search bar / sticky footers: `shadow.xs`.
   Bottom sheets only: `shadow.sheet`. Kill `shadow.card`/`raised` on flat lists.
6. **One accent, used sparingly.** Terracotta `accent` for the single primary
   action / price emphasis / active state. Teal `primary` for brand + headings.
   Everything else is ink/muted on `bg`.
7. **Rounded, not bubbly.** `radius.lg` photos, `radius.pill` for pills/buttons,
   `radius.card` for sheets. No giant radii on small elements.
8. **Every state designed.** Loading = `Skeleton` matching the real layout; empty
   = `EmptyState` (icon + title + subtitle + one CTA), vertically centered
   (`flex:1, justifyContent:'center'`); error = `ErrorState` with a localized
   `tryAgain` retry (never the "Search" label).
9. **RTL always.** Logical alignment via the primitives; mirror directional icons
   with `transform:[{scaleX: I18nManager.isRTL ? -1 : 1}]`.
10. **No legacy imports.** Screens import from `@/ui` — never `@/components/ui`
    or `@/components/fields` (deprecated shims).

## Done so far (reference implementations — match these)

- `src/components/discovery.tsx` — borderless `ResultCard` + `RailCard`, lucide
  `Star` rating, icon chips (no emoji), primitives throughout.
- `app/(tabs)/index.tsx` (Explore) — `Search` icon, serif greeting + sans rail
  headers, `shadow.xs` search pill, `tryAgain` retry.
- `app/(tabs)/wishlists.tsx` — centered signed-out CTA + centered empty/error.

## Remaining screens to roll out (each: apply the 10 rules above)

- Search: `search/index`, `search/filters`, `search/results`, `FiltersSheet`
- Property: `property/[id]`, `property/reviews/[id]`, `ReviewItem`
- Booking: `booking/confirm`, `booking/[id]/index`, `booking/[id]/pay`, `CancelBookingSheet`
- Tabs: `(tabs)/trips`, `(tabs)/inbox`, `(tabs)/profile`
- Messaging: `conversation/[id]`
- Notifications: `notifications`
- Auth: `(auth)/sign-in`, `(auth)/sign-up`
- Host: `host/*` (lower priority — guest path first)
- Primitives to audit for emoji/shadow: `Button`, `SegmentedControl`, `BottomSheet`,
  `EmptyState`, `StatusPill`, `Toast`, `NotificationBell`

## Verify gate (every change)

`pnpm exec turbo typecheck --filter=@dyafa/customer` (5/5) AND
`npx expo export --platform ios` (exit 0). No `as any`, tokens only.
