const puppeteer = require('puppeteer-core');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const GAME_URL = 'file:///' + path.join(ROOT, 'game.html').replace(/\\/g, '/');
const SHOTS = path.join(ROOT, 'shots');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFrames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

(async () => {
  let browser;
  const errors = [];
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: true,
      args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars', '--allow-file-access-from-files'],
      defaultViewport: { width: 1280, height: 800 }
    });
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const started = Date.now();
    while (Date.now() - started < 60000) {
      if (await page.evaluate(() => window.__bootOK && window.__charLoaded)) break;
      await sleep(500);
    }
    await page.evaluate(() => {
      window.__ff(6);
      window.__setSun(1.05);
      window.__setOrbit(0, 0.52);
      window.__goHome();
    });
    await sleep(2500);
    await waitFrames(page);
    const measuredFps = await page.evaluate(() => new Promise(resolve => {
      let frames = 0;
      const started = performance.now();
      function count() {
        frames++;
        if (performance.now() - started >= 1500) resolve(Math.round(frames * 1000 / (performance.now() - started)));
        else requestAnimationFrame(count);
      }
      requestAnimationFrame(count);
    }));

    const initial = await page.evaluate(fps => ({
      measuredFps: fps,
      boot: window.__bootOK,
      loaded: window.__charLoaded,
      player: window.__playerPos.toArray(),
      camera: window.CAM.toArray(),
      waterY: window.__lakeSurf.position.y,
      shoreY: window.__lakeShore.position.y,
      bankY: window.__lakeBank.position.y,
      chunks: window.__chunkStats,
      render: {
        calls: window.__renderer.info.render.calls,
        triangles: window.__renderer.info.render.triangles,
        geometries: window.__renderer.info.memory.geometries,
        textures: window.__renderer.info.memory.textures
      }
    }), measuredFps);
    await page.screenshot({ path: path.join(SHOTS, 'current-spawn.png') });

    const flight = await page.evaluate(async () => {
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      window.__goHome();
      const y0 = window.__char.position.y;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }));
      await wait(250);
      const y1 = window.__char.position.y;
      window.__keys.e = true;
      await wait(1100);
      window.__keys.e = false;
      return { start: y0, afterToggle: y1, afterRise: window.__char.position.y, riseDelta: window.__char.position.y - y1, camY: window.CAM.y };
    });

    const flower = await page.evaluate(async () => {
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      window.__goHome();
      let found = null;
      for (const child of window.__garden.children) {
        if (child.userData && child.userData.flowers) {
          found = child.userData.flowers.find(item => item.h.visible);
          if (found) break;
        }
      }
      if (!found) return { found: false };
      const world = window.__garden.localToWorld(new THREE.Vector3(found.h.position.x, 0, found.h.position.z));
      window.__playerPos.set(world.x, 0, world.z);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }));
      await wait(500);
      return { found: true, stillVisible: found.h.visible, playerY: window.__char.position.y };
    });

    const rabbit = await page.evaluate(async () => {
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      window.__goHome();
      window.__setSun(1.05);
      window.__spawnRabbitNow();
      await wait(5500);
      const item = window.__rabbits[0];
      if (!item) return { count: 0, assetReady: window.__rabbitAssetReady };
      const box = new THREE.Box3().setFromObject(item.m);
      return {
        count: window.__rabbits.length,
        assetReady: window.__rabbitAssetReady,
        animations: window.__rabbitAnimNames,
        bounds: [box.min.toArray(), box.max.toArray()],
        position: item.m.position.toArray(),
        progress: item.t
      };
    });

    const interior = await page.evaluate(async () => {
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      const cab = window.__cabinPos;
      const world = window.__garden.localToWorld(new THREE.Vector3(cab.x, 0, cab.z));
      window.__playerPos.set(world.x, 0, world.z);
      await wait(150);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }));
      await wait(700);
      return {
        entered: !!window.__insideRoom && window.__insideRoom.visible,
        cabinHidden: !window.__cabinGroup.visible,
        player: window.__playerPos.toArray(),
        camera: window.CAM.toArray()
      };
    });
    await waitFrames(page);
    await page.screenshot({ path: path.join(SHOTS, 'current-interior.png') });
    await page.keyboard.press('e');
    await sleep(300);

    const rocks = await page.evaluate(() => {
      const rows = [];
      window.__garden.traverse(object => {
        if (!object.isMesh || !object.geometry || object.geometry.type !== 'IcosahedronGeometry') return;
        const material = Array.isArray(object.material) ? object.material[0] : object.material;
        if (!material || !material.color) return;
        const hex = material.color.getHex();
        if (hex !== 0x6f6a5e && hex !== 0x5d574b) return;
        const center = object.getWorldPosition(new THREE.Vector3());
        window.__garden.worldToLocal(center);
        const box = new THREE.Box3().setFromObject(object);
        rows.push({ position: center.toArray(), clearance: box.min.y - window.__hillY(center.x, center.z) });
      });
      rows.sort((a, b) => b.clearance - a.clearance);
      return { count: rows.length, highest: rows.slice(0, 8), lowest: rows.slice(-4) };
    });

    await page.evaluate(() => window.__goHome());
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await sleep(500);
    const mobileBefore = await page.evaluate(() => ({
      player: window.__playerPos.toArray(),
      buttons: Array.from(document.querySelectorAll('[data-k], [data-a]')).map(button => ({
        key: button.dataset.k || button.dataset.a,
        text: button.textContent,
        aria: button.getAttribute('aria-label'),
        display: getComputedStyle(button.parentElement).display,
        rect: button.getBoundingClientRect().toJSON()
      })),
      helpDisplay: getComputedStyle(document.getElementById('hudHelp')).display,
      render: {
        calls: window.__renderer.info.render.calls,
        triangles: window.__renderer.info.render.triangles
      }
    }));
    const blurRelease = await page.evaluate(() => {
      window.__keys.w = true;
      window.dispatchEvent(new Event('blur'));
      return Object.keys(window.__keys).every(key => !window.__keys[key]);
    });
    const up = await page.$('[data-k="w"]');
    const box = await up.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await sleep(450);
    await page.mouse.up();
    await sleep(150);
    const mobileAfter = await page.evaluate(() => ({ player: window.__playerPos.toArray(), keys: Object.keys(window.__keys).filter(key => window.__keys[key]) }));
    await waitFrames(page);
    await page.screenshot({ path: path.join(SHOTS, 'current-mobile.png') });

    const result = { initial, flight, flower, rabbit, interior, rocks, mobile: { before: mobileBefore, after: mobileAfter, blurRelease }, errors };
    console.log(JSON.stringify(result, null, 2));
    const mobilePassed = blurRelease && mobileBefore.helpDisplay === 'none' && mobileBefore.buttons.every(button => button.aria && !/[跳飞]/.test(button.text));
    if (!initial.boot || !initial.loaded || !mobilePassed || errors.length) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
