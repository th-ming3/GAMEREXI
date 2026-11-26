/* ============================================================
 * CANH DONG — CORE WORLD (chung cho game.html va invite.html)
 * Mot IIFE duy nhat chia se scope cho toan bo he thong the gioi.
 * Thu tu section chinh trong file:
 *   1. Du lieu invite da chon (top-level, chay ca 2 trang)
 *   2. VUON HOA 3D: renderer/scene/camera + boot watchdog
 *   3. Anh sang "gio vang", mat troi, god ray, mau
 *   4. Texture canvas ve tay (canh hoa, da bong, grass, dat)
 *   5. BUOM + ONG + CO (dung tu ANH CHUP THAT base64 __TEXTURES)
 *   6. Hoa tu noi len roi no; vuon gardenRoot
 *   7. CHUNK STREAMING (game mode): map vo tan, seed mulberry32
 *      - trong chunk: hoa dai, photo-tree (anh that 2 plane cheo),
 *      - da, bong cay; userData co flowers[]/hasTree cho probe
 * Luu y: cac section CHIA SE bien local trong cung IIFE ->
 * build.py noi thuan fanhle thanh mot <script> duy nhat (khong cat scope).
 * Hooks debug: window.__cam __ff __garden __bees __birds __TEXTURES
 *   __bootOK __chunkStats __spawnBurstW __hemi __key __renderer __amb ...
 * ============================================================ */

