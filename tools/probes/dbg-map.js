const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await new Promise(r => setTimeout(r, 5000));
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) { if (await page.evaluate(() => window.__bootOK === true)) break; await new Promise(r => setTimeout(r, 500)); }
  await page.mouse.click(400, 300);
  await page.evaluate(() => { window.__playerPos.set(-15, 0, 8); window.__setOrbit(Math.atan2(-3, -2), 0.5); });
  await new Promise(r => setTimeout(r, 9000));
  const d = await page.evaluate(() => {
    const out = { hole: null, ring: null, mush: [], cam: null, player: null, look: null };
    const tw = new THREE.Vector3();
    window.__garden.traverse(o => {
      if (o.geometry && o.geometry.type === 'CircleGeometry' && o.material && o.material.color && o.material.color.getHex() === 0x140d08) {
        o.getWorldPosition(tw);
        out.hole = [+tw.x.toFixed(2), +tw.y.toFixed(2), +tw.z.toFixed(2), 'visible=' + o.visible];
      }
      if (o.geometry && o.geometry.type === 'RingGeometry') { o.getWorldPosition(tw); out.ring = [+tw.x.toFixed(2), +tw.y.toFixed(2), +tw.z.toFixed(2)]; }
      if (o.geometry && o.geometry.type === 'CylinderGeometry' && Math.abs(o.position.x + 18) < 5 && Math.abs(o.position.z - 6) < 5) {
        o.getWorldPosition(tw);
        if (out.mush.length < 3) out.mush.push([+tw.x.toFixed(1), +tw.y.toFixed(2), +tw.z.toFixed(1)]);
      }
    });
    out.cam = window.__cam3d.position.toArray().map(v => +v.toFixed(2));
    out.player = window.__playerPos.toArray().map(v => +v.toFixed(2));
    const dir = new THREE.Vector3(); window.__cam3d.getWorldDirection(dir);
    out.look = dir.toArray().map(v => +v.toFixed(2));
    return out;
  });
  console.log('DBG:', JSON.stringify(d, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
