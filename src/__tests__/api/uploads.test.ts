import { describe, it, expect } from "vitest";
import { saveFile, deleteFile, uploadsDir } from "@/lib/storage";
import { GET } from "@/app/api/uploads/[...key]/route";
import { rm, access } from "fs/promises";

function getReq(url: string) {
  return new Request(url);
}

function params(key: string[]) {
  return { params: Promise.resolve({ key }) };
}

describe("GET /api/uploads/[...key]", () => {
  it("serves a saved file with correct content type", async () => {
    const { url } = await saveFile("upload-test.webp", Buffer.from("webp-bytes"));
    try {
      const key = url.replace("/api/uploads/", "").split("/");
      const res = await GET(getReq(`http://localhost${url}`), params(key));
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/webp");
      expect(res.headers.get("Cache-Control")).toContain("immutable");
      expect(await res.text()).toBe("webp-bytes");
    } finally {
      await deleteFile("upload-test.webp");
    }
  });

  it("creates the uploads directory when it does not exist", async () => {
    await rm(uploadsDir, { recursive: true, force: true });
    const { url } = await saveFile("fresh-clone-test.webp", Buffer.from("x"));
    try {
      await expect(access(`${uploadsDir}/fresh-clone-test.webp`)).resolves.toBeUndefined();
      const key = url.replace("/api/uploads/", "").split("/");
      const res = await GET(getReq(`http://localhost${url}`), params(key));
      expect(res.status).toBe(200);
    } finally {
      await rm(uploadsDir, { recursive: true, force: true });
    }
  });

  it("returns 404 for a missing file", async () => {
    const res = await GET(getReq("http://localhost/api/uploads/nope.webp"), params(["nope.webp"]));
    expect(res.status).toBe(404);
  });

  it("rejects path traversal", async () => {
    const res = await GET(getReq("http://localhost/api/uploads/..%2F..%2Fpackage.json"), params(["..", "..", "package.json"]));
    expect(res.status).toBe(400);
  });
});
