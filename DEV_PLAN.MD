# mofé Persian Cafe Menu Management — Development Plan

## 1. Product Goal

Build a Persian-first cafe menu management service that lets venue operators manage menu categories, menu items, public QR menu appearance, publication status, QR exports, and static customer-facing menus.

The v1 product has two surfaces:

1. **Admin application** — authenticated web app for venue staff.
2. **Public QR menu** — pre-generated static HTML served from CDN; read-only, RTL, mobile-first, and fast.

The customer phone must not hit the API in v1. Public menus are regenerated and uploaded on publish actions.

## 2. Core Principles

- **Persian-first:** RTL layout, Persian labels, Parastoo typography, Toman pricing.
- **Paper and ink design:** off-white background, near-black text, minimal color, restrained borders, no decorative visual noise.
- **Operational speed:** management flows should be fast for cafe staff during service hours.
- **Static public delivery:** QR menus should load under 2 seconds on 4G through CDN-hosted static HTML and compressed media.
- **Safe publishing:** admin changes should be editable before public regeneration; publish/unpublish actions require clear confirmation.
- **No customer accounts/order flow in v1:** QR menu is read-only.

## 3. Recommended Stack

### 3.1 Application

- **Framework:** Next.js or Remix for the admin app and server routes.
- **Language:** TypeScript.
- **Database:** PostgreSQL.
- **ORM:** Prisma or Drizzle.
- **Object storage:** Arvan Object Storage for item photos, venue logos, generated static pages, and QR export assets if persisted.
- **CDN:** Arvan CDN in front of static public menu assets.
- **Image processing:** Sharp on server-side upload path.
- **Auth:** Session-based auth with secure HTTP-only cookies.
- **Background jobs:** Queue worker for static menu generation, image processing fallback, and domain verification.
- **Cache:** Redis optional for session storage, publish locks, and rate limiting.

### 3.2 Frontend

- **Admin UI:** React components following the design language.
- **Styling:** Tailwind CSS with design tokens or CSS variables.
- **Drag and drop:** `@dnd-kit` for category ordering.
- **QR generation:** client-side QR generation for PNG/PDF download.
- **PDF export:** browser-side PDF generation for print-ready QR sheet.

### 3.3 Public Menu

- Static HTML generated server-side from published venue/menu data.
- Inline critical CSS.
- No client framework bundle.
- Minimal optional JavaScript only for sticky category scroll/highlight if needed.
- Lazy-loaded compressed images.

## 4. User Roles and Permissions

### 4.1 Roles

- **Owner**
  - Full venue access.
  - Manage users, venue settings, billing plan, domains, publish state, categories, and items.
- **Manager**
  - Manage categories, items, appearance, publish/unpublish menu.
  - Cannot manage billing or owner-level user access.
- **Staff**
  - Update item availability and visibility.
  - Cannot delete items, change domain settings, or publish/unpublish unless explicitly granted.

### 4.2 Permission Matrix

| Feature | Owner | Manager | Staff |
| --- | --- | --- | --- |
| View admin menu | Yes | Yes | Yes |
| Create/edit categories | Yes | Yes | No |
| Reorder categories | Yes | Yes | No |
| Delete categories | Yes | Yes | No |
| Create/edit items | Yes | Yes | Limited |
| Delete items | Yes | Yes | No |
| Availability toggle | Yes | Yes | Yes |
| Visibility toggle | Yes | Yes | Yes |
| Bulk visibility | Yes | Yes | Optional |
| Appearance settings | Yes | Yes | No |
| Publish/unpublish | Yes | Yes | No by default |
| QR export | Yes | Yes | Yes |
| Domain settings | Yes | No | No |
| User management | Yes | No | No |

## 5. Database Schema

Use UUID primary keys, `created_at`, `updated_at`, and soft-delete fields where recovery matters. Store money as integer Toman values.

### 5.1 Tables

#### `users`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | User ID |
| `name` | text | Display name |
| `email` | citext unique | Login identifier |
| `password_hash` | text nullable | Null if using passwordless only |
| `email_verified_at` | timestamptz nullable | Email verification |
| `last_login_at` | timestamptz nullable | Audit |
| `status` | enum | `active`, `invited`, `disabled` |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |

