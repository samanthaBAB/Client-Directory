// Renders the brand icon/splash HTML (real cursive web font + CSS
// gradients for glossy bubbles) to PNG via a headless browser — this
// needed actual font rendering, which the zero-dependency PNG
// rasterizers elsewhere in this folder (make-placeholder-png.js,
// make-brand-icon.js) can't do.
//
// Requires Playwright: `npm install` in this directory first.
// Usage: node render.js
const { chromium } = require("playwright");
const path = require("path");

const TARGETS = [
  { html: "icon.html", width: 1024, height: 1024, out: "../../apps/homeowner/assets/icon.png" },
  { html: "icon.html", width: 1024, height: 1024, out: "../../apps/cleaner/assets/icon.png" },
  { html: "splash.html", width: 1284, height: 2778, out: "../../apps/homeowner/assets/splash.png" },
  { html: "splash.html", width: 1284, height: 2778, out: "../../apps/cleaner/assets/splash.png" },
];

// The npm "playwright" package expects a browser revision it manages
// itself; this sandbox has a pre-installed Chromium at a different
// revision path (see PLAYWRIGHT_BROWSERS_PATH), so point at it directly
// rather than relying on Playwright's own version-matched auto-detect.
const CHROMIUM_PATH =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

async function main() {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const page = await browser.newPage();

  for (const target of TARGETS) {
    await page.setViewportSize({ width: target.width, height: target.height });
    await page.goto("file://" + path.resolve(__dirname, target.html));
    await page.waitForTimeout(300); // let the Google Font finish loading
    const outPath = path.resolve(__dirname, target.out);
    await page.screenshot({ path: outPath });
    console.log(`Wrote ${outPath}`);
  }

  await browser.close();
}

main();
