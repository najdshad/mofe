import { ALLERGEN_LABELS } from "@/lib/allergens";
import { formatPrice } from "@/lib/format";

export interface SnapshotItemPrice {
  description: string;
  priceToman: number;
}

export interface SnapshotItemVariant {
  nameFa: string;
  nameEn: string | null;
  priceModifier: number;
}

export interface SnapshotCategoryItem {
  id: string;
  nameFa: string;
  nameEn: string | null;
  description: string | null;
  priceToman: number;
  calories: number | null;
  soldOut: boolean;
  variants?: SnapshotItemVariant[];
  prices?: SnapshotItemPrice[];
  allergenCodes?: string[];
  photoUrl?: string | null;
}

export interface SnapshotCategory {
  id: string;
  nameFa: string;
  items: SnapshotCategoryItem[];
}

export interface Snapshot {
  venue: {
    id: string;
    nameFa: string;
    nameEn: string | null;
    welcomeMessage: string | null;
    accentColor: string | null;
    logoUrl: string | null;
    slug: string;
  };
  categories: SnapshotCategory[];
  generatedAt: string;
}

export const FONT_FACE_DECLARATIONS = `    @font-face {
      font-family: "Parastoo";
      src: url("/fonts/Parastoo.woff2") format("woff2");
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "Parastoo";
      src: url("/fonts/Parastoo-Bold.woff2") format("woff2");
      font-weight: bold;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "Vazirmatn";
      src: url("/fonts/Vazirmatn-VariableFont_wght.ttf") format("truetype-variations");
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "EB Garamond";
      src: url("/fonts/EBGaramond-VariableFont_wght.ttf") format("truetype-variations");
      font-weight: 400 800;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "EB Garamond";
      src: url("/fonts/EBGaramond-Italic-VariableFont_wght.ttf") format("truetype-variations");
      font-weight: 400 800;
      font-style: italic;
      font-display: swap;
    }`;