#### `venues`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | Venue ID |
| `name_fa` | text | Persian venue name |
| `name_en` | text nullable | Optional English name |
| `slug` | text unique | Used in `menu.yourplatform.ir/{slug}` |
| `plan` | enum | `starter`, `professional`, `enterprise` |
| `timezone` | text | Default `Asia/Tehran` |
| `accent_color` | text nullable | Optional, validated hex |
| `welcome_message` | text nullable | Public menu intro |
| `logo_asset_id` | uuid nullable | FK to assets |
| `public_status` | enum | `draft`, `published`, `unpublished` |
| `published_at` | timestamptz nullable | Last successful publish |
| `unpublished_at` | timestamptz nullable | Last unpublish |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |

#### `venue_members`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | Membership ID |
| `venue_id` | uuid fk | Venue |
| `user_id` | uuid fk | User |
| `role` | enum | `owner`, `manager`, `staff` |
| `permissions` | jsonb | Optional feature overrides |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |

Constraints:

- Unique `(venue_id, user_id)`.
- At least one owner per venue enforced in app logic and migration-safe checks.

#### `categories`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | Category ID |
| `venue_id` | uuid fk | Venue |
| `name_fa` | text | Required Persian name |
| `display_order` | integer | Drag-and-drop order |
| `active` | boolean | Included in public menu only if true |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `deleted_at` | timestamptz nullable | Soft delete |

Indexes:

- `(venue_id, display_order)`
- `(venue_id, active)`

#### `menu_items`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | Item ID |
| `venue_id` | uuid fk | Venue |
| `category_id` | uuid fk | Category |
| `name_fa` | text | Required Persian item name |
| `name_en` | text nullable | Optional supporting label |
| `description` | text nullable | Short menu copy |
| `price_toman` | integer | Required, non-negative |
| `station` | enum | `kitchen`, `bar` |
| `calories` | integer nullable | Optional |
| `photo_asset_id` | uuid nullable | FK to assets |
| `visible_on_public_menu` | boolean | Hidden items omitted from public menu |
| `is_sold_out` | boolean | Sold-out items remain visible if public |
| `display_order` | integer | Optional item ordering inside category |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `deleted_at` | timestamptz nullable | Soft delete |

Indexes:

- `(venue_id, category_id, display_order)`
- `(venue_id, visible_on_public_menu)`
- `(venue_id, station)`
- `(venue_id, is_sold_out)`

#### `assets`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | Asset ID |
| `venue_id` | uuid fk nullable | Null for platform assets |
| `kind` | enum | `item_photo`, `venue_logo`, `static_menu`, `qr_pdf`, `qr_png` |
| `bucket` | text | Arvan bucket |
| `object_key` | text | Storage key |
| `public_url` | text | CDN URL if public |
| `content_type` | text | MIME |
| `byte_size` | integer | Compressed size |
| `width` | integer nullable | Image metadata |
| `height` | integer nullable | Image metadata |
| `checksum` | text nullable | Deduplication/integrity |
| `created_by_user_id` | uuid nullable | Uploader |
| `created_at` | timestamptz |  |

#### `menu_publications`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | Publication ID |
| `venue_id` | uuid fk | Venue |
| `status` | enum | `queued`, `building`, `published`, `failed`, `unpublished` |
| `trigger` | enum | `manual_publish`, `manual_unpublish`, `auto_republish` |
| `snapshot` | jsonb | Immutable published data snapshot |
| `static_asset_id` | uuid nullable | Generated HTML asset |
| `error_message` | text nullable | Failure reason |
| `created_by_user_id` | uuid nullable | Actor |
| `created_at` | timestamptz |  |
| `completed_at` | timestamptz nullable |  |

Purpose:

- Maintains publish history.
- Supports rollback/retry.
- Decouples draft admin data from current published static output.

#### `domains`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | Domain config ID |
| `venue_id` | uuid fk | Venue |
| `type` | enum | `default_slug`, `custom_subdomain`, `custom_domain` |
| `hostname` | text unique | Hostname |
| `status` | enum | `pending`, `active`, `failed`, `disabled` |
| `verification_token` | text nullable | DNS verification |
| `verified_at` | timestamptz nullable |  |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |

Plan rules:

- Starter: default slug only.
- Professional: custom subdomain.
- Enterprise: custom CNAME domain.

#### `audit_logs`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | Log ID |
| `venue_id` | uuid fk nullable | Venue context |
| `actor_user_id` | uuid nullable | User or system |
| `action` | text | Example: `menu.item.updated` |
| `entity_type` | text | Example: `menu_item` |
| `entity_id` | uuid nullable | Changed entity |
| `metadata` | jsonb | Redacted change metadata |
| `created_at` | timestamptz |  |

