#!/usr/bin/env node
/**
 * Generate a simple 1024x1024 PNG icon for Tauri
 * Uses only Node.js built-ins (zlib for deflate compression)
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const SIZE = 1024;

// Create raw RGBA image data
const data = Buffer.alloc(SIZE * SIZE * 4);

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const idx = (y * SIZE + x) * 4;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const r = SIZE / 2;

    // Shield shape: clip to a rounded rectangle / shield
    const padding = SIZE * 0.08;
    const inShield = x >= padding && x <= SIZE - padding && y >= padding && y <= SIZE * 0.85;
    // Bottom point of shield
    const bottomConeY = SIZE * 0.85;
    const coneProgress = (y - bottomConeY) / (SIZE - bottomConeY);
    const coneWidth = (SIZE - 2 * padding) * (1 - coneProgress) / 2;
    const inCone = y > bottomConeY && Math.abs(x - cx) <= coneWidth;

    if (inShield || inCone) {
      // Focus Shield blue gradient
      const gradientT = y / SIZE;
      const blueR = Math.round(30 + gradientT * 20);
      const blueG = Math.round(100 + gradientT * 30);
      const blueB = Math.round(200 + gradientT * 55);

      // Inner circle (focus ring)
      const innerDist = Math.sqrt(dx * dx + (dy - SIZE * 0.05) * (dy - SIZE * 0.05));
      if (innerDist < SIZE * 0.22 && innerDist > SIZE * 0.18) {
        // White ring
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 220;
      } else if (innerDist < SIZE * 0.12) {
        // White center dot
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      } else {
        data[idx] = blueR;
        data[idx + 1] = blueG;
        data[idx + 2] = blueB;
        data[idx + 3] = 255;
      }
    } else {
      // Transparent background
      data[idx] = 0;
      data[idx + 1] = 0;
      data[idx + 2] = 0;
      data[idx + 3] = 0;
    }
  }
}

// Build PNG file
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

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, typeBytes, data, crc]);
}

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

// IDAT: apply PNG filter (none = 0) to each row
const rows = [];
for (let y = 0; y < SIZE; y++) {
  rows.push(0); // filter type 0 (None)
  for (let x = 0; x < SIZE; x++) {
    const idx = (y * SIZE + x) * 4;
    rows.push(data[idx], data[idx+1], data[idx+2], data[idx+3]);
  }
}
const rawRows = Buffer.from(rows);
const compressed = zlib.deflateSync(rawRows);

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

const outPath = path.join(__dirname, '../apps/desktop/src-tauri/app-icon.png');
fs.writeFileSync(outPath, png);
console.log(`Created icon: ${outPath} (${png.length} bytes)`);
