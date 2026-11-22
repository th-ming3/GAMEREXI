const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 2600));
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) { const ok = await page.evaluate(() => window.__bootOK === true); if (ok) break; await new Promise(r => setTimeout(r, 500)); }
  await page.evaluate(() => { window.__cam(0, 5, 88, 0, 0.8, 84); window.__ff && window.__ff(5); window.__scene3d.fog.far = 400; window.__scene3d.fog.near = 40; });
  await new Promise(r => setTimeout(r, 4500));
  await page.screenshot({ path: '/home/user/chunk-nofog.png' });
  const d = await page.evaluate(() => {
    let tileVis = 0, tileTotal = 0, sample = null;
    window.__garden.children.forEach(c => {
      if (c.userData && c.userData.grass) {
        tileTotal++;
        const t = c.children[0];
        if (c.visible && t) {
          const bs = t.geometry.boundingSphere;
          if (!sample) sample = {
            center: bs ? bs.center.toArray().map(v => +v.toFixed(1)) : null,
            radius: bs ? +bs.radius.toFixed(1) : null,
            pos: t.getWorldPosition(new THREE.Vector3()).toArray().map(v => +v.toFixed(1)),
            camDist: +t.getWorldPosition(new THREE.Vector3()).distanceTo(window.__cam3d.position).toFixed(1)
          };
          tileVis++;
        }
      }
    });
    return { tileVis, tileTotal, sample, cam: window.__cam3d.position.toArray().map(v => +v.toFixed(1)) };
  });
  console.log(JSON.stringify(d));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
