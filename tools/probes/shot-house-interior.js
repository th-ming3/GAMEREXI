const puppeteer = require('puppeteer-core');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: true,
      args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
      defaultViewport: { width: 1100, height: 700 }
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto('file:///' + path.join(ROOT, 'game.html').replace(/\\/g, '/'), { waitUntil: 'domcontentloaded', timeout: 120000 });
    await sleep(6500);
    await page.evaluate(() => {
      window.__ff(6);
      window.__setSun(1.05);
      const cab = window.__cabinPos;
      const world = window.__garden.localToWorld(new THREE.Vector3(cab.x, 0, cab.z));
      window.__playerPos.set(world.x, 0, world.z);
      window.__setOrbit(Math.PI, 0.34);
    });
    await sleep(400);
    await page.keyboard.press('e');
    await sleep(1300);
    const entered = await page.evaluate(() => {
      const cameraLocal = window.__garden.worldToLocal(window.__cam3d.position.clone());
      const targetLocal = window.__garden.worldToLocal(window.TARGET.clone());
      const ray = new THREE.Raycaster(window.__cam3d.position.clone(), window.TARGET.clone().sub(window.__cam3d.position).normalize());
      const roomDetails = [];
      if (window.__insideRoom) window.__insideRoom.traverse(object => {
        if (!object.isMesh || roomDetails.length >= 24) return;
        const material = Array.isArray(object.material) ? object.material[0] : object.material;
        roomDetails.push({
          geometry: object.geometry && object.geometry.type,
          local: object.position.toArray(),
          world: object.getWorldPosition(new THREE.Vector3()).toArray(),
          color: material && material.color && material.color.getHexString(),
          type: material && material.type,
          side: material && material.side,
          visible: object.visible
        });
      });
      let roomMeshes = 0;
      if (window.__insideRoom) window.__insideRoom.traverse(object => { if (object.isMesh) roomMeshes++; });
      return {
        roomVisible: window.__insideRoom && window.__insideRoom.visible,
        roomPosition: window.__insideRoom && window.__insideRoom.position.toArray(),
        roomMeshes,
        cameraWorld: window.__cam3d.position.toArray(),
        cameraLocal: cameraLocal.toArray(),
        targetLocal: targetLocal.toArray(),
        playerLocal: window.__garden.worldToLocal(window.__playerPos.clone()).toArray(),
        roomDetails,
        render: window.__renderer.info.render
      };
    });
    await page.screenshot({ path: path.join(ROOT, 'shots', 'debug-interior.png') });
    await page.evaluate(() => { window.__insideRoom.children[1].visible = false; });
    await sleep(900);
    await page.screenshot({ path: path.join(ROOT, 'shots', 'debug-interior-no-shell.png') });
    await page.evaluate(() => {
      window.__insideRoom.children[1].visible = true;
      window.__debugVisibility = window.__garden.children.map(child => child.visible);
      window.__garden.children.forEach(child => { child.visible = child === window.__insideRoom || child === window.__char; });
    });
    await sleep(900);
    await page.screenshot({ path: path.join(ROOT, 'shots', 'debug-interior-isolated.png') });
    await page.evaluate(() => {
      window.__garden.children.forEach((child, index) => { child.visible = window.__debugVisibility[index]; });
      delete window.__debugVisibility;
    });
    await page.keyboard.press('e');
    await sleep(1300);
    const exited = await page.evaluate(() => ({
      roomVisible: window.__insideRoom && window.__insideRoom.visible,
      cabinVisible: window.__cabinGroup.visible,
      cameraLocal: window.__garden.worldToLocal(window.__cam3d.position.clone()).toArray(),
      targetLocal: window.__garden.worldToLocal(window.TARGET.clone()).toArray(),
      render: window.__renderer.info.render
    }));
    await page.screenshot({ path: path.join(ROOT, 'shots', 'debug-exterior.png') });
    console.log(JSON.stringify({ entered, exited, errors }, null, 2));
  } finally {
    if (browser) await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
