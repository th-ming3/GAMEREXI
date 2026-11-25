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
      defaultViewport: { width: 1280, height: 800 }
    });
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto('file:///' + path.join(ROOT, 'game.html').replace(/\\/g, '/'), { waitUntil: 'domcontentloaded', timeout: 120000 });
    const started = Date.now();
    while (Date.now() - started < 60000) {
      if (await page.evaluate(() => window.__bootOK && window.__charLoaded && window.__underwaterRoot)) break;
      await sleep(400);
    }
    await page.evaluate(() => {
      window.__ff(6); window.__setSun(1.05);
      const L = window.__lakeInfo, world = window.__garden.localToWorld(new THREE.Vector3(L.x, 0, L.z));
      window.__playerPos.set(world.x, 0, world.z);
      window.__setOrbit(0, 0.42);
    });
    await sleep(500);
    const surface = await page.evaluate(() => ({
      waterY: window.__lakeWaterY(),
      bottomY: window.__hillY(window.__lakeInfo.x, window.__lakeInfo.z),
      charY: window.__char.position.y,
      cameraY: window.CAM.y,
      crystals: window.__underwaterCrystals.length,
      plants: window.__underwaterRoot.children.length
    }));
    await page.keyboard.press('x');
    await page.keyboard.down('q');
    await sleep(1400);
    await page.keyboard.up('q');
    await sleep(300);
    const diving = await page.evaluate(() => ({
      active: window.__isDiving,
      charY: window.__char.position.y,
      cameraY: window.CAM.y,
      targetY: window.TARGET.y,
      fogNear: window.__scene3d.fog.near,
      fogFar: window.__scene3d.fog.far,
      collected: window.__underwaterN()
    }));
    await page.screenshot({ path: path.join(ROOT, 'shots', 'underwater-exploration.png') });
    const collection = await page.evaluate(async () => {
      const crystal = window.__underwaterCrystals.find(item => item.visible);
      const world = crystal.getWorldPosition(new THREE.Vector3());
      window.__playerPos.set(world.x, 0, world.z);
      await new Promise(resolve => setTimeout(resolve, 600));
      return { collected: window.__underwaterN(), stillVisible: crystal.visible };
    });
    await page.keyboard.press('x');
    await sleep(250);
    const surfaced = await page.evaluate(() => ({ active: window.__isDiving, charY: window.__char.position.y }));
    const result = { surface, diving, collection, surfaced, errors };
    console.log(JSON.stringify(result, null, 2));
    const depth = surface.waterY - surface.bottomY;
    if (depth < 3 || !diving.active || diving.charY >= surface.charY || diving.cameraY >= surface.waterY || diving.fogFar >= 33 || collection.collected < 1 || collection.stillVisible || surfaced.active || errors.length) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