#### `sessions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | Session ID |
| `user_id` | uuid fk | User |
| `token_hash` | text unique | Store hash only |
| `expires_at` | timestamptz |  |
| `created_at` | timestamptz |  |
| `revoked_at` | timestamptz nullable | Logout/security |

### 5.2 Enum Values

```txt
user_status: active, invited, disabled
venue_plan: starter, professional, enterprise
venue_public_status: draft, published, unpublished
venue_role: owner, manager, staff
station: kitchen, bar
asset_kind: item_photo, venue_logo, static_menu, qr_pdf, qr_png
publication_status: queued, building, published, failed, unpublished
publication_trigger: manual_publish, manual_unpublish, auto_republish
domain_type: default_slug, custom_subdomain, custom_domain
domain_status: pending, active, failed, disabled
```

## 6. Authentication and Authorization

### 6.1 Auth Flows

- Email/password login for v1.
- Owner creates or invites staff by email.
- Invited user receives a secure invite link with expiry.
- Password reset via signed token.
- Sessions use secure HTTP-only cookies with SameSite protection.

### 6.2 Security Requirements

- Hash passwords with Argon2id or bcrypt with strong cost.
- Store only token hashes for sessions, invites, and password resets.
- Rate limit login, invite, and password reset endpoints.
- Require CSRF protection for cookie-authenticated mutations.
- Validate venue access on every admin route.
- Scope all queries by `venue_id`.
- Log destructive and publish actions in `audit_logs`.

### 6.3 Multi-Venue Behavior

- A user may belong to multiple venues.
- Admin shell includes a venue switcher if user has multiple memberships.
- All route params and API calls must verify membership and role.

## 7. Admin Information Architecture

### 7.1 Routes

| Route | Purpose |
| --- | --- |
| `/login` | User login |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset completion |
| `/venues` | Venue picker for multi-venue users |
| `/admin/:venueId/menu` | Main menu management workbench |
| `/admin/:venueId/menu/categories` | Category management focused view if needed |
| `/admin/:venueId/menu/items/:itemId` | Item edit drawer/page |
| `/admin/:venueId/qr-menu` | Appearance, preview, publish, QR export |
| `/admin/:venueId/settings` | Venue settings |
| `/admin/:venueId/settings/users` | Member management |
| `/admin/:venueId/settings/domain` | Subdomain/custom domain settings |

### 7.2 Admin Layout

- RTL by default.
- Compact top header with venue name, publish state, and current user.
- Primary content in paper-like panels with borders.
- Two-zone menu page:
  - Left or right category sidebar depending on final RTL composition.
  - Main item list and filters.
- QR editor:
  - Settings form and publish controls.
  - Mobile public preview pane.
  - QR export panel.

## 8. Menu Management

### 8.1 Categories

Features:

- Add category with Persian name.
- Edit category name.
- Delete category with confirmation.
- Active toggle.
- Drag-and-drop reorder.
- Display item count.

Rules:

- Inactive categories are hidden from public menus.
- Items inside inactive categories remain available in admin.
- Deleting a category should require either:
  - moving items to another category, or
  - blocking delete until empty.
- Reorder should be persisted atomically.

### 8.2 Menu Items

Fields:

- Persian name.
- Optional English name.
- Category.
- Price in Toman.
- Station: `kitchen` or `bar`.
- Photo upload.
- Description.
- Optional calories.
- Visible on public QR menu toggle.
- Availability/sold-out toggle.

Features:

- Add, edit, delete.
- Search by Persian/English name.
- Filter by category, station, visibility, and sold-out status.
- Bulk visibility by station or selected items.
- Inline toggles for visibility and availability.
- Photo replacement and removal.

Rules:

- Hidden items are omitted from generated public menu.
- Sold-out public items remain visible with `ناموجود` badge and subdued styling.
- Price must be integer Toman and displayed with local formatting.
- Description should have a practical max length to preserve public layout.
- Calories must be positive if present.

### 8.3 Bulk Visibility

Use cases:

- Hide all bar items during off-hours.
- Re-show all bar items.
- Hide selected seasonal items.

Implementation:

- Show confirmation modal with affected item count.
- Record previous states in audit metadata.
- Apply in one transaction.
- Do not change sold-out state.

