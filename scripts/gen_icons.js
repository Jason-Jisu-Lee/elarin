// gen_icons.js — generate Elarin app icons with bold letter E
// Run: node scripts/gen_icons.js
const Jimp = require("jimp");
const path = require("path");

const OUT = path.join(__dirname, "..", "assets");

// ── Design tokens ────────────────────────────────────────────
const BG_DARK  = 0x0D0D0DFF; // #0D0D0D  dark background
const WHITE    = 0xFFFFFFFF;
const TRNS     = 0x00000000; // transparent

// Draw a bold letter E into a Jimp image.
// padding: fraction of size to inset on each side
function drawE(img, size, color, padding = 0.18) {
  const p  = Math.round(size * padding);
  const w  = size - 2 * p;
  const h  = size - 2 * p;
  const st = Math.max(4, Math.round(w * 0.145)); // stem / bar thickness

  const x0  = p;          // left of stem
  const x1  = p + st;     // right of stem
  const xr  = p + w;      // right edge

  const y0  = p;          // top
  const y1  = p + h;      // bottom
  const ym  = p + Math.round(h / 2); // mid

  const midW = Math.round(w * 0.72);  // mid bar is slightly shorter

  const fill = (x, y, bw, bh) => {
    for (let dy = 0; dy < bh; dy++) {
      for (let dx = 0; dx < bw; dx++) {
        img.setPixelColor(color, x + dx, y + dy);
      }
    }
  };

  // vertical stem
  fill(x0, y0, x1 - x0, y1 - y0);
  // top bar
  fill(x0, y0, xr - x0, st);
  // bottom bar
  fill(x0, y1 - st, xr - x0, st);
  // middle bar
  const midTop = ym - Math.floor(st / 2);
  fill(x0, midTop, midW, st);
}

async function makeIcon(filename, size, bgColor, eColor, transparent = false) {
  const img = new Jimp(size, size, transparent ? TRNS : bgColor);
  drawE(img, size, eColor);
  await img.writeAsync(path.join(OUT, filename));
  console.log(`  wrote ${filename}`);
}

// ── Android mipmap sizes ─────────────────────────────────────
const MIPMAP_ROOT = path.join(__dirname, "..", "android", "app", "src", "main", "res");
const DENSITIES = [
  { dir: "mipmap-mdpi",    adaptive: 108, legacy: 48  },
  { dir: "mipmap-hdpi",    adaptive: 162, legacy: 72  },
  { dir: "mipmap-xhdpi",   adaptive: 216, legacy: 96  },
  { dir: "mipmap-xxhdpi",  adaptive: 324, legacy: 144 },
  { dir: "mipmap-xxxhdpi", adaptive: 432, legacy: 192 },
];

async function makeResized(destPath, size, bgColor, eColor, transparent = false, padding = undefined) {
  const img = new Jimp(size, size, transparent ? TRNS : bgColor);
  drawE(img, size, eColor, padding);
  await img.writeAsync(destPath);
}

async function genAndroidMipmaps() {
  console.log("\nGenerating Android mipmap icons...");
  const fs = require("fs");

  for (const { dir, adaptive, legacy } of DENSITIES) {
    const folder = path.join(MIPMAP_ROOT, dir);

    // Delete old .webp files
    for (const f of fs.readdirSync(folder)) {
      if (f.endsWith(".webp")) {
        fs.unlinkSync(path.join(folder, f));
        console.log(`  deleted ${dir}/${f}`);
      }
    }

    // Adaptive foreground — white E on transparent, 32% padding for Android safe zone
    // (Android shows only center 66% of foreground; 32% padding keeps E well within safe zone)
    await makeResized(path.join(folder, "ic_launcher_foreground.png"), adaptive, BG_DARK, WHITE, true, 0.32);
    // Adaptive background — solid dark
    const bgImg = new Jimp(adaptive, adaptive, BG_DARK);
    await bgImg.writeAsync(path.join(folder, "ic_launcher_background.png"));
    // Monochrome — also needs safe-zone padding
    await makeResized(path.join(folder, "ic_launcher_monochrome.png"), adaptive, WHITE, BG_DARK, false, 0.32);
    // Legacy launcher icons — flat, no safe zone math needed
    await makeResized(path.join(folder, "ic_launcher.png"), legacy, BG_DARK, WHITE);
    await makeResized(path.join(folder, "ic_launcher_round.png"), legacy, BG_DARK, WHITE);

    console.log(`  ${dir}: foreground(${adaptive}px) + legacy(${legacy}px)`);
  }
}

async function main() {
  console.log("Generating icons...");

  // Main icon — dark bg, white E
  await makeIcon("icon.png", 1024, BG_DARK, WHITE);

  // Android adaptive foreground — transparent bg, white E, 32% padding for safe zone
  const fgImg = new Jimp(1024, 1024, TRNS);
  drawE(fgImg, 1024, WHITE, 0.32);
  await fgImg.writeAsync(path.join(OUT, "android-icon-foreground.png"));
  console.log("  wrote android-icon-foreground.png");

  // Android adaptive background — solid dark fill
  const bg = new Jimp(1024, 1024, BG_DARK);
  await bg.writeAsync(path.join(OUT, "android-icon-background.png"));
  console.log("  wrote android-icon-background.png");

  // Android monochrome — white bg, dark E
  await makeIcon("android-icon-monochrome.png", 1024, WHITE, BG_DARK);

  // Splash icon — transparent bg, white E
  await makeIcon("splash-icon.png", 512, BG_DARK, WHITE, true);

  // Favicon — dark bg, white E
  await makeIcon("favicon.png", 196, BG_DARK, WHITE);

  // Android mipmap resources (directly into android/res/ dirs)
  await genAndroidMipmaps();

  console.log("\nDone.");
}

main().catch(console.error);
