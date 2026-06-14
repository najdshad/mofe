#### Menu Management

**Categories**
- Add, edit, delete, reorder categories via drag-and-drop
- Each category: name (Persian), display order, active toggle

**Items**
- Add, edit, delete menu items
- Fields per item: name, category, price (Toman), station (`kitchen` | `bar`), photo upload, description, calories (optional), visible on public QR menu (toggle)
- Photo upload: compressed server-side to under 200KB, stored on Arvan Object Storage
- Bulk visibility toggle (e.g., hide all bar items during off-hours)
- Item availability toggle (mark as sold out without deleting)

#### Online QR Menu

- **Menu Editor:** preview of the live public menu with all published items
- **Appearance:** upload venue logo, set accent color, write a short welcome message
- **Publish / Unpublish:** toggle with confirmation; unpublished venues show a "menu not available" page
- **QR Code:** generated client-side from the menu URL; downloadable as PNG or PDF (print-ready, with venue name)
- **URL:** default `menu.yourplatform.ir/{slug}`; custom subdomain on Professional plan; custom domain (CNAME) on Enterprise plan

### 6.6 Online QR Menu — Static CDN Page

**Not a client app.** A pre-generated static HTML page served via Arvan CDN. Regenerated on every menu publish action. Customer's phone never hits the API.

#### Features
- Mobile-first responsive layout (customers always on phone)
- RTL Persian layout; Parastoo font
- Venue header: logo, name, welcome message
- Category navigation: sticky horizontal tab strip
- Item cards: photo (lazy-loaded), name, description, price in Toman, calorie badge (if set)
- Items marked as sold-out show a "ناموجود" badge and are grayed out but still visible
- No ordering, no cart, no customer accounts — read only in v1
- "Powered by [mofé]" footer
- Page load target: under 2 seconds on a 4G connection