## 9. Uploads and Media Pipeline

### 9.1 Item Photos

Upload flow:

1. Admin selects image.
2. Server validates MIME type and size.
3. Server strips metadata.
4. Server resizes to public-menu target dimensions.
5. Server compresses to WebP/JPEG under 200KB.
6. Server uploads to Arvan Object Storage.
7. Server stores asset metadata.
8. Item record points to `photo_asset_id`.

Constraints:

- Target size under 200KB.
- Reject unsupported formats.
- Prefer WebP for modern clients and JPEG fallback only if needed.
- Store dimensions for stable layout and CLS prevention.

### 9.2 Venue Logo

- Same validation pipeline.
- Smaller target dimensions.
- Used in generated public menu header.
- If absent, show a typographic venue mark instead of a placeholder image.

### 9.3 Storage Layout

```txt
venues/{venueId}/photos/items/{assetId}.webp
venues/{venueId}/logos/{assetId}.webp
venues/{venueId}/public/menu/index.html
venues/{venueId}/public/menu/assets/{assetId}.webp
venues/{venueId}/qr/{publicationId}.png
venues/{venueId}/qr/{publicationId}.pdf
```

## 10. QR Menu Editor

### 10.1 Appearance Settings

Fields:

- Venue logo upload.
- Accent color.
- Welcome message.
- Venue display name.

Rules:

- Accent color is optional and used sparingly.
- Paper/ink remains the default visual identity.
- Welcome message should be short and calm.
- Preview updates from draft state.

### 10.2 Publish / Unpublish

Publish flow:

1. User clicks `انتشار منو`.
2. Confirmation modal summarizes public impact.
3. Server creates `menu_publications` row with immutable snapshot.
4. Worker generates static HTML from snapshot.
5. Worker uploads HTML/assets to Arvan Object Storage.
6. CDN path is invalidated or versioned.
7. Venue `public_status` becomes `published`.
8. Admin receives success state with public URL.

Unpublish flow:

1. User clicks `لغو انتشار`.
2. Confirmation modal warns that QR visitors will see unavailable page.
3. Server generates or activates static unavailable page.
4. Venue `public_status` becomes `unpublished`.

Failure behavior:

- Keep previous published page active if a publish job fails.
- Mark publication as `failed`.
- Show retry action and clear error.

### 10.3 Draft vs Published State

- Admin always edits live database draft records.
- Public menu uses latest successful publication snapshot.
- A visible `تغییرات منتشرنشده` state appears when draft data differs from last publication.
- Publish action rebuilds from current draft.

### 10.4 QR Code

Features:

- Generate client-side from public menu URL.
- Download PNG.
- Download print-ready PDF with venue name and URL.
- Use ink-on-paper style matching design language.

Rules:

- QR URL uses default slug unless custom domain is active.
- Unpublished menus can still export QR, but admin should warn that visitors see unavailable state.

## 11. Public QR Menu

### 11.1 Static Page Requirements

- Mobile-first responsive layout.
- RTL Persian layout.
- Parastoo font with safe fallback.
- Venue header with logo/name/welcome.
- Sticky horizontal category tab strip.
- Item cards with:
  - photo if present,
  - name,
  - description,
  - price in Toman,
  - calorie badge if set,
  - sold-out badge if needed.
- Footer: `Powered by mofé`.
- No ordering, cart, customer account, or API calls.

### 11.2 Render Rules

Include category if:

- category is active,
- category is not deleted,
- category has at least one public visible item.

Include item if:

- item is not deleted,
- item `visible_on_public_menu` is true,
- item category is active.

Sold-out behavior:

- Keep item visible.
- Add `ناموجود`.
- Apply subdued card style without harming readability.

Unavailable menu:

- If venue is unpublished, show a static page with:
  - venue name,
  - clear Persian message: `منو در حال حاضر در دسترس نیست.`,
  - optional `Powered by mofé`.

### 11.3 Performance Budget

- HTML under 80KB where possible.
- CSS inline and minimal.
- No framework runtime.
- Lazy-load images.
- Photos under 200KB.
- Avoid custom scripts unless needed.
- Target first meaningful content under 2 seconds on 4G.

### 11.4 Accessibility

- Semantic HTML sections and headings.
- High contrast ink on paper.
- Large tap targets for category tabs.
- Correct `dir="rtl"` and `lang="fa"`.
- Image alt text from item or venue names.
- Category navigation usable without JavaScript.

