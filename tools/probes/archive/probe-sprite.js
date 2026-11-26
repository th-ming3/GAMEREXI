const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', e.message.slice(0, 160)));
  await page.goto('file:///home/user/done.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(() => {
    localStorage.setItem('consent', 'Vâng');
    localStorage.setItem('freeDay', '2026-11-28');
    localStorage.setItem('food', 'Bánh mì chả cá');
    localStorage.setItem('drink', 'Cà phê muối');
    localStorage.setItem('place', 'Phố cổ Hà Nội');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction('window.__bootOK === true', { timeout: 90000 });
  await new Promise(r => setTimeout(r, 2600));
  await page.evaluate(() => { window.__garden.rotation.y = 2.1; window.__birds.forEach(e => { e.userData.vx = 0; e.userData.frz = 0.32; }); window.__ff && window.__ff(9); });
  await new Promise(r => setTimeout(r, 900));
  const rep = await page.evaluate(() => {
    const cam = window.__cam3d, W = innerWidth, H = innerHeight;
    const v = new THREE.Vector3(), out = [];
    window.__scene3d.traverse(o => {
      if (!o.visible) return;
      let m = o.material, tex = m && m.map;
      if (!tex || !tex.image) return;
      v.setFromMatrixPosition(o.matrixWorld);
      const dist = v.distanceTo(cam.position);
      if (dist > 5 || dist < 0.05) return;
      v.project(cam);
      if (v.z > 1) return;
      const scx = o.scale.x || 1, scy = o.scale.y || 1;
      const halfW = tex.image.width / 2, aspect = tex.image.height / tex.image.width;
      const px = (scx * halfW * 2) / (dist * Math.tan(cam.fov * Math.PI / 360) * 2) * (W / (H * cam.aspect)) * H / H;
      const wpx = (scx * tex.image.width) / (dist * 2 * Math.tan(cam.fov * Math.PI / 360)) * (H / Math.abs(Math.tan(cam.fov * Math.PI / 360) * 0 + 1));
      const wf = (scx * tex.image.width) / dist;
      out.push({ d: +dist.toFixed(2), wf: +wf.toFixed(3), x: +v.x.toFixed(2), y: +v.y.toFixed(2), tw: tex.image.width, th: tex.image.height, sc: +scx.toFixed(2), ctor: o.constructor.name, parent: o.parent && o.parent.constructor.name, op: m.opacity !== undefined ? m.opacity : 1 });
    });
    return out.sort((a, b) => b.wf - a.wf).slice(0, 12);
  });
  console.log('BIG:', JSON.stringify(rep, null, 0));
  await page.screenshot({ path: 'probe-side.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
