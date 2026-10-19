import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const design = readFileSync(join(root, "design.html"), "utf8");
const outputPath = join(root, "migrations", "0002_seed_current_menu.sql");

const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
};

function decodeEntities(value) {
  return value.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|([a-z][a-z0-9]*));/gi,
    (entity, decimal, hex, name) => {
      if (decimal) return String.fromCodePoint(Number(decimal));
      if (hex) return String.fromCodePoint(parseInt(hex, 16));
      return NAMED_ENTITIES[name.toLowerCase()] ?? entity;
    },
  );
}

function clean(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, "")).trim();
}

function mustMatch(pattern, text, label) {
  const match = text.match(pattern);
  if (!match) throw new Error(`seed: missing ${label}`);
  return match[1];
}

const PERSIAN_DIGITS = {
  "\u06f0": "0",
  "\u06f1": "1",
  "\u06f2": "2",
  "\u06f3": "3",
  "\u06f4": "4",
  "\u06f5": "5",
  "\u06f6": "6",
  "\u06f7": "7",
  "\u06f8": "8",
  "\u06f9": "9",
  "\u0660": "0",
  "\u0661": "1",
  "\u0662": "2",
  "\u0663": "3",
  "\u0664": "4",
  "\u0665": "5",
  "\u0666": "6",
  "\u0667": "7",
  "\u0668": "8",
  "\u0669": "9",
};

function toman(value, label) {
  const latin = [...value]
    .map((char) => PERSIAN_DIGITS[char] ?? char)
    .join("");
  const digits = latin.replace(/[^0-9]/g, "");
  if (!digits) throw new Error(`seed: no price digits in ${label}: ${value}`);
  return Number(digits);
}

function splitVariantLabel(label) {
  const match = label.match(/^([\s\S]*?)\s*\(([^()]*)\)\s*$/);
  if (!match) return { nameFa: label, nameEn: null };
  return {
    nameFa: match[1].trim(),
    nameEn: match[2].trim() || null,
  };
}

const categoryBlocks = [
  ...design.matchAll(/<section class="category"[^>]*>([\s\S]*?)<\/section>/g),
].map((match) => match[1]);

if (categoryBlocks.length !== 10) {
  throw new Error(`seed: expected 10 categories, found ${categoryBlocks.length}`);
}

const categories = [];
const items = [];
const variants = [];

for (const [categoryIndex, block] of categoryBlocks.entries()) {
  const categoryID = categoryIndex + 1;
  const categoryName = clean(mustMatch(/<h2 class="cat-title">([\s\S]*?)<\/h2>/, block, "category title"));
  categories.push({ id: categoryID, nameFa: categoryName, sortOrder: categoryIndex });

  const itemBlocks = [
    ...block.matchAll(/<article class="item-card( sold-out)?">([\s\S]*?)<\/article>/g),
  ];

  for (const [itemIndex, match] of itemBlocks.entries()) {
    const isSoldOut = Boolean(match[1]);
    const body = match[2];
    const label = `${categoryName} item ${itemIndex + 1}`;

    const nameFa = clean(mustMatch(/<h3 class="item-name">([\s\S]*?)<\/h3>/, body, `${label} name`));
    const nameEnMatch = body.match(/<p class="item-name-en">([\s\S]*?)<\/p>/);
    const descriptionMatch = body.match(/<p class="item-desc">([\s\S]*?)<\/p>/);
    const price = toman(
      clean(mustMatch(/<div class="item-price">([\s\S]*?)<\/div>/, body, `${label} price`)),
      label,
    );

    const itemID = items.length + 1;
    items.push({
      id: itemID,
      categoryID,
      nameFa,
      nameEn: nameEnMatch ? clean(nameEnMatch[1]) || null : null,
      description: descriptionMatch ? clean(descriptionMatch[1]) || null : null,
      priceToman: price,
      isSoldOut,
      sortOrder: itemIndex,
    });

    const variantPattern =
      /<span class="variant-pill">([\s\S]*?)<span class="variant-price">([\s\S]*?)<\/span>\s*<\/span>/g;
    for (const [variantIndex, variant] of [...body.matchAll(variantPattern)].entries()) {
      const variantLabel = clean(variant[1]);
      const { nameFa: variantNameFa, nameEn: variantNameEn } = splitVariantLabel(variantLabel);
      variants.push({
        id: variants.length + 1,
        itemID,
        nameFa: variantNameFa,
        nameEn: variantNameEn,
        priceDelta: toman(clean(variant[2]), `${label} variant ${variantIndex + 1}`),
        sortOrder: variantIndex,
      });
    }
  }
}

const soldOutCount = items.filter((item) => item.isSoldOut).length;
if (categories.length !== 10) throw new Error(`seed: expected 10 categories, found ${categories.length}`);
if (items.length !== 61) throw new Error(`seed: expected 61 items, found ${items.length}`);
if (variants.length !== 6) throw new Error(`seed: expected 6 variants, found ${variants.length}`);
if (soldOutCount !== 5) throw new Error(`seed: expected 5 sold-out items, found ${soldOutCount}`);

const logoMatch = design.match(/<img class="logo-mark"[\s\S]*?src="([^"]+)"/);
if (!logoMatch) throw new Error("seed: missing logo data URI");
const logoDataUrl = decodeEntities(logoMatch[1]);
if (!logoDataUrl.startsWith("data:image/")) {
  throw new Error("seed: logo is not a data:image URI");
}

const sqlString = (value) =>
  value == null ? "NULL" : `'${String(value).replace(/'/g, "''")}'`;

const lines = [
  "PRAGMA foreign_keys = ON;",
  "",
  "INSERT INTO settings (id, name_fa, name_en, welcome_message, meta_description, logo_data_url) VALUES",
  `  (1, 'کافه نقطه', 'Noghteh Cafe', 'به کافه ما خوش آمدید.', 'به کافه ما خوش آمدید. — منوی کافه', ${sqlString(logoDataUrl)});`,
  "",
  "INSERT INTO categories (id, name_fa, sort_order) VALUES",
  categories
    .map((category) => `  (${category.id}, ${sqlString(category.nameFa)}, ${category.sortOrder})`)
    .join(",\n") + ";",
  "",
  "INSERT INTO items (id, category_id, name_fa, name_en, description, price_toman, is_sold_out, sort_order) VALUES",
  items
    .map(
      (item) =>
        `  (${item.id}, ${item.categoryID}, ${sqlString(item.nameFa)}, ${sqlString(item.nameEn)}, ${sqlString(item.description)}, ${item.priceToman}, ${item.isSoldOut ? 1 : 0}, ${item.sortOrder})`,
    )
    .join(",\n") + ";",
  "",
  "INSERT INTO variants (id, item_id, name_fa, name_en, price_delta, sort_order) VALUES",
  variants
    .map(
      (variant) =>
        `  (${variant.id}, ${variant.itemID}, ${sqlString(variant.nameFa)}, ${sqlString(variant.nameEn)}, ${variant.priceDelta}, ${variant.sortOrder})`,
    )
    .join(",\n") + ";",
  "",
];

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, lines.join("\n"));
console.log(
  `Wrote ${outputPath}: ${categories.length} categories, ${items.length} items, ${variants.length} variants, ${soldOutCount} sold-out`,
);
