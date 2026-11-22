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
  await new Promise(r => setTimeout(r, 2600));
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) { const ok = await page.evaluate(() => window.__bootOK === true); if (ok) break; await new Promise(r => setTimeout(r, 500)); }
  const mx = () => page.evaluate(() => {
    const g = window.__birds[0].geometry.attributes.position.array;
    let m = 0;
    for (let i = 1; i < g.length; i += 3) if (Math.abs(g[i]) > m) m = Math.abs(g[i]);
    return +m.toFixed(3);
  });
  const base = [];
  for (let i = 0; i < 6; i++) { base.push(await mx()); await new Promise(r => setTimeout(r, 180)); }
  await page.evaluate(() => { window.__birds[0].userData.startleE = (window.__birds[0].userData.__t = undefined, undefined); });
  // dùng elapsed bên trong: set qua startleE = giá trị elapsed hiện tại — đọc từ update qua trick: đặt startleE = elapsed-0.01
  await page.evaluate(() => {
    // elapsed không export; nhưng update dùng t=elapsed mỗi frame — set startleE = elapsed-0 vì có thể đọc qua __ff tích luỹ? Dùng cách: ghi trực tiếp và đo ngay các frame kế
    window.__birds[0].userData.startleE = 0; // t luôn > 0 → boost = max(0, 1 - t/1.2): chỉ có hiệu lực nếu t<1.2 — t đã lớn!
  });
  // cách đúng: startleE phải = elapsed hiện tại. elapsed = performance-independent; đọc qua position của một con bướm? Đơn giản hơn: __ff không đổi elapsed tương đối... Thử đo bằng hàm kích: thêm window hook? Không có. Vậy đo Boost bằng cách set startleE rất nhỏ rồi __ff lùi? Không lùi được.
  await page.screenshot({ path: '/home/user/egret-touch-note.png' });
  console.log('BASE max warp:', JSON.stringify(base));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
