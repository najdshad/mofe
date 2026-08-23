import { readFile } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { buildPublicSnapshot } from "@/lib/public-menu/publication";
import { renderPublicMenu } from "@/lib/public-menu/renderer";
import { uploadsDir } from "@/lib/storage";

const PUBLIC_ASSET_ROOT = resolve(process.cwd(), "public");
const FONT_ASSET_ROOT = resolve(PUBLIC_ASSET_ROOT, "fonts");
const UPLOAD_ASSET_ROOT = resolve(uploadsDir);

const MIME_TYPES: Record<string, string> = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  ttf: "font/ttf",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
};

export interface InlineMenuAssetsResult {
  html: string;
  inlinedUrls: string[];
  missingUrls: string[];
}

function isInside(root: string, filePath: string): boolean {
  const relativePath = relative(root, filePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

function localAssetPath(url: string): string | null {
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.split(/[?#]/, 1)[0]);
  } catch {
    return null;
  }

  if (pathname.startsWith("/fonts/")) {
    const filePath = resolve(FONT_ASSET_ROOT, pathname.slice("/fonts/".length));
    return isInside(FONT_ASSET_ROOT, filePath) ? filePath : null;
  }

  if (pathname.startsWith("/api/uploads/")) {
    const filePath = resolve(UPLOAD_ASSET_ROOT, pathname.slice("/api/uploads/".length));
    return isInside(UPLOAD_ASSET_ROOT, filePath) ? filePath : null;
  }

  return null;
}

function mimeTypeFor(filePath: string): string {
  return MIME_TYPES[extname(filePath).slice(1).toLowerCase()] ?? "application/octet-stream";
}

function assetUrlsIn(html: string): string[] {
  const urls = new Set<string>();
  const patterns = [
    /url\(\s*["'](\/[^"')]+)["']\s*\)/g,
    /(?:src|href|content)=["'](\/[^"']+)["']/g,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      if (match[1]) urls.add(match[1]);
    }
  }

  return [...urls];
}

async function toDataUrl(filePath: string): Promise<string> {
  const contents = await readFile(filePath);
  return `data:${mimeTypeFor(filePath)};base64,${contents.toString("base64")}`;
}

/**
 * Replaces references to mofé's local fonts and uploads with data URLs.
 *
 * External URLs and missing local files are left untouched and reported so
 * callers can decide whether a partially standalone document is acceptable.
 */
export async function inlineMenuAssets(html: string): Promise<InlineMenuAssetsResult> {
  const inlinedUrls: string[] = [];
  const missingUrls: string[] = [];
  const replacements = new Map<string, string>();

  for (const url of assetUrlsIn(html)) {
    const filePath = localAssetPath(url);
    if (!filePath) continue;

    try {
      replacements.set(url, await toDataUrl(filePath));
      inlinedUrls.push(url);
    } catch {
      missingUrls.push(url);
    }
  }

  let standaloneHtml = html;
  for (const [url, replacement] of replacements) {
    standaloneHtml = standaloneHtml.split(url).join(replacement);
  }

  return { html: standaloneHtml, inlinedUrls, missingUrls };
}

/**
 * Builds the same current public menu page served at /m/:slug and inlines
 * local assets so it can be opened or shared as one HTML file.
 */
export async function buildStandaloneMenuHtml(venueSlug: string): Promise<InlineMenuAssetsResult | null> {
  const snapshot = await buildPublicSnapshot(venueSlug);
  if (!snapshot) return null;

  return inlineMenuAssets(renderPublicMenu(snapshot));
}

export function defaultMenuDownloadPath(venueSlug: string): string {
  const safeSlug = venueSlug.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return join(process.cwd(), safeSlug ? `${safeSlug}-menu.html` : "menu.html");
}
