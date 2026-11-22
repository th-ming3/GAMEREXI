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
  await new Promise(r => setTimeout(r, 4000));
  await page.evaluate(() => {
    window.__seen = [];
    window.addEventListener('keydown', e => window.__seen.push('win:' + e.key));
    document.addEventListener('keydown', e => window.__seen.push('doc:' + e.key));
    window.__cap = null;
    document.addEventListener('capture', () => {});
  });
  await page.mouse.click(500, 300);
  await page.keyboard.down('w');
  await new Promise(r => setTimeout(r, 300));
  await page.keyboard.up('w');
  const seen = await page.evaluate(() => window.__seen);
  console.log('SEEN:', JSON.stringify(seen));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
