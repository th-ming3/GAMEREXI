const puppeteer = require('puppeteer-core');
const fs = require('fs');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  await page.goto('about:blank');
  const tj = JSON.parse(fs.readFileSync('assets/textures.json'));
  await page.evaluate(async (src) => {
    function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
    const im = await loadImage(src);
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d');
    x.fillStyle = '#9fb86e'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(im, 0, 0);
    x.strokeStyle = 'rgba(200,30,30,0.55)'; x.fillStyle = 'rgba(150,10,10,0.9)';
    x.font = '16px monospace';
    for (let i = 1; i < 10; i++) {
      x.beginPath(); x.moveTo(i * c.width / 10, 0); x.lineTo(i * c.width / 10, c.height); x.stroke();
      x.beginPath(); x.moveTo(0, i * c.height / 10); x.lineTo(c.width, i * c.height / 10); x.stroke();
      x.fillText(i / 10, i * c.width / 10 + 2, 14);
      x.fillText(i / 10, 2, i * c.height / 10 + 14);
    }
    window.__PG = c.toDataURL('image/png').split(',')[1];
  }, tj.egretMid);
  fs.writeFileSync('grid-mid.png', Buffer.from(await page.evaluate(() => window.__PG), 'base64'));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
