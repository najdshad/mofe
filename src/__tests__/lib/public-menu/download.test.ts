import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  defaultMenuDownloadPath,
  inlineMenuAssets,
} from "@/lib/public-menu/download";
import { uploadsDir } from "@/lib/storage";

const TEST_UPLOAD = join(uploadsDir, "download-menu-test.webp");

describe("public menu download helpers", () => {
  afterEach(async () => {
    await unlink(TEST_UPLOAD).catch(() => undefined);
  });

  it("inlines self-hosted fonts and uploaded images", async () => {
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(TEST_UPLOAD, Buffer.from("test image"));

    const result = await inlineMenuAssets(`
      <style>@font-face { src: url("/fonts/Parastoo.woff2") }</style>
      <img src="/api/uploads/download-menu-test.webp" />
    `);

    expect(result.missingUrls).toEqual([]);
    expect(result.inlinedUrls).toEqual([
      "/fonts/Parastoo.woff2",
      "/api/uploads/download-menu-test.webp",
    ]);
    expect(result.html).toContain("data:font/woff2;base64,");
    expect(result.html).toContain("data:image/webp;base64,dGVzdCBpbWFnZQ==");
    expect(result.html).not.toContain("/fonts/Parastoo.woff2");
    expect(result.html).not.toContain("/api/uploads/download-menu-test.webp");
  });

  it("reports missing local assets and preserves external URLs", async () => {
    const result = await inlineMenuAssets(`
      <img src="/api/uploads/missing.webp" />
      <img src="https://example.com/logo.webp" />
    `);

    expect(result.inlinedUrls).toEqual([]);
    expect(result.missingUrls).toEqual(["/api/uploads/missing.webp"]);
    expect(result.html).toContain('/api/uploads/missing.webp');
    expect(result.html).toContain("https://example.com/logo.webp");
  });

  it("creates a safe default filename", () => {
    expect(defaultMenuDownloadPath("noghteh-test")).toMatch(/noghteh-test-menu\.html$/);
    expect(defaultMenuDownloadPath("کافه نقطه")).toMatch(/menu\.html$/);
  });
});
