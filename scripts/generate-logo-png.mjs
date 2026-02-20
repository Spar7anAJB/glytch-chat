import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const WIDTH = 1024;
const HEIGHT = 1024;
const pixels = new Uint8ClampedArray(WIDTH * HEIGHT * 4);

const PALETTE = {
  voidBlack: [0x0b, 0x0f, 0x1a],
  deepSlate: [0x1a, 0x1f, 0x2e],
  neonViolet: [0x8b, 0x5c, 0xf6],
  hotMagenta: [0xec, 0x48, 0x99],
  electricCyan: [0x22, 0xd3, 0xee],
  glitchBlue: [0x3b, 0x82, 0xf6],
  softWhite: [0xf3, 0xf4, 0xf6],
};

function clamp(value, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value));
}

function mixColor(a, b, t) {
  const clamped = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * clamped),
    Math.round(a[1] + (b[1] - a[1]) * clamped),
    Math.round(a[2] + (b[2] - a[2]) * clamped),
  ];
}

function setPixel(x, y, color, alpha = 255) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  const index = (y * WIDTH + x) * 4;
  const srcA = clamp(alpha) / 255;
  const dstA = pixels[index + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);

  if (outA <= 0) {
    pixels[index] = 0;
    pixels[index + 1] = 0;
    pixels[index + 2] = 0;
    pixels[index + 3] = 0;
    return;
  }

  const srcWeight = srcA / outA;
  const dstWeight = (dstA * (1 - srcA)) / outA;

  pixels[index] = Math.round(color[0] * srcWeight + pixels[index] * dstWeight);
  pixels[index + 1] = Math.round(color[1] * srcWeight + pixels[index + 1] * dstWeight);
  pixels[index + 2] = Math.round(color[2] * srcWeight + pixels[index + 2] * dstWeight);
  pixels[index + 3] = Math.round(outA * 255);
}

function insideRoundedRect(x, y, left, top, right, bottom, radius) {
  if (x < left || x > right || y < top || y > bottom) return false;
  const clampedX = Math.max(left + radius, Math.min(right - radius, x));
  const clampedY = Math.max(top + radius, Math.min(bottom - radius, y));
  const dx = x - clampedX;
  const dy = y - clampedY;
  return dx * dx + dy * dy <= radius * radius;
}

function bgColorAt(x, y) {
  const nx = x / (WIDTH - 1);
  const ny = y / (HEIGHT - 1);
  let color = mixColor(PALETTE.voidBlack, PALETTE.deepSlate, ny * 0.88 + nx * 0.12);

  const glowA = Math.max(0, 1 - Math.hypot(x - WIDTH * 0.32, y - HEIGHT * 0.22) / 520);
  const glowB = Math.max(0, 1 - Math.hypot(x - WIDTH * 0.72, y - HEIGHT * 0.36) / 500);
  const glowC = Math.max(0, 1 - Math.hypot(x - WIDTH * 0.5, y - HEIGHT * 0.78) / 580);

  const cyanBoost = glowA * glowA * 0.24;
  const magentaBoost = glowB * glowB * 0.2;
  const violetBoost = glowC * glowC * 0.16;

  color = [
    clamp(color[0] + PALETTE.electricCyan[0] * cyanBoost + PALETTE.hotMagenta[0] * magentaBoost + PALETTE.neonViolet[0] * violetBoost),
    clamp(color[1] + PALETTE.electricCyan[1] * cyanBoost + PALETTE.hotMagenta[1] * magentaBoost + PALETTE.neonViolet[1] * violetBoost),
    clamp(color[2] + PALETTE.electricCyan[2] * cyanBoost + PALETTE.hotMagenta[2] * magentaBoost + PALETTE.neonViolet[2] * violetBoost),
  ];
  return color;
}

function fillRoundedRect(left, top, right, bottom, radius, colorProvider, alpha = 255) {
  const yStart = Math.max(0, Math.floor(top));
  const yEnd = Math.min(HEIGHT - 1, Math.ceil(bottom));
  const xStart = Math.max(0, Math.floor(left));
  const xEnd = Math.min(WIDTH - 1, Math.ceil(right));
  for (let y = yStart; y <= yEnd; y += 1) {
    for (let x = xStart; x <= xEnd; x += 1) {
      if (!insideRoundedRect(x, y, left, top, right, bottom, radius)) continue;
      const color = typeof colorProvider === "function" ? colorProvider(x, y) : colorProvider;
      setPixel(x, y, color, alpha);
    }
  }
}

function fillCircle(cx, cy, radius, colorProvider, alpha = 255) {
  const r2 = radius * radius;
  const xStart = Math.max(0, Math.floor(cx - radius));
  const xEnd = Math.min(WIDTH - 1, Math.ceil(cx + radius));
  const yStart = Math.max(0, Math.floor(cy - radius));
  const yEnd = Math.min(HEIGHT - 1, Math.ceil(cy + radius));
  for (let y = yStart; y <= yEnd; y += 1) {
    for (let x = xStart; x <= xEnd; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > r2) continue;
      const color = typeof colorProvider === "function" ? colorProvider(x, y) : colorProvider;
      setPixel(x, y, color, alpha);
    }
  }
}

