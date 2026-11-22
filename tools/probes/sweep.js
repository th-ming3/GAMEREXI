const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  for (const vp of [{ w: 1280, h: 800, tag: 'DESKTOP' }, { w: 390, h: 844, tag: 'MOBILE' }]) {
    const page = await browser.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 160)); });
    page.on('pageerror', e => errs.push('PAGEERROR: ' + String(e).slice(0, 200)));
    await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch (e) {} });
    await page.setViewport({ width: vp.w, height: vp.h });
    await page.goto('file:///home/user/done.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await new Promise(r => setTimeout(r, 4000));
    const boot1 = await page.evaluate(() => window.__bootOK === true);
    await new Promise(r => setTimeout(r, 6000));
    // tương tác: click giữa (nở hoa), kéo xoay nền
    await page.mouse.click(vp.w * 0.35, vp.h * 0.55);
    await new Promise(r => setTimeout(r, 800));
    await page.mouse.move(vp.w * 0.3, vp.h * 0.5);
    await page.mouse.down();
    await page.mouse.move(vp.w * 0.75, vp.h * 0.42, { steps: 14 });
    await page.mouse.up();
    await new Promise(r => setTimeout(r, 1000));
    // resize giữa chừng
    await page.setViewport({ width: vp.w + 200, height: vp.h });
    await new Promise(r => setTimeout(r, 1500));
    const boot2 = await page.evaluate(() => window.__bootOK === true);
    const birds = await page.evaluate(() => window.__birds ? window.__birds.filter(b => b.visible).length : -1);
    const bfs = await page.evaluate(() => window.__garden ? window.__garden.children.filter(c => c.userData && c.userData.wings && c.visible).length : -1);
    console.log(`${vp.tag}: boot=${boot1}/${boot2} visBirds=${birds}/5 visBf=${bfs}/9 errors=${errs.length}`);
    errs.slice(0, 8).forEach(e => console.log('   ', e));
    await page.screenshot({ path: `/home/user/sweep-${vp.tag.toLowerCase()}.png` });
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
