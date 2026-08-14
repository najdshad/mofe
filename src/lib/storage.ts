import { writeFile, unlink, access, mkdir } from "fs/promises";
import { join } from "path";

export const uploadsDir = join(process.cwd(), "data", "uploads");

export async function saveFile(key: string, buffer: Buffer): Promise<{ url: string; byteSize: number }> {
  const filePath = join(uploadsDir, key);
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(filePath, buffer);
  return { url: `/api/uploads/${key}`, byteSize: buffer.length };
}

export async function deleteFile(key: string): Promise<void> {
  const filePath = join(uploadsDir, key);
  try {
    await access(filePath);
    await unlink(filePath);
  } catch {
    // File does not exist; nothing to delete
  }
}
