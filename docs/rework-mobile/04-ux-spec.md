I have enough grounded research and codebase context. Let me write the spec. It will be opinionated, specific to this codebase's actual state (no native animation/icon/sheet libs currently installed — a key decision point), and cite the patterns drawn from research.

I have everything I need. Returning the complete markdown spec.

---

# Dyafa Mobile — RN UI/UX Design System & Rework Spec

> Scope: `apps/customer` (Expo SDK 54, RN 0.81, React 19, expo-router). Builds on `@dyafa/design-tokens` (`rnTheme`) and the warm‑Mediterranean brand. Same brand as the just‑reworked web dashboards, executed natively.
> Opinionated and implementable. Where it says **BUILD**, that's a new/elevated component in `apps/customer/src/ui`.

---

## 0. The single most important decision: add the native foundation libraries

The app today ships **none** of the modern RN interaction stack. `apps/customer/package.json` has no `react-native-reanimated`, `react-native-gesture-handler`, `@gorhom/bottom-sheet`, `expo-haptics`, `expo-image`, `@shopify/flash-list`, or an icon set. Consequences visible in the code:

- `TabBar.tsx` and `discovery.tsx` use **emoji glyphs** (🔍🧳💬) as icons — these render inconsistently across Android OEMs, ignore tint color, and can't express active/inactive weight. This is the #1 visual "not a real app" tell.
- `ui.tsx` `Skeleton` uses the legacy `Animated` API (fine, but no shimmer).
- Lists use `ScrollView`/`.map` (see `property/[id].tsx`), not virtualization.
- No bottom sheets — overlays are in‑screen state (`type Overlay = 'dates' | 'guests'`), which blocks the gesture/scrim/safe‑area patterns travelers expect.

**These are all Expo‑Go‑incompatible-free / config‑plugin‑free additions that work in Expo Go on SDK 54** except where noted. Add, in order of impact:

| Library | Version line (SDK 54) | Why | Expo Go? |
|---|---|---|---|
| `react-native-reanimated` | v4 (`~4.x`) | Shimmer, sheet springs, shared‑element‑lite, layout animations, `useReducedMotion()` | ✅ Yes |
| `react-native-gesture-handler` | v2 (`~2.x`) | Required by bottom‑sheet; swipe‑to‑delete, gallery pan | ✅ Yes |
| `@gorhom/bottom-sheet` | v5 | The bottom‑sheet system; v5 is built for Reanimated 3+/GH 2 | ✅ Yes |
| `expo-haptics` | SDK 54 | Tactile feedback on commit actions | ✅ Yes |
| `expo-image` | SDK 54 | Blur‑up placeholder, memory/disk cache, `contentFit` — replaces `RemoteImage.tsx` | ✅ Yes |
| `@shopify/flash-list` | v2 | Virtualized lists (results, inbox, reservations) | ✅ Yes |
| `@expo/vector-icons` (Lucide via `lucide-react-native`) | — | Real icons. `@expo/vector-icons` ships with Expo (zero install). Prefer `lucide-react-native` for brand consistency with the web dashboards (web uses lucide-react). | ✅ Yes (`@expo/vector-icons` bundled; lucide needs `react-native-svg`) |
| `react-native-svg` | SDK 54 | Backing for lucide + custom marks | ✅ Yes |

> Map stays a **stub** — no native Mapbox in Expo Go. See §11.
> Reanimated v4 requires the **New Architecture** (default on SDK 54). Confirm `newArchEnabled: true` in `app.json`. If you must stay on old arch, pin Reanimated v3.

**Verify each with `npx expo install <pkg>`** so versions match the SDK. Wrap the root in `GestureHandlerRootView` (in `app/_layout.tsx`, outside `<Stack>`) and `BottomSheetModalProvider`.

---

## 1. Foundations: tokens → RN primitives

The token layer is already good (`packages/design-tokens/src/rn-theme.ts`). Two gaps to close before building components:

1. **Line-height bug.** `rnLineHeight` in `rn-theme.ts` multiplies the ratio by font size and `Math.round`s — correct. But several components hard‑use `theme.lineHeight.body` as if it were a multiplier *and* as an absolute (`ui.tsx` line 281 sets `lineHeight: theme.lineHeight.body` which is already an absolute px). Audit: `lineHeight` in `rnTheme` is **absolute px** — never multiply it again. Keep this invariant in the component library.
2. **Type ramp helper.** There's no `<Text>` wrapper, so every screen re‑declares `fontFamily` + `fontSize` + `lineHeight` + `textAlign`. This is the source of inconsistency. Centralize in a `<Text>`/`<Heading>` component (§3.2) that maps a `variant` to the ramp and auto‑selects the Arabic face.

