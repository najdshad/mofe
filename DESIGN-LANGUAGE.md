# mofé Design Language System

## Purpose

This document defines the visual and interaction language for the entire service. It applies to the landing page, admin panels, QR menu pages, modal dialogs, empty states, confirmations, and future product surfaces.

The system is intentionally restrained: ink, paper, and one accent. High legibility, low resource usage, and strong typographic hierarchy carry the interface — the accent is a spice, not the meal.

## Design Principles

### 1. Paper, ink, and a single accent

The interface should feel printed rather than simulated: an off-white paper background, near-black text and rules, and one terracotta accent reserved for brand, primary action, and active state. Avoid glossy gradients, heavy shadows, and decorative effects.

### 2. Typography carries the interface

Information hierarchy should be created primarily through type size, weight, spacing, and structure. The interface should remain clear even when stripped of color and imagery. Serif italic is the voice of the brand — accent words, ordinals, and English names speak in it.

### 3. Minimal by default

Every element must justify its presence. Prefer compact modules, direct labels, and small amounts of UI chrome. Avoid visual noise, redundant icons, and crowded panels.

### 4. Persian-first, bilingual-ready

The product is primarily Persian. Persian text should set the visual tone. English appears as supporting metadata: italic serif names, letterspaced uppercase micro-labels, and the `mofé` wordmark.

### 5. Fast and lightweight

The system should work well on low-bandwidth networks and modest devices. Avoid asset-heavy patterns. Prefer code-generated surfaces and simple HTML/CSS where possible.

---

## Visual Foundation

### Color palette

A warm monochrome base with one terracotta accent and a muted green for confirmations.

**Core tokens**

* `paper`: `#f5f0e6` — primary background
* `canvas`: `#efede7` — admin workspace background, slightly deeper than paper
* `panel`: `#fbfaf7` — near-white card and sidebar surface
* `ink`: `#111111` — primary text
* `ink-strong`: `#000000` — display headlines
* `ink-muted`: `#5f5a52` — secondary text
* `line`: `#d8d1c4` — borders and rules
* `surface`: `rgba(255,255,255,0.28)` — translucent fill on paper
* `accent`: `#b94f2c` — terracotta; brand, primary CTA, active state
* `accent-soft`: `#f4ded4` — pale terracotta tint for icon chips and tinted panels
* `success`: `#287451` — confirmations only (`منتشر شد`, checkmarks)

**Radius tokens**

* `--radius-panel`: `20px` — panels, modals
* `--radius-card`: `16px` — cards, inputs inside panels
* `--radius-control`: `12px` — buttons, fields, toggles

**Rules**

* Backgrounds stay paper or paper-adjacent (canvas is the only darker wash, admin-only).
* Text stays black or near-black.
* Accent is used in three places only: brand marks, the single primary action per view, and the active state. Never alternate accents per surface.
* Success green appears only next to confirmation content.
* Use muted neutral borders, never colored separators.

### Shadows and depth

Depth should be subtle and directional.

* Use thin borders before shadows.
* UI shadows are a 1px lift: `0 1px 2px rgba(17,17,17,0.03–0.12)`.
* Public-facing heroes (landing mockup, QR card) may cast a larger warm shadow — `0 18–30px 45–80px rgba(48,31,21,0.12–0.2)` — to lift them off the page.
* Never use heavy blur or large neutral ambient stacks in system UI.

### Corners

Soft but controlled geometry, scaled to role.

* Buttons on marketing/CTA: full pill (`rounded-full`).
* Panels and modals: `--radius-panel` (20px).
* Cards, inputs: `--radius-card` / `--radius-control` (16 / 12px).
* Small chips (icon chips, drop zones, photos): 12–18px.
* Avoid fully playful pill-only UIs inside the admin workbench.

### Spacing

Spacing should create calm and clarity.

* Generous outer padding; landing sections breathe at `py-24`–`py-32`.
* Measured internal gaps; panel content at `p-5`.
* Consistent vertical rhythm across pages.
* Never compress multiple concepts into one dense visual block.

