// Generates the Suds & Scrub brand icon (dark purple background, glossy
// green bubbles, pixel-font wordmark) as a raw PNG with no external
// dependencies — a simple software rasterizer with anti-aliased circle
// fills and a hand-rolled 5x7 bitmap font (no font library available).
// Usage: node make-brand-icon.js <outPath> <size>
const fs = require("fs");
const zlib = require("zlib");

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function hexToRgb(hex) {
  const c = hex.replace("#", "");
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

function mix(a, b, t) {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
}

class Canvas {
  constructor(width, height, bgColor) {
    this.width = width;
    this.height = height;
    this.px = new Float64Array(width * height * 3);
    const [r, g, b] = bgColor;
    for (let i = 0; i < width * height; i++) {
      this.px[i * 3] = r;
      this.px[i * 3 + 1] = g;
      this.px[i * 3 + 2] = b;
    }
  }

  // Anti-aliased filled circle: blends `color` into the canvas with
  // coverage falling off over ~1px at the edge.
  circle(cx, cy, r, color) {
    const minX = Math.max(0, Math.floor(cx - r - 1));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + r + 1));
    const minY = Math.max(0, Math.floor(cy - r - 1));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + r + 1));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const coverage = Math.max(0, Math.min(1, r - dist + 0.5));
        if (coverage <= 0) continue;
        const idx = (y * this.width + x) * 3;
        for (let c = 0; c < 3; c++) {
          this.px[idx + c] = this.px[idx + c] + (color[c] - this.px[idx + c]) * coverage;
        }
      }
    }
  }

  // Solid filled rectangle — used to draw blocky pixel-font glyphs.
  rect(x0, y0, x1, y1, color) {
    const minX = Math.max(0, Math.floor(x0));
    const maxX = Math.min(this.width - 1, Math.ceil(x1));
    const minY = Math.max(0, Math.floor(y0));
    const maxY = Math.min(this.height - 1, Math.ceil(y1));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = (y * this.width + x) * 3;
        this.px[idx] = color[0];
        this.px[idx + 1] = color[1];
        this.px[idx + 2] = color[2];
      }
    }
  }

  toPngBuffer() {
    const rowLen = this.width * 3;
    const raw = Buffer.alloc((rowLen + 1) * this.height);
    for (let y = 0; y < this.height; y++) {
      const rowStart = y * (rowLen + 1);
      raw[rowStart] = 0;
      for (let x = 0; x < this.width; x++) {
        const srcIdx = (y * this.width + x) * 3;
        const dstIdx = rowStart + 1 + x * 3;
        raw[dstIdx] = Math.max(0, Math.min(255, Math.round(this.px[srcIdx])));
        raw[dstIdx + 1] = Math.max(0, Math.min(255, Math.round(this.px[srcIdx + 1])));
        raw[dstIdx + 2] = Math.max(0, Math.min(255, Math.round(this.px[srcIdx + 2])));
      }
    }
    const idat = zlib.deflateSync(raw);

    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.width, 0);
    ihdr.writeUInt32BE(this.height, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;
    return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
  }
}

// --- Minimal 5x7 bitmap font — just the glyphs "SUDS & SCRUB" needs. ---
const FONT = {
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  "&": ["01100", "10010", "10010", "01100", "10101", "10010", "01101"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

/** Draws blocky pixel-font text, left edge at x, vertically centered on cy. */
function drawText(canvas, text, x, cy, unit, color) {
  const glyphWidth = 5 * unit;
  const glyphHeight = 7 * unit;
  const spacing = unit;
  let cursorX = x;
  for (const ch of text.toUpperCase()) {
    const rows = FONT[ch] ?? FONT[" "];
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < 5; rx++) {
        if (row[rx] === "1") {
          const px = cursorX + rx * unit;
          const py = cy - glyphHeight / 2 + ry * unit;
          canvas.rect(px, py, px + unit, py + unit, color);
        }
      }
    });
    cursorX += glyphWidth + spacing;
  }
  return cursorX - spacing; // right edge of the last glyph
}

function textWidth(text, unit) {
  return text.length * (5 * unit + unit) - unit;
}

// Suds & Scrub palette — darker green per brand update.
const BACKGROUND = hexToRgb("#241934");
const PRIMARY = hexToRgb("#2FAE66");
const BUBBLE_LIGHT = hexToRgb("#6BD99A");
const PRIMARY_DARK = hexToRgb("#1F7A48");
const WHITE = [255, 255, 255];

function paintBubble(canvas, cx, cy, r, fill) {
  canvas.circle(cx, cy, r, fill);
  // Glossy highlight: a smaller circle offset toward the upper-left,
  // blended toward white — the classic soap-bubble shine.
  const highlight = mix(fill, WHITE, 0.65);
  canvas.circle(cx - r * 0.35, cy - r * 0.35, r * 0.28, highlight);
}

function render(size) {
  const canvas = new Canvas(size, size, BACKGROUND);
  const s = size / 1024; // scale factor from the 1024 design grid

  // Bubble cluster in the upper ~2/3, leaving room for the wordmark below.
  paintBubble(canvas, 520 * s, 480 * s, 250 * s, PRIMARY);
  paintBubble(canvas, 260 * s, 210 * s, 130 * s, BUBBLE_LIGHT);
  paintBubble(canvas, 780 * s, 190 * s, 95 * s, PRIMARY_DARK);
  paintBubble(canvas, 850 * s, 430 * s, 48 * s, BUBBLE_LIGHT);

  // Wordmark, centered, in the lower third.
  const unit = 14 * s;
  const label = "SUDS & SCRUB";
  const w = textWidth(label, unit);
  drawText(canvas, label, (size - w) / 2, 870 * s, unit, WHITE);

  return canvas.toPngBuffer();
}

const [, , outPath, sizeStr] = process.argv;
const size = parseInt(sizeStr, 10);
fs.writeFileSync(outPath, render(size));
console.log(`Wrote ${outPath} (${size}x${size})`);