### 1.1 Visual language applied natively

- **Canvas:** `bg = #F7F3EC` (bone‑200) on every screen root. **Surfaces** (`#FFFFFF`) for cards/sheets/inputs. **Sunken** (`#EFE9DD`) for wells, skeleton base, segmented‑control track.
- **Color rationing (locked brand rule):** Teal `#0E3A3A` = structure (headers, primary buttons, links, active nav). Terracotta `#C97B5A` = *rationed* accent only: primary CTA fill on commit screens, price text, active filter/selection, rating stars. Never two terracotta elements competing in one viewport.
- **Elevation on RN:** use `theme.shadow.*` (already split into iOS `shadow*` + Android `elevation`). Rule: **cards = `shadow.card`**, **floating/sticky CTAs & sheets = `shadow.raised`/`shadow.sheet`**, hairline chips/inputs = border only (no shadow). Android `elevation` clips children to bounds — give shadowed cards `borderRadius` and a solid `backgroundColor` or the shadow won't paint.
- **Radii:** inputs/buttons `radius.md (12)`, cards `radius.card (16)`, sheets top `radius.sheet (24)`, pills `radius.pill`. Be consistent — mixing 8/12/16 on sibling elements reads as sloppy.
- **Borders:** hairline `border (#E2DACB)` at `StyleSheet.hairlineWidth`–`1`; input/selected `1.5` `border-strong`/`primary`.

### 1.2 Iconography

Replace **all emoji glyphs** with Lucide. Map (stroke 1.75, size 24 default / 22 in tab bar / 20 inline):
`Search, Briefcase (trips), MessageCircle (inbox), Heart / Heart-filled (wishlist), User (profile), Star, MapPin, Calendar, Users, ChevronLeft/Right (mirror in RTL — see §10), SlidersHorizontal (filters), Check, X, Wifi, Wind (AC), Car, Waves (pool), ChefHat (kitchen)`. Color via `color` prop = `theme.color.*`. Active tab icon = `primary` + heavier (use the filled variant or `strokeWidth: 2.25`).

### 1.3 Motion

- Source durations/easings from `theme.motion`. Map easing strings to `Easing.bezier(...)` once in a `ui/motion.ts` helper. Brand motion is **calm, never bouncy** — use `motion.easing.standard`/`decelerate`, spring damping high (no overshoot) except the sheet.
- **Always gate with `useReducedMotion()`** (Reanimated). When true: skip shimmer (static block), cross‑fade instead of slide, instant sheet snap.

---

## 2. Folder structure

```
apps/customer/src/ui/
  index.ts            // barrel
  theme.ts            // re-export rnTheme as `theme` (already at @/theme)
  motion.ts           // easing/duration helpers + useReducedMotion wrapper
  haptics.ts          // typed wrappers: tap(), success(), warning(), selection()
  Text.tsx            // Text + Heading (type ramp, Arabic auto-face)
  Button.tsx
  Card.tsx
  ListItem.tsx        // Row
  TextField.tsx  Select.tsx  SearchBar.tsx
  Chip.tsx  SegmentedControl.tsx
  Badge.tsx  StatusPill.tsx
  Avatar.tsx  RatingStars.tsx  PriceText.tsx
  BottomSheet.tsx  ConfirmSheet.tsx
  Toast.tsx           // + ToastProvider
  Skeleton.tsx        // block + shimmer + presets
  EmptyState.tsx  ErrorState.tsx
  Screen.tsx          // safe-area + bg wrapper
  Header.tsx          // nav bar w/ safe-area, back, RTL-aware
  Refreshable.tsx     // RefreshControl wrapper
  List.tsx            // FlashList preset w/ empty/loading/refresh built in
  WizardProgress.tsx  // Stepper
  PhotoGallery.tsx  Carousel.tsx
  Map.tsx             // stub
```

Keep existing `fields.tsx`/`ui.tsx` as **thin re‑exports** during migration so screens don't break, then delete. Migrate screen‑by‑screen.

---

## 3. The component system

> Props shown are the public surface. All accept `style`/`testID`. All interactive elements get `accessibilityRole` + label/state and a **44×44 minimum hit area** (`hitSlop` to top up where visual size is smaller). All use **logical layout** (no left/right literals — see §10).