---

## Typography

### Typeface stack

* Persian: **Parastoo** (body) and **Vazirmatn** as variable-weight fallback
* English: **EB Garamond** (variable, roman + italic)
* Fallback stack: `"Parastoo", "Vazirmatn", "Tahoma", sans-serif` for body; `"EB Garamond", "Parastoo", "Vazirmatn", "Times New Roman", serif` for headings
* All five font files self-hosted in `public/fonts/` — no external fonts.

### Typographic intent

* Persian text should feel editorial and calm.
* English in serif italic is treated as a refined voice note: venue names, item names, accent words, ordinals.
* Micro-labels use letterspaced uppercase (tracking `0.18–0.28em`, 9–13px) — `mofé · menu`, `COFFEE & PASTRY`, section eyebrow labels.
* Headings use serif weight and restrained tracking.

### Hierarchy

Use a small set of clearly distinct text roles.

**Recommended roles**

* Display headline: largest scale via `clamp(3rem, 8vw, 6.8rem)`, tight tracking (`-0.045em`), near-black (`ink-strong`)
* Section title: large bold, `text-4xl`–`text-6xl`
* Card title: bold serif or bold body
* Body copy: readable serif with generous line height (`leading-7`–`leading-9`)
* Metadata/labels: small neutral text; micro-labels letterspaced uppercase

### Rules

* Do not mix many weights; regular + bold + italic serif is the full set.
* Do not rely on bold alone for hierarchy.
* Avoid decorative font pairing beyond the two-face system.
* Keep Persian and English aligned visually, not necessarily identically sized.

---

## Layout System

### Page structure

* Landing page: full-bleed hero, alternating paper and ink sections, centered content in a `max-w-7xl` container.
* Admin: fixed sidebar on `canvas`, work surface centered in `max-w-[1440px]`.
* Public menu: single centered column, `min(100%, 680px)`.

### Container behavior

* Main content centered in a wide max-width container.
* Large screens still feel compact and editorial.
* Do not let content sprawl edge-to-edge, except full-bleed marketing sections (hero, ink band, CTA panel).

### Section pattern

Each major area should use a clear container pattern:

* section header (with optional serif-italic accent element)
* supporting subtitle
* content area
* optional footer actions

### Density rules

* Admin pages may be moderately dense but should still breathe.
* Customer QR pages are sparse and easy to scan one-handed.
* Avoid visual clutter in scrollable lists.

---

## Core Components

### Buttons

**Primary button** (in-app)

* Ink background, paper text, `--radius-control`
* Used for the main action on a screen

**Primary action** (landing CTA, publish)

* Accent background, white text, full pill, optional warm shadow
* Reserved for one per view — `رایگان شروع کنید`, publish controls

**Secondary button**

* Panel background, ink border, ink text
* Neutral actions — `دیدن نمونه منو`

**Tertiary button**

* Text-only or faint border
* Less important actions

**Rules**

* Button labels are short.
* Avoid competing primary actions in the same area.
* Destructive actions stay visually clear but not loud.

### Inputs

Inputs should feel like paper forms.

* Border-first styling (`border-line`)
* Light or transparent fill
* Clear labels above the field
* Rounded corners (`--radius-card`/`--radius-control`), not rectangular blocks

**Input behavior**

* Labels must not disappear after focus.
* Placeholder text should not substitute for labels.
* Error states explicit and calm.
* Inputs compact and scannable.

### Toggles

Toggles are used for active/visible/sold-out states.

* Clear black-on-paper switch or neutral off-state.
* Place toggles next to the label they affect.
* Do not over-animate the toggle.

### Pills and badges

Use for compact metadata.

* Category pills (public menu): text pills in `ink-muted`; the active pill fills with the venue accent and paper text.
* Badges: bordered 999px chips, 10–11px; `ناموجود` uses ink fill; `محبوب` uses a paper-tint fill.
* Sold-out states use a restrained badge plus opacity downgrade.

