const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function captureCanvas(page, file) {
  const data = await Promise.race([
    page.evaluate(() => new Promise(resolve => {
    const renderer = window.__renderer;
    const original = renderer.render.bind(renderer);
    renderer.render = (scene, camera) => {
      try {
        original(scene, camera);
        resolve(renderer.domElement.toDataURL('image/png'));
      } finally {
        renderer.render = original;
      }
    };
  })),
    new Promise((_, reject) => setTimeout(() => reject(new Error('captureCanvas timeout')), 20000))
  ]);
  fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
}

(async () => {
  let browser;
  const errors = [];
  try {
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      headless: true,
      args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
      defaultViewport: { width: 390, height: 844, deviceScaleFactor: 1 }
    });
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => {
      if (message.type() === 'error' || message.type() === 'warning') errors.push(message.type() + ': ' + message.text());
    });
    await page.goto('file:///' + path.join(ROOT, 'game.html').replace(/\\/g, '/') + '?capture=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
    const started = Date.now();
    while (Date.now() - started < 60000) {
      if (await page.evaluate(() => window.__bootOK && window.__charLoaded)) break;
      await sleep(400);
    }
    await page.evaluate(() => { window.__ff(6); window.__setSun(1.05); window.__goHome(); });
    await sleep(2200);
    const before = await page.evaluate(() => ({
      player: window.__playerPos.toArray(),
      camera: window.CAM.toArray(),
      actualCamera: window.__cam3d.position.toArray(),
      target: window.TARGET.toArray(),
      projectedPlayer: window.__playerPos.clone().project(window.__cam3d).toArray(),
      aspect: window.__cam3d.aspect,
      fov: window.__cam3d.fov,
      canvas: [window.__renderer.domElement.width, window.__renderer.domElement.height],
      css: [window.__renderer.domElement.clientWidth, window.__renderer.domElement.clientHeight],
      contextLost: window.__renderer.getContext().isContextLost(),
      preserveBuffer: window.__renderer.getContext().getContextAttributes().preserveDrawingBuffer,
      glError: window.__renderer.getContext().getError(),
      colorMaskConstant: window.__renderer.getContext().COLOR_MASK,
      colorMask: String(window.__renderer.getContext().getParameter(window.__renderer.getContext().COLOR_MASK)),
      colorMaskDirect: String(window.__renderer.getContext().getParameter(0x0C23)),
      clearColor: String(window.__renderer.getContext().getParameter(window.__renderer.getContext().COLOR_CLEAR_VALUE)),
      viewport: String(window.__renderer.getContext().getParameter(window.__renderer.getContext().VIEWPORT)),
      scissor: String(window.__renderer.getContext().getParameter(window.__renderer.getContext().SCISSOR_BOX)),
      scissorEnabled: window.__renderer.getContext().getParameter(window.__renderer.getContext().SCISSOR_TEST),
      exposure: window.__renderer.toneMappingExposure,
      autoClear: window.__renderer.autoClear,
      autoClearColor: window.__renderer.autoClearColor,
      autoClearDepth: window.__renderer.autoClearDepth,
      sceneBackground: String(window.__scene3d.background),
      gardenVisible: window.__garden.visible,
      calls: window.__renderer.info.render.calls,
      triangles: window.__renderer.info.render.triangles,
      help: getComputedStyle(document.getElementById('hudHelp')).display,
      buttons: Array.from(document.querySelectorAll('[data-k], [data-a]')).map(button => ({ text: button.textContent, aria: button.getAttribute('aria-label') }))
    }));
    const up = await page.$('[data-k="w"]');
    const rect = await up.boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await sleep(650);
    const during = await page.evaluate(() => ({ player: window.__playerPos.toArray(), pressed: !!window.__keys.w }));
    await page.mouse.up();
    await sleep(200);
    const after = await page.evaluate(() => ({
      player: window.__playerPos.toArray(),
      pressed: !!window.__keys.w,
      blurRelease: (() => { window.__keys.w = true; window.dispatchEvent(new Event('blur')); return !window.__keys.w; })()
    }));
    await sleep(1200);
    await page.evaluate(() => { window.__renderer.setClearColor(0xff0000, 1); });
    await captureCanvas(page, path.join(ROOT, 'shots', 'mobile-red-debug.png'));
    await page.screenshot({ path: path.join(ROOT, 'shots', 'mobile-red-page.png') });
    await page.evaluate(() => { window.__renderer.setClearColor(0x000000, 0); });
    await page.setViewport({ width: 1100, height: 700 });
    await sleep(500);
    await page.setViewport({ width: 390, height: 844 });
    await sleep(1400);
    const resized = await page.evaluate(() => ({
      calls: window.__renderer.info.render.calls,
      triangles: window.__renderer.info.render.triangles,
      help: getComputedStyle(document.getElementById('hudHelp')).display
    }));
    const secondRendererData = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 390; canvas.height = 844;
      const renderer = new THREE.WebGLRenderer({ canvas, preserveDrawingBuffer: true });
      renderer.setClearColor(0xff0000, 1);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 390 / 844, 0.1, 20);
      camera.position.z = 4;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
      scene.add(mesh);
      renderer.render(scene, camera);
      return canvas.toDataURL('image/png');
    });
    fs.writeFileSync(path.join(ROOT, 'shots', 'mobile-second-renderer.png'), Buffer.from(secondRendererData.split(',')[1], 'base64'));
    const originalSimpleData = await page.evaluate(() => {
      const renderer = window.__renderer;
      renderer.setClearColor(0xff0000, 1);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 390 / 844, 0.1, 20);
      camera.position.z = 4;
      scene.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshBasicMaterial({ color: 0x00ff00 })));
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    });
    fs.writeFileSync(path.join(ROOT, 'shots', 'mobile-original-simple.png'), Buffer.from(originalSimpleData.split(',')[1], 'base64'));
    const originalSceneSimpleCamera = await page.evaluate(() => {
      const renderer = window.__renderer;
      renderer.setClearColor(0xff0000, 1);
      const camera = new THREE.PerspectiveCamera(50, 390 / 844, 0.1, 145);
      camera.position.set(0.4, 4.618, -0.8);
      camera.lookAt(window.TARGET);
      renderer.render(window.__scene3d, camera);
      return renderer.domElement.toDataURL('image/png');
    });
    fs.writeFileSync(path.join(ROOT, 'shots', 'mobile-original-scene-simple-camera.png'), Buffer.from(originalSceneSimpleCamera.split(',')[1], 'base64'));
    const simpleSceneOriginalCamera = await page.evaluate(() => {
      const renderer = window.__renderer;
      renderer.setClearColor(0xff0000, 1);
      const scene = new THREE.Scene();
      scene.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshBasicMaterial({ color: 0x00ff00 })));
      renderer.render(scene, window.__cam3d);
      return renderer.domElement.toDataURL('image/png');
    });
    fs.writeFileSync(path.join(ROOT, 'shots', 'mobile-simple-scene-original-camera.png'), Buffer.from(simpleSceneOriginalCamera.split(',')[1], 'base64'));
    const withoutGarden = await page.evaluate(() => {
      const renderer = window.__renderer;
      renderer.setClearColor(0xff0000, 1);
      const camera = new THREE.PerspectiveCamera(50, 390 / 844, 0.1, 145);
      camera.position.set(0.4, 4.618, -0.8); camera.lookAt(window.TARGET);
      window.__garden.visible = false;
      renderer.render(window.__scene3d, camera);
      window.__garden.visible = true;
      return renderer.domElement.toDataURL('image/png');
    });
    fs.writeFileSync(path.join(ROOT, 'shots', 'mobile-without-garden.png'), Buffer.from(withoutGarden.split(',')[1], 'base64'));
    const withoutGround = await page.evaluate(() => {
      const renderer = window.__renderer;
      renderer.setClearColor(0xff0000, 1);
      const camera = new THREE.PerspectiveCamera(50, 390 / 844, 0.1, 145);
      camera.position.set(0.4, 4.618, -0.8); camera.lookAt(window.TARGET);
      window.__baseGround.visible = false;
      renderer.render(window.__scene3d, camera);
      window.__baseGround.visible = true;
      return renderer.domElement.toDataURL('image/png');
    });
    fs.writeFileSync(path.join(ROOT, 'shots', 'mobile-without-ground.png'), Buffer.from(withoutGround.split(',')[1], 'base64'));
    const noFog = await page.evaluate(() => {
      const renderer = window.__renderer;
      renderer.setClearColor(0xff0000, 1);
      const camera = new THREE.PerspectiveCamera(50, 390 / 844, 0.1, 145);
      camera.position.set(0.4, 4.618, -0.8); camera.lookAt(window.TARGET);
      const fog = window.__scene3d.fog;
      window.__scene3d.fog = null;
      renderer.render(window.__scene3d, camera);
      window.__scene3d.fog = fog;
      return renderer.domElement.toDataURL('image/png');
    });
    fs.writeFileSync(path.join(ROOT, 'shots', 'mobile-no-fog.png'), Buffer.from(noFog.split(',')[1], 'base64'));
    const overrideBasic = await page.evaluate(() => {
      const renderer = window.__renderer;
      renderer.setClearColor(0xff0000, 1);
      const camera = new THREE.PerspectiveCamera(50, 390 / 844, 0.1, 145);
      camera.position.set(0.4, 4.618, -0.8); camera.lookAt(window.TARGET);
      window.__scene3d.overrideMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, fog: false });
      renderer.render(window.__scene3d, camera);
      window.__scene3d.overrideMaterial = null;
      return renderer.domElement.toDataURL('image/png');
    });
    fs.writeFileSync(path.join(ROOT, 'shots', 'mobile-override-basic.png'), Buffer.from(overrideBasic.split(',')[1], 'base64'));
    const greenTraverse = await page.evaluate(() => {
      const renderer = window.__renderer;
      renderer.setClearColor(0xff0000, 1);
      const camera = new THREE.PerspectiveCamera(50, 390 / 844, 0.1, 145);
      camera.position.set(0.4, 4.618, -0.8); camera.lookAt(window.TARGET);
      const replacements = [];
      const green = new THREE.MeshBasicMaterial({ color: 0x00ff00, fog: false });
      window.__scene3d.traverse(object => {
        if (!object.isMesh) return;
        replacements.push([object, object.material]);
        object.material = green;
      });
      renderer.render(window.__scene3d, camera);
      window.__greenDebug = {
        exposure: renderer.toneMappingExposure,
        clear: renderer.getClearColor(new THREE.Color()).getHexString(),
        alpha: renderer.getClearAlpha(),
        green: { color: green.color.getHexString(), opacity: green.opacity, transparent: green.transparent, blending: green.blending, vertexColors: green.vertexColors, fog: green.fog },
        fog: window.__scene3d.fog && window.__scene3d.fog.color.getHexString(),
        calls: renderer.info.render.calls
      };
      replacements.forEach(([object, material]) => { object.material = material; });
      return renderer.domElement.toDataURL('image/png');
    });
    fs.writeFileSync(path.join(ROOT, 'shots', 'mobile-green-traverse.png'), Buffer.from(greenTraverse.split(',')[1], 'base64'));
    const clearOnly = await page.evaluate(() => {
      const renderer = window.__renderer;
      renderer.setClearColor(0xff0000, 1);
      renderer.clear();
      return renderer.domElement.toDataURL('image/png');
    });
    fs.writeFileSync(path.join(ROOT, 'shots', 'mobile-clear-only.png'), Buffer.from(clearOnly.split(',')[1], 'base64'));
    const culprit = await page.evaluate(() => {
      const renderer = window.__renderer;
      const gl = renderer.getContext();
      const children = window.__garden.children;
      const saved = children.map(child => child.visible);
      renderer.setClearColor(0xff0000, 1);
      const camera = new THREE.PerspectiveCamera(50, 390 / 844, 0.1, 145);
      camera.position.set(0.4, 4.618, -0.8); camera.lookAt(window.TARGET);
      function centerIsBlack() {
        renderer.render(window.__scene3d, camera);
        const pixel = new Uint8Array(4);
        gl.readPixels(Math.floor(renderer.domElement.width / 2), Math.floor(renderer.domElement.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        return pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0;
      }
      let low = 0, high = children.length;
      while (high - low > 1) {
        const mid = Math.floor((low + high) / 2);
        children.forEach((child, index) => { child.visible = saved[index] && index >= low && index < mid; });
        if (centerIsBlack()) high = mid; else low = mid;
      }
      children.forEach((child, index) => { child.visible = saved[index] && index === low; });
      const object = children[low];
      const material = object.material && !Array.isArray(object.material) ? object.material : null;
      object.geometry.computeBoundingSphere();
      const matrices = object.instanceMatrix ? Array.from(object.instanceMatrix.array) : [];
      let matrixMin = Infinity, matrixMax = -Infinity, matrixNaN = 0;
      matrices.forEach(value => { if (!Number.isFinite(value)) matrixNaN++; else { matrixMin = Math.min(matrixMin, value); matrixMax = Math.max(matrixMax, value); } });
      const result = {
        instanced: !!object.isInstancedMesh,
        instanceCount: object.count,
        geometryRadius: object.geometry.boundingSphere && object.geometry.boundingSphere.radius,
        matrixMin, matrixMax, matrixNaN,
        matrixSample: matrices.slice(0, 32),
        index: low,
        total: children.length,
        type: object.type,
        name: object.name,
        geometry: object.geometry && object.geometry.type,
        position: object.position.toArray(),
        scale: object.scale.toArray(),
        color: material && material.color && material.color.getHexString(),
        materialType: material && material.type,
        centerBlack: centerIsBlack(),
        userData: object.userData
      };
      const image = renderer.domElement.toDataURL('image/png');
      children.forEach((child, index) => { child.visible = saved[index]; });
      return { result, image };
    });
    fs.writeFileSync(path.join(ROOT, 'shots', 'mobile-culprit.png'), Buffer.from(culprit.image.split(',')[1], 'base64'));
    const distance = Math.hypot(after.player[0] - before.player[0], after.player[2] - before.player[2]);
    const passed = during.pressed && !after.pressed && distance > 0.01 && after.blurRelease && before.help === 'none' && resized.help === 'none' && before.buttons.every(button => button.aria && !/[跳飞]/.test(button.text)) && errors.length === 0;
    const greenDebug = await page.evaluate(() => window.__greenDebug);
    console.log(JSON.stringify({ before, during, after, distance, resized, greenDebug, culprit: culprit.result, passed, errors }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