function drawRing(cx, cy, radius, thickness, colorProvider, alphaProvider) {
  const outer = radius + thickness / 2;
  const inner = Math.max(0, radius - thickness / 2);
  const xStart = Math.max(0, Math.floor(cx - outer));
  const xEnd = Math.min(WIDTH - 1, Math.ceil(cx + outer));
  const yStart = Math.max(0, Math.floor(cy - outer));
  const yEnd = Math.min(HEIGHT - 1, Math.ceil(cy + outer));

  for (let y = yStart; y <= yEnd; y += 1) {
    for (let x = xStart; x <= xEnd; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < inner || dist > outer) continue;
      const edge = 1 - Math.abs(dist - radius) / (thickness / 2);
      const color = colorProvider(x, y, edge, dx, dy);
      const alpha = alphaProvider ? alphaProvider(x, y, edge, dx, dy) : 255;
      setPixel(x, y, color, alpha);
    }
  }
}

function drawTrail(yCenter, x1, x2, thickness, color) {
  const half = thickness / 2;
  const top = Math.round(yCenter - half);
  const bottom = Math.round(yCenter + half);
  for (let y = top; y <= bottom; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      const edge = 1 - Math.abs(y - yCenter) / Math.max(1, half);
      setPixel(x, y, color, Math.round(220 * edge));
    }
  }
}

// Base rounded-square icon background.
fillRoundedRect(36, 36, WIDTH - 37, HEIGHT - 37, 220, (x, y) => bgColorAt(x, y), 255);

// Neon card border.
for (let y = 36; y <= HEIGHT - 37; y += 1) {
  for (let x = 36; x <= WIDTH - 37; x += 1) {
    const onOuter = insideRoundedRect(x, y, 36, 36, WIDTH - 37, HEIGHT - 37, 220);
    const onInner = insideRoundedRect(x, y, 44, 44, WIDTH - 45, HEIGHT - 45, 212);
    if (!onOuter || onInner) continue;
    const angle = (Math.atan2(y - HEIGHT / 2, x - WIDTH / 2) + Math.PI) / (2 * Math.PI);
    const border = mixColor(PALETTE.electricCyan, PALETTE.hotMagenta, angle);
    setPixel(x, y, border, 205);
  }
}

// Outer glow + primary neon ring.
drawRing(
  WIDTH / 2,
  HEIGHT / 2,
 324,
 70,
  () => PALETTE.neonViolet,
  (_x, _y, edge) => Math.round(65 * edge * edge),
);

drawRing(
  WIDTH / 2,
  HEIGHT / 2,
 322,
 42,
  (_x, _y, _edge, dx, dy) => {
    const t = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI);
    return mixColor(PALETTE.electricCyan, PALETTE.hotMagenta, t);
  },
  (_x, _y, edge) => Math.round(255 * edge),
);

drawRing(
  WIDTH / 2,
  HEIGHT / 2,
 322,
 6,
  () => PALETTE.softWhite,
  (_x, _y, edge) => Math.round(160 * edge),
);

// Main "G" glyph ring.
drawRing(
  WIDTH / 2,
  HEIGHT / 2,
 188,
 86,
  () => [248, 249, 253],
  (_x, _y, edge) => Math.round(255 * edge),
);

// Carve opening for the "G".
fillCircle(716, 388, 178, (x, y) => bgColorAt(x, y), 255);

// Horizontal "G" bar.
fillRoundedRect(502, 476, 772, 554, 24, [248, 249, 253], 255);

// Glitch trails.
drawTrail(428, 156, 336, 14, PALETTE.electricCyan);
drawTrail(474, 140, 298, 12, PALETTE.hotMagenta);
drawTrail(530, 752, 882, 12, PALETTE.glitchBlue);
drawTrail(578, 734, 862, 10, PALETTE.hotMagenta);

// Light inner bloom.
drawRing(
  WIDTH / 2,
  HEIGHT / 2,
 196,
 110,
  () => [255, 255, 255],
  (_x, _y, edge) => Math.round(20 * edge * edge),
);

function buildCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = buildCrcTable();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng() {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace

  const rowLength = WIDTH * 4 + 1;
  const raw = Buffer.alloc(rowLength * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    const rowOffset = y * rowLength;
    raw[rowOffset] = 0; // no filter
    const pixelOffset = y * WIDTH * 4;
    for (let x = 0; x < WIDTH * 4; x += 1) {
      raw[rowOffset + 1 + x] = pixels[pixelOffset + x];
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const pngBuffer = encodePng();
const outputPaths = [
  path.resolve("public", "logo-v2.png"),
  path.resolve("public", "logo.png"),
];

outputPaths.forEach((outputPath) => {
  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`Generated ${outputPath}`);
});
