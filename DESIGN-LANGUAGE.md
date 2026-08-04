# mofé Design Language System

## Purpose

This document defines the visual and interaction language for the entire service. It applies to admin panels, QR menu pages, modal dialogs, empty states, confirmations, and future product surfaces.

The system is intentionally restrained: ink on paper, minimal ornament, high legibility, low resource usage, and strong typographic hierarchy.

## Design Principles

### 1. Paper and ink only

The interface should feel printed rather than simulated. Use an off-white paper background and near-black text and rules. Avoid glossy gradients, heavy shadows, bright colors, and decorative effects.

### 2. Typography carries the interface

Information hierarchy should be created primarily through type size, weight, spacing, and structure. The interface should remain clear even when stripped of color and imagery.

### 3. Minimal by default

Every element must justify its presence. Prefer compact modules, direct labels, and small amounts of UI chrome. Avoid visual noise, redundant icons, and crowded panels.

### 4. Persian-first, bilingual-ready

The product is primarily Persian. Persian text should set the visual tone. English may appear as supporting text, metadata, or secondary labels.

### 5. Fast and lightweight

The system should work well on low-bandwidth networks and modest devices. Avoid asset-heavy patterns. Prefer code-generated surfaces and simple HTML/CSS where possible.

---

## Visual Foundation

### Color palette

Use a narrow monochrome palette.

**Core tokens**

* `paper`: `#f5f0e6`
* `ink`: `#111111`
* `ink-strong`: `#000000`
* `ink-muted`: `#5f5a52`
* `line`: `#d8d1c4`
* `surface`: `rgba(255,255,255,0.28)` or paper-adjacent fills only

**Rules**

* Backgrounds should remain paper-like.
* Text should remain black or near-black.
* Use muted neutral borders instead of colored separators.
* Accent color is optional and should be used sparingly, only for a single purposeful interaction state or brand mark.

### Shadows and depth

Depth should be very subtle.

* Use thin borders before shadows.
* If shadow is required, it should feel like a slight lift from paper, not a floating card.
* Never use heavy blur or large ambient shadow stacks.

### Corners

Prefer soft but controlled geometry.

* Standard radius: medium to large rounded corners.
* Primary containers: 24–28px radius.
* Inputs, pills, toggles: 12–18px radius.
* Avoid fully playful pill-only UIs.

### Spacing

Spacing should create calm and clarity.

* Use generous outer padding.
* Keep internal gaps measured.
* Use consistent vertical rhythm across pages.
* Never compress multiple concepts into one dense visual block.

---

## Typography

### Typeface stack

* Persian: **Parastoo**
* English: **EB Garamond**
* Fallback serif stack: `"Times New Roman", serif`

### Typographic intent

* Persian text should feel editorial and calm.
* English text should feel refined and supportive, not technical or mechanical.
* Headings should use serif weight and restrained tracking.
* UI labels may use small caps or uppercase only when helpful and readable.

### Hierarchy

Use a small set of clearly distinct text roles.

**Recommended roles**

* Page title: large serif, high contrast
* Section title: medium serif
* Card title: smaller serif
* Body copy: readable serif or system serif fallback
* Metadata/labels: small neutral text with wider tracking

### Rules

* Do not mix many weights.
* Do not rely on bold alone for hierarchy.
* Avoid decorative font pairing.
* Keep Persian and English aligned visually, not necessarily identically sized.

---

## Layout System

### Page structure

Use a structured grid with clear zones.

* Desktop admin surfaces: two-column or three-zone layouts
* Mobile customer surfaces: single-column layout
* Preview panels and inspectors may sit beside the main work area

### Container behavior

* Main content should be centered in a wide max-width container.
* Large screens should still feel compact and editorial.
* Do not let content sprawl edge-to-edge unless intentionally full-bleed for public pages.

### Section pattern

Each major area should use a clear container pattern:

* section header
* supporting subtitle
* content area
* optional footer actions

### Density rules

* Admin pages may be moderately dense, but should still breathe.
* Customer QR pages should be sparse and easy to scan one-handed.
* Avoid visual clutter in scrollable lists.

---

## Core Components

### Buttons

Buttons should be simple and functional.

**Primary button**

* Ink background
* Paper text
* Used for the main action on a screen

**Secondary button**

* Paper background
* Ink border
* Ink text
* Used for neutral actions

**Tertiary button**

* Text-only or faint border
* Used for less important actions

**Rules**

* Button labels should be short.
* Avoid multiple competing primary actions in the same area.
* Destructive actions should remain visually clear, but not loud.

### Inputs

Inputs should feel like paper forms.

* Border-first styling
* Light fill or transparent fill
* Clear labels above the field
* Rounded corners, not rectangular blocks

**Input behavior**

* Labels must not disappear after focus.
* Placeholder text should not substitute for labels.
* Error states should be explicit and calm.
* Inputs should remain compact and scannable.

### Toggles

Toggles are used for active/visible/sold-out states.

* Use a clear black-on-paper switch or neutral off-state.
* Place toggles next to the label they affect.
* Do not over-animate the toggle.