## 12. API Design

Use REST or typed RPC. All mutation endpoints require authentication, venue authorization, CSRF protection, and validation.

### 12.1 Auth

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/logout` | Logout |
| `POST` | `/api/auth/password-reset/request` | Request reset |
| `POST` | `/api/auth/password-reset/confirm` | Confirm reset |
| `GET` | `/api/me` | Current user and memberships |

### 12.2 Venues

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/venues` | List accessible venues |
| `GET` | `/api/venues/:venueId` | Get venue |
| `PATCH` | `/api/venues/:venueId` | Update venue appearance/settings |

### 12.3 Categories

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/venues/:venueId/categories` | List categories |
| `POST` | `/api/venues/:venueId/categories` | Create category |
| `PATCH` | `/api/venues/:venueId/categories/:categoryId` | Update category |
| `DELETE` | `/api/venues/:venueId/categories/:categoryId` | Delete category |
| `POST` | `/api/venues/:venueId/categories/reorder` | Persist order |

### 12.4 Items

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/venues/:venueId/items` | Search/filter items |
| `POST` | `/api/venues/:venueId/items` | Create item |
| `GET` | `/api/venues/:venueId/items/:itemId` | Get item |
| `PATCH` | `/api/venues/:venueId/items/:itemId` | Update item |
| `DELETE` | `/api/venues/:venueId/items/:itemId` | Delete item |
| `POST` | `/api/venues/:venueId/items/bulk-visibility` | Bulk visibility update |
| `POST` | `/api/venues/:venueId/items/:itemId/photo` | Upload item photo |
| `DELETE` | `/api/venues/:venueId/items/:itemId/photo` | Remove item photo |

### 12.5 Publishing and QR

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/venues/:venueId/public-preview` | Draft preview payload |
| `POST` | `/api/venues/:venueId/publish` | Publish static menu |
| `POST` | `/api/venues/:venueId/unpublish` | Unpublish static menu |
| `GET` | `/api/venues/:venueId/publications` | Publication history |
| `POST` | `/api/venues/:venueId/publications/:publicationId/retry` | Retry failed publish |

### 12.6 Domains

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/venues/:venueId/domain` | Domain config |
| `POST` | `/api/venues/:venueId/domain` | Add subdomain/domain |
| `POST` | `/api/venues/:venueId/domain/verify` | Verify DNS |
| `DELETE` | `/api/venues/:venueId/domain/:domainId` | Disable domain |

## 13. Validation Rules

### 13.1 Venue

- `name_fa`: required, max 120 chars.
- `slug`: lowercase Latin letters, numbers, hyphen, unique.
- `welcome_message`: max 220 chars.
- `accent_color`: valid hex color or null.

### 13.2 Category

- `name_fa`: required, max 80 chars.
- `display_order`: non-negative integer.
- `active`: boolean.

### 13.3 Item

- `name_fa`: required, max 120 chars.
- `name_en`: optional, max 120 chars.
- `description`: optional, max 300 chars.
- `price_toman`: required integer, min 0.
- `station`: `kitchen` or `bar`.
- `calories`: optional integer, min 1, max practical value such as 5000.
- `visible_on_public_menu`: boolean.
- `is_sold_out`: boolean.

## 14. UI Component Plan

Build a small reusable component library aligned to `DESIGN-LANGUAGE.md`.

### 14.1 Core Components

- `Button`: primary, secondary, tertiary, destructive.
- `Input`: label above field, error text, helper text.
- `Textarea`: for welcome and description.
- `Toggle`: active/visible/sold-out states.
- `Badge`: station, calories, public/hidden, sold-out.
- `Panel`: bordered paper section with title/subtitle.
- `TableRow`: menu item rows with compact action area.
- `Modal`: confirmation and destructive actions.
- `EmptyState`: calm copy and one primary action.
- `StickyTabs`: category tabs for preview/public page.
- `PhotoUploader`: image upload, preview, remove.
- `QRCodeExport`: PNG/PDF actions.

### 14.2 Visual Tokens

```css
--paper: #f5f0e6;
--ink: #111111;
--ink-strong: #000000;
--ink-muted: #5f5a52;
--line: #d8d1c4;
--surface: rgba(255, 255, 255, 0.28);
--radius-panel: 28px;
--radius-card: 24px;
--radius-control: 16px;
```

