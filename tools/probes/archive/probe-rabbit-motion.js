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
      if (await page.evaluate(() => window.__bootOK && window.__charLoaded && window.__rabbitAssetReady)) break;
      await sleep(400);
    }
    await page.evaluate(() => {
      window.__ff(6); window.__setSun(1.05);
      const den = window.__garden.localToWorld(new THREE.Vector3(-18, 0, 6));
      window.__playerPos.set(den.x, 0, den.z);
      window.__spawnRabbitNow();
    });
    const samples = [];
    for (let i = 0; i < 10; i++) {
      await sleep(500);
      samples.push(await page.evaluate(() => {
        const rabbit = window.__rabbits[0];
        if (!rabbit) return null;
        const lake = window.__lakeInfo;
        const q = ((rabbit.m.position.x - lake.x) ** 2 / lake.rx ** 2) + ((rabbit.m.position.z - lake.z) ** 2 / lake.rz ** 2);
        return { position: rabbit.m.position.toArray(), yaw: rabbit.m.rotation.y, t: rabbit.t, q };
      }));
    }
    const color = await page.evaluate(() => {
      const rabbit = window.__rabbits[0];
      if (!rabbit) return null;
      const values = [];
      rabbit.m.traverse(object => {
        if (!object.isMesh || !object.material || !object.material.map) return;
        const image = object.material.map.image;
        if (!image || !image.width || !image.getContext) return;
        const ctx = image.getContext('2d');
        const data = ctx.getImageData(0, 0, Math.min(16, image.width), Math.min(16, image.height)).data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 100) continue;
          values.push({ rgb: [data[i], data[i + 1], data[i + 2]], spread: Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) });
        }
      });
      if (!values.length) return { samples: 0 };
      return {
        samples: values.length,
        mean: values.reduce((sum, item) => sum + item.rgb.reduce((a, b) => a + b, 0) / 3, 0) / values.length,
        maxSpread: Math.max(...values.map(item => item.spread))
      };
    });
    await page.evaluate(() => {
      const rabbit = window.__rabbits[0];
      if (!rabbit) return;
      const world = rabbit.m.getWorldPosition(new THREE.Vector3());
      window.__playerPos.set(world.x, 0, world.z);
      window.__setOrbit(0.6, 0.32);
    });
    await sleep(500);
    await page.screenshot({ path: path.join(ROOT, 'shots', 'rabbit-white-motion.png') });
    let maxBackwardStep = 0, minDirectionDot = 1, maxQ = 0;
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1], b = samples[i];
      if (!a || !b) continue;
      maxBackwardStep = Math.max(maxBackwardStep, a.t - b.t);
      const mx = b.position[0] - a.position[0], mz = b.position[2] - a.position[2];
      if (Math.hypot(mx, mz) > 0.0001) {
        const length = Math.hypot(mx, mz);
        const dot = (mx / length) * Math.sin(b.yaw) + (mz / length) * Math.cos(b.yaw);
        minDirectionDot = Math.min(minDirectionDot, dot);
      }
      maxQ = Math.max(maxQ, b.q);
    }
    const result = { color, maxBackwardStep, minDirectionDot, maxQ, samples, errors };
    console.log(JSON.stringify(result, null, 2));
    if (maxBackwardStep > 0 || minDirectionDot < 0.7 || maxQ <= 1.18 || !color || color.samples === 0 || color.mean < 180 || color.maxSpread > 20 || errors.length) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
