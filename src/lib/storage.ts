import { writeFile, unlink, access } from "fs/promises";
import { join } from "path";

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

export async function saveFile(key: string, buffer: Buffer): Promise<{ url: string; byteSize: number }> {
  const filePath = join(UPLOADS_DIR, key);
  await writeFile(filePath, buffer);
  return { url: `/uploads/${key}`, byteSize: buffer.length };
}

export async function deleteFile(key: string): Promise<void> {
  const filePath = join(UPLOADS_DIR, key);
  try {
    await access(filePath);
    await unlink(filePath);
  } catch {
    // File does not exist; nothing to delete
  }
}
