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
      defaultViewport: { width: 960, height: 600 }
    });
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto('file:///' + path.join(ROOT, 'game.html').replace(/\\/g, '/'), { waitUntil: 'domcontentloaded', timeout: 120000 });
    const started = Date.now();
    while (Date.now() - started < 60000) {
      if (await page.evaluate(() => window.__bootOK && window.__charLoaded && window.__physics)) break;
      await sleep(400);
    }
    const setup = await page.evaluate(() => {
      window.__setSun(1.05);
      window.__setOrbit(Math.PI, 0.52);
      const body = window.__physics.statics.find(item => Math.abs(item.shapes[0].radiusTop - 0.75) < 0.001);
      return {
        playerType: window.__physics.player.type,
        dynamicType: CANNON.Body.DYNAMIC,
        bodyCount: window.__physics.world.bodies.length,
        well: body.position.toArray ? body.position.toArray() : [body.position.x, body.position.y, body.position.z],
        radius: body.shapes[0].radiusTop
      };
    });
    await page.evaluate(setup => {
      const body = window.__physics.statics.find(item => Math.abs(item.shapes[0].radiusTop - setup.radius) < 0.001);
      window.__playerPos.set(body.position.x, 0, body.position.z + setup.radius + 1.2);
      window.__setOrbit(Math.PI, 0.52);
      window.__keys.w = true;
    }, setup);
    let minimum = Infinity;
    for (let i = 0; i < 14; i++) {
      await sleep(120);
      const sample = await page.evaluate(radius => {
        const body = window.__physics.statics.find(item => Math.abs(item.shapes[0].radiusTop - radius) < 0.001);
        return {
          distance: Math.hypot(window.__playerPos.x - body.position.x, window.__playerPos.z - body.position.z),
          steps: window.__physics.steps,
          contacts: window.__physics.contacts || 0,
          position: window.__playerPos.toArray()
        };
      }, setup.radius);
      minimum = Math.min(minimum, sample.distance);
      if (i === 13) var last = sample;
    }
    await page.evaluate(() => { window.__keys.w = false; });
    const required = setup.radius + 0.42 - 0.08;
    const result = {
      setup,
      minimum,
      required,
      last,
      passed: minimum >= required && last.steps > 0 && setup.playerType === setup.dynamicType,
      errors
    };
    console.log(JSON.stringify(result, null, 2));
    if (!result.passed || errors.length) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
