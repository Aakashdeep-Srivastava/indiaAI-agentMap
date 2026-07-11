/**
 * Crops the photographic hero band (entrepreneurs + handshake-M) out of the
 * footer artwork and emits an optimized web asset.
 *
 *   node scripts/generate-footer-hero.mjs <source.png>
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = process.argv[2] ?? path.join(root, "assets", "footer-art.png");

const img = sharp(src);
const { width, height } = await img.metadata();
console.log(`source: ${width}x${height}`);

/* The photographic band is the top ~66% — the cream link panel below is
 * rebuilt in JSX, not shipped as pixels. */
const bandHeight = Math.round(height * 0.663);

await img
  .extract({ left: 0, top: 0, width, height: bandHeight })
  .webp({ quality: 82 })
  .toFile(path.join(root, "public", "footer-hero.webp"));
console.log(`public/footer-hero.webp (${width}x${bandHeight})`);