**Rules**

* Keep pills small.
* Use them as supporting information, not decoration.

### Cards

Cards are the main content surfaces.

* Borders as primary structure; panel fill (`panel`) over `canvas`.
* Padding generous (`p-4`–`p-5`); titles, body, metadata clearly separated.
* Tinted cards are allowed on the landing only (accent-soft, green mist, white/25).
* Avoid image-led card design in the system layer; public menu photos are small side thumbs (112px, 16–18px radius).

### Tables and lists

Use simple row-based structures for menu items and management lists.

* Clear columns, minimal chrome, strong row separation
* Compact action area at the end of rows

### Tabs and category navigation

* Public menus: horizontal sticky tabs (border-top/bottom rules, blur wash), short labels, active pill filled with accent
* Admin: segmented pill groups; selected segment inverts to ink/paper

### Modals and confirmations

Use for publish/unpublish, delete, and bulk actions.

* Title, short explanation, primary action, secondary cancel action
* Panel surface, `--radius-panel`, thin border, light scrim with slight blur

Confirmation language should be direct and unambiguous.

### Empty states

Empty states should be calm and useful.

* Explain the missing content
* Offer one clear next step
* Avoid illustration-heavy placeholders; use a hairline-framed block

---

## States and Feedback

### Hover

Subtle and tactile.

* Slight border darkening (`hover:border-ink/40`)
* Minimal background shift (`hover:bg-ink/5`)
* Landing CTAs may lift 2px (`-translate-y-0.5`) with a color shift

### Focus

Focus states must be obvious and accessible.

* Clear outline or ring (`focus-visible:ring-2`, accent-tinted ring)
* Focus must not depend on color alone

### Active

Stronger ink, bolder border, or filled treatment.

* Nav/segments: active = ink fill with paper text
* Category pills: active = accent fill, paper text
* Keep active treatments consistent within each surface

### Disabled

Disabled items look quieter, not broken.

* Reduced contrast, no heavy opacity loss
* Avoid removing readability

### Sold out

Sold-out items remain visible but downgraded.

* Text content fades to ~45% opacity
* Photos dim with a `ناموجود` overlay
* Show a clear `ناموجود` badge
* Do not delete or hide the item from the customer menu

### Hidden or unpublished

Hidden content remains accessible in admin context.

* Visible in management views
* Omitted from public surfaces
* State labels explicit

---

## Motion

Motion should be restrained and functional.

* Short durations (150–200ms)
* Simple easing
* Fade, slight translate, border transitions
* Avoid bouncing, parallax, flashy page transitions

Motion should assist understanding, not entertain.

---

## Content Style

### Persian language tone

* Clear, direct, calm
* Operational rather than promotional — except the landing, which may be warm and inviting

### Labels

Labels should be short and precise.

Examples: دستهها، آیتمها، نمایش عمومی، ناموجود، انتشار منو، پیشنمایش، فضای کاری، مشاهده منوی عمومی

### Numbers and currency

* Use local formatting for price (`fa-IR`).
* Always make Toman explicit where relevant.
* Keep numeric density readable.

### Metadata

Metadata should be secondary: station, calories, visibility, order, active.

---

## Accessibility

### Contrast

* Text must remain highly legible against paper and panel.
* Ink-on-paper primary; never place key information in low-contrast gray.
* Accent is never the only carrier of meaning — active states also change fill.
* White text on accent is reserved for large bold labels and buttons.

### Touch targets

* Mobile targets large enough for one-handed use (`min-h-9`–`min-h-14`).
* Avoid tiny icons without labels for critical actions.

### Reading order

* Visual order matches logical order.
* Important information appears early in the scan path.

### RTL support

* Persian interfaces must respect RTL flow.
* Mixed-language lines preserve correct directionality — item rows lay price `ltr` beside RTL info in a two-column grid.
* Category tabs and row layouts feel native in RTL contexts.

---

## Product-Specific Application

### Landing page

