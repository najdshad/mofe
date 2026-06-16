export interface SnapshotCategoryItem {
  id: string;
  nameFa: string;
  nameEn: string | null;
  description: string | null;
  priceToman: number;
  station: string;
  calories: number | null;
  soldOut: boolean;
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
    slug: string;
  };
  categories: SnapshotCategory[];
  generatedAt: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPrice(price: number): string {
  return price.toLocaleString("fa-IR");
}

export function renderPublicMenu(snapshot: Snapshot): string {
  const { venue, categories } = snapshot;
  const accent = venue.accentColor && venue.accentColor !== "#111111" ? venue.accentColor : null;
  const categoriesWithItems = categories.filter((cat) => cat.items.length > 0);
  const accentValue = accent ? esc(accent) : "#111111";

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
        ${cat.items
          .map(
            (item) => `
          <article class="item-card${item.soldOut ? " sold-out" : ""}">
            <div class="item-header">
              <div class="item-price-wrap">
                <div class="item-price">${formatPrice(item.priceToman)}</div>
                <div class="item-price-unit">تومان</div>
              </div>
              <div class="item-info">
                <h3 class="item-name">${esc(item.nameFa)}</h3>
                ${item.nameEn ? `<p class="item-name-en">${esc(item.nameEn)}</p>` : ""}
                ${item.description ? `<p class="item-desc">${esc(item.description)}</p>` : ""}
                <div class="item-meta">
                  ${item.soldOut ? '<span class="badge badge-status">ناموجود</span>' : ""}
                  ${item.calories ? `<span class="badge badge-emphasis">${item.calories} kcal</span>` : ""}
                </div>
              </div>
            </div>
          </article>`
          )
          .join("\n")}
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#f5f0e6" />
  <meta name="format-detection" content="telephone=no" />
  <title>${esc(venue.nameFa)} — منو</title>
  <style>
    @font-face {
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
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html {
      font-size: 16px;
      -webkit-text-size-adjust: 100%;
      scroll-behavior: smooth;
    }
    body {
      --paper: #f7f2e8;
      --paper-strong: #fdfaf2;
      --line: rgba(17, 17, 17, 0.12);
      --line-strong: rgba(17, 17, 17, 0.2);
      --muted: #7a7367;
      --shadow: 0 20px 55px rgba(17, 17, 17, 0.08);
      font-family: "Parastoo", "Vazirmatn", "Tahoma", sans-serif;
      background:
        radial-gradient(circle at top, rgba(255, 255, 255, 0.95), rgba(247, 242, 232, 0.92) 24%, rgba(247, 242, 232, 1) 60%),
        #f5f0e6;
      color: #111111;
      min-height: 100vh;
      line-height: 1.6;
      margin: 0;
      padding: 18px 14px 28px;
    }
    a {
      color: inherit;
      text-decoration: none;
    }
    .menu-shell {
      width: min(100%, 510px);
      margin: 0 auto;
    }
    .menu-panel {
      background: linear-gradient(180deg, rgba(255, 251, 243, 0.96), rgba(249, 244, 234, 0.98));
      border: 1.4px solid rgba(17, 17, 17, 0.72);
      border-radius: 34px;
      box-shadow: var(--shadow);
      padding: 16px;
    }
    .menu-frame {
      border: 1px solid rgba(17, 17, 17, 0.72);
      border-radius: 28px;
      padding: 18px 18px 22px;
    }
    .hero {
      padding-bottom: 16px;
      border-bottom: 1px solid var(--line);
      margin-bottom: 14px;
    }
    .hero-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 8px;
    }
    .hero-copy {
      min-width: 0;
      text-align: right;
    }
    .qr-mark {
      width: 46px;
      height: 46px;
      border-radius: 16px;
      border: 1px solid rgba(17, 17, 17, 0.82);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.42);
    }
    .brand {
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 12px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 2px;
    }
    .venue-name {
      font-family: "Parastoo", "Vazirmatn", "Tahoma", sans-serif;
      font-size: 30px;
      font-weight: 700;
      color: #111111;
      line-height: 1.2;
      margin-bottom: 0;
    }
    .welcome {
      font-size: 14px;
      color: #5d584f;
      line-height: 1.9;
      max-width: 28rem;
    }
    .category-nav {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      scrollbar-width: none;
      padding: 14px 0 10px;
      margin-bottom: 8px;
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgba(253, 250, 242, 0.95);
    }
    .category-nav::-webkit-scrollbar {
      display: none;
    }
    .category-pill {
      white-space: nowrap;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 8px 16px;
      font-size: 14px;
      color: #6e685d;
      background: rgba(255, 255, 255, 0.5);
      transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease;
    }
    .category-pill.active,
    .category-pill[aria-current="true"] {
      background: ${accentValue};
      border-color: ${accentValue};
      color: #faf6ef;
    }
    .category {
      margin-bottom: 18px;
      scroll-margin-top: 70px;
    }
    .category:last-of-type {
      margin-bottom: 0;
    }
    .category-head {
      margin-bottom: 10px;
    }
    .cat-title {
      font-size: 14px;
      font-weight: 700;
      color: #8a8275;
    }
    .item-card {
      background: var(--paper-strong);
      border: 1px solid rgba(17, 17, 17, 0.08);
      border-radius: 24px;
      padding: 18px 18px 16px;
      margin-bottom: 12px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
    }
    .item-card.sold-out {
      opacity: 0.72;
    }
    .item-header {
      direction: ltr;
      display: grid;
      grid-template-columns: minmax(92px, 108px) minmax(0, 1fr);
      align-items: flex-start;
      gap: 18px;
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
      font-size: 22px;
      font-weight: 700;
      color: #111111;
      line-height: 1.25;
    }
    .item-name-en {
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 18px;
      color: #6f685c;
      margin-top: 1px;
    }
    .item-desc {
      font-size: 14px;
      color: #59544b;
      margin-top: 12px;
      line-height: 1.95;
    }
    .item-meta {
      margin-top: 16px;
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 30px;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 12px;
      color: #82796d;
      background: rgba(255, 255, 255, 0.5);
      line-height: 1;
    }
    .badge-emphasis {
      border-color: rgba(17, 17, 17, 0.52);
      color: #111111;
      background: transparent;
    }
    .badge-status {
      border-color: rgba(17, 17, 17, 0.52);
      color: #111111;
    }
    .item-price-wrap {
      text-align: left;
      padding-top: 4px;
    }
    .item-price {
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 26px;
      font-weight: 500;
      color: #111111;
      line-height: 1;
    }
    .item-price-unit {
      margin-top: 10px;
      font-size: 13px;
      color: #7a7367;
    }
    .empty-state {
      padding: 28px 16px 12px;
      text-align: center;
      color: #7a7367;
    }
    .footer {
      margin-top: 18px;
      padding-top: 18px;
      border-top: 1px solid var(--line);
      text-align: center;
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 11px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #8a8275;
    }
    @media (max-width: 380px) {
      .menu-panel {
        padding: 12px;
      }
      .menu-frame {
        padding: 16px 14px 20px;
      }
      .item-header {
        grid-template-columns: 84px minmax(0, 1fr);
        gap: 14px;
      }
      .item-price {
        font-size: 23px;
      }
      .item-name {
        font-size: 20px;
      }
      .item-name-en {
        font-size: 16px;
      }
    }
    @media (min-width: 481px) {
      body {
        padding: 28px 18px 40px;
      }
      .menu-panel {
        padding: 18px;
      }
      .menu-frame {
        padding: 20px 20px 24px;
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
      .menu-panel,
      .menu-frame {
        border: 0;
        box-shadow: none;
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
      <div class="menu-frame">
        <header class="hero" id="top">
          <div class="hero-row">
            <div class="hero-copy">
              <div class="brand">mofé</div>
              <h1 class="venue-name">${esc(venue.nameFa)}</h1>
            </div>
            <div class="qr-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" stroke="currentColor" stroke-width="1.5"/>
                <rect x="14.5" y="1.5" width="6" height="6" rx="1.2" stroke="currentColor" stroke-width="1.5"/>
                <rect x="1.5" y="14.5" width="6" height="6" rx="1.2" stroke="currentColor" stroke-width="1.5"/>
                <rect x="4" y="4" width="1.8" height="1.8" rx="0.4" fill="currentColor"/>
                <rect x="17" y="4" width="1.8" height="1.8" rx="0.4" fill="currentColor"/>
                <rect x="4" y="17" width="1.8" height="1.8" rx="0.4" fill="currentColor"/>
                <rect x="10" y="10" width="1.8" height="1.8" rx="0.4" fill="currentColor"/>
                <rect x="13" y="10" width="1.8" height="1.8" rx="0.4" fill="currentColor"/>
                <rect x="10" y="13" width="1.8" height="1.8" rx="0.4" fill="currentColor"/>
                <rect x="13" y="13" width="4.8" height="4.8" rx="0.8" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </div>
          </div>
          ${venue.welcomeMessage ? `<p class="welcome">${esc(venue.welcomeMessage)}</p>` : ""}
        </header>

        ${categoryNav}

        ${categoryItems || emptyState}

        <div class="footer">Powered by mofé</div>
      </div>
    </section>
  </main>
  <script>
    (() => {
      const pills = Array.from(document.querySelectorAll("[data-category-pill]"));
      const sections = pills
        .map((pill) => {
          const href = pill.getAttribute("href");
          return href ? document.querySelector(href) : null;
        })
        .filter(Boolean);
      const activate = (targetId) => {
        pills.forEach((pill) => {
          const active = pill.getAttribute("href") === "#" + targetId;
          pill.classList.toggle("active", active);
          if (active) pill.setAttribute("aria-current", "true");
          else pill.removeAttribute("aria-current");
        });
      };
      pills.forEach((pill) => {
        pill.addEventListener("click", () => {
          const href = pill.getAttribute("href");
          if (href) activate(href.slice(1));
        });
      });
      if ("IntersectionObserver" in window && sections.length) {
        const observer = new IntersectionObserver(
          (entries) => {
            const visible = entries
              .filter((entry) => entry.isIntersecting)
              .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (visible?.target?.id) activate(visible.target.id);
          },
          { rootMargin: "-20% 0px -60% 0px", threshold: [0.25, 0.55, 0.8] }
        );
        sections.forEach((section) => observer.observe(section));
      }
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
    @font-face {
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
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body {
      font-family: "Parastoo", "Vazirmatn", "Tahoma", sans-serif;
      background:
        radial-gradient(circle at top, rgba(255, 255, 255, 0.95), rgba(247, 242, 232, 0.92) 24%, rgba(247, 242, 232, 1) 60%),
        #f5f0e6;
      color: #111111;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .shell {
      width: min(100%, 480px);
      background: linear-gradient(180deg, rgba(255, 251, 243, 0.96), rgba(249, 244, 234, 0.98));
      border: 1.4px solid rgba(17, 17, 17, 0.72);
      border-radius: 34px;
      padding: 16px;
      box-shadow: 0 20px 55px rgba(17, 17, 17, 0.08);
    }
    .panel {
      border: 1px solid rgba(17, 17, 17, 0.72);
      border-radius: 28px;
      padding: 32px 20px 60px;
      position: relative;
    }
    .brand {
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #8a8275;
      margin-bottom: 10px;
    }
    .name {
      font-family: "Parastoo", "Vazirmatn", "Tahoma", sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: #111;
      margin-bottom: 10px;
    }
    .msg {
      font-size: 14px;
      color: #5d584f;
      line-height: 1.9;
    }
    .footer {
      position: absolute;
      right: 0;
      bottom: 20px;
      left: 0;
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 11px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #8a8275;
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
