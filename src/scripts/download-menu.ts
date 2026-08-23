import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildStandaloneMenuHtml,
  defaultMenuDownloadPath,
} from "@/lib/public-menu/download";
import { prisma } from "@/lib/prisma";

const USAGE = `Usage: npm run menu:download -- --slug <venue-slug> [--output <file>]

Downloads the current public menu for a venue as one standalone HTML file.

Options:
  --slug, -s    Venue slug (required)
  --output, -o  Output path (default: <slug>-menu.html)
  --help, -h    Show this help`;

interface DownloadOptions {
  slug: string;
  outputPath: string;
}

function die(message: string): never {
  console.error(message);
  process.exit(1);
}

function parseArgs(args: string[]): DownloadOptions | null {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    return null;
  }

  let slug: string | undefined;
  let outputPath: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--slug" || arg === "-s") {
      slug = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--output" || arg === "-o") {
      outputPath = args[index + 1];
      index += 1;
      continue;
    }
    die(`Unknown option: ${arg}\n\n${USAGE}`);
  }

  if (!slug) die(`Missing --slug\n\n${USAGE}`);
  if (slug.includes("/") || slug.includes("\\")) {
    die("Venue slug must not contain slashes");
  }

  return {
    slug,
    outputPath: resolve(outputPath ?? defaultMenuDownloadPath(slug)),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options) return;

  const result = await buildStandaloneMenuHtml(options.slug);
  if (!result) {
    die(`Venue not found: ${options.slug}`);
  }

  await mkdir(dirname(options.outputPath), { recursive: true });
  await writeFile(options.outputPath, result.html, "utf8");

  console.log(`Downloaded ${options.slug} to ${options.outputPath}`);
  console.log(`Inlined ${result.inlinedUrls.length} local asset(s).`);
  if (result.missingUrls.length > 0) {
    console.warn(
      `Warning: ${result.missingUrls.length} local asset(s) were not found and remain as URLs:\n` +
      result.missingUrls.map((url) => `  ${url}`).join("\n"),
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
