I now have enough grounding across the existing token system, the current app state, and 2025-2026 best practices. I'll write the complete design system specification.

# Dyafa Admin & Hotel Dashboards — UX/UI System Specification

This is the authoritative spec for reworking `apps/admin` and `apps/hotel`. It is built on the **existing `@dyafa/design-tokens`** (the token names below are real and importable today) and grounded in current SaaS-dashboard practice. It is opinionated by design — build to this, do not re-litigate per page.

> **Why now:** Today's `apps/admin/app/moderation/page.tsx` is a single self-contained page: no app shell, no sidebar, a hand-rolled CSS-grid "table", inline `grid-cols-[2fr_1.3fr…]`, and zero shared components. Every page reinvents layout. The fix is a **shared `@dyafa/ui` package** + an **app-shell layout** consumed by both apps. Everything below feeds that.

---

## 0. Architecture decision (do this first)

Create a new shared package **`@dyafa/ui`** consumed by both `apps/admin` and `apps/hotel`. Three layers (the now-standard shadcn convention):

- **`ui/`** — primitives: `Button`, `Input`, `Select`, `Badge/Pill`, `Card`, `Dialog`, `Toast`, `Tabs`, `Skeleton`, `Tooltip`, `DropdownMenu`, `Checkbox`, `Switch`.
- **`patterns/`** — composed app pieces: `DataTable`, `PageHeader`, `Sidebar`, `TopBar`, `EmptyState`, `StatCard`, `FilterBar`, `ConfirmDialog`, `FormField`.
- **`app-shell/`** — `AppShell` (sidebar + topbar + content slot), wired once per app via a nav config object.

