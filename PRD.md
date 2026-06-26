# mofé — Product Requirements Document (v1 Implementation)

Persian-first cafe menu management: admin panel + static QR menus.

## Built Features

### Auth & Venues
- Email/password login with bcrypt hashing (12 rounds)
- Session-based auth via HTTP-only cookie (`mofe_session`, SHA-256 token hash, 7-day TTL)
- Password reset flow (request + confirm endpoints, UI, invalidates all sessions)
- Multi-venue support with membership and 3 roles: owner, manager, staff
- Role-based access enforcement on all API routes
- Rate-limited login (5 attempts/minute, in-memory)
- Venue picker page, admin layout with header + navigation

### Internal Admin Tool
- Internal user role (`User.role`: `"user"` / `"internal"`) for mofé team
- `/internal` dashboard, user management (list/create), venue management (list/create)
- Seed: `admin@mofe.ir` / `admin1234`

### Menu Management
- **Categories:** add, edit, soft-delete (prevented if items exist), active toggle, drag-and-drop reorder
- **Items:** add, edit, soft-delete; fields: nameFa, nameEn, description, priceToman, station (kitchen/bar), calories, visibleOnPublicMenu, isSoldOut
- **Filters:** search by name, filter by category/station/visibility/sold-out
- **Inline toggles:** visibility and sold-out
- **Bulk visibility:** toggle `visibleOnPublicMenu` by selected IDs or station filter
- **Drag-and-drop** reorder for categories (sidebar) and items (within category) via @dnd-kit
- **Item variants/sizes:** add/remove/edit name + price modifier per item; rendered as pills in public menu
- **Allergen badges:** 14 allergen codes with Persian labels; toggle-chip UI; rendered in public menu
- **Station schedules:** day-of-week + time ranges via schedule editor in settings; bulk-replace API

### QR Menu Editor
- Appearance settings: venue name, welcome message, accent color
- Menu photo display toggle (`menuPhotoMode`): when enabled, snapshot captures `photoUrl` and renderer uses photo card layout
- Live mobile preview (fetches draft data)
- Publish/unpublish with confirmation modals
- Publication history table
- Unpublished changes indicator (compares max updatedAt across venue + categories + items)
- QR code export: PNG download (ink-on-paper canvas) and PDF (print dialog)

### Static Public Menu
- Route: `GET /m/{slug}`
- Serves from latest `published` publication snapshot
- Static HTML: RTL, mobile-first, inline CSS, self-hosted fonts
- Sold-out items visible with "ناموجود" badge and subdued opacity
- Hidden items and inactive categories omitted
- Unpublished venues show unavailable page ("منو در حال حاضر در دسترس نیست.")
- No client JS or API calls — pure static HTML response (~10KB)

### API Endpoints
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me`
- `POST /api/auth/password-reset/request`, `POST /api/auth/password-reset/confirm`
- `GET /api/venues`, `GET|PATCH /api/venues/[venueId]`
- `GET|POST /api/venues/[venueId]/categories`, `PATCH|DELETE /api/venues/[venueId]/categories/[id]`, `POST .../categories/reorder`
- `GET|POST /api/venues/[venueId]/items`, `GET|PATCH|DELETE /api/venues/[venueId]/items/[id]`, `POST .../items/reorder`, `POST .../items/bulk-visibility`, `POST .../items/import-csv`, `GET .../items/export-csv`
- `POST|DELETE /api/venues/[venueId]/items/[id]/photo`
- `GET|POST /api/venues/[venueId]/items/[id]/variants`
- `GET|POST /api/venues/[venueId]/items/[id]/allergens`
- `GET|POST /api/venues/[venueId]/members`, `PATCH|DELETE /api/venues/[venueId]/members/[memberId]`
- `POST|DELETE /api/venues/[venueId]/logo`
- `GET /api/venues/[venueId]/public-preview`
- `POST /api/venues/[venueId]/publish`, `POST .../unpublish`
- `GET /api/venues/[venueId]/publications`
- `GET|POST /api/venues/[venueId]/schedules`
- `GET|POST /api/internal/users`, `GET|POST /api/internal/venues`

### Data Model
14 models: User, Venue, VenueMember, Category, MenuItem, Asset, MenuPublication, Domain, AuditLog, Session, PasswordResetToken, StationSchedule, MenuItemVariant, MenuItemAllergen
- SQLite (dev), Prisma ORM v7
- UUID primary keys, soft-delete, money as integer Toman
- Generated client at `src/generated/prisma`

### Member Management
- Team members added via `username@venue.slug` email scheme
- Roles: owner, manager, staff
- Password management, role changes, member removal

### Photo Upload
- Item photos: sharp-based image processing, auto-resize to 500px, WebP compression (≤50KB)
- Venue logo: same pattern, upload and delete via API

### CSV Import
- Bulk item import from CSV with smart header detection
- Auto-creates categories from data rows
- Batch creation with validation and detailed import report
- Template available in `sample-csv.csv` (66 sample items)

### Audit Log
- `AuditLog` model wired into all mutation handlers (categories CUD, items CUD, publish/unpublish, member management)
- Records actor, action, entity type/id, and metadata

### Deployment
- Docker multi-stage build (standalone Next.js output)
- nginx reverse-proxy config with 3 virtual hosts
- Docker Compose for app + nginx services

### Design Language
- Paper (#f5f0e6) on ink (#111111), minimal borders, no shadows
- Persian-first: RTL layout, Parastoo font (body), EB Garamond (headings), Vazirmatn fallback
- All fonts self-hosted — zero external CDN calls
- Tailwind CSS v4 with custom theme tokens

### Testing
- Vitest v4, 130 tests: 48 renderer, 46 integration, 12 api-helpers, 8 auth, 8 config, 8 rate-limit
- Real SQLite test DB (`test.db`), created fresh per run via `global-setup.ts`

## Future (Not Yet Built)

- Custom domains (subdomain and CNAME flows)
- CDN upload of static menu HTML
- Analytics for QR menu views
- PostgreSQL migration
- `POST /api/venues/[venueId]/publications/[id]/retry` endpoint