A single convincing frame: paper, ink, and terracotta.

* Full-bleed hero: radial accent/success tints and a faint dot grid, clamped display headline with one serif-italic accent word (hand-drawn underline SVG), pill CTAs, phone-shaped menu mockup with warm drop shadow
* Ink band for "how it works": paper text, serif-italic Persian ordinals (۰۱-۰۳) in warm terracotta, hairline dividers
* Feature grid on paper: tinted cards, serif-italic indexed numerics, ink icon tiles
* Closing CTA: solid accent panel with circle-rring decorations, ink pill button
* Footer: serif wordmark + one muted line

### Admin panel

The admin product should feel like a quiet workbench: a `panel` sidebar on `canvas`, an ink serif wordmark tile, and an accent-soft icon chip for the venue.

* Fixed sidebar (desktop): nav links as pill rows, active = ink fill/paper text; venue card in a bordered rounded surface; public link + QR + logout at the bottom
* Mobile: condensed panel header with bottom nav
* Content: `panel` sections at `--radius-panel` with hairline borders and a 1px shadow lift; menus and settings in two-column panels
* Each section (menu items, settings) opens with an icon chip on accent-soft and a bold title
* Publish area: ink panel with paper text; QR modal on panel with scrim
* Upload zones: dashed hairline borders, accent-colored hover
* Active state consistent: ink fill + paper text everywhere in the workbench

### Public QR menu

The customer page should feel like a printed menu with a warm accent.

* Single centered column (`min(100%, 680px)`) on paper with a soft radial wash at the top
* Hero: 72px round logo, `mofé · menu` letterspaced micro-label, tight-tracked venue name (`clamp(34px, 8vw, 52px)`), italic serif English name, welcome message in muted text
* Sticky category nav: hairlines + near-opaque paper blur; active pill filled with the venue accent
* Category headers: bold title with trailing hairline rule
* Item rows: price column (bold, left) beside info (RTL body): bold Persian name, italic serif English name, muted description, variant pills, pricing bubbles, allergen chips
* Photo mode: 112px square thumb with 18px radius and lazy loading
* Sold-out: muted overlay + `ناموجود` badge
* Footer: `Powered by mofé` letterspaced uppercase only
* Accent derives from the venue's `accentColor` setting, defaulting to the system terracotta `#b94f2c`

---

## Implementation Guidance

### Prefer code over assets

* Use CSS shapes, borders, radial gradients, and typographic structure before images or decorative assets.
* The landing dot grid and hand-drawn underline are CSS/SVG, not images.
* Use SVG icons (lucide) for function only.
* Public menu photos are aggressively compressed (WebP ≤50KB, ≤500px).

### Component reuse

Build a shared component library from these primitives:

* Button
* Input
* Toggle
* Badge
* Panel
* Modal
* Empty state
* Sticky tab bar
* Icon chip

### CSS approach

* Use design tokens for color, spacing, radius, and typography (`@theme inline` in `globals.css`).
* Radius tokens: `--radius-panel` / `--radius-card` / `--radius-control`.
* Keep component styles composable.
* Avoid hardcoded one-off values except for special marketing layouts (landing hero shadows, tints).

### Performance constraints

* Favor static HTML for public pages (server-rendered snapshot).
* Minimize runtime dependencies.
* Compress media aggressively.
* Make menu rendering work well on low-end mobile devices.

---

## Do / Do Not

### Do

* Use paper-like backgrounds with canvas for admin workspaces
* Let one terracotta accent own the primary action and active state
* Use serif italic for brand voice: accent words, ordinals, English names
* Keep layouts calm and structured
* Make states explicit and readable
* Keep public pages sparse and fast

### Do not

* Use flashy gradients (subtle radial tints only)
* Use heavy shadows or glassmorphism (blur only on scrim + sticky nav)
* Overuse color — one accent, one confirmation green
* Add decorative images for styling
* Overcrowd the screen with controls
* Hide critical states behind subtle cues
* Add external fonts — everything is self-hosted