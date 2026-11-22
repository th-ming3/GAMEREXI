const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 150)));
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await new Promise(r => setTimeout(r, 5000));
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) { if (await page.evaluate(() => window.__bootOK === true)) break; await new Promise(r => setTimeout(r, 500)); }
  await page.mouse.click(400, 300);
  await page.evaluate(() => { window.__ff && window.__ff(5); });
  await new Promise(r => setTimeout(r, 3000));
  // tái lập đúng camera shot slime: player đặt cạnh slime(3,12)
  await page.evaluate(() => {
    const s = (window.__slimes || [])[0];
    const px = s ? s.g.position.x + 2.6 : 5.6, pz = s ? s.g.position.z + 2.0 : 14;
    window.__playerPos.set(px, 0, pz);
    window.__setOrbit(Math.atan2(-2.6, -2.0), 0.18);
  });
  await new Promise(r => setTimeout(r, 2500));
  const hits = await page.evaluate(() => {
    const cam = window.__cam3d;
    const Ray = Object.getPrototypeOf(cam).constructor;
    // tìm Raycaster qua constructor của scene? dùng window.THREE không có — dựng tay
    // Raycaster không exposed: tự tính ray từ camera qua NDC rồi intersectObjects bằng THREE của trang (qua __scene3d.constructor)
    const T = window.__scene3d.constructor; // không phải THREE
    return null;
  });
  // THREE không expose ra window → dùng gl nằm trong renderer? Đơn giản hơn: scan instance có |euler.x|>1.2 (nằm sấp)
  const flat = await page.evaluate(() => {
    const cam = window.__cam3d;
    const M = new (Object.getPrototypeOf(cam.matrixWorld).constructor)();
    const V = new (Object.getPrototypeOf(cam.position).constructor)();
    const Q = new (Object.getPrototypeOf(cam.quaternion).constructor)();
    const S = new (Object.getPrototypeOf(cam.scale).constructor)();
    const E = new (Object.getPrototypeOf(cam.rotation).constructor)();
    const out = [];
    window.__scene3d.traverse(o => {
      if (!o.isInstancedMesh || o.count > 2000) return;
      let flatN = 0, upN = 0, sampleFlat = '';
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, M); M.decompose(V, Q, S);
        E.setFromQuaternion(Q, 'YXZ');
        const tilt = Math.abs(E.x) + Math.abs(E.z);
        if (tilt > 1.1) { flatN++; if (!sampleFlat) sampleFlat = 'i=' + i + ' euler=' + E.x.toFixed(2) + '/' + E.y.toFixed(2) + '/' + E.z.toFixed(2) + ' p=' + V.x.toFixed(1) + ',' + V.y.toFixed(2) + ',' + V.z.toFixed(1) + ' s=' + S.x.toFixed(2) + ' geo=' + o.geometry.type + ' bb=' + (o.geometry.boundingBox ? 'yes' : 'no'); }
        else upN++;
      }
      if (flatN) out.push('FLAT ' + flatN + '/' + o.count + ' :: ' + sampleFlat);
    });
    // kèm groups wf gần player
    let wfInfo = [];
    const pl = window.__playerPos;
    window.__garden.children.forEach(c => {
      if (!c.userData || !c.userData.flowers) return;
      c.userData.flowers.forEach(f => {
        if (!f.h.visible) return;
        const wp = f.h.position;
        const d = Math.hypot(wp.x - pl.x, wp.z - pl.z);
        if (d < 4) wfInfo.push('wf d=' + d.toFixed(1) + ' rot=' + f.h.rotation.x.toFixed(2) + '/' + f.h.rotation.z.toFixed(2) + ' y=' + wp.y.toFixed(2));
      });
    });
    return { inst: out, wf: wfInfo.slice(0, 8) };
  });
  flat.inst.forEach(l => console.log(l));
  console.log('WF-NEAR:', JSON.stringify(flat.wf, null, 0));
  console.log('ERRORS=' + errs.length);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