function esc(s: string): string {
  return s
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/`/g, "&#96;");
}

function sanitizeCssColor(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) return color;
  return "#111111";
}



export { formatPrice } from "@/lib/format";

function resolveUrl(url: string, baseUrl?: string): string {
  if (baseUrl && url.startsWith("/")) {
    return `${baseUrl}${url}`;
  }
  return url;
}

function renderItemDetails(item: SnapshotCategoryItem): string {
  const variants = item.variants ?? [];
  const allergenCodes = item.allergenCodes ?? [];
  const itemPrices = item.prices ?? [];

  return `
            <div class="item-header">
              <div class="item-price-wrap">
                <div class="item-price">${formatPrice(item.priceToman)}</div>
                <div class="item-price-unit">تومان</div>
              </div>
              <div class="item-info">
                <h3 class="item-name">${esc(item.nameFa)}</h3>
                ${item.nameEn ? `<p class="item-name-en">${esc(item.nameEn)}</p>` : ""}
                ${item.description ? `<p class="item-desc">${esc(item.description)}</p>` : ""}
                ${allergenCodes.length > 0 ? `
                <div class="allergen-badges">
                  ${allergenCodes.map((code) => `<span class="badge badge-allergen">${ALLERGEN_LABELS[code] || esc(code)}</span>`).join("")}
                </div>` : ""}
                ${variants.length > 0 ? `
                <div class="item-variants">
                  ${variants.map((v) => `
                    <span class="variant-pill">
                      ${esc(v.nameFa)}${v.nameEn ? ` (${esc(v.nameEn)})` : ""}
                      ${v.priceModifier !== 0 ? `<span class="variant-price">${v.priceModifier > 0 ? "+" : ""}${formatPrice(v.priceModifier)}</span>` : ""}
                    </span>`).join("")}
                </div>` : ""}
                ${itemPrices.length > 0 ? `
                <div class="item-prices">
                  ${itemPrices.map((p) => `
                    <span class="price-bubble">
                      <span class="price-bubble-amount">${formatPrice(p.priceToman)}</span>
                      <span class="price-bubble-unit">تومان</span>
                      ${p.description ? `<span class="price-bubble-desc">${esc(p.description)}</span>` : ""}
                    </span>`).join("")}
                </div>` : ""}
                <div class="item-meta">
                  ${item.soldOut ? '<span class="badge badge-status">ناموجود</span>' : ""}
                  ${item.calories ? `<span class="badge badge-emphasis">${item.calories} kcal</span>` : ""}
                </div>
              </div>
            </div>`;
}

function renderItemCard(item: SnapshotCategoryItem, baseUrl?: string): string {
  const photoUrl = item.photoUrl ?? null;
  const className = `item-card${item.soldOut ? " sold-out" : ""}${photoUrl ? " photo-mode" : ""}`;

  return `
          <article class="${className}">
            ${photoUrl ? `
            <div class="item-photo-wrap">
              <img class="item-photo" src="${esc(resolveUrl(photoUrl, baseUrl))}" alt="${esc(item.nameFa)}" loading="lazy" decoding="async" />
              ${item.soldOut ? '<div class="item-photo-overlay">ناموجود</div>' : ""}
            </div>` : ""}
            <div class="item-body">
              ${renderItemDetails(item)}
            </div>
          </article>`;
}

export function renderPublicMenu(snapshot: Snapshot, baseUrl?: string): string {
  const { venue, categories } = snapshot;
  const categoriesWithItems = categories.filter((cat) => cat.items.length > 0);
  const accentValue = venue.accentColor ? sanitizeCssColor(venue.accentColor) : "#b94f2c";

  const categoryNav =
    categoriesWithItems.length > 0
      ? `
      <nav class="category-nav" aria-label="دسته‌بندی‌ها">
        ${categoriesWithItems
          .map(
            (cat, index) => `
          <a
            class="category-pill${index === 0 ? " active" : ""}"
            href="#cat-${esc(cat.id)}"
            data-category-pill
            ${index === 0 ? 'aria-current="true"' : ""}
          >${esc(cat.nameFa)}</a>`
          )
          .join("\n")}
      </nav>`
      : "";

  const categoryItems = categoriesWithItems
    .map(
      (cat) => `
      <section class="category" id="cat-${esc(cat.id)}">
        <div class="category-head">
          <h2 class="cat-title">${esc(cat.nameFa)}</h2>
        </div>
        ${cat.items.map((item) => renderItemCard(item, baseUrl)).join("\n")}
      </section>`
    )
    .join("\n");

  const emptyState =
    categoriesWithItems.length === 0
      ? `<section class="empty-state"><p>آیتمی برای نمایش وجود ندارد.</p></section>`
      : "";
  return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#f5f0e6" />
  <meta name="format-detection" content="telephone=no" />
  <meta name="description" content="${esc(venue.nameFa)} — منوی کافه" />
  <meta property="og:title" content="${esc(venue.nameFa)}" />
  <meta property="og:description" content="${esc(venue.welcomeMessage || venue.nameFa)} — منوی کافه" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary" />
  ${venue.logoUrl ? `<meta property="og:image" content="${esc(resolveUrl(venue.logoUrl, baseUrl))}" />` : ""}
  <title>${esc(venue.nameFa)} — منو</title>
  <style>
${FONT_FACE_DECLARATIONS}
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html {
      font-size: 16px;
      -webkit-text-size-adjust: 100%;
      scroll-behavior: smooth;
    }
    body {
      --paper: #f5f0e6;
      --ink: #111111;
      --muted: #6f695f;
      --line: rgba(17, 17, 17, 0.14);
      --accent: ${accentValue};
      font-family: "Parastoo", "Vazirmatn", "Tahoma", sans-serif;
      background: radial-gradient(circle at top, rgba(255, 255, 255, 0.5), transparent 34%), var(--paper);
      color: var(--ink);
      min-height: 100vh;
      line-height: 1.65;
      padding: 0 20px;
    }
    a {
      color: inherit;
      text-decoration: none;
    }
    .menu-shell {
      width: min(100%, 680px);
      margin: 0 auto;
    }
    .menu-panel {
      padding: 56px 0 40px;
    }
    .hero {
      padding-bottom: 36px;
    }
    .hero-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }
    .hero-copy {
      min-width: 0;
      text-align: right;
    }
    .logo-mark {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      border: 1px solid var(--line);
      object-fit: cover;
      flex-shrink: 0;
    }
    .brand {
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 11px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .venue-name {
      font-family: "Parastoo", "Vazirmatn", "Tahoma", sans-serif;
      font-size: clamp(34px, 8vw, 52px);
      font-weight: 700;
      letter-spacing: -0.035em;
      line-height: 1.08;
    }
    .venue-name-en {
      margin-top: 5px;
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 18px;
      font-style: italic;
      color: var(--muted);
    }
    .welcome {
      max-width: 32rem;
      margin-top: 20px;
      font-size: 15px;
      color: var(--muted);
      line-height: 1.95;
    }
    .category-nav {
      display: flex;
      gap: 24px;
      overflow-x: auto;
      scrollbar-width: none;
      padding: 16px 0 14px;
      margin: 0 0 52px;
      position: sticky;
      top: 0;
      z-index: 20;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      background: rgba(245, 240, 230, 0.97);
    }
    .category-nav::-webkit-scrollbar {
      display: none;
    }
    .category-pill {
      position: relative;
      white-space: nowrap;
      padding: 2px 0;
      font-size: 13px;
      color: var(--muted);
      transition: color 160ms ease;
    }
    .category-pill.active,
    .category-pill[aria-current="true"] {
      background: ${accentValue};
      color: var(--paper);
      border-radius: 999px;
      padding-right: 12px;
      padding-left: 12px;
    }
    .category {
      margin-bottom: 72px;
      scroll-margin-top: 78px;
    }
    .category:last-of-type {
      margin-bottom: 24px;
    }
    .category-head {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
    }
    .category-head::after {
      content: "";
      height: 1px;
      flex: 1;
      background: var(--line);
    }
    .cat-title {
      font-size: 23px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .item-card {
      padding: 24px 0;
      border-bottom: 1px solid var(--line);
    }
    .item-card.sold-out {
      color: var(--muted);
    }
    .item-card.sold-out .item-name,
    .item-card.sold-out .item-name-en,
    .item-card.sold-out .item-desc,
    .item-card.sold-out .item-price,
    .item-card.sold-out .item-price-unit {
      opacity: 0.45;
    }
    .item-header {
      direction: ltr;
      display: grid;
      grid-template-columns: minmax(84px, auto) minmax(0, 1fr);
      align-items: flex-start;
      gap: 24px;
    }
    .item-price-wrap,
    .item-info {
      direction: rtl;
    }
    .item-info {
      min-width: 0;
    }
    .item-name {
      font-family: "Parastoo", "Vazirmatn", "Tahoma", sans-serif;
      font-size: 19px;
      font-weight: 700;
      line-height: 1.35;
    }
    .item-name-en {
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 14px;
      font-style: italic;
      color: var(--muted);
      margin-top: 2px;
    }
    .item-desc {
      font-size: 13px;
      color: var(--muted);
      margin-top: 8px;
      line-height: 1.85;
    }
    .allergen-badges {
      margin-top: 10px;
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
    }
    .badge-allergen {
      color: var(--muted);
      font-size: 10px;
    }
    .item-variants {
      margin-top: 12px;
      display: flex;
      gap: 6px 14px;
      flex-wrap: wrap;
    }
    .variant-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: var(--muted);
    }
    .variant-price {
      color: var(--ink);
    }
    .item-prices {
      margin-top: 12px;
      display: grid;
      gap: 5px;
    }
    .price-bubble {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      line-height: 1.6;
    }
    .price-bubble-amount {
      font-weight: 700;
      color: var(--ink);
      white-space: nowrap;
    }
    .price-bubble-desc {
      color: var(--muted);
    }
    .price-bubble-unit {
      font-size: 10px;
      color: var(--muted);
    }
    .item-meta {
      margin-top: 10px;
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: flex-end;
      direction: ltr;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 10px;
      color: var(--muted);
      line-height: 1.4;
    }
    .badge-emphasis {
      border-color: var(--line);
    }
    .badge-status {
      background: var(--ink);
      color: var(--paper);
      border-color: var(--ink);
      font-weight: 700;
    }
    .item-price-wrap {
      text-align: left;
      padding-top: 3px;
    }
    .item-price {
      font-size: 17px;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
    }
    .item-price-unit {
      margin-top: 7px;
      font-size: 10px;
      color: var(--muted);
    }
    .empty-state {
      padding: 64px 16px;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      text-align: center;
      color: var(--muted);
    }
    .footer {
      margin-top: 56px;
      padding: 24px 0 8px;
      border-top: 1px solid var(--line);
      text-align: center;
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 10px;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .photo-mode {
      display: grid;
      grid-template-columns: 112px minmax(0, 1fr);
      gap: 20px;
    }
    .item-photo-wrap {
      position: relative;
      align-self: start;
      overflow: hidden;
      border-radius: 18px;
      background: rgba(17, 17, 17, 0.05);
    }
    .item-photo-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(17, 17, 17, 0.55);
      color: var(--paper);
      font-size: 11px;
      font-weight: 700;
    }
    .item-card.sold-out .item-photo {
      opacity: 0.55;
    }
    .item-photo {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      display: block;
    }
    .item-body {
      direction: rtl;
    }
    @media (max-width: 480px) {
      body {
        padding: 0 16px;
      }
      .menu-panel {
        padding-top: 38px;
      }
      .hero {
        padding-bottom: 28px;
      }
      .logo-mark {
        width: 60px;
        height: 60px;
      }
      .welcome {
        font-size: 14px;
      }
      .category-nav {
        gap: 20px;
        margin-bottom: 40px;
      }
      .category {
        margin-bottom: 56px;
      }
      .cat-title {
        font-size: 21px;
      }
      .item-card {
        padding: 20px 0;
      }
      .item-header {
        grid-template-columns: 78px minmax(0, 1fr);
        gap: 14px;
      }
      .item-name {
        font-size: 17px;
      }
      .item-price {
        font-size: 15px;
      }
      .photo-mode {
        grid-template-columns: 88px minmax(0, 1fr);
        gap: 14px;
      }
      .item-photo-wrap {
        border-radius: 14px;
      }
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .menu-shell {
        width: 100%;
      }
      .menu-panel {
        padding: 0;
      }
      .category-nav {
        position: static;
      }
      .item-card {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <main class="menu-shell">
    <section class="menu-panel">
      <header class="hero" id="top">
        <div class="hero-row">
          <div class="hero-copy">
            <div class="brand">mofé · menu</div>
            <h1 class="venue-name">${esc(venue.nameFa)}</h1>
            ${venue.nameEn ? `<p class="venue-name-en">${esc(venue.nameEn)}</p>` : ""}
          </div>
          ${venue.logoUrl ? `
          <img class="logo-mark" src="${esc(resolveUrl(venue.logoUrl, baseUrl))}" alt="" aria-hidden="true" />` : ""}
        </div>
        ${venue.welcomeMessage ? `<p class="welcome">${esc(venue.welcomeMessage)}</p>` : ""}
      </header>

      ${categoryNav}

      ${categoryItems || emptyState}

      <div class="footer">Powered by mofé</div>
    </section>
  </main>
  <script>
  (function () {
    var pills = Array.prototype.slice.call(document.querySelectorAll("[data-category-pill]"));
    if (pills.length === 0 || !("IntersectionObserver" in window)) return;
    var sections = pills.map(function (p) {
      return document.getElementById(p.getAttribute("href").slice(1));
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var i = sections.indexOf(entry.target);
        pills.forEach(function (p) {
          p.classList.remove("active");
          p.removeAttribute("aria-current");
        });
        pills[i].classList.add("active");
        pills[i].setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    sections.forEach(function (s) {
      if (s) io.observe(s);
    });
  })();
  </script>
</body>
</html>`;
}

