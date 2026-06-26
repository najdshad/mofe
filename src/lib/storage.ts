import { writeFile, unlink, access } from "fs/promises";
import { join } from "path";

export interface StorageBackend {
  save(key: string, buffer: Buffer, contentType: string): Promise<{ url: string; byteSize: number }>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

const s3Config = {
  bucket: process.env.S3_BUCKET || "",
  region: process.env.S3_REGION || "",
  endpoint: process.env.S3_ENDPOINT || "",
  accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
};

export function isS3Configured(): boolean {
  return !!(s3Config.bucket && s3Config.endpoint && s3Config.accessKeyId && s3Config.secretAccessKey);
}

const localBackend: StorageBackend = {
  async save(key: string, buffer: Buffer, contentType: string) {
    const filePath = join(UPLOADS_DIR, key);
    await writeFile(filePath, buffer);
    return { url: `/uploads/${key}`, byteSize: buffer.length };
  },
  async delete(key: string) {
    const filePath = join(UPLOADS_DIR, key);
    try {
      await access(filePath);
      await unlink(filePath);
    } catch {
      // File does not exist
    }
  },
  getUrl(key: string) {
    return `/uploads/${key}`;
  },
};

let s3Backend: StorageBackend | null = null;

async function getS3Backend(): Promise<StorageBackend> {
  if (s3Backend) return s3Backend;

  const { S3Client, PutObjectCommand, DeleteObjectCommand } = await import("@aws-sdk/client-s3");

  const client = new S3Client({
    region: s3Config.region || "default",
    endpoint: s3Config.endpoint,
    credentials: {
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  s3Backend = {
    async save(key: string, buffer: Buffer, contentType: string) {
      await client.send(
        new PutObjectCommand({
          Bucket: s3Config.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );
      const url = `${s3Config.endpoint}/${s3Config.bucket}/${key}`;
      return { url, byteSize: buffer.length };
    },
    async delete(key: string) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: s3Config.bucket,
          Key: key,
        })
      );
    },
    getUrl(key: string) {
      return `${s3Config.endpoint}/${s3Config.bucket}/${key}`;
    },
  };

  return s3Backend;
}

export async function getStorage(): Promise<StorageBackend> {
  if (isS3Configured()) {
    return getS3Backend();
  }
  return localBackend;
}