### 14.3 Admin Interaction Patterns

- Use bordered panels over shadows.
- Keep destructive actions explicit but not visually loud.
- Use Persian labels first; English metadata only when helpful.
- Keep icons secondary to text labels for critical actions.
- Use modal confirmations for delete, publish, unpublish, and bulk actions.

## 15. Static Menu Generation

### 15.1 Snapshot Shape

Each publication stores a denormalized snapshot:

```json
{
  "venue": {
    "id": "uuid",
    "nameFa": "کافه ناهال",
    "welcomeMessage": "به منوی ما خوش آمدید.",
    "logoUrl": "https://cdn...",
    "accentColor": "#111111",
    "publicUrl": "https://menu.yourplatform.ir/nahal-cafe"
  },
  "categories": [
    {
      "id": "uuid",
      "nameFa": "قهوه",
      "items": [
        {
          "id": "uuid",
          "nameFa": "لاته",
          "nameEn": "Latte",
          "description": "اسپرسو با شیر بخار داده شده و کف لطیف.",
          "priceToman": 145000,
          "station": "bar",
          "calories": 140,
          "soldOut": false,
          "photoUrl": "https://cdn...",
          "photoWidth": 800,
          "photoHeight": 600
        }
      ]
    }
  ],
  "generatedAt": "ISO-8601"
}
```

### 15.2 Generator Responsibilities

- Escape all user-generated content.
- Format Toman prices for Persian display.
- Generate stable category anchors.
- Inline critical CSS.
- Reference optimized image URLs.
- Output `index.html`.
- Output unavailable page when unpublished.

### 15.3 CDN Strategy

Options:

- **Stable path plus invalidation:** upload to `/{slug}/index.html` and purge CDN.
- **Versioned path plus pointer:** upload versioned file and update routing/pointer.

Recommended v1:

- Use stable path for simple QR URLs.
- Add CDN invalidation after upload.
- Keep previous successful HTML until new publish succeeds.

## 16. Custom URL Strategy

### 16.1 Default URL

```txt
https://menu.yourplatform.ir/{slug}
```

### 16.2 Professional Custom Subdomain

Example:

```txt
https://nahal.menu.yourplatform.ir
```

Rules:

- Validate subdomain availability.
- Reserve platform words.
- Activate after internal DNS/routing setup.

### 16.3 Enterprise Custom Domain

Example:

```txt
https://menu.nahalcafe.ir
```

Rules:

- Generate DNS verification token.
- Ask customer to set CNAME.
- Verify DNS periodically and on demand.
- Configure CDN host and TLS.
- Show clear pending/active/failed states.

## 17. Observability and Operations

### 17.1 Logging

- Auth events.
- Failed login attempts.
- Item/category mutations.
- Publish/unpublish attempts and results.
- Upload failures.
- Domain verification failures.

### 17.2 Metrics

- Publish job duration.
- Publish success/failure count.
- Image compression duration and output size.
- API latency.
- Public menu generated file size.
- CDN invalidation duration.

### 17.3 Alerts

- Repeated publish failures.
- Object storage upload failures.
- CDN invalidation failures.
- Auth abuse/rate-limit spikes.

## 18. Testing Plan

### 18.1 Unit Tests

- Validation schemas.
- Permission checks.
- Price formatting.
- Public snapshot builder.
- Static HTML escaping.
- Slug generation.
- Category/item filtering rules.

### 18.2 Integration Tests

- Login/session lifecycle.
- Venue membership authorization.
- Category CRUD and reorder transaction.
- Item CRUD and bulk visibility.
- Image upload metadata persistence.
- Publish job creates snapshot and updates venue state.
- Failed publish preserves previous public menu.

### 18.3 End-to-End Tests

- Owner logs in and creates menu.
- Manager reorders categories and publishes.
- Staff marks item sold out.
- Customer opens static public menu and sees sold-out badge.
- Unpublished venue shows unavailable page.
- QR PNG/PDF download works.

### 18.4 Accessibility and Performance

- Keyboard navigation in admin.
- Focus states on forms/modals.
- RTL rendering checks.
- Public page Lighthouse performance target.
- Public page no API request assertion.

## 19. Deployment Plan

### 19.1 Environments

- **Local:** app, database, storage emulator or dev bucket.
- **Staging:** real Arvan integration with staging bucket/CDN.
- **Production:** production database, buckets, CDN, domain routing.

