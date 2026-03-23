#!/usr/bin/env node
/**
 * Generate Focus Shield app icons — all sizes for Tauri + browser extension.
 * Shield shape with a prohibition/block symbol inside.
 * Pure Node.js (zlib only).
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const SRC_SIZE = 1024;
const AA_SAMPLES = 4; // 4x4 supersampling for anti-aliasing

// ── Color palette ──
const COLORS = {
  shieldTop: [22, 78, 204],      // deep blue
  shieldBot: [56, 132, 244],     // lighter blue
  highlight: [90, 160, 255],     // edge highlight
  symbolWhite: [255, 255, 255],
  shadow: [12, 50, 140],
};

// ── SDF helpers (signed distance functions) ──

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Shield SDF: rounded top rectangle + pointed bottom
function sdfShield(x, y, cx, cy, w, h, pointDepth, cornerR) {
  // Normalize to shield-local coords
  const lx = x - (cx - w / 2);
  const ly = y - (cy - h / 2);
  const totalH = h + pointDepth;

  // Outside bounding box entirely
  if (ly < 0 || ly > totalH || lx < 0 || lx > w) {
    // Approximate distance
    const dx = lx < 0 ? -lx : lx > w ? lx - w : 0;
    const dy = ly < 0 ? -ly : ly > totalH ? ly - totalH : 0;
    return Math.sqrt(dx * dx + dy * dy);
  }

  if (ly <= h) {
    // Rectangular part with rounded top corners
    let dist = 0;
    // Distance to left/right edges
    const dLeft = lx;
    const dRight = w - lx;
    const dTop = ly;
    const dBot = h - ly;
    dist = -Math.min(dLeft, dRight, dTop, dBot);

    // Round top corners
    if (ly < cornerR && (lx < cornerR || lx > w - cornerR)) {
      const ccx = lx < cornerR ? cornerR : w - cornerR;
      const ccy = cornerR;
      const cd = Math.sqrt((lx - ccx) ** 2 + (ly - ccy) ** 2);
      dist = cd - cornerR;
    }
    return dist;
  } else {
    // Pointed bottom triangle
    const progress = (ly - h) / pointDepth;
    const halfW = (w / 2) * (1 - progress);
    const relX = lx - w / 2;
    if (Math.abs(relX) <= halfW) {
      // Inside the triangle — distance to nearest edge
      const dEdge = halfW - Math.abs(relX);
      const dBottom = pointDepth - (ly - h);
      // Distance to sloped edge (more accurate)
      const edgeLen = Math.sqrt((w / 2) ** 2 + pointDepth ** 2);
      const nx = pointDepth / edgeLen;
      const ny = (w / 2) / edgeLen;
      const slopeDist = (halfW - Math.abs(relX)) * nx;
      return -Math.min(slopeDist, dBottom);
    } else {
      // Outside triangle sides
      return Math.abs(relX) - halfW;
    }
  }
}

// Circle SDF
function sdfCircle(x, y, cx, cy, r) {
  return Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) - r;
}

// Ring SDF (annulus)
function sdfRing(x, y, cx, cy, outerR, thickness) {
  const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  return Math.abs(d - (outerR - thickness / 2)) - thickness / 2;
}

// Rotated rectangle (for the diagonal slash)
function sdfRotatedRect(x, y, cx, cy, w, h, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = x - cx;
  const dy = y - cy;
  const rx = Math.abs(dx * cos + dy * sin);
  const ry = Math.abs(-dx * sin + dy * cos);
  const qx = Math.max(rx - w / 2, 0);
  const qy = Math.max(ry - h / 2, 0);
  const inside = Math.max(rx - w / 2, ry - h / 2);
  if (inside < 0) return inside;
  return Math.sqrt(qx * qx + qy * qy);
}

// ── Render a single pixel with supersampling ──
function samplePixel(px, py, size) {
  let r = 0, g = 0, b = 0, a = 0;
  const sub = AA_SAMPLES;

  for (let sy = 0; sy < sub; sy++) {
    for (let sx = 0; sx < sub; sx++) {
      const x = px + (sx + 0.5) / sub;
      const y = py + (sy + 0.5) / sub;
      const [sr, sg, sb, sa] = samplePoint(x, y, size);
      r += sr; g += sg; b += sb; a += sa;
    }
  }

  const n = sub * sub;
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n), Math.round(a / n)];
}

function samplePoint(x, y, size) {
  const cx = size / 2;
  const cy = size * 0.46; // shield center shifted up slightly
  const shieldW = size * 0.78;
  const shieldH = size * 0.52;
  const pointDepth = size * 0.28;
  const cornerR = size * 0.06;

  const shieldD = sdfShield(x, y, cx, cy, shieldW, shieldH, pointDepth, cornerR);

  if (shieldD > size * 0.02) {
    return [0, 0, 0, 0]; // outside shield — transparent
  }

  // Shield fill with gradient
  const totalShieldH = shieldH + pointDepth;
  const shieldTop = cy - shieldH / 2;
  const gradT = clamp((y - shieldTop) / totalShieldH, 0, 1);
  let sr = lerp(COLORS.shieldTop[0], COLORS.shieldBot[0], gradT);
  let sg = lerp(COLORS.shieldTop[1], COLORS.shieldBot[1], gradT);
  let sb = lerp(COLORS.shieldTop[2], COLORS.shieldBot[2], gradT);

  // Subtle radial highlight from top-left
  const hlDist = Math.sqrt((x - size * 0.35) ** 2 + (y - size * 0.25) ** 2) / size;
  const hlFactor = smoothstep(0.5, 0.0, hlDist) * 0.15;
  sr = lerp(sr, COLORS.highlight[0], hlFactor);
  sg = lerp(sg, COLORS.highlight[1], hlFactor);
  sb = lerp(sb, COLORS.highlight[2], hlFactor);

  // Subtle inner shadow at edges
  const edgeShadow = smoothstep(0, size * 0.04, -shieldD) * 0.12;
  sr = lerp(COLORS.shadow[0], sr, clamp(edgeShadow + 0.88, 0, 1));
  sg = lerp(COLORS.shadow[1], sg, clamp(edgeShadow + 0.88, 0, 1));
  sb = lerp(COLORS.shadow[2], sb, clamp(edgeShadow + 0.88, 0, 1));

  // Anti-aliased shield edge
  let shieldAlpha = smoothstep(size * 0.01, -size * 0.005, shieldD);

  // ── Prohibition symbol (circle + diagonal slash) ──
  const symCx = cx;
  const symCy = cy + size * 0.03; // centered in shield
  const outerR = size * 0.22;
  const ringThick = size * 0.045;
  const slashW = size * 0.045;
  const slashH = outerR * 2.15;
  const slashAngle = -Math.PI / 4; // 45 degrees

  const ringD = sdfRing(x, y, symCx, symCy, outerR, ringThick);
  const slashD = sdfRotatedRect(x, y, symCx, symCy, slashW, slashH, slashAngle);

  // The slash should only show within the outer circle bounds
  const circleD = sdfCircle(x, y, symCx, symCy, outerR + ringThick * 0.1);
  const slashInCircle = Math.max(slashD, circleD);

  // Combine ring and slash
  const symbolD = Math.min(ringD, slashInCircle);

  // Symbol is white, anti-aliased
  const symbolAlpha = smoothstep(size * 0.008, -size * 0.004, symbolD);

  if (symbolAlpha > 0.01) {
    // Blend white symbol over shield
    const wa = symbolAlpha * 0.95; // slight translucency for depth
    sr = lerp(sr, COLORS.symbolWhite[0], wa);
    sg = lerp(sg, COLORS.symbolWhite[1], wa);
    sb = lerp(sb, COLORS.symbolWhite[2], wa);
  }

  return [
    clamp(Math.round(sr), 0, 255),
    clamp(Math.round(sg), 0, 255),
    clamp(Math.round(sb), 0, 255),
    clamp(Math.round(shieldAlpha * 255), 0, 255),
  ];
}

// ── PNG encoder (minimal, correct) ──
function crc32(buf) {
  let crc = 0xffffffff;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, typeBytes, data, crc]);
}

function encodePNG(pixels, width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const rowBytes = width * 4 + 1;
  const raw = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowBytes] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * rowBytes + 1 + x * 4;
      raw[dstIdx] = pixels[srcIdx];
      raw[dstIdx + 1] = pixels[srcIdx + 1];
      raw[dstIdx + 2] = pixels[srcIdx + 2];
      raw[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Render at a given size ──
function render(size) {
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = samplePixel(x, y, size);
      const idx = (y * size + x) * 4;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = a;
    }
  }

  return encodePNG(pixels, size, size);
}

// ── Downscale from source (better quality than rendering small directly) ──
function renderSource() {
  console.log(`Rendering ${SRC_SIZE}x${SRC_SIZE} source icon...`);
  const pixels = Buffer.alloc(SRC_SIZE * SRC_SIZE * 4);

  for (let y = 0; y < SRC_SIZE; y++) {
    for (let x = 0; x < SRC_SIZE; x++) {
      const [r, g, b, a] = samplePixel(x, y, SRC_SIZE);
      const idx = (y * SRC_SIZE + x) * 4;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = a;
    }
  }

  return pixels;
}

function downscale(srcPixels, srcSize, dstSize) {
  const scale = srcSize / dstSize;
  const dst = Buffer.alloc(dstSize * dstSize * 4);

  for (let dy = 0; dy < dstSize; dy++) {
    for (let dx = 0; dx < dstSize; dx++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      const srcX0 = Math.floor(dx * scale);
      const srcY0 = Math.floor(dy * scale);
      const srcX1 = Math.min(Math.ceil((dx + 1) * scale), srcSize);
      const srcY1 = Math.min(Math.ceil((dy + 1) * scale), srcSize);

      for (let sy = srcY0; sy < srcY1; sy++) {
        for (let sx = srcX0; sx < srcX1; sx++) {
          const idx = (sy * srcSize + sx) * 4;
          r += srcPixels[idx];
          g += srcPixels[idx + 1];
          b += srcPixels[idx + 2];
          a += srcPixels[idx + 3];
          count++;
        }
      }

      const dIdx = (dy * dstSize + dx) * 4;
      dst[dIdx] = Math.round(r / count);
      dst[dIdx + 1] = Math.round(g / count);
      dst[dIdx + 2] = Math.round(b / count);
      dst[dIdx + 3] = Math.round(a / count);
    }
  }

  return dst;
}

function saveIcon(pixels, size, filepath) {
  const png = encodePNG(pixels, size, size);
  fs.writeFileSync(filepath, png);
  console.log(`  ${path.basename(filepath)} (${size}x${size}, ${png.length} bytes)`);
}

// ── ICO encoder (multi-size) ──
function encodeICO(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const entries = [];

  for (const { size, png } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size; // width
    entry[1] = size >= 256 ? 0 : size; // height
    entry[2] = 0; // color palette
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4);  // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8); // data size
    entry.writeUInt32LE(offset, 12);    // data offset
    entries.push(entry);
    offset += png.length;
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // reserved
  header.writeUInt16LE(1, 2);     // ICO type
  header.writeUInt16LE(count, 4); // image count

  return Buffer.concat([header, ...entries, ...pngBuffers.map(b => b.png)]);
}

// ── Main ──
const rootDir = path.join(__dirname, '..');
const tauriIcons = path.join(rootDir, 'apps/desktop/src-tauri/icons');
const extIcons = path.join(rootDir, 'apps/browser-extension/icons');

const srcPixels = renderSource();

console.log('Generating Tauri icons...');

// Tauri required sizes
const tauriSizes = [
  { size: 32, name: '32x32.png' },
  { size: 64, name: '64x64.png' },
  { size: 128, name: '128x128.png' },
  { size: 256, name: '128x128@2x.png' },
  { size: 256, name: 'icon.png' },
];

for (const { size, name } of tauriSizes) {
  const px = downscale(srcPixels, SRC_SIZE, size);
  saveIcon(px, size, path.join(tauriIcons, name));
}

// Windows Store logos
const storeSizes = [
  { size: 30, name: 'Square30x30Logo.png' },
  { size: 44, name: 'Square44x44Logo.png' },
  { size: 71, name: 'Square71x71Logo.png' },
  { size: 89, name: 'Square89x89Logo.png' },
  { size: 107, name: 'Square107x107Logo.png' },
  { size: 142, name: 'Square142x142Logo.png' },
  { size: 150, name: 'Square150x150Logo.png' },
  { size: 284, name: 'Square284x284Logo.png' },
  { size: 310, name: 'Square310x310Logo.png' },
  { size: 50, name: 'StoreLogo.png' },
];

for (const { size, name } of storeSizes) {
  const px = downscale(srcPixels, SRC_SIZE, size);
  saveIcon(px, size, path.join(tauriIcons, name));
}

// ICO (16, 32, 48, 256)
console.log('Generating icon.ico...');
const icoEntries = [16, 32, 48, 256].map(size => ({
  size,
  png: encodePNG(downscale(srcPixels, SRC_SIZE, size), size, size),
}));
const ico = encodeICO(icoEntries);
fs.writeFileSync(path.join(tauriIcons, 'icon.ico'), ico);
console.log(`  icon.ico (${ico.length} bytes)`);

// ICNS placeholder — Tauri generates this from icon.png on macOS builds
// Just copy the 256px as icon.png source
const srcPng = encodePNG(downscale(srcPixels, SRC_SIZE, 512), 512, 512);
fs.writeFileSync(path.join(tauriIcons, 'icon.icns'), srcPng);
console.log('  icon.icns (placeholder — Tauri rebuilds on macOS)');

// App icon (1024px source)
const appIconPng = encodePNG(srcPixels, SRC_SIZE, SRC_SIZE);
fs.writeFileSync(path.join(rootDir, 'apps/desktop/src-tauri/app-icon.png'), appIconPng);
console.log(`  app-icon.png (${SRC_SIZE}x${SRC_SIZE}, ${appIconPng.length} bytes)`);

// Browser extension icons
console.log('Generating browser extension icons...');
if (!fs.existsSync(extIcons)) fs.mkdirSync(extIcons, { recursive: true });

for (const size of [16, 48, 128]) {
  const px = downscale(srcPixels, SRC_SIZE, size);
  saveIcon(px, size, path.join(extIcons, `icon-${size}.png`));
}

console.log('Done!');