/* ============ dữ liệu đã chọn (giữ logic của trang gốc) ============ */
function read(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
function byId(id) { return document.getElementById(id); }
function formatDay(value) {
  if (!value) return 'Chưa chọn';
  var d = new Date(value + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}

var dayVal = read('freeDay');
[['day', dayVal ? formatDay(dayVal) : '', !!dayVal],
 ['food', read('food'), !!read('food')],
 ['drink', read('drink'), !!read('drink')],
 ['place', read('place'), !!read('place')]
].forEach(function (r) {
  var el = byId(r[0]);
  if (!el) return;
  el.textContent = r[1] || 'Chưa chọn';
  if (r[2]) el.classList.add('set');
});

var statusLine = byId('statusLine');
var statusText = byId('statusText');
function markDone() { if (statusLine) statusLine.classList.add('done'); if (statusText) statusText.textContent = 'Đã ghi nhận lời trả lời'; }
function markFail() { if (statusText) statusText.textContent = 'Chưa ghi được, thử lại sau'; }
function markNone() { if (statusText) statusText.textContent = 'Chưa có lựa nào được ghi lại'; }
function markSavedLocal() {
  if (statusLine) statusLine.classList.add('done');
  if (statusText) statusText.textContent = 'Đã lưu ở máy này (chưa gửi đi đâu)';
}
function markFailRetry(retry) {
  if (statusLine) statusLine.classList.remove('done');
  if (statusText) statusText.textContent = 'Chưa gửi được — nhấn để thử lại';
  if (statusLine && retry) {
    statusLine.style.cursor = 'pointer';
    statusLine.onclick = function () { retry(); };
  }
}

var consented = read('consent') === 'Vâng';
if (!window.__GAME && consented) {
  var submitted = false;
  try { submitted = !!sessionStorage.getItem('inviteSubmitted'); } catch (e) {}
  var apiBase = String(window.API_BASE || '').replace(/\/$/, '');
  function sendInvitePayload() {
    try { sessionStorage.setItem('inviteSubmitted', '1'); } catch (e) {}
    if (!apiBase || typeof fetch !== 'function') {
      /* Không có backend: giữ trung thực — đã lưu ở máy, chưa gửi đi đâu */
      try { localStorage.setItem('inviteSavedAt', String(Date.now())); } catch (e2) {}
      markSavedLocal();
      return;
    }
    fetch(apiBase + '/api/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent: 'Vâng', freeDay: dayVal, food: read('food'), drink: read('drink'), place: read('place') })
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      markDone();
    }).catch(function () {
      /* Thất bại thật: nói rõ chưa gửi được + cho bấm thử lại; KHÔNG báo thành công giả */
      markFailRetry(function () { markFail(); sendInvitePayload(); });
    });
  }
  if (!submitted) { sendInvitePayload(); }
  else { markDone(); }
} else { markNone(); }

/* ================= VƯỜN HOA 3D ================= */
(function () {
  if (!window.THREE) return;
  var reduced = false;
  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var isMobile = window.innerWidth < 880;

  /* ---- texture từ ẢNH CHỤP THẬT (nhúng base64) ---- */
  var TXT = window.__TEXTURES || {};
  function texFromURL(url, repX) {
    var img = new Image();
    img.src = url;
    var t = new THREE.Texture(img);
    img.onload = function () { t.needsUpdate = true; };
    if (repX) { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = 4;
    return t;
  }
  var petalTex = TXT.petal ? texFromURL(TXT.petal, false) : null;
  var groundPhotoTex = TXT.ground ? texFromURL(TXT.ground, true) : null;
  if (groundPhotoTex) groundPhotoTex.repeat.set(12, 12);

  function buildFlatGarden() {
    if (document.getElementById('flatGarden')) return;
    var st = document.createElement('style');
    st.textContent = '@keyframes fgSway{0%,100%{transform:rotate(-3.5deg)}50%{transform:rotate(3.5deg)}}@keyframes fgFall{0%{transform:translateY(-6vh) rotate(0)}100%{transform:translateY(106vh) rotate(320deg)}}@keyframes fgBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}';
    document.head.appendChild(st);
    var g = document.createElement('div');
    g.id = 'flatGarden';
    g.style.cssText = 'position:fixed;inset:0;z-index:1;overflow:hidden;pointer-events:none';
    var h2 = document.createElement('div');
    h2.style.cssText = 'position:absolute;left:-35%;bottom:-36%;width:170%;height:52%;background:#dcdfb4;border-radius:50% 46% 0 0;opacity:.85';
    g.appendChild(h2);
    var h1 = document.createElement('div');
    h1.style.cssText = 'position:absolute;left:-25%;bottom:-44%;width:150%;height:72%;background:radial-gradient(50% 46% at 50% 38%, #c6d19f 0%, #b2c08c 62%, #a5b17f 100%);border-radius:46% 54% 0 0';
    g.appendChild(h1);
    var cols = ['#f6c6a2', '#f3b28c', '#fbdcc6', '#e89a6b', '#f7e3cc', '#fff4e4'];
    for (var fi = 0; fi < 78; fi++) {
      var s = rand(22, 58);
      var petals = '';
      for (var k = 0; k < 5; k++) petals += '<ellipse cx="20" cy="9.5" rx="6.4" ry="10.2" fill="' + cols[fi % cols.length] + '" transform="rotate(' + (k * 72) + ' 20 20)"/>';
      var f = document.createElement('div');
      f.style.cssText = 'position:absolute;left:' + rand(0, 100).toFixed(1) + '%;top:' + rand(46, 93).toFixed(1) + '%;width:' + s.toFixed(0) + 'px;height:' + s.toFixed(0) + 'px;animation:fgSway ' + rand(2.6, 5).toFixed(2) + 's ease-in-out ' + rand(0, 3).toFixed(2) + 's infinite;transform-origin:50% 92%';
      f.innerHTML = '<svg viewBox="0 0 40 40" width="100%" height="100%">' + petals + '<circle cx="20" cy="20" r="5" fill="#e9b65a"/></svg>';
      g.appendChild(f);
    }
    for (var p2 = 0; p2 < 14; p2++) {
      var d = document.createElement('div');
      d.style.cssText = 'position:absolute;left:' + rand(0, 100).toFixed(1) + '%;top:-6%;width:11px;height:15px;background:' + cols[p2 % cols.length] + ';border-radius:10px 10px 10px 2px;opacity:.85;animation:fgFall ' + rand(7, 13).toFixed(1) + 's linear ' + rand(0, 12).toFixed(1) + 's infinite';
      g.appendChild(d);
    }
    for (var b3 = 0; b3 < 3; b3++) {
      var bee = document.createElement('div');
      bee.style.cssText = 'position:absolute;left:' + rand(15, 80).toFixed(1) + '%;top:' + rand(30, 55).toFixed(1) + '%;width:15px;height:15px;border-radius:50%;background:radial-gradient(circle at 35% 35%, #ffd98a, #e2a23c 72%);box-shadow:0 0 9px rgba(255,205,120,.85);animation:fgBob ' + rand(2, 3.6).toFixed(1) + 's ease-in-out infinite';
      g.appendChild(bee);
    }
    document.body.appendChild(g);
  }
  function bootStage(title, detail, progress) {
    var status = byId('bootStatus'), detailEl = byId('bootDetail'), bar = byId('bootProgress');
    if (status) status.textContent = title;
    if (detailEl) detailEl.textContent = detail;
    if (bar) bar.style.width = progress + '%';
  }
  function failBoot(msg) {
    var sp = document.getElementById('bootSplash');
    if (sp) sp.remove();
    var canvas2 = byId('stage3d');
    if (canvas2) canvas2.style.display = 'none';
    buildFlatGarden();
    var note = document.createElement('div');
    note.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:98;background:rgba(255,250,244,.95);border:1px solid #e8c9a8;border-radius:14px;padding:13px 20px;color:#a05a3a;font:14px/1.55 Georgia,serif;box-shadow:0 8px 30px rgba(160,90,58,.18);max-width:min(92vw,480px);text-align:center';
    note.innerHTML = msg || 'Thiết bị này không chạy được khung 3D — đã chuyển sang <b>vườn hoa 2D dự phòng</b>.<br><span style="font-size:12.5px;opacity:.75">Muốn xem bản 3D đầy đủ: mở bằng Chrome / Edge và bật “tăng tốc phần cứng”.</span>';
    document.body.appendChild(note);
  }
  setTimeout(function () {
    if (window.__bootOK) return;
    bootStage('Vườn đang nở chậm hơn thường ngày', 'Thiết bị yếu nên cần thêm chút thởi gian; sắp chuyển sang bản nhẹ nếu cần', 68);
  }, 30000);
  setTimeout(function () {
    if (window.__bootOK) return;
    failBoot('Máy này chưa khởi động được khung 3D — đã chuyển sang <b>vườn hoa 2D dự phòng</b> để không bỏ lỡ lời mời.');
  }, 60000);
  var canvas = byId('stage3d');
  var captureMode = /[?&]capture=1(?:&|$)/.test(window.location.search);
  var liteDisabled = /[?&]nolite=1(?:&|$)/.test(window.location.search);
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: captureMode });
  } catch (e) { failBoot(); return; }
  renderer.domElement.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    failBoot('Mất kết nối đồ hoạ giữa chừng — tải lại trang để xem lại vườn hoa nhé.');
  });
  var LOW = false;
  try {
    var gl2 = renderer.getContext();
    var dbg2 = gl2.getExtension('WEBGL_debug_renderer_info');
    var gpuStr = dbg2 ? String(gl2.getParameter(dbg2.UNMASKED_RENDERER_WEBGL) || '') : '';
    LOW = /swiftshader|llvmpipe|software|basic render/i.test(gpuStr);
  } catch (eLow) {}
  if (isMobile) LOW = true;
  try {
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile || LOW ? 1.25 : 2));
  renderer.shadowMap.enabled = !LOW;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  } catch (e3d) { failBoot(); return; }

  bootStage('Đang dựng ánh sáng và địa hình', 'Khởi tạo WebGL và những vùng đầu tiên', 28);
  var scene = new THREE.Scene();
  window.__scene3d = scene;
  window.__renderer = renderer; /* debug */
  scene.fog = new THREE.Fog(0xaab37f, 55, 145);

  var camera = new THREE.PerspectiveCamera(36, 1, 0.1, 145);
  window.__cam3d = camera; /* debug */

  /* ---- ánh sáng giờ vàng ---- */
  var hemiL = new THREE.HemisphereLight(0xfff1e0, 0xd9b394, 1.12);
  scene.add(hemiL);
  window.__hemi = hemiL;
  var key = new THREE.DirectionalLight(0xffe2bd, 2.45);
  window.__key = key;
  key.position.set(-6, 9, -5);
  key.castShadow = true;
  key.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
  key.shadow.camera.left = -11; key.shadow.camera.right = 11;
  key.shadow.camera.top = 11; key.shadow.camera.bottom = -11;
  key.shadow.camera.near = 2; key.shadow.camera.far = 45;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  key.shadow.camera.updateProjectionMatrix();
  scene.add(key);
  scene.add(key.target);
  var rim = new THREE.DirectionalLight(0xffc9a3, 1.0);
  rim.position.set(-5, 4, -4);
  scene.add(rim);
  var fill = new THREE.DirectionalLight(0xffe8d6, 0.26);
  fill.position.set(-2, 1.6, 4.5);
  scene.add(fill);

  /* ---- mặt trời thấy được trên trời (đĩa nóng + quầng additive) ---- */
  var sunCoreTex = softDisc('rgba(255,250,230,1)', 'rgba(255,205,135,0)');
  var sunHaloTex = softDisc('rgba(255,213,148,0.4)', 'rgba(255,205,135,0)');
  var sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunCoreTex, transparent: true, depthWrite: false, fog: false }));
  sunCore.scale.set(12, 12, 1);
  sunCore.position.set(-9.5, 6.8, -19);
  scene.add(sunCore);
  var sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunHaloTex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0.7 }));
  sunHalo.scale.set(32, 32, 1);
  sunHalo.position.copy(sunCore.position);
  scene.add(sunHalo);

  /* ---- tiện ích ---- */
  function smooth(x, a, b) { return THREE.MathUtils.smoothstep(x, a, b); }
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function easeInOutSine(x) { return -(Math.cos(Math.PI * x) - 1) / 2; }
  function easeOutBack(x) { var c1 = 0.85, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function softDisc(inner, outer) {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grd.addColorStop(0, inner);
    grd.addColorStop(0.55, outer);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  var blobTex = softDisc('rgba(60,34,20,0.45)', 'rgba(60,34,20,0.12)');
  var glowTex = softDisc('rgba(255,255,255,0.85)', 'rgba(255,255,255,0.28)');

  /* ---- vân cánh hoa vẽ tay (map nhân với màu đỉnh) ---- */
  function makeVeinTex() {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(176,138,112,0.42)';
    g.lineWidth = 2.2;
    for (var i = 0; i < 7; i++) {
      var off = (i - 3) * 30;
      g.beginPath();
      g.moveTo(128, 258);
      g.quadraticCurveTo(128 + off * 0.5, 150, 128 + off, 26 + Math.abs(off) * 0.35);
      g.stroke();
    }
    g.strokeStyle = 'rgba(190,158,132,0.2)';
    g.lineWidth = 1.1;
    for (var j = 0; j < 9; j++) {
      var y = 40 + j * 24;
      g.beginPath();
      g.moveTo(20 + j * 6, y);
      g.quadraticCurveTo(128, y - 14, 236 - j * 6, y);
      g.stroke();
    }
    for (var s = 0; s < 46; s++) {
      g.fillStyle = 'rgba(190,130,95,' + (0.1 + Math.random() * 0.16) + ')';
      g.beginPath();
      g.arc(40 + Math.random() * 176, 196 + Math.random() * 56, 1 + Math.random() * 2.2, 0, 6.283);
      g.fill();
    }
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4;
    return tex;
  }
  var veinTex = makeVeinTex();

  /* ---- da cánh hoa: gân chính + gân nhánh + viền + đốm, vẽ tay ---- */
  function paintPetalSkin() {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 256, 256);
    /* loang mềm */
    for (var bl = 0; bl < 7; bl++) {
      var bx = 40 + Math.random() * 176, by = 60 + Math.random() * 170;
      var rg = g.createRadialGradient(bx, by, 2, bx, by, 26 + Math.random() * 22);
      rg.addColorStop(0, 'rgba(214,150,112,0.09)');
      rg.addColorStop(1, 'rgba(214,150,112,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, 256, 256);
    }
    /* gân chính tỏa từ cuống, cong nhẹ */
    var tips = [[52, 18], [86, 12], [122, 8], [158, 12], [196, 20], [222, 40]];
    for (var vi = 0; vi < tips.length; vi++) {
      var tp = tips[vi];
      var mx = (128 + tp[0]) / 2 + (vi - 2.5) * 9;
      g.strokeStyle = 'rgba(186,116,88,0.4)';
      g.lineWidth = 3.2 - Math.abs(vi - 2.5) * 0.35;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(128, 262);
      g.quadraticCurveTo(mx, 140, tp[0], tp[1]);
      g.stroke();
      /* gân nhánh */
      for (var br = 0; br < 3; br++) {
        var t0 = 0.3 + br * 0.2;
        var px = (1 - t0) * (1 - t0) * 128 + 2 * (1 - t0) * t0 * mx + t0 * t0 * tp[0];
        var py = (1 - t0) * (1 - t0) * 262 + 2 * (1 - t0) * t0 * 140 + t0 * t0 * tp[1];
        var dir = vi < 2.5 ? 1 : -1;
        g.strokeStyle = 'rgba(196,132,102,0.22)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(px, py);
        g.quadraticCurveTo(px + dir * 18, py - 20, px + dir * 34, py - 44);
        g.stroke();
      }
    }
    /* gân ngang mảnh */
    g.strokeStyle = 'rgba(200,140,110,0.14)';
    g.lineWidth = 1;
    for (var hv = 0; hv < 8; hv++) {
      var hy = 60 + hv * 25;
      g.beginPath();
      g.moveTo(30 + hv * 5, hy);
      g.quadraticCurveTo(128, hy - 10, 226 - hv * 5, hy);
      g.stroke();
    }
    /* viền cánh đậm hơn */
    for (var e = 0; e < 3; e++) {
      g.strokeStyle = 'rgba(168,92,62,' + (0.16 - e * 0.05) + ')';
      g.lineWidth = 4 + e * 5;
      g.beginPath();
      g.moveTo(10, 2);
      g.quadraticCurveTo(128, -8, 246, 2);
      g.stroke();
    }
    /* chấm phấn cuống */
    for (var sp2 = 0; sp2 < 40; sp2++) {
      g.fillStyle = 'rgba(196,128,94,' + (0.1 + Math.random() * 0.16) + ')';
      g.beginPath();
      g.arc(36 + Math.random() * 184, 208 + Math.random() * 44, 1 + Math.random() * 2, 0, 6.283);
      g.fill();
    }
    var tex2 = new THREE.CanvasTexture(c);
    tex2.anisotropy = 4;
    return tex2;
  }
  var petalSkinTex = paintPetalSkin();

  /* ---- vệt nắng trời (god ray) ---- */
  function makeShaftTex() {
    var c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    var g = c.getContext('2d');
    var lg = g.createLinearGradient(0, 0, 0, 256);
    lg.addColorStop(0, 'rgba(255,236,204,0.9)');
    lg.addColorStop(0.55, 'rgba(255,222,180,0.35)');
    lg.addColorStop(1, 'rgba(255,214,166,0)');
    g.fillStyle = lg;
    g.fillRect(0, 0, 128, 256);
    var sg = g.createLinearGradient(0, 0, 128, 0);
    sg.addColorStop(0, 'rgba(0,0,0,0.55)');
    sg.addColorStop(0.5, 'rgba(0,0,0,0)');
    sg.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = sg;
    g.fillRect(0, 0, 128, 256);
    return new THREE.CanvasTexture(c);
  }
  var shaftTex = makeShaftTex();

  /* ---- bướm dựng từ ẢNH CHỤP THẬT (đã cắt tách thân / từng nửa cánh) ---- */
  var SPECIES_IMG = {
    monarch: { body: TXT.mBody, wl: TXT.mWL, wr: TXT.mWR },
    white: { body: TXT.wBody, wl: TXT.wWL, wr: TXT.wWR }
  };
  function makeButterfly(species, scaleF) {
    var src = SPECIES_IMG[species];
    var b = new THREE.Group();
    var texBody = texFromURL(src.body, false);
    var texWL = texFromURL(src.wl, false);
    var texWR = texFromURL(src.wr, false);
    function mkWing(tex, isLeft) {
      var img = tex.image;
      var ratio = (img.width && img.height) ? img.width / img.height : 0.92;
      var Hk = 0.5, Wk = Hk * ratio;
      var mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, alphaTest: 0.12, roughness: 0.55 });
      var geo = new THREE.PlaneGeometry(Wk, Hk, 8, 6);
      var pos = geo.attributes.position;
      for (var vi = 0; vi < pos.count; vi++) {
        var vx = pos.getX(vi);
        pos.setZ(vi, -0.09 * (vx * vx) / Wk);
      }
      geo.computeVertexNormals();
      var mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(isLeft ? (-Wk / 2 + 0.015) : (Wk / 2 - 0.015), 0.02, 0);
      var grp = new THREE.Group();
      grp.add(mesh);
      grp.position.set(isLeft ? 0.015 : -0.015, 0, 0);
      return grp;
    }
    var gL = mkWing(texWL, true);
    var gR = mkWing(texWR, false);
    var bimg = texBody.image;
    var bRatio = (bimg.width && bimg.height) ? bimg.width / bimg.height : 0.14;
    var bh = 0.46, bw = bh * bRatio;
    var bodyMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(bw, bh),
      new THREE.MeshStandardMaterial({ map: texBody, side: THREE.DoubleSide, transparent: true, alphaTest: 0.12, roughness: 0.55 })
    );
    bodyMesh.rotation.x = -Math.PI / 2;
    b.add(bodyMesh);
    b.add(gL); b.add(gR);
    b.scale.setScalar(scaleF || 1);
    b.userData.wings = [gL, gR];
    gardenRoot.add(b);
    return b;
  }

  /* ---- ong mật: thân lông vàng sọc đen, cánh mỏ trong suốt ---- */
  /* ---- mây trôi trên trời ---- */
  var clouds = [];
  for (var cli = 0; cli < 4; cli++) {
    var cl = new THREE.Group();
    var puffs = 4 + (cli % 2);
    for (var pi2 = 0; pi2 < puffs; pi2++) {
      var puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff6e8, transparent: true, opacity: 0.34, depthWrite: false }));
      var psz = rand(1.8, 3.4);
      puff.scale.set(psz * 1.5, psz * 0.75, 1);
      puff.position.set(rand(-1.6, 1.6), rand(-0.25, 0.3), 0);
      cl.add(puff);
    }
    cl.position.set(rand(-9, 9), rand(4.3, 5.6), rand(-14, -9));
    cl.userData.vx = rand(0.05, 0.13);
    clouds.push(cl);
  }

  /* ---- nhụy lấm tấm hạt phấn ---- */
  function makeDotsTex() {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 128, 128);
    for (var i = 0; i < 72; i++) {
      g.fillStyle = 'rgba(150,90,60,' + (0.12 + Math.random() * 0.2) + ')';
      g.beginPath();
      g.arc(10 + Math.random() * 108, 10 + Math.random() * 108, 1.5 + Math.random() * 3.5, 0, 6.283);
      g.fill();
    }
    return new THREE.CanvasTexture(c);
  }
  var dotsTex = makeDotsTex();

  /* ---- nhiễu mặt đất ---- */
  function makeGroundNoise() {
    var c = document.createElement('canvas');
    c.width = c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = '#eef0e2';
    g.fillRect(0, 0, 256, 256);
    for (var b = 0; b < 26; b++) {
      g.fillStyle = 'rgba(' + (120 + Math.random() * 60 | 0) + ',' + (140 + Math.random() * 50 | 0) + ',80,' + (0.05 + Math.random() * 0.08) + ')';
      var bx = Math.random() * 256, by = Math.random() * 256, br = 14 + Math.random() * 30;
      g.beginPath(); g.arc(bx, by, br, 0, 7); g.fill();
    }
    for (var i = 0; i < 9000; i++) {
      var dark = Math.random() < 0.55;
      g.fillStyle = dark ? 'rgba(70,105,48,' + (0.10 + Math.random() * 0.22) + ')' : 'rgba(214,232,170,' + (0.08 + Math.random() * 0.18) + ')';
      var px = Math.random() * 256, py = Math.random() * 256;
      g.fillRect(px, py, 1, 2 + Math.random() * 5);
    }
    for (var s = 0; s < 260; s++) {
      g.fillStyle = 'rgba(110,90,60,' + (0.05 + Math.random() * 0.1) + ')';
      g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2.2, 0, 7); g.fill();
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(34, 34); tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 4;
    return tex;
  }
  var groundNoise = makeGroundNoise();

  /* ---- ghép nhiều geometry nhỏ thành 1 (hoa dại) ---- */
  function mergeGeos(parts) {
    var vCount = 0, iCount = 0;
    parts.forEach(function (pt) {
      vCount += pt.geo.attributes.position.count;
      iCount += pt.geo.index ? pt.geo.index.count : pt.geo.attributes.position.count;
    });
    var pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3);
    var uv = new Float32Array(vCount * 2), col = new Float32Array(vCount * 3);
    var idx = new Uint16Array(iCount);
    var vo = 0, io = 0;
    var nm = new THREE.Matrix3(), v3 = new THREE.Vector3(), n3 = new THREE.Vector3();
    parts.forEach(function (pt) {
      var g = pt.geo;
      var pA = g.attributes.position, nA = g.attributes.normal, uA = g.attributes.uv, cA = g.attributes.color;
      nm.getNormalMatrix(pt.matrix);
      for (var i = 0; i < pA.count; i++) {
        v3.fromBufferAttribute(pA, i).applyMatrix4(pt.matrix);
        pos[(vo + i) * 3] = v3.x; pos[(vo + i) * 3 + 1] = v3.y; pos[(vo + i) * 3 + 2] = v3.z;
        if (nA) n3.fromBufferAttribute(nA, i).applyMatrix3(nm).normalize(); else n3.set(0, 1, 0);
        nor[(vo + i) * 3] = n3.x; nor[(vo + i) * 3 + 1] = n3.y; nor[(vo + i) * 3 + 2] = n3.z;
        uv[(vo + i) * 2] = uA ? uA.getX(i) : 0;
        uv[(vo + i) * 2 + 1] = uA ? uA.getY(i) : 0;
        col[(vo + i) * 3] = cA ? cA.getX(i) : 1;
        col[(vo + i) * 3 + 1] = cA ? cA.getY(i) : 1;
        col[(vo + i) * 3 + 2] = cA ? cA.getZ(i) : 1;
      }
      if (g.index) {
        for (var j = 0; j < g.index.count; j++) idx[io + j] = vo + g.index.getX(j);
        io += g.index.count;
      } else {
        for (var j2 = 0; j2 < pA.count; j2++) idx[io + j2] = vo + j2;
        io += pA.count;
      }
      vo += pA.count;
    });
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    return out;
  }

  /* ---- cánh hoa: mặt cong + viền nhấp nhô + gradient màu ---- */
  function petalGeo(len, wid, curl, cup, ruffle, colDeep, colLight, segA, segB) {
    var geo = new THREE.PlaneGeometry(2, len, segA || 14, segB || 26);
    geo.translate(0, len / 2, 0);
    var pos = geo.attributes.position;
    var colors = new Float32Array(pos.count * 3);
    var cd = new THREE.Color(colDeep), cl = new THREE.Color(colLight), tmp = new THREE.Color();
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i);
      var y = pos.getY(i);
      var v = Math.min(1, Math.max(0, y / len));
      var prof = Math.min(1, v * 5) * (1 - 0.42 * smooth(v, 0.42, 1)) * (1 - 0.92 * smooth(v, 0.86, 1));
      var nx = x * wid * prof;
      var z = -curl * len * Math.pow(v, 1.9)
            + cup * Math.abs(nx) * v * 0.55
            + ruffle * (Math.sin(nx * 22 + v * 5) * 0.6 + Math.sin(nx * 35 - v * 3) * 0.4) * smooth(v, 0.3, 1)
            + 0.045 * len * Math.exp(-Math.pow(nx / (wid * 0.16), 2)) * v;
      pos.setX(i, nx);
      pos.setZ(i, z);
      var t = smooth(v, 0.08, 0.92);
      tmp.copy(cd).lerp(cl, t);
      tmp.lerp(cl, Math.max(0, Math.abs(x) - 0.7) * 0.45);
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }


  var petalMat = new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, roughness: 0.4, map: petalTex || petalSkinTex, bumpMap: petalSkinTex, bumpScale: 0.07, sheen: 0.6, sheenRoughness: 0.45, sheenColor: new THREE.Color(0xffe4cf), color: new THREE.Color('#fbdcc6') });
  petalMat.shadowSide = THREE.DoubleSide;
    var stemTex = (function () {
    var c = document.createElement('canvas'); c.width = 64; c.height = 256;
    var x = c.getContext('2d');
    var grd = x.createLinearGradient(0, 0, 64, 0);
    grd.addColorStop(0, '#5a6a3a'); grd.addColorStop(0.4, '#7f8c4e'); grd.addColorStop(0.62, '#9ba65f'); grd.addColorStop(1, '#5f6d3e');
    x.fillStyle = grd; x.fillRect(0, 0, 64, 256);
    for (var li2 = 0; li2 < 7; li2++) {
      x.fillStyle = 'rgba(220,235,190,' + (0.1 + Math.random() * 0.14).toFixed(2) + ')';
      var lx = 4 + Math.random() * 56;
      x.fillRect(lx, 0, 0.8 + Math.random() * 1.2, 256);
      x.fillStyle = 'rgba(30,48,28,' + (0.08 + Math.random() * 0.1).toFixed(2) + ')';
      x.fillRect(4 + Math.random() * 56, 0, 0.8, 256);
    }
    var tt2 = new THREE.CanvasTexture(c);
    tt2.wrapS = tt2.wrapT = THREE.RepeatWrapping;
    return tt2;
  })();
  var stemMat = new THREE.MeshStandardMaterial({ map: stemTex, roughness: 0.68, bumpMap: stemTex, bumpScale: 0.1 });
  /* cỏ: từng ngọn cong dần lên, rộng gốc nhọn ngọn */
  var bladeGeo = new THREE.PlaneGeometry(0.05, 0.74, 2, 7);
  bladeGeo.translate(0, 0.3, 0);
  (function () {
    var pos = bladeGeo.attributes.position;
    var cols = new Float32Array(pos.count * 3);
    var c0 = new THREE.Color('#46622f'), c1 = new THREE.Color('#a3c465'), tc = new THREE.Color();
    for (var i = 0; i < pos.count; i++) {
      var t = Math.min(1, Math.max(0, pos.getY(i) / 0.74));
      pos.setX(i, pos.getX(i) * (1 - t * 0.9) + Math.sin(t * 2.4) * 0.035);
      /* sống lưng cỏ gập giữa bắt sáng */
      pos.setZ(i, 0.09 * t * t + (Math.abs(pos.getX(i)) < 0.004 ? 0.028 * t : 0));
      tc.copy(c0).lerp(c1, t);
      cols[i * 3] = tc.r; cols[i * 3 + 1] = tc.g; cols[i * 3 + 2] = tc.b;
    }
    bladeGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    bladeGeo.computeVertexNormals();
  })();
  var bladeMat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.55, transparent: true, alphaTest: 0.4 });

  /* 3 tông hoa: blush đất nung / đào / ngà vàng */
  var FAMILIES = [
    { core: 0xa8492c, rings: [['#cf6a45', '#f8dcc4'], ['#c25a38', '#f4cfb2'], ['#a8442a', '#f2cfae']] },
    { core: 0xbf6a33, rings: [['#da8a50', '#f9ddc0'], ['#cc7442', '#f6d3ae'], ['#bc6436', '#f4d3ab']] },
    { core: 0xc08a3e, rings: [['#dcab66', '#fbeecd'], ['#d19e56', '#f8e5c2'], ['#c48c44', '#f6dfb6']] }
  ];

  /* vật liệu xen kẽ nhẹ để từng cánh tách bạch mà vẫn mềm */
  var familyMats = FAMILIES.map(function (F) {
    function mk(ringIdx) {
      var m = new THREE.MeshPhysicalMaterial({
        side: THREE.DoubleSide, roughness: 0.46,
        map: petalTex || petalSkinTex, bumpMap: petalSkinTex, bumpScale: 0.17,
        sheen: 0.6, sheenRoughness: 0.45, sheenColor: new THREE.Color(0xffe4cf),
        color: new THREE.Color(F.rings[ringIdx][1])
      });
      m.shadowSide = THREE.DoubleSide;
      return m;
    }
    return [mk(0), mk(1), mk(2)];
  });

  var RINGS = [
    { n: 9, tilt: 1.5, len: 1.15, wid: 0.35, curl: 0.3, cup: 0.55, ruffle: 0.045 },
    { n: 7, tilt: 1.1, len: 0.9, wid: 0.31, curl: 0.26, cup: 0.6, ruffle: 0.035 },
    { n: 5, tilt: 0.7, len: 0.66, wid: 0.27, curl: 0.2, cup: 0.75, ruffle: 0.025 }
  ];

  var leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.55, map: petalSkinTex, bumpMap: petalSkinTex, bumpScale: 0.12 });
  leafMat.shadowSide = THREE.DoubleSide;
  var leafGeo = petalGeo(0.95, 0.26, 0.3, 0.25, 0.02, '#48613a', '#a9b46e');
  /* râu hoa: chỉ ny cong + đầu nhụy vàng */
  var filamentGeo = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.045, 0.1, 0), new THREE.Vector3(0.1, 0.17, 0)
  ), 8, 0.0058, 6);
  var filamentMat = new THREE.MeshStandardMaterial({ color: 0xf3e4c8, roughness: 0.6 });
  var antherGeo = new THREE.SphereGeometry(0.02, 8, 6);
  var antherMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.45, emissive: 0x6a4a12, emissiveIntensity: 0.35 });
  var sepalGeo = petalGeo(0.42, 0.15, 0.18, 0.2, 0.01, '#617040', '#9ea963');
  var sepalMat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.55 });
  /* hạt trên đĩa nhuỵ (2 màu xen kẽ) */
  var floretGeo = new THREE.SphereGeometry(0.017, 8, 6);
  var floretMatA = new THREE.MeshStandardMaterial({ color: 0xe9b65a, roughness: 0.55, emissive: 0x5a3a10, emissiveIntensity: 0.25 });
  var floretMatB = new THREE.MeshStandardMaterial({ color: 0xa8492c, roughness: 0.7 });

  /* ---- vườn ---- */
  var gardenRoot = new THREE.Group();
  /* Shared garden-local lake layout, available to the base terrain mesh too. */
  var LAKE = { x: 4.5, z: 17, rx: 8.2, rz: 6.8 };
  var LAKE_DEPTH = 3.4;
  window.__lakeInfo = LAKE;
  scene.add(gardenRoot);
  for (var clix = 0; clix < clouds.length; clix++) gardenRoot.add(clouds[clix]);

  var terrain = window.__createTerrain({ gardenRoot: gardenRoot, LAKE: LAKE, LAKE_DEPTH: LAKE_DEPTH, smooth: smooth, lakeDepth: lakeDepth });
  var hillY = terrain.hillY, hillYWorld = terrain.hillYWorld, terrainColor = terrain.terrainColor, groundGeo = terrain.groundGeo;
  /* pPos là WORLD-space; decor sinh vật sống trong garden-local (gardenRoot xoay) — convert chuẩn */
  var ppLv = new THREE.Vector3();
  function ppL() {
    if (!window.__playerPos) return null;
    ppLv.set(window.__playerPos.x, 0, window.__playerPos.z);
    gardenRoot.worldToLocal(ppLv);
    return ppLv;
  }
  var groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, color: 0xffffff, map: groundNoise });
  var ground = new THREE.Mesh(groundGeo, groundMat);
  window.__baseGround = ground; /* probe: verify the base lawn really leaves the pond opening */
  ground.receiveShadow = true;
  gardenRoot.add(ground);
  bootStage('Đang gieo hoa và dựng các khu vực', 'Đồng Bình Minh, Rừng Thì Thầm, Hẻm Đá và Hồ Gương', 56);

  /* đồi xa 2 lớp mờ dần theo khói + nhấp nhô tự nhiên */
  function makeHills(w, h, d, x, z, color, jitter) {
    var geo = new THREE.SphereGeometry(1, 40, 22);
    var hpos = geo.attributes.position;
    for (var hi = 0; hi < hpos.count; hi++) {
      var hx = hpos.getX(hi), hy = hpos.getY(hi), hz = hpos.getZ(hi);
      if (hy > 0) {
        var bump = 1 + jitter * (Math.sin(hx * 5.2 + 1.7) * Math.cos(hz * 6.1) * 0.5 + Math.sin(hx * 11.3 + hz * 7.7) * 0.5);
        hpos.setY(hi, hy * bump);
      }
    }
    geo.computeVertexNormals();
    var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: color, roughness: 1 }));
    mesh.scale.set(w, h, d);
    mesh.position.set(x, -0.5, z);
    gardenRoot.add(mesh);
    return mesh;
  }

  /* ---- tạo một cây hoa ---- */
  var plants = [];
  var headsArr = [];
  var petalGeoCache = {};

  function famGeo(fam, ringIdx) {
    var id = fam + '_' + ringIdx;
    if (!petalGeoCache[id]) {
      var r = RINGS[ringIdx];
      var c = FAMILIES[fam].rings[ringIdx];
      petalGeoCache[id] = petalGeo(r.len, r.wid, r.curl, r.cup, r.ruffle, c[0], c[1]);
    }
    return petalGeoCache[id];
  }

  function makePlant(fam) {
    var group = new THREE.Group();
    var petals = [];
    var stamens = [];
    var grass = [];
    var F = FAMILIES[fam];

    var stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.05 + rand(-0.025, 0.025), 0.33, 0.02 + rand(-0.02, 0.02)),
      new THREE.Vector3(-0.05 + rand(-0.025, 0.025), 0.66, -0.02 + rand(-0.02, 0.02)),
      new THREE.Vector3(0.012 + rand(-0.015, 0.015), 1, rand(-0.02, 0.02))
    ]);
    var stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 20, 0.013, 8), stemMat);
    (function () {
      var sp2 = stem.geometry.attributes.position;
      for (var ti2 = 0; ti2 < sp2.count; ti2++) {
        var tk = 1 - 0.5 * THREE.MathUtils.clamp(sp2.getY(ti2), 0, 1);
        sp2.setX(ti2, sp2.getX(ti2) * tk);
        sp2.setZ(ti2, sp2.getZ(ti2) * tk);
      }
      stem.geometry.computeVertexNormals();
    })();
    stem.castShadow = true;
    group.add(stem);

    for (var li = 0; li < 3; li++) {
      var lh = new THREE.Group();
      var lp = stemCurve.getPoint(0.22 + li * 0.24);
      lh.position.copy(lp);
      lh.rotation.y = li * Math.PI * 1.05 + rand(-0.35, 0.35);
      var leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.rotation.x = rand(0.4, 0.75);
      leaf.scale.setScalar(rand(0.2, 0.3));
      leaf.castShadow = true;
      lh.add(leaf);
      group.add(lh);
    }

    var head = new THREE.Group();
    head.position.copy(stemCurve.getPoint(1));
    head.scale.setScalar(0.72);
    group.add(head);
    group.rotation.z = rand(-0.075, 0.075);
    group.rotation.x = rand(-0.055, 0.055);

    var core = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 14), new THREE.MeshStandardMaterial({ color: F.core, roughness: 0.5, map: dotsTex, bumpMap: dotsTex, bumpScale: 0.15 }));
    core.scale.set(1, 0.62, 1);
    core.castShadow = true;
    head.add(core);

    /* đĩa nhuỵ: hạt xoáy theo tỉ lệ vàng (phyllotaxis thật như cúc/hoa hướng dương) */
    var GOLD = 2.39996323;
    var FLO = isMobile ? 34 : 52;
    for (var flo = 0; flo < FLO; flo++) {
      var fr = 0.146 * Math.sqrt(flo / FLO);
      var fa = flo * GOLD;
      var fx = Math.cos(fa) * fr;
      var fz = Math.sin(fa) * fr;
      var fy = 0.62 * Math.sqrt(Math.max(0, 0.0225 - fr * fr)) + 0.012;
      var fl = new THREE.Mesh(floretGeo, flo % 4 === 0 ? floretMatB : floretMatA);
      fl.position.set(fx, fy, fz);
      fl.scale.setScalar(0.001);
      head.add(fl);
      stamens.push({ mesh: fl, at: 0 });
    }
    /* vòng râu cao quanh rìa đĩa */
    for (var sa = 0; sa < 10; sa++) {
      var ha = new THREE.Group();
      ha.rotation.y = (sa / 10) * Math.PI * 2;
      var lean = new THREE.Group();
      lean.rotation.x = 0.85;
      lean.scale.setScalar(0.9);
      var fil = new THREE.Mesh(filamentGeo, filamentMat);
      var ant = new THREE.Mesh(antherGeo, antherMat);
      ant.position.set(0.1, 0.17, 0);
      ant.scale.set(1.5, 0.85, 1);
      lean.add(fil);
      lean.add(ant);
      ha.add(lean);
      ha.scale.setScalar(0.001);
      head.add(ha);
      stamens.push({ mesh: ha, at: 0 });
    }
    /* đài hoa ôm dưới cánh */
    for (var sp = 0; sp < 5; sp++) {
      var sh = new THREE.Group();
      sh.rotation.y = (sp / 5) * Math.PI * 2 + 0.35;
      var sep = new THREE.Mesh(sepalGeo, sepalMat);
      sep.rotation.x = 2.35;
      sh.add(sep);
      head.add(sh);
    }

    for (var ri = 0; ri < RINGS.length; ri++) {
      var R = RINGS[ri];
      for (var pi = 0; pi < R.n; pi++) {
        var holder = new THREE.Group();
        holder.rotation.y = (pi / R.n) * Math.PI * 2 + rand(-0.14, 0.14) + ri * 0.35;
        var pivot = new THREE.Group();
        var mesh = new THREE.Mesh(famGeo(fam, ri), familyMats[fam][pi % 3]);
        mesh.castShadow = true;
        pivot.add(mesh);
        holder.add(pivot);
        head.add(holder);
        petals.push({
          pivot: pivot, tilt: R.tilt + rand(-0.1, 0.1),
          cur: 0.05, from: 0.05,
          state: 'wait', t0: 0, dur: 1150, reopenAt: 0,
          scale: rand(0.82, 1.05), growT0: 0,
          ring: ri, idx: pi
        });
        mesh.scale.setScalar(0.001);
        petals[petals.length - 1].mesh = mesh;
      }
    }

    var shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 1.25),
      new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    group.add(shadow);

    return { group: group, head: head, petals: petals, stamens: stamens, grass: grass, shadow: shadow };
  }

  /* bố cục vườn: [x, z, chiều cao, tỉ lệ, tông] */
  var LAYOUT_D = [
    [-3.3, 1.3, 2.5, 0], [-1.5, 0.5, 2.1, 1], [-4.5, 0.3, 2.3, 2],
    [-0.5, 1.6, 1.7, 2], [-2.6, -0.9, 1.6, 1], [-4.2, -1.5, 1.4, 0],
    [-5.8, 1.2, 1.2, 0], [-0.9, -1.8, 1.2, 2], [-5.0, -0.4, 1.1, 1],
    [-2.0, 2.05, 1.3, 0], [-3.6, 2.3, 1.05, 2], [-1.05, 1.05, 1.45, 1],
    [-4.0, 1.95, 0.95, 2], [-5.4, 0.15, 0.9, 0], [-2.3, -1.95, 0.85, 1],
    [2.6, 0.9, 1.35, 2], [1.8, 2.3, 1.15, 0], [3.6, -1.3, 1.2, 1],
    [1.2, -2.9, 1.0, 2], [-1.3, 3.2, 1.25, 0], [4.6, 0.3, 0.9, 0],
    [-3.0, 3.5, 1.0, 1], [0.7, 3.9, 0.95, 2], [-5.0, 2.9, 0.9, 0],
    [6.2, -3.2, 1.05, 2], [-6.8, -3.8, 1.0, 0], [5.6, 4.2, 0.95, 1],
    [-6.2, 4.6, 0.9, 2], [7.6, 0.6, 0.9, 0], [-8.2, -0.8, 0.85, 1],
    [2.8, -6.4, 0.95, 2], [-3.4, -6.8, 0.9, 0]
  ];
  var LAYOUT_M = [
    [-1.9, 1.0, 2.4, 0], [-0.2, 0.5, 2.0, 1], [-3.3, 0.3, 1.9, 2],
    [1.1, 1.2, 1.6, 2], [-2.6, -0.7, 1.4, 1], [0.3, -0.9, 1.2, 0],
    [-4.3, 1.15, 1.0, 0], [-3.9, -1.0, 0.9, 1], [1.7, -0.3, 0.85, 2],
    [-1.0, 1.7, 0.95, 0], [-2.8, 1.9, 0.8, 2],
    [3.6, 0.8, 0.8, 1], [-0.9, 2.4, 0.85, 0], [-2.0, 2.9, 0.75, 1],
    [2.6, -4.2, 0.75, 2], [-3.8, -3.6, 0.7, 0]
  ];

  LAYOUT_D.forEach(function (cfg, idx) {
    var p = makePlant(cfg[3]);
    p.idx = idx;
    p.baseScale = cfg[3];
    p.phase = rand(0, Math.PI * 2);
    var pdx = cfg[0], pdz = cfg[1] - 6.5;
    p.growStart = (reduced ? 0 : 140) + Math.sqrt(pdx * pdx + pdz * pdz) * 46 + rand(0, 50);
    if (LOW && Math.sqrt(cfg[0] * cfg[0] + cfg[1] * cfg[1]) > 7.2) return;
    p.growDur = reduced ? 120 : 640;
    p.bloomBase = p.growStart + p.growDur + 120;
    p.leanX = rand(-0.16, 0.16);
    p.leanZ = rand(-0.1, 0.1);
    p.headUpAt = p.bloomBase;
    p.petals.forEach(function (pt) {
      pt.t0 = p.bloomBase + pt.ring * 140 + pt.idx * 24 + rand(0, 60);
      pt.growT0 = pt.t0;
    });
    p.stamens.forEach(function (st, k) { st.at = p.bloomBase + 330 + k * 18; });
    p.group.traverse(function (o) { o.userData.plantRef = p; });
    gardenRoot.add(p.group);
    plants.push(p);
    headsArr.push(p.head);
  });

  /* ---- từng ngọn cỏ lay theo gió ---- */
  var idummy = new THREE.Object3D();
  var liteMeshes = [];
  var waveMeshes = [];
  function registerWave(mesh, n) {
    var pos = new Float32Array(n * 3), rot = new Float32Array(n * 4), scl = new Float32Array(n), del = new Float32Array(n);
    var m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sv = new THREE.Vector3();
    for (var i = 0; i < n; i++) {
      mesh.getMatrixAt(i, m);
      m.decompose(v, q, sv);
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
      rot[i * 4] = q.x; rot[i * 4 + 1] = q.y; rot[i * 4 + 2] = q.z; rot[i * 4 + 3] = q.w;
      scl[i] = sv.x;
      var wdx = v.x, wdz = v.z - 6.5;
      del[i] = Math.sqrt(wdx * wdx + wdz * wdz) * 46 + rand(0, 50);
    }
    waveMeshes.push({ mesh: mesh, n: n, pos: pos, rot: rot, scl: scl, del: del, done: false });
  }
  function updateWave(nowMs) {
    var allDone = true;
    for (var w = 0; w < waveMeshes.length; w++) {
      var W = waveMeshes[w];
      if (W.done) continue;
      var wDone = true;
      var arr = W.mesh.instanceMatrix.array;
      for (var i = 0; i < W.n; i++) {
        var k = (nowMs - 40 - W.del[i]) / 440;
        if (k <= 0) { k = 0.001; wDone = false; }
        else if (k < 1) { k = 1 - Math.pow(1 - k, 3); wDone = false; }
        else k = 1;
        var s = W.scl[i] * k * (k < 1 ? 1 + 0.1 * Math.sin(k * Math.PI) : 1);
        var x = W.rot[i * 4], y = W.rot[i * 4 + 1], z = W.rot[i * 4 + 2], qw = W.rot[i * 4 + 3];
        if (k < 1) {
          var twa = (1 - k) * 0.45, hs2 = Math.sin(twa * 0.5), hc2 = Math.cos(twa * 0.5);
          var nx2 = hc2 * x + hs2 * z, ny2 = hc2 * y + hs2 * qw, nz2 = hc2 * z - hs2 * x, nw2 = hc2 * qw - hs2 * y;
          x = nx2; y = ny2; z = nz2; qw = nw2;
        }
        var x2 = x + x, y2 = y + y, z2 = z + z;
        var xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = qw * x2, wy = qw * y2, wz = qw * z2;
        var o = i * 16;
        arr[o] = (1 - (yy + zz)) * s; arr[o + 1] = (xy - wz) * s; arr[o + 2] = (xz + wy) * s; arr[o + 3] = 0;
        arr[o + 4] = (xy + wz) * s; arr[o + 5] = (1 - (xx + zz)) * s; arr[o + 6] = (yz - wx) * s; arr[o + 7] = 0;
        arr[o + 8] = (xz - wy) * s; arr[o + 9] = (yz + wx) * s; arr[o + 10] = (1 - (xx + yy)) * s; arr[o + 11] = 0;
        arr[o + 12] = W.pos[i * 3]; arr[o + 13] = W.pos[i * 3 + 1]; arr[o + 14] = W.pos[i * 3 + 2]; arr[o + 15] = 1;
      }
      W.mesh.instanceMatrix.needsUpdate = true;
      W.done = wDone;
      if (!wDone) allDone = false;
    }
    if (allDone) waveMeshes = [];
  }
  var GRASS_BASE = isMobile || LOW ? 140 : 320;
  var GRASS_RING = LOW ? 90 : 200;
  var GRASS_N = GRASS_BASE + GRASS_RING;
  var grassMesh = new THREE.InstancedMesh(bladeGeo, bladeMat, GRASS_BASE + GRASS_RING);
  grassMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  grassMesh.frustumCulled = false;
  gardenRoot.add(grassMesh);
  liteMeshes.push([grassMesh, 0.6]);
  var grassData = [], grassMatricesReady = false;
  var grassTints = [new THREE.Color('#ffffff'), new THREE.Color('#cfe0b8'), new THREE.Color('#eef3da'), new THREE.Color('#bdd1a6')];
  var grassAnchor = [];
  LAYOUT_D.forEach(function (c) { grassAnchor.push([c[0], c[1]]); });
  var grassTufts = [];
  for (var gti = 0; gti < 190; gti++) {
    var gta = rand(0, 6.283), gtr = 0.3 + 8.2 * Math.pow(Math.random(), 0.55);
    grassTufts.push([Math.cos(gta) * gtr, Math.sin(gta) * gtr]);
  }
  for (var gtn = 0; gtn < 55; gtn++) {
    var gna = rand(0, 6.283), gnr = 0.22 + 2.0 * Math.sqrt(Math.random());
    grassTufts.push([Math.cos(gna) * gnr, 6.5 + Math.sin(gna) * gnr * 0.8]);
  }
  for (var gwi = 0; gwi < GRASS_BASE; gwi++) {
    var gxx, gzz, gss;
    if (Math.random() < 0.35) {
      /* cụm cỏ quanh gốc hoa */
      var anch = grassAnchor[(Math.random() * grassAnchor.length) | 0];
      var ga2 = rand(0, 6.283), gr2 = rand(0.14, 0.6);
      gxx = anch[0] + Math.cos(ga2) * gr2;
      gzz = anch[1] + Math.sin(ga2) * gr2 * 0.75;
      gss = rand(0.62, 1.12);
    } else {
      /* cỏ mọc thành bụi 3-5 ngọn — hết ngọn lẻ loi như chồi đất */
      var gt2 = grassTufts[(Math.random() * grassTufts.length) | 0];
      gxx = gt2[0] + rand(-0.15, 0.15);
      gzz = gt2[1] + rand(-0.12, 0.12);
      gss = rand(0.48, 0.88);
    }
    grassData.push({ x: gxx, y: hillY(gxx, gzz) - 0.01, z: gzz, yaw: rand(0, 6.283), s: gss, sx: rand(0.75, 1.3), sy: rand(0.62, 1.05), phase: rand(0, 6.283), amp: rand(0.1, 0.2) });
    grassMesh.setColorAt(gwi, grassTints[gwi % grassTints.length]);
  }
  if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;

  /* vành cỏ dày quanh chân camera + rìa đĩa xa — không để đất trơn */
  /* One irregular outer ring, not two parallel rows of overlapping grass. */
  for (var rgi = 0; rgi < (LOW ? 120 : 340); rgi++) {
    var rga=rand(0,6.283), rgr=6.2+Math.sqrt(Math.random())*8.0;
    var rgx=Math.cos(rga)*rgr, rgzz=6.8+Math.sin(rga)*rgr*.82;
    if(lakeDepth(rgx,rgzz)>.08)continue;
    grassData.push({x:rgx,y:hillY(rgx,rgzz)-.01,z:rgzz,yaw:rand(0,6.283),s:rand(.45,.82),sx:rand(.8,1.2),sy:rand(.65,.95),phase:rand(0,6.283),amp:rand(.07,.14)});
    grassMesh.setColorAt(grassData.length-1,grassTints[(grassData.length-1)%grassTints.length]);
  }
  grassMesh.count = grassData.length;
  if (window.__REAL_ASSETS) window.__REAL_ASSETS.replaceInstanced('grass', grassMesh, grassData.length);
  if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;

  /* cỏ tầm xa: nhỏ + nhạt dần vào khói, phủ cả sườn đồi gần */
  var FAR_N = isMobile || LOW ? 160 : 320;
  var farGrassMesh = new THREE.InstancedMesh(bladeGeo, bladeMat, FAR_N);
  farGrassMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  farGrassMesh.frustumCulled = false;
  if (window.__REAL_ASSETS) window.__REAL_ASSETS.replaceInstanced('grass', farGrassMesh, FAR_N);
  gardenRoot.add(farGrassMesh);
  liteMeshes.push([farGrassMesh, 0.55]);
  var farGrassData = [];
  var farTints = [new THREE.Color('#ffffff'), new THREE.Color('#cfe0b8'), new THREE.Color('#eef3da'), new THREE.Color('#bdd1a6')];
  for (var fgi = 0; fgi < FAR_N; fgi++) {
    var fga = rand(0, 6.283);
    var fgr = 10.0 + 16.0 * Math.pow(Math.random(), 0.8);
    var fgx = Math.cos(fga) * fgr;
    var fgz = Math.sin(fga) * fgr;
    var fgs = rand(0.5, 0.95) * Math.max(0.55, 1 - fgr * 0.045);
    farGrassData.push({ x: fgx, y: hillY(fgx, fgz) - 0.01, z: fgz, yaw: rand(0, 6.283), s: Math.max(0.14, fgs), sx: rand(0.8, 1.2), sy: rand(0.8, 1.35), phase: rand(0, 6.283), amp: rand(0.06, 0.12) });
    farGrassMesh.setColorAt(fgi, farTints[fgi % farTints.length]);
  }
  if (farGrassMesh.instanceColor) farGrassMesh.instanceColor.needsUpdate = true;

  /* cỏ có bông: ngọn cao mảnh + 1 bông lúa mì nhỏ trên đỉnh */
  var seedGeo = (function () {
    var stemCopy = bladeGeo.clone();
    var parts = [{ geo: stemCopy, matrix: new THREE.Matrix4().makeScale(0.55, 1.15, 1) }];
    var spike = new THREE.ConeGeometry(0.016, 0.085, 6);
    spike.translate(0, -0.02, 0);
    var spc = new Float32Array(spike.attributes.position.count * 3);
    for (var spj = 0; spj < spike.attributes.position.count; spj++) { spc[spj * 3] = 0.82; spc[spj * 3 + 1] = 0.6; spc[spj * 3 + 2] = 0.28; }
    spike.setAttribute('color', new THREE.BufferAttribute(spc, 3));
    parts.push({ geo: spike, matrix: new THREE.Matrix4().makeTranslation(0.01, 0.42, 0.01) });
    return mergeGeos(parts);
  })();
  var SEED_N = isMobile || LOW ? 24 : 44;
  var seedMesh = new THREE.InstancedMesh(seedGeo, bladeMat, SEED_N);
  seedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  seedMesh.frustumCulled = false;
  gardenRoot.add(seedMesh);
  liteMeshes.push([seedMesh, 0.55]);
  var seedData = [];
  var seedTints = [new THREE.Color('#f2e3b8'), new THREE.Color('#e4d2a0'), new THREE.Color('#d9cba6'), new THREE.Color('#efe6c8')];
  for (var sdi = 0; sdi < SEED_N; sdi++) {
    var anch2 = grassAnchor[(Math.random() * grassAnchor.length) | 0];
    var sa2 = rand(0, 6.283), sr2 = rand(0.1, 0.75);
    var sdx = anch2[0] + Math.cos(sa2) * sr2;
    var sdz = anch2[1] + Math.sin(sa2) * sr2 * 0.75;
    seedData.push({ x: sdx, y: hillY(sdx, sdz) - 0.01, z: sdz, yaw: rand(0, 6.283), s: rand(0.4, 0.72), sx: rand(0.8, 1.2), sy: rand(0.7, 1.05), phase: rand(0, 6.283), amp: rand(0.08, 0.15) });
    seedMesh.setColorAt(sdi, seedTints[sdi % seedTints.length]);
  }
  if (seedMesh.instanceColor) seedMesh.instanceColor.needsUpdate = true;

  /* nhánh cỏ viền khung: ghi thẳng vào grassData để sống qua tick */
  for (var fbi = 0; fbi < 12; fbi++) {
    var fbx = fbi < 7 ? rand(-6.4, -4.6) : rand(-0.6, 2.2);
    var fbz = rand(1.5, 2.6);
    grassData[GRASS_BASE + fbi * 3] = { x: fbx, y: hillY(fbx, fbz) - 0.01, z: fbz, yaw: rand(0, 6.283), s: rand(0.95, 1.3), sx: rand(0.85, 1.2), sy: rand(1.0, 1.3), phase: rand(0, 6.283), amp: rand(0.09, 0.16) };
    grassMesh.setColorAt(GRASS_N - 1 - fbi, grassTints[(fbi + 1) % grassTints.length]);
  }
  grassMesh.instanceMatrix.needsUpdate = true;
  if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;

  /* ---- hoa dại nhỏ rải khắp bãi ---- */
  function miniFlowerGeo() {
    var parts = [];
    var pg = petalGeo(0.17, 0.075, 0.03, 0.5, 0.008, '#ffffff', '#ffffff', 7, 8);
    for (var i = 0; i < 5; i++) {
      var m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.72, (i / 5) * Math.PI * 2, 0, 'YXZ'));
      parts.push({ geo: pg, matrix: m });
    }
    var cg = new THREE.SphereGeometry(0.042, 8, 6);
    var cc = new Float32Array(cg.attributes.position.count * 3);
    for (var ci = 0; ci < cg.attributes.position.count; ci++) { cc[ci * 3] = 1; cc[ci * 3 + 1] = 0.82; cc[ci * 3 + 2] = 0.35; }
    cg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    parts.push({ geo: cg, matrix: new THREE.Matrix4().makeTranslation(0, 0.024, 0) });
    /* cuống dài cong dưới hoa + 2 lá nhỏ: hoa không lơ lửng */
    var sg = new THREE.PlaneGeometry(0.016, 0.34, 1, 4);
    sg.translate(0, -0.17, 0);
    var sp = sg.attributes.position;
    var sc = new Float32Array(sp.count * 3);
    var sc0 = new THREE.Color('#7c8a49'), sc1 = new THREE.Color('#b2bd72'), stc = new THREE.Color();
    for (var sj = 0; sj < sp.count; sj++) {
      var sy2 = sp.getY(sj);
      sp.setX(sj, sp.getX(sj) * (1 + sy2 * 0.9) + sy2 * sy2 * 0.12);
      var st2 = Math.min(1, Math.max(0, (sy2 + 0.34) / 0.34));
      stc.copy(sc0).lerp(sc1, st2);
      sc[sj * 3] = stc.r; sc[sj * 3 + 1] = stc.g; sc[sj * 3 + 2] = stc.b;
    }
    sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    sg.computeVertexNormals();
    parts.push({ geo: sg, matrix: new THREE.Matrix4() });
    var lgA = petalGeo(0.13, 0.05, 0.05, 0.3, 0.006, '#5d7a3f', '#9dbd82', 6, 6);
    parts.push({ geo: lgA, matrix: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(1.15, 0.5, 0.35)).setPosition(0.02, -0.16, 0) });
    var lgB = petalGeo(0.11, 0.045, 0.05, 0.3, 0.006, '#54703c', '#8fae6e', 6, 6);
    parts.push({ geo: lgB, matrix: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(1.2, -0.6, -0.3)).setPosition(-0.02, -0.24, 0) });
    return mergeGeos(parts);
  }
  var wfGeo = miniFlowerGeo();
  var wfMat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.55, map: petalTex || petalSkinTex });
  function scatterWildflowers(n, tint, zMin, zMax, sMin, sMax, xMax, clusters) {
    var mesh = new THREE.InstancedMesh(wfGeo, wfMat, n);
    mesh.frustumCulled = false;
    for (var i = 0; i < n; i++) {
      var wx, wz;
      if (clusters && clusters.length && Math.random() < 0.85) {
        var ct = clusters[(Math.random() * clusters.length) | 0];
        var ca = rand(0, 6.283), cr = 1.5 * Math.sqrt(Math.random());
        wx = ct[0] + Math.cos(ca) * cr;
        wz = ct[1] + Math.sin(ca) * cr * 0.7;
      } else {
        wx = Math.random() < 0.72 ? rand(-7.5, 0.2) : rand(0.2, xMax);
        wz = rand(zMin, zMax);
      }
      idummy.position.set(wx, hillY(wx, wz) + 0.008, wz);
      idummy.rotation.set(rand(-0.1, 0.1), rand(0, 6.283), rand(-0.12, 0.12));
      idummy.scale.setScalar(rand(sMin, sMax) * 0.42);
      idummy.updateMatrix();
      mesh.setMatrixAt(i, idummy.matrix);
      mesh.setColorAt(i, tint);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    gardenRoot.add(mesh);
    liteMeshes.push([mesh, 0.6]);
    registerWave(mesh, mesh.count);
  }
  function scatterWildflowersR(n, tint, sMin, sMax, rMin, rMax) {
    var mesh = new THREE.InstancedMesh(wfGeo, wfMat, n);
    mesh.frustumCulled = false;
    for (var i = 0; i < n; i++) {
      var wa = rand(0, 6.283);
      var wr = Math.sqrt(rand(rMin * rMin, rMax * rMax));
      var wx = Math.cos(wa) * wr, wz = Math.sin(wa) * wr;
      for(var clearTry=0;clearTry<8 && Math.hypot(wx-0.4,wz-6.8)<3.0;clearTry++){wa=rand(0,6.283);wr=Math.sqrt(rand(rMin*rMin,rMax*rMax));wx=Math.cos(wa)*wr;wz=Math.sin(wa)*wr;}
      idummy.position.set(wx, hillY(wx, wz) + 0.008, wz);
      idummy.rotation.set(rand(-0.1, 0.1), rand(0, 6.283), rand(-0.12, 0.12));
      idummy.scale.setScalar(rand(sMin, sMax) * 0.42);
      idummy.updateMatrix();
      mesh.setMatrixAt(i, idummy.matrix);
      mesh.setColorAt(i, tint);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    gardenRoot.add(mesh);
    liteMeshes.push([mesh, 0.6]);
    registerWave(mesh, mesh.count);
  }
  var rwf = isMobile ? 0.07 : LOW ? 0.09 : 0.14;
  scatterWildflowersR(Math.round(385 * rwf), new THREE.Color('#f5c698'), 0.5, 0.95, 0.4, 4.6);
  scatterWildflowersR(Math.round(240 * rwf), new THREE.Color('#f3cdb0'), 0.6, 1.15, 3.6, 7.0);
  scatterWildflowersR(Math.round(235 * rwf), new THREE.Color('#f4d9b8'), 0.75, 1.35, 6.2, 12.6);
  scatterWildflowersR(Math.round(190 * rwf), new THREE.Color('#f2bd93'), 0.55, 1.1, 1.5, 3.4);
  scatterWildflowersR(Math.round(240 * rwf), new THREE.Color('#f6cfab'), 0.6, 1.2, 3.4, 7.6);
  scatterWildflowersR(Math.round(230 * rwf), new THREE.Color('#f2bd93'), 0.7, 1.3, 4.0, 10.0);
  scatterWildflowersR(Math.round(190 * rwf), new THREE.Color('#f4d9b8'), 0.8, 1.5, 9.0, 14.5);

  scatterWildflowers(14, new THREE.Color('#fdf3ee'), -1.9, 1.5, 0.35, 0.58, 2.2);
  scatterWildflowers(10, new THREE.Color('#f2dfc0'), -1.9, 1.5, 0.35, 0.58, 2.2);
  scatterWildflowers(20, new THREE.Color('#f3cdb0'), -6.5, -2.6, 0.55, 1.05, 3.6, [[-5.4, -3.6], [-3.2, -4.4], [-1.6, -3.4], [-4.4, -2.9], [0.8, -3.8], [-2.5, -3.1], [1.4, -3.2]]);
  scatterWildflowers(16, new THREE.Color('#efb896'), -9.5, -5.2, 0.55, 1.0, 4.2, [[-6.6, -6.2], [-3.8, -6.6], [-1.2, -5.6], [-8, -4.6], [-5, -5.4], [0.5, -6]]);
  scatterWildflowers(13, new THREE.Color('#f5d8ba'), -4.6, -2.2, 0.5, 0.9, 3.8, [[-2.4, -2.4], [-4.9, -2.3], [-0.8, -2.6], [1.2, -2.2]]);
  scatterWildflowers(10, new THREE.Color('#f7e6d0'), -9.5, -6.0, 0.45, 0.82, 4.2, [[-7.5, -7.4], [-4.5, -8], [-2, -7]]);

  /* RỪNG HOA GIỮA: hoa trung bình instanced phủ kín dải giữa — 1 draw call */
  var midFlowerGeo = (function () {
    var parts = [];
    var pg1 = petalGeo(0.5, 0.2, 0.12, 0.45, 0.02, '#ffffff', '#ffffff', 10, 14);
    for (var i1 = 0; i1 < 6; i1++) {
      parts.push({ geo: pg1, matrix: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.95, (i1 / 6) * Math.PI * 2 + i1 * 0.23, 0, 'YXZ')) });
    }
    var pg2 = petalGeo(0.36, 0.15, 0.16, 0.5, 0.015, '#ffffff', '#ffffff', 9, 12);
    for (var i2 = 0; i2 < 5; i2++) {
      parts.push({ geo: pg2, matrix: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.5, (i2 / 5) * Math.PI * 2 + 0.31, 0, 'YXZ')) });
    }
    var cg = new THREE.SphereGeometry(0.075, 10, 8);
    var ccg = new Float32Array(cg.attributes.position.count * 3);
    for (var cj = 0; cj < cg.attributes.position.count; cj++) { ccg[cj * 3] = 1; ccg[cj * 3 + 1] = 0.95; ccg[cj * 3 + 2] = 0.82; }
    cg.setAttribute('color', new THREE.BufferAttribute(ccg, 3));
    parts.push({ geo: cg, matrix: new THREE.Matrix4().makeTranslation(0, 0.03, 0) });
    var sg2 = new THREE.CylinderGeometry(0.012, 0.016, 0.42, 6);
    sg2.translate(0, -0.42, 0);
    var scg = new Float32Array(sg2.attributes.position.count * 3);
    var sgcol = new THREE.Color('#6e8f57');
    for (var sj = 0; sj < sg2.attributes.position.count; sj++) { scg[sj * 3] = sgcol.r; scg[sj * 3 + 1] = sgcol.g; scg[sj * 3 + 2] = sgcol.b; }
    sg2.setAttribute('color', new THREE.BufferAttribute(scg, 3));
    parts.push({ geo: sg2, matrix: new THREE.Matrix4() });
    /* 2 lá trên thân */
    var lg1 = petalGeo(0.3, 0.12, 0.16, 0.5, 0.008, '#4f7040', '#8fae6e', 7, 8);
    parts.push({ geo: lg1, matrix: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(1.05, 0.55, 0.3)).setPosition(0.03, -0.26, 0) });
    var lg2 = petalGeo(0.26, 0.1, 0.14, 0.5, 0.008, '#557846', '#9dbd82', 7, 8);
    parts.push({ geo: lg2, matrix: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(1.1, -0.6, -0.3)).setPosition(-0.03, -0.15, 0) });
    return mergeGeos(parts);
  })();
  var MID_N = isMobile || LOW ? 42 : 96;
  var midFlowerMesh = new THREE.InstancedMesh(
    midFlowerGeo,
    new THREE.MeshStandardMaterial({ map: petalTex || petalSkinTex, side: THREE.DoubleSide, roughness: 0.55, vertexColors: true }),
    MID_N
  );
  midFlowerMesh.frustumCulled = false;
  gardenRoot.add(midFlowerMesh);
  liteMeshes.push([midFlowerMesh, 0.55]);
  var midTints = [new THREE.Color('#ffffff'), new THREE.Color('#f6d7bd'), new THREE.Color('#f7c4a0'), new THREE.Color('#f3c9ac'), new THREE.Color('#fbe4cf')];
  var midClusters = [];
  for (var mcg = 0; mcg < 48; mcg++) {
    var mga = (mcg / 48) * 6.283 + rand(-0.06, 0.06);
    var mgr = 1.1 + 7.6 * Math.pow(Math.random(), 0.92);
    midClusters.push([Math.cos(mga) * mgr, Math.sin(mga) * mgr]);
  }
  for (var mi = 0; mi < MID_N; mi++) {
    var mct = midClusters[mi % midClusters.length];
    var mca = rand(0, 6.283), mcr = 1.35 * Math.sqrt(Math.random());
    var mx2 = mct[0] + Math.cos(mca) * mcr;
    var mz2 = mct[1] + Math.sin(mca) * mcr * 0.8;
    for (var mtry = 0; mtry < 5 && Math.sqrt((mx2 - 0.3) * (mx2 - 0.3) + (mz2 - 6.8) * (mz2 - 6.8)) < 2.4; mtry++) {
      mca = rand(0, 6.283); mcr = 1.35 * Math.sqrt(Math.random());
      mx2 = mct[0] + Math.cos(mca) * mcr;
      mz2 = mct[1] + Math.sin(mca) * mcr * 0.8;
    }
    idummy.position.set(mx2, hillY(mx2, mz2) + 0.01, mz2);
    idummy.rotation.set(rand(-0.08, 0.08), rand(0, 6.283), rand(-0.1, 0.1));
    var mdist = Math.sqrt(mx2 * mx2 + mz2 * mz2);
    idummy.scale.setScalar(mdist < 2.4 ? rand(0.30, 0.48) : mdist < 5 ? rand(0.36, 0.58) : rand(0.45, 0.74));
    idummy.updateMatrix();
    midFlowerMesh.setMatrixAt(mi, idummy.matrix);
    midFlowerMesh.setColorAt(mi, midTints[mi % midTints.length]);
  }
  midFlowerMesh.instanceMatrix.needsUpdate = true;
  if (midFlowerMesh.instanceColor) midFlowerMesh.instanceColor.needsUpdate = true;
  registerWave(midFlowerMesh, MID_N);
  midFlowerMesh.castShadow = true;

  /* ---- sỏi nhỏ ---- */
  var pebbleMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.95 }), 24);
  pebbleMesh.frustumCulled = false;
  var pebbleTints = [new THREE.Color('#cbb9a4'), new THREE.Color('#b3a28c'), new THREE.Color('#dbcbb6'), new THREE.Color('#a5988a')];
  for (var ppi = 0; ppi < 24; ppi++) {
    var ppx = Math.random() < 0.8 ? rand(-6, 0.2) : rand(0.2, 1.8);
    var ppz = rand(-1.8, 1.6);
    idummy.position.set(ppx, hillY(ppx, ppz) + 0.01, ppz);
    idummy.rotation.set(0, rand(0, 6.283), 0);
    idummy.scale.set(rand(0.4, 1.5), rand(0.3, 0.55), rand(0.4, 1.3));
    idummy.updateMatrix();
    pebbleMesh.setMatrixAt(ppi, idummy.matrix);
    pebbleMesh.setColorAt(ppi, pebbleTints[ppi % pebbleTints.length]);
  }
  pebbleMesh.instanceMatrix.needsUpdate = true;
  if (pebbleMesh.instanceColor) pebbleMesh.instanceColor.needsUpdate = true;
  gardenRoot.add(pebbleMesh);

  /* bóng loang trên cỏ khắp đồng (thấy được kể cả khi tắt shadow map) */
  var blobFieldGeo = new THREE.CircleGeometry(1, 16);
  blobFieldGeo.rotateX(-Math.PI / 2);
  var blobField = new THREE.InstancedMesh(blobFieldGeo, new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.4 }), 90);
  blobField.frustumCulled = false;
  for (var bfb = 0; bfb < 90; bfb++) {
    var bfa = rand(0, 6.283), bfr = rand(0.7, 8.8);
    var bfx = Math.cos(bfa) * bfr, bfz = Math.sin(bfa) * bfr;
    idummy.position.set(bfx, hillY(bfx, bfz) + 0.02, bfz);
    idummy.rotation.set(0, 0, 0);
    idummy.scale.set(rand(0.5, 1.1), 1, rand(0.5, 1.1));
    idummy.updateMatrix();
    blobField.setMatrixAt(bfb, idummy.matrix);
  }
  gardenRoot.add(blobField);

  function applyLayout() {
    var L = window.innerWidth < 880 ? LAYOUT_M : LAYOUT_D;
    plants.forEach(function (p, i) {
      var c = L[i];
      if (!c) return;
      p.group.position.set(c[0], hillY(c[0], c[1]), c[1]);
      p.baseScale = c[2] / 2.2;
    });
  }

  /* ---- mưa cánh hoa ---- */
  var RAIN_N = LOW ? 50 : 120;
  var rainGeo = petalGeo(0.3, 0.13, 0.25, 0.4, 0.02, '#ffffff', '#ffffff');
  var rainMesh = new THREE.InstancedMesh(rainGeo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.6, map: veinTex }), RAIN_N);
  rainMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  rainMesh.frustumCulled = false;
  gardenRoot.add(rainMesh);
  var rainTint = [new THREE.Color('#f9d9c4'), new THREE.Color('#fbe7d6'), new THREE.Color('#f4c5ac'), new THREE.Color('#fdf0e2')];
  var rain = [];
  for (var fi = 0; fi < RAIN_N; fi++) {
    rain.push({
      x: rand(-8.5, 8.5), y: rand(-2, 9), z: rand(-7.5, 7.5),
      speed: rand(0.2, 0.55), amp: rand(0.4, 1.1), freq: rand(0.4, 1.0), phase: rand(0, 6.28),
      rx: rand(0, 6), ry: rand(0, 6), rz: rand(0, 6),
      drx: rand(-1.4, 1.4), dry: rand(-1.4, 1.4), drz: rand(-1, 1),
      scale: rand(0.26, 0.48)
    });
    rainMesh.setColorAt(fi, rainTint[fi % rainTint.length]);
  }
  if (rainMesh.instanceColor) rainMesh.instanceColor.needsUpdate = true;

  /* ---- bụi vàng lấp lánh ---- */
  var SPARK_N = 130;
  var sparkPos = new Float32Array(SPARK_N * 3);
  var sparkSpd = new Float32Array(SPARK_N);
  for (var si2 = 0; si2 < SPARK_N; si2++) {
    sparkPos[si2 * 3] = rand(-8, 8);
    sparkPos[si2 * 3 + 1] = rand(-0.5, 7);
    sparkPos[si2 * 3 + 2] = rand(-7.5, 7.5);
    sparkSpd[si2] = rand(0.08, 0.25);
  }
  var sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  var sparkMat = new THREE.PointsMaterial({
    size: 0.06, map: glowTex, transparent: true, opacity: 0.55,
    color: 0xd9a441, depthWrite: false, sizeAttenuation: true
  });
  var sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  gardenRoot.add(sparks);

  /* ---- bokeh mơ màng ---- */
  var bokeh = [];
  for (var bi = 0; bi < (LOW ? 10 : 22); bi++) {
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: [0xffe6cf, 0xffd2b8, 0xfff3e0][bi % 3],
      transparent: true, opacity: rand(0.05, 0.13),
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    var bs = rand(0.7, 2.4);
    sp.scale.set(bs, bs, 1);
    sp.position.set(rand(-8, 8), rand(0.5, 6), rand(-6, -1));
    sp.userData = { vy: rand(0.05, 0.16), ph: rand(0, 6.28) };
    scene.add(sp);
    bokeh.push(sp);
  }

  /* vệt nắng xuyên tán cây (god rays) */
  [[-2.3, 3.3, -1.5, 1.5, 6.4, 0.12, 0.16], [-0.7, 3.0, -2.4, 1.1, 5.6, 0.09, -0.1], [-4.3, 3.6, -2.0, 1.8, 7.0, 0.1, 0.22]].forEach(function (sf) {
    var sh2 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: shaftTex, transparent: true, opacity: sf[5],
      blending: THREE.AdditiveBlending, depthWrite: false, rotation: sf[6]
    }));
    sh2.scale.set(sf[3], sf[4], 1);
    sh2.position.set(sf[0], sf[1], sf[2]);
    scene.add(sh2);
  });

  /* ---- hào quang sau đóa chính ---- */
  [[-3.6, 2.85, -0.8, 3.2], [-1.7, 2.45, -0.6, 2.6], [-0.4, 2.05, -0.7, 2.0]].forEach(function (g) {
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: 0xffd9ae, transparent: true, opacity: 0.3,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    glow.scale.set(g[3], g[3], 1);
    glow.position.set(g[0], g[1], g[2]);
    scene.add(glow);
  });

  /* ---- bướm ---- */
  var butterflies = [
    { g: makeButterfly('monarch', 1.12), cx: -3.0, cy: 2.6, cz: -0.4, rx: 1.5, rz: 0.8, spd: 0.5, ph: 0, flap: 12 },
    { g: makeButterfly('monarch', 0.92), cx: -1.2, cy: 2.15, cz: -0.8, rx: 1.2, rz: 0.6, spd: 0.38, ph: 2.4, flap: 10 },
    { g: makeButterfly('white', 1.0), cx: -2.2, cy: 2.95, cz: -1.3, rx: 1.0, rz: 0.55, spd: 0.3, ph: 4.2, flap: 14 },
    { g: makeButterfly('white', 0.9), cx: 2.6, cy: 2.2, cz: 0.8, rx: 1.1, rz: 0.7, spd: 0.42, ph: 1.2, flap: 13 },
    { g: makeButterfly('monarch', 0.85), cx: 4.2, cy: 2.5, cz: -1.8, rx: 1.3, rz: 0.8, spd: 0.36, ph: 3.6, flap: 11 },
    { g: makeButterfly('white', 1.05), cx: -4.6, cy: 2.4, cz: -2.6, rx: 1.2, rz: 0.7, spd: 0.44, ph: 5.1, flap: 12 },
    { g: makeButterfly('monarch', 0.8), cx: 0.8, cy: 2.8, cz: -4.4, rx: 1.4, rz: 0.9, spd: 0.32, ph: 0.9, flap: 10 },
    { g: makeButterfly('white', 0.85), cx: -2.0, cy: 2.6, cz: 3.6, rx: 1.0, rz: 0.6, spd: 0.4, ph: 2.9, flap: 13 },
    { g: makeButterfly('monarch', 0.95), cx: 3.2, cy: 2.9, cz: 4.2, rx: 1.3, rz: 0.8, spd: 0.34, ph: 4.8, flap: 11 }
  ];

  /* vùng cấm UI (rail + panel receipt): bướm bay đè chữ thì mờ dần đi.
     Chiếu hình học chạy trong setInterval SAU rAF-render (matrixWorld fresh),
     tick chỉ lerp opacity theo cờ uiHide — đọc matrixWorld trong tick trước render bị stale. */
  var vUi = new THREE.Vector3();
  setInterval(function () {
    try {
      var qs = [];
      var r1q = document.querySelector('.rail'), r2q = document.querySelector('.panel');
      if (r1q) {
        var rc = r1q.children;
        for (var rq = 0; rq < rc.length; rq++) qs.push(rc[rq].getBoundingClientRect());
      }
      if (r2q) qs.push(r2q.getBoundingClientRect());
      for (var qi = 0; qi < butterflies.length; qi++) {
        var QG = butterflies[qi].g;
        QG.getWorldPosition(vUi);
        var dQ = vUi.distanceTo(camera.position);
        QG.userData.distFade = dQ < 2.0 ? 0 : dQ > 3.4 ? 1 : (dQ - 2.0) / 1.4;
        vUi.project(camera);
        var inUi = false;
        if (vUi.z < 1) {
          var mgQ = QG.userData.uiHide ? 26 : 8;
          var qsx = (vUi.x * 0.5 + 0.5) * innerWidth, qsy = (-vUi.y * 0.5 + 0.5) * innerHeight;
          for (var qj = 0; qj < qs.length; qj++) {
            var QR = qs[qj];
            if (qsx > QR.left - mgQ && qsx < QR.right + mgQ && qsy > QR.top - mgQ && qsy < QR.bottom + mgQ) { inUi = true; break; }
          }
        }
        QG.userData.uiHide = inUi;
      }
      for (var qb = 0; qb < bees.length; qb++) {
        var QB = bees[qb];
        QB.getWorldPosition(vUi);
        var dB = vUi.distanceTo(camera.position);
        QB.userData.distFade = dB < 0.55 ? 0 : dB > 1.2 ? 1 : (dB - 0.55) / 0.65;
        vUi.project(camera);
        var inB = false;
        if (vUi.z < 1) {
          var mB = QB.userData.uiHide ? 26 : 8;
          var bxB = (vUi.x * 0.5 + 0.5) * innerWidth, byB = (-vUi.y * 0.5 + 0.5) * innerHeight;
          for (var qk = 0; qk < qs.length; qk++) {
            var BR = qs[qk];
            if (bxB > BR.left - mB && bxB < BR.right + mB && byB > BR.top - mB && byB < BR.bottom + mB) { inB = true; break; }
          }
        }
        QB.userData.uiHide = inB;
      }
    } catch (eU) {}
  }, 350);


  /* ong mật ẢNH THẬT (macro nhìn từ trên): 1 tấm ảnh nguyên vẹn, billboard theo camera */
  var bees = [];
  (function buildBees() {
    var beeTex = new THREE.TextureLoader().load(TXT.bee);
    var beeAnchor = [
      [-3.35, 1.9, 1.15, 0.5, 0.4, 1.5], [1.4, 2.0, 3.4, 0.6, 0.5, 0.7], [-1.6, 1.7, 3.0, 0.45, 0.5, 0.85],
      [2.8, 1.9, 0.6, 0.55, 0.45, 1.1], [3.8, 2.1, -1.6, 0.5, 0.55, 0.65], [-4.8, 2.2, -2.0, 0.6, 0.5, 0.75],
      [0.6, 2.3, -2.8, 0.5, 0.6, 0.9], [-2.2, 2.5, -4.6, 0.65, 0.55, 0.6], [4.6, 2.5, -4.0, 0.55, 0.6, 0.55],
      [-1.2, 2.7, 4.6, 0.55, 0.5, 0.7], [2.4, 2.8, 5.2, 0.6, 0.5, 0.6], [-5.6, 2.6, 2.6, 0.5, 0.5, 0.8]
    ];
    var nBee = LOW ? 6 : beeAnchor.length;
    for (var bi3 = 0; bi3 < nBee; bi3++) {
      var bc = beeAnchor[bi3];
      var bw2 = rand(0.3, 0.38), bh2 = bw2 * 279 / 512;
      var bgeo2 = new THREE.PlaneGeometry(bw2, bh2, 20, 8);
      var gb2 = new THREE.Mesh(
        bgeo2,
        new THREE.MeshBasicMaterial({ map: beeTex, transparent: true, alphaTest: 0.14, side: THREE.DoubleSide, depthWrite: false, fog: false, color: 0xf5ead6, opacity: 1 })
      );
      gb2.userData = { cx: bc[0], cy: bc[1], cz: bc[2], rx: bc[3], rz: bc[4], spd: bc[5], ph: rand(0, 6.283), anchors: beeAnchor, base: bgeo2.attributes.position.array.slice(), bw: bw2, bh: bh2 };
      gardenRoot.add(gb2);
      bees.push(gb2);
    }
    window.__bees = bees;
  })();

  /* ---- CHUỒN CHUỒN ban ngày: thân mảnh, 4 cánh trong, lượn thấp quanh cỏ/hồ ---- */
  var dragonflies = [];
  (function () {
    var dfMat6 = new THREE.MeshStandardMaterial({ color: 0x3f8f9e, roughness: 0.4, emissive: 0x123236, emissiveIntensity: 0.2 });
    var wgMat6 = new THREE.MeshBasicMaterial({ color: 0xdceef2, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false });
    for (var di6 = 0; di6 < 3; di6++) {
      var dg6 = new THREE.Group();
      var bd6 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.3, 6), dfMat6);
      bd6.rotation.x = Math.PI / 2;
      dg6.add(bd6);
      var hd6 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), dfMat6);
      hd6.position.z = 0.17;
      dg6.add(hd6);
      var wgs6 = [];
      for (var wj6 = 0; wj6 < 4; wj6++) {
        var wp6 = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.035), wgMat6);
        var sx6 = wj6 % 2 ? 1 : -1, sy6 = wj6 < 2 ? 1 : -1;
        wp6.position.set(sx6 * 0.095, 0, sy6 * 0.05 - 0.04);
        wp6.rotation.x = -0.5 * sy6;
        dg6.add(wp6);
        wgs6.push(wp6);
      }
      dg6.userData = { ph: rand(0, 6.283), r: 3.5 + di6 * 1.8, cx0: di6 === 2 ? 7 : (di6 - 1) * 5, cz0: di6 === 2 ? 31 : 2 + di6 * 3, spd: 0.5 + di6 * 0.16, dartT: rand(2, 6) };
      dg6.visible = false;
      gardenRoot.add(dg6);
      dragonflies.push({ g: dg6, wings: wgs6 });
    }
  })();
  function updateDragonflies(dt) {
    var dayNow = window.__isNight !== true;
    for (var i6 = 0; i6 < dragonflies.length; i6++) {
      var D = dragonflies[i6], u6 = D.g.userData;
      D.g.visible = dayNow;
      if (!dayNow) continue;
      var a6 = elapsed * u6.spd + u6.ph;
      var px6 = u6.cx0 + Math.cos(a6) * u6.r, pz6 = u6.cz0 + Math.sin(a6 * 0.77) * u6.r * 0.7;
      var gy6 = hillY(px6, pz6);
      D.g.position.set(px6, gy6 + 0.75 + Math.sin(a6 * 3.1) * 0.16, pz6);
      var nx6 = u6.cx0 + Math.cos(a6 + 0.05) * u6.r, nz6 = u6.cz0 + Math.sin((a6 + 0.05) * 0.77) * u6.r * 0.7;
      D.g.rotation.y = Math.atan2(px6 - nx6, pz6 - nz6);
      var fl6 = Math.sin(elapsed * 26 + u6.ph) * 0.35;
      D.wings[0].rotation.z = fl6; D.wings[1].rotation.z = -fl6;
      D.wings[2].rotation.z = -fl6; D.wings[3].rotation.z = fl6;
    }
  }

  /* ---- vụ nổ cánh hoa khi chạm ---- */
  var BURST_N = 70;
  var burstGeo = petalGeo(0.34, 0.15, 0.22, 0.35, 0.02, '#ffffff', '#ffffff');
  var burstMesh = new THREE.InstancedMesh(burstGeo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.6, map: veinTex }), BURST_N);
  burstMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  burstMesh.frustumCulled = false;
  gardenRoot.add(burstMesh);
  var bits = [];
  for (var bj = 0; bj < BURST_N; bj++) {
    bits.push({ alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Euler(), rv: new THREE.Vector3(), life: 0, scale: 1 });
    burstMesh.setColorAt(bj, rainTint[bj % rainTint.length]);
  }
  if (burstMesh.instanceColor) burstMesh.instanceColor.needsUpdate = true;
  var dummy = new THREE.Object3D();
  function hideBit(i) {
    dummy.position.set(0, -60, 0);
    dummy.scale.setScalar(0.0001);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    burstMesh.setMatrixAt(i, dummy.matrix);
  }
  for (var hj = 0; hj < BURST_N; hj++) hideBit(hj);
  burstMesh.instanceMatrix.needsUpdate = true;

  function spawnBurst(origin, count) {
    origin = gardenRoot.worldToLocal(origin.clone());
    var made = 0;
    for (var i = 0; i < BURST_N && made < count; i++) {
      var b = bits[i];
      if (b.alive) continue;
      b.alive = true;
      b.pos.set(origin.x + rand(-0.2, 0.2), origin.y + rand(-0.2, 0.2), origin.z + rand(-0.2, 0.2));
      var th = rand(0, Math.PI * 2), sp = rand(0.7, 2.2);
      b.vel.set(Math.cos(th) * sp, rand(1.2, 2.6), Math.sin(th) * sp);
      b.rot.set(rand(0, 6), rand(0, 6), rand(0, 6));
      b.rv.set(rand(-3.5, 3.5), rand(-3.5, 3.5), rand(-3, 3));
      b.life = 1;
      b.scale = rand(0.5, 1.0);
      made++;
    }
    flash(origin);
  }

  /* chớp sáng khi nở lại */
  var flashSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffe2b8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(flashSpr);
  var flashT = -1;
  function flash(origin) {
    flashSpr.position.copy(origin);
    flashT = 0;
  }

  /* ---- nở lại khi chạm vào hoa ---- */
  var nowMs = 0;
  var tmpV = new THREE.Vector3();
  function rebloom(p) {
    p.head.getWorldPosition(tmpV);
    spawnBurst(tmpV, 30);
    var order = 0;
    for (var ri = RINGS.length - 1; ri >= 0; ri--) {
      p.petals.forEach(function (pt) {
        if (pt.ring !== ri) return;
        pt.state = 'closing';
        pt.t0 = nowMs + order * 24;
        pt.from = pt.cur;
        pt.reopenAt = nowMs + 430 + order * 26 + rand(0, 60);
        order++;
      });
    }
  }

  /* đàn cò trắng — ẢNH THẬT + uốn lưới cánh: 1 tấm ảnh, cánh gập lên xuống như lông mềm */
  var egretGlideTex = new THREE.TextureLoader().load(TXT.egretMid);
  var egrets = [];
  var egretLoose = [[0, 0], [1.7, 0.5], [-1.5, 0.6], [2.8, 0.95], [-2.4, 1.2]];
  var egretN = isMobile || LOW ? 3 : 5;
  var egretDirs = [[-1, 0, 0], [-1, 0.12, -0.22], [-1, -0.08, 0.25], [-1, 0.1, -0.3], [-1, -0.12, 0.18]];
  var egretGeo = new THREE.PlaneGeometry(1, 1, 24, 6);
  var egretGeoBase = egretGeo.attributes.position.array.slice();
  for (var edi = 0; edi < egretN; edi++) {
    var egm = new THREE.MeshBasicMaterial({ map: egretGlideTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 1, fog: false, color: 0xf1e6d2, alphaTest: 0.05 });
    var eg = new THREE.Group();
  var eb = new THREE.Mesh(new THREE.SphereGeometry(0.30, 16, 12), new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 0.9 })); eb.scale.set(1.0, 0.55, 0.62); eg.add(eb);
  var en = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf7f0e2, roughness: 0.9 })); en.position.set(0, 0.10, -0.25); eg.add(en);
  var bk = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.34, 8), new THREE.MeshStandardMaterial({ color: 0xe0a83a, roughness: 0.7 })); bk.rotation.x = -Math.PI / 2; bk.position.set(0, 0.10, -0.47); eg.add(bk);
  var wgeo = new THREE.SphereGeometry(1, 12, 10);
  var wl = new THREE.Mesh(wgeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide })); wl.scale.set(0.52, 0.03, 0.20); wl.position.set(-0.45, 0.06, 0); eg.add(wl);
  var wr = new THREE.Mesh(wgeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide })); wr.scale.set(0.52, 0.03, 0.20); wr.position.set(0.45, 0.06, 0); eg.add(wr);
  eg.userData.wings = [wl, wr];
    var eW = rand(0.78, 1.06), eH = eW * (TXT.egretMidH || 322) / (TXT.egretMidW || 526);
    eg.scale.set(eW, eH, 1);
    var edr = egretDirs[edi % egretDirs.length];
    var edl = Math.sqrt(edr[0] * edr[0] + edr[1] * edr[1] + edr[2] * edr[2]);
    eg.userData = {
      ph: rand(0, 6.283),
      dirX: edr[0] / edl, dirY: edr[1] / edl, dirZ: edr[2] / edl,
      spd: rand(0.35, 0.6),
      arcA: rand(0.55, 0.85), arcW: rand(0.11, 0.17), arcP: rand(0, 6.283),
      w: eW, h: eH
    };
    eg.position.set(rand(-8.5, -3.2) + egretLoose[edi][0], rand(3.05, 3.65), rand(-16.5, -13.5) + egretLoose[edi][1]);
    gardenRoot.add(eg);
    egrets.push(eg);
  }
  window.__birds = egrets;
  window.__butterflies = butterflies;

  /* sương mềm lăn tăn trên đồng xa */
  var mistTex = (function () {
    var c = document.createElement('canvas'); c.width = 128; c.height = 64;
    var g = c.getContext('2d');
    var rg = g.createRadialGradient(64, 32, 4, 64, 32, 60);
    rg.addColorStop(0, 'rgba(255,250,240,0.8)');
    rg.addColorStop(0.55, 'rgba(255,248,236,0.34)');
    rg.addColorStop(1, 'rgba(255,248,236,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 64);
    return new THREE.CanvasTexture(c);
  })();
  var mists = [];
  var mistN = isMobile || LOW ? 3 : 6;
  for (var msi = 0; msi < mistN; msi++) {
    var msp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, opacity: rand(0.07, 0.13), depthWrite: false }));
    var msc = rand(3.6, 6.6);
    msp.scale.set(msc, msc * 0.4, 1);
    msp.position.set(rand(-9, 9), rand(0.28, 0.62), rand(-11, -4.5));
    msp.userData = { vx: rand(0.05, 0.13) * (Math.random() < 0.5 ? -1 : 1), ph: rand(0, 6.283), o: msp.material.opacity };
    gardenRoot.add(msp);
    mists.push(msp);
  }

  /* hạt bồ công anh lơ lửng gần camera */
  var puffTex = (function () {
    var c = document.createElement('canvas'); c.width = 32; c.height = 32;
    var g = c.getContext('2d');
    var rg = g.createRadialGradient(16, 16, 1, 16, 16, 14);
    rg.addColorStop(0, 'rgba(255,252,244,0.95)');
    rg.addColorStop(0.45, 'rgba(255,250,240,0.5)');
    rg.addColorStop(1, 'rgba(255,250,240,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  })();
  var puffs = [];
  if (!(isMobile || LOW)) {
    for (var psi = 0; psi < 14; psi++) {
      var psp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, opacity: rand(0.4, 0.68), depthWrite: false }));
      var pa2 = rand(0, 6.283), pr2 = 0.6 + 2.6 * Math.sqrt(Math.random());
      psp.scale.setScalar(rand(0.05, 0.095));
      psp.position.set(Math.cos(pa2) * pr2, rand(0.45, 1.7), 6.5 + Math.sin(pa2) * pr2 * 0.8);
      psp.userData = { ph: rand(0, 6.283), sp: rand(0.5, 1.1), base: psp.position.y };
      gardenRoot.add(psp);
      puffs.push(psp);
    }
  }

    /* bụi phấn vàng văng lên khi từng bông nở */
  var pollenTex = (function () {
    var c = document.createElement('canvas'); c.width = 32; c.height = 32;
    var g = c.getContext('2d');
    var rg = g.createRadialGradient(16, 16, 1, 16, 16, 14);
    rg.addColorStop(0, 'rgba(255,226,150,0.95)');
    rg.addColorStop(0.4, 'rgba(255,204,110,0.55)');
    rg.addColorStop(1, 'rgba(255,204,110,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  })();
  var pollen = [];
  var pollenN = isMobile || LOW ? 0 : 150;
  var pollenCursor = 0;
  for (var pli = 0; pli < pollenN; pli++) {
    var psp2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: pollenTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd9a0 }));
    psp2.scale.setScalar(0.06);
    psp2.visible = false;
    psp2.userData = { on: false, t0: 0, dur: 1300, vx: 0, vy: 0, vz: 0 };
    gardenRoot.add(psp2);
    pollen.push(psp2);
  }
  function spawnPollen(bx, by, bz, now) {
    if (!pollenN) return;
    for (var pj = 0; pj < 5; pj++) {
      var ps3 = pollen[pollenCursor]; pollenCursor = (pollenCursor + 1) % pollenN;
      var pa3 = rand(0, 6.283), pr3 = rand(0.02, 0.1);
      ps3.position.set(bx + Math.cos(pa3) * pr3, by + rand(0.03, 0.1), bz + Math.sin(pa3) * pr3);
      ps3.userData.on = true;
      ps3.userData.t0 = now;
      ps3.userData.dur = rand(1100, 1800);
      ps3.userData.vx = rand(-0.09, 0.09);
      ps3.userData.vy = rand(0.13, 0.3);
      ps3.userData.vz = rand(-0.09, 0.09);
    }
  }

