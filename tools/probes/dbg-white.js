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
  await page.evaluate(() => { window.__ff && window.__ff(5); });
  await page.evaluate(() => {
    const pz1 = 15.5 + 5.2 * Math.sin(2 * 0.085) + 3.1 * Math.sin(2 * 0.041 + 2);
    const pz2 = 15.5 + 5.2 * Math.sin(12 * 0.085) + 3.1 * Math.sin(12 * 0.041 + 2);
    window.__playerPos.set(2, 0, pz1 + 2.2);
    window.__setOrbit(Math.atan2(10 - 2, pz2 - pz1), 0.22);
  });
  await new Promise(r => setTimeout(r, 6000));
  const list = await page.evaluate(() => {
    const out = [];
    const tw = new THREE.Vector3();
    window.__scene3d.traverse(o => {
      if (!o.geometry || o.geometry.type !== 'SphereGeometry') return;
      if (!o.material || !o.material.color) return;
      const c = o.material.color.getHex();
      if (c !== 0xd8cfc0 && c !== 0xe8e0d0 && c !== 0xcfc7b8 && c !== 0xdad2c4 && c !== 0xd6cdbf && c !== 0xcfbeb4) return;
      o.getWorldPosition(tw);
      if (tw.x > -2 && tw.x < 22 && tw.z > 12 && tw.z < 42 && tw.y < 2.5 && o.scale.x > 0.14 && (o.geometry.type === 'SphereGeometry' || o.geometry.type === 'ConeGeometry' || o.geometry.type === 'CircleGeometry' || o.geometry.type === 'PlaneGeometry')) {
        const cc = o.material.color ? o.material.color.getHex().toString(16) : (o.material.map ? 'map' : '?');
        out.push({ geo: o.geometry.type, col: cc, s: o.scale.x.toFixed(2), pos: [+tw.x.toFixed(1), +tw.y.toFixed(2), +tw.z.toFixed(1)], parent: o.parent && o.parent.userData && typeof o.parent.userData.cx === 'number' ? ('chunk' + o.parent.userData.cx + ',' + o.parent.userData.cz) : (o.parent && o.parent.name) || (o.parent && o.parent.type) });
      }
    });
    return out.slice(0, 20);
  });
  console.log('WHITE-MESHES:', JSON.stringify(list, null, 0));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
