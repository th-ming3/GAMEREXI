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
  const out = await page.evaluate(async (bodySrc, glideSrc) => {
    function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
    function crop(im, x0, y0, x1, y1) {
      const bw = Math.round((x1 - x0) * im.width), bh = Math.round((y1 - y0) * im.height);
      const bc = document.createElement('canvas'); bc.width = bw; bc.height = bh;
      bc.getContext('2d').drawImage(im, x0 * im.width, y0 * im.height, bw, bh, 0, 0, bw, bh);
      return bc;
    }
    // wipe: alpha=0 cho pixel nằm trái/phải của đoạn thẳng (x1,y1)-(x2,y2)
    function wipeLine(c, x1f, y1f, x2f, y2f, side) {
      const x = c.getContext('2d');
      const W = c.width, H = c.height;
      const id = x.getImageData(0, 0, W, H), d = id.data;
      const ax = x1f * W, ay = y1f * H, bx = x2f * W, by = y2f * H;
      for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
        const cross = (bx - ax) * (yy - ay) - (by - ay) * (xx - ax);
        if (side === 'left' ? cross < 0 : cross > 0) d[(yy * W + xx) * 4 + 3] = 0;
      }
      x.putImageData(id, 0, 0);
      return c;
    }
    function toWebp(c) { return { webp: c.toDataURL('image/webp', 0.85).split(',')[1], w: c.width, h: c.height }; }
    const body = await loadImage(bodySrc);
    // A: thân pose V crop chặt + wipe 2 cánh cũ
    const a = crop(body, 0.26, 0.10, 0.90, 1.0);
    wipeLine(a, 0.30, 0.0, 0.10, 0.62, 'left');   // cắt cánh trái cũ (góc trên trái)
    wipeLine(a, 0.58, 0.0, 0.80, 0.34, 'right');  // cắt cánh phải cũ (góc trên phải)
    // B: thân giữa từ ảnh glide
    const glide = await loadImage(glideSrc);
    const b = crop(glide, 0.30, 0.16, 0.64, 0.98);
    return { a: toWebp(a), b: toWebp(b) };
  }, tj.egret, tj.egretMid);
  const mk = async (src, W, H) => {
    return await page.evaluate(async (src) => {
      function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
      const im = await loadImage('data:image/webp;base64,' + src);
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d');
      x.fillStyle = '#9fb86e'; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(im, 0, 0);
      return c.toDataURL('image/png').split(',')[1];
    }, src);
  };
  fs.writeFileSync('prev-body-a.png', Buffer.from(await mk(out.a.webp), 'base64'));
  fs.writeFileSync('prev-body-b.png', Buffer.from(await mk(out.b.webp), 'base64'));
  console.log('A', out.a.w + 'x' + out.a.h, ' B', out.b.w + 'x' + out.b.h);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
