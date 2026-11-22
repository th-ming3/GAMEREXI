const puppeteer = require('puppeteer-core');
const fs = require('fs');
const POLY = [[0.105,0.040],[0.150,0.008],[0.210,0.045],[0.265,0.170],[0.330,0.250],[0.450,0.285],[0.530,0.345],[0.520,0.440],[0.490,0.520],[0.430,0.580],[0.350,0.595],[0.270,0.500],[0.215,0.330],[0.170,0.170],[0.125,0.055]];
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  await page.goto('about:blank');
  const tj = JSON.parse(fs.readFileSync('assets/textures.json'));
  await page.evaluate(async (src, poly) => {
    function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
    const im = await loadImage(src);
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    x.strokeStyle = 'rgba(200,30,30,0.5)';
    x.font = '13px monospace'; x.fillStyle = 'rgba(150,10,10,0.85)';
    for (let i = 1; i < 10; i++) {
      x.beginPath(); x.moveTo(i * c.width / 10, 0); x.lineTo(i * c.width / 10, c.height); x.stroke();
      x.beginPath(); x.moveTo(0, i * c.height / 10); x.lineTo(c.width, i * c.height / 10); x.stroke();
      x.fillText(i / 10, i * c.width / 10 + 2, 12);
      x.fillText(i / 10, 2, i * c.height / 10 + 12);
    }
    x.fillStyle = 'rgba(230,60,20,0.4)';
    x.strokeStyle = '#e03c14'; x.lineWidth = 2;
    x.beginPath();
    poly.forEach((p, i) => { const px = p[0] * c.width, py = p[1] * c.height; if (i === 0) x.moveTo(px, py); else x.lineTo(px, py); });
    x.closePath(); x.fill(); x.stroke();
    window.__PC = c.toDataURL('image/png').split(',')[1];
  }, tj.egretMid, POLY);
  fs.writeFileSync('poly-chk.png', Buffer.from(await page.evaluate(() => window.__PC), 'base64'));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