### 19.2 CI/CD

Pipeline steps:

1. Install dependencies.
2. Typecheck.
3. Lint.
4. Run unit tests.
5. Run integration tests.
6. Build admin app.
7. Run database migrations in controlled deploy step.
8. Deploy app and worker.

### 19.3 Secrets

Required secrets:

- Database URL.
- Session secret.
- Object storage access key/secret.
- Arvan CDN/API credentials.
- Email provider credentials.
- Redis URL if used.

## 20. Implementation Milestones

### Milestone 1 — Foundation

- Set up app framework, TypeScript, styling, linting, testing.
- Create design tokens and base components.
- Configure PostgreSQL and ORM.
- Add initial migrations for users, venues, memberships, categories, items, assets.
- Add seed data matching the concept menu.

Acceptance:

- Admin shell renders RTL paper/ink UI.
- Database migrations run cleanly.
- Seed venue appears in local development.

### Milestone 2 — Authentication and Venue Access

- Implement login/logout.
- Implement sessions and password hashing.
- Implement venue membership checks.
- Add venue switcher.
- Add owner/manager/staff permission helpers.

Acceptance:

- Users can log in and access only their venues.
- Unauthorized venue access is blocked.
- Role-restricted actions are enforced server-side.

### Milestone 3 — Category Management

- Build category list UI.
- Add create/edit/delete flows.
- Add active toggle.
- Add drag-and-drop reorder.
- Add API endpoints and audit logs.

Acceptance:

- Category order persists.
- Inactive category state is visible in admin.
- Delete flow prevents accidental item orphaning.

### Milestone 4 — Item Management

- Build item table/list with filters.
- Add item create/edit form.
- Add visibility and sold-out toggles.
- Add station and category filtering.
- Add bulk visibility flow.
- Add audit logs for key changes.

Acceptance:

- Staff can quickly mark items unavailable.
- Hidden and sold-out states are clearly distinct.
- Bulk actions show affected count and complete transactionally.

### Milestone 5 — Media Uploads

- Implement photo and logo upload endpoints.
- Add server-side compression under 200KB.
- Upload to Arvan Object Storage.
- Store asset metadata.
- Add photo uploader UI.

Acceptance:

- Uploaded item photos display in admin preview.
- Public-ready image URLs are available.
- Oversized/invalid uploads fail with clear Persian errors.

### Milestone 6 — QR Menu Editor

- Build appearance form.
- Build live draft preview in mobile frame.
- Add publish/unpublish controls.
- Add publication history status.
- Add unpublished changes indicator.

Acceptance:

- Admin can see draft preview before publishing.
- Publish/unpublish requires confirmation.
- Failed publish is visible and retryable.

### Milestone 7 — Static Public Menu

- Build snapshot generator.
- Build static HTML renderer.
- Build unavailable page renderer.
- Upload generated HTML to storage.
- Configure CDN path and invalidation.
- Ensure public page has no API calls.

Acceptance:

- Published menu loads from CDN/static storage.
- Sold-out items remain visible with `ناموجود`.
- Hidden items and inactive categories are omitted.
- Public page meets mobile RTL and performance targets.

### Milestone 8 — QR Export

- Generate QR from selected public URL.
- Add PNG download.
- Add print-ready PDF download with venue name.
- Warn if menu is unpublished.

Acceptance:

- QR points to the correct active URL.
- PNG and PDF downloads work in browser.
- PDF follows paper/ink style.

### Milestone 9 — Domains and Plans

- Add default slug routing.
- Add professional custom subdomain flow.
- Add enterprise custom CNAME verification flow.
- Enforce plan limits.

Acceptance:

- Starter venues use default slug.
- Professional venues can activate custom subdomain.
- Enterprise venues see clear DNS verification status.

### Milestone 10 — Hardening and Launch

- Complete test coverage.
- Add observability and alerts.
- Run accessibility and performance audits.
- Review Persian copy.
- Prepare staging-to-production checklist.

Acceptance:

- Critical flows pass E2E tests.
- Public menu loads under target budget.
- Publish failures do not break existing public menus.

## 21. Launch Checklist

- Production database migrated.
- Production object storage bucket created.
- CDN configured for default menu domain.
- TLS configured.
- Email delivery tested.
- Session cookie settings verified.
- Rate limits enabled.
- Backups configured.
- Publish/unpublish tested on production-like venue.
- QR scan tested on iOS and Android.
- RTL visual review completed.
- Public menu verified to make no API calls.