### Pills and badges

Use for compact metadata.
Examples:

* station
* calories
* sold out
* public / hidden

**Rules**

* Keep pills small.
* Use them as supporting information, not decoration.
* Sold-out states should use a restrained badge treatment.

### Cards

Cards are the main content surfaces.

* Use borders as primary structure.
* Keep padding generous.
* Titles, body text, and metadata should be clearly separated.
* Avoid image-led card design in the system layer.

### Tables and lists

Use simple row-based structures for menu items and management lists.

* Clear columns
* Minimal chrome
* Strong row separation
* Compact action area at the end of rows

### Tabs and category navigation

For mobile QR menus and category browsing:

* Use horizontal sticky tabs
* Keep labels short
* Use the active state sparingly and clearly
* The active tab should be obvious without needing color

### Modals and confirmations

Use for publish/unpublish, delete, and bulk actions.

* Title
* short explanation
* primary action
* secondary cancel action

Confirmation language should be direct and unambiguous.

### Empty states

Empty states should be calm and useful.

* Explain the missing content
* Offer one clear next step
* Avoid illustration-heavy placeholders

---

## States and Feedback

### Hover

Hover states should be subtle and tactile.

* Slight border darkening
* Minimal background shift
* No dramatic motion

### Focus

Focus states must be obvious and accessible.

* Use a clear outline or border contrast
* Focus should not depend on color alone

### Active

The active state should use stronger ink, bolder border, or filled treatment.

* Keep active treatments consistent across the product

### Disabled

Disabled items should look quieter, not broken.

* Reduced contrast
* No heavy opacity loss
* Avoid removing readability

### Sold out

Sold-out items remain visible but downgraded.

* Gray the card lightly
* Show a clear `ناموجود` badge
* Do not delete or hide the item from the customer menu

### Hidden or unpublished

Hidden content should remain accessible in admin context.

* Visible in management views
* Omitted from public surfaces
* State labels must be explicit

---

## Motion

Motion should be restrained and functional.

* Use short durations
* Use simple easing
* Prefer fade, slight translate, and border transitions
* Avoid bouncing, parallax, or flashy page transitions

Motion should assist understanding, not entertain.

---

## Content Style

### Persian language tone

* Clear
* Direct
* Calm
* Operational rather than promotional

### Labels

Labels should be short and precise.
Examples:

* دسته‌ها
* آیتم‌ها
* نمایش عمومی
* ناموجود
* انتشار منو
* پیش‌نمایش

### Numbers and currency

* Use local formatting for price.
* Always make Toman explicit where relevant.
* Keep numeric density readable.

### Metadata

Metadata should be secondary.
Examples:

* station
* calories
* visibility
* order
* active

---

## Accessibility

### Contrast

* Text must remain highly legible against the paper background.
* Do not place key information in low-contrast gray.

### Touch targets

* Mobile targets should be large enough for one-handed use.
* Avoid tiny icons without labels for critical actions.

### Reading order

* Visual order should match logical order.
* Important information should appear early in the scan path.

### RTL support

* Persian interfaces must respect RTL flow.
* Mixed-language lines should preserve correct directionality.
* Category tabs and row layouts should feel native in RTL contexts.

---

## Product-Specific Application

### Admin dashboard

The admin product should feel like a workbench.

* Clear lists
* Fast scanning
* Easy editing
* Lightweight forms
* Dense enough for operations, but never noisy

### QR menu editor

The menu editor should feel like a publishing surface.

* Header settings
* preview pane
* publish controls
* QR export actions
* clear confirmation for public changes

### Public QR menu

The customer page should feel like a printed menu.

* mobile-first
* read-only
* category navigation at top
* item cards with price and metadata
* sold-out visible, not hidden
* footer branding only

---

## Implementation Guidance

### Prefer code over assets

* Use CSS shapes, borders, and typographic structure before images or decorative assets.
* Use SVG only when necessary for functional icons.
* Avoid backgrounds that require large files.

### Component reuse

Build a shared component library from these primitives:

* Button
* Input
* Toggle
* Badge
* Card
* Section header
* Table row
* Modal
* Empty state
* Sticky tab bar

### CSS approach

* Use design tokens for color, spacing, radius, and typography.
* Keep component styles composable.
* Avoid hardcoded one-off values except for special layouts.

### Performance constraints

* Favor static HTML for public pages.
* Minimize runtime dependencies.
* Compress media aggressively.
* Make menu rendering work well on low-end mobile devices.

---

## Do / Do Not

### Do

* Use paper-like backgrounds
* Use serif typography consistently
* Keep layouts calm and structured
* Make states explicit and readable
* Keep public pages sparse and fast

### Do not

* Use flashy gradients
* Use heavy shadows or glassmorphism
* Overuse color
* Add decorative images for styling
* Overcrowd the screen with controls
* Hide critical states behind subtle cues

---

## Summary

This design language should feel like a modern printed menu system translated into software. It should be quiet, precise, and operational. The interface should disappear behind the information, while still feeling crafted and cohesive across the entire service.

