import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, resolve } from "path";
import { uploadsDir } from "@/lib/storage";

const MIME: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const filePath = resolve(uploadsDir, join(...key));
  if (!filePath.startsWith(uploadsDir)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const buffer = await readFile(filePath);
    const ext = key[key.length - 1]?.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
