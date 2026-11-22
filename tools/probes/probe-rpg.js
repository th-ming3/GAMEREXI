const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 2600));
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) { const ok = await page.evaluate(() => window.__bootOK === true); if (ok) break; await new Promise(r => setTimeout(r, 500)); }
  await page.evaluate(() => { window.__ff && window.__ff(4); });
  await new Promise(r => setTimeout(r, 900));
  await page.mouse.click(500, 300);

  // 1) nhân vật tồn tại + camera third-person phía sau
  const st1 = await page.evaluate(() => {
    const p = window.__playerPos, c = window.__char;
    return { char: !!c, p: { x: +p.x.toFixed(2), z: +p.z.toFixed(2) }, camDist: +window.__cam3d.position.distanceTo(new THREE.Vector3(p.x, 1.5, p.z)).toFixed(2) };
  });
  console.log('CHAR:', JSON.stringify(st1));
  // 2) W đi tới — giữ 4.5s (throttle headless)
  const p0 = await page.evaluate(() => ({ x: window.__playerPos.x, z: window.__playerPos.z }));
  await page.keyboard.down('w');
  await new Promise(r => setTimeout(r, 4500));
  await page.keyboard.up('w');
  const p1 = await page.evaluate(() => ({ x: +window.__playerPos.x.toFixed(2), z: +window.__playerPos.z.toFixed(2), y: +window.__char.position.y.toFixed(2), camDist: +window.__cam3d.position.distanceTo(new THREE.Vector3(window.__playerPos.x, 1.5, window.__playerPos.z)).toFixed(2) }));
  const moved = Math.hypot(p1.x - p0.x, p1.z - p0.z);
  console.log('WALK:', JSON.stringify({ from: [p0.x.toFixed(1), p0.z.toFixed(1)], to: [p1.x, p1.z], d: +moved.toFixed(2), camDist: p1.camDist, charY: p1.y }));
  // 3) quest: teleport player vào chỗ 1 hoa dại
  const picked = await page.evaluate(() => {
    let target = null;
    window.__garden.children.forEach(c => {
      if (target || !c.visible || !c.userData || !c.userData.flowers) return;
      c.userData.flowers.forEach(f => { if (!target && f.h.visible) target = { x: f.h.position.x, z: f.h.position.z }; });
    });
    if (!target) return { ok: false };
    const wp = new THREE.Vector3(target.x, 0, target.z);
    window.__garden.localToWorld(wp);
    window.__playerPos.set(wp.x, 0, wp.z);
    return { ok: true, lpos: target };
  });
  await new Promise(r => setTimeout(r, 700));
  const hud1 = await page.evaluate(() => ({
    hud: document.querySelectorAll('div')[document.querySelectorAll('div').length - 1] ? 'n/a' : 'n/a',
    text: (Array.from(document.querySelectorAll('div')).map(d => d.textContent).find(t => t && t.includes('Nhiệm vụ')) || '').slice(0, 80),
    trees: (() => { let n = 0; window.__garden.children.forEach(c => { if (c.userData && c.userData.hasTree) n++; }); return n; })()
  }));
  console.log('PICK:', JSON.stringify(picked), 'QUEST:', JSON.stringify(hud1));
  // 4) home
  await page.evaluate(() => window.__goHome());
  await new Promise(r => setTimeout(r, 400));
  const home = await page.evaluate(() => ({ x: +window.__playerPos.x.toFixed(2), z: +window.__playerPos.z.toFixed(2) }));
  console.log('HOME:', JSON.stringify(home), Math.abs(home.x - 0.4) < 0.01 && Math.abs(home.z - 6.8) < 0.01 ? '✓' : '✗');
  console.log('ERRORS=' + errs.length); errs.slice(0, 4).forEach(e => console.log('ERR:', e));
  await page.evaluate(() => { window.__ff && window.__ff(0.5); });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: '/home/user/shots/rpg-third.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