Build on **Radix UI primitives** (focus management, ARIA, dismiss/escape behavior are solved correctly) + Tailwind via the existing preset. Do **not** hand-roll dialogs/menus/tooltips — that is where the current "buggy" feeling comes from (focus traps, escape handling, click-outside). This mirrors how shadcn/Untitled UI ship accessibility via Radix/React-Aria rather than re-implementing it. ([shadcn 2026 architecture](https://medium.com/write-a-catalyst/shadcn-ui-best-practices-for-2026-444efd204f44), [shadcn vs Untitled UI](https://medium.com/@jeffshomali/shadcn-ui-vs-untitled-ui-the-ultimate-comparison-guide-for-modern-ui-development-91ac228d7e68))

**RTL:** every component uses logical properties only — `ps-*/pe-*/ms-*/me-*`, `text-start/text-end`, `start-0/end-0`. No `pl/pr/left/right`. The shell reads `dir(locale)` once and sets `dir` on `<html>`; components must not branch on locale.

---

## 1. Visual language

### 1.1 The core move: dark-teal chrome, warm-bone canvas
The single most impactful change. The signature is **a deep teal (`teal-800 #0E3A3A`) persistent sidebar against a warm bone (`bg #F7F3EC`) content area**, with white (`surface`) cards floating on the bone. This instantly reads "designed, branded product" instead of "default admin template," and it is the one place we use brand color at full saturation.

- **Sidebar:** `bg-primary` (teal-800). Nav text `teal-200`, active item `text-on-primary` on a `teal-700` pill, section labels `teal-400` overline.
- **Top bar:** `surface` (white) with a `border-b border-border` hairline — NOT teal. Keeps two heavy bands from fighting. (Today's moderation page makes the top bar teal *and* has no sidebar; we invert that.)
- **Content canvas:** `bg` (bone-200). Cards: `surface` white, `rounded-card` (16px), `shadow-card`, `border border-border`.

### 1.2 Color discipline (Refactoring UI: design in grayscale, add color last)
Most of the UI is **ink on bone/white with sand hairlines**. Color is rationed and meaningful — never decorative. ([Refactoring UI key points](https://medium.com/design-bootcamp/top-20-key-points-from-refactoring-ui-by-adam-wathan-steve-schoger-d81042ac9802))

| Color | Used ONLY for |
|---|---|
| `primary` teal-800 | Sidebar, primary buttons, links, key headings |
| `accent` terracotta-600 | The ONE primary CTA per view, prices/DZD amounts, active tab underline, focus ring. Never two accent elements competing in one viewport. |
| `success / warning / error / info` (+ `-bg`) | Status pills, toasts, inline validation only |
| `sand` / `border` | Hairlines, dividers, input borders, skeleton base |

Rule: if a screen has more than ~10% colored pixels (excluding the sidebar band and one CTA), it's over-colored — pull back to ink/bone.

### 1.3 Typography hierarchy
Three families already in tokens: **Fraunces** (display/serif), **Plus Jakarta Sans** (body/UI), **IBM Plex Sans Arabic** (Arabic). Banned: Inter, Roboto, Arial, system-ui.

- **Fraunces** — only page titles (`heading-1`), KPI big numbers (`display-lg`), empty-state titles, marketing-ish moments. Gives the editorial warmth. **Never** for table cells, labels, or buttons (serif at small UI sizes reads cluttered).
- **Plus Jakarta Sans** — everything functional: table data, labels, buttons, body, inputs, breadcrumbs.
- **IBM Plex Sans Arabic** — auto-swapped for `body`/`display` when `lang="ar"` (Fraunces has no Arabic; Plex carries both display and body weight for ar).

Type roles (map to existing `fontSize` tokens):
| Role | Token | Family/weight |
|---|---|---|
| Page title | `heading-1` 26px | Fraunces semibold |
| Section/card title | `heading-3` 18px | Jakarta semibold |
| KPI value | `display-lg` 34px | Fraunces semibold, `tabular-nums` |
| Table header | `caption` 12px | Jakarta semibold, uppercase, `tracking-wide`, `text-muted` |
| Table cell | `body-sm` 13.5px | Jakarta regular; numbers `tabular-nums` |
| Body | `body` 15px | Jakarta regular |
| Button | `body-sm` | Jakarta semibold |
| Overline/nav section | `overline` 11px | Jakarta semibold, uppercase, `tracking-wide` |

`tabular-nums` is mandatory on every numeric column, price, KPI, and date so columns align.

### 1.4 Elevation, radius, motion
- **Shadows are flat & teal-tinted** (already in tokens). Use `shadow-xs` for raised inputs/rows-on-hover, `shadow-card` for cards, `shadow-raised` for dropdowns/popovers, modal uses `shadow-raised` + `overlay` scrim. Never stack heavy shadows — depth comes from the bone-vs-white contrast, not drop shadows. ([Refactoring UI on shadows](https://www.sglavoie.com/posts/2023/09/09/book-summary-refactoring-ui/))
- **Radius:** `sm` 8px (inputs, buttons, badges), `card` 16px (cards/modals), `pill` (status pills, nav active, avatars). Be consistent: inputs and buttons share `sm`.
- **Motion:** subtle, calm, never bouncy. Use `duration-fast` (140ms) for hover/color/focus, `duration-base` (220ms) for dropdown/modal enter, easing `standard`. Honor `prefers-reduced-motion` (disable transforms, keep opacity). The 150ms target you specified maps to `fast`.

---

## 2. App shell

```
┌──────────────┬─────────────────────────────────────────────┐
│              │  TopBar: breadcrumb · [⌘K search] · 🌐 · 👤  │ 56–60px, sticky, z-header
│   Sidebar    ├─────────────────────────────────────────────┤
│  (teal-800)  │                                             │
│  240px / 64px│   Content (max-w-[1200px], mx-auto, p-2xl)  │ bg-bone
│              │                                             │
└──────────────┴─────────────────────────────────────────────┘
```

### 2.1 Sidebar (`Sidebar`)
- **Width:** 240px expanded, 64px collapsed (icon-only). Persist collapsed state in `localStorage`. `bg-primary`, `shadow` none (the color edge is enough), full height, sticky.
- **Top:** Dyafa wordmark (Fraunces, `text-on-primary`) + small app label ("Admin" / "Host") in `teal-400`.
- **Grouped nav** with `overline` section labels in `teal-400`. Items: 40px tall, `rounded-pill` hit area, icon (20px, Lucide) + label, `gap-md`, `px-md`.
  - Default: `text-teal-200`.
  - Hover: `bg-teal-700/40`, `text-on-primary`, `duration-fast`.
  - **Active:** `bg-teal-700`, `text-on-primary`, with a 3px `accent` (terracotta) indicator bar on the inline-start edge. Active = current route segment.
- **Collapsed:** icons only, label shown via Radix `Tooltip` on the inline-end side.
- **Footer:** environment badge (e.g. "VPS · prod"), version, collapse toggle.
- **A11y:** `<nav aria-label>`, active item `aria-current="page"`. Keyboard arrow-up/down moves between items (roving tabindex).

**Suggested IA**

`apps/admin`: **Overview** · Moderation queue · Listings · Bookings · Users (Hosts/Guests) · Payments & payouts · Reviews · Reports · Audit log · Settings.
`apps/hotel`: **Overview** · Properties · Calendar/Availability · Reservations · Messages · Reviews · Earnings/Payouts · Settings.

Group into 2–3 sections (e.g. *Operations* / *Catalog* / *System*) rather than one flat list. Most-used items at top. ([Admin dashboard best practices 2025](https://medium.com/@CarlosSmith24/admin-dashboard-ui-ux-best-practices-for-2025-8bdc6090c57d))

### 2.2 Top bar (`TopBar`)
`surface` white, `border-b border-border`, sticky, `z-header`, `h-14`, `px-xl`, flex space-between.
- **Start:** breadcrumb (`Section / Subsection / Item`), last crumb is the page title in `heading-3` Jakarta semibold ink; ancestors `text-muted` with `/` separators. On mobile, collapse to just current page + back chevron.
- **Center/Start-adjacent:** global search trigger — a button styled as an input ("Search…" + `⌘K`) that opens a **command palette** (Radix Dialog + cmdk). This is the Linear/Vercel pattern and the single biggest power-user win.
- **End:** **language switch** (Globe → `DropdownMenu` EN/AR/FR, persists to cookie, flips `dir`), notifications bell (optional), **user menu** (avatar → `DropdownMenu`: name/email, role, Settings, Sign out).
- Mobile (<768px): sidebar becomes off-canvas drawer; top bar gets a hamburger at the start.

### 2.3 Content rhythm
- Max content width **1200px**, centered (`mx-auto`), `px-xl` (24) on desktop, `px-lg` (16) mobile, `py-2xl` (32) top.
- Vertical rhythm: `gap-2xl` (32) between major sections, `gap-lg` (16) inside a card, `gap-md` (12) between label+control. **Stick to the 4px spacing scale — no arbitrary values.** ([Refactoring UI spacing](https://medium.com/design-bootcamp/top-20-key-points-from-refactoring-ui-by-adam-wathan-steve-schoger-d81042ac9802))
- Generous whitespace first, then tighten. Don't fill the canvas edge-to-edge.

---

## 3. Data tables (`DataTable`)

The current moderation "table" is CSS grid in markup — fine visually but not sortable/selectable/paginated and not reusable. Build one real `DataTable` (headless via TanStack Table, rendered with our primitives).

### 3.1 Density & structure
- **Row height 48px** standard, **40px** compact (user-toggle, persisted). ([Enterprise table density](https://medium.com/@calee607/data-table-design-guidelines-for-enterprise-applications-40f7ef0e0186))
- **Sticky header**, `bg-surface-sunken`, `caption` uppercase `text-muted` labels, `border-b border-border-strong`. Header stays put on vertical scroll; ensure focused rows aren't hidden behind it (WCAG 2.2 focus-not-obscured). ([WCAG 2.2 focus-not-obscured](https://www.w3.org/TR/WCAG22/))
- **Row hover:** `bg-bone-300`, `duration-fast`. Clickable rows get `cursor-pointer` and a focusable element; entire row navigable but keep an explicit "View" affordance for a11y.
- **Zebra:** off. Use hairline `border-b border-border` between rows — cleaner than stripes at this density.
- **Alignment:** text start-aligned; numbers/dates/currency **end-aligned with `tabular-nums`**. Currency formatted as DZD via shared `format.ts`.
- **First column** = the entity identity (title + secondary line, e.g. listing title + host). Keep it sticky on horizontal scroll for wide tables.

### 3.2 Toolbar / filter bar (`FilterBar`)
Above the table, in the card header: left = scoped search input + filter chips (status, wilaya, type, date range via popover); right = density toggle, column visibility (`DropdownMenu` of checkboxes), export. Active filters render as **removable chips** (`Pill` with ×). Reserve the toolbar for table-global actions. ([Enterprise toolbar pattern](https://stephaniewalter.design/blog/essential-resources-design-complex-data-tables/))

### 3.3 Sorting, selection, bulk actions
- **Sortable columns:** clickable header with a chevron; show asc/desc; `aria-sort` on `<th>`. Single-column sort default.
- **Selection:** leading checkbox column, header checkbox = select-all-on-page (tristate). On selection, the toolbar **transforms into a bulk-action bar**: "N selected" + actions (Approve, Reject, Export, Delete) + Clear. Destructive bulk actions route through `ConfirmDialog`.
- **Pagination:** footer with "Showing X–Y of Z", page-size select (**default 25**, options 10/25/50/100), prev/next + page numbers. For huge sets use cursor pagination + virtualized rows. ([25-row default & density](https://www.justinmind.com/ui-design/data-table))

### 3.4 The four states (all mandatory, all designed)
1. **Loading → skeleton**, never a spinner for tables. Render the real table chrome (header, row dividers) with `Skeleton` bars in cells; subtle left-to-right shimmer using `surface-sunken` base. Match column widths to avoid layout shift. ([Skeleton shimmer guidance](https://medium.com/@calee607/data-table-design-guidelines-for-enterprise-applications-40f7ef0e0186))
2. **Empty (no data yet)** → `EmptyState`: Fraunces title, muted one-liner, primary action ("Create listing"). Distinguish from…
3. **Empty (filtered to nothing)** → "No results match these filters" + **Clear filters** button. Different copy, different action.
4. **Error** → inline `role="alert"` card in `error-bg`/`error` with a **Retry** button and the message. (Current page shows the error string but offers no retry.)

---

## 4. Forms (`FormField`, `Input`, `Select`)

- **Layout:** single column, **labels above inputs** (fastest scan, best for i18n where label length varies). Group related fields in `Card` sections with `heading-3` titles. Max field width ~480px even on wide screens (line-length/scan).
- **Field anatomy:** label (`body-sm` semibold) → optional helper (`caption` muted) → control → message slot (validation). Always reserve the message slot height to avoid jump on error.
- **Inputs:** `surface` bg, `border-strong` border, `rounded-sm`, `h-10`, `px-md`. Focus: `border-accent` + 2px `focus-ring` (terracotta) ring with offset. Disabled: `surface-sunken`, `text-muted`. Required marked with text "Required", not just a red asterisk (a11y).
- **Validation (inline, on blur + on submit):** error → `border-error`, message `text-error` with icon, `aria-invalid` + `aria-describedby` pointing at the message. Validate on blur (not every keystroke); re-validate on change once errored. Success ticks only where reassurance matters (e.g. unique slug).
- **Save/Cancel affordance:** actions in a **sticky footer bar** at the bottom of the form card (right-aligned LTR / start-aligned per dir): primary `Button` (Save) + ghost (Cancel). Disable Save until dirty; show inline "Unsaved changes" hint. Warn on navigate-away when dirty.
- **Optimistic feedback:** on submit, button enters `loading` (spinner + "Saving…", stays same width). On success → success `Toast` + button returns to idle; optimistically reflect the change in the UI, roll back + error toast on failure.
- **Destructive actions:** always a `ConfirmDialog` (modal), never inline-instant. Modal: title states consequence ("Delete this listing?"), body explains irreversibility, **type-to-confirm** for high-stakes deletes (type the listing name), destructive button is `error` variant; default focus on Cancel.

---

## 5. Detail pages

For a single listing / reservation / user / property.

- **`PageHeader`:** breadcrumb (in top bar) + entity title (`heading-1` Fraunces) + status `Pill` inline + key metadata line (id, created date, host) in `text-muted` + **primary actions** right-aligned (e.g. Approve / Reject, or Edit). Overflow actions in a `…` `DropdownMenu`.
- **Layout:** 2-column on desktop — main column (cards) ~`2fr`, side rail `1fr` for metadata/status/quick facts. Collapses to single column <1024px.
- **Sections as `Card`s** with `heading-3` titles: e.g. Photos, Details, Pricing, Amenities, Host info, History.
- **Status pills** consistent across app (see §8 `Pill`): `pending` warning, `approved/active` success, `rejected/error` error, `draft` neutral.
- **Related data** (e.g. host's other listings, reservation history) as compact embedded `DataTable`s or list cards with "View all →".
- **Activity/audit trail** as a vertical timeline in the side rail (who did what, when) — ties into `audit_log`.

The existing `apps/admin/app/moderation/[id]/DecisionPanel.tsx` should be refactored into this header-actions + sticky decision card pattern.

---

## 6. Dashboards / analytics (the "Overview" pages)

- **KPI row:** 3–4 `StatCard`s. Each: `overline` label, `display-lg` Fraunces value (`tabular-nums`), **trend delta** as a `Pill` (▲ +12% success-tinted / ▼ −4% error-tinted) with "vs last period" caption, optional sparkline. One accent allowed per row max.
- **Time-range control:** segmented control top-right (`7d / 30d / 90d / Custom`), drives all widgets on the page. Comparison toggle ("vs previous period") overlays a muted dashed series.
- **Charts:** use a lightweight lib (Recharts/visx). Styling: teal/terracotta series on bone, **no gridline clutter** (faint `border` horizontal lines only, no vertical), `tabular-nums` axis labels, muted axis text, tooltip = `surface` card with `shadow-raised`. Pick the right chart: **line for trends over time, bar for comparison, table for granular** — pie only for ≤4 part-to-whole. ([Chart-type selection](https://www.context.dev/blog/dashboard-design-best-practices))
- **Density:** lead with the 3–4 metrics that drive decisions; push detail into drill-down tables. Don't dump every metric on one screen. ([Dashboard prioritization](https://www.letsgroto.com/blog/saas-ux-best-practices-how-to-design-dashboards-users-actually-understand))
- Empty/loading states apply here too: skeleton KPI cards + chart placeholders.

---

## 7. Feedback system (none exists today — this is the consistency win)

One global pattern, provided once at the shell level:

- **Toasts (`Toast` + `ToastProvider`):** Radix Toast, anchored bottom-end (bottom-start in RTL), stack max 3, auto-dismiss 4s (errors persist until dismissed). Variants: `success` (success-bg + check), `error` (error-bg + alert), `info`, `warning`. Each: short title + optional description + optional action ("Undo"). `aria-live="polite"` (errors `assertive`). Use for **outcomes of async actions** (saved, approved, payout sent). ([aria-live for toasts](https://www.w3.org/TR/WCAG22/))
- **Inline errors:** for **validation and contextual failures** (field invalid, a section failed to load). Never toast a validation error.
- **Confirm dialogs (`ConfirmDialog`):** for destructive/irreversible actions (§4). Radix `AlertDialog` (no click-outside dismiss for these).
- **Loading indicators:** skeletons for content/tables/cards; inline button spinners for actions; a thin top progress bar for route transitions. Spinners only for short, unsized waits.
- **Decision matrix** (codify this):
  | Situation | Pattern |
  |---|---|
  | Async action succeeded/failed | Toast |
  | Field/section invalid | Inline error |
  | Destructive/irreversible | Confirm dialog |
  | Content loading | Skeleton |
  | Button action in flight | Button spinner |
  | No data | EmptyState |

---

## 8. Accessibility, responsiveness, keyboard (WCAG 2.2 AA target)

- **Focus visible:** every interactive element shows a 2px `focus-ring` (terracotta) ring with `ring-offset-2`, contrast ≥3:1 against its background — meets WCAG 2.2 *Focus Appearance* and *Focus Not Obscured* (don't let the sticky header/footer hide focused rows). Never remove outlines without a replacement. ([WCAG 2.2 focus criteria](https://www.w3.org/TR/WCAG22/), [focus indicator guidance](https://vispero.com/resources/managing-focus-and-visible-focus-indicators-practical-accessibility-guidance-for-the-web/))
- **Contrast:** body text ≥4.5:1, large text/UI ≥3:1. Verify `text-muted` (ink-500) on `bg` and on `surface-sunken` — both pass for ≥13.5px. Don't put `teal-400` text on teal-800 for anything load-bearing (decorative only).
- **Keyboard:** full operability — Tab order matches visual order; menus/dialogs trap focus and restore on close (Radix handles this); table sort headers are buttons; `⌘K` palette; `Esc` closes overlays. ([WCAG 2.2 keyboard](https://www.allaccessible.org/blog/wcag-22-complete-guide-2025))
- **Labels:** every input has a `<label htmlFor>`; icon-only buttons get `aria-label`; tables use `<th scope>`; landmarks `<nav> <main> <header>`. Touch targets ≥24×24 CSS px (WCAG 2.2 *Target Size*), 44px on mobile.
- **Responsiveness (down to 768px and below):**
  - ≥1024px: full shell, 2-col detail.
  - 768–1024px: sidebar auto-collapses to icons; detail single-column.
  - <768px: sidebar → off-canvas drawer (hamburger); **tables become stacked cards** (label:value pairs) — never horizontal-scroll a wide table on phone; KPI cards 1-col; sticky form footer remains.
- **Motion:** respect `prefers-reduced-motion`.

---

## 9. Shared component inventory (`@dyafa/ui`)

Build these. Props show key variants; all accept `className` and forward refs; all RTL-safe.

| Component | Key props / variants |
|---|---|
| **Button** | `variant: primary \| secondary \| ghost \| destructive \| link`; `size: sm \| md \| lg`; `loading`, `iconStart`, `iconEnd`, `fullWidth`, `disabled`. Primary=teal; the single CTA per view may use accent; destructive=error. Loading keeps width, swaps content for spinner. |
| **Card** | `as`, `padding: sm \| md \| lg`, optional `title`/`actions` header slot, `footer`. `surface` bg, `rounded-card`, `border`, `shadow-card`. |
| **PageHeader** | `title` (Fraunces), `breadcrumb[]`, `status?` (Pill), `meta?`, `actions?` (primary + overflow menu). |
| **DataTable** | `columns` (id, header, accessor, `sortable`, `align`, `width`, `sticky`, cell renderer), `data`, `loading`, `error`, `empty`, `selectable`, `onSelectionChange`, `bulkActions`, `pagination`, `density`, `onRowClick`. Owns the 4 states. |
| **FilterBar** | `search`, `filters[]` (chip+popover), `onClear`, right-slot (density/columns/export). |
| **Pill** (Badge) | `variant: neutral \| success \| warning \| error \| info \| accent`; `size: sm \| md`; `dot?`, `removable?` (× → onRemove). Uses `-bg`/fg status pairs. Status mapping centralized in one `statusToPill()`. |
| **Input / Textarea** | `label`, `helper`, `error`, `required`, `iconStart/End`, `size`. Manages `aria-invalid`/`aria-describedby`. |
| **Select** | Radix Select; same field anatomy; searchable variant for long lists (wilayas). |
| **Checkbox / Switch / Radio** | label, `error`, indeterminate (checkbox). |
| **FormField** | wrapper: label + helper + control slot + message; reserves message height. |
| **Modal (Dialog)** | `title`, `description`, `size: sm \| md \| lg`, `footer`, scrim `overlay`, focus trap, Esc-to-close. |
| **ConfirmDialog** | `title`, `body`, `confirmLabel`, `destructive`, `requireTypeToConfirm?`. Built on AlertDialog. |
| **Toast / ToastProvider + useToast()** | `toast({ variant, title, description, action, duration })`. Bottom-end stack, aria-live. |
| **Tabs** | underline style, accent active indicator (animated `duration-fast`), `aria` roving; keyboard arrows. |
| **StatCard** | `label`, `value`, `delta?` ({value, direction}), `period?`, `sparkline?`, `icon?`. Fraunces value, tabular-nums. |
| **EmptyState** | `icon`, `title` (Fraunces), `description`, `action?`. Two presets: no-data vs no-results. |
| **Skeleton / SkeletonTable / SkeletonCard** | `width`, `height`, `rounded`, `lines`; shimmer; reduced-motion safe. |
| **Sidebar** | `groups[]` (label, items[{icon,label,href,badge}]), `collapsed`, `onToggle`, `appLabel`. aria-current active. |
| **TopBar** | `breadcrumb`, `onSearch` (⌘K), `languageSwitch`, `userMenu`, mobile hamburger. |
| **AppShell** | composes Sidebar + TopBar + `<main>`; reads `dir`; handles mobile drawer + collapse persistence. |
| **DropdownMenu / Tooltip / Popover** | Radix wrappers, `shadow-raised`, `rounded-sm`, `surface`. |
| **SegmentedControl** | time-range / density toggles. |

**Build order:** (1) AppShell + Sidebar + TopBar (unblocks every page), (2) Button/Card/Pill/Input/Select/FormField, (3) Toast + ConfirmDialog + Modal (the missing feedback layer), (4) DataTable + FilterBar + EmptyState + Skeleton, (5) StatCard + Tabs + charts. Migrate `moderation` list → `DataTable` and `moderation/[id]` → `PageHeader`+detail layout as the reference implementation, then roll out.

---

## 10. Concrete acceptance checklist (per page)

- [ ] Renders inside `AppShell` (no per-page top bar).
- [ ] Uses only tokens (no hex, no arbitrary spacing).
- [ ] Logical properties only (RTL passes in `ar`).
- [ ] Has designed loading (skeleton), empty (correct preset), and error (with retry) states.
- [ ] Async outcomes → toast; validation → inline; destructive → confirm dialog.
- [ ] All interactive elements keyboard-reachable with visible terracotta focus ring.
- [ ] Numbers/dates/DZD use `tabular-nums` and shared formatters.
- [ ] Works at 768px (drawer + stacked tables) and respects reduced motion.

---

### Sources
- [Admin Dashboard UI/UX Best Practices 2025 — Carlos Smith](https://medium.com/@CarlosSmith24/admin-dashboard-ui-ux-best-practices-for-2025-8bdc6090c57d)
- [10 Dashboard Design Best Practices for SaaS 2025 — context.dev](https://www.context.dev/blog/dashboard-design-best-practices)
- [SaaS UX Best Practices for Dashboards — Groto](https://www.letsgroto.com/blog/saas-ux-best-practices-how-to-design-dashboards-users-actually-understand)
- [Refactoring UI — Top 20 Key Points](https://medium.com/design-bootcamp/top-20-key-points-from-refactoring-ui-by-adam-wathan-steve-schoger-d81042ac9802) · [Refactoring UI summary](https://www.sglavoie.com/posts/2023/09/09/book-summary-refactoring-ui/)
- [shadcn/ui Best Practices 2026](https://medium.com/write-a-catalyst/shadcn-ui-best-practices-for-2026-444efd204f44) · [shadcn vs Untitled UI](https://medium.com/@jeffshomali/shadcn-ui-vs-untitled-ui-the-ultimate-comparison-guide-for-modern-ui-development-91ac228d7e68) · [shadcn Oct 2025 components](https://ui.shadcn.com/docs/changelog/2025-10-new-components)
- [Enterprise data tables — Stéphanie Walter](https://stephaniewalter.design/blog/essential-resources-design-complex-data-tables/) · [Data table guidelines — Carrie Lee](https://medium.com/@calee607/data-table-design-guidelines-for-enterprise-applications-40f7ef0e0186) · [Designing data table UI — Justinmind](https://www.justinmind.com/ui-design/data-table)
- [WCAG 2.2 (W3C)](https://www.w3.org/TR/WCAG22/) · [WCAG 2.2 complete guide 2025 — AllAccessible](https://www.allaccessible.org/blog/wcag-22-complete-guide-2025) · [Focus indicators — Vispero](https://vispero.com/resources/managing-focus-and-visible-focus-indicators-practical-accessibility-guidance-for-the-web/)

Grounded in the live token system at `C:\Users\debai\Desktop\1275\packages\design-tokens\src\tokens.ts` (all token names above are real and importable) and the current reference page `C:\Users\debai\Desktop\1275\apps\admin\app\moderation\page.tsx`.