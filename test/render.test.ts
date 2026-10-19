import { describe, expect, it } from "vitest";
import { escapeHtml, formatPrice, renderMenu } from "../src/render";
import type { Category, Item, Settings, Variant } from "../src/types";

const template = `<!doctype html>
<html>
  <head>
    <title><!--TITLE--></title>
    <meta name="description" content="<!--META_DESCRIPTION-->" />
    <meta property="og:title" content="<!--NAME_FA-->" />
    <meta property="og:description" content="<!--META_DESCRIPTION-->" />
  </head>
  <body>
    <header>
      <h1 class="venue-name"><!--NAME_FA--></h1>
      <!--NAME_EN-->
      <!--WELCOME-->
      <!--LOGO-->
    </header>
    <!--NAV-->
    <main><!--SECTIONS--></main>
  </body>
</html>`;

function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    nameFa: "کافه نقطه",
    nameEn: "Noghteh Cafe",
    welcomeMessage: "به کافه ما خوش آمدید.",
    metaDescription: null,
    logoDataUrl: null,
    ...overrides,
  };
}

function makeVariant(overrides: Partial<Variant> = {}): Variant {
  return {
    id: 1,
    nameFa: "دبل",
    nameEn: "Double",
    priceDelta: 30_000,
    sortOrder: 0,
    ...overrides,
  };
}

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 1,
    nameFa: "اسپرسو",
    nameEn: "Espresso",
    description: "اسپرسوی تازه",
    priceToman: 130_000,
    isSoldOut: false,
    sortOrder: 0,
    variants: [],
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 1,
    nameFa: "اسپرسو",
    sortOrder: 0,
    items: [makeItem()],
    ...overrides,
  };
}

