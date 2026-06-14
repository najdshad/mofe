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

  const categoryItems = categories
    .filter((cat) => cat.items.length > 0)
    .map(
      (cat) => `
      <section class="category" id="cat-${esc(cat.id)}">
        <h2 class="cat-title">${esc(cat.nameFa)}</h2>
        ${cat.items
          .map(
            (item) => `
          <div class="item-card${item.soldOut ? " sold-out" : ""}">
            <div class="item-header">
              <div class="item-info">
                <h3 class="item-name">${esc(item.nameFa)}</h3>
                ${item.nameEn ? `<p class="item-name-en">${esc(item.nameEn)}</p>` : ""}
                ${item.description ? `<p class="item-desc">${esc(item.description)}</p>` : ""}
                <div class="item-meta">
                  ${item.calories ? `<span class="badge">${item.calories} kcal</span>` : ""}
                </div>
              </div>
              <div class="item-price-wrap">
                ${item.soldOut ? `<span class="sold-out-badge">ناموجود</span>` : ""}
                <div class="item-price">${formatPrice(item.priceToman)}</div>
                <div class="item-price-unit">تومان</div>
              </div>
            </div>
          </div>`
          )
          .join("\n")}
      </section>`
    )
    .join("\n");

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
    html { font-size: 16px; -webkit-text-size-adjust: 100%; }
    body {
      font-family: "Parastoo", "Vazirmatn", "Tahoma", sans-serif;
      background: #f5f0e6;
      color: #111111;
      line-height: 1.6;
      padding: 24px 16px 32px;
      max-width: 480px;
      margin: 0 auto;
      min-height: 100vh;
    }
    .brand {
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 11px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 12px;
    }
    .venue-name {
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 28px;
      font-weight: 400;
      color: #111111;
      line-height: 1.15;
      margin-bottom: 8px;
    }
    .welcome {
      font-size: 14px;
      color: #666;
      margin-bottom: 24px;
      line-height: 1.7;
    }
    .category {
      margin-bottom: 20px;
    }
    .cat-title {
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 20px;
      font-weight: 400;
      color: #111111;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #ddd8cc;
    }
    .item-card {
      background: #fffcf5;
      border: 1px solid #ddd8cc;
      border-radius: 16px;
      padding: 14px;
      margin-bottom: 8px;
      transition: none;
    }
    .item-card.sold-out {
      opacity: 0.6;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .item-info {
      min-width: 0;
      flex: 1;
    }
    .item-name {
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 20px;
      font-weight: 400;
      color: #111111;
      line-height: 1.2;
    }
    .item-name-en {
      font-size: 13px;
      color: #888;
      margin-top: 2px;
    }
    .item-desc {
      font-size: 13px;
      color: #666;
      margin-top: 6px;
      line-height: 1.6;
    }
    .item-meta {
      margin-top: 6px;
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      border: 1px solid #ddd8cc;
      border-radius: 999px;
      padding: 2px 10px;
      font-size: 10px;
      color: #888;
      line-height: 1.4;
    }
    .item-price-wrap {
      text-align: left;
      flex-shrink: 0;
    }
    .item-price {
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 20px;
      color: #111111;
      line-height: 1.2;
    }
    .item-price-unit {
      font-size: 11px;
      color: #888;
    }
    .sold-out-badge {
      display: inline-block;
      border: 1px solid #111111;
      border-radius: 999px;
      padding: 1px 8px;
      font-size: 9px;
      letter-spacing: 0.05em;
      color: #111111;
      margin-bottom: 4px;
      line-height: 1.5;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #ddd8cc;
      text-align: center;
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #aaa;
    }
    @media (min-width: 481px) {
      body { padding: 40px 24px 48px; }
      .venue-name { font-size: 32px; }
    }
    @media print {
      body { background: white; padding: 0; }
      .item-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="brand">mofé</div>
  <h1 class="venue-name">${esc(venue.nameFa)}</h1>
  ${venue.welcomeMessage ? `<p class="welcome">${esc(venue.welcomeMessage)}</p>` : ""}

  ${categoryItems}

  <div class="footer">Powered by mofé</div>
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
      background: #f5f0e6;
      color: #111111;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .brand {
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #aaa;
      margin-bottom: 16px;
    }
    .name {
      font-family: "EB Garamond", "Georgia", serif;
      font-size: 22px;
      color: #111;
      margin-bottom: 12px;
    }
    .msg {
      font-size: 14px;
      color: #666;
      line-height: 1.7;
    }
    .footer {
      position: fixed;
      bottom: 24px;
      left: 0;
      right: 0;
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #aaa;
    }
  </style>
</head>
<body>
  <div>
    <div class="brand">mofé</div>
    <h1 class="name">${esc(venueName)}</h1>
    <p class="msg">منو در حال حاضر در دسترس نیست.</p>
  </div>
  <div class="footer">Powered by mofé</div>
</body>
</html>`;
}
