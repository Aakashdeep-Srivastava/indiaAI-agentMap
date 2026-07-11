/**
 * Brand icon pipeline — regenerates every device icon from the master
 * handshake-M artwork using sharp.
 *
 *   node scripts/generate-icons.mjs
 *
 * Outputs:
 *   public/logo-mark.png        512  square brand mark (navbar/footer/sidebar)
 *   app/icon.png                192  favicon (Next.js app-router convention)
 *   app/apple-icon.png          180  apple-touch-icon convention
 *   public/icon-192.png         192  PWA manifest
 *   public/icon-256.png         256  PWA manifest
 *   public/icon-384.png         384  PWA manifest
 *   public/icon-512.png         512  PWA manifest + OG/JSON-LD image
 *   public/icon-512-maskable.png 512 PWA maskable (safe-zone padded)
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MASTER = path.join(root, "assets", "logo-original.png");

/* The master is 1536x1024 with the emblem centred; crop to its square */
const CROP = { left: 408, top: 110, width: 750, height: 750 };

const mark = sharp(MASTER).extract(CROP);

const OUT = [
  { file: "public/logo-mark.png", size: 512 },
  { file: "app/icon.png", size: 192 },
  { file: "app/apple-icon.png", size: 180 },
  { file: "public/icon-192.png", size: 192 },
  { file: "public/icon-256.png", size: 256 },
  { file: "public/icon-384.png", size: 384 },
  { file: "public/icon-512.png", size: 512 },
];

for (const { file, size } of OUT) {
  await mark
    .clone()
    .resize(size, size, { kernel: "lanczos3" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(root, file));
  console.log(`${file} (${size}x${size})`);
}

/* Maskable: shrink the mark to ~78% and pad on white so launcher masks
 * (circle/squircle) never clip the handshake. */
const inner = 400;
const pad = Math.round((512 - inner) / 2);
await mark
  .clone()
  .resize(inner, inner, { kernel: "lanczos3" })
  .extend({
    top: pad,
    bottom: pad,
    left: pad,
    right: pad,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  })
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, "public", "icon-512-maskable.png"));
console.log("public/icon-512-maskable.png (512x512, maskable)");
