// Generiert PWA-Icons aus public/ma-logo.svg + public/ma-logo-maskable.svg.
// Dateinamen matchen die in vite.config.js manifest.icons + index.html
// Apple-Touch-Icon-Link. Einmal nach Logo-Änderungen ausführen:
//   node scripts/gen-icons.mjs

import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(resolve(root, "public/ma-logo.svg"));
const svgMask = readFileSync(resolve(root, "public/ma-logo-maskable.svg"));

const targets = [
  { name: "pwa-192x192.png", size: 192, src: svg },
  { name: "pwa-512x512.png", size: 512, src: svg },
  { name: "pwa-512x512-maskable.png", size: 512, src: svgMask },
  { name: "apple-touch-icon.png", size: 180, src: svg },
  { name: "favicon-32x32.png", size: 32, src: svg },
];

for (const { name, size, src } of targets) {
  await sharp(src, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(resolve(root, "public", name));
  console.log(`✓ public/${name}  (${size}×${size})`);
}
