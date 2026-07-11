import sharp from "sharp";

const QUALITY_MIN = 30;

export async function compressToTarget(
  buffer: Buffer,
  maxDim: number,
  maxBytes: number,
): Promise<Buffer> {
  for (let dim = maxDim; dim >= 200; dim -= 100) {
    let low = QUALITY_MIN;
    let high = 95;
    let best: Buffer | null = null;

    while (low <= high) {
      const mid = Math.round((low + high) / 2);
      const compressed = await sharp(buffer)
        .resize(dim, dim, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: mid })
        .toBuffer();

      if (compressed.length <= maxBytes) {
        best = compressed;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (best) return best;
  }

  throw new Error("Could not compress image to under 50KB");
}

export const MAX_SIZE_BYTES = 50 * 1024;
export const MAX_DIMENSION = 500;