### 3.1 `<Screen>` and `<Header>` (BUILD — use these everywhere first)

The current screens each re‑implement `SafeAreaView` + bg + scroll. Centralize.

```ts
<Screen scroll? edges?=('top'|'bottom')[] refreshing? onRefresh? footer?>
```
- Uses `useSafeAreaInsets()` (not bare `SafeAreaView`, which double‑pads inside a stack). Applies `bg`. `edges` default `['top']`; screens with a sticky bottom CTA pass `edges={['top']}` and the CTA handles `insets.bottom` itself.
- `footer` = sticky region pinned above the home indicator (booking CTA pattern).

```ts
<Header title leftIcon=back rightSlot? onBack? large? transparent?>
```
- 56dp bar + top inset. **Back chevron mirrors in RTL.** `large` renders a Fraunces display title (Airbnb‑style large title that collapses on scroll — optional v2). `transparent` for image‑overlay headers (property detail) with a scrim behind the back button for contrast.

### 3.2 `<Text>` / `<Heading>` (BUILD — highest leverage)

```ts
<Text variant='body'|'body-lg'|'body-sm'|'caption'|'overline'|'title'|'price' weight? color? numberOfLines? center?>
<Heading level=1|2|3|'display-lg'|'display-xl'>   // Fraunces display
```
- Maps variant → `{fontSize, lineHeight}` from tokens. **Auto‑selects face by locale:** Arabic locale → IBM Plex Sans Arabic family at the right weight; en/fr body → Plus Jakarta; **all `<Heading>` → Fraunces for en/fr, Plex Arabic for ar** (Fraunces has no Arabic). Pull weight→family from `RN_FONTS`.
- `allowFontScaling` **on** (default) + set `maxFontSizeMultiplier` (e.g. 1.6 on tight chrome like the tab bar) so Dynamic Type works without breaking layout.
- This kills the per‑screen `RN_FONTS.arabicRegular`‑everywhere pattern and the duplicated `textAlign` const at the top of every file.

### 3.3 `<Button>` (elevate `PrimaryButton`)

```ts
<Button label icon? variant='primary'|'secondary'|'tertiary'|'danger'|'ghost'
        size='sm'|'md'|'lg' loading? disabled? fullWidth? haptic='tap'|'success'|null
        onPress accessibilityLabel? />
```
- Variants: **primary** = teal fill / bone text; **secondary** = surface + `border-strong` 1.5; **tertiary** = terracotta fill (reserve for the *one* commit CTA per screen — "Reserve", "Pay", "Confirm"); **ghost** = text only; **danger** = `error` text on `errorBg`.
- Sizes: `lg=52`, `md=48`, `sm=40` min‑height; all ≥44 effective with hitSlop.
- **Loading** = inline `ActivityIndicator` in the foreground color, label hidden, width held stable, `accessibilityState.busy`.
- **Haptic** fires in `onPress` via `expo-haptics` (`tap`→`impactAsync(Light)`, `success`→`notificationAsync(Success)`). Respect a global "reduce" pref.
- Pressed state: `opacity .9` + `scale .98` (Reanimated) or background → `primaryPressed`. Disabled `opacity .5`.

### 3.4 `<Card>` / `<ListItem>` (Row)

- **Card:** surface, `radius.card`, `shadow.card`, internal padding `lg`. Variant `flat` (border only, no shadow) for dense lists.
- **ListItem/Row:** `leading` (icon/avatar) · `title`+`subtitle` · `trailing` (chevron/badge/value). `onPress` makes the whole row a 44+dp target with pressed bg `surfaceSunken`. **Chevron auto‑mirrors RTL.** Used for profile menu, settings, host menu, conversation list.

### 3.5 Inputs: `<TextField>`, `<Select>`, `<SearchBar>`

- **TextField** (elevate `fields.tsx`): floating or top label, `hint`, **`error` state** (red border + message + `accessibilityState`/`accessibilityLiveRegion`), `leadingIcon`/`trailingIcon` (e.g. clear), `secureTextEntry` with show/hide. **Critical RTL fix:** set `writingDirection` (`'rtl'|'ltr'`) on the `TextInput` based on `I18nManager.isRTL`, not just `textAlign` — current `fields.tsx` only sets `textAlign`, which leaves the cursor/deletion wrong for Arabic. Set `keyboardType`/`textContentType`/`autoComplete` (email, password, tel) so iOS/Android autofill works.
- **Select** = a Row that opens a `<BottomSheet>` list (guests, property type, currency display). Not a native picker.
- **SearchBar** (BUILD): pill, leading search icon, inline clear, `onSubmitEditing`, `returnKeyType='search'`. The Explore tab's hero search opens the search flow; results screen shows a compact filled SearchBar in the header.

