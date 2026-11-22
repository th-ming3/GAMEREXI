const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERR:', String(e).slice(0, 160)));
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 4000));
  await page.evaluate(() => {
    window.__probe = { ticks: 0, keySeen: 0 };
    const origSet = window.CAM.set.bind(window.CAM);
    window.CAM.set = function (...a) { window.__probe.ticks++; return origSet(...a); };
    window.addEventListener('keydown', e => { if (e.key === 'w') window.__probe.keySeen++; });
  });
  await page.mouse.click(500, 300);
  await page.keyboard.down('w');
  await new Promise(r => setTimeout(r, 1000));
  const mid = await page.evaluate(() => ({ ...window.__probe, camZ: +window.CAM.z.toFixed(3) }));
  await page.keyboard.up('w');
  console.log('MID:', JSON.stringify(mid));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
