import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = join(root, "design.html");
const outputPath = join(root, "src", "menu.template.html");

let html = readFileSync(inputPath, "utf8");

function replace(label, pattern, replacement, expected = 1) {
  let count = 0;
  const next = html.replace(pattern, () => {
    count++;
    return replacement;
  });
  if (count !== expected) {
    throw new Error(
      `build-template: ${label}: expected ${expected} match(es), found ${count}`,
    );
  }
  html = next;
}

// The ten category sections are one contiguous block ending before the footer.
const firstSection = html.indexOf('<section class="category"');
const footer = html.indexOf('<div class="footer"');
const lastSectionClose = html.lastIndexOf("</section>", footer);
if (firstSection === -1 || footer === -1 || lastSectionClose < firstSection) {
  throw new Error("build-template: could not locate category sections or footer");
}
html =
  html.slice(0, firstSection) +
  "<!--SECTIONS-->" +
  html.slice(lastSectionClose + "</section>".length);

replace(
  "nav",
  /<nav class="category-nav"[\s\S]*?<\/nav>/g,
  "<!--NAV-->",
);

replace("title", /<title>[^<]*<\/title>/g, "<title><!--TITLE--></title>");

replace(
  "meta description",
  /<meta name="description" content="[^"]*"\s*\/>/g,
  '<meta name="description" content="<!--META_DESCRIPTION-->" />',
);

replace(
  "og:description",
  /<meta property="og:description" content="[^"]*"\s*\/>/g,
  '<meta property="og:description" content="<!--META_DESCRIPTION-->" />',
);

replace(
  "og:title",
  /<meta property="og:title" content="[^"]*"\s*\/>/g,
  '<meta property="og:title" content="<!--NAME_FA-->" />',
);

replace(
  "venue name",
  /<h1 class="venue-name">[\s\S]*?<\/h1>/g,
  '<h1 class="venue-name"><!--NAME_FA--></h1>',
);

replace(
  "venue name en",
  /<p class="venue-name-en">[\s\S]*?<\/p>/g,
  "<!--NAME_EN-->",
);

replace("welcome", /<p class="welcome">[\s\S]*?<\/p>/g, "<!--WELCOME-->");

replace("logo", /<img class="logo-mark"[\s\S]*?\/>/g, "<!--LOGO-->");

const expected = {
  TITLE: 1,
  META_DESCRIPTION: 2,
  NAME_FA: 2,
  NAME_EN: 1,
  WELCOME: 1,
  LOGO: 1,
  NAV: 1,
  SECTIONS: 1,
};

for (const [name, count] of Object.entries(expected)) {
  const marker = `<!--${name}-->`;
  const actual = html.split(marker).length - 1;
  if (actual !== count) {
    throw new Error(
      `build-template: ${marker}: expected ${count}, found ${actual}`,
    );
  }
}

html = html.replace(/[ \t]+$/gm, "");

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html);
console.log(`Wrote ${outputPath} (${html.length} bytes)`);