### 3.6 `<Chip>` / filter pill, `<SegmentedControl>`

- **Chip** (elevate): `selected` toggles teal border + `infoBg` (keep current look), add `count` badge and `onRemove` (×) for active filters. Icon via Lucide not emoji.
- **SegmentedControl** (BUILD): 2–3 options on a `surfaceSunken` track, animated selected pill (`shadow.xs`). Replaces `LocaleTabs` styling and powers **Travelling ↔ Hosting** in‑content toggles and trips "Upcoming/Past". `accessibilityRole='tablist'`/`'tab'`.

### 3.7 `<Badge>` / `<StatusPill>`

- Elevate `StatusBadge`. **Decouple labels from the component** — current `STATUS_BADGE` hardcodes 4 statuses + a locale switch. Pass `tone='neutral'|'success'|'warning'|'error'|'info'` + `label`, let the screen localize via i18n. Add booking statuses (requested/confirmed/declined/cancelled/completed) and host listing statuses with the right tones.

### 3.8 `<Avatar>`, `<RatingStars>`, `<PriceText>`

- **Avatar**: `uri`→`expo-image`; fallback = initials on a deterministic teal/sand tint. Sizes `sm/md/lg`. `accessibilityLabel` = name.
- **RatingStars** (elevate `StarRating`): terracotta stars (**never yellow** — brand rule), half‑star support, `readonly` (display) vs interactive (review form) with `selection` haptic per tap. Display variant = compact "★ 4.85 · 120" using `formatNumber` locale‑aware.
- **PriceText** (BUILD): wraps `formatDZD`/`formatNumber` from `@dyafa/i18n`. Variants: `large` (price/night, terracotta, Fraunces‑ish weight), `total`, `strikethrough` (was‑price). Handles Arabic numerals automatically via i18n. Use this everywhere instead of ad‑hoc `formatDZD` + Text.

### 3.9 `<BottomSheet>` / `<ConfirmSheet>` (BUILD — `@gorhom/bottom-sheet` v5)

The interaction backbone. Replace in‑screen overlays (property `type Overlay`, guest stepper, filters).
- `BottomSheetModal` + `BottomSheetModalProvider` at root. Wrap content in `BottomSheetView` (non‑scroll) or `BottomSheetScrollView`/FlashList integration for long lists.
- Props: `snapPoints` (numbers/`%`, v5 dropped string‑only), `enablePanDownToClose`, `backdropComponent` (teal `overlay` scrim, tap‑to‑close), top `radius.sheet`, `handleIndicator`, `shadow.sheet`. **Pads `insets.bottom`** inside the sheet.
- **Use sheets for:** date‑range picker, guest stepper, filters, room‑type select, share/report, "switch to Hosting" confirm, sort. **Use full‑screen push for:** search flow, checkout, listing wizard steps, conversation.
- **ConfirmSheet:** title + body + primary(danger) + cancel. Replaces `Alert.alert` for destructive actions (cancel booking, decline request, delete photo) — fires `warning` haptic on open. Gives a branded, RTL‑correct dialog.

### 3.10 `<Toast>` / Snackbar (BUILD)

- `ToastProvider` at root exposes `toast.show({message, tone, action?})`. Top (under header) or bottom (above tab bar) — pick **bottom** to stay near thumb; animate in with `decelerate`, auto‑dismiss 3–4s, swipe to dismiss. `accessibilityLiveRegion='polite'` / `AccessibilityInfo.announceForAccessibility`. Tones map to status colors. Use for "Saved to wishlist", "Message sent", optimistic‑rollback errors.

### 3.11 `<Skeleton>` + shimmer (elevate)