## 22. Development Progress

### ✅ Milestone 1 — Foundation (Completed)
- Next.js 16 with App Router, TypeScript, Tailwind CSS v4
- Design tokens (CSS variables for paper/ink/line/surface)
- Prisma ORM with SQLite (migratable to PostgreSQL)
- Complete database schema with all 10 tables
- Seed data with venue "کافه ناهال", admin user, categories, and 9 menu items
- Base UI components: Button, Input, Toggle, Badge, Panel, Modal

### ✅ Milestone 2 — Authentication and Venue Access (Completed)
- Email/password login with bcrypt password hashing
- Session-based auth with HTTP-only cookies (SHA-256 token hashes)
- Session management (create/verify/destroy)
- Middleware for protected routes
- Login page with Persian UI
- `/api/auth/login`, `/api/auth/logout`, `/api/me` endpoints
- Venue membership verification with role-based access helpers
- Venue picker page for multi-venue users
- Admin layout with venue context, navigation, and user info

### ✅ Milestone 3 — Category Management (Completed)
- Category list in admin sidebar with active toggle
- Create/edit/delete API endpoints
- Soft delete with item count validation
- Reorder endpoint with atomic transaction
- Category filter in menu view
- Active/inactive state management

### ✅ Milestone 4 — Item Management (Completed)
- Item list with category and station filters
- Inline visibility toggle
- Sold-out toggle (visible with badge)
- Search by Persian/English name
- Station filter (kitchen/bar)
- Full CRUD API endpoints
- Bulk visibility endpoint

### ⏳ Milestone 5 — Media Uploads (Not started)
- Photo upload endpoint and UI pending (requires Arvan Object Storage or local fallback)

### ✅ Milestone 6 — QR Menu Editor (Completed)
- Appearance settings form (name, welcome message, accent color)
- Live mobile preview pane
- Publish/unpublish with confirmation modals
- Publication history tracking
- Unpublished changes indicator (venue + categories + items)
- QR code export buttons (PNG/PDF via external service)

### ✅ Milestone 7 — Static Public Menu (Completed)
- Static HTML renderer generates complete mobile-first RTL page with inline CSS, Persian formatting, Parastoo/EB Garamond fonts
- Unavailable page renderer for unpublished venues
- Public route `/m/[slug]` serves live HTML from publication snapshot
- Sold-out items shown with `ناموجود` badge and subdued opacity
- Hidden items and inactive categories omitted
- No API calls — pure HTML response (10KB for demo venue)
- CDN/storage upload is a future addition (HTML is currently rendered from DB snapshot)

### ✅ Milestone 8 — QR Export (Completed)
- Client-side QR generation using `qrcode` library (no external API dependency)
- PNG download: canvas-rendered QR card with ink-on-paper styling (paper background, border, venue name, URL, "Powered by mofé" footer)
- PDF download: print-ready page with paper/ink QR card, auto-triggers browser print dialog for "Save as PDF"
- Warning banner when menu is unpublished
- QR code uses design system colors (ink #111111 on paper #f5f0e6)

### ⏳ Milestone 9 — Domains and Plans (Not started)

### ⏳ Milestone 10 — Hardening and Launch (Not started)

### Implementation Notes
- **Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Prisma v7, SQLite
- **Auth:** Session-based with HTTP-only cookies, SHA-256 token hashing, bcrypt password hashing
- **Database adapter:** `prisma-adapter-sqlite` (Node.js built-in `node:sqlite`)
- **Design:** Paper/ink system with Persian-first RTL layout, Parastoo/EB Garamond typography
- **API:** 15+ REST endpoints for auth, venues, categories, items, publishing
- **QR:** Client-side QR generation via `qrcode` library with ink-on-paper styled PNG/PDF export
- **Deployment:** `npm run build` succeeds with 21 routes
- **Public menu:** `/m/[slug]` serves static HTML from DB snapshot (CDN upload pending)

## 23. Future Enhancements

- Scheduled visibility by station.
- Multiple menus per venue.
- Menu item variants/sizes.
- Allergen badges.
- Simple analytics for QR views.
- CSV import/export.
- AI-assisted Persian menu copy editing.
- Table-specific QR codes.
- Ordering/cart flow after v1, if product direction changes.
