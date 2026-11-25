const puppeteer = require('puppeteer-core');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const WIDTH = Number(process.env.VIEW_WIDTH || 1280);
const HEIGHT = Number(process.env.VIEW_HEIGHT || 800);
const QUERY = process.env.GAME_QUERY || '';
const SHOT_NAME = process.env.SHOT_NAME || 'ground-grid-fixed.png';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  let browser;
  const errors = [];
  try {
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: true,
      args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
      defaultViewport: { width: WIDTH, height: HEIGHT }
    });
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto('file:///' + path.join(ROOT, 'game.html').replace(/\\/g, '/'), { waitUntil: 'domcontentloaded', timeout: 120000 });
    const started = Date.now();
    while (Date.now() - started < 60000) {
      if (await page.evaluate(() => window.__bootOK && window.__charLoaded)) break;
      await sleep(400);
    }
    await page.evaluate(() => { window.__ff(6); window.__setSun(1.05); window.__setOrbit(0, 0.52); window.__goHome(); });
    await sleep(2500);
    const terrain = await page.evaluate(() => {
      const geometry = window.__baseGround.geometry;
      const position = geometry.attributes.position;
      let maxError = 0, invalid = 0;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
        if (!Number.isFinite(y)) invalid++;
        maxError = Math.max(maxError, Math.abs(y - window.__hillY(x, z)));
      }
      return {
        type: geometry.type,
        vertices: position.count,
        triangles: geometry.index.count / 3,
        maxHeightError: maxError,
        invalid,
        render: window.__renderer.info.render,
        memory: window.__renderer.info.memory
      };
    });
    await page.screenshot({ path: path.join(ROOT, 'shots', 'ground-grid-fixed.png') });
    console.log(JSON.stringify({ terrain, errors }, null, 2));
    if (terrain.invalid || terrain.maxHeightError > 0.0001 || errors.length) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