- Keep the opacity pulse for reduced‑motion; add a **Reanimated shimmer** (translating gradient highlight) for the default case. Provide **presets** that mirror real layouts: `PropertyCardSkeleton`, `PropertyDetailSkeleton`, `ListRowSkeleton`, `ConversationSkeleton`. **Skeletons, not spinners**, for any content fetch (the brief's rule, and `ui.tsx` already leans this way). Reserve `ActivityIndicator` for button‑inline and pagination footers only.

### 3.12 `<EmptyState>` / `<ErrorState>` (elevate)

- Replace the **emoji** illustration (`⚠️`/`🏠`) with a small Lucide icon in a tinted circle (teal `infoBg`). EmptyState: icon + title + subtitle + optional primary CTA ("Start exploring", "Become a host"). ErrorState: icon + message + **Retry** (secondary button) that re‑runs the fetch. Both fill the content area, are scroll‑bounce friendly, and read correctly to screen readers.

### 3.13 `<List>` / `<Refreshable>` (BUILD — FlashList v2)

- `<List>` wraps `FlashList` with: `ListEmptyComponent` (EmptyState), loading → skeleton preset, `refreshControl` (tinted teal), `onEndReached` pagination footer, `keyExtractor`, RTL‑safe `contentContainerStyle` padding. **All scrollable result/inbox/reservation/review lists move to this** (property detail's amenity `.map` is fine — small/fixed).
- `<Refreshable>` = a `ScrollView`/FlashList `RefreshControl` preset (`tintColor`/`colors` = teal) for screens that aren't lists (property detail, profile).

### 3.14 `<WizardProgress>` / Stepper (elevate `WizardChrome`)

- Segmented progress bar (filled terracotta segments / sunken track) + "Step 3 of 8" label + Fraunces step title. Sticky **bottom bar** with Back (ghost) + Next/Publish (primary), keyboard‑aware. Used by `host/new/*`. `accessibilityValue={{now, min, max}}` on the bar.

### 3.15 `<PhotoGallery>` / `<Carousel>` (BUILD)

- Property detail hero: horizontal paged `FlashList`/`ScrollView` of `expo-image` (blur‑up via `placeholder`/`transition`), page dots, "3 / 12" counter, tap → full‑screen pager with pinch‑zoom (gesture‑handler). `accessibilityLabel` per photo. **RTL:** mirror paging direction.

### 3.16 `<TabBar>` (elevate)

- Keep the custom `<Slot>`‑based bar (good call avoiding native tabs), but: **Lucide icons** (active = filled/teal, inactive = `ink-300`), drop the emoji, keep the terracotta active dot, ensure each item is ≥44 tall, `accessibilityRole='tab'` + selected state (already present). Badge support on Inbox/Trips (unread count) — small terracotta dot/number. Hide on keyboard‑open screens (conversation) to reclaim space.

---

## 4. Interaction patterns (apply across all screens)

- **Safe area everywhere** via `useSafeAreaInsets()` (the `<Screen>`/`<Header>`/`<TabBar>` wrappers enforce it). Never hardcode status‑bar padding.
- **44×44 minimum** touch targets; small icons get `hitSlop`. (WCAG 2.1 / Apple HIG.)
- **FlashList/FlatList for all long lists**; never `.map` a network list inside a `ScrollView`.
- **Skeleton, not spinner** for content; spinner only inline/pagination.
- **Pull‑to‑refresh** on every list/feed (Explore, Trips, Inbox, Reservations, Wishlists) with teal‑tinted `RefreshControl`.
- **Optimistic UI** for low‑risk, reversible actions: **favorite/wishlist toggle** (flip the heart instantly, fire `selection` haptic, roll back + toast on failure), marking notifications read, sending a message (show as "sending"). **Not** for money/commitment (booking, pay, accept/decline) — those show button‑loading + confirmation.
- **Sticky bottom CTA** for booking widget (property detail), checkout, and wizard nav — pinned above the home indicator, `shadow.raised`, never scrolls away (Airbnb's sticky‑widget pattern; sticky CTAs measurably lift conversion).
- **Keyboard avoidance:** `KeyboardAvoidingView` (`behavior=padding` iOS / `height` Android) on auth, conversation, review, wizard text steps; `keyboardShouldPersistTaps='handled'` on scroll views with inputs; conversation composer sticks above keyboard.
- **Haptics on key actions:** `success` on booking confirmed / payment done / listing published / request accepted; `warning` on opening a destructive ConfirmSheet; `selection` on chip/segment/star taps and stepper ±; `tap` on primary buttons. Centralize in `ui/haptics.ts` and guard with a user pref.
- **Bottom sheets over full‑screen modals** for focused sub‑tasks (dates, guests, filters, sort, share). Full‑screen reserved for multi‑step flows.
- **Gesture back:** keep stack default swipe‑back enabled; `<Header>` back button mirrors RTL; never trap the user in a modal without a visible close.

---

## 5. Navigation & IA

**Tabs (Travelling mode)** — `(tabs)/`: **Explore · Trips · Inbox · Wishlists · Profile** (matches `TabBar.tsx`). Good. Keep 5; don't add a "Host" tab.

**Travelling ↔ Hosting switch.** A single user toggles modes. Recommended model:
- Entry point lives in **Profile** as a prominent Row ("Switch to Hosting" / "Switch to Travelling") and, once a host, also a header affordance on the Explore screen.
- Switching to Hosting **pushes the `host/` stack** (it's outside `(tabs)`, per `_layout.tsx`) presenting a host home with its own bottom navigation context (Today/Reservations/Listings/Calendar/Earnings). Don't try to swap the tab bar in place — a clean stack boundary is simpler and matches Airbnb's mode separation. A persistent "Switch back to Travelling" affordance in the host header returns to tabs.
- The mode choice itself (confirming the switch the first time, or when a non‑host taps it) uses a **BottomSheet/ConfirmSheet**, not a new screen.

**Modal vs push (codify in `app/_layout.tsx`):**
- **Push (card, slide):** search flow, property detail, checkout, booking detail, conversation, wizard steps, host screens. Honor RTL (`slide_from_left` when RTL — already set).
- **Modal (`presentation:'modal'`):** onboarding (already), auth (consider `formSheet` on iOS), filters‑as‑full‑screen fallback, image viewer, review composer.
- **Bottom sheet (in‑screen, gorhom):** dates, guests, sort, share/report, confirms.

**Stack transitions:** keep `animation` RTL‑aware (done). Add `fullScreenGestureEnabled` on iOS for the property→checkout chain. Disable swipe‑back on the payment screen mid‑transaction.

**Deep links:** expo-router + `expo-linking` already present — ensure property/booking/conversation routes are linkable for push notifications (tap notification → correct screen).

---

## 6. Per‑screen application (key screens)

- **Explore `(tabs)/index`:** large Fraunces greeting + `<SearchBar>` hero (opens search). Sectioned `<List>` (FlashList) of `PropertyCard`s with `expo-image`, optimistic heart, `PriceText`, `RatingStars` compact. Pull‑to‑refresh. Skeleton preset on load.
- **Search `search/index` → `results` → `filters`:** SearchBar in header; **filters in a BottomSheet** (chips + segmented + range), sticky "Show N stays" CTA; results = FlashList of cards + a Map toggle (stub). Active filters as removable Chips.
- **Property detail `property/[id]`:** transparent `<Header>` over `<PhotoGallery>`; sections (title, rating summary, amenities grid, rules, policy, room types); **sticky bottom booking widget** (dates+guests open sheets, `PriceText` total, terracotta Reserve CTA). Replace the current in‑screen `Overlay` with sheets. Reviews list lazy/paginated.
- **Checkout `booking/confirm` + `pay`:** summary card, price breakdown, sticky pay CTA (button‑loading, no optimism), `success` haptic + success screen on confirm; `dev_simulate_payment` path behind a clearly labeled dev affordance.
- **Trips `(tabs)/trips`:** SegmentedControl Upcoming/Past, FlashList of booking cards with StatusPill, EmptyState ("No trips yet → Explore").
- **Inbox `(tabs)/inbox` + `conversation/[id]`:** FlashList conversations w/ Avatar + unread badge; conversation = inverted FlashList, sticky composer above keyboard, optimistic send, `mark_notifications_read` on focus.
- **Wishlists `(tabs)/wishlists`:** grid `<List>`, optimistic remove + undo toast.
- **Host wizard `host/new/*`:** `<WizardProgress>` + sticky nav; each step uses TextField/Select/Chip/ToggleRow; review step → `submit_property_for_review` with `success` haptic.
- **Host reservations/calendar/earnings:** FlashList + StatusPill; accept/decline via ConfirmSheet (no optimism); calendar uses the date components; `set_availability_range` with toast confirmation.

---

## 7. RTL — do it correctly on RN

Locked: **English default (LTR)**, Arabic = RTL, French = LTR.

1. **Set direction before first render** (already done well in `app/_layout.tsx` via `initLocale()` + `I18nManager.forceRTL` gated behind splash). Keep this.
2. **The reload caveat.** `I18nManager.forceRTL(true/false)` does **not** re‑flip an already‑mounted tree. When the user changes language to/from Arabic you **must restart**: call `Updates.reloadAsync()` (`expo-updates` is installed) after persisting the locale, and show a one‑line "Applying language…" notice first. Don't try to live‑flip.
3. **Logical layout, not physical.** Use `flexDirection:'row'` (RN auto‑swaps under RTL) and `start`/`end` for spacing/positioning. **Replace every `marginLeft/Right`, `left/right`, `textAlign:'left'/'right'`** with `marginStart/End`, `start/end`, `textAlign:'left'` (which RN maps to start) — or better, let `<Text>` default to start. The repeated `const textAlign = I18nManager.isRTL ? 'right' : 'left'` at the top of screens (`property/[id].tsx`, `fields.tsx`) should be deleted in favor of the `<Text>` component handling it.
4. **TextInput needs `writingDirection`** (`'rtl'|'ltr'`) in addition to alignment, or Arabic cursor/deletion behaves wrong (a known RN pitfall) — current `TextField` is missing this. Add it.
5. **Mirror directional icons** (back chevron, "next", carousel arrows, progress) — flip with `transform:[{scaleX: I18nManager.isRTL ? -1 : 1}]`. **Do not mirror** non‑directional glyphs (star, heart, logos) or media.
6. **Numerals:** route all numbers/prices/dates through `@dyafa/i18n` (`formatDZD`, `formatNumber`, date formatters) so Arabic gets correct numerals and DZD placement — never string‑concat numbers. `<PriceText>` enforces this.
7. **Test** the whole app with `I18nManager.forceRTL(true)` + restart; check sheets, gallery paging, sticky CTA side, and that gestures (swipe‑back) feel correct.

---

## 8. Accessibility

- **Every interactive element:** `accessibilityRole` (`button`/`link`/`tab`/`switch`/`adjustable`), `accessibilityLabel` (especially icon‑only buttons — back, clear, favorite: "Add to wishlist"/"Remove from wishlist"), and `accessibilityState` (`selected`/`disabled`/`busy`/`checked`). Steppers/sliders use `accessibilityRole='adjustable'` + `accessibilityValue` + `onAccessibilityAction` for increment/decrement.
- **Touch targets ≥44×44** (HIG/WCAG 2.1) — enforced via component min‑heights + hitSlop.
- **Dynamic Type:** keep `allowFontScaling` on in `<Text>`; cap with `maxFontSizeMultiplier` on chrome; never set fixed `height` on text containers — use `minHeight` + padding so scaled text doesn't clip.
- **Contrast (WCAG AA):** verify token pairs — bone text on teal/terracotta passes; **`text-muted #5E6664` on bone is the one to watch** (keep for ≥`body`, don't use for `caption` on tinted bg). Status‑on‑status‑bg pairs are designed to pass; don't put terracotta accent text on bone for body copy.
- **Screen‑reader order & grouping:** group card content with `accessible={true}` + a composed label ("Riad in Algiers, 4.85 stars, 12000 DZD per night, in wishlist") so VoiceOver/TalkBack reads a card as one swipe, not 6. Use `accessibilityElementsHidden`/`importantForAccessibility` to hide decorative layers (gallery dots, scrims).
- **Live regions:** Toast/error messages announce via `accessibilityLiveRegion='polite'` (Android) + `AccessibilityInfo.announceForAccessibility` (iOS). Sheets move focus to the title on open; closing returns focus to the trigger.
- **Reduce Motion:** `useReducedMotion()` disables shimmer/scale/slide.
- **Forms:** associate labels (TextField already passes `accessibilityLabel`), surface `error` text to the field's accessibility value, focus the first invalid field on submit.

---

## 9. Per‑screen acceptance checklist

Copy into each PR. A screen ships when **all** are true:

- [ ] **Safe area:** wrapped in `<Screen>`; respects top + bottom insets; sticky CTA sits above home indicator.
- [ ] **States:** loading = skeleton preset (not spinner); empty = `<EmptyState>` w/ CTA; error = `<ErrorState>` w/ working Retry; success path verified.
- [ ] **Lists:** any network list uses `<List>`/FlashList (no `.map` of remote data in a ScrollView); has `keyExtractor`, empty + pagination handled.
- [ ] **Pull‑to‑refresh** present on feeds/lists (teal tint).
- [ ] **Touch targets ≥44×44** (audit icon buttons + chips); hitSlop where visual <44.
- [ ] **Typography** via `<Text>`/`<Heading>` only (no raw `RN_FONTS` + size in the screen); correct face per locale.
- [ ] **Color rationing:** ≤1 terracotta commit element in view; teal for structure; stars terracotta not yellow.
- [ ] **Icons** are Lucide (no emoji glyphs); directional ones mirror in RTL.
- [ ] **RTL:** logical props only (no left/right literals); tested with forceRTL+reload; TextInputs set `writingDirection`; numbers via i18n; gallery/segmented paging mirrored.
- [ ] **Haptics:** correct level on commit/select/destructive; respects reduce pref.
- [ ] **Optimistic** only on reversible actions, with rollback + toast; money/commitment actions use button‑loading + confirm.
- [ ] **Sheets** used for focused sub‑tasks; destructive actions use `<ConfirmSheet>` (no raw `Alert`).
- [ ] **Keyboard:** avoidance on input screens; `keyboardShouldPersistTaps='handled'`; composer/CTA stays visible.
- [ ] **a11y:** roles + labels + states on all interactive els; cards grouped; reduce‑motion honored; AA contrast; Dynamic Type doesn't clip.
- [ ] **List perf:** scroll is 60fps with skeleton→content; images via `expo-image` w/ blur‑up; no layout shift.

---

## 10. Migration order (so nothing breaks)

1. Install the §0 stack via `npx expo install`; add `GestureHandlerRootView` + `BottomSheetModalProvider` + `ToastProvider` in `app/_layout.tsx`.
2. Build `<Screen>`, `<Text>/<Heading>`, `ui/haptics.ts`, `ui/motion.ts`. Re‑export old `ui.tsx`/`fields.tsx` symbols from `src/ui` so existing screens compile.
3. Swap **icons** app‑wide (TabBar, discovery, states) emoji→Lucide — instant visual upgrade.
4. Replace `RemoteImage` with `expo-image`; add shimmer skeletons.
5. Migrate Explore + Search + Property detail (sheets + sticky CTA + FlashList) — the conversion‑critical path.
6. Inbox/Trips/Wishlists/Host. Delete legacy `ui.tsx`/`fields.tsx`.
7. RTL audit pass (logical props, writingDirection, reload‑on‑language‑change) + a11y pass + full per‑screen checklist sign‑off.

---

## 11. Map placeholder

No native Mapbox in Expo Go. `<Map>` renders a branded static placeholder: a bone tile with teal `MapPin`s positioned from listing coords (decorative), the price `PriceText` as tappable terracotta pins (`shadow.pin` token already exists for this), and an "Open map" affordance that, in a dev/standalone build, swaps to a real provider. Keep the API (`markers`, `onMarkerPress`, `region`) stable so the stub→native swap is a one‑file change. Mark decorative pins `accessibilityElementsHidden`; expose the listing list as the accessible equivalent.

---

### Sources
- [Expo SDK 54 changelog](https://expo.dev/changelog/sdk-54) · [Expo BottomSheet (gorhom-compatible)](https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/bottomsheet/) · [gorhom/react-native-bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet) · [Gorhom vs Expo BottomSheet 2026](https://www.pkgpulse.com/guides/gorhom-bottom-sheet-vs-expo-bottom-sheet-vs-rnsbs-2026)
- [I18nManager · React Native docs](https://reactnative.dev/docs/i18nmanager) · [Architecting RTL in React Native — what breaks/works](https://medium.com/@ancybhairavi/architecting-rtl-in-react-native-what-breaks-and-what-works-8d96c8cba62b) · [Implementing RTL in RN Expo (GeekyAnts)](https://dev.to/geekyants-inc/implementing-rtl-right-to-left-in-react-native-expo-a-step-by-step-guide-m01)
- [Airbnb's sticky widget (Appcues)](https://goodux.appcues.com/blog/airbnbs-sticky-widget) · [Booking UX best practices 2025 (RaLabs)](https://ralabs.org/blog/booking-ux-best-practices/) · [Booking vs Airbnb mobile homepage UI (GoodUI)](https://goodui.org/blog/comparing-bookings-vs-airbnbs-mobile-homepage-ui/)
- [React Native Accessibility (BrowserStack)](https://www.browserstack.com/guide/react-native-accessibility) · [RN Accessibility best practices 2025](https://www.accessibilitychecker.org/blog/react-native-accessibility/) · [Accessibility · React Native docs](https://reactnative.dev/docs/accessibility)

**Key codebase files referenced:** `packages/design-tokens/src/{tokens,rn-theme,fonts}.ts` · `apps/customer/package.json` (no native interaction libs yet) · `apps/customer/src/components/{ui,fields,TabBar}.tsx` · `apps/customer/src/lib/fonts.ts` · `apps/customer/app/_layout.tsx` · `apps/customer/app/(tabs)/_layout.tsx` · `apps/customer/app/property/[id].tsx`