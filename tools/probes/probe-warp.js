const puppeteer = require('puppeteer-core');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  let browser;
  const errors = [];
  try {
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: true,
      args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
      defaultViewport: { width: 1100, height: 700 }
    });
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto('file:///' + path.join(ROOT, 'game.html').replace(/\\/g, '/'), { waitUntil: 'domcontentloaded', timeout: 120000 });
    const started = Date.now();
    while (Date.now() - started < 60000) {
      if (await page.evaluate(() => window.__bootOK && window.__charLoaded && window.__physics)) break;
      await sleep(400);
    }
    await page.evaluate(() => { window.__ff(6); window.__setSun(1.05); window.__setOrbit(0, 0.42); window.__goHome(); });
    await sleep(500);
    const start = await page.evaluate(() => window.__playerPos.toArray());
    await page.keyboard.down('w');
    const samples = [];
    for (let i = 0; i < 16; i++) {
      await sleep(500);
      samples.push(await page.evaluate(() => ({
        player: window.__playerPos.toArray(),
        char: window.__char.position.toArray(),
        cam: window.CAM.toArray(),
        keyW: !!window.__keys.w,
        velocity: window.__physics.player.velocity.toArray(),
        contacts: window.__physics.contacts || 0,
        statics: window.__physics.statics.length,
        steps: window.__physics.steps
      })));
    }
    await page.keyboard.up('w');
    const end = await page.evaluate(() => window.__playerPos.toArray());
    const distance = Math.hypot(end[0] - start[0], end[2] - start[2]);
    const stalled = [];
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1].player, b = samples[i].player;
      if (Math.hypot(b[0] - a[0], b[2] - a[2]) < 0.001) stalled.push(i);
    }
    const result = { start, end, distance, stalled, samples, errors };
    console.log(JSON.stringify(result, null, 2));
    if (distance < 0.2 || samples.some(sample => !sample.keyW) || errors.length) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
