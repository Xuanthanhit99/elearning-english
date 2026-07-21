// One-off script to derive favicon/PWA/OG assets from the new Lumiverse
// logo source files. Run with: node scripts/_gen-logo-assets.js
// (temporary script, safe to delete after running)
const path = require("path");
const sharp = require("sharp");

const ROOT = __dirname + "/..";
const SRC_ICON = path.join(ROOT, "public/loho/app-icon.png");
const SRC_LOGO = path.join(ROOT, "public/loho/logo-chinh.png");

const BRAND_BG = { r: 1, g: 3, b: 28 }; // sampled from logo-chinh.png background

async function findOpaqueBBox(file, threshold = 200) {
  const img = sharp(file);
  const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const a = data[(y * width + x) * channels + 3];
      if (a >= threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, maxX, minY, maxY };
}

function packIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + 16 * count;
  let offset = headerSize;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const entries = [];
  for (const { size, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buffer.length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map((p) => p.buffer)]);
}

async function main() {
  const bbox = await findOpaqueBBox(SRC_ICON, 200);
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  const half = Math.round((Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY) / 2) * 1.04);
  const left = Math.max(0, Math.round(cx - half));
  const top = Math.max(0, Math.round(cy - half));
  const side = half * 2;
  console.log("icon crop box", { left, top, side });

  const iconSquare = sharp(SRC_ICON).extract({ left, top, width: side, height: side });

  await iconSquare.clone().resize(512, 512).png().toFile(path.join(ROOT, "public/loho/icon.png"));

  await iconSquare.clone().resize(16, 16).png().toFile(path.join(ROOT, "public/favicon-16x16.png"));
  await iconSquare.clone().resize(32, 32).png().toFile(path.join(ROOT, "public/favicon-32x32.png"));
  const ico48 = await iconSquare.clone().resize(48, 48).png().toBuffer();

  await iconSquare
    .clone()
    .resize(180, 180)
    .flatten({ background: BRAND_BG })
    .png()
    .toFile(path.join(ROOT, "public/apple-touch-icon.png"));

  await iconSquare.clone().resize(192, 192).png().toFile(path.join(ROOT, "public/icon-192.png"));
  await iconSquare.clone().resize(512, 512).png().toFile(path.join(ROOT, "public/icon-512.png"));
  await iconSquare
    .clone()
    .resize(512, 512)
    .flatten({ background: BRAND_BG })
    .png()
    .toFile(path.join(ROOT, "public/icon-512-maskable.png"));

  const png16 = await iconSquare.clone().resize(16, 16).png().toBuffer();
  const png32 = await iconSquare.clone().resize(32, 32).png().toBuffer();
  const icoBuffer = packIco([
    { size: 16, buffer: png16 },
    { size: 32, buffer: png32 },
    { size: 48, buffer: ico48 },
  ]);
  await require("fs").promises.writeFile(path.join(ROOT, "app/favicon.ico"), icoBuffer);

  const logoMeta = await sharp(SRC_LOGO).metadata();
  const ogW = 1200;
  const ogH = 630;
  const scale = Math.min((ogW * 0.82) / logoMeta.width, (ogH * 0.82) / logoMeta.height);
  const resizedW = Math.round(logoMeta.width * scale);
  const resizedH = Math.round(logoMeta.height * scale);
  const resizedLogo = await sharp(SRC_LOGO).resize(resizedW, resizedH).png().toBuffer();

  await sharp({
    create: { width: ogW, height: ogH, channels: 3, background: BRAND_BG },
  })
    .composite([{ input: resizedLogo, left: Math.round((ogW - resizedW) / 2), top: Math.round((ogH - resizedH) / 2) }])
    .png()
    .toFile(path.join(ROOT, "public/loho/og-image.png"));

  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
