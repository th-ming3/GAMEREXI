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
  const out = await page.evaluate(async (bodySrc, wingSrc) => {
    function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
    function wipeAbove(c, axf, ayf, bxf, byf) {
      const x = c.getContext('2d');
      const id = x.getImageData(0, 0, c.width, c.height), d = id.data;
      const ax = axf * c.width, ay = ayf * c.height, bx = bxf * c.width, by = byf * c.height;
      for (let yy = 0; yy < c.height; yy++) for (let xx = 0; xx < c.width; xx++) {
        const cross = (bx - ax) * (yy - ay) - (by - ay) * (xx - ax);
        if (cross < 0) d[(yy * c.width + xx) * 4 + 3] = 0;
      }
      x.putImageData(id, 0, 0);
    }
    // THÂN: wipe cánh trái cũ (vùng trên-trái đường chéo qua vai)
    const body = await loadImage(bodySrc);
    const bc = document.createElement('canvas'); bc.width = body.width; bc.height = body.height;
    bc.getContext('2d').drawImage(body, 0, 0);
    // vai trong crop body: ((0.30-0.16)/0.72, (0.453-0.08)/0.92) = (0.194, 0.405)
    wipeAbove(bc, 0.0, 0.02, 0.36, 0.62);
    // CÁNH: wipe mảnh cánh dưới + đuôi (dưới-phải đường từ vai (0.5+,~0.55) xuống)
    const wing = await loadImage(wingSrc);
    const wc = document.createElement('canvas'); wc.width = wing.width; wc.height = wing.height;
    wc.getContext('2d').drawImage(wing, 0, 0);
    // vai nằm đúng tâm canvas; wipe vùng dưới đường nghiêng qua tâm: từ (0.30W,0.62H) → (0.62W, 1.0H)
    const cx = wc.width / 2, cy = wc.height / 2;
    {
      const x = wc.getContext('2d');
      const id = x.getImageData(0, 0, wc.width, wc.height), d = id.data;
      const ax = 0.24 * wc.width, ay = 0.56 * wc.height, bx = 0.60 * wc.width, by = 1.0 * wc.height;
      for (let yy = 0; yy < wc.height; yy++) for (let xx = 0; xx < wc.width; xx++) {
        const cross = (bx - ax) * (yy - ay) - (by - ay) * (xx - ax);
        if (cross > 0) d[(yy * wc.width + xx) * 4 + 3] = 0;
      }
      x.putImageData(id, 0, 0);
    }
    return {
      body: { webp: bc.toDataURL('image/webp', 0.85).split(',')[1], w: bc.width, h: bc.height },
      wing: { webp: wc.toDataURL('image/webp', 0.85).split(',')[1], w: wc.width, h: wc.height }
    };
  }, tj.egretBody, tj.egretWing);
  tj.egretBody = 'data:image/webp;base64,' + out.body.webp;
  tj.egretWing = 'data:image/webp;base64,' + out.wing.webp;
  fs.writeFileSync('assets/textures.json', JSON.stringify(tj));
  console.log('WIPE OK body ' + out.body.w + 'x' + out.body.h + ' wing ' + out.wing.w + 'x' + out.wing.h);
  const prev = await page.evaluate(async (tj) => {
    function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
    const mk = async (src, bg) => {
      const im = await loadImage(src);
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d');
      x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(im, 0, 0);
      return c.toDataURL('image/png').split(',')[1];
    };
    return { b: await mk(tj.egretBody, '#9fb86e'), w: await mk(tj.egretWing, '#c9b98a') };
  }, tj);
  fs.writeFileSync('prev-body3.png', Buffer.from(prev.b, 'base64'));
  fs.writeFileSync('prev-wing3.png', Buffer.from(prev.w, 'base64'));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
