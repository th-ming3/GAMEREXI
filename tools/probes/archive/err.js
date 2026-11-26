const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('ERR:', e.stack || e.message));
  await page.goto('file:///home/user/done.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 7000));
  const st = await page.evaluate(() => ({ boot: !!window.__bootOK, garden: !!window.__garden, flat: !!document.getElementById('flatGarden') }));
  console.log(JSON.stringify(st));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
