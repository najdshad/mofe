import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const design = readFileSync(join(root, "design.html"), "utf8");

const blocks = [...design.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)].map(
  (match) => match[1],
);

if (blocks.length !== 2) {
  throw new Error(`extract-fonts: expected 2 @font-face blocks, found ${blocks.length}`);
}

const fonts = new Map();
for (const block of blocks) {
  const weight = block.match(/font-weight:\s*(normal|bold)/)?.[1];
  const payload = block.match(/data:font\/woff2;base64,([^"')\s]+)/)?.[1];
  if (!weight || !payload) {
    throw new Error("extract-fonts: invalid woff2 @font-face block");
  }
  if (fonts.has(weight)) {
    throw new Error(`extract-fonts: duplicate font-weight ${weight}`);
  }
  const buffer = Buffer.from(payload, "base64");
  if (buffer.length === 0) {
    throw new Error(`extract-fonts: empty font payload for ${weight}`);
  }
  fonts.set(weight, buffer);
}

const outDir = join(root, "public", "fonts");
mkdirSync(outDir, { recursive: true });

for (const [weight, file] of [
  ["normal", "Parastoo-Regular.woff2"],
  ["bold", "Parastoo-Bold.woff2"],
]) {
  const buffer = fonts.get(weight);
  if (!buffer) throw new Error(`extract-fonts: missing ${weight} font`);
  const path = join(outDir, file);
  writeFileSync(path, buffer);
  console.log(`Wrote ${path} (${buffer.length} bytes)`);
}
