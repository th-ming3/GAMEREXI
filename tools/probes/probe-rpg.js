const puppeteer = require('puppeteer-core');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  let browser;
  const errors = [];
  const evidence = {};
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
      if (await page.evaluate(() => window.__bootOK && window.__charLoaded && window.__waypoints)) break;
      await sleep(400);
    }
    await page.evaluate(() => { window.__ff(6); window.__setSun(1.05); window.__goHome(); });
    await sleep(400);
    evidence.initial = await page.evaluate(() => ({
      waypoints: window.__waypoints.length,
      map: !!document.getElementById('adventureMap'),
      colliders: window.__physics.statics.length,
      quest: window.__questState()
    }));

    const flowers = await page.evaluate(() => {
      const result = [];
      window.__garden.children.forEach(child => {
        if (!child.userData || !child.userData.flowers) return;
        child.userData.flowers.forEach(flower => {
          if (flower.h.visible && result.length < 5) {
            const world = flower.h.getWorldPosition(new THREE.Vector3());
            result.push([world.x, world.z]);
          }
        });
      });
      return result;
    });
    for (const position of flowers) {
      await page.evaluate(position => { window.__playerPos.set(position[0], 0, position[1]); }, position);
      await sleep(400);
    }
    evidence.flowers = await page.evaluate(() => window.__questState());

    const waypointList = await page.evaluate(() => window.__waypoints.map(wp => ({ x: wp.x, z: wp.z, id: wp.id })));
    for (const waypoint of waypointList) {
      await page.evaluate(waypoint => {
        const world = window.__garden.localToWorld(new THREE.Vector3(waypoint.x, 0, waypoint.z));
        window.__playerPos.set(world.x, 0, world.z);
      }, waypoint);
      await sleep(150);
      await page.keyboard.press('e');
      await sleep(400);
    }
    evidence.waypoints = await page.evaluate(() => ({ quest: window.__questState(), active: window.__waypoints.filter(wp => wp.active).length }));
    await page.screenshot({ path: path.join(ROOT, 'shots', 'quest-waypoints-active.png') });

    await page.evaluate(() => {
      const cave = window.__cavePos, world = window.__garden.localToWorld(new THREE.Vector3(cave.x, 0, cave.z));
      window.__playerPos.set(world.x, 0, world.z);
    });
    await page.keyboard.press('e');
    await sleep(400);
    evidence.caveEntered = await page.evaluate(() => ({ visible: window.__caveRoom && window.__caveRoom.visible, crystals: window.__caveCrystals.length }));
    for (const crystal of await page.evaluate(() => window.__caveCrystals.map(c => c.getWorldPosition(new THREE.Vector3()).toArray()))) {
      await page.evaluate(position => { window.__playerPos.set(position[0], 0, position[2]); }, crystal);
      await sleep(400);
    }
    evidence.cave = await page.evaluate(() => window.__questState());
    await page.screenshot({ path: path.join(ROOT, 'shots', 'quest-cave-crystals.png') });
    await page.keyboard.press('e');
    await sleep(250);

    await page.evaluate(() => {
      const lake = window.__lakeInfo, world = window.__garden.localToWorld(new THREE.Vector3(lake.x, 0, lake.z));
      window.__playerPos.set(world.x, 0, world.z);
    });
    await page.keyboard.press('x');
    for (const crystal of await page.evaluate(() => window.__underwaterCrystals.map(c => c.getWorldPosition(new THREE.Vector3()).toArray()))) {
      await page.evaluate(position => { window.__playerPos.set(position[0], 0, position[2]); }, crystal);
      await sleep(400);
    }
    evidence.underwater = await page.evaluate(() => window.__questState());
    await page.screenshot({ path: path.join(ROOT, 'shots', 'quest-underwater-crystals.png') });

    await page.keyboard.press('h');
    await sleep(400);
    evidence.complete = await page.evaluate(() => window.__questState());
    evidence.cabinClearance = await page.evaluate(() => {
      let nearest = Infinity;
      window.__garden.children.forEach(chunk => {
        if (!chunk.userData || !chunk.userData.trees) return;
        chunk.userData.trees.forEach(tree => { nearest = Math.min(nearest, Math.hypot(tree.x - 26, tree.z - 9)); });
      });
      return nearest;
    });
    console.log(JSON.stringify({ evidence, errors }, null, 2));
    const passed = evidence.flowers.stage === 1 && evidence.waypoints.quest.stage === 2 && evidence.waypoints.active === 3
      && evidence.caveEntered.visible && evidence.cave.stage === 3 && evidence.underwater.stage === 4
      && evidence.complete.stage === 5 && evidence.complete.score === 211 && evidence.cabinClearance >= 5.5 && errors.length === 0;
    if (!passed) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