describe("renderMenu", () => {
  it("fills branding placeholders and leaves none behind", () => {
    const html = renderMenu(
      template,
      makeSettings({
        metaDescription: "توضیح <ویژه>",
        logoDataUrl: "data:image/png;base64,AAAA",
      }),
      [],
    );

    expect(html).toContain("<title>کافه نقطه — منو</title>");
    expect(html).toContain('<h1 class="venue-name">کافه نقطه</h1>');
    expect(html).toContain(
      '<p class="venue-name-en">Noghteh Cafe</p>',
    );
    expect(html).toContain(
      '<p class="welcome">به کافه ما خوش آمدید.</p>',
    );
    expect(html).toContain(
      'src="data:image/png;base64,AAAA"',
    );
    expect(
      html.match(/content="توضیح &lt;ویژه&gt;"/g),
    ).toHaveLength(2);
    expect(html).not.toContain("<!--");
  });

  it("omits empty optional elements and falls back for metadata", () => {
    const html = renderMenu(
      template,
      makeSettings({
        nameEn: null,
        welcomeMessage: null,
        metaDescription: null,
        logoDataUrl: null,
      }),
      [],
    );

    expect(html).not.toContain("venue-name-en");
    expect(html).not.toContain('class="welcome"');
    expect(html).not.toContain("logo-mark");
    expect(html).toContain("کافه نقطه — منوی کافه");
    expect(html).not.toContain("<!--");
  });

  it("uses the welcome message as the description fallback", () => {
    const html = renderMenu(
      template,
      makeSettings({ metaDescription: null, welcomeMessage: "خوش آمدید" }),
      [],
    );
    expect(html.match(/content="خوش آمدید"/g)).toHaveLength(2);
  });

  it("escapes user content everywhere", () => {
    const hostile = `<script>alert("x") & 'y'</script>`;
    const html = renderMenu(
      template,
      makeSettings({ nameFa: hostile, nameEn: hostile, welcomeMessage: hostile }),
      [
        makeCategory({
          nameFa: hostile,
          items: [
            makeItem({
              nameFa: hostile,
              nameEn: hostile,
              description: hostile,
              variants: [makeVariant({ nameFa: hostile, nameEn: hostile })],
            }),
          ],
        }),
      ],
    );

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&#39;y&#39;");
    expect(html).toContain("&quot;x&quot;");
    expect(html).toContain("&amp;");
  });

  it("omits empty categories from navigation and sections", () => {
    const html = renderMenu(template, makeSettings(), [
      makeCategory({ id: 1, nameFa: "خالی", sortOrder: 0, items: [] }),
      makeCategory({
        id: 2,
        nameFa: "پر",
        sortOrder: 1,
        items: [makeItem()],
      }),
      makeCategory({ id: 3, nameFa: "باز هم خالی", sortOrder: 2, items: [] }),
    ]);

    expect(html).not.toContain("cat-1");
    expect(html).not.toContain("cat-3");
    expect(html).toContain('href="#cat-2"');
    expect(html).toContain('id="cat-2"');
    expect(html).toContain('<a class="category-pill" href="#cat-2">پر</a>');
  });

  it("renders a single empty hero when every category is empty", () => {
    const html = renderMenu(template, makeSettings(), [
      makeCategory({ id: 9, items: [] }),
    ]);
    expect(html).not.toContain("category-nav");
    expect(html).not.toContain("<section");
    expect(html).toContain('<h1 class="venue-name">کافه نقطه</h1>');
  });

  it("marks sold-out items with the class and badge", () => {
    const html = renderMenu(template, makeSettings(), [
      makeCategory({ items: [makeItem({ isSoldOut: true })] }),
    ]);

    expect(html).toContain('<article class="item-card sold-out">');
    expect(html).toContain('<span class="badge badge-status">ناموجود</span>');
  });

  it("leaves available items unmarked", () => {
    const html = renderMenu(template, makeSettings(), [
      makeCategory({ items: [makeItem({ isSoldOut: false })] }),
    ]);

    expect(html).toContain('<article class="item-card">');
    expect(html).not.toContain("badge-status");
  });

  it("renders variants in order with signed prices", () => {
    const html = renderMenu(template, makeSettings(), [
      makeCategory({
        items: [
          makeItem({
            variants: [
              makeVariant({ id: 3, nameFa: "کوچک", nameEn: null, priceDelta: -5_000, sortOrder: 2 }),
              makeVariant({ id: 1, nameFa: "دبل", nameEn: "Double", priceDelta: 30_000, sortOrder: 0 }),
              makeVariant({ id: 2, nameFa: "معمولی", nameEn: null, priceDelta: 0, sortOrder: 1 }),
            ],
          }),
        ],
      }),
    ]);

    expect(html).toContain(
      '<span class="variant-pill">دبل (Double)<span class="variant-price">+۳۰٬۰۰۰</span></span>',
    );
    expect(html).toContain(
      '<span class="variant-pill">معمولی</span>',
    );
    expect(html).toContain(
      '<span class="variant-pill">کوچک<span class="variant-price">−۵٬۰۰۰</span></span>',
    );
    expect(html.indexOf("دبل (Double)")).toBeLessThan(
      html.indexOf("معمولی"),
    );
    expect(html.indexOf("معمولی")).toBeLessThan(html.indexOf("کوچک"));
  });

  it("sorts categories, items, and variants by sort order", () => {
    const html = renderMenu(template, makeSettings(), [
      makeCategory({
        id: 2,
        nameFa: "دوم",
        sortOrder: 1,
        items: [
          makeItem({ id: 3, nameFa: "ب", sortOrder: 1 }),
          makeItem({ id: 2, nameFa: "الف", sortOrder: 0 }),
        ],
      }),
      makeCategory({ id: 1, nameFa: "اول", sortOrder: 0 }),
    ]);

    expect(html.indexOf("cat-1")).toBeLessThan(html.indexOf("cat-2"));
    expect(html.indexOf("الف")).toBeLessThan(html.indexOf(">ب<"));
  });

  it("keeps category anchors stable when a category is renamed", () => {
    const first = renderMenu(template, makeSettings(), [
      makeCategory({ id: 7, nameFa: "قدیمی" }),
    ]);
    const second = renderMenu(template, makeSettings(), [
      makeCategory({ id: 7, nameFa: "جدید" }),
    ]);

    expect(first).toContain('id="cat-7"');
    expect(second).toContain('id="cat-7"');
    expect(second).toContain('href="#cat-7"');
  });
});

describe("formatPrice", () => {
  it("uses Persian digits and the thousands separator", () => {
    expect(formatPrice(130_000)).toBe("۱۳۰٬۰۰۰");
    expect(formatPrice(1_000)).toBe("۱٬۰۰۰");
    expect(formatPrice(999)).toBe("۹۹۹");
    expect(formatPrice(1_234_567)).toBe("۱٬۲۳۴٬۵۶۷");
    expect(formatPrice(0)).toBe("۰");
  });
});

describe("escapeHtml", () => {
  it("escapes text and attribute characters", () => {
    expect(escapeHtml(`& < > " '`)).toBe(
      "&amp; &lt; &gt; &quot; &#39;",
    );
    expect(escapeHtml(null)).toBe("");
  });
});