/* ---- bố cục + camera ---- */
  var CAM = new THREE.Vector3(), TARGET = new THREE.Vector3(), FOV = 36;
  window.CAM = CAM; window.TARGET = TARGET;
  function layout() {
    var w = window.innerWidth, h = window.innerHeight;
    isMobile = w < 880;
    if (isMobile) LOW = true;
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = !LOW;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile || LOW ? 1.25 : 2));
    applyLayout();
    if (!isMobile) {
      FOV = 50;
      CAM.set(0.4, 3.62, 7.0);
      TARGET.set(-1.0, 1.4, 0);
    } else {
      FOV = 58;
      CAM.set(0, 3.4, 8.6);
      TARGET.set(-0.35, 1.4, 0);
    }
    camera.fov = FOV;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  layout();
  window.addEventListener('resize', layout);

  gardenRoot.rotation.y = -0.14;

  /* ---- tương tác ---- */
  var mx = 0, my = 0;
  var dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, downT = 0, moved = 0;
  var velY = 0;
  var smx = 0, smy = 0;
  var raycaster = new THREE.Raycaster();
  var groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  var hitPoint = new THREE.Vector3();

  window.addEventListener('pointermove', function (e) {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
    if (dragging) {
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (window.__GAME && window.__orbitDrag) { window.__orbitDrag(dx, dy); velY = 0; }
      else { gardenRoot.rotation.y += dx * 0.004; velY = dx * 0.004; }
      lastX = e.clientX; lastY = e.clientY;
    }
    tiltPanel();
  });
  window.addEventListener('pointerdown', function (e) {
    if (e.target && e.target.closest && e.target.closest('.panel, .topbar, .rail, .hint, a, button')) return;
    dragging = true;
    moved = 0;
    lastX = downX = e.clientX;
    lastY = downY = e.clientY;
    downT = performance.now();
    document.body.classList.add('grabbing');
  });
  window.addEventListener('pointerup', function (e) {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove('grabbing');
    if (!(performance.now() - downT < 400 && moved < 9)) return;
    var nx = (e.clientX / window.innerWidth) * 2 - 1;
    var ny = -((e.clientY / window.innerHeight) * 2 - 1);
    raycaster.setFromCamera({ x: nx, y: ny }, camera);
    /* chạm sinh vật (hitbox screen-space rộng — bướm/ong mỏng, raycast dễ hụt khi bay):
       bướm hoảng bay xoắn + bụi phấn, ong phóng bỏ chạy vo ve giận, cò đập cánh dồn */
    (function () {
      var bfsA = window.__butterflies || [], beesA = window.__bees || [], birdsA = window.__birds || [];
      var PV = new THREE.Vector3();
      var bestK = null, bestRef = null, bestD = 1e9;
      function consider(o9, kind, rad) {
        if (o9.getWorldPosition) o9.getWorldPosition(PV); else PV.copy(o9.position);
        PV.project(camera);
        if (PV.z > 1) return;
        var dx9 = (PV.x * 0.5 + 0.5) * innerWidth - e.clientX;
        var dy9 = (-PV.y * 0.5 + 0.5) * innerHeight - e.clientY;
        var d9 = Math.sqrt(dx9 * dx9 + dy9 * dy9);
        if (d9 < rad && d9 < bestD) { bestD = d9; bestK = kind; bestRef = o9; }
      }
      for (var ri3 = 0; ri3 < bfsA.length; ri3++) consider(bfsA[ri3].g, 'bf', 80);
      for (var ri4 = 0; ri4 < beesA.length; ri4++) consider(beesA[ri4], 'bee', 55);
      for (var ri5 = 0; ri5 < birdsA.length; ri5++) consider(birdsA[ri5], 'bird', 70);
      if (!bestK) return;
      var kind = bestK, ref = bestRef;
      if (kind === 'bf') { for (var k11 = 0; k11 < bfsA.length; k11++) if (bfsA[k11].g === ref) { ref = bfsA[k11]; break; } }
      var rp9 = ref.g || ref;
      rp9.getWorldPosition(hitPoint);
      spawnBurst(hitPoint, kind === 'bird' ? 6 : 10);
      if (kind === 'bf') {
        ref.startle = { t0: elapsed, dur: 1.5 };
        if (window.__sfx) window.__sfx.chime();
      } else if (kind === 'bee') {
        var eu9 = ref.userData;
        eu9.st = 1; eu9.tA = elapsed; eu9.dur = 0.42;
        eu9.px = ref.position.x; eu9.py = ref.position.y; eu9.pz = ref.position.z;
        var ag9 = rand(0, 6.283), rr9 = rand(1.3, 2.3);
        eu9.tx2 = ref.position.x + Math.sin(ag9) * rr9;
        eu9.ty2 = Math.min(3.2, Math.max(0.8, ref.position.y + rand(0.1, 0.5)));
        eu9.tz2 = ref.position.z + Math.cos(ag9) * rr9;
        if (window.__sfx) window.__sfx.buzz();
      } else {
        ref.userData.startleE = elapsed;
        if (window.__sfx) window.__sfx.whoosh();
      }
    })();
    var hits = raycaster.intersectObjects(headsArr, true);
    if (hits.length) {
      var o = hits[0].object, ref = null;
      while (o && !ref) { ref = o.userData.plantRef || null; o = o.parent; }
      if (ref) rebloom(ref);
    } else if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      hitPoint.y = Math.max(hitPoint.y, hillY(hitPoint.x, hitPoint.z) + 0.1);
      spawnBurst(hitPoint, 18);
    }
  });
  window.addEventListener('pointercancel', function () { dragging = false; document.body.classList.remove('grabbing'); });

  var panel = byId('panel');
  var tiltFine = false;
  try { tiltFine = window.matchMedia('(pointer: fine)').matches; } catch (e) {}
  function tiltPanel() {
    if (!panel || !tiltFine || reduced || window.innerWidth < 880) return;
    panel.style.setProperty('--ry', (mx * 2.2).toFixed(2) + 'deg');
    panel.style.setProperty('--rx', (my * -1.8).toFixed(2) + 'deg');
  }

  /* ---- vòng lặp ---- */
  var clock = new THREE.Clock();
  var elapsed = 0;
  var introDur = reduced ? 0.01 : 3.4;

  var liteApplied = false, ftAcc = 0, ftN = 0, removeSplashWhenDrawn = null;
  function applyLite() {
    if (liteApplied) return;
    liteApplied = true;
    liteMeshes.forEach(function (p) { p[0].count = Math.max(30, Math.floor(p[0].count * p[1])); });
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = false;
  }
  function tick() {
    var dtRaw = clock.getDelta();
    var dt = Math.min(dtRaw, 0.05);
    elapsed += dt;
    if (window.__REAL_WIND_TIME) window.__REAL_WIND_TIME.value = elapsed;
    nowMs = elapsed * 1000;
    var t = elapsed;
    var motion = reduced ? 0.25 : 1;
    if (isMobile && !liteApplied && !liteDisabled) applyLite();
    var intro = easeInOutSine(Math.min(1, elapsed / introDur));
    if (waveMeshes.length) updateWave(elapsed * 1000);

    /* tự hạ cấu hình nếu máy yếu: giữ chuyển động mượt, giảm mật độ */
    if (elapsed > 5 && !liteApplied && !liteDisabled) {
      ftAcc += dt; ftN++;
      if (ftN >= 50) {
        if (ftAcc / ftN > 0.044) applyLite();
        ftAcc = 0; ftN = 0;
      }
    }

    /* cây lớn lên + lắc lư */
    for (var i = 0; i < plants.length; i++) {
      var p = plants[i];
      var gk = THREE.MathUtils.clamp((nowMs - p.growStart) / p.growDur, 0, 1);
      var gs = Math.max(0.001, easeOutCubic(gk)) * p.baseScale * (1 + 0.07 * Math.sin(gk * Math.PI) * (1 - gk));
      p.group.scale.setScalar(gs);
      p.shadow.material.opacity = 1.0 * gk;
      var gust = Math.sin(t * 0.5 - p.group.position.x * 0.55);
      p.group.rotation.z = (Math.sin(t * 0.85 + p.phase) * 0.026 + gust * 0.014) * motion * gk;
      /* quay mặt hoa về phía người xem khi nở */
      var nk = THREE.MathUtils.clamp((nowMs - p.headUpAt) / 900, 0, 1);
      p.head.rotation.x = 0.95 - 0.95 * nk;
      p.head.rotation.z = Math.sin(t * 0.7 + p.phase) * 0.05 * motion;
      /* nhụy pop */
      for (var sj = 0; sj < p.stamens.length; sj++) {
        var stn = p.stamens[sj];
        var sk = THREE.MathUtils.clamp((nowMs - stn.at) / 420, 0, 1);
        stn.mesh.scale.setScalar(Math.max(0.001, easeOutBack(sk)));
      }
      if (p.pollenAt === undefined) p.pollenAt = (isMobile || LOW) ? 0 : p.bloomBase + 260 + rand(0, 130);
      if (p.pollenAt && nowMs >= p.pollenAt) {
        p.pollenAt = 0;
        p.head.getWorldPosition(tmpV);
        gardenRoot.worldToLocal(tmpV);
        spawnPollen(tmpV.x, tmpV.y, tmpV.z, nowMs);
      }
    }

    /* cánh hoa nở */
    for (var i2 = 0; i2 < plants.length; i2++) {
      var pts = plants[i2].petals;
      for (var k2 = 0; k2 < pts.length; k2++) {
        var pt = pts[k2];
        if (pt.state === 'wait' && nowMs >= pt.t0) { pt.state = 'opening'; pt.t0 = nowMs; pt.from = pt.cur; }
        if (pt.state === 'opening') {
          var ko = THREE.MathUtils.clamp((nowMs - pt.t0) / pt.dur, 0, 1);
          pt.cur = pt.from + (pt.tilt - pt.from) * easeOutBack(ko);
          pt.pivot.rotation.z = (1 - ko) * 0.36 * (pt.idx % 2 ? 1 : -1);
          if (ko >= 1) pt.state = 'open';
        } else if (pt.state === 'closing') {
          var kc = THREE.MathUtils.clamp((nowMs - pt.t0) / 300, 0, 1);
          pt.cur = pt.from + (0.05 - pt.from) * kc * kc;
          pt.pivot.rotation.z = (pt.pivot.rotation.z || 0) * (1 - kc);
          if (kc >= 1) {
            if (nowMs >= pt.reopenAt) { pt.state = 'opening'; pt.t0 = nowMs; pt.from = pt.cur; pt.dur = 950; }
            else pt.state = 'closed';
          }
        } else if (pt.state === 'closed' && nowMs >= pt.reopenAt) {
          pt.state = 'opening'; pt.t0 = nowMs; pt.from = pt.cur; pt.dur = 950;
        }
        pt.pivot.rotation.x = pt.cur;
        var gsk = THREE.MathUtils.clamp((nowMs - pt.growT0) / 500, 0, 1);
        pt.mesh.scale.setScalar(Math.max(0.001, easeOutBack(gsk) * pt.scale));
      }
    }

    /* từng ngọn cỏ lay trong gió (gần + xa, nghiêng theo hướng riêng) */
    dummy.rotation.order = 'YXZ';
    var gust2 = Math.sin(t * 0.5) * 0.5 + mx * 0.6;
    var ppT = ppL();
    if (!window.__REAL_ASSETS || !grassMatricesReady) {
      var grassActiveN = Math.min(GRASS_N, grassMesh.count);
      for (var gw = 0; gw < grassActiveN; gw++) {
        var gd = grassData[gw];
        if (!gd) continue;
        var wave = Math.sin(t * 2.1 - gd.x * 0.7 - gd.z * 0.4);
        var sw = Math.sin(t * 1.6 + gd.phase) * gd.amp + gust2 * gd.amp * 0.8 + wave * gd.amp * 0.9;
        var tr = 1;
        if (ppT) {
          var dxT = gd.x - ppT.x, dzT = gd.z - ppT.z;
          var dT = Math.sqrt(dxT * dxT + dzT * dzT);
          if (dT < 0.95) tr = 0.16 + 0.84 * (dT / 0.95);
        }
        gd.tr = gd.tr === undefined ? 1 : gd.tr + (tr - gd.tr) * Math.min(1, dt * 7);
        dummy.position.set(gd.x, gd.y - (1 - gd.tr) * 0.10, gd.z);
        dummy.rotation.set(sw * 0.5, gd.yaw + (1 - gd.tr) * 0.9, sw * 1.4 + (1 - gd.tr) * 0.65);
        dummy.scale.set(gd.s * gd.sx, gd.s * gd.sy * gd.tr, 1);
        dummy.updateMatrix();
        grassMesh.setMatrixAt(gw, dummy.matrix);
      }
      grassMesh.instanceMatrix.needsUpdate = true;
      var farActiveN = Math.min(FAR_N, farGrassMesh.count);
      for (var fw2 = 0; fw2 < farActiveN; fw2++) {
        var fd = farGrassData[fw2];
        var fwave = Math.sin(t * 1.9 - fd.x * 0.6 - fd.z * 0.35);
        var fsw = Math.sin(t * 1.3 + fd.phase) * fd.amp + gust2 * fd.amp * 0.7 + fwave * fd.amp;
        dummy.position.set(fd.x, fd.y, fd.z);
        dummy.rotation.set(fsw * 0.5, fd.yaw, fsw * 1.35);
        dummy.scale.set(fd.s * fd.sx, fd.s * fd.sy, 1);
        dummy.updateMatrix();
        farGrassMesh.setMatrixAt(fw2, dummy.matrix);
      }
      farGrassMesh.instanceMatrix.needsUpdate = true;
      if (window.__REAL_ASSETS) grassMatricesReady = true;
    }

    /* đàn cò: uốn lưới cánh theo nhịp sin — cánh gập lên/xuống liên tục (đêm cò nghỉ: ẩn + đứng yên) */
    var nightG = window.__isNight === true;
    for (var ed2 = 0; ed2 < egrets.length; ed2++) {
      var egb = egrets[ed2], eud = egb.userData;
      if (nightG) { egb.visible = false; continue; }
      var mvE = eud.frz !== undefined ? 0 : 1;
      var eph2 = t * eud.arcW + eud.arcP;
      var snE = Math.cos(eph2);
      var boostE = eud.startleE !== undefined ? Math.max(0, 1 - (t - eud.startleE) / 1.2) : 0;
      if (boostE <= 0 && eud.startleE !== undefined) delete eud.startleE;
      egb.position.x += mvE * eud.dirX * eud.spd * dt * motion * (1 + 2.2 * boostE);
      egb.position.y += mvE * (eud.dirY * snE * eud.spd * dt * motion + Math.sin(t * 0.7 + eud.ph) * 0.014 * dt);
      egb.position.z += mvE * eud.dirZ * snE * eud.spd * dt * motion;
      var flE = Math.sin(t * 2.3 + eud.ph * 3.0);
      var ampE, ampL;
      if (eud.frz !== undefined) { ampE = 0.12 * Math.sin(t * 0.6 + eud.ph); ampL = 0.12 * Math.sin(t * 0.6 - 0.5 + eud.ph); }
      else {
        var gfE = 0.66 + 0.34 * Math.sin(t * 0.24 + eud.ph * 2);
        ampE = 0.4 * flE * gfE;
        var flL = Math.sin(t * 2.3 - 0.55 + eud.ph * 3.0);
        var gfL = 0.66 + 0.34 * Math.sin((t - 0.55) * 0.24 + eud.ph * 2);
        ampL = 0.4 * flL * gfL;
      }
      if (boostE > 0) { ampE *= 1 + 1.5 * boostE; ampL *= 1 + 1.1 * boostE; }
      if (!egb.geometry) { if (egb.userData.wings) { egb.userData.wings[0].rotation.z = -0.35 - ampE; egb.userData.wings[1].rotation.z = 0.35 + ampL; } continue; }
var posE = egb.geometry.attributes.position, baseE = egretGeoBase;
      for (var ev2 = 0; ev2 < posE.count; ev2++) {
        var ox2 = baseE[ev2 * 3], oy2 = baseE[ev2 * 3 + 1];
        var u2 = ox2 + 0.5;
        if (u2 > 0.46) {
          var k2 = (u2 - 0.46) / 0.54;
          var k3 = k2 * k2;
          posE.array[ev2 * 3 + 1] = oy2 + ampE * k3 * 0.9 + ampL * k2 * k3 * 0.42;
          posE.array[ev2 * 3] = ox2 - ampE * k3 * 0.16;
          posE.array[ev2 * 3 + 2] = ampE * k3 * 0.2;
        } else {
          posE.array[ev2 * 3 + 1] = oy2 + ampE * 0.04 * (0.5 - u2);
        }
      }
      posE.needsUpdate = true;
      egb.rotation.z = Math.sin(t * 0.5 + eud.ph) * 0.04 + (mvE ? 0 : 0);
      tmpV.copy(egb.position);
      gardenRoot.localToWorld(tmpV);
      var fadeE = (34 - tmpV.distanceTo(camera.position)) / 14;
      fadeE = fadeE < 0.82 ? 0.82 : fadeE > 1 ? 1 : fadeE;
      egb.material.opacity = fadeE;
      if (egb.position.x > 15) egb.position.x = -15;
      if (egb.position.x < -15) egb.position.x = 15;
      /* kéo mềm về băng z/y thay vì gán cứng — không còn teleport khựng mắt */
      var pullE = Math.min(1, dt * 2.5);
      if (egb.position.z > -12.6) egb.position.z += (-13.4 - egb.position.z) * pullE;
      if (egb.position.z < -17.4) egb.position.z += (-16.6 - egb.position.z) * pullE;
      if (egb.position.y > 4.3) egb.position.y += (4.1 - egb.position.y) * pullE;
      if (egb.position.y < 2.9) egb.position.y += (3.1 - egb.position.y) * pullE;
    }
    /* sương trôi */
    for (var ms2 = 0; ms2 < mists.length; ms2++) {
      var mbb = mists[ms2];
      mbb.position.x += mbb.userData.vx * dt * motion;
      mbb.material.opacity = mbb.userData.o * (0.82 + 0.18 * Math.sin(t * 0.4 + mbb.userData.ph));
      if (mbb.position.x > 12) mbb.position.x = -12;
      if (mbb.position.x < -12) mbb.position.x = 12;
    }
    /* hạt bồ công anh bay nhẹ */
    for (var ps2 = 0; ps2 < puffs.length; ps2++) {
      var pbb = puffs[ps2], pud = pbb.userData;
      pbb.position.x += Math.sin(t * 0.5 + pud.ph) * 0.09 * dt * motion;
      pbb.position.z += Math.cos(t * 0.42 + pud.ph) * 0.07 * dt * motion;
      pbb.position.y = pud.base + Math.sin(t * pud.sp + pud.ph) * 0.18;
      if (pbb.position.x > 3.4) pbb.position.x = -3.4;
      if (pbb.position.x < -3.4) pbb.position.x = 3.4;
    }

    /* mưa cánh hoa — bám theo người chơi (map lớn), chạm cỏ nằm nghiêng tự nhiên rồi tan mờ */
    var wind = Math.sin(t * 0.25) * 0.35 + mx * 0.8;
    var ppR = ppL();
    var prx = ppR ? ppR.x : 0.4;
    var prz = ppR ? ppR.z : 6.8;
    for (var fi2 = 0; fi2 < RAIN_N; fi2++) {
      var f = rain[fi2];
      if (f.landed) {
        var age = t - f.landedAt;
        if (age > 3.4) {
          f.landed = false;
          var ra2 = rand(0, 6.283), rr2 = rand(5.5, 14);
          f.y = rand(5.5, 7.8); f.x = prx + Math.cos(ra2) * rr2; f.z = prz + Math.sin(ra2) * rr2;
          f.rx = rand(0, 6); f.ry = rand(0, 6); f.rz = rand(0, 6);
        } else {
          var decay = Math.max(0.001, 1 - Math.max(0, age - 1.6) / 1.8);
          dummy.position.set(f.x, f.gy + 0.012, f.z);
          dummy.rotation.set(-1.34, f.ry, f.rz * 0.06);
          dummy.scale.setScalar(f.scale * decay);
          dummy.updateMatrix();
          rainMesh.setMatrixAt(fi2, dummy.matrix);
          continue;
        }
      }
      f.y -= f.speed * dt * (reduced ? 0.3 : 1);
      f.x += (wind * 0.5 + Math.sin(t * f.freq + f.phase) * f.amp) * dt;
      f.z += wind * 0.21 * dt;
      f.rx += f.drx * dt; f.ry += f.dry * dt; f.rz += f.drz * dt;
      if (f.y < -2.2 || Math.abs(f.x - prx) > 18 || Math.abs(f.z - prz) > 18) {
        var ra4 = rand(0, 6.283), rr4 = rand(6, 15);
        f.y = rand(5.5, 7.8); f.x = prx + Math.cos(ra4) * rr4; f.z = prz + Math.sin(ra4) * rr4;
        f.rx = rand(0, 6); f.ry = rand(0, 6); f.rz = rand(0, 6);
      }
      var gy = hillY(f.x, f.z);
      if (f.y < gy + 0.02) {
        f.landed = true; f.landedAt = t; f.gy = gy;
        dummy.position.set(f.x, gy + 0.012, f.z);
        dummy.rotation.set(-1.34, f.ry, rand(-0.12, 0.12));
        dummy.scale.setScalar(f.scale);
        dummy.updateMatrix();
        rainMesh.setMatrixAt(fi2, dummy.matrix);
        continue;
      }
      dummy.position.set(f.x, f.y, f.z);
      dummy.rotation.set(f.rx, f.ry, f.rz);
      dummy.scale.setScalar(f.scale);
      dummy.updateMatrix();
      rainMesh.setMatrixAt(fi2, dummy.matrix);
    }
    rainMesh.instanceMatrix.needsUpdate = true;
    rainMesh.material.transparent = true;
    rainMesh.material.opacity = 0.9 * smooth(nowMs, 2400, 4600);

    /* bụi vàng */
    for (var di = 0; di < SPARK_N; di++) {
      sparkPos[di * 3 + 1] += sparkSpd[di] * dt * (reduced ? 0.2 : 1);
      sparkPos[di * 3] += Math.sin(t * 0.5 + di) * 0.05 * dt;
      if (sparkPos[di * 3 + 1] > 7) sparkPos[di * 3 + 1] = -0.8;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparkMat.opacity = 0.42 + Math.sin(t * 0.9) * 0.16;

    /* bokeh trôi */
    for (var bj2 = 0; bj2 < bokeh.length; bj2++) {
      var bo = bokeh[bj2];
      bo.position.y += bo.userData.vy * dt * motion;
      bo.position.x += Math.sin(t * 0.22 + bo.userData.ph) * 0.1 * dt;
      if (bo.position.y > 6.6) bo.position.y = 0.3;
    }

    /* bướm bay: vỗ–trượt–nghiêng người như thật, thỉnh thoảng đậu xuống hoa (đêm ẩn) */
    for (var bf = 0; bf < butterflies.length; bf++) {
      var B = butterflies[bf];
      if (nightG) { B.g.visible = false; continue; }
      var a = t * B.spd + B.ph;
      var px = B.cx + Math.sin(a) * B.rx;
      var py = B.cy + Math.sin(a * 1.7 + 1) * 0.45 + Math.sin(t * 5 + B.ph) * 0.05;
      var pz = B.cz + Math.cos(a) * B.rz;
      if (!B.land) B.land = { state: 0, at: 0, next: 8 + bf * 5, hpos: null, from: null };
      var L = B.land;
      var glide = 0.5 + 0.5 * Math.sin(t * 0.33 + B.ph * 2);
      var flapAmp = 0.3 + 0.42 * (1 - glide);
      if (L.state === 0 && t > L.next && plants.length) {
        L.state = 1; L.at = t; L.hpos = null;
        var hp2 = plants[(bf * 2 + 1) % plants.length];
        hp2.head.getWorldPosition(tmpV);
        L.hpos = gardenRoot.worldToLocal(tmpV.clone());
        L.from = [px, py, pz];
      }
      if (L.state === 1) {
        var lk = Math.min(1, (t - L.at) / 1.0);
        var e2 = easeInOutSine(lk);
        px = THREE.MathUtils.lerp(L.from[0], L.hpos.x, e2);
        py = THREE.MathUtils.lerp(L.from[1], L.hpos.y + 0.3, e2);
        pz = THREE.MathUtils.lerp(L.from[2], L.hpos.z, e2);
        flapAmp *= 0.4 + 0.6 * (1 - lk);
        if (lk >= 1) { L.state = 2; L.at = t; }
      } else if (L.state === 2) {
        px = L.hpos.x; py = L.hpos.y + 0.3 + Math.sin(t * 2) * 0.008; pz = L.hpos.z;
        flapAmp = 0.12;
        if (t - L.at > 2.6) { L.state = 3; L.at = t; L.from = [px, py, pz]; }
      } else if (L.state === 3) {
        var lk3 = Math.min(1, (t - L.at) / 0.9);
        var e3 = easeInOutSine(lk3);
        px = THREE.MathUtils.lerp(L.from[0], B.cx + Math.sin(a) * B.rx, e3);
        py = THREE.MathUtils.lerp(L.from[1], B.cy + Math.sin(a * 1.7 + 1) * 0.45, e3);
        pz = THREE.MathUtils.lerp(L.from[2], B.cz + Math.cos(a) * B.rz, e3);
        if (lk3 >= 1) { L.state = 0; L.next = t + 12 + Math.random() * 10; }
      }
      /* chạm vào bướm: hoảng — bật xoắn lên trời, cánh quạt bay, bụi phấn rơi */
      if (B.startle) {
        var sk2 = (t - B.startle.t0) / B.startle.dur;
        if (sk2 >= 1) B.startle = null;
        else {
          if (L.state === 2) { L.state = 3; L.at = t; L.from = [px, py, pz]; }
          py += Math.sin(sk2 * Math.PI * 3) * 0.42 * (1 - sk2);
          px += Math.sin(t * 9 + B.ph) * 0.06 * (1 - sk2);
          flapAmp = 0.75;
        }
      }
      var dx2 = px - B.g.position.x, dz2 = pz - B.g.position.z;
      if (Math.abs(dx2) + Math.abs(dz2) > 0.0001) B.g.rotation.y = Math.atan2(dx2, dz2);
      B.g.rotation.z = Math.sin(a) * 0.3;
      B.g.position.set(px, py, pz);
      var flap = Math.sin(t * B.flap) * flapAmp;
      B.g.userData.wings[0].rotation.z = 0.24 + flap;
      B.g.userData.wings[1].rotation.z = -0.24 - flap;
      /* fade bướm khi chiếu đè lên rail/panel (cờ uiHide từ interval sau-render) */
      var hidE = B.g.userData.uiHide === true;
      var dfE = B.g.userData.distFade; if (dfE === undefined) dfE = 1;
      var uiT = (hidE ? 0.25 : 1) * dfE;
      var ktF = Math.min(1, dtRaw * 5);
      for (var ci2 = 0; ci2 < B.g.children.length; ci2++) {
        var ch2 = B.g.children[ci2], mm2 = ch2.material;
        if (!mm2 && ch2.children[0]) mm2 = ch2.children[0].material;
        if (mm2 && mm2.transparent) {
          if (mm2.__base === undefined) mm2.__base = mm2.opacity;
          mm2.opacity += (mm2.__base * uiT - mm2.opacity) * ktF;
        }
      }
    }

    /* ong mật (ảnh thật) bâu quanh hoa (đêm ẩn — ong về tổ) */
    for (var bee2 = 0; bee2 < bees.length; bee2++) {
      var EB = bees[bee2];
      var eu = EB.userData;
      if (nightG) { EB.visible = false; continue; }
      EB.visible = true;
      /* VẬT LÝ ONG THẬT: đậu lượn (hover) gần như đứng yên, rồi phóng nhanh sang hoa khác (dart).
         Mỗi đoạn nội suy bằng easing — dù fps tụt thấp vẫn đọc đúng nhịp, không giật hướng. */
      if (eu.st === undefined) {
        eu.st = 0; eu.tA = t + rand(0, 1.2); eu.dur = rand(0.55, 1.35);
        eu.hx = eu.cx; eu.hy = eu.cy; eu.hz = eu.cz;
        eu.px = eu.cx; eu.py = eu.cy; eu.pz = eu.cz;
      }
      if (eu.st === 0) {
        /* hover: trôi vi kan quanh điểm đậu — biên 2cm, tần thấp */
        var hw2 = t - eu.tA;
        EB.position.set(
          eu.hx + Math.sin(t * 1.6 + eu.ph) * 0.02 + Math.sin(t * 13.7 + eu.ph) * 0.008,
          eu.hy + Math.sin(t * 2.1 + eu.ph * 2) * 0.015 + Math.sin(t * 17.3 + eu.ph * 2) * 0.005,
          eu.hz + Math.cos(t * 1.3 + eu.ph) * 0.018 + Math.cos(t * 11.9 + eu.ph) * 0.007
        );
        if (hw2 > eu.dur) {
          eu.st = 1; eu.tA = t;
          eu.px = EB.position.x; eu.py = EB.position.y; eu.pz = EB.position.z;
          /* chỉ phóng NGẮN: 60% sang anchor gần (0.4–2.2u), 40% điểm cách 0.45–1.0u — cap tốc ~2.2u/s như ong thật */
          var ok2 = false;
          if (Math.random() < 0.6) {
            var cds2 = [];
            for (var ai2 = 0; ai2 < eu.anchors.length; ai2++) {
              var A2 = eu.anchors[ai2];
              var dd2 = Math.hypot(A2[0] - eu.px, A2[1] - eu.py, A2[2] - eu.pz);
              if (dd2 > 0.4 && dd2 < 2.2) cds2.push(A2);
            }
            if (cds2.length) {
              var B2 = cds2[(Math.random() * cds2.length) | 0];
              eu.tx2 = B2[0] + rand(-0.15, 0.15);
              eu.ty2 = Math.min(3.2, Math.max(0.8, B2[1] + rand(0.05, 0.3)));
              eu.tz2 = B2[2] + rand(-0.15, 0.15);
              ok2 = true;
            }
          }
          if (!ok2) {
            var ag2 = rand(0, 6.283), rr2 = rand(0.45, 1.0);
            eu.tx2 = eu.px + Math.sin(ag2) * rr2;
            eu.ty2 = Math.min(3.2, Math.max(0.8, eu.py + rand(-0.12, 0.25)));
            eu.tz2 = eu.pz + Math.cos(ag2) * rr2;
          }
          var dd3 = Math.hypot(eu.tx2 - eu.px, eu.ty2 - eu.py, eu.tz2 - eu.pz);
          eu.dur = Math.min(1.0, Math.max(0.42, dd3 / 2.2));
        }
      } else {
        /* dart: easeInOutSine từ điểm hiện tại sang hoa kế — vút lên nhẹ theo cung */
        var dk2 = Math.min(1, (t - eu.tA) / eu.dur);
        var de2 = easeInOutSine(dk2);
        EB.position.set(
          eu.px + (eu.tx2 - eu.px) * de2,
          eu.py + (eu.ty2 - eu.py) * de2 + Math.sin(de2 * Math.PI) * 0.06,
          eu.pz + (eu.tz2 - eu.pz) * de2
        );
        if (dk2 >= 1) { eu.st = 0; eu.tA = t; eu.dur = rand(0.55, 1.4); eu.hx = eu.tx2; eu.hy = eu.ty2; eu.hz = eu.tz2; }
      }
      /* billboard: mặt ong luôn hướng màn hình; nghiêng theo hướng phóng khi dart */
      EB.quaternion.copy(camera.quaternion);
      EB.rotateZ(eu.st === 1 ? Math.max(-0.2, Math.min(0.2, (eu.tx2 - eu.px) * -0.5)) * Math.sin(Math.min(1, (t - eu.tA) / eu.dur) * Math.PI) : Math.sin(t * 2.2 + eu.ph) * 0.05);
      /* vỗ cánh: warp vertex vùng cánh trong ảnh — thân giữ nguyên, không tách rời */
      var posB = EB.geometry.attributes.position, baseB = eu.base;
      var flB = Math.sin(t * 22 + eu.ph) * 0.62 + Math.sin(t * 35.3 + eu.ph * 1.7) * 0.38;
      for (var bi4 = 0; bi4 < posB.count; bi4++) {
        var bx4 = baseB[bi4 * 3], by4 = baseB[bi4 * 3 + 1];
        var u4 = bx4 / eu.bw + 0.5, v4 = by4 / eu.bh + 0.5;
        if (v4 > 0.34 && Math.abs(u4 - 0.5) > 0.155) {
          var k4 = (Math.abs(u4 - 0.5) - 0.155) / 0.345;
          posB.array[bi4 * 3 + 1] = by4 - flB * k4 * 0.055;
          posB.array[bi4 * 3] = bx4 - flB * k4 * k4 * 0.018;
        } else {
          posB.array[bi4 * 3 + 1] = by4;
        }
      }
      posB.needsUpdate = true;
      /* fade UI + khoảng cách (cờ từ interval sau-render) */
      var hidB = eu.uiHide === true;
      var dfB = eu.distFade; if (dfB === undefined) dfB = 1;
      var tgtB = (hidB ? 0.25 : 1) * dfB;
      EB.material.opacity += (tgtB - EB.material.opacity) * Math.min(1, dtRaw * 5);
    }

    /* mây trôi */
    for (var cl2 = 0; cl2 < clouds.length; cl2++) {
      var cw = clouds[cl2];
      cw.position.x += cw.userData.vx * dt * motion;
      if (cw.position.x > 12) cw.position.x = -12;
    }

    /* vụ nổ + chớp */
    for (var bj3 = 0; bj3 < BURST_N; bj3++) {
      var b = bits[bj3];
      if (!b.alive) continue;
      b.vel.y -= 2.7 * dt;
      b.vel.multiplyScalar(1 - 0.4 * dt);
      b.pos.addScaledVector(b.vel, dt);
      b.rot.x += b.rv.x * dt; b.rot.y += b.rv.y * dt; b.rot.z += b.rv.z * dt;
      b.life -= dt / 1.5;
      if (b.life <= 0) { b.alive = false; hideBit(bj3); continue; }
      dummy.position.copy(b.pos);
      dummy.rotation.copy(b.rot);
      dummy.scale.setScalar(b.scale * Math.max(0.001, Math.pow(b.life, 0.6)));
      dummy.updateMatrix();
      burstMesh.setMatrixAt(bj3, dummy.matrix);
    }
    burstMesh.instanceMatrix.needsUpdate = true;
    if (flashT >= 0) {
      flashT += dt;
      var fk = flashT / 0.38;
      if (fk >= 1) { flashT = -1; flashSpr.material.opacity = 0; }
      else {
        flashSpr.material.opacity = 0.75 * (1 - fk);
        var fs = 0.6 + 2.0 * easeOutCubic(fk);
        flashSpr.scale.set(fs, fs, 1);
      }
    }

    /* xoay quán tính + camera */
    if (!dragging) {
      gardenRoot.rotation.y += velY;
      velY *= 0.94;
    }
    /* sway mượt kiểu game: pointer được lerp dần thay vì bắt theo tức thời */
    smx += (mx - smx) * Math.min(1, dtRaw * 4.2);
    smy += (my - smy) * Math.min(1, dtRaw * 4.2);
    var camX = CAM.x + smx * 0.5;
    var camY = THREE.MathUtils.lerp(1.4, CAM.y, intro) - smy * 0.3;
    var camZ = THREE.MathUtils.lerp(10.4, CAM.z, intro);
    camera.position.set(camX, camY, camZ);
    camera.lookAt(
      THREE.MathUtils.lerp(0, TARGET.x, intro) + smx * 0.12,
      THREE.MathUtils.lerp(1.0, TARGET.y, intro) - smy * 0.08,
      TARGET.z
    );

    if (window.__chunkTick) window.__chunkTick();
    /* cò quá sát ống kính thì ẩn — tính SAU khi camera chốt vị trí, hết flash chim khổng lồ */
    for (var edv = 0; edv < egrets.length; edv++) {
      tmpV.copy(egrets[edv].position);
      gardenRoot.localToWorld(tmpV);
      var dEk = tmpV.distanceTo(camera.position);
      var mEk = dEk < 8 ? 0 : dEk > 12 ? 1 : (dEk - 8) / 4;
      egrets[edv].traverse(function(o){ if (o.material) o.material.opacity *= mEk; });
      egrets[edv].visible = !nightG && dEk > 9;
    }
    /* bướm đâm sệt ống kính cũng ẩn — hết vệt trắng/cánh chói toàn màn */
    for (var bfv = 0; bfv < butterflies.length; bfv++) {
      butterflies[bfv].g.getWorldPosition(tmpV);
      butterflies[bfv].g.visible = !nightG && tmpV.distanceTo(camera.position) > 2.8;
    }
    /* hoa chính đâm sát lens (khi xoay garden cụm hoa quét qua camera) thì ẩn — nhìn xuyên chứ không bị cành chặn màn */
    var lowPlantDetail = isMobile || LOW;
    for (var pv2 = 0; pv2 < plants.length; pv2++) {
      var plv = plants[pv2];
      if (lowPlantDetail && !plv._liteDecor) {
        plv._liteDecor = true;
        for (var stl = 0; stl < plv.stamens.length; stl++) plv.stamens[stl].mesh.visible = false;
      }
      plv.head.getWorldPosition(tmpV);
      var plantDist = tmpV.distanceTo(camera.position);
      var hideP = plantDist < 0.95 || plantDist > (lowPlantDetail ? 12 : 26);
      if (plv._hidden !== hideP) { plv.group.visible = !hideP; plv._hidden = hideP; }
    }

    renderer.render(scene, camera);
    if (removeSplashWhenDrawn) {
      if (removeSplashWhenDrawn.parentNode) removeSplashWhenDrawn.parentNode.removeChild(removeSplashWhenDrawn);
      removeSplashWhenDrawn = null;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* hook tua thời gian + đặt camera (debug/chụp ảnh headless) */
  window.__ff = function (sec) { elapsed += sec || 6; };
  window.__cam = function (px, py, pz, tx, ty, tz) {
    CAM.set(px, py, pz);
    TARGET.set(tx, ty, tz);
  };
  window.__butterfly = function (i) {
    var p = butterflies[i].g.position;
    var w = gardenRoot.localToWorld(p.clone());
    return [w.x, w.y, w.z];
  };
  window.__garden = gardenRoot;
  if (window.__initNPCs) window.__initNPCs(gardenRoot);

  /* ---- âm ambient tổng hợp: gió + vo ve + chim xa — WebAudio thuần, không file ---- */
  (function buildAmbience() {
    if (reduced) return;
    var ctx = null, master = null, muted = false;
    try { muted = localStorage.getItem('amb') === 'off'; } catch (eL1) {}
    function start() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(function () {}); return; }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { ctx = new AC(); } catch (eA1) { return; }
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      master.gain.linearRampToValueAtTime(muted ? 0 : 0.85, ctx.currentTime + 2.4);
      /* gió: noise loop -> lowpass dao động chậm */
      var ln2 = 2 * ctx.sampleRate, bf2 = ctx.createBuffer(1, ln2, ctx.sampleRate), d2 = bf2.getChannelData(0);
      for (var wi = 0; wi < ln2; wi++) d2[wi] = Math.random() * 2 - 1;
      var ns = ctx.createBufferSource(); ns.buffer = bf2; ns.loop = true;
      var lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 380; lp2.Q.value = 0.6;
      var lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.13;
      var lg2 = ctx.createGain(); lg2.gain.value = 150;
      lfo2.connect(lg2); lg2.connect(lp2.frequency); lfo2.start();
      var wg2 = ctx.createGain(); wg2.gain.value = 0.07;
      ns.connect(lp2); lp2.connect(wg2); wg2.connect(master); ns.start();
      /* vo ve: osc trầm + tremolo nhịp cánh */
      var o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 112;
      var lp3 = ctx.createBiquadFilter(); lp3.type = 'lowpass'; lp3.frequency.value = 240;
      var bg2 = ctx.createGain(); bg2.gain.value = 0.011;
      var tr2 = ctx.createOscillator(); tr2.frequency.value = 23;
      var tg2 = ctx.createGain(); tg2.gain.value = 0.005;
      tr2.connect(tg2); tg2.connect(bg2.gain); tr2.start();
      o1.connect(lp3); lp3.connect(bg2); bg2.connect(master); o1.start();
      /* chim xa: chirp hai ba nốt cao tần ngẫu nhiên */
      function chirp() {
        if (!ctx || muted) { setTimeout(chirp, 8000); return; }
        var t0 = ctx.currentTime, n2 = 2 + ((Math.random() * 2) | 0);
        for (var ci = 0; ci < n2; ci++) {
          var o2 = ctx.createOscillator(), g2 = ctx.createGain();
          o2.type = 'sine';
          var f2 = 2400 + Math.random() * 900;
          var ts = t0 + ci * 0.11 + Math.random() * 0.03;
          o2.frequency.setValueAtTime(f2, ts);
          o2.frequency.exponentialRampToValueAtTime(f2 * 0.72, ts + 0.07);
          g2.gain.setValueAtTime(0.0001, ts);
          g2.gain.exponentialRampToValueAtTime(0.028, ts + 0.02);
          g2.gain.exponentialRampToValueAtTime(0.0001, ts + 0.09);
          o2.connect(g2); g2.connect(master);
          o2.start(ts); o2.stop(ts + 0.1);
        }
        setTimeout(chirp, 6000 + Math.random() * 9000);
      }
      window.__sfx = {
        chime: function () {
          if (!ctx || muted) return;
          [1318, 1760].forEach(function (f3, i3) {
            var o5 = ctx.createOscillator(), g5 = ctx.createGain();
            o5.type = 'sine'; o5.frequency.value = f3;
            var ts5 = ctx.currentTime + i3 * 0.05;
            g5.gain.setValueAtTime(0.0001, ts5);
            g5.gain.exponentialRampToValueAtTime(0.05, ts5 + 0.02);
            g5.gain.exponentialRampToValueAtTime(0.0001, ts5 + 0.14);
            o5.connect(g5); g5.connect(master);
            o5.start(ts5); o5.stop(ts5 + 0.16);
          });
        },
        buzz: function () {
          if (!ctx || muted) return;
          var o6 = ctx.createOscillator(), g6 = ctx.createGain(), f6 = ctx.createBiquadFilter();
          o6.type = 'sawtooth';
          o6.frequency.setValueAtTime(150, ctx.currentTime);
          o6.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.16);
          f6.type = 'lowpass'; f6.frequency.value = 900;
          g6.gain.setValueAtTime(0.0001, ctx.currentTime);
          g6.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.03);
          g6.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
          o6.connect(f6); f6.connect(g6); g6.connect(master);
          o6.start(); o6.stop(ctx.currentTime + 0.25);
        },
        whoosh: function () {
          if (!ctx || muted) return;
          var s6 = ctx.createBufferSource(); s6.buffer = bf2;
          var f7 = ctx.createBiquadFilter(); f7.type = 'bandpass'; f7.Q.value = 1.1;
          f7.frequency.setValueAtTime(520, ctx.currentTime);
          f7.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.34);
          var g7 = ctx.createGain();
          g7.gain.setValueAtTime(0.0001, ctx.currentTime);
          g7.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.05);
          g7.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
          s6.connect(f7); f7.connect(g7); g7.connect(master);
          s6.start(); s6.stop(ctx.currentTime + 0.45);
        }
      };
      setTimeout(chirp, 3200);
      window.__amb = { started: true, isMuted: function () { return muted; } };
    }
    window.addEventListener('pointerdown', start, { passive: true });
    window.addEventListener('keydown', start);
    /* nút bật/tắt góc trái dưới */
    var btn = document.createElement('button');
    btn.textContent = muted ? '♪ tắt' : '♪ bật';
    btn.setAttribute('aria-label', 'Bật tắt âm thanh vườn');
    btn.style.cssText = 'position:fixed;left:18px;bottom:18px;z-index:40;background:rgba(255,252,246,.72);border:1px solid rgba(122,90,52,.25);border-radius:999px;padding:6px 14px;font:600 12px/1.2 Georgia,serif;color:#6d5433;cursor:pointer;backdrop-filter:blur(6px)';
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      muted = !muted;
      try { localStorage.setItem('amb', muted ? 'off' : 'on'); } catch (eL2) {}
      btn.textContent = muted ? '♪ tắt' : '♪ bật';
      start();
      if (ctx && master) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(muted ? 0 : 0.85, ctx.currentTime + 0.6);
      }
    });
    document.body.appendChild(btn);
  })();

  /* ---- hoa dại dạng thật: 4 cánh trắng + đĩa nhuỵ vàng (thay khối sphere) ---- */
  var wfPetalGeoC = new THREE.PlaneGeometry(1, 1.32, 1, 3);
  (function () {
    var pp = wfPetalGeoC.attributes.position;
    for (var pi = 0; pi < pp.count; pi++) {
      var ty = pp.getY(pi) / 0.66;
      pp.setX(pi, pp.getX(pi) * (0.62 + 0.38 * Math.sin((1 - ty) * 3.14)));
      pp.setZ(pi, Math.sin((1 - ty) * 2.6) * 0.16);
    }
    wfPetalGeoC.computeVertexNormals();
  })();
  var wfPetalMatsC = ['#fdf6ec', '#f7e3cf', '#f3d9c4'].map(function (cc) {
    return new THREE.MeshStandardMaterial({ color: cc, roughness: 0.5, side: THREE.DoubleSide, map: petalTex || petalSkinTex, bumpMap: petalSkinTex, bumpScale: 0.05 });
  });
  var wfDiscGeoC = new THREE.CircleGeometry(1, 10);
  var wfDiscMatC = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, map: (function () {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d');
    g.fillStyle = '#e2ab3f'; g.beginPath(); g.arc(32, 32, 31, 0, 6.283); g.fill();
    for (var i = 0; i < 26; i++) {
      var a = i / 26 * 6.283, rr = 8 + (i % 3) * 7;
      g.fillStyle = i % 2 ? '#b97f22' : '#f6d98a';
      g.beginPath(); g.arc(32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr, 3.1, 0, 6.283); g.fill();
    }
    g.fillStyle = '#8a5c16'; g.beginPath(); g.arc(32, 32, 5.5, 0, 6.283); g.fill();
    var t = new THREE.CanvasTexture(c); return t;
  })() });

  /* ---- HỒ NƯỚC + CÁ KOI (ảnh thật) + BÔNG LAU + ĐÁ ĐEN + NHÀ GỖ ---- */
  function lakeDepth(x, z) {
    if (!window.__lakeInfo) return 0; /* LAKE khai báo muộn hơn hillY — lazy an toàn */
    var dx = (x - LAKE.x) / LAKE.rx, dz = (z - LAKE.z) / LAKE.rz;
    var d2 = dx * dx + dz * dz;
    return d2 < 1 ? Math.min(1, (1 - d2) * 1.25) : 0;
  }
  function lakeGroundLocalY(x,z) {
    return hillY(x, z);
  }
  var lakeBaseY = 0; window.__lakeWaterY = function(){return lakeBaseY-0.35+(window.__waterOffset||0);};
  (function () {
    var ly = lakeBaseY = lakeGroundLocalY(LAKE.x, LAKE.z) + LAKE_DEPTH;
    var baseW = new THREE.Mesh(new THREE.CircleGeometry(1.28, 40), new THREE.MeshStandardMaterial({ color: 0x2e3a30, roughness: 1 }));
    baseW.rotation.x = -Math.PI / 2;
    baseW.scale.set(LAKE.rx, LAKE.rz, 1);
    baseW.position.set(LAKE.x, lakeGroundLocalY(LAKE.x, LAKE.z) - 0.05, LAKE.z);
    gardenRoot.add(baseW);
    /* A recessed basin, smaller waterline, and a broad earthy bank make the shoreline legible. */
    var bankW = new THREE.Mesh(new THREE.RingGeometry(0.90, 1.00, 80), new THREE.MeshStandardMaterial({ color: 0x88764e, roughness: 0.98, side: THREE.DoubleSide }));
    bankW.rotation.x = -Math.PI / 2; bankW.scale.set(LAKE.rx, LAKE.rz, 1);
    bankW.position.set(LAKE.x, ly - 0.40, LAKE.z); gardenRoot.add(bankW);
    var waterGeoW = new THREE.CircleGeometry(1, 80);
    var surfW = new THREE.Mesh(waterGeoW, new THREE.MeshPhysicalMaterial({ color: 0x1d7a8c, roughness: 0.07, metalness: 0.05, clearcoat: 0.45, clearcoatRoughness: 0.3, emissive: 0x06222e, emissiveIntensity: 0.25, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
    surfW.rotation.x = -Math.PI / 2;
    surfW.scale.set(LAKE.rx * 0.86, LAKE.rz * 0.86, 1);
    surfW.position.set(LAKE.x, ly - 0.35, LAKE.z);
    gardenRoot.add(surfW);
    var shoreW = new THREE.Mesh(new THREE.TorusGeometry(1,0.045,9,80),new THREE.MeshStandardMaterial({color:0xc1ad78,roughness:0.88}));
    shoreW.rotation.x=-Math.PI/2; shoreW.scale.set(LAKE.rx*0.88,LAKE.rz*0.88,1); shoreW.position.set(LAKE.x,ly-0.335,LAKE.z); gardenRoot.add(shoreW);
    window.__lakeSurf = surfW; window.__lakeShore = shoreW; window.__lakeBank = bankW;
    /* gợn sáng lăn tăn: 26 hạt trắng mỏng trôi trên mặt hồ */
    var rippleGeoW = new THREE.TorusGeometry(0.12, 0.008, 5, 24);
    var rippleMatW = new THREE.MeshBasicMaterial({ color: 0xcfe4e8, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
    var ripples = [];
    for (var ri = 0; ri < 26; ri++) {
      var rm = new THREE.Mesh(rippleGeoW, rippleMatW);
      rm.rotation.x = -Math.PI / 2; rm.scale.set(1, 0.72, 1);
      var aR = Math.random() * 6.283, rR = Math.sqrt(Math.random()) * 0.78;
      rm.position.set(LAKE.x + Math.cos(aR) * LAKE.rx * 0.86 * rR, ly - 0.32, LAKE.z + Math.sin(aR) * LAKE.rz * 0.86 * rR);
      rm.rotation.z = Math.random() * 6.283;
      gardenRoot.add(rm);
      ripples.push({ m: rm, ph: Math.random() * 6.283, sp: 0.4 + Math.random() * 0.7 });
    }
    window.__lakeRipples = ripples;
    /* cá koi GLB có rig thật: 5 con lượn dưới mặt nước */
    var kois = [];
    var koiLoader = new THREE.GLTFLoader();
    function spawnRiggedKoi(index) {
      var isGold = index % 2 === 1;
      var koiSrc = isGold ? '__OGON_KOI_B64__' : '__KOHAKU_KOI_B64__';
      var koiBytes = /^models\/|^https?:\/\//.test(koiSrc) ? null : Uint8Array.from(atob(koiSrc), function (c) { return c.charCodeAt(0); });
      var holder = new THREE.Group();
      gardenRoot.add(holder);
      var ka0 = Math.random() * 6.283;
      var item = { m: holder, a: ka0, rx: LAKE.rx * (0.25 + Math.random() * 0.55), rz: LAKE.rz * (0.25 + Math.random() * 0.55), sp: 0.14 + Math.random() * 0.16, ph: Math.random() * 6.283, sway: 0, mixer: null, depth: 1.0 + Math.random() * 1.8 };
      kois.push(item);
      function koiReady(gltf) {
        var model = gltf.scene;
        model.scale.setScalar(1.15 + Math.random() * 0.35);
        model.traverse(function (o) { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
        holder.add(model);
        if (gltf.animations && gltf.animations.length) {
          var mixer = new THREE.AnimationMixer(model);
          mixer.clipAction(gltf.animations[0]).play();
          item.mixer = mixer;
        }
      }
      if (koiBytes) {
        koiLoader.parse(koiBytes.buffer, '', koiReady, function (error) { console.warn('Koi GLB failed', error); });
      } else {
        koiLoader.load(koiSrc, koiReady, undefined, function (error) { console.warn('Koi GLB failed', error); });
      }
    }
    for (var ki = 0; ki < 5; ki++) spawnRiggedKoi(ki);
    /* súng: lá tròn nổi + 2 bông nhỏ */
    var lilies = [];
    var lilyGeoW = new THREE.CircleGeometry(0.3, 14);
    var lilyMatW = new THREE.MeshStandardMaterial({ color: 0x4d7c44, roughness: 0.6, side: THREE.DoubleSide });
    for (var li2 = 0; li2 < 8; li2++) {
      var lm2 = new THREE.Mesh(lilyGeoW, lilyMatW);
      lm2.rotation.x = -Math.PI / 2;
      var la2 = Math.random() * 6.283, lr2 = 0.3 + Math.random() * 0.62;
      lm2.position.set(LAKE.x + Math.cos(la2) * LAKE.rx * lr2, ly - 0.31, LAKE.z + Math.sin(la2) * LAKE.rz * lr2);
      lm2.scale.setScalar(0.7 + Math.random() * 0.6);
      gardenRoot.add(lm2);
      lilies.push({ m: lm2, ph: Math.random() * 6.283, y0: lm2.position.y });
    }
    for (var lf2 = 0; lf2 < 2; lf2++) {
      var lb2 = lilies[lf2 * 3].m;
      var fl2 = new THREE.Mesh(wfDiscGeoC, new THREE.MeshStandardMaterial({ color: 0xf7ecdc, roughness: 0.5 }));
      fl2.scale.setScalar(0.075);
      fl2.position.set(lb2.position.x, lb2.position.y + 0.03, lb2.position.z);
      gardenRoot.add(fl2);
    }
    /* sậy bờ hồ: thân mảnh + bông nâu */
    var reedStemGeoW = new THREE.CylinderGeometry(0.012, 0.02, 0.9, 5);
    var reedStemMatW = new THREE.MeshLambertMaterial({ color: 0x7a8a52 });
    var reedTipGeoW = new THREE.CylinderGeometry(0.028, 0.034, 0.16, 6);
    var reedTipMatW = new THREE.MeshLambertMaterial({ color: 0x6b4f33 });
    for (var rc2 = 0; rc2 < 14; rc2++) {
      var ra2 = (rc2 / 14) * 6.283 + Math.random() * 0.3;
      var rrX = LAKE.x + Math.cos(ra2) * (LAKE.rx + 0.3 + Math.random() * 0.7);
      var rrZ = LAKE.z + Math.sin(ra2) * (LAKE.rz + 0.3 + Math.random() * 0.7);
      var ry2 = lakeGroundLocalY(rrX, rrZ);
      var rStem = new THREE.Mesh(reedStemGeoW, reedStemMatW);
      rStem.position.set(rrX, ry2 + 0.45, rrZ);
      rStem.rotation.z = (Math.random() - 0.5) * 0.16;
      gardenRoot.add(rStem);
      var rTip = new THREE.Mesh(reedTipGeoW, reedTipMatW);
      rTip.position.set(rrX + rStem.rotation.z * -0.12, ry2 + 0.92, rrZ);
      gardenRoot.add(rTip);
    }
    /* đàn cá nhỏ silhouette: 6 con bơi theo đàn dưới mặt nước */
    var smallFishTexW = (function () {
      var c2 = document.createElement('canvas'); c2.width = 16; c2.height = 32;
      var x2 = c2.getContext('2d');
      x2.fillStyle = 'rgba(40,62,72,0.95)';
      x2.beginPath(); x2.ellipse(8, 9, 4.4, 7.5, 0, 0, 6.283); x2.fill();
      x2.beginPath(); x2.moveTo(8, 15); x2.lineTo(3.5, 24); x2.lineTo(12.5, 24); x2.closePath(); x2.fill();
      return new THREE.CanvasTexture(c2);
    })();
    var smallFishMatW = new THREE.MeshBasicMaterial({ map: smallFishTexW, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    var smallFish = [];
    for (var sf2 = 0; sf2 < 18; sf2++) {
      var sfm = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.22), smallFishMatW);
      sfm.rotation.x = -Math.PI / 2;
      sfm.position.set(LAKE.x, ly + 0.99, LAKE.z);
      gardenRoot.add(sfm);
      smallFish.push({ m: sfm, off: sf2 * 0.7, r2: 1.1 + (sf2 % 3) * 0.35, sp: 0.5 + sf2 * 0.05, depth: (sf2 % 5) * 0.48 });
    }
    window.__lakeLilies = lilies;
    window.__lakeFishSmall = smallFish;
    window.__kois = kois;
  })();
  var updateUnderwater = window.__createUnderwaterWorld({ gardenRoot: gardenRoot, LAKE: LAKE, LAKE_DEPTH: LAKE_DEPTH, hillY: hillY, LOW: LOW, lakeBaseY: lakeBaseY });

  var kois = window.__kois || [];
  var ripples = window.__lakeRipples || [];
  var lilies = window.__lakeLilies || [];
  var smallFish = window.__lakeFishSmall || [];
  function updateLakeDress(dt) {
    for (var i = 0; i < lilies.length; i++) {
      var L2 = lilies[i];
      L2.ph += dt * 0.8;
      L2.m.position.y = L2.y0 + Math.sin(L2.ph) * 0.012;
      L2.m.rotation.z += dt * 0.05;
    }
    for (var j = 0; j < smallFish.length; j++) {
      var F2 = smallFish[j];
      var a2 = elapsed * F2.sp + F2.off;
      var fx2 = LAKE.x + Math.cos(a2) * F2.r2, fz2 = LAKE.z + Math.sin(a2) * F2.r2 * 0.8;
      var pxL = F2.m.position.x, pzL = F2.m.position.z;
      F2.m.position.x = fx2; F2.m.position.z = fz2;
      F2.m.position.y = lakeBaseY + 0.95 - F2.depth + Math.sin(elapsed * 0.9 + F2.off) * 0.08;
      F2.m.rotation.z = Math.atan2(fx2 - pxL, fz2 - pzL);
    }
    for (var j2 = 0; j2 < bigFish.length; j2++) {
      var BF = bigFish[j2], u6 = BF.userData;
      var a6 = elapsed * u6.sp + u6.off;
      var fx6 = LAKE.x + Math.cos(a6) * u6.r2, fz6 = LAKE.z + Math.sin(a6) * u6.r2 * 0.8;
      var pvx = BF.position.x, pvz = BF.position.z;
      BF.position.set(fx6, lakeBaseY + 0.99, fz6);
      BF.rotation.z = Math.atan2(fx6 - pvx, fz6 - pvz);
    }
  }
  var bigFish = [];
  (function () {
    var bfC = document.createElement('canvas'); bfC.width = 24; bfC.height = 48;
    var bfx = bfC.getContext('2d');
    bfx.fillStyle = '#4a5a3c';
    bfx.beginPath(); bfx.ellipse(12, 18, 8, 14, 0, 0, 6.283); bfx.fill();
    bfx.beginPath(); bfx.moveTo(12, 30); bfx.lineTo(4, 44); bfx.lineTo(12, 40); bfx.lineTo(20, 44); bfx.closePath(); bfx.fill();
    bfx.beginPath(); bfx.ellipse(12, 6, 5, 5, 0, 0, 6.283); bfx.fill();
    var bfTex = new THREE.CanvasTexture(bfC);
    for (var fi6 = 0; fi6 < 2; fi6++) {
      var fm6 = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.44), new THREE.MeshBasicMaterial({ map: bfTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, depthWrite: false, color: 0x9aa88a }));
      fm6.userData = { r2: 1.9 + fi6 * 1.0, sp: 0.4 + fi6 * 0.16, off: fi6 * 2.4 };
      fm6.rotation.x = -Math.PI / 2;
      gardenRoot.add(fm6);
      bigFish.push(fm6);
    }
  })();
  function updateKoi(dt) {
    for (var i = 0; i < kois.length; i++) {
      var k = kois[i];
      k.a += k.sp * dt;
      var px = LAKE.x + Math.cos(k.a) * k.rx + Math.sin(elapsed * 0.7 + k.ph) * 0.3;
      var pz = LAKE.z + Math.sin(k.a) * k.rz + Math.cos(elapsed * 0.5 + k.ph) * 0.25;
      var prevX = k.m.position.x, prevZ = k.m.position.z;
      k.sway += dt;
      if (k.mixer) k.mixer.update(dt);
      k.m.position.set(px, lakeBaseY - k.depth + Math.sin(elapsed * 1.4 + k.ph) * 0.06, pz);
      var headX = px - prevX, headZ = pz - prevZ;
      if (Math.abs(headX) + Math.abs(headZ) > 0.0001) k.m.rotation.y = -Math.atan2(headZ, headX);
    }
  }
  function updateLakeFx(dt) {
    for (var i = 0; i < ripples.length; i++) {
      var r = ripples[i];
      r.ph += dt * r.sp;
      r.m.material.opacity = 0.08 + 0.22 * (0.5 + 0.5 * Math.sin(r.ph * 2.2));
      r.m.scale.x = 0.8 + 0.5 * Math.sin(r.ph * 1.4 + 2);
    }
    var dF2 = window.__dayF === undefined ? 1 : window.__dayF;
    if (window.__cabinWin) window.__cabinWin.emissiveIntensity = 0.15 + (1 - dF2) * 1.35;
    if (window.__lakeSurf) window.__lakeSurf.material.color.setHSL(0.52, 0.62, 0.16 + 0.08 * dF2);
  }

  /* ---- BÔNG LAU (cottonweed): cụm bông trắng để gió thổi — chỉ spawn gần hang/xa sân ---- */
  var cottons = [];
  window.__cottons = cottons;
  var windDirX = 0.8, windDirZ = 0.35;
  var cottonMatC = new THREE.MeshLambertMaterial({ color: 0xf3ede2, emissive: 0x8a8378, emissiveIntensity: 0.22, transparent: true, opacity: 0.96 });
  var cottonStemMatC = new THREE.MeshLambertMaterial({ color: 0x9c8a72 });
  var cottonStemGeoC = new THREE.CylinderGeometry(0.006, 0.01, 1, 5);
  var cottonGeoC = new THREE.SphereGeometry(1, 8, 7);
  function updateCotton(dt) {
    for (var i = 0; i < cottons.length; i++) {
      var cb = cottons[i];
      if (!cb.free) {
        cb.ph += dt * (0.8 + cb.sp * 0.6);
        cb.m.rotation.z = Math.sin(cb.ph) * 0.3 + windDirX * 0.5;
        cb.m.rotation.x = Math.sin(cb.ph * 0.8) * 0.14;
        cb.m.position.y = cb.baseY + Math.sin(cb.ph * 1.3) * 0.012;
        if (elapsed > cb.ready && Math.random() < dt * 0.06) {
          cb.free = true;
          cb.vx = windDirX * (0.28 + Math.random() * 0.25);
          cb.vz = windDirZ * (0.28 + Math.random() * 0.25) + (Math.random() - 0.5) * 0.12;
          cb.vy = 0.12 + Math.random() * 0.1;
        }
      } else {
        cb.vx += (windDirX * 0.1 - cb.vx) * dt * 0.5;
        cb.vz += (windDirZ * 0.1 - cb.vz) * dt * 0.5;
        cb.vy += Math.sin(cb.ph += dt * 3.4) * 0.02 * dt * 8;
        cb.m.position.x += cb.vx * dt;
        cb.m.position.y += cb.vy * dt;
        cb.m.position.z += cb.vz * dt;
        cb.m.rotation.y += dt * 1.7;
        cb.life -= dt;
        var op = Math.max(0, Math.min(1, cb.life / 2));
        cb.m.material.opacity = op;
        if (cb.life <= 0 || cb.m.position.y > 7) { gardenRoot.remove(cb.m); cottons.splice(i, 1); i--; }
      }
    }
  }

  /* ---- ĐOM ĐÓM: hình côn trùng nhỏ có đầu, râu, cánh và đốt bụng phát sáng ---- */
  var fireflies=[];
  (function(){
    var dark=new THREE.MeshStandardMaterial({color:0x33251a,roughness:.86}), wingMat=new THREE.MeshBasicMaterial({color:0xc5d8bf,transparent:true,opacity:.48,side:THREE.DoubleSide,depthWrite:false}), glowMat=new THREE.MeshBasicMaterial({color:0xd6ff77,toneMapped:false,transparent:true,opacity:.9,depthWrite:false});
    var bodyG=new THREE.SphereGeometry(1,10,7), wingG=new THREE.SphereGeometry(1,8,5);
    var glowC=document.createElement('canvas');glowC.width=glowC.height=64;var gx=glowC.getContext('2d'),gr=gx.createRadialGradient(32,32,1,32,32,31);gr.addColorStop(0,'rgba(255,255,218,.9)');gr.addColorStop(.2,'rgba(224,255,112,.62)');gr.addColorStop(.55,'rgba(190,239,85,.2)');gr.addColorStop(1,'rgba(160,220,70,0)');gx.fillStyle=gr;gx.fillRect(0,0,64,64);var glowTexFF=new THREE.CanvasTexture(glowC);
    for(var fi=0;fi<18;fi++){
      var fm=new THREE.Group(), thor=new THREE.Mesh(bodyG,dark), head=new THREE.Mesh(new THREE.SphereGeometry(.72,8,6),dark), abdomen=new THREE.Mesh(bodyG,glowMat);
      thor.scale.set(.075,.055,.13); thor.position.z=0; head.scale.set(.048,.043,.05);head.position.z=.15;
      abdomen.scale.set(.07,.052,.12);abdomen.position.z=-.13;fm.add(thor,head,abdomen);
      var eyesMat=new THREE.MeshBasicMaterial({color:0x17110d});
      for(var side=-1;side<=1;side+=2){var eye=new THREE.Mesh(new THREE.SphereGeometry(.012,6,5),eyesMat);eye.position.set(side*.03,.012,.17);fm.add(eye);
        var wing=new THREE.Mesh(wingG,wingMat);wing.scale.set(.105,.014,.17);wing.position.set(side*.085,.055,.015);wing.rotation.y=side*.32;fm.add(wing);
        var antenna=new THREE.Mesh(new THREE.CylinderGeometry(.002,.003,.075,4),dark);antenna.position.set(side*.023,.04,.20);antenna.rotation.z=side*.38;fm.add(antenna);
      }
      fm.scale.setScalar(.38+Math.random()*.10);
      var fx=(Math.random()-.5)*50,fz=(Math.random()-.5)*50;fm.position.set(fx,hillY(fx,fz)+.85+Math.random()*.65,fz);fm.visible=false;gardenRoot.add(fm);
      var halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexFF,color:0xe5ff93,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));halo.scale.set(.46,.46,1);halo.visible=false;gardenRoot.add(halo);
      fireflies.push({m:fm,glow:halo,abdomen:abdomen,ph:Math.random()*6.283,cx:fx,cz:fz,r:1.5+Math.random()*1.3,sp:.22+Math.random()*.38,h:.85+Math.random()*.65,seed:Math.random()*6.28});
    }
    window.__fireflies=fireflies;
  })();
  /* ---- SINH VẬT ĐÊM RIÊNG: dơi, ếch, đá phát sáng, fitoplankton sáng hồ ---- */
  var bats = [];
  (function () {
    var btC = document.createElement('canvas'); btC.width = 96; btC.height = 48;
    var bg2 = btC.getContext('2d');
    bg2.fillStyle = '#0c0e12';
    bg2.beginPath();
    bg2.moveTo(48, 22);
    bg2.quadraticCurveTo(30, 2, 6, 14); bg2.quadraticCurveTo(16, 20, 12, 30); bg2.quadraticCurveTo(26, 26, 40, 32);
    bg2.lineTo(56, 32);
    bg2.quadraticCurveTo(70, 26, 84, 30); bg2.quadraticCurveTo(80, 20, 90, 14); bg2.quadraticCurveTo(66, 2, 48, 22);
    bg2.fill();
    bg2.beginPath(); bg2.ellipse(48, 26, 7, 9, 0, 0, 6.283); bg2.fill();
    var btTex = new THREE.CanvasTexture(btC);
    var nBt = LOW ? 3 : 5;
    for (var bi6 = 0; bi6 < nBt; bi6++) {
      var bm6 = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshBasicMaterial({ map: btTex, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, depthWrite: false, fog: false, color: 0x2a2e38 }));
      bm6.userData = { ph: rand(0, 6.283), r: 15 + Math.random() * 10, h: 3.0 + Math.random() * 1.1, sp: 0.28 + Math.random() * 0.22, fw: 1 + Math.random() * 0.5 };
      bm6.visible = false;
      gardenRoot.add(bm6);
      bats.push(bm6);
    }
  })();
  var frogPack = (function () {
    var fg2 = new THREE.Group();
    var bF = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshStandardMaterial({ color: 0x5c8f48, roughness: 0.6 }));
    bF.scale.y = 0.85; fg2.add(bF);
    var hF = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), bF.material);
    hF.position.set(0, 0.06, 0.05); fg2.add(hF);
    var egM2 = new THREE.MeshStandardMaterial({ color: 0xe9c84a, roughness: 0.4 });
    var eg1 = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), egM2);
    eg1.position.set(-0.032, 0.11, 0.06);
    var eg2 = eg1.clone(); eg2.position.x = 0.032;
    fg2.add(eg1, eg2);
    fg2.visible = false;
    gardenRoot.add(fg2);
    return fg2;
  })();
  var crystalPacks = [];
  (function () {
    var spotsCr = [[-29.2, -11.4, 0], [-17.4, 7.6, 1], [24.6, 11.8, 0], [-8.5, 26.8, 1]];
    for (var ci4 = 0; ci4 < spotsCr.length; ci4++) {
      var amber = spotsCr[ci4][2] === 1;
      var grpC = new THREE.Group();
      var matCr = new THREE.MeshStandardMaterial({ color: amber ? 0xe8c98e : 0x9adfd2, emissive: amber ? 0xffb347 : 0x4fe8cf, emissiveIntensity: 0.25, roughness: 0.25, flatShading: true });
      var nSh = 3 + (Math.random() * 3 | 0);
      for (var si6 = 0; si6 < nSh; si6++) {
        var sh6 = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), matCr);
        var h6 = 0.16 + Math.random() * 0.24;
        sh6.scale.set(0.07 + Math.random() * 0.05, h6, 0.07 + Math.random() * 0.05);
        sh6.position.set((Math.random() - 0.5) * 0.5, h6 * 0.42, (Math.random() - 0.5) * 0.5);
        sh6.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 6.28, (Math.random() - 0.5) * 0.5);
        grpC.add(sh6);
      }
      var glowCr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: amber ? 0xffc46a : 0x7de8d8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      glowCr.scale.set(1.5, 1.5, 1); glowCr.position.y = 0.32;
      grpC.add(glowCr);
      var px6 = spotsCr[ci4][0], pz6 = spotsCr[ci4][1];
      grpC.position.set(px6, hillY(px6, pz6), pz6);
      gardenRoot.add(grpC);
      crystalPacks.push({ mats: matCr, glow: glowCr });
    }
  })();
  var planktonPts = (function () {
    var N6 = 42, pos6 = new Float32Array(N6 * 3);
    var ly0 = hillY(LAKE.x, LAKE.z);
    for (var i6 = 0; i6 < N6; i6++) {
      var a6 = Math.random() * 6.283, rr6 = Math.sqrt(Math.random()) * 0.85;
      pos6[i6 * 3] = LAKE.x + Math.cos(a6) * rr6 * 6.0;
      pos6[i6 * 3 + 2] = LAKE.z + Math.sin(a6) * rr6 * 5.2;
      pos6[i6 * 3 + 1] = ly0 + 0.15;
    }
    var g6 = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos6, 3));
    var pts6 = new THREE.Points(g6, new THREE.PointsMaterial({ color: 0x7fe8d0, size: 0.055, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }));
    pts6.frustumCulled = false;
    gardenRoot.add(pts6);
    return pts6;
  })();
  var fireflyNightWas=false;
  function updateNightAnim(dt) {
    var nightNow = window.__isNight === true;
    if (nightNow && !fireflyNightWas) {
      var fp0=ppL(), camObj=window.__cam3d;
      if (fp0 && camObj) {
        var dir=camObj.getWorldDirection(new THREE.Vector3()).normalize();
        var right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),dir).normalize();
        var centerW=camObj.position.clone().addScaledVector(dir,6.5);
        fireflies.forEach(function(f){
          var side=(Math.random()-.5)*4.2, ahead=(Math.random()-.5)*2.0;
          var targetW=centerW.clone().addScaledVector(right,side).addScaledVector(dir,ahead);
          var targetL=gardenRoot.worldToLocal(targetW);
          f.ox=targetL.x-fp0.x; f.oz=targetL.z-fp0.z;
          f.cx=targetL.x; f.cz=targetL.z;
        });
      }
    }
    fireflyNightWas=nightNow;
    var ppF = ppL();
    for (var i = 0; i < fireflies.length; i++) {
      var f = fireflies[i];
      f.m.visible = nightNow; if(f.glow)f.glow.visible=nightNow;
      if (!nightNow) continue;
      f.ph += dt * f.sp;
      /* cụm quanh NGƯỜI CHƠI: tâm cụm lerp chậm về player */
      if (ppF) {
        f.cx += (ppF.x + (f.ox||0) - f.cx) * Math.min(1, dt * 1.45);
        f.cz += (ppF.z + (f.oz||0) - f.cz) * Math.min(1, dt * 1.45);
      }
      f.m.position.x = f.cx + Math.sin(f.ph) * f.r + Math.sin(elapsed * 0.35 + i) * 1.2;
      f.m.position.z = f.cz + Math.cos(f.ph * 0.8) * f.r + Math.cos(elapsed * 0.3 + i * 2) * 1.2;
      f.m.position.y = hillY(f.m.position.x, f.m.position.z) + f.h + Math.sin(f.ph * 2.3) * 0.18;
      if(f.glow){f.glow.position.set(f.m.position.x,f.m.position.y,f.m.position.z);var gs=.34+.22*Math.sin(elapsed*2.1+i);f.glow.scale.set(gs,gs,1);}
      var fop = 0.4 + 0.6 * Math.pow(0.5 + 0.5 * Math.sin(elapsed * 2.6 + i * 1.7), 3);
      f.abdomen.material.opacity=.35+.65*fop; if(f.glow)f.glow.material.opacity=.3+.38*fop;
      f.m.rotation.y=Math.sin(f.ph)*.45;
      f.m.rotation.x=Math.sin(elapsed*1.8+f.seed)*.13;
      [4,7].forEach(function(wi){var wing=f.m.children[wi];if(wing)wing.rotation.z=Math.sin(elapsed*24+f.seed+wi)*.55;});
    }
    /* cú nhỏ trườn thấp kiếm ăn ban đêm, lượn chậm qua bờ ruộng */
    if (owlG) {
      owlG.visible = nightNow;
      if (nightNow) {
        owlA += dt * 0.22;
        owlG.position.set(Math.cos(owlA) * 16, 2.3 + Math.sin(owlA * 2.6) * 0.55, Math.sin(owlA) * 16);
        owlG.rotation.y = Math.atan2(-Math.sin(owlA), -Math.cos(owlA)) + Math.PI / 2;
        owlWingL.rotation.z = 0.5 + Math.sin(elapsed * 5.4) * 0.5;
        owlWingR.rotation.z = -0.5 - Math.sin(elapsed * 5.4) * 0.5;
      }
    }
    /* đàn dơi đêm quẩn trên cao */
    for (var bi7 = 0; bi7 < bats.length; bi7++) {
      var bt7 = bats[bi7], u7 = bt7.userData;
      bt7.visible = nightNow;
      if (!nightNow) continue;
      var a7 = elapsed * u7.sp + u7.ph;
      bt7.position.set(Math.cos(a7) * u7.r, u7.h + Math.sin(a7 * 2.3) * 0.4, Math.sin(a7 * 0.8) * u7.r * 0.7);
      bt7.rotation.y = Math.atan2(-Math.sin(a7), Math.cos(a7) * 0.8);
      bt7.scale.x = u7.fw * (1 + Math.sin(elapsed * 10 + u7.ph) * 0.3);
    }
    /* ếch đêm ngồi lá súng, croak phồng cổ */
    if (frogPack) {
      frogPack.visible = nightNow && lilies.length > 1;
      if (frogPack.visible) {
        var padF = lilies[1].m;
        frogPack.position.set(padF.position.x, padF.position.y + 0.05, padF.position.z);
        var cr6 = Math.max(0, Math.sin(elapsed * 5.2));
        frogPack.scale.setScalar(1 + cr6 * cr6 * 0.22);
        frogPack.rotation.y = Math.sin(elapsed * 0.4) * 0.6;
      }
    }
    /* đá phát sáng + fitoplankton hồ — đêm lên đèn */
    var dFv = window.__dayF === undefined ? 1 : window.__dayF;
    var kg7 = 1 - dFv;
    for (var ci7 = 0; ci7 < crystalPacks.length; ci7++) {
      var cp7 = crystalPacks[ci7];
      cp7.mats.emissiveIntensity = 0.22 + kg7 * 1.1;
      cp7.glow.material.opacity = kg7 * (0.5 + 0.12 * Math.sin(elapsed * 2.2 + ci7 * 1.7));
    }
    planktonPts.material.opacity = nightNow ? 0.5 + 0.15 * Math.sin(elapsed * 1.8) : 0.1;
    planktonPts.material.size = 0.05 + 0.015 * Math.sin(elapsed * 2.4);
  }
  var owlG = null, owlA = 0, owlWingL = null, owlWingR = null;
  (function () {
    var texO = new THREE.TextureLoader().load(TXT.owl);
    texO.encoding = THREE.sRGBEncoding;
    var matO = new THREE.MeshBasicMaterial({ map: texO, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    owlG = new THREE.Group();
    var bodyO = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshStandardMaterial({ color: 0x8a7462, roughness: 0.95 })); bodyO.scale.set(1, 1.2, 0.85);
    owlG.add(bodyO);
    var wGeoO = new THREE.SphereGeometry(1, 12, 10);
    var wMatO = new THREE.MeshBasicMaterial({ color: 0x8a7462, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
    owlWingL = new THREE.Mesh(wGeoO, wMatO);
    owlWingL.position.set(-0.42, 0.05, -0.02);
    owlWingR = new THREE.Mesh(wGeoO, wMatO);
    owlWingR.position.set(0.42, 0.05, -0.02);
    owlG.add(owlWingL, owlWingR);
    owlG.position.set(16, 2.3, 0);
    owlG.visible = false;
    gardenRoot.add(owlG);
  })();

  /* ---- sao băng thi thoảng rơi ban đêm ---- */
  var shootT = 2;
  function updateShootingStar(dt) {
    if (!window.__isNight) { shootT = 5 + Math.random() * 6; return; }
    shootT -= dt;
    if (shootT <= 0 && Math.random() < dt * 1.6) {
      shootT = 3 + Math.random() * 4;
      var sx = (Math.random() - 0.5) * 40, sy = 10 + Math.random() * 8, sz = (Math.random() - 0.5) * 40;
      var tail = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.045), new THREE.MeshBasicMaterial({ color: 0xfff3d0, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      tail.position.set(sx, sy, sz);
      gardenRoot.add(tail);
      var vx = 7 + Math.random() * 5, vy = -3.5, life = 0;
      var iv = setInterval(function () {
        life += 0.035;
        tail.position.x += vx * 0.035; tail.position.y += vy * 0.035;
        tail.material.opacity = Math.max(0, 0.85 - life * 0.85);
        tail.rotation.z = Math.atan2(vy, vx);
        if (life > 1) { clearInterval(iv); gardenRoot.remove(tail); tail.material.dispose(); }
      }, 35);
    }
  }

  /* ---- lấp lánh dưới chân khi chạy (fx nhẹ) ---- */
  var footPts = null, footPool = [], footLastX = 0, footLastZ = 0, footT = 0;
  (function () {
    var N2 = 26, pos2 = new Float32Array(N2 * 3);
    footPts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos2, 3)), new THREE.PointsMaterial({ color: 0xffdf9e, size: 0.05, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    footPts.frustumCulled = false;
    gardenRoot.add(footPts);
    for (var i2 = 0; i2 < N2; i2++) footPool.push({ life: 0, x: 0, y: 0, z: 0, vy: 0 });
  })();
  function updateFootFx(dt) {
    var pp = ppL();
    if (!pp) return;
    var ppx = pp.x, ppz = pp.z;
    var moved = Math.hypot(ppx - footLastX, ppz - footLastZ);
    footT -= dt;
    var nightFt = window.__isNight === true;
    footPts.material.color.setHex(nightFt ? 0xffdf9e : 0xa9c46a);
    footPts.material.size = nightFt ? 0.05 : 0.065;
    if (moved > 0.06 && footT <= 0) {
      footT = 0.2;
      for (var sN2 = 0; sN2 < 2; sN2++) {
        for (var i2 = 0; i2 < footPool.length; i2++) {
          if (footPool[i2].life <= 0) {
            var fp = footPool[i2];
            fp.life = 0.45 + Math.random() * 0.2; fp.x = ppx + (Math.random() - 0.5) * 0.42; fp.z = ppz + (Math.random() - 0.5) * 0.42; fp.y = 0.1; fp.vy = 0.55 + Math.random() * 0.5;
            break;
          }
        }
      }
      footLastX = ppx; footLastZ = ppz;
    }
    var arr = footPts.geometry.attributes.position.array;
    for (var i3 = 0; i3 < footPool.length; i3++) {
      var f2 = footPool[i3];
      if (f2.life > 0) { f2.life -= dt; f2.y += f2.vy * dt; f2.vy *= 0.96; }
      arr[i3 * 3] = f2.x; arr[i3 * 3 + 1] = f2.life > 0 ? f2.y : -50; arr[i3 * 3 + 2] = f2.z;
    }
    footPts.geometry.attributes.position.needsUpdate = true;
  }

  /* ---- HIỆU ỨNG VỀ ĐIỂM XUẤT PHÁT: cột sáng + vòng xung ---- */
  window.__spawnHomeFX = function () {
    /* pPos is world-space while these effect meshes belong to rotated gardenRoot. */
    var sx = 0.4, sz = 6.8;
    var worldFX = new THREE.Vector3(sx, hillYWorld(sx, sz), sz);
    gardenRoot.worldToLocal(worldFX);
    sx=worldFX.x; sz=worldFX.z;
    var sy = worldFX.y;
    var pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.85, 3.4, 22, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    pillar.name = 'spawnHomePillar'; pillar.position.set(sx, sy + 1.7, sz);
    gardenRoot.add(pillar);
    var ring1 = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.72, 26), new THREE.MeshBasicMaterial({ color: 0xffe9b8, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring1.name = 'spawnHomeRing'; ring1.rotation.x = -Math.PI / 2;
    ring1.position.set(sx, sy + 0.06, sz);
    gardenRoot.add(ring1);
    var ring2 = ring1.clone();
    ring2.scale.set(0.5, 0.5, 1);
    gardenRoot.add(ring2);
    var life = 0;
    var iv = setInterval(function () {
      life += 0.05;
      pillar.material.opacity = 0.42 * Math.max(0, 1 - life / 2.2);
      pillar.scale.x = pillar.scale.z = 1 + Math.sin(life * 5) * 0.08;
      ring1.scale.setScalar(1 + life * 2.6);
      ring1.material.opacity = 0.7 * Math.max(0, 1 - life / 1.4);
      ring2.scale.setScalar(0.5 + life * 3.6);
      ring2.material.opacity = 0.55 * Math.max(0, 1 - life / 1.9);
      if (life > 2.2) {
        clearInterval(iv);
        gardenRoot.remove(pillar); gardenRoot.remove(ring1); gardenRoot.remove(ring2);
      }
    }, 50);
  };

  /* ---- NHÀ GỖ + ĐÁ ĐEN HANG NHỎ: điểm khám phá ---- */
  (function () {
    var CAB = { x: 26, z: 9 };
    var cy2 = hillY(CAB.x, CAB.z);
    var cabinG = window.__REAL_ASSETS ? window.__REAL_ASSETS.makeModel('house', { x: 5.4, y: 5.4, z: 4 }) : new THREE.Group();
    if (!window.__REAL_ASSETS) {
    /* texture ván tường + ngói */
    var plankTex2 = (function () {
      var c2 = document.createElement('canvas'); c2.width = c2.height = 128;
      var g2 = c2.getContext('2d');
      g2.fillStyle = '#8a6a48'; g2.fillRect(0, 0, 128, 128);
      for (var r2 = 0; r2 < 8; r2++) {
        g2.fillStyle = 'rgba(90,62,38,' + (0.5 + Math.random() * 0.3).toFixed(2) + ')';
        g2.fillRect(0, r2 * 16, 128, 2);
        for (var k4 = 0; k4 < 5; k4++) {
          g2.fillStyle = 'rgba(' + (150 + Math.random() * 30 | 0) + ',' + (115 + Math.random() * 25 | 0) + ',75,0.3)';
          g2.fillRect(Math.random() * 128, r2 * 16 + 3 + Math.random() * 10, 20 + Math.random() * 40, 1.2);
        }
      }
      var t4 = new THREE.CanvasTexture(c2); t4.wrapS = t4.wrapT = THREE.RepeatWrapping; return t4;
    })();
    var shingTex2 = (function () {
      var c2 = document.createElement('canvas'); c2.width = 64; c2.height = 64;
      var g2 = c2.getContext('2d');
      g2.fillStyle = '#6e4a34'; g2.fillRect(0, 0, 64, 64);
      for (var r2 = 0; r2 < 4; r2++) {
        for (var k4 = 0; k4 < 4; k4++) {
          g2.fillStyle = 'rgba(40,24,16,' + (0.5 + Math.random() * 0.3).toFixed(2) + ')';
          g2.beginPath(); g2.arc(k4 * 16 + (r2 % 2) * 8, r2 * 16 + 14, 9, 3.14, 6.283); g2.fill();
          g2.strokeStyle = 'rgba(110,80,58,0.6)'; g2.stroke();
        }
        g2.fillStyle = 'rgba(30,18,12,0.7)'; g2.fillRect(0, r2 * 16 + 15, 64, 1.5);
      }
      var t4 = new THREE.CanvasTexture(c2); t4.wrapS = t4.wrapT = THREE.RepeatWrapping; return t4;
    })();
    var wallMat2 = new THREE.MeshStandardMaterial({ map: plankTex2, roughness: 0.85 });
    var trimMat2 = new THREE.MeshStandardMaterial({ color: 0x4e3a26, roughness: 0.8 });
    var stoneMat2 = new THREE.MeshStandardMaterial({ color: 0x6e675c, roughness: 0.95, flatShading: true });
    var doorWoodMat2 = new THREE.MeshStandardMaterial({ color: 0x5a3f28, roughness: 0.75, map: plankTex2 });
    /* nền đá */
    var found2 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 2.7), stoneMat2);
    found2.position.y = 0.09; cabinG.add(found2);
    /* 4 tường ván */
    var wallF2 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.5, 0.12), wallMat2);
    wallF2.position.set(0, 0.93, 1.29); cabinG.add(wallF2);
    var wallB2 = wallF2.clone(); wallB2.position.z = -1.29; cabinG.add(wallB2);
    var wallL2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 2.7), wallMat2);
    wallL2.position.set(-1.54, 0.93, 0); cabinG.add(wallL2);
    var wallR2 = wallL2.clone(); wallR2.position.x = 1.54; cabinG.add(wallR2);
    /* mái đôi lợp ngói + giếng không + xà ngựi */
    var roofMat2 = new THREE.MeshStandardMaterial({ map: shingTex2, roughness: 0.9 });
    var roofF2 = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.07, 2.6), roofMat2);
    roofF2.rotation.x = 0.5; roofF2.position.set(0, 1.9, 0.6); cabinG.add(roofF2);
    var roofB2 = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.07, 2.6), roofMat2);
    roofB2.rotation.x = -0.5; roofB2.position.set(0, 1.9, -0.6); cabinG.add(roofB2);
    var ridge2 = new THREE.Mesh(new THREE.BoxGeometry(3.78, 0.16, 0.6), trimMat2);
    ridge2.position.y = 2.5; cabinG.add(ridge2);
    var gabShape = new THREE.Shape();
    gabShape.moveTo(-1.22, 0); gabShape.lineTo(1.22, 0); gabShape.lineTo(0, 0.64); gabShape.closePath();
    var gabGeo2 = new THREE.ShapeGeometry(gabShape);
    var gabF = new THREE.Mesh(gabGeo2, wallMat2); gabF.position.set(1.55, 1.68, 0); gabF.rotation.y = Math.PI / 2; cabinG.add(gabF);
    var gabB = new THREE.Mesh(gabGeo2, wallMat2); gabB.position.set(-1.55, 1.68, 0); gabB.rotation.y = -Math.PI / 2; cabinG.add(gabB);
    /* cửa gỗ + khung + tay nắm + bậc đá */
    var dFrame2 = new THREE.Mesh(new THREE.BoxGeometry(0.74, 1.16, 0.06), trimMat2);
    dFrame2.position.set(-0.75, 0.74, 1.33); cabinG.add(dFrame2);
    var dWood2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.04, 0.05), doorWoodMat2);
    dWood2.position.set(-0.75, 0.7, 1.37); cabinG.add(dWood2);
    var knob2 = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.35, metalness: 0.6 }));
    knob2.position.set(-0.53, 0.68, 1.41); cabinG.add(knob2);
    var step2 = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.1, 0.44), stoneMat2);
    step2.position.set(-0.75, 0.05, 1.62); cabinG.add(step2);
    /* cửa sổ: khung + kính ấm sáng đêm + chữ thập */
    var winMat2 = new THREE.MeshStandardMaterial({ color: 0x3a3226, emissive: 0xffc46a, emissiveIntensity: 0.4, roughness: 0.4 });
    var wFrame2 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.54, 0.06), trimMat2);
    wFrame2.position.set(0.72, 1.1, 1.33); cabinG.add(wFrame2);
    var wGlass2 = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.4), winMat2);
    wGlass2.position.set(0.72, 1.1, 1.365); cabinG.add(wGlass2);
    var wBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.035, 0.02), trimMat2); wBar1.position.set(0.72, 1.1, 1.375); cabinG.add(wBar1);
    var wBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.4, 0.02), trimMat2); wBar2.position.set(0.72, 1.1, 1.375); cabinG.add(wBar2);
    /* chậu hoa dưới cửa sổ */
    var fbox2 = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.15, 0.14), doorWoodMat2);
    fbox2.position.set(0.72, 0.79, 1.4); cabinG.add(fbox2);
    var fPal2 = [0xe08a6a, 0xe8b4d0, 0xf2d8a0, 0xd98080];
    for (var fi4 = 0; fi4 < 4; fi4++) {
      var fh2 = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: fPal2[fi4], roughness: 0.6 }));
      fh2.position.set(0.56 + fi4 * 0.11, 0.9, 1.4);
      cabinG.add(fh2);
    }
    /* đèn lồng treo cạnh cửa — sáng đêm theo winMat2 */
    var lantArm2 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.05), trimMat2);
    lantArm2.position.set(0.1, 1.52, 1.44); cabinG.add(lantArm2);
    var lant2 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.18, 0.13), winMat2);
    lant2.position.set(0.24, 1.38, 1.46); cabinG.add(lant2);
    /* cửa sổ bên + ống khói + khói */
    var wSFrame2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.56), trimMat2);
    wSFrame2.position.set(1.56, 1.05, -0.3); cabinG.add(wSFrame2);
    var wSGlass2 = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.36), winMat2);
    wSGlass2.position.set(1.595, 1.05, -0.3); wSGlass2.rotation.y = Math.PI / 2; cabinG.add(wSGlass2);
    var chim2 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.0, 0.36), stoneMat2);
    chim2.position.set(-1.0, 2.1, -0.5); cabinG.add(chim2);
    var chimCap2 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.46), trimMat2);
    chimCap2.position.set(-1.0, 2.62, -0.5); cabinG.add(chimCap2);
    var smokeS2 = [];
    for (var si4 = 0; si4 < 3; si4++) {
      var spS2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xcfd2cc, transparent: true, opacity: 0.2, depthWrite: false }));
      spS2.position.set(-1.0, 2.8, -0.5);
      cabinG.add(spS2); smokeS2.push(spS2);
    }
    var smokeT2 = 0;
    setInterval(function () {
      smokeT2 += 0.05;
      for (var si5 = 0; si5 < smokeS2.length; si5++) {
        var ph5 = (smokeT2 * 0.42 + si5 * 0.33) % 1;
        smokeS2[si5].position.set(-1.0 + Math.sin((smokeT2 + si5 * 2) * 1.3) * 0.09, 2.72 + ph5 * 1.15, -0.5);
        smokeS2[si5].material.opacity = 0.2 * (1 - ph5);
        var sc5 = 0.16 + ph5 * 0.42;
        smokeS2[si5].scale.set(sc5, sc5, 1);
      }
    }, 50);
    /* ghế cây kiền + củi chồng góc */
    var logMat2 = new THREE.MeshStandardMaterial({ color: 0x6e5136, roughness: 0.92 });
    var stump2 = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.24, 9), logMat2);
    stump2.position.set(2.05, 0.14, 1.15); cabinG.add(stump2);
    for (var fi5 = 0; fi5 < 3; fi5++) {
      var log2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.52, 7), logMat2);
      log2.rotation.z = Math.PI / 2;
      log2.rotation.y = fi5 * 0.1;
      log2.position.set(-1.9, 0.08 + fi5 * 0.11, 0.3 + fi5 * 0.14);
      cabinG.add(log2);
    }
    }
    cabinG.position.set(CAB.x, cy2, CAB.z);
    cabinG.rotation.y = -1.45;
    gardenRoot.add(cabinG);
    window.__cabinGroup = cabinG;
    window.__cabinWin = winMat2;
    window.__cabinPos = CAB;
    /* cụm đá đen + hang nhỏ mộ đá ở tây nam */
    var RK = { x: -30, z: -12 };
    var rkY = hillY(RK.x, RK.z);
    var rkMat = new THREE.MeshStandardMaterial({ color: 0x3e3e44, roughness: 0.92, flatShading: true });
    for (var rk = 0; rk < 7; rk++) {
      var rm2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), rkMat);
      var rs2 = 0.5 + Math.random() * 1.15;
      rm2.scale.set(rs2, rs2 * (0.6 + Math.random() * 0.5), rs2);
      rm2.position.set(RK.x + (Math.random() - 0.5) * 5.2, rkY + rs2 * 0.32, RK.z + (Math.random() - 0.5) * 4.4);
      rm2.rotation.set(Math.random(), Math.random() * 6.283, Math.random() * 0.4);
      gardenRoot.add(rm2);
      if (window.__physicsAddStatic) window.__physicsAddStatic(rm2.position.x, rm2.position.z, rs2 * 0.72, 2.5);
    }
    /* mộ đá: 2 trụ + phiến đỉnh + lỗ tối bên trong */
    var TOMB = { x: -27.5, z: -9.5 };
    var tmY = hillY(TOMB.x, TOMB.z);
    var tmMat = new THREE.MeshStandardMaterial({ color: 0x494952, roughness: 0.85, flatShading: true });
    var p1 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.5, 0.9), tmMat); p1.position.set(TOMB.x - 0.72, tmY + 0.75, TOMB.z); gardenRoot.add(p1);
    var p2 = p1.clone(); p2.position.x = TOMB.x + 0.72; gardenRoot.add(p2);
    var top2 = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.3, 1.05), tmMat); top2.position.set(TOMB.x, tmY + 1.62, TOMB.z); top2.rotation.z = 0.06; gardenRoot.add(top2);
    var hole2 = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.15), new THREE.MeshBasicMaterial({ color: 0x07060a }));
    hole2.position.set(TOMB.x, tmY + 0.6, TOMB.z + 0.48);
    gardenRoot.add(hole2);
    window.__landmarks = { cabin: CAB, rocks: RK, tomb: TOMB, lake: LAKE, den: window.__denPos, well: { x: -10.5, z: -27 }, bigTree: { x: 7, z: -20 } };
  })();

  /* Dãy đồi xa làm nền trời (nhìn thấy từ mọi chỗ trong world) */
  (function distantHills() {
    var mat = new THREE.MeshStandardMaterial({ color: 0x8ba0b5, roughness: 1, flatShading: true });
    var mat2 = new THREE.MeshStandardMaterial({ color: 0x7b93a8, roughness: 1, flatShading: true });
    for (var i = 0; i < 30; i++) {
      var a = (i / 30) * Math.PI * 2 + (i % 3) * 0.07;
      var r = 62 + (i % 6) * 8;
      var h = 10 + (i % 8) * 4;
      var m = new THREE.Mesh(new THREE.ConeGeometry(11 + (i % 4) * 5, h, 7), i % 2 ? mat : mat2);
      m.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r);
      gardenRoot.add(m);
    }
  })();

  /* Suối chảy từ rừng xuống hồ + cầu gỗ bắc qua + nhà phụ + lửa trại */
  (function creekAndStructures() {
    var pts = window.__creek || [[-16, -22], [-9, -10], [-2, 0], [0, 8], [-1, 14]];
    var wY = window.__lakeWaterY ? window.__lakeWaterY() : 1.15;
    var pos = [], idx = [];
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var q = i < pts.length - 1 ? pts[i + 1] : pts[i - 1];
      var pv = i > 0 ? pts[i - 1] : pts[i + 1];
      var dx = q[0] - pv[0], dz = q[1] - pv[1];
      var l = Math.hypot(dx, dz) || 1;
      var nx = -dz / l, nz = dx / l;
      var y = hillY(p[0], p[1]) + 0.55;
      pos.push(p[0] - nx * 1.35, y, p[1] - nz * 1.35, p[0] + nx * 1.35, y, p[1] + nz * 1.35);
      if (i > 0) { var b = (i - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    var cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    cg.setIndex(idx);
    cg.computeVertexNormals();
    var creekW = new THREE.Mesh(cg, new THREE.MeshPhysicalMaterial({ color: 0x2b8fa6, roughness: 0.1, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
    gardenRoot.add(creekW);
    window.__creekMesh = creekW;
    if (window.__REAL_ASSETS) {
      var br = window.__REAL_ASSETS.makeModel('bridge', 2.6); br.scale.multiplyScalar(2.0);
      var bp = pts[3];
      br.position.set(bp[0], hillY(bp[0], bp[1]) + 0.55, bp[1]);
      br.rotation.y = Math.atan2(pts[4][0] - pts[2][0], pts[4][1] - pts[2][1]) + Math.PI / 2;
      gardenRoot.add(br);
      var gar = window.__REAL_ASSETS.makeModel('garageHouse', 3.2);
      gar.position.set(-22, hillY(-22, 3), 3);
      gar.rotation.y = 0.6;
      gardenRoot.add(gar);
      var cf = window.__REAL_ASSETS.makeModel('campfire', 0.9);
      cf.position.set(18, hillY(18, 18), 18);
      gardenRoot.add(cf);
      if (window.__REAL_ASSETS) {
        var tower = window.__REAL_ASSETS.makeModel('kTower', 7.5);
        tower.position.set(-24, hillY(-24, -8), -8);
        gardenRoot.add(tower);
        var fountain = window.__REAL_ASSETS.makeModel('kFountain', 1.6);
        fountain.position.set(13.4, hillY(13.4, 9.6), 9.6);
        gardenRoot.add(fountain);
        [[24, 7.2], [28, 7.2], [24, 10.8], [28, 10.8]].forEach(function (wp) {
          var w = window.__REAL_ASSETS.makeModel('kWall', 1.8);
          w.position.set(wp[0], hillY(wp[0], wp[1]), wp[1]);
          gardenRoot.add(w);
        });
        var fenceA = window.__REAL_ASSETS.makeModel('kFence', 1.2);
        fenceA.position.set(-1.5, hillY(-1.5, 9.5), 9.5);
        fenceA.rotation.y = 0.3;
        gardenRoot.add(fenceA);
        var fenceB = window.__REAL_ASSETS.makeModel('kFence', 1.2);
        fenceB.position.set(1.2, hillY(1.2, 6.8), 6.8);
        fenceB.rotation.y = -0.5;
        gardenRoot.add(fenceB);
      }
    }
  })();

  /* ============ CHUNK STREAMING (chế độ game): map vô tận kiểu Minecraft ============
     Sinh chunk đất+cỏ+hoa dại+đá quanh người chơi theo seed xác định,
     huỷ (dispose) khi xa, cull ngoài frustum + tầm nhìn → bộ nhớ/draw-call không tăng dù map rộng cỡ nào */
  (function buildChunkSystem() {
    if (!window.__GAME) return;
    var CHSZ = 14, GEN_R = 92, KILL_R = 112, VIEW_R = 84, CENTER_R = 18;
    var chunkMap = {}, chunkList = [], genQueue = [], lastGenCX = NaN, lastGenCZ = NaN;
    /* ---- ĐƯỜNG ĐẤT: hàm world-space xác định — mọi chunk vẽ khớp liền mạch ---- */
    function pathZ(x) { return 15.5 + 5.2 * Math.sin(x * 0.085) + 3.1 * Math.sin(x * 0.041 + 2.0) - 12.5 * Math.exp(-(x*x)/70); }
    function onPathW(x, z, w) { return Math.abs(z - pathZ(x)) < (w || 1.5); }
    var DEN_X = -18, DEN_Z = 6;
    function nearDen(x, z, r) { var dx = x - DEN_X, dz = z - DEN_Z; return dx * dx + dz * dz < (r || 4) * (r || 4); }

    /* ---- THỎ: rig động vật CC0, texture fur + bộ xương/animation thật ---- */
    var rabbitPool = [], rabbitTimer = 2.5 + Math.random() * 2.5, rabbitLast = 0;
    window.__rabbits = rabbitPool;
    window.__spawnRabbitNow = function () { rabbitTimer = 0; };
    window.__rabbitAssetReady = false;
    var rabbitTemplate = null, rabbitMaps = {}, rabbitMapsReady = false, rabbitModelReady = false;
    function rabbitTexURI(tok) {
      return /^models\/|^https?:\/\//.test(tok) ? tok : 'data:image/png;base64,' + tok;
    }
    var rabbitTextureData = {
      'Fur-skin.png': rabbitTexURI('__RABBIT_FUR_B64__'),
      'rabbit-skinn.png': rabbitTexURI('__RABBIT_SKIN_B64__'),
      'rabbit-NORM.png': rabbitTexURI('__RABBIT_NORM_B64__')
    };
    var rabbitManager = new THREE.LoadingManager();
    rabbitManager.setURLModifier(function(url){
      var tail=decodeURIComponent(url.split(/[?#]/)[0].split(/[\\/]/).pop());
      return rabbitTextureData[tail] || url;
    });
    function addSkinnedFur(mesh,count){
      var g=mesh.geometry,pos=g.attributes.position,normal=g.attributes.normal,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,idx=g.index;
      if(!pos||!si||!sw||!mesh.skeleton)return null;
      if(!normal){g.computeVertexNormals();normal=g.attributes.normal;}
      var faces=idx?idx.count/3:pos.count/3,areas=new Float64Array(faces),total=0;
      var a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
      for(var f=0;f<faces;f++){var ia=idx?idx.getX(f*3):f*3,ib=idx?idx.getX(f*3+1):f*3+1,ic=idx?idx.getX(f*3+2):f*3+2;a.fromBufferAttribute(pos,ia);b.fromBufferAttribute(pos,ib);c.fromBufferAttribute(pos,ic);b.sub(a).cross(c.sub(a));total+=areas[f]=b.length()*.5;}
      if(!total)return null;
      var accum=new Float64Array(faces),run=0;for(var q=0;q<faces;q++)accum[q]=run+=areas[q];
      var P=new Float32Array(count*9),C=new Float32Array(count*9),BI=new Uint16Array(count*12),BW=new Float32Array(count*12),I=new Uint32Array(count*3),colors=['#e8e5df','#f4f1ea','#fffaf0','#d7d4cd'].map(function(x){return new THREE.Color(x);});
      var na=new THREE.Vector3(),nb=new THREE.Vector3(),nc=new THREE.Vector3(),tangent=new THREE.Vector3(),axis=new THREE.Vector3(),tip=new THREE.Vector3(),left=new THREE.Vector3(),right=new THREE.Vector3();
      function weightsAt(i0,i1,i2,w0,w1,w2){var m={};for(var k=0;k<4;k++){var j=si.getComponent(i0,k),v=sw.getComponent(i0,k)*w0;if(v>0)m[j]=(m[j]||0)+v;j=si.getComponent(i1,k);v=sw.getComponent(i1,k)*w1;if(v>0)m[j]=(m[j]||0)+v;j=si.getComponent(i2,k);v=sw.getComponent(i2,k)*w2;if(v>0)m[j]=(m[j]||0)+v;}return Object.keys(m).map(function(k){return [Number(k),m[k]];}).sort(function(x,y){return y[1]-x[1];}).slice(0,4);}
      for(var h=0;h<count;h++){
        var target=Math.random()*total,lo=0,hi=faces-1;while(lo<hi){var md=(lo+hi)>>1;if(accum[md]<target)lo=md+1;else hi=md;}var face=lo;
        var i0=idx?idx.getX(face*3):face*3,i1=idx?idx.getX(face*3+1):face*3+1,i2=idx?idx.getX(face*3+2):face*3+2;
        var u=Math.sqrt(Math.random()),v=Math.random(),w0=1-u,w1=u*(1-v),w2=u*v;
        a.fromBufferAttribute(pos,i0);b.fromBufferAttribute(pos,i1);c.fromBufferAttribute(pos,i2);
        left.copy(a).multiplyScalar(w0).addScaledVector(b,w1).addScaledVector(c,w2);
        na.fromBufferAttribute(normal,i0);nb.fromBufferAttribute(normal,i1);nc.fromBufferAttribute(normal,i2);
        axis.copy(na).multiplyScalar(w0).addScaledVector(nb,w1).addScaledVector(nc,w2).normalize();
        var randAxis=new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5);tangent.crossVectors(axis,randAxis).normalize();if(tangent.lengthSq()<.001)tangent.set(1,0,0);
        var len=.06+Math.random()*.14,width=.003+Math.random()*.007,bend=(Math.random()-.5)*len*.12;
        tip.copy(left).addScaledVector(axis,len).addScaledVector(tangent,bend);right.copy(left).addScaledVector(tangent,width);
        var base=h*3,pts=[left.clone().addScaledVector(tangent,-width),right,tip],col=colors[(Math.random()*colors.length)|0],ws=weightsAt(i0,i1,i2,w0,w1,w2),sum=ws.reduce(function(t,x){return t+x[1];},0)||1;
        for(var k2=0;k2<3;k2++){var vi=base+k2,p=pts[k2],shade=.78+Math.random()*.32;P[vi*3]=p.x;P[vi*3+1]=p.y;P[vi*3+2]=p.z;C[vi*3]=col.r*shade;C[vi*3+1]=col.g*shade;C[vi*3+2]=col.b*shade;for(var wj=0;wj<ws.length;wj++){BI[vi*4+wj]=ws[wj][0];BW[vi*4+wj]=ws[wj][1]/sum;}}
        I[h*3]=base;I[h*3+1]=base+1;I[h*3+2]=base+2;
      }
      var hair=new THREE.BufferGeometry();hair.setAttribute('position',new THREE.BufferAttribute(P,3));hair.setAttribute('color',new THREE.BufferAttribute(C,3));hair.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(BI,4));hair.setAttribute('skinWeight',new THREE.Float32BufferAttribute(BW,4));hair.setIndex(new THREE.BufferAttribute(I,1));hair.computeVertexNormals();
      var cover=new THREE.SkinnedMesh(hair,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:0,side:THREE.DoubleSide,transparent:true,opacity:.7,depthWrite:false}));
      cover.position.copy(mesh.position);cover.quaternion.copy(mesh.quaternion);cover.scale.copy(mesh.scale);cover.frustumCulled=false;mesh.parent.add(cover);cover.bind(mesh.skeleton,mesh.bindMatrix.clone());cover.name='Rabbit fine fur strands';return cover;
    }
    function whiteRabbitMap(source) {
      var image = source.image, canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < data.data.length; i += 4) {
        var lum = data.data[i] * 0.24 + data.data[i + 1] * 0.62 + data.data[i + 2] * 0.14;
        var white = Math.max(0, Math.min(255, Math.round(205 + lum * 0.20)));
        data.data[i] = white; data.data[i + 1] = white; data.data[i + 2] = white;
      }
      ctx.putImageData(data, 0, 0);
      var texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = source.colorSpace; texture.encoding = source.encoding; texture.flipY = source.flipY;
      return texture;
    }
    function markRabbitMapsReady(){
      if(Object.keys(rabbitMaps).length<3 || !rabbitModelReady || window.__rabbitAssetReady) return;
      Object.keys(rabbitMaps).forEach(function(k){var t=rabbitMaps[k];if(THREE.SRGBColorSpace && k!=='rabbit-NORM.png')t.colorSpace=THREE.SRGBColorSpace;else if(k!=='rabbit-NORM.png')t.encoding=THREE.sRGBEncoding;if(k!=='rabbit-NORM.png')rabbitMaps[k]=whiteRabbitMap(t);});
      var rabbitSkinTargets=[];
      rabbitTemplate.traverse(function(o){
        if(o.isSkinnedMesh)rabbitSkinTargets.push(o);
        if(!o.isMesh)return;
        var isFur=(o.name||'').toLowerCase()==='fur' || (o.material && (o.material.name||'').toLowerCase()==='fur');
        o.material=new THREE.MeshStandardMaterial({
          map:isFur?rabbitMaps['Fur-skin.png']:rabbitMaps['rabbit-skinn.png'],
          normalMap:rabbitMaps['rabbit-NORM.png'], normalScale:new THREE.Vector2(.48,.48),
          color:0xffffff, roughness:.97, metalness:0, transparent:true,
          alphaTest:isFur?.18:.08, depthWrite:!isFur, side:THREE.DoubleSide
        });
        o.castShadow=false; o.frustumCulled=false;
      });
      rabbitSkinTargets.forEach(function(o){if((o.name||'').toLowerCase()==='rabbit' && !o.userData.furFiberMesh)o.userData.furFiberMesh=addSkinnedFur(o,9000);});
      rabbitTemplate.updateMatrixWorld(true);
      var bb=new THREE.Box3().setFromObject(rabbitTemplate), sz=bb.getSize(new THREE.Vector3()), bc=bb.getCenter(new THREE.Vector3());
      var sc=1.42/(sz.y||1500); rabbitTemplate.scale.setScalar(sc);
      rabbitTemplate.position.set(-bc.x*sc,-bb.min.y*sc,-bc.z*sc);
      rabbitTemplate.userData.rabbitScale=sc;
      rabbitTemplate.userData.rabbitGroundOffset=rabbitTemplate.position.y;
      rabbitTemplate.userData.rabbitXOffset=rabbitTemplate.position.x;
      rabbitTemplate.userData.rabbitZOffset=rabbitTemplate.position.z;
      rabbitTemplate.updateMatrixWorld(true);
      window.__rabbitAssetReady=true;
      window.__rabbitAnimNames=(rabbitTemplate.animations||[]).map(function(a){return a.name;});
    }
    var rabbitTextureLoader = new THREE.TextureLoader();
    Object.keys(rabbitTextureData).forEach(function(k){rabbitTextureLoader.load(rabbitTextureData[k],function(t){rabbitMaps[k]=t;markRabbitMapsReady();},undefined,function(){console.warn('Rabbit texture failed: '+k);});});
    try {
      var rabbitSrc = '__RABBIT_FBX_B64__';
      if (/^models\/|^https?:\/\//.test(rabbitSrc)) {
        new THREE.FBXLoader(rabbitManager).load(rabbitSrc, function (obj) {
          rabbitTemplate = obj;
          rabbitModelReady = true;
          markRabbitMapsReady();
        }, undefined, function () { console.error('CC0 rabbit FBX failed'); });
      } else {
        var rabbitBytes=Uint8Array.from(atob(rabbitSrc),function(c){return c.charCodeAt(0);});
        rabbitTemplate=new THREE.FBXLoader(rabbitManager).parse(rabbitBytes.buffer,'');
        rabbitModelReady=true;
        markRabbitMapsReady();
      }
    } catch(eRabbit) { console.error('CC0 rabbit FBX failed',eRabbit); }
    function rabbitRig(){
      if(!rabbitTemplate)return null;
      /* Keep the source FBX skeleton intact: THREE's generic deep clone loses this asset's skin binding. */
      var fit=new THREE.Box3().setFromObject(rabbitTemplate), fc=fit.getCenter(new THREE.Vector3());
      var root=new THREE.Group(); root.position.set(-fc.x,-fit.min.y,-fc.z); root.add(rabbitTemplate);
      var rigRoot=rabbitTemplate, mixer=new THREE.AnimationMixer(rigRoot), acts={};
      (rabbitTemplate.animations||[]).forEach(function(clip){
        var n=clip.name.toLowerCase(), key=n.indexOf('running')>=0?'run':(n.indexOf('guarding')>=0?'guard':(n.indexOf('sitting')>=0?'sit':(n.indexOf('jump')>=0?'jump':null)));
        if(key && !acts[key])acts[key]=mixer.clipAction(clip);
      });
      if(!acts.run)acts.run=acts.jump||mixer.clipAction((rabbitTemplate.animations||[])[0]);
      if(!acts.guard)acts.guard=acts.sit||acts.run;
      if(acts.jump){acts.jump.setLoop(THREE.LoopOnce,1);acts.jump.clampWhenFinished=true;}
      acts.guard.play();
      var sh=new THREE.Mesh(new THREE.CircleGeometry(.42,28),new THREE.MeshBasicMaterial({color:0x2d2b23,transparent:true,opacity:.19,depthWrite:false}));
      sh.rotation.x=-Math.PI/2;sh.position.y=.018;
      return {root:root,mixer:mixer,actions:acts,shadow:sh,current:'guard',offset:0,ox:0,oz:0};
    }
    function landSafeRabbit(x,z) {
      if (!window.__lakeInfo) return true;
      var L=window.__lakeInfo, q=((x-L.x)*(x-L.x))/(L.rx*L.rx)+((z-L.z)*(z-L.z))/(L.rz*L.rz);
      return q > 1.18;
    }
    function projectRabbitToLand(x,z) {
      if (landSafeRabbit(x,z)) return {x:x,z:z};
      var L=window.__lakeInfo, dx=x-L.x, dz=z-L.z;
      if (Math.hypot(dx,dz)<0.001) {dx=1;dz=0;}
      var q=Math.sqrt(dx*dx/(L.rx*L.rx)+dz*dz/(L.rz*L.rz))||0.01, k=1.24/q;
      return {x:L.x+dx*k,z:L.z+dz*k};
    }
    function rabbitMesh() { return rabbitRig(); }
    function spawnRabbit() {
      if (rabbitPool.length >= 1 || !window.__playerPos || !window.__rabbitAssetReady || !rabbitActive()) return;
      var pp = ppL();
      var sx, sz, ex, ez;
      var dwx = DEN_X - pp.x, dwz = DEN_Z - pp.z;
      if (dwx * dwx + dwz * dwz < 900) { /* gần hang: thỏ chui ra rồi hop đi đâu đó */
        var ang = Math.random() * 6.283, rr = 1.5 + Math.random() * 1.4;
        sx = DEN_X + Math.cos(ang) * rr; sz = DEN_Z + Math.sin(ang) * rr;
        ex = sx + Math.cos(ang + 2.1) * (8 + Math.random() * 6);
        ez = sz + Math.sin(ang + 2.1) * (8 + Math.random() * 6);
      } else { /* thường: chạy ngang qua khu người chơi */
        var ang = Math.random() * 6.283, rr = 7 + Math.random() * 4;
        sx = pp.x + Math.cos(ang) * rr; sz = pp.z + Math.sin(ang) * rr;
        var tng = ang + (Math.random() < 0.5 ? 1.57 : -1.57);
        var dist = 9 + Math.random() * 6;
        ex = sx + Math.cos(tng) * dist; ez = sz + Math.sin(tng) * dist;
      }
      var sa=projectRabbitToLand(sx,sz), ea=projectRabbitToLand(ex,ez); sx=sa.x; sz=sa.z; ex=ea.x; ez=ea.z;
      /* If the direct route clips the pond, redirect to a safe tangent endpoint. */
      var crosses=false; for(var qi=1;qi<20;qi++){var qt=qi/20;if(!landSafeRabbit(sx+(ex-sx)*qt,sz+(ez-sz)*qt)){crosses=true;break;}}
      if(crosses){var ax=sx-(window.__lakeInfo?window.__lakeInfo.x:0),az=sz-(window.__lakeInfo?window.__lakeInfo.z:0),al=Math.hypot(ax,az)||1;ex=sx+(-az/al)*12;ez=sz+(ax/al)*12;var ea2=projectRabbitToLand(ex,ez);ex=ea2.x;ez=ea2.z;}
      var rig=rabbitMesh(), m=rig.root;
      m.position.set(sx, hillY(sx, sz), sz); gardenRoot.add(m); rig.shadow.position.set(sx,hillY(sx,sz)+.018,sz); gardenRoot.add(rig.shadow);
      rabbitPool.push({ m:m, mixer:rig.mixer, actions:rig.actions, current:'guard', shadow:rig.shadow, offset:0, ox:0, oz:0, sx:sx, sz:sz, ex:ex, ez:ez, t:0, pause:0, gaitT:.8+Math.random()*2, startle:0, fade:1, seed:Math.random()*6.28 });
    }
    function rabbitActive(){ var d=window.__dayF; return typeof d==='number' && d>0.26 && window.__isNight!==true; }
    function switchRabbit(rb,key){ if(rb.current===key || !rb.actions[key])return; var old=rb.actions[rb.current]; if(old)old.fadeOut(.22); rb.actions[key].reset().fadeIn(.22).play(); rb.current=key; }
    function updateRabbits(dt) {
      var night=window.__isNight===true, active=rabbitActive()&&!night;
      rabbitTimer-=dt;
      if(active && rabbitTimer<=0){spawnRabbit();rabbitTimer=13+Math.random()*14;}
      else if(!active && rabbitTimer<=0)rabbitTimer=12+Math.random()*16;
      var pp=window.__playerPos?ppL():null;
      for(var i=rabbitPool.length-1;i>=0;i--){
        var rb=rabbitPool[i], dx=rb.ex-rb.sx,dz=rb.ez-rb.sz,total=Math.hypot(dx,dz)||.001;
        if(rb.mixer)rb.mixer.update(dt);
        var pdx=pp?pp.x-rb.m.position.x:100,pdz=pp?pp.z-rb.m.position.z:100;
        if(active && pdx*pdx+pdz*pdz<5.5 && rb.startle<=0 && rb.pause<=0)rb.startle=1.1;
        rb.startle=Math.max(0,rb.startle-dt);
        if(rb.t<1 && active){
          if(rb.pause>0){rb.pause-=dt;switchRabbit(rb,'sit');}
          else {
            rb.gaitT-=dt;
            if(rb.gaitT<=0){rb.pause=.45+Math.random()*1.15;rb.gaitT=1.2+Math.random()*2.8;switchRabbit(rb,'sit');}
            else {rb.t+=dt*(rb.startle>0?2.3:.54)/total;switchRabbit(rb,'run');}
          }
        }else{
          rb.pause=0;switchRabbit(rb,night?'guard':'sit');
        }
        var previousX=rb.m.position.x, previousZ=rb.m.position.z;
        var k=Math.min(rb.t,1),x=rb.sx+dx*k,z=rb.sz+dz*k;
        if(!landSafeRabbit(x,z)){var safe=projectRabbitToLand(x,z);x=safe.x;z=safe.z;}
        rb.m.position.set(x,hillY(x,z),z);
        if(rb.shadow)rb.shadow.position.set(x,hillY(x,z)+.018,z);
        var moveX=x-previousX,moveZ=z-previousZ;
        if(Math.abs(moveX)+Math.abs(moveZ)>0.0001)rb.m.rotation.y=Math.atan2(moveX,moveZ);
        rb.m.rotation.z=Math.sin(elapsed*1.7+rb.seed)*.008;
        var bob=(rb.current==='sit'||rb.current==='guard')?Math.sin(elapsed*2+rb.seed)*.006:0;
        rb.m.position.y+=bob;
        if(rb.t>=1){rb.fade-=dt*.20;rb.m.traverse(function(o){if(o.isMesh&&o.material){var mm=Array.isArray(o.material)?o.material:[o.material];mm.forEach(function(m){m.transparent=true;m.opacity=Math.max(0,rb.fade);});}});
          if(rb.fade<=0){gardenRoot.remove(rb.m);if(rb.shadow){gardenRoot.remove(rb.shadow);rb.shadow.geometry.dispose();rb.shadow.material.dispose();}if(rb.mixer){rb.mixer.stopAllAction();rb.mixer.uncacheRoot(rabbitTemplate);}if(rabbitTemplate&&rabbitTemplate.parent===rb.m)rb.m.remove(rabbitTemplate);rabbitPool.splice(i,1);}
        }
      }
    }
    var dummyC = new THREE.Object3D();
    var stemGeoC = new THREE.CylinderGeometry(0.013, 0.02, 1, 5);
    stemGeoC.translate(0, 0.5, 0);
    var headGeoC = new THREE.SphereGeometry(1, 8, 6);
    var stoneGeoC = (function () {
      var g = new THREE.IcosahedronGeometry(1, 1);
      var p = g.attributes.position, seen = {};
      for (var i = 0; i < p.count; i++) {
        var kx = p.getX(i).toFixed(2), ky = p.getY(i).toFixed(2), kz = p.getZ(i).toFixed(2);
        var key = kx + '|' + ky + '|' + kz;
        if (seen[key] === undefined) {
          var hsh = Math.sin(parseFloat(kx) * 12.9898 + parseFloat(ky) * 78.233 + parseFloat(kz) * 37.719) * 43758.5453;
          seen[key] = 0.72 + (hsh - Math.floor(hsh)) * 0.5;
        }
        var sc = seen[key];
        p.setXYZ(i, p.getX(i) * sc, p.getY(i) * sc * 0.92, p.getZ(i) * sc);
      }
      g.computeVertexNormals();
      return g;
    })();
    var stoneMatC = new THREE.MeshStandardMaterial({ color: 0x6f6a5e, roughness: 0.98, flatShading: false });
    var stoneMatC2 = new THREE.MeshStandardMaterial({ color: 0x5d574b, roughness: 0.95, flatShading: false });
    var canyonStoneA = new THREE.MeshStandardMaterial({ color: 0xa64e2e, roughness: 0.96, flatShading: false });
    var canyonStoneB = new THREE.MeshStandardMaterial({ color: 0x7a3824, roughness: 0.98, flatShading: false });
    var forestStoneA = new THREE.MeshStandardMaterial({ color: 0x4c5b4c, roughness: 0.99, flatShading: false });
    var borderStoneA = new THREE.MeshStandardMaterial({ color: 0x666963, roughness: 0.98, flatShading: false });
    var obsidianStone = new THREE.MeshStandardMaterial({ color: 0x242126, roughness: 0.92, flatShading: false });
    var snowStone = new THREE.MeshStandardMaterial({ color: 0xbec9d1, roughness: 0.88, flatShading: false });
    function regionStone(region, alternate) {
      if (region === 'r03' || region === 'canyon') return alternate ? canyonStoneB : canyonStoneA;
      if (region === 'r02' || region === 'r04' || region === 'forest') return alternate ? stoneMatC2 : forestStoneA;
      if (region === 'r06') return obsidianStone;
      if (region === 'r05') return alternate ? borderStoneA : snowStone;
      if (region === 'border') return alternate ? stoneMatC2 : borderStoneA;
      return alternate ? stoneMatC2 : stoneMatC;
    }
    var barkTexC = (function () {
      var c = document.createElement('canvas'); c.width = 64; c.height = 128;
      var g = c.getContext('2d');
      g.fillStyle = '#63452b'; g.fillRect(0, 0, 64, 128);
      for (var i = 0; i < 16; i++) {
        g.fillStyle = Math.random() < 0.6 ? '#5e4429' : '#96754d';
        g.globalAlpha = 0.5 + Math.random() * 0.4;
        var x2 = Math.random() * 64, w2 = 1.5 + Math.random() * 3;
        g.beginPath();
        g.moveTo(x2, -4);
        for (var yy = 0; yy <= 132; yy += 16) g.lineTo(x2 + Math.sin(yy * 0.35 + i) * 3, yy);
        g.lineWidth = w2; g.strokeStyle = g.fillStyle; g.stroke();
      }
      g.globalAlpha = 0.55; g.fillStyle = '#4a3620';
      g.beginPath(); g.ellipse(18, 34, 3.4, 6, 0.3, 0, 6.283); g.fill();
      g.beginPath(); g.ellipse(46, 88, 2.6, 5, -0.4, 0, 6.283); g.fill();
      var t2 = new THREE.CanvasTexture(c); t2.wrapS = t2.wrapT = THREE.RepeatWrapping; t2.encoding = THREE.sRGBEncoding; return t2;
    })();
    var leafTexC = (function () {
      var c = document.createElement('canvas'); c.width = 256; c.height = 256;
      var g = c.getContext('2d');
      g.fillStyle = '#54703c'; g.fillRect(0, 0, 256, 256);
      var cols2 = ['#6d8c4a', '#7fa257', '#5f7d42', '#8ea962', '#75954e'];
      for (var i = 0; i < 210; i++) {
        var x3 = 24 + Math.random() * 208, y3 = 24 + Math.random() * 208;
        var dx3 = (x3 - 128) / 128, dy3 = (y3 - 128) / 128;
        if (dx3 * dx3 + dy3 * dy3 > 0.9) continue;
        g.globalAlpha = 0.82 + Math.random() * 0.18;
        g.fillStyle = cols2[(Math.random() * cols2.length) | 0];
        g.beginPath();
        g.ellipse(x3, y3, 6 + Math.random() * 11, 4 + Math.random() * 8, Math.random() * 3.14, 0, 6.283);
        g.fill();
        if (Math.random() < 0.55) {
          g.globalAlpha = 0.42;
          g.fillStyle = '#c9d98a';
          g.beginPath();
          g.ellipse(x3 - 2, y3 - 3, 2 + Math.random() * 3, 1.5 + Math.random() * 2, 0, 0, 6.283);
          g.fill();
        }
      }
      return new THREE.CanvasTexture(c);
    })();
    var trunkMatC = new THREE.MeshStandardMaterial({ map: barkTexC, roughness: 0.95 });
    var leafMatC = new THREE.MeshStandardMaterial({ map: leafTexC, side: THREE.DoubleSide, roughness: 0.9 });
    /* CÂY 3D THẬT: thân + 2 cành, tán = 4 cụm lá quấn hình cầu — nhìn từ hướng nào cũng là cây */
    var tree3DTrunkGeo = (function () {
      var parts = [];
      var tk = new THREE.CylinderGeometry(0.055, 0.12, 1.05, 7);
      tk.translate(0, 0.5, 0);
      parts.push({ geo: tk, matrix: new THREE.Matrix4() });
      var br1 = new THREE.CylinderGeometry(0.02, 0.042, 0.46, 5);
      br1.translate(0, 0.23, 0);
      parts.push({ geo: br1, matrix: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, 0.4, 0.6)).setPosition(0, 0.6, 0) });
      var br2 = new THREE.CylinderGeometry(0.018, 0.038, 0.4, 5);
      br2.translate(0, 0.2, 0);
      parts.push({ geo: br2, matrix: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.5, 2.6, -0.55)).setPosition(-0.03, 0.72, 0.02) });
      var br3 = new THREE.CylinderGeometry(0.014, 0.032, 0.34, 5); br3.translate(0,0.17,0);
      parts.push({geo:br3,matrix:new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-.45,4.1,.48)).setPosition(.01,.82,-.025)});
      var br4 = new THREE.CylinderGeometry(0.012, 0.029, 0.3, 5); br4.translate(0,0.15,0);
      parts.push({geo:br4,matrix:new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(.4,5.4,-.42)).setPosition(.02,.88,.035)});
      return mergeGeos(parts);
    })();
    var tree3DLeafGeo = (function () {
      /* Real volume, not crossing billboard planes: rounded low-poly leaf clusters keep a tree-like silhouette from every camera angle. */
      var parts = [], leaf = new THREE.IcosahedronGeometry(1, 1);
      var nPer = LOW ? 19 : 28;
      var puffs = [[0,1.04,0,.36],[.21,.9,.1,.26],[-.2,.92,-.12,.27],[.02,1.18,-.04,.21]];
      for (var pi3=0;pi3<puffs.length;pi3++) {
        var pc=puffs[pi3];
        for (var k3=0;k3<nPer;k3++) {
          var th3=Math.random()*6.283, ph3=Math.acos(2*Math.random()-1);
          var rr3=pc[3]*(0.68+Math.random()*.34);
          var ox=Math.sin(ph3)*Math.cos(th3)*rr3, oy=Math.cos(ph3)*rr3*.78, oz=Math.sin(ph3)*Math.sin(th3)*rr3;
          var m3=new THREE.Matrix4().compose(
            new THREE.Vector3(pc[0]+ox,pc[1]+oy,pc[2]+oz),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random()*3.14,Math.random()*3.14,Math.random()*3.14)),
            new THREE.Vector3(.075+Math.random()*.055,.055+Math.random()*.05,.07+Math.random()*.055)
          );
          parts.push({geo:leaf,matrix:m3});
        }
      }
      return mergeGeos(parts);
    })();
    var canopyGeoC = new THREE.PlaneGeometry(1, 1);
    /* Mixed silhouettes: layered evergreen + broad and flowering crowns. */
    var pineGeoC = new THREE.ConeGeometry(0.42, 0.72, 8);
    var pineMatC = new THREE.MeshStandardMaterial({ color: 0x31583e, roughness: 0.92, flatShading: true });
    var springMatC = new THREE.MeshStandardMaterial({ map: leafTexC, color: 0x9aa66b, side: THREE.DoubleSide, roughness: 0.9 });
    var bloomMatC = new THREE.MeshStandardMaterial({ map: leafTexC, color: 0xc58c7d, side: THREE.DoubleSide, roughness: 0.9 });
    var shadowMatC = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: 0.3, depthWrite: false });
    /* đồng bộ cao độ landmark theo WORLD-frame (terrain tile tính từ world sau xoay) */
    var lmSync = [];
    /* CÂY CỔ THỤ landmark (7, −20): to gấp rưỡi, đá quấn gốc — điểm nhìn xa nhận ra */
    (function () {
      var gx6 = 7, gz6 = -20, gy6 = hillY(gx6, gz6);
      var gG = window.__REAL_ASSETS ? window.__REAL_ASSETS.makeModel('broadleaf', { height: 12 }) : new THREE.Group();
      gG.userData.isBigTree = true;
      gG.position.set(gx6, gy6 - 0.05, gz6);
      lmSync.push(gG);
      gG.rotation.y = 1.1;
      gardenRoot.add(gG);
      for (var ri6 = 0; ri6 < 6; ri6++) {
        var rs6 = new THREE.Mesh(stoneGeoC, ri6 % 2 ? stoneMatC : stoneMatC2);
        var rsc6 = 0.22 + Math.random() * 0.14;
        rs6.scale.set(rsc6, rsc6 * 0.7, rsc6);
        var ra6 = ri6 / 6 * 6.283;
        rs6.position.set(gx6 + Math.cos(ra6) * 1.35, gy6 - 0.10, gz6 + Math.sin(ra6) * 1.35);
        rs6.rotation.y = Math.random() * 6.283;
        gardenRoot.add(rs6);
      }
      var shG6 = new THREE.Mesh(new THREE.CircleGeometry(1, 16), shadowMatC);
      shG6.rotation.x = -Math.PI / 2;
      shG6.scale.set(2.1, 2.1, 1);
      shG6.position.set(gx6, gy6 + 0.015, gz6);
      gardenRoot.add(shG6);
    })();
    /* GIẾNG ĐÁ CỔ landmark (−8, −24): vòng đá + 2 trụ + mái nhỏ + xô treo */
    (function () {
      var wx6 = -10.5, wz6 = -27, wy6 = hillY(wx6, wz6);
      var wellG = new THREE.Group();
      var stoneW6 = new THREE.MeshStandardMaterial({ color: 0x7b7364, roughness: 0.96, flatShading: true });
      var woodW6 = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.85 });
      var ring6 = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.55, 14, 1, true), stoneW6);
      ring6.position.y = 0.27;
      wellG.add(ring6);
      var holeW6 = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14), new THREE.MeshBasicMaterial({ color: 0x0a0d12 }));
      holeW6.rotation.x = -Math.PI / 2;
      holeW6.position.y = 0.53;
      wellG.add(holeW6);
      for (var wi6 = 0; wi6 < 8; wi6++) {
        var ws6 = new THREE.Mesh(stoneGeoC, stoneW6);
        var wsc6 = 0.09 + Math.random() * 0.05;
        ws6.scale.set(wsc6, wsc6 * 0.5, wsc6 * 0.8);
        var wa6 = wi6 / 8 * 6.283;
        ws6.position.set(Math.cos(wa6) * 0.65, 0.56, Math.sin(wa6) * 0.65);
        wellG.add(ws6);
      }
      var p1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.35, 0.09), woodW6);
      p1.position.set(-0.55, 1.1, 0);
      var p2 = p1.clone(); p2.position.x = 0.55;
      wellG.add(p1, p2);
      var rf1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.75), woodW6);
      rf1.rotation.z = 0.38; rf1.position.set(-0.26, 1.86, 0);
      var rf2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.75), woodW6);
      rf2.rotation.z = -0.38; rf2.position.set(0.26, 1.86, 0);
      wellG.add(rf1, rf2);
      var axle6 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 8), woodW6);
      axle6.rotation.z = Math.PI / 2;
      axle6.position.y = 1.42;
      wellG.add(axle6);
      var rope6 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 5), new THREE.MeshStandardMaterial({ color: 0xa89070, roughness: 1 }));
      rope6.position.y = 1.1;
      wellG.add(rope6);
      var bkt6 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.085, 0.14, 10, 1, true), woodW6);
      bkt6.position.y = 0.74;
      wellG.add(bkt6);
      wellG.userData.isWell = true;
      wellG.position.set(wx6, wy6, wz6);
      lmSync.push(wellG);
      wellG.rotation.y = 0.5;
      gardenRoot.add(wellG);
      var shW6 = new THREE.Mesh(new THREE.CircleGeometry(1, 14), shadowMatC);
      shW6.rotation.x = -Math.PI / 2;
      shW6.scale.set(0.95, 0.95, 1);
      shW6.position.set(wx6, wy6 + 0.015, wz6);
      gardenRoot.add(shW6);
    })();
    var treePhotoTexC = new THREE.TextureLoader().load(TXT.treePhoto);
    treePhotoTexC.anisotropy = 4;
    treePhotoTexC.encoding = THREE.sRGBEncoding;
    var treePhotoMatsC = [0xffffff, 0xf7efdd, 0xe7f1e2].map(function (cT) {
      return new THREE.MeshBasicMaterial({ map: treePhotoTexC, transparent: true, alphaTest: 0.32, side: THREE.DoubleSide, depthWrite: false, fog: true, color: cT, toneMapped: false });
    });
    /* ---- decor map: đường đất / bụi cây / hang thỏ / nấm sáng ---- */
    var dirtTexC = (function () {
      var c = document.createElement('canvas'); c.width = c.height = 64;
      var x = c.getContext('2d');
      x.fillStyle = '#6f5638'; x.fillRect(0, 0, 64, 64);
      for (var i = 0; i < 260; i++) {
        var g = 66 + (Math.random() * 40 | 0);
        x.fillStyle = 'rgba(' + g + ',' + (g * 0.78 | 0) + ',' + (g * 0.55 | 0) + ',' + (0.25 + Math.random() * 0.5).toFixed(2) + ')';
        x.fillRect(Math.random() * 64, Math.random() * 64, 1 + Math.random() * 2.5, 1 + Math.random() * 1.6);
      }
      for (var j = 0; j < 26; j++) {
        x.fillStyle = 'rgba(42,30,19,' + (0.3 + Math.random() * 0.35).toFixed(2) + ')';
        x.beginPath(); x.arc(Math.random() * 64, Math.random() * 64, 1 + Math.random() * 2, 0, 6.283); x.fill();
      }
      return new THREE.CanvasTexture(c);
    })();
    dirtTexC.wrapS = dirtTexC.wrapT = THREE.RepeatWrapping;
    var dirtMatC = new THREE.MeshLambertMaterial({ map: dirtTexC, color: 0x8f8174 });
    var pebbleMatC = new THREE.MeshLambertMaterial({ color: 0x5b5148 });
    var bushGeoC = new THREE.SphereGeometry(1, 7, 5);
    var ringGeoC = new THREE.RingGeometry(0.52, 0.98, 20);
    var holeGeoC = new THREE.CircleGeometry(0.6, 20);
    var holeMatC = new THREE.MeshBasicMaterial({ color: 0x140d08 });
    var mushStemGeoC = new THREE.CylinderGeometry(0.035, 0.052, 0.22, 7);
    var mushStemMatC = new THREE.MeshLambertMaterial({ color: 0xe6d9bf });
    var mushCapGeoC = new THREE.SphereGeometry(1, 9, 6, 0, 6.283, 0, 1.55);
    var mushCapMatA = new THREE.MeshLambertMaterial({ color: 0xb3573a, emissive: 0x5a2a12, emissiveIntensity: 0.55 });
    var mushCapMatB = new THREE.MeshLambertMaterial({ color: 0x77a06b, emissive: 0x2f5a3d, emissiveIntensity: 0.8 });
    var flowerPalC = [0xd98f6a, 0xe0b087, 0xdba27c, 0xead9be, 0xc97759, 0xe6c79a];
    var headMatC = flowerPalC.map(function (c) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }); });
    var stemMatC = new THREE.MeshStandardMaterial({ color: 0x6d7c46, roughness: 0.8 });
    function mulb(seed) {
      return function () {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        var q = Math.imul(seed ^ seed >>> 15, 1 | seed);
        q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q;
        return ((q ^ q >>> 14) >>> 0) / 4294967296;
      };
    }
    function buildChunk(cx, cz) {
      var rng = mulb(cx * 7349 + cz * 9151 + 13);
      var grp = new THREE.Group();
      var bx = cx * CHSZ, bz = cz * CHSZ; /* góc chunk */
      var midX = bx + CHSZ / 2, midZ = bz + CHSZ / 2;
      var region = window.__REGION ? window.__REGION.at(midX, midZ) : 'meadow';
      var chunkBodies = [];
      /* đất: tile 4×4 vertex uốn theo hillY — đúng địa hình trung tâm */
      var gg = new THREE.PlaneGeometry(CHSZ + 0.8, CHSZ + 0.8, 13, 13);
      gg.rotateX(-Math.PI / 2);
      var gp2 = gg.attributes.position, gc2 = new Float32Array(gp2.count * 3);
      var gt2 = new THREE.Color();
      var uv2 = gg.attributes.uv;
      for (var vi = 0; vi < gp2.count; vi++) {
        var wx = bx + gp2.getX(vi) + CHSZ / 2, wz = bz + gp2.getZ(vi) + CHSZ / 2;
        /* đá TOẢN BỘ vertex sang world: tile nằm đúng chunk (trước đây X/Z local → cả dống chôn ở gốc!) */
        gp2.setX(vi, wx);
        gp2.setZ(vi, wz);
        /* trừ 1.2cm trong vòng đè sân trung tâm: hết z-fight, sân gốc vẫn thắng ở giữa */
        gp2.setY(vi, hillY(wx, wz) - (Math.sqrt(wx * wx + wz * wz) < 31 ? 0.012 : 0));
        terrainColor(wx, wz, gt2);
        var sh2 = 0.93 + 0.07 * Math.sin(wx * 2.1) * Math.cos(wz * 1.7);
        gc2[vi * 3] = gt2.r * sh2; gc2[vi * 3 + 1] = gt2.g * sh2; gc2[vi * 3 + 2] = gt2.b * sh2;
      }
      /* UV dùng cùng hệ world 60m như thảm cỏ gốc: không đổi mật độ/màu tại ranh giới chunk. */
      for (var ui2 = 0; ui2 < uv2.count; ui2++) {
        var uvwx = gp2.getX(ui2), uvwz = gp2.getZ(ui2);
        uv2.setXY(ui2, (uvwx + 30) / 60, (uvwz + 30) / 60);
      }
      gg.setAttribute('color', new THREE.BufferAttribute(gc2, 3));
      gg.computeVertexNormals();
      var tile = new THREE.Mesh(gg, groundMat);
      tile.receiveShadow = !LOW;
      grp.add(tile);
      var coastD = (window.__REGION && window.__REGION.coastDist) ? window.__REGION.coastDist(midX, midZ) : 99;
      var inOcean = region === 'ocean' || coastD < -0.5;
      var isDryRock = region === 'r03' || region === 'r05' || region === 'r06' || region === 'r07';
      /* cỏ instanced: mật độ theo 8 hệ sinh thái Đại Việt; ngoài biển không mọc cỏ */
      var grassDensity = inOcean ? 0 : (region === 'r06' ? 0.12 : (region === 'r03' || region === 'r05' ? 0.28 : (region === 'r02' || region === 'r04' ? 0.88 : 1)));
      var nB2 = inOcean ? 0 : Math.max(10, Math.round((LOW ? 36 : 64) * grassDensity));
      var grassI = new THREE.InstancedMesh(bladeGeo, bladeMat, Math.max(1, nB2));
      var blades = [];
      for (var bi = 0; bi < nB2; bi++) {
        var gx2 = bx + rng() * CHSZ, gz2 = bz + rng() * CHSZ;
        for (var gr2 = 0; gr2 < 10 && (onPathW(gx2, gz2, 1.3) || lakeDepth(gx2, gz2) > 0.07); gr2++) { gx2 = bx + rng() * CHSZ; gz2 = bz + rng() * CHSZ; }
        if (lakeDepth(gx2, gz2) > 0.07 || Math.hypot(gx2,gz2)<10.0) continue;
        if (window.__REGION && window.__REGION.coastDist && window.__REGION.coastDist(gx2, gz2) < 1.8) continue;
        var tall = rng() < 0.12;
        blades.push({ x: gx2, y: hillY(gx2, gz2) - 0.01, z: gz2, yaw: rng() * 6.283, s: tall ? 1.35 + rng() * 0.5 : 0.55 + rng() * 0.7, sx: 0.75 + rng() * 0.55, sy: 0.62 + rng() * 0.6, phase: rng() * 6.283, amp: 0.07 + rng() * 0.11 });
      }
      grassI.userData.blades = blades;
      if (window.__REAL_ASSETS) window.__REAL_ASSETS.replaceInstanced('grass', grassI, blades.length);
      if (blades.length > 0) grp.add(grassI);
      /* hoa dại (đăng ký để nhiệm vụ hái hoa) + đá xác định theo seed */
      var arrF2 = [];
      var flowerBase = inOcean ? 0 : (region === 'r01' || region === 'r08' ? 4 : (region === 'r02' || region === 'r04' ? 2 : 0));
      var flowerRange = inOcean ? 0 : (region === 'r01' ? 7 : (isDryRock ? 1 : 3));
      var nf2 = flowerBase + (rng() * flowerRange | 0);
      for (var fi = 0; fi < nf2; fi++) {
        var fx = bx + rng() * CHSZ, fz = bz + rng() * CHSZ;
        for (var fr2 = 0; fr2 < 10 && (onPathW(fx, fz, 1.15) || nearDen(fx, fz, 3.2) || Math.hypot(fx-0.4,fz-6.8)<2.3 || lakeDepth(fx, fz) > 0.1); fr2++) { fx = bx + rng() * CHSZ; fz = bz + rng() * CHSZ; }
        if (lakeDepth(fx, fz) > 0.1) continue;
        if (window.__REGION && window.__REGION.coastDist && window.__REGION.coastDist(fx, fz) < 2.5) continue;
        var fy = hillY(fx, fz);
        var wfg = window.__REAL_ASSETS ? window.__REAL_ASSETS.makeModel('flower', 0.42) : new THREE.Group();
        wfg.position.set(fx, fy - 0.01, fz);
        wfg.rotation.y = rng() * 6.283;
        grp.add(wfg);
        arrF2.push({ h: wfg, s: wfg });
      }
      /* cây: phân bố theo 8 khu vực Đại Việt */
      var treeChance = inOcean ? 0 : (region === 'r02' || region === 'r04' ? 0.92 : (region === 'r01' ? 0.58 : (region === 'r05' ? 0.42 : (region === 'r07' ? 0.35 : 0.10))));
      var nTr = rng() < treeChance ? ((region === 'r02' || region === 'r04') && rng() < 0.42 ? 2 : 1) : 0;
      var treeAdded = 0, treesArr = [];
      for (var ti2 = 0; ti2 < nTr; ti2++) {
        var tx2 = bx + rng() * CHSZ, tz2 = bz + rng() * CHSZ;
        var ppTree=window.__playerPos?ppL():null;
        if (onPathW(tx2, tz2, 2.0) || nearDen(tx2, tz2, 3.6) || lakeDepth(tx2, tz2) > 0.08
          || Math.hypot(tx2 - 26, tz2 - 9) < 5.5 || Math.hypot(tx2 + 10.5, tz2 + 27) < 4.5 || Math.hypot(tx2 - 7, tz2 + 20) < 4.5
          || Math.hypot(tx2-.4,tz2-6.8)<11 || (ppTree&&Math.hypot(tx2-ppTree.x,tz2-ppTree.z)<10)) continue;
        if (window.__REGION && window.__REGION.coastDist && window.__REGION.coastDist(tx2, tz2) < 3.0) continue;
        var ty2 = hillY(tx2, tz2);
        if (ty2 < -0.25) continue;
        var tsc = region === 'r02' ? 2.25 + rng() * 1.2 : (region === 'r05' ? 1.5 + rng() * 0.9 : (region === 'r03' || region === 'r06' ? 0.9 + rng() * 0.5 : 1.35 + rng() * 0.85));
        var treeKind = region === 'r05' ? rng() * 0.22
          : (region === 'r02' ? 0.4 + rng() * 0.6 : (region === 'r04' ? 0.55 + rng() * 0.45 : rng()));
        var treeName = treeKind < 0.24 ? 'pine' : (treeKind < 0.39 ? 'blossom' : (treeKind < 0.55 ? 'broadleaf' : (treeKind < 0.7 ? 'kTreeDetailed' : (treeKind < 0.85 ? 'kTreeDefault' : (treeKind < 0.94 ? 'kTreeFat' : 'kTreeCone')))));
        var treeG = window.__REAL_ASSETS ? window.__REAL_ASSETS.makeModel(treeName, { height: tsc * 4.4 }) : new THREE.Group();
        treeG.userData.isTree3D = true;
        treeG.userData.species = treeName;
        var lf3 = treeG;
        treeG.position.set(tx2, ty2 - 0.04, tz2);
        treeG.rotation.y = rng() * 6.283;
        treeG.rotation.z = (rng() - 0.5) * 0.06;
        grp.add(treeG); treeAdded++; treesArr.push({ g: treeG, leaf: lf3, x: tx2, z: tz2 });
        if (window.__physicsAddStatic) chunkBodies.push(window.__physicsAddStatic(tx2, tz2, Math.max(0.18, tsc * 0.12), tsc * 1.4));
        var shC = new THREE.Mesh(new THREE.CircleGeometry(1, 14), shadowMatC);
        shC.rotation.x = -Math.PI / 2;
        shC.scale.set(tsc * 0.42, tsc * 0.42, 1);
        shC.position.set(tx2, ty2 + 0.015, tz2);
        grp.add(shC);
      }
      /* props thật theo 8 khu vực Đại Việt */
      var props = [];
      if (region === 'r01') props = [['bench', 0.35, 0.55], ['sign', 0.3, 0.5], ['bush', 0.8, 0.8], ['fern', 0.65, 0.6], ['campfire', 0.1, 1.2]];
      else if (region === 'r02') props = [['log', 0.7, 0.9], ['kLog', 0.5, 1.1], ['shroom', 0.6, 0.5], ['fern', 0.85, 0.7], ['kBush', 0.6, 0.9], ['kCliff', 0.35, 2.2]];
      else if (region === 'r03') props = [['cliff', 0.35, 2.4], ['kCliff', 0.5, 2.0], ['kopje', 0.32, 2.0], ['kRockA', 0.65, 1.2], ['thorn', 0.5, 0.5], ['pillar', 0.25, 1.6]];
      else if (region === 'r04') props = [['pondStone', 0.9, 0.5], ['cattailClump', 0.95, 0.75], ['reedClump', 0.8, 0.6], ['ruins', 0.15, 2.2], ['log', 0.4, 0.9]];
      else if (region === 'r05') props = [['kRockC', 0.55, 1.2], ['erratic', 0.5, 0.9], ['pillar', 0.28, 1.5], ['runeStone', 0.25, 0.8]];
      else if (region === 'r06') props = [['kRockA', 0.7, 1.4], ['kCliff', 0.45, 2.2], ['erratic', 0.6, 1.1], ['campfire', 0.25, 1.3]];
      else if (region === 'r07') props = [['kCliff', 0.45, 2.2], ['kopje', 0.35, 2.0], ['fern', 0.7, 0.65], ['shroom', 0.6, 0.5], ['pondStone2', 0.6, 0.5]];
      else if (region === 'r08') props = [['pillar', 0.35, 1.6], ['runeStone', 0.35, 0.9], ['bush', 0.6, 0.7]];
      var maxDepth = region === 'r04' ? 0.5 : 0.1;
      for (var pi = 0; pi < props.length && !inOcean; pi++) {
        if (rng() > props[pi][1]) continue;
        var px2 = bx + rng() * CHSZ, pz2 = bz + rng() * CHSZ;
        if (onPathW(px2, pz2, 1.7) || nearDen(px2, pz2, 3.4) || lakeDepth(px2, pz2) > maxDepth) continue;
        if (window.__REGION && window.__REGION.coastDist && window.__REGION.coastDist(px2, pz2) < 1.5) continue;
        if (Math.hypot(px2 - 0.4, pz2 - 6.8) < 3.2 || Math.hypot(px2 - 26, pz2 - 9) < 5.2 || Math.hypot(px2 + 10.5, pz2 + 27) < 5 || Math.hypot(px2 - 7, pz2 + 20) < 5) continue;
        var pm = window.__REAL_ASSETS ? window.__REAL_ASSETS.makeModel(props[pi][0], props[pi][2]) : new THREE.Group();
        pm.position.set(px2, hillY(px2, pz2) - 0.03, pz2);
        pm.rotation.y = rng() * 6.283;
        grp.add(pm);
      }
      var ns2 = inOcean ? 0 : (isDryRock ? 4 + (rng() * 5 | 0) : (region === 'r01' ? 3 + (rng() * 4 | 0) : (rng() * 3 | 0)));
      for (var si = 0; si < ns2; si++) {
        var sx2 = bx + rng() * CHSZ, sz2 = bz + rng() * CHSZ;
        for (var sr2 = 0; sr2 < 5 && (onPathW(sx2, sz2, 1.5) || nearDen(sx2, sz2, 3.2) || lakeDepth(sx2, sz2) > 0.12); sr2++) { sx2 = bx + rng() * CHSZ; sz2 = bz + rng() * CHSZ; }
        if (Math.hypot(sx2 + 10.5, sz2 + 27) < 4.5 || Math.hypot(sx2 - 7, sz2 + 20) < 4.5
          || Math.hypot(sx2 - 26, sz2 - 9) < 4.8 || Math.hypot(sx2 - 0.4, sz2 - 6.8) < 2.5) continue;
        var bigRock = rng() < (region === 'canyon' ? 0.6 : (region === 'meadow' ? 0.22 : 0.12));
        var rw2 = bigRock ? (region === 'canyon' ? 0.65 + rng() * 0.85 : 0.42 + rng() * 0.5) : 0.18 + rng() * 0.22;
        var st3 = new THREE.Mesh(stoneGeoC, regionStone(region, rng() < 0.5));
        st3.scale.set(rw2, rw2 * (0.8 + rng() * 0.5), rw2 * (0.85 + rng() * 0.3));
        st3.position.set(sx2, hillY(sx2, sz2) + st3.scale.y * 0.38, sz2);
        st3.rotation.set((rng() - 0.5) * 0.24, rng() * 6.283, (rng() - 0.5) * 0.24);
        grp.add(st3);
        if (window.__physicsAddStatic) chunkBodies.push(window.__physicsAddStatic(sx2, sz2, rw2 * 0.72, Math.max(0.6, st3.scale.y * 2)));
      }
      /* ---- ĐƯỜNG ĐẤT: các viên đất chồng dọc pathZ — liền mạch giữa các chunk ---- */
      for (var pxi = 0, sxp = bx - 0.5; sxp < bx + CHSZ + 0.5; pxi++, sxp += 0.82) {
        var pzp = pathZ(sxp);
        if (pzp < bz - 1.4 || pzp > bz + CHSZ + 1.4 || lakeDepth(sxp,pzp) > 0.12) continue;
        var wob = Math.sin(sxp * 1.7) * 0.14 + Math.sin(sxp * 0.9 + 3) * 0.09;
        var pwid = 1.75 + Math.sin(sxp * 0.5 + 1) * 0.4;
        var pm = new THREE.Mesh(canopyGeoC, dirtMatC);
        pm.rotation.x = -Math.PI / 2;
        pm.rotation.z = (rng() - 0.5) * 0.14;
        pm.scale.set(pwid * (0.95 + rng() * 0.14), 1.62, 1);
        pm.position.set(sxp + wob, hillY(sxp + wob, pzp) + 0.016 + pxi * 0.0012, pzp);
        grp.add(pm);
        if (rng() < 0.45) { /* sỏi ven đường: nhỏ, xám nâu, nằm RA NGOÀI mép đất */
          var sgp = new THREE.Mesh(stoneGeoC, pebbleMatC);
          var side = rng() < 0.5 ? -1 : 1;
          var sxs = sxp + wob + side * (pwid / 2 + 0.35 + rng() * 0.5), szs = pzp + (rng() - 0.5) * 0.6;
          sgp.scale.set(0.035 + rng() * 0.04, 0.022 + rng() * 0.025, 0.035 + rng() * 0.04);
          sgp.position.set(sxs, hillY(sxs, szs) + sgp.scale.y * 0.4, szs);
          sgp.rotation.y = rng() * 6.283;
          grp.add(sgp);
        }
      }
      /* ---- BÔNG LAU: thân mảnh + cụm bông trắng (gió thổi bay được) ---- */
      if (Math.sqrt(midX * midX + midZ * midZ) > 15 && rng() < 0.2) {
        var nCt = 2 + (rng() * 3 | 0);
        for (var ci2 = 0; ci2 < nCt; ci2++) {
          var cxx = bx + rng() * CHSZ, czz = bz + rng() * CHSZ;
          if (onPathW(cxx, czz, 1.4) || nearDen(cxx, czz, 3.4) || lakeDepth(cxx, czz) > 0.08) continue;
          var cyx = hillY(cxx, czz);
          var chH = 0.55 + rng() * 0.35;
          var csM = new THREE.Mesh(cottonStemGeoC, cottonStemMatC);
          csM.scale.set(1, chH, 1);
          csM.position.set(cxx, cyx + chH / 2, czz);
          grp.add(csM);
          var nB2 = 3 + (rng() * 3 | 0);
          for (var cb2 = 0; cb2 < nB2; cb2++) {
            var cbb = new THREE.Mesh(cottonGeoC, cottonMatC);
            var cbs = 0.045 + rng() * 0.03;
            cbb.scale.setScalar(cbs);
            cbb.position.set(cxx + (rng() - 0.5) * 0.14, cyx + chH + (rng() - 0.3) * 0.1, czz + (rng() - 0.5) * 0.14);
            gardenRoot.add(cbb);
            cottons.push({ m: cbb, ph: rng() * 6.283, sp: rng(), baseY: cbb.position.y, free: false, ready: elapsed + 8 + rng() * 30, vx: 0, vz: 0, vy: 0, life: 6 });
          }
        }
      }
      /* ---- BỤI CÂY: 3-5 khối tán lá canvas chụm nhau ---- */
      var nBu = rng() < 0.32 ? 1 + (rng() * 2 | 0) : 0;
      for (var bi3 = 0; bi3 < nBu; bi3++) {
        var bxx = bx + rng() * CHSZ, bzz = bz + rng() * CHSZ;
        if (onPathW(bxx, bzz, 1.9) || nearDen(bxx, bzz, 3.6) || lakeDepth(bxx, bzz) > 0.08 || Math.hypot(bxx - 26, bzz - 9) < 4.5) continue;
        var bushG = new THREE.Group();
        var nb2 = 3 + (rng() * 3 | 0);
        for (var bi4 = 0; bi4 < nb2; bi4++) {
          var bsp = new THREE.Mesh(bushGeoC, leafMatC);
          var bs = 0.42 + rng() * 0.3;
          bsp.scale.set(bs, bs * 0.72, bs);
          bsp.position.set((rng() - 0.5) * 0.55, 0.3 + rng() * 0.22, (rng() - 0.5) * 0.55);
          bushG.add(bsp);
        }
        bushG.position.set(bxx, hillY(bxx, bzz), bzz);
        bushG.rotation.y = rng() * 6.283;
        grp.add(bushG);
        var shB = new THREE.Mesh(new THREE.CircleGeometry(1, 12), shadowMatC);
        shB.rotation.x = -Math.PI / 2;
        shB.scale.set(0.62, 0.62, 1);
        shB.position.set(bxx, hillY(bxx, bzz) + 0.015, bzz);
        grp.add(shB);
      }
      /* ---- HANG THỎ: 1 hang cố định (−18, 6): vòng đất, lỗ tối, đá quanh, nấm sáng ---- */
      var isDen = cx === -2 && cz === 0;
      if (isDen) {
        var dy0 = hillY(DEN_X, DEN_Z);
        var ringD = new THREE.Mesh(ringGeoC, dirtMatC);
        ringD.rotation.x = -Math.PI / 2;
        ringD.scale.set(1.5, 1.5, 1);
        ringD.position.set(DEN_X, dy0 + 0.03, DEN_Z);
        grp.add(ringD);
        var holeM = new THREE.Mesh(holeGeoC, holeMatC);
        holeM.scale.set(0.78, 0.78, 1);
        holeM.rotation.x = -Math.PI / 2;
        holeM.position.set(DEN_X, dy0 + 0.024, DEN_Z);
        grp.add(holeM);
        for (var mi2 = 0; mi2 < 6; mi2++) {
          var mAng = mi2 / 6 * 6.283 + 0.4;
          var mm = new THREE.Mesh(bushGeoC, stoneMatC);
          var ms = 0.34 + rng() * 0.26;
          mm.scale.set(ms, ms * 0.62, ms);
          mm.position.set(DEN_X + Math.cos(mAng) * (1.05 + rng() * 0.3), dy0 + ms * 0.35, DEN_Z + Math.sin(mAng) * (1.05 + rng() * 0.3));
          grp.add(mm);
        }
        for (var mf2 = 0; mf2 < 6; mf2++) {
          var fAng = mf2 / 6 * 6.283 + 0.9, fr3 = 1.25 + rng() * 0.6;
          var fxp = DEN_X + Math.cos(fAng) * fr3, fzp = DEN_Z + Math.sin(fAng) * fr3;
          var stM = new THREE.Mesh(mushStemGeoC, mushStemMatC);
          stM.position.set(fxp, dy0 + 0.11, fzp);
          grp.add(stM);
          var cpM = new THREE.Mesh(mushCapGeoC, mf2 % 2 ? mushCapMatA : mushCapMatB);
          var cs2 = 0.13 + rng() * 0.06;
          cpM.scale.set(cs2, cs2 * 0.75, cs2);
          cpM.position.set(fxp, dy0 + 0.2 + cs2 * 0.4, fzp);
          cpM.rotation.y = rng() * 6.283;
          grp.add(cpM);
        }
      }
      grp.userData = { cx: cx, cz: cz, midX: midX, midZ: midZ, grass: grassI, created: elapsed, hasTree: treeAdded > 0, den: isDen, trees: treesArr, flowers: arrF2, bodies: chunkBodies };
      gardenRoot.add(grp);
      chunkMap[cx + '|' + cz] = grp;
      chunkList.push(grp);
    }
    /* ---- SLIME hiền (sinh vật vô hại): thân mỏng trong, mắt hạt, nhảy chậm, chạm squish ---- */
    var slimes = [];
    window.__slimes = slimes;
    (function () {
      var slimePal = [{ body: 0xaee8c4, blush: 0x86c9a4 }, { body: 0xf4c2a4, blush: 0xe09a7e }];
      for (var si2 = 0; si2 < 2; si2++) {
        var palS = slimePal[si2];
        var sg2 = new THREE.Group();
        var bodyS = new THREE.Mesh(new THREE.SphereGeometry(0.37, 20, 14), new THREE.MeshPhysicalMaterial({ color: palS.body, roughness: 0.08, transparent: true, opacity: 0.56, clearcoat: 1.0, clearcoatRoughness: 0.08, sheen: 0.6, sheenColor: new THREE.Color(0xffffff), emissive: palS.body, emissiveIntensity: 0.07 }));
        bodyS.scale.set(1.02, 0.95, 1.02);
        bodyS.position.y = 0.35;
        sg2.add(bodyS);
        var shS = new THREE.Mesh(new THREE.CircleGeometry(0.37, 14), shadowMatC);
        shS.rotation.x = -Math.PI / 2; shS.position.y = 0.012;
        sg2.add(shS);
        /* mặt: mắt to lấp lánh + miệng cười cong + má hồng */
        var eyeGeoS = new THREE.SphereGeometry(0.06, 10, 8);
        var eyeMatS = new THREE.MeshBasicMaterial({ color: 0x22281e });
        var e1 = new THREE.Mesh(eyeGeoS, eyeMatS); e1.position.set(-0.145, 0.44, 0.315);
        var e2 = new THREE.Mesh(eyeGeoS, eyeMatS); e2.position.set(0.145, 0.44, 0.315);
        var glS = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        glS.position.set(-0.11, 0.49, 0.36);
        var glS2 = glS.clone(); glS2.position.set(0.18, 0.49, 0.36);
        var moS = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.011, 6, 10, 3.14), new THREE.MeshBasicMaterial({ color: 0x39423a }));
        moS.position.set(0, 0.325, 0.355); moS.rotation.z = Math.PI;
        var blGeoS = new THREE.CircleGeometry(0.038, 10);
        var blMatS = new THREE.MeshBasicMaterial({ color: palS.blush, transparent: true, opacity: 0.65 });
        var bl1 = new THREE.Mesh(blGeoS, blMatS); bl1.position.set(-0.225, 0.35, 0.285); bl1.rotation.y = 0.35;
        var bl2 = new THREE.Mesh(blGeoS, blMatS); bl2.position.set(0.225, 0.35, 0.285); bl2.rotation.y = -0.35;
        sg2.add(e1, e2, glS, glS2, moS, bl1, bl2);
        var sx0 = 3 + si2 * 10, sz0 = 12 + si2 * 17.5;
        sg2.position.set(sx0, hillY(sx0, sz0), sz0);
        gardenRoot.add(sg2);
        slimes.push({ g: sg2, body: bodyS, e1: e1, e2: e2, wx: sx0, wz: sz0, hopT: 0, hop: 1, dir: Math.random() * 6.283, squish: 0, blink: 2 + Math.random() * 3 });
      }
    })();
    function updateSlimes(dt) {
      var pp = ppL();
      if (!pp) return;
      var ppx3 = pp.x, ppz3 = pp.z;
      for (var i = 0; i < slimes.length; i++) {
        var S = slimes[i];
        var dxp = ppx3 - S.g.position.x, dzp = ppz3 - S.g.position.z;
        var dPlayer = Math.sqrt(dxp * dxp + dzp * dzp);
        if (dPlayer > 45) { S.g.position.set(ppx3 + 6 + Math.random() * 4, 0, ppz3 + 5 + Math.random() * 4); S.wx = S.g.position.x; S.wz = S.g.position.z; }
        if (dPlayer < 0.9 && S.squish <= 0) { S.squish = 0.7; if (window.__sfx) window.__sfx.chime(); }
        if (S.squish > 0) S.squish -= dt;
        S.hopT -= dt;
        if (S.hop >= 1 && S.hopT <= 0) {
          var ang = Math.random() * 6.283, r2 = 2.5 + Math.random() * 4;
          S.wx = ppx3 + Math.cos(ang) * r2;
          S.wz = ppz3 + Math.sin(ang) * r2;
          S.hopT = 1.2 + Math.random() * 2.2;
        }
        var dxw = S.wx - S.g.position.x, dzw = S.wz - S.g.position.z;
        var dw = Math.sqrt(dxw * dxw + dzw * dzw);
        if (dw > 0.15 && S.hopT < 1.4) {
          S.hop += dt * 0.85;
          S.g.position.x += dxw / dw * 0.45 * dt;
          S.g.position.z += dzw / dw * 0.45 * dt;
          S.g.position.y = hillY(S.g.position.x, S.g.position.z) + Math.abs(Math.sin(S.hop * 3.1416)) * 0.12;
          S.dir = Math.atan2(dxw, dzw);
        } else S.g.position.y = hillY(S.g.position.x, S.g.position.z);
        /* đứng gần: slime ngoảnh mặt nhìn người chơi (dễ thương) */
        if (dPlayer < 3.2) S.dir = Math.atan2(dxp, dzp);
        S.g.rotation.y += (S.dir - S.g.rotation.y) * Math.min(1, dt * 4);
        var sq = S.squish > 0 ? 1 - Math.sin(Math.min(1, S.squish / 0.7) * 3.1416) * 0.32 : 1;
        S.body.scale.y = 0.85 * sq;
        S.body.scale.x = S.body.scale.z = 1.05 + (1 - sq) * 0.2;
        S.blink -= dt;
        var bl = S.blink < 0.12 ? 0.12 : 1;
        S.e1.scale.y = S.e2.scale.y = bl;
        if (S.blink < 0) S.blink = 2.4 + Math.random() * 3.2;
      }
    }
    var camL = new THREE.Vector3(), ctrW = new THREE.Vector3(), fwdW = new THREE.Vector3();
    var frameN2 = 0;
    window.__chunkTick = function () {
      frameN2++;
      if (frameN2 % 12 === 0) {
        for (var li6 = 0; li6 < lmSync.length; li6++) {
          lmSync[li6].position.y = hillY(lmSync[li6].position.x, lmSync[li6].position.z) - 0.04;
        }
      }
      var nowR = performance.now();
      var dtR = rabbitLast ? Math.min(0.12, (nowR - rabbitLast) / 1000) : 0.016;
      rabbitLast = nowR;
      updateRabbits(dtR);
      updateKoi(dtR);
      updateLakeFx(dtR);
      updateNightAnim(dtR);
      updateShootingStar(dtR);
      updateFootFx(dtR);
      updateCotton(dtR);
      updateSlimes(dtR);
      updateDragonflies(dtR);
      updateLakeDress(dtR);
      updateUnderwater(dtR, elapsed);
      if (frameN2 % 3 === 0) {
        for (var tb2 = 0; tb2 < chunkList.length; tb2++) {
          var udT = chunkList[tb2].userData;
          if (!udT || !udT.trees) continue;
          for (var tc2 = 0; tc2 < udT.trees.length; tc2++) {
            var trT = udT.trees[tc2];
            if (trT.leaf) {
              trT.leaf.rotation.z = Math.sin(elapsed * 1.15 + trT.x * 1.7) * 0.032;
              trT.leaf.rotation.x = Math.cos(elapsed * 0.85 + trT.z * 1.3) * 0.026;
            }
          }
        }
      }
      gardenRoot.worldToLocal(camL.copy(camera.position));
      /* streaming: playable radius đã mở rộng; nạp chunk gần camera trước, an toàn bộ nhớ */
      var pcx = Math.floor(camL.x / CHSZ), pcz = Math.floor(camL.z / CHSZ);
      if (pcx !== lastGenCX || pcz !== lastGenCZ || genQueue.length === 0) {
        genQueue.length = 0; lastGenCX = pcx; lastGenCZ = pcz;
        for (var gx3 = pcx - 9; gx3 <= pcx + 9; gx3++) {
          for (var gz3 = pcz - 9; gz3 <= pcz + 9; gz3++) {
            var mx3 = gx3 * CHSZ + CHSZ / 2, mz3 = gz3 * CHSZ + CHSZ / 2;
            var dd3 = Math.hypot(mx3 - camL.x, mz3 - camL.z);
            var dO3 = Math.sqrt(mx3 * mx3 + mz3 * mz3);
            if (dO3 < CENTER_R || dd3 > GEN_R || chunkMap[gx3 + '|' + gz3]) continue;
            genQueue.push({ cx: gx3, cz: gz3, d: dd3 });
          }
        }
        genQueue.sort(function (a2, b2) { return a2.d - b2.d; });
      }
      var budget = LOW ? 3 : 5;
      while (genQueue.length && budget > 0 && chunkList.length < 76) {
        var nextChunk = genQueue.shift();
        if (!chunkMap[nextChunk.cx + '|' + nextChunk.cz]) buildChunk(nextChunk.cx, nextChunk.cz);
        budget--;
      }
      /* huỷ chunk xa: dispose geometry/instance buffer — bộ nhớ trả về */
      if (frameN2 % 150 === 0) {
        for (var ki = chunkList.length - 1; ki >= 0; ki--) {
          var ck = chunkList[ki];
          var kd = Math.sqrt(ck.userData.midX * ck.userData.midX + ck.userData.midZ * ck.userData.midZ);
          var kcam = Math.hypot(ck.userData.midX - camL.x, ck.userData.midZ - camL.z);
          if (kcam > KILL_R) {
            gardenRoot.remove(ck);
            if (window.__physicsRemoveStatic && ck.userData.bodies) ck.userData.bodies.forEach(window.__physicsRemoveStatic);
            ck.userData.grass.dispose();
            ck.children[0].geometry.dispose();
            delete chunkMap[ck.userData.cx + '|' + ck.userData.cz];
            chunkList.splice(ki, 1);
          }
        }
      }
      /* cull: ngoài frustum/tầm nhìn → visible=false (skipped hoàn toàn), cỏ ngừng lắc */
      camera.getWorldDirection(fwdW);
      var vis2 = 0;
      for (var ci3 = 0; ci3 < chunkList.length; ci3++) {
        var cc = chunkList[ci3];
        ctrW.set(cc.userData.midX, hillY(cc.userData.midX, cc.userData.midZ), cc.userData.midZ);
        gardenRoot.localToWorld(ctrW);
        var dc2 = ctrW.distanceTo(camera.position);
        var ok2 = dc2 < VIEW_R;
        if (ok2 && dc2 > 10) {
          ctrW.sub(camera.position).normalize();
          if (ctrW.dot(fwdW) < -0.18) ok2 = false;
        }
        cc.visible = ok2;
        if (!ok2) continue;
        vis2++;
        /* cỏ lắc bằng shader; CPU chỉ set matrix một lần lúc chunk sinh ra */
        var bl2 = cc.userData.grass.userData.blades, im2 = cc.userData.grass;
        if (!im2.userData.realReady) {
          for (var wi2 = 0; wi2 < bl2.length; wi2++) {
            var bd = bl2[wi2];
            dummyC.position.set(bd.x, bd.y, bd.z);
            dummyC.rotation.set(0, bd.yaw, 0);
            dummyC.scale.set(bd.s * bd.sx, bd.s * bd.sy, 1);
            dummyC.updateMatrix();
            im2.setMatrixAt(wi2, dummyC.matrix);
          }
          im2.instanceMatrix.needsUpdate = true;
          im2.userData.realReady = true;
        }
      }
      window.__chunkStats = { vis: vis2, total: chunkList.length };
    };
    window.__chunkStats = { vis: 0, total: 0 };
  })();

  if (window.__initCombat) window.__initCombat(gardenRoot);
  if (window.__initBoss) window.__initBoss(gardenRoot);
  if (window.__initWaterState) window.__initWaterState(gardenRoot);
  if (window.__initCampaign) window.__initCampaign(gardenRoot);
  if (window.__initMenu) window.__initMenu();
  window.__spawnBurstW = spawnBurst;
  window.__startleBird = function (i) { egrets[i].userData.startleE = elapsed; };
  bootStage('Vườn đã sẵn sàng', 'Hoa, cá, thỏ trắng và những tia nắng đầu tiên', 100);
  window.__bootOK = true;
  var bootSplash = document.getElementById('bootSplash');
  if (LOW) removeSplashWhenDrawn = bootSplash;
  else if (bootSplash) bootSplash.remove();
})();
