import type { Category, Item, Settings, Variant } from "./types";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const CSV_HEADER =
  "category,name_fa,name_en,description,price_toman,sold_out,variant_name_fa,variant_name_en,variant_price_delta";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatPrice(toman: number): string {
  const rounded = Math.trunc(toman);
  const digits = String(Math.abs(rounded)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    "٬",
  );
  const persian = digits.replace(
    /\d/g,
    (digit) => PERSIAN_DIGITS[Number(digit)],
  );
  return rounded < 0 ? `−${persian}` : persian;
}

function byOrder<T extends { sortOrder: number; id: number }>(a: T, b: T) {
  return a.sortOrder - b.sortOrder || a.id - b.id;
}

function present(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function renderVariantPrice(delta: number): string {
  if (delta === 0) return "";
  const sign = delta > 0 ? "+" : "−";
  return `<span class="variant-price">${sign}${formatPrice(
    Math.abs(delta),
  )}</span>`;
}

function renderVariant(variant: Variant): string {
  const nameFa = present(variant.nameFa);
  const nameEn = present(variant.nameEn);
  const label = nameEn ? `${nameFa} (${nameEn})` : nameFa;
  return `<span class="variant-pill">${escapeHtml(
    label,
  )}${renderVariantPrice(variant.priceDelta)}</span>`;
}

function renderItem(item: Item): string {
  const nameEn = present(item.nameEn);
  const description = present(item.description);
  const variants = [...item.variants].sort(byOrder);
  const parts: string[] = [
    `<article class="item-card${item.isSoldOut ? " sold-out" : ""}">`,
    `  <div class="item-body">`,
    `    <div class="item-header">`,
    `      <div class="item-price-wrap">`,
    `        <div class="item-price">${formatPrice(item.priceToman)}</div>`,
    `        <div class="item-price-unit">تومان</div>`,
    `      </div>`,
    `      <div class="item-info">`,
    `        <h3 class="item-name">${escapeHtml(item.nameFa)}</h3>`,
  ];

  if (nameEn) {
    parts.push(
      `        <p class="item-name-en">${escapeHtml(nameEn)}</p>`,
    );
  }
  if (description) {
    parts.push(`        <p class="item-desc">${escapeHtml(description)}</p>`);
  }
  if (variants.length > 0) {
    parts.push(
      `        <div class="item-variants">`,
      ...variants.map(
        (variant) => `          ${renderVariant(variant)}`,
      ),
      `        </div>`,
    );
  }

  parts.push(`        <div class="item-meta">`);
  if (item.isSoldOut) {
    parts.push(`          <span class="badge badge-status">ناموجود</span>`);
  }
  parts.push(
    `        </div>`,
    `      </div>`,
    `    </div>`,
    `  </div>`,
    `</article>`,
  );

  return parts.join("\n");
}

function renderCategory(category: Category): string {
  const items = [...category.items].sort(byOrder);
  return [
    `<section class="category" id="cat-${category.id}">`,
    `  <div class="category-head">`,
    `    <h2 class="cat-title">${escapeHtml(category.nameFa)}</h2>`,
    `  </div>`,
    ...items.map((item) =>
      renderItem(item)
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n"),
    ),
    `</section>`,
  ].join("\n");
}

export function renderMenu(
  template: string,
  settings: Settings,
  categories: Category[],
): string {
  const visible = [...categories]
    .sort(byOrder)
    .filter((category) => category.items.length > 0);

  const nameFa = settings.nameFa;
  const title = `${nameFa} — منو`;
  const meta =
    present(settings.metaDescription) ||
    present(settings.welcomeMessage) ||
    `${nameFa} — منوی کافه`;
  const nameEn = present(settings.nameEn);
  const welcome = present(settings.welcomeMessage);

  const nav =
    visible.length === 0
      ? ""
      : [
          `<nav class="category-nav" aria-label="دسته‌بندی‌ها">`,
          ...visible.map(
            (category) =>
              `  <a class="category-pill" href="#cat-${category.id}">${escapeHtml(
                category.nameFa,
              )}</a>`,
          ),
          `</nav>`,
        ].join("\n");

  const sections = visible.length > 0
    ? visible.map(renderCategory).join("\n")
    : '<div class="menu-empty" role="status"><strong>منو به‌زودی آماده می‌شود.</strong><p>به‌زودی با انتخاب‌های تازه منتظر شما هستیم.</p></div>';

  const logo = present(settings.logoDataUrl)
    ? `<img class="logo-mark" width="72" height="72" decoding="async" src="${escapeHtml(
        settings.logoDataUrl,
      )}" alt="" aria-hidden="true" />`
    : "";

  return template
    .replaceAll("<!--TITLE-->", () => escapeHtml(title))
    .replaceAll("<!--META_DESCRIPTION-->", () => escapeHtml(meta))
    .replaceAll("<!--NAME_FA-->", () => escapeHtml(nameFa))
    .replaceAll(
      "<!--NAME_EN-->",
      () =>
        nameEn
          ? `<p class="venue-name-en">${escapeHtml(nameEn)}</p>`
          : "",
    )
    .replaceAll(
      "<!--WELCOME-->",
      () =>
        welcome ? `<p class="welcome">${escapeHtml(welcome)}</p>` : "",
    )
    .replaceAll("<!--LOGO-->", () => logo)
    .replaceAll("<!--NAV-->", () => nav)
    .replaceAll("<!--SECTIONS-->", () => sections);
}

function csvCell(value: string | null): string {
  let text = value ?? "";
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function renderCsv(categories: Category[]): string {
  const rows = [CSV_HEADER];

  for (const category of [...categories].sort(byOrder)) {
    for (const item of [...category.items].sort(byOrder)) {
      const base = [
        csvCell(category.nameFa),
        csvCell(item.nameFa),
        csvCell(item.nameEn),
        csvCell(item.description),
        String(item.priceToman),
        item.isSoldOut ? "1" : "0",
      ];
      const variants = [...item.variants].sort(byOrder);
      if (variants.length === 0) {
        rows.push([...base, '""', '""', ""].join(","));
      } else {
        for (const variant of variants) {
          rows.push(
            [
              ...base,
              csvCell(variant.nameFa),
              csvCell(variant.nameEn),
              String(variant.priceDelta),
            ].join(","),
          );
        }
      }
    }
  }

  return `\uFEFF${rows.join("\r\n")}\r\n`;
}