export function renderUnavailablePage(venueName: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#f5f0e6" />
  <title>${esc(venueName)}</title>
  <style>
${FONT_FACE_DECLARATIONS}
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body {
      font-family: "Parastoo", "Vazirmatn", "Tahoma", sans-serif;
      background: radial-gradient(circle at top, rgba(255, 255, 255, 0.5), transparent 38%), #f5f0e6;
      color: #111111;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 20px;
      text-align: center;
    }
    .shell {
      width: min(100%, 560px);
    }
    .panel {
      padding: 48px 0 24px;
      border-top: 1px solid rgba(17, 17, 17, 0.16);
      border-bottom: 1px solid rgba(17, 17, 17, 0.16);
    }
    .brand {
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 10px;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: #6f695f;
      margin-bottom: 18px;
    }
    .name {
      font-family: "Parastoo", "Vazirmatn", "Tahoma", sans-serif;
      font-size: clamp(32px, 8vw, 48px);
      font-weight: 700;
      color: #111;
      letter-spacing: -0.035em;
      line-height: 1.15;
      margin-bottom: 16px;
    }
    .msg {
      font-size: 14px;
      color: #6f695f;
      line-height: 1.9;
    }
    .footer {
      margin-top: 48px;
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 10px;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: #6f695f;
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="panel">
      <div class="brand">mofé</div>
      <h1 class="name">${esc(venueName)}</h1>
      <p class="msg">منو در حال حاضر در دسترس نیست.</p>
      <div class="footer">Powered by mofé</div>
    </div>
  </div>
</body>
</html>`;
}
