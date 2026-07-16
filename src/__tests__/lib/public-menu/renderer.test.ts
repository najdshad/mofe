import { describe, it, expect } from "vitest";
import {
  renderPublicMenu,
  renderUnavailablePage,
  type Snapshot,
} from "@/lib/public-menu/renderer";

type SnapshotOverrides = {
  venue?: Partial<Snapshot["venue"]>;
  categories?: Snapshot["categories"];
  generatedAt?: Snapshot["generatedAt"];
};

function makeSnapshot(overrides: SnapshotOverrides = {}): Snapshot {
  return {
    venue: {
      id: "v1",
      nameFa: "کافه نقطه",
      nameEn: "Noghteh Cafe",
      welcomeMessage: "به منوی ما خوش آمدید",
      accentColor: null,
      logoUrl: null,
      slug: "noghteh",
      ...overrides.venue,
    },
    categories: overrides.categories ?? [],
    generatedAt: overrides.generatedAt ?? "2025-01-01T00:00:00.000Z",
  };
}



function extract(html: string, selector: string): string[] {
  const regex = new RegExp(`<${selector}(?:[^>]*)>([\\s\\S]*?)<\\/${selector}>`, "gi");
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    matches.push(m[1].trim());
  }
  return matches;
}

function count(html: string, substr: string): number {
  const body = html.slice(html.indexOf("<body>"), html.indexOf("</body>"));
  return (body.match(new RegExp(substr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
}

describe("renderPublicMenu", () => {
  it("renders a valid HTML document", () => {
    const html = renderPublicMenu(makeSnapshot());
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("sets RTL and Persian language", () => {
    const html = renderPublicMenu(makeSnapshot());
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="fa"');
  });

  it("includes the venue name in the title", () => {
    const html = renderPublicMenu(makeSnapshot());
    expect(html).toContain("<title>کافه نقطه — منو</title>");
  });

  it("shows venue name in the body", () => {
    const html = renderPublicMenu(makeSnapshot());
    expect(html).toContain("کافه نقطه");
  });

  it("includes welcome message when present", () => {
    const html = renderPublicMenu(makeSnapshot());
    expect(html).toContain("به منوی ما خوش آمدید");
  });

  it("omits welcome message block when null", () => {
    const html = renderPublicMenu(makeSnapshot({ venue: { welcomeMessage: null } }));
    expect(html).not.toContain("class=\"welcome\"");
  });

  it("renders mofé brand mark", () => {
    const html = renderPublicMenu(makeSnapshot());
    expect(html).toContain("mofé");
  });

  it("includes Powered by mofé footer", () => {
    const html = renderPublicMenu(makeSnapshot());
    expect(html).toContain("Powered by mofé");
  });

  describe("font-face declarations", () => {
    it("includes Parastoo @font-face", () => {
      const html = renderPublicMenu(makeSnapshot());
      expect(html).toContain('font-family: "Parastoo"');
      expect(html).toContain("Parastoo.woff2");
      expect(html).toContain("Parastoo-Bold.woff2");
    });

    it("includes Vazirmatn @font-face", () => {
      const html = renderPublicMenu(makeSnapshot());
      expect(html).toContain('font-family: "Vazirmatn"');
      expect(html).toContain("Vazirmatn-VariableFont_wght.ttf");
    });

    it("includes EB Garamond @font-face", () => {
      const html = renderPublicMenu(makeSnapshot());
      expect(html).toContain('font-family: "EB Garamond"');
      expect(html).toContain("EBGaramond-VariableFont_wght.ttf");
      expect(html).toContain("EBGaramond-Italic-VariableFont_wght.ttf");
    });
  });

  describe("viewport and meta tags", () => {
    it("includes viewport meta with proper settings", () => {
      const html = renderPublicMenu(makeSnapshot());
      expect(html).toContain('name="viewport"');
      expect(html).toContain("initial-scale=1");
      expect(html).not.toContain("user-scalable=no");
    });

    it("includes theme-color meta", () => {
      const html = renderPublicMenu(makeSnapshot());
      expect(html).toContain('name="theme-color"');
      expect(html).toContain("#f5f0e6");
    });

    it("includes format-detection meta", () => {
      const html = renderPublicMenu(makeSnapshot());
      expect(html).toContain('name="format-detection"');
    });
  });

  describe("accent color", () => {
    it("does not inline accent when null", () => {
      const html = renderPublicMenu(makeSnapshot({ venue: { accentColor: null } }));
      expect(html).not.toContain("style=\"--accent");
    });

    it("does not inline accent when #111111 (default text color)", () => {
      const html = renderPublicMenu(makeSnapshot({ venue: { accentColor: "#111111" } }));
      expect(html).toContain("background: #111111");
    });

    it("inlines accent when a non-default color is set", () => {
      const accent = "#c0392b";
      const html = renderPublicMenu(makeSnapshot({ venue: { accentColor: accent } }));
      expect(html).toContain(`background: ${accent}`);
    });
  });

  describe("categories", () => {
    it("renders category sections", () => {
      const html = renderPublicMenu(
        makeSnapshot({
          categories: [
            {
              id: "c1",
              nameFa: "نوشیدنی‌های گرم",
              items: [
                {
                  id: "i1",
                  nameFa: "چای نعناع",
                  nameEn: "Mint Tea",
                  description: null,
                  priceToman: 75000,
                  station: "kitchen",
                  calories: null,
                  soldOut: false,
                },
              ],
            },
          ],
        })
      );
      expect(html).toContain("نوشیدنی‌های گرم");
      expect(html).toContain("چای نعناع");
    });

    it("skips categories with no items", () => {
      const html = renderPublicMenu(
        makeSnapshot({
          categories: [
            {
              id: "c1",
              nameFa: "غذا",
              items: [],
            },
            {
              id: "c2",
              nameFa: "دسر",
              items: [
                {
                  id: "i2",
                  nameFa: "کیک هویج",
                  nameEn: null,
                  description: null,
                  priceToman: 175000,
                  station: "kitchen",
                  calories: null,
                  soldOut: false,
                },
              ],
            },
          ],
        })
      );
      expect(html).not.toContain("غذا");
      expect(html).toContain("دسر");
      expect(html).toContain("کیک هویج");
    });

    it("renders multiple categories in order", () => {
      const html = renderPublicMenu(
        makeSnapshot({
          categories: [
            {
              id: "c1",
              nameFa: "اول",
              items: [
                {
                  id: "i1",
                  nameFa: "آیتم ۱",
                  nameEn: null,
                  description: null,
                  priceToman: 10000,
                  station: "kitchen",
                  calories: null,
                  soldOut: false,
                },
              ],
            },
            {
              id: "c2",
              nameFa: "دوم",
              items: [
                {
                  id: "i2",
                  nameFa: "آیتم ۲",
                  nameEn: null,
                  description: null,
                  priceToman: 20000,
                  station: "bar",
                  calories: null,
                  soldOut: false,
                },
              ],
            },
          ],
        })
      );
      const firstIdx = html.indexOf("اول");
      const secondIdx = html.indexOf("دوم");
      expect(firstIdx).toBeGreaterThan(0);
      expect(secondIdx).toBeGreaterThan(firstIdx);
    });

    it("adds anchor id to each category section", () => {
      const html = renderPublicMenu(
        makeSnapshot({
          categories: [
            {
              id: "cat-123",
              nameFa: "قهوه",
              items: [
                {
                  id: "i1",
                  nameFa: "Latte",
                  nameEn: null,
                  description: null,
                  priceToman: 145000,
                  station: "bar",
                  calories: null,
                  soldOut: false,
                },
              ],
            },
          ],
        })
      );
      expect(html).toContain('id="cat-cat-123"');
    });
  });

  describe("items", () => {
    const categoryWithItems = {
      id: "c1",
      nameFa: "قهوه",
      items: [
        {
          id: "i1",
          nameFa: "لاته",
          nameEn: "Latte",
          description: "اسپرسو با شیر گرم",
          priceToman: 145000,
          station: "bar",
          calories: 140,
          soldOut: false,
        },
      ],
    };

    it("renders item Persian name", () => {
      const html = renderPublicMenu(makeSnapshot({ categories: [categoryWithItems] }));
      expect(extract(html, "h3")).toContain("لاته");
    });

    it("renders item English name when present", () => {
      const html = renderPublicMenu(makeSnapshot({ categories: [categoryWithItems] }));
      expect(html).toContain("Latte");
    });

    it("omits English name when null", () => {
      const cat = { ...categoryWithItems, items: [{ ...categoryWithItems.items[0], nameEn: null }] };
      const html = renderPublicMenu(makeSnapshot({ categories: [cat] }));
      const body = html.slice(html.indexOf("<body>"), html.indexOf("</body>"));
      expect(body).not.toContain("item-name-en");
    });

    it("renders description when present", () => {
      const html = renderPublicMenu(makeSnapshot({ categories: [categoryWithItems] }));
      expect(html).toContain("اسپرسو با شیر گرم");
    });

    it("omits description block when null", () => {
      const cat = { ...categoryWithItems, items: [{ ...categoryWithItems.items[0], description: null }] };
      const html = renderPublicMenu(makeSnapshot({ categories: [cat] }));
      const body = html.slice(html.indexOf("<body>"), html.indexOf("</body>"));
      expect(body).not.toContain("item-desc");
    });

    it("renders price formatted in Persian numerals", () => {
      const html = renderPublicMenu(makeSnapshot({ categories: [categoryWithItems] }));
      expect(html).toContain("۱۴۵٬۰۰۰");
    });

    it("renders price unit (تومان)", () => {
      const html = renderPublicMenu(makeSnapshot({ categories: [categoryWithItems] }));
      expect(html).toContain("تومان");
    });

    it("shows calories badge when present", () => {
      const html = renderPublicMenu(makeSnapshot({ categories: [categoryWithItems] }));
      expect(html).toContain("140 kcal");
    });

    it("omits calories badge when null", () => {
      const cat = { ...categoryWithItems, items: [{ ...categoryWithItems.items[0], calories: null }] };
      const html = renderPublicMenu(makeSnapshot({ categories: [cat] }));
      expect(html).not.toContain("kcal");
    });

    it("applies sold-out class and badge when sold out", () => {
      const cat = { ...categoryWithItems, items: [{ ...categoryWithItems.items[0], soldOut: true }] };
      const html = renderPublicMenu(makeSnapshot({ categories: [cat] }));
      expect(html).toContain("sold-out");
      expect(html).toContain("ناموجود");
    });

    it("does not show sold-out badge when item is available", () => {
      const html = renderPublicMenu(makeSnapshot({ categories: [categoryWithItems] }));
      expect(html).not.toContain("ناموجود");
    });

    it("renders multiple items within a category", () => {
      const html = renderPublicMenu(
        makeSnapshot({
          categories: [
            {
              id: "c1",
              nameFa: "نوشیدنی‌ها",
              items: [
                { id: "i1", nameFa: "چای", nameEn: null, description: null, priceToman: 50000, station: "kitchen", calories: null, soldOut: false },
                { id: "i2", nameFa: "قهوه", nameEn: null, description: null, priceToman: 80000, station: "bar", calories: null, soldOut: false },
              ],
            },
          ],
        })
      );
      expect(count(html, "item-card")).toBe(2);
    });
  });

  describe("HTML escaping", () => {
    it("escapes & in venue name", () => {
      const html = renderPublicMenu(makeSnapshot({ venue: { nameFa: "Bar & Grill" } }));
      expect(html).toContain("Bar &amp; Grill");
      expect(html).not.toContain("Bar & Gril");
    });

    it("escapes < in item name", () => {
      const html = renderPublicMenu(
        makeSnapshot({
          categories: [
            {
              id: "c1",
              nameFa: "test",
              items: [
                { id: "i1", nameFa: "<script>alert(1)</script>", nameEn: null, description: null, priceToman: 1000, station: "kitchen", calories: null, soldOut: false },
              ],
            },
          ],
        })
      );
      expect(html).toContain("&lt;script&gt;");
      expect(html).toContain("alert(1)");
    });

    it("escapes quotes in welcome message", () => {
      const html = renderPublicMenu(makeSnapshot({ venue: { welcomeMessage: 'Say "hello"' } }));
      expect(html).toContain("&quot;");
    });
  });

  describe("edge cases", () => {
    it("handles zero categories", () => {
      const html = renderPublicMenu(makeSnapshot({ categories: [] }));
      expect(html).toContain("کافه نقطه");
      expect(html).toContain("Powered by mofé");
    });

    it("handles zero-price items", () => {
      const html = renderPublicMenu(
        makeSnapshot({
          categories: [
            {
              id: "c1", nameFa: "Free", items: [
                { id: "i1", nameFa: "رایگان", nameEn: null, description: null, priceToman: 0, station: "kitchen", calories: null, soldOut: false },
              ],
            },
          ],
        })
      );
      expect(html).toContain("۰");
    });

    it("handles very long item names", () => {
      const longName = "ا".repeat(200);
      const html = renderPublicMenu(
        makeSnapshot({
          categories: [
            {
              id: "c1", nameFa: "cat", items: [
                { id: "i1", nameFa: longName, nameEn: null, description: null, priceToman: 1000, station: "kitchen", calories: null, soldOut: false },
              ],
            },
          ],
        })
      );
      expect(html).toContain(longName);
    });

    it("includes CSS styles", () => {
      const html = renderPublicMenu(makeSnapshot());
      expect(html).toContain("<style>");
      expect(html).toContain("</style>");
      expect(html).toContain(".item-card");
      expect(html).toContain(".cat-title");
      expect(html).toContain(".venue-name");
      expect(html).toContain("radial-gradient");
      expect(html).toContain(".category-pill");
    });

    it("includes print styles", () => {
      const html = renderPublicMenu(makeSnapshot());
      expect(html).toContain("@media print");
    });
  });
});

describe("renderUnavailablePage", () => {
  it("renders a valid HTML document", () => {
    const html = renderUnavailablePage("کافه نقطه");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("shows venue name", () => {
    const html = renderUnavailablePage("کافه نقطه");
    expect(html).toContain("کافه نقطه");
  });

  it("shows unavailable message", () => {
    const html = renderUnavailablePage("کافه نقطه");
    expect(html).toContain("منو در حال حاضر در دسترس نیست.");
  });

  it("sets RTL direction", () => {
    const html = renderUnavailablePage("کافه نقطه");
    expect(html).toContain('dir="rtl"');
  });

  it("includes font-face declarations", () => {
    const html = renderUnavailablePage("کافه نقطه");
    expect(html).toContain("Parastoo.woff2");
    expect(html).toContain("Vazirmatn-VariableFont_wght.ttf");
    expect(html).toContain("EBGaramond-VariableFont_wght.ttf");
  });

  it("includes brand mark and footer", () => {
    const html = renderUnavailablePage("کافه نقطه");
    expect(html).toContain("mofé");
    expect(html).toContain("Powered by mofé");
  });

  it("escapes venue name in output", () => {
    const html = renderUnavailablePage('Bar & Grill <test>');
    expect(html).toContain("Bar &amp; Grill");
    expect(html).toContain("&lt;test&gt;");
  });
});

describe("Photo mode rendering", () => {
  const photoItem = {
    id: "i1",
    nameFa: "چای نعناع",
    nameEn: null,
    description: null,
    priceToman: 75000,
    station: "kitchen",
    calories: null,
    soldOut: false,
    photoUrl: "/uploads/test-photo.webp",
  };

  it("renders img tag when photoUrl is present", () => {
    const html = renderPublicMenu(makeSnapshot({
      categories: [{ id: "c1", nameFa: "نوشیدنی", items: [photoItem] }],
    }));
    expect(html).toContain('<img');
    expect(html).toContain('src="/uploads/test-photo.webp"');
    expect(html).toContain('alt="چای نعناع"');
  });

  it("adds .photo-mode class on item-card when photoUrl present", () => {
    const html = renderPublicMenu(makeSnapshot({
      categories: [{ id: "c1", nameFa: "نوشیدنی", items: [photoItem] }],
    }));
    expect(html).toContain('class="item-card photo-mode"');
  });

  it("does NOT add .photo-mode when photoUrl is absent", () => {
    const html = renderPublicMenu(makeSnapshot({
      categories: [{
        id: "c1", nameFa: "نوشیدنی", items: [{
          id: "i1", nameFa: "چای", nameEn: null, description: null, priceToman: 1000, station: "kitchen", calories: null, soldOut: false,
        }],
      }],
    }));
    const body = html.slice(html.indexOf("<body>"), html.indexOf("</body>"));
    expect(body).not.toContain("photo-mode");
  });

  it("lazy-loads images", () => {
    const html = renderPublicMenu(makeSnapshot({
      categories: [{ id: "c1", nameFa: "نوشیدنی", items: [photoItem] }],
    }));
    expect(html).toContain('loading="lazy"');
  });
});

describe("Variant rendering", () => {
  const itemWithVariants = {
    id: "i1",
    nameFa: "قهوه",
    nameEn: null,
    description: null,
    priceToman: 50000,
    station: "bar",
    calories: null,
    soldOut: false,
    variants: [
      { nameFa: "بزرگ", nameEn: "Large", priceModifier: 15000 },
      { nameFa: "کوچک", nameEn: "Small", priceModifier: -5000 },
    ],
  };

  it("renders variant names", () => {
    const html = renderPublicMenu(makeSnapshot({
      categories: [{ id: "c1", nameFa: "قهوه", items: [itemWithVariants] }],
    }));
    expect(html).toContain("بزرگ");
    expect(html).toContain("کوچک");
  });

  it("renders variant price modifiers", () => {
    const html = renderPublicMenu(makeSnapshot({
      categories: [{ id: "c1", nameFa: "قهوه", items: [itemWithVariants] }],
    }));
    expect(html).toContain("variant-price");
  });

  it("shows positive modifier with + sign", () => {
    const html = renderPublicMenu(makeSnapshot({
      categories: [{ id: "c1", nameFa: "قهوه", items: [itemWithVariants] }],
    }));
    expect(html).toContain("+۱۵٬۰۰۰");
  });

  it("renders zero-price modifier without +/- sign", () => {
    const item = {
      ...itemWithVariants,
      variants: [{ nameFa: "عادی", nameEn: null, priceModifier: 0 }],
    };
    const html = renderPublicMenu(makeSnapshot({
      categories: [{ id: "c1", nameFa: "قهوه", items: [item] }],
    }));
    const body = html.slice(html.indexOf("<body>"), html.indexOf("</body>"));
    expect(body).not.toContain("variant-price");
  });
});

describe("Allergen rendering", () => {
  it("renders allergen badges when allergenCodes present", () => {
    const html = renderPublicMenu(makeSnapshot({
      categories: [{
        id: "c1", nameFa: "نوشیدنی", items: [{
          id: "i1", nameFa: "چای", nameEn: null, description: null, priceToman: 1000, station: "kitchen", calories: null, soldOut: false,
          allergenCodes: ["dairy", "gluten"],
        }],
      }],
    }));
    expect(html).toContain("allergen-badges");
    expect(html).toContain("badge-allergen");
  });

  it("does not show allergen section when no codes", () => {
    const html = renderPublicMenu(makeSnapshot({
      categories: [{
        id: "c1", nameFa: "نوشیدنی", items: [{
          id: "i1", nameFa: "چای", nameEn: null, description: null, priceToman: 1000, station: "kitchen", calories: null, soldOut: false,
        }],
      }],
    }));
    const body = html.slice(html.indexOf("<body>"), html.indexOf("</body>"));
    expect(body).not.toContain("allergen-badges");
  });
});

describe("OG meta tags", () => {
  it("includes og:title with venue name", () => {
    const html = renderPublicMenu(makeSnapshot());
    expect(html).toContain('<meta property="og:title"');
    expect(html).toContain('content="کافه نقطه"');
  });

  it("includes og:type", () => {
    const html = renderPublicMenu(makeSnapshot());
    expect(html).toContain('property="og:type"');
    expect(html).toContain('content="website"');
  });

  it("includes og:image when logoUrl is set", () => {
    const html = renderPublicMenu(makeSnapshot({ venue: { logoUrl: "/uploads/logo.png" } }));
    expect(html).toContain('property="og:image"');
    expect(html).toContain('content="/uploads/logo.png"');
  });

  it("omits og:image when logoUrl is null", () => {
    const html = renderPublicMenu(makeSnapshot());
    expect(html).not.toContain('property="og:image"');
  });
});

describe("esc() function edge cases", () => {
  it("escapes backticks", async () => {
    const { renderPublicMenu: render } = await import("@/lib/public-menu/renderer");
    const snapshot = {
      venue: { id: "v1", nameFa: "Test `backtick` Cafe", nameEn: null, welcomeMessage: null, accentColor: null, logoUrl: null, slug: "test" },
      categories: [],
      generatedAt: "2025-01-01T00:00:00.000Z",
    };
    const html = render(snapshot);
    expect(html).toContain("&#96;");
    expect(html).not.toContain("`backtick`");
  });

  it("removes unicode bidi characters", async () => {
    const { renderPublicMenu: render } = await import("@/lib/public-menu/renderer");
    const snapshot = {
      venue: { id: "v1", nameFa: "\u202ETest\u202C", nameEn: null, welcomeMessage: null, accentColor: null, logoUrl: null, slug: "test" },
      categories: [],
      generatedAt: "2025-01-01T00:00:00.000Z",
    };
    const html = render(snapshot);
    expect(html).not.toContain("\u202E");
  });
});

describe("resolveUrl() function", () => {
  it("resolves relative URL with baseUrl", async () => {
    const { renderPublicMenu: render } = await import("@/lib/public-menu/renderer");
    const snapshot = {
      venue: { id: "v1", nameFa: "Test", nameEn: null, welcomeMessage: null, accentColor: null, logoUrl: "/uploads/img.png", slug: "test" },
      categories: [{
        id: "c1", nameFa: "cat", items: [{
          id: "i1", nameFa: "item", nameEn: null, description: null, priceToman: 1000, station: "kitchen", calories: null, soldOut: false,
          photoUrl: "/uploads/photo.png",
        }],
      }],
      generatedAt: "2025-01-01T00:00:00.000Z",
    };
    const html = render(snapshot);
    expect(html).toContain('src="/uploads/photo.png"');
  });

  it("passes through absolute URLs unchanged", async () => {
    const { renderPublicMenu: render } = await import("@/lib/public-menu/renderer");
    const snapshot = {
      venue: { id: "v1", nameFa: "Test", nameEn: null, welcomeMessage: null, accentColor: null, logoUrl: "https://cdn.example.com/logo.png", slug: "test" },
      categories: [],
      generatedAt: "2025-01-01T00:00:00.000Z",
    };
    const html = render(snapshot);
    expect(html).toContain("https://cdn.example.com/logo.png");
  });
});

describe("Empty states", () => {
  it("shows no items message when no categories have items", () => {
    const html = renderPublicMenu(makeSnapshot({
      categories: [{ id: "c1", nameFa: "غذا", items: [] }],
    }));
    expect(html).toContain("آیتمی برای نمایش وجود ندارد");
  });

  it("does not show categories section when all empty", () => {
    const html = renderPublicMenu(makeSnapshot({
      categories: [
        { id: "c1", nameFa: "غذا", items: [] },
        { id: "c2", nameFa: "نوشیدنی", items: [] },
      ],
    }));
    expect(html).not.toContain(">غذا<");
    expect(html).not.toContain(">نوشیدنی<");
  });
});

describe("Edge cases", () => {
  it("renders priceToman = 0", () => {
    const html = renderPublicMenu(makeSnapshot({
      categories: [{
        id: "c1", nameFa: "رایگان", items: [{
          id: "i1", nameFa: "رایگان", nameEn: null, description: null, priceToman: 0, station: "kitchen", calories: null, soldOut: false,
        }],
      }],
    }));
    expect(html).toContain("۰");
  });

  it("handles station with special characters without crashing", () => {
    const html = renderPublicMenu(makeSnapshot({
      categories: [{
        id: "c1", nameFa: "تست", items: [{
          id: "i1", nameFa: "آیتم", nameEn: null, description: null, priceToman: 1000, station: "kitchen & bar", calories: null, soldOut: false,
        }],
      }],
    }));
    expect(html).toContain("آیتم");
    expect(html).toContain("کافه نقطه");
  });
});
