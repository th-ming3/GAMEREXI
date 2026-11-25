/* Cánh Đồng — campaign 28 nhiệm vụ theo catalog module 56. Tuần tự, có save. */
window.__initCampaign = function (gardenRoot) {
  if (window.__CAMPAIGN) return window.__CAMPAIGN;
  if (!gardenRoot) return null;

  var COLOR = {
    HOME: 0xd9b36c, MARSH: 0x5fbf9a, ROOT: 0x8fbf5f,
    WELL: 0xd98f5f, BANK: 0x5f9fbf, RIDGE: 0xbf5f8f
  };
  var NP = {
    tam: [-2.6, 4.2], baMan: [2.4, 7.8], hoa: [11.2, 12.6], lam: [6.4, -11.8]
  };
  function npcMk(id) { return { x: NP[id][0], z: NP[id][1], npc: id }; }
  function mk(x, z) { return { x: x, z: z }; }

  var QUESTS = [
    { id: 'Q-HOME-001', name: 'Nước đổi mùi', ch: 'HOME', reward: 20, objs: [
      { text: 'Quan sát 3 điểm ven hồ', marks: [mk(2, 13.5), mk(9, 20), mk(-1, 19)] },
      { text: 'Trao đổi với Tâm', marks: [npcMk('tam')] }
    ] },
    { id: 'Q-HOME-002', name: 'Dấu chân ngược dòng', ch: 'HOME', reward: 20, objs: [
      { text: 'Theo dấu ngược dòng', marks: [mk(-6, 2)] },
      { text: 'Báo Bà Mận', marks: [npcMk('baMan')] }
    ] },
    { id: 'Q-MARSH-01', name: 'Dấu lau ngược gió', ch: 'MARSH', reward: 20, objs: [
      { text: 'Khảo sát 3 bụi lau', marks: [mk(12, 22), mk(16, 25), mk(7, 24)] }
    ] },
    { id: 'Q-MARSH-02', name: 'Cầu nào còn nhớ', ch: 'MARSH', reward: 20, objs: [
      { text: 'Kiểm tra vết sửa cầu', marks: [mk(14, 16)] },
      { text: 'Giúp cư dân mắc kẹt', marks: [mk(17, 19)] }
    ] },
    { id: 'Q-MARSH-03', name: 'Hai vạch mực', ch: 'MARSH', reward: 20, objs: [
      { text: 'So thước đo cũ với mực nước', marks: [mk(10.5, 14)] }
    ] },
    { id: 'Q-MARSH-04', name: 'Van Trên', ch: 'MARSH', reward: 20, objs: [
      { text: 'Thử van THẤP/CAO rồi xác nhận', special: 'valve', need: 1, marks: [] }
    ] },
    { id: 'Q-MARSH-05', name: 'Mẹ Sậy', ch: 'MARSH', reward: 20, objs: [
      { text: 'Quan sát Mẹ Sậy', model: 'mesay', marks: [mk(13, 27)] },
      { text: 'Dọn 2 mối nguy gần Mẹ Sậy', special: 'haz', need: 1, marks: [] }
    ] },
    { id: 'Q-ROOT-01', name: 'Dấu khía trên thân', ch: 'ROOT', reward: 20, objs: [
      { text: 'So vết khía trên thân cây', marks: [mk(7, -20)] }
    ] },
    { id: 'Q-ROOT-02', name: 'Lối đi mọc ngược', ch: 'ROOT', reward: 20, objs: [
      { text: 'Dọn chướng ngại rễ', marks: [mk(-2, -14)] }
    ] },
    { id: 'Q-ROOT-03', name: 'Chim báo hay chim gọi', ch: 'ROOT', reward: 20, objs: [
      { text: 'Ghi nhận điểm chim', marks: [mk(12, -16)] }
    ] },
    { id: 'Q-ROOT-04', name: 'Gốc Lạc', ch: 'ROOT', reward: 0, objs: [
      { text: 'Đối đầu Gốc Lạc', special: 'gocrac', need: 1, marks: [] }
    ] },
    { id: 'Q-ROOT-05', name: 'Rễ có nhớ không', ch: 'ROOT', reward: 20, objs: [
      { text: 'Chọn cách chăm thử hoặc để sau', special: 'care', need: 1, marks: [] }
    ] },
    { id: 'Q-WELL-01', name: 'Ròng rọc và áp kế', ch: 'WELL', reward: 20, objs: [
      { text: 'Kiểm tra ròng rọc & áp kế', marks: [mk(-10.5, -27)] }
    ] },
    { id: 'Q-WELL-02', name: 'Hai van', ch: 'WELL', reward: 20, objs: [
      { text: 'Bật van A', marks: [mk(-12, -28.5)] },
      { text: 'Bật van B', marks: [mk(-9, -28.5)] }
    ] },
    { id: 'Q-WELL-03', name: 'Sổ bảo trì', ch: 'WELL', reward: 20, objs: [
      { text: 'Tìm 3 trang sổ', marks: [mk(-14, -24), mk(-8, -25), mk(-30, -10)] }
    ] },
    { id: 'Q-WELL-04', name: 'Người Gác Mạch', ch: 'WELL', reward: 0, objs: [
      { text: 'Đối đầu Người Gác Mạch', special: 'boss01', need: 1, marks: [] }
    ] },
    { id: 'Q-WELL-05', name: 'Đối chiếu sổ với người sống', ch: 'WELL', reward: 20, objs: [
      { text: 'Nói chuyện với cả 4 người', marks: [npcMk('tam'), npcMk('baMan'), npcMk('hoa'), npcMk('lam')] }
    ] },
    { id: 'Q-BANK-01', name: 'Nước lên tới hiên', ch: 'BANK', reward: 20, objs: [
      { text: 'Khảo sát 2 mái nhà', marks: [mk(18, 17), mk(22, 20)] }
    ] },
    { id: 'Q-BANK-02', name: 'Đắp tạm, đừng khóa lối', ch: 'BANK', reward: 20, objs: [
      { text: 'Đặt 3 rào tạm', marks: [mk(19, 19), mk(21, 22), mk(23, 18)] }
    ] },
    { id: 'Q-BANK-03', name: 'Kẻ Gõ Cửa', ch: 'BANK', reward: 20, objs: [
      { text: 'Chặn 3 Kẻ Gõ Cửa', special: 'wave', need: 1, marks: [] }
    ] },
    { id: 'Q-BANK-04', name: 'Đường cứu hộ', ch: 'BANK', reward: 20, objs: [
      { text: 'Cắm 3 mốc đường thoát', marks: [mk(16, 15), mk(20, 14), mk(24, 16)] }
    ] },
    { id: 'Q-BANK-05', name: 'Trạm đo', ch: 'BANK', reward: 20, objs: [
      { text: 'Hiệu chuẩn trạm đo', marks: [mk(26, 12)] }
    ] },
    { id: 'Q-RIDGE-01', name: 'Gió chỉ một hướng', ch: 'RIDGE', reward: 20, objs: [
      { text: 'Tới trạm đầu đồi', marks: [mk(-24, -8)] }
    ] },
    { id: 'Q-RIDGE-02', name: 'Ba trạm đo', ch: 'RIDGE', reward: 20, objs: [
      { text: 'Kích hoạt 3 trạm', marks: [mk(-27, -12), mk(-21, -14), mk(-25, -4)] }
    ] },
    { id: 'Q-RIDGE-03', name: 'Hai cửa', ch: 'RIDGE', reward: 20, objs: [
      { text: 'Xem trước các phương án', marks: [mk(-24, -10)], preview: true }
    ] },
    { id: 'Q-RIDGE-04', name: 'Hộ Mạch Nứt', ch: 'RIDGE', reward: 0, objs: [
      { text: 'Đối đầu Hộ Mạch Nứt', special: 'finalboss', need: 1, marks: [] }
    ] },
    { id: 'Q-RIDGE-05', name: 'Phân dòng', ch: 'RIDGE', reward: 20, objs: [
      { text: 'Chọn chính sách vận hành', special: 'policy', need: 1, marks: [] }
    ] },
    { id: 'Q-RIDGE-06', name: 'Trở lại', ch: 'RIDGE', reward: 120, objs: [
      { text: 'Trở về Trại Hồ', marks: [mk(0.4, 6.8)] }
    ] }
  ];

  var CS = { idx: 0, prog: {}, policy: null };
  try {
    var sv = JSON.parse(localStorage.getItem('canhdongCampaign'));
    if (sv && typeof sv.idx === 'number') {
      CS.idx = Math.max(0, Math.min(QUESTS.length - 1, sv.idx));
      CS.prog = sv.prog || {};
      CS.policy = sv.policy || null;
    }
  } catch (e) {}
  function save() { try { localStorage.setItem('canhdongCampaign', JSON.stringify(CS)); } catch (e) {} }

  var markerRoot = new THREE.Group();
  gardenRoot.add(markerRoot);
  var markers = [];
  var guardians = [];
  var foes = [];
  var props = [];
  var eCd = 0, atkCd = 0, lastKey = '', valveT0 = null;
  var tickT = 0;

  function hY(x, z) { return window.__hillY ? window.__hillY(x, z) : 0; }
  function localPlayer() {
    if (!window.__playerPos) return null;
    var p = new THREE.Vector3(window.__playerPos.x, 0, window.__playerPos.z);
    gardenRoot.worldToLocal(p);
    return p;
  }
  function d2(p, x, z) { return Math.hypot(p.x - x, p.z - z); }
  function toast(s) { if (window.__toast) window.__toast(s); }
  function addScore(n) { if (window.__addScore && n) window.__addScore(n); }
  function q() { return QUESTS[CS.idx]; }
  function oi() {
    var quest = q(); if (!quest) return 0;
    for (var i = 0; i < quest.objs.length; i++) {
      var need = quest.objs[i].need || quest.objs[i].marks.length || 1;
      if ((CS.prog[CS.idx + ':' + i] || 0) < need) return i;
    }
    return quest.objs.length - 1;
  }
  function objDone(i) {
    var ob = q().objs[i];
    return (CS.prog[CS.idx + ':' + i] || 0) >= (ob.need || ob.marks.length || 1);
  }
  function visited(i, mi) { return !!CS.prog['v' + CS.idx + ':' + i + ':' + mi]; }

  function clearGroup(group) {
    while (group.children.length) {
      var c = group.children[0];
      group.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
  }
  function rebuildMarkers() {
    clearGroup(markerRoot);
    markers.length = 0;
    var quest = q(); if (!quest) return;
    var i = oi(), ob = quest.objs[i];
    if (!ob || !ob.marks || objDone(i)) return;
    var col = COLOR[quest.ch] || 0xffffff;
    for (var mi = 0; mi < ob.marks.length; mi++) {
      if (visited(i, mi)) continue;
      var m = ob.marks[mi], y = hY(m.x, m.z);
      var beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 5.2, 10, 1, true),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
      );
      beam.position.set(m.x, y + 2.6, m.z);
      var ring = new THREE.Mesh(
        new THREE.RingGeometry(0.44, 0.62, 24),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(m.x, y + 0.06, m.z);
      markerRoot.add(beam); markerRoot.add(ring);
      markers.push({ beam: beam, ring: ring, x: m.x, z: m.z, npc: m.npc, oi: i, mi: mi, baseY: y + 2.6 });
    }
  }

  function makeGuardian(cfg) {
    var g = {
      name: cfg.name, x: cfg.x, z: cfg.z, hp: cfg.hp, maxHp: cfg.hp,
      state: 'IDLE', timer: 0, phase: 1, kind: cfg.kind, asset: cfg.asset,
      height: cfg.height, reward: cfg.reward || 0, dmg: cfg.dmg || 12,
      lastHit: -1e9, defeated: false, group: null
    };
    var model = window.__REAL_ASSETS ? window.__REAL_ASSETS.makeModel(cfg.asset, { height: cfg.height }) : new THREE.Group();
    model.position.set(cfg.x, hY(cfg.x, cfg.z), cfg.z);
    gardenRoot.add(model);
    g.group = model;
    guardians.push(g);
    return g;
  }
  function makeFoe(cfg) {
    var f = {
      name: cfg.name, x: cfg.x, z: cfg.z, hp: cfg.hp, alive: true,
      kind: cfg.kind, target: cfg.target || null, lastDmg: 0, group: null, ph: Math.random() * 6.28
    };
    var model = window.__REAL_ASSETS ? window.__REAL_ASSETS.makeModel(cfg.asset, { height: cfg.height }) : new THREE.Group();
    model.position.set(cfg.x, hY(cfg.x, cfg.z), cfg.z);
    gardenRoot.add(model);
    f.group = model;
    foes.push(f);
    return f;
  }

  function ensureSpawns() {
    var quest = q(); if (!quest) return;
    var i = oi(), ob = quest.objs[i];
    if (!ob) return;
    if (ob.model === 'mesay' && !props.length) {
      var m = window.__REAL_ASSETS ? window.__REAL_ASSETS.makeModel('guardian01', { height: 1.55 }) : new THREE.Group();
      m.position.set(13, hY(13, 27), 27);
      m.rotation.y = 0.5;
      gardenRoot.add(m); props.push(m);
    }
    if (ob.special === 'gocrac' && !guardians.some(function (g) { return g.kind === 'gocrac'; })) {
      makeGuardian({ name: 'Gốc Lạc', kind: 'gocrac', asset: 'guardian01', height: 2.9, x: 7, z: -22, hp: 10, dmg: 12, reward: 60 });
    }
    if (ob.special === 'finalboss' && !guardians.some(function (g) { return g.kind === 'finalboss'; })) {
      makeGuardian({ name: 'Hộ Mạch Nứt', kind: 'finalboss', asset: 'boss01', height: 4.3, x: -26, z: -6, hp: 16, dmg: 17, reward: 80 });
    }
    if (ob.special === 'haz' && !foes.some(function (f) { return f.kind === 'haz'; })) {
      makeFoe({ name: 'Mối nguy', kind: 'haz', asset: 'enemyMushroom', height: 0.85, x: 14.5, z: 26, hp: 2 });
      makeFoe({ name: 'Mối nguy', kind: 'haz', asset: 'enemyMushroom', height: 0.85, x: 12, z: 28, hp: 2 });
    }
    if (ob.special === 'wave' && !foes.some(function (f) { return f.kind === 'wave'; })) {
      makeFoe({ name: 'Kẻ Gõ Cửa', kind: 'wave', asset: 'enemyBoulder', height: 1.4, x: 20, z: 19, hp: 3, target: [20, 19] });
      makeFoe({ name: 'Kẻ Gõ Cửa', kind: 'wave', asset: 'enemyBoulder', height: 1.4, x: 22, z: 21, hp: 3, target: [21, 22] });
      makeFoe({ name: 'Kẻ Gõ Cửa', kind: 'wave', asset: 'enemyBoulder', height: 1.4, x: 24, z: 19, hp: 3, target: [23, 18] });
    }
  }

  function killGuardian(g) {
    g.hp = 0; g.defeated = true; g.state = 'DEFEATED'; g.group.visible = false;
    addScore(g.reward);
    toast(g.name + ' bị đánh bại' + (g.reward ? ' (+' + g.reward + ')' : ''));
  }

  function playerStrike() {
    var now = performance.now();
    if (now - atkCd < 450) return;
    var p = localPlayer(); if (!p) return;
    var best = null, bd = 3.4;
    guardians.forEach(function (g) {
      if (g.defeated) return;
      var d = d2(p, g.group.position.x, g.group.position.z);
      if (d < bd) { bd = d; best = { t: 'g', o: g }; }
    });
    foes.forEach(function (f) {
      if (!f.alive) return;
      var d = d2(p, f.group.position.x, f.group.position.z);
      if (d < bd) { bd = d; best = { t: 'f', o: f }; }
    });
    if (!best) return;
    atkCd = now;
    if (best.t === 'g') {
      best.o.hp -= best.o.state === 'RECOVER' ? 2 : 1;
      if (best.o.hp <= 0) killGuardian(best.o);
    } else {
      best.o.hp -= 1;
      if (best.o.hp <= 0) { best.o.alive = false; best.o.group.visible = false; }
    }
  }

  function completeObj() {
    var quest = q(); if (!quest) return;
    var i = oi();
    CS.prog[CS.idx + ':' + i] = quest.objs[i].need || quest.objs[i].marks.length || 1;
    var next = i + 1;
    var finished = next >= quest.objs.length;
    rebuildMarkers();
    if (!finished) {
      toast('Hoàn thành: ' + quest.objs[i].text);
    } else {
      addScore(quest.reward);
      if (quest.reward) toast('✔ ' + quest.id + ' — ' + quest.name + ' (+' + quest.reward + ')');
      else toast('✔ ' + quest.id + ' — ' + quest.name);
      if (CS.idx < QUESTS.length - 1) CS.idx++;
      else CS.idx = QUESTS.length - 1;
    }
    save();
  }
  function progressObj() {
    var quest = q(); if (!quest) return;
    var i = oi(), need = quest.objs[i].need || quest.objs[i].marks.length || 1;
    var key = CS.idx + ':' + i;
    CS.prog[key] = Math.min(need, (CS.prog[key] || 0) + 1);
    if (CS.prog[key] >= need) completeObj();
    else rebuildMarkers();
  }
  function completeQuestForce() {
    var quest = q(); if (!quest) return;
    if (CS.idx < QUESTS.length - 1) {
      addScore(quest.reward);
      toast('✔ ' + quest.id + ' — ' + quest.name);
      CS.idx++;
      save();
    }
    rebuildMarkers();
  }

  function openChoice(title, options) {
    var old = document.getElementById('campaignChoice');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var ov = document.createElement('div');
    ov.id = 'campaignChoice';
    ov.style.cssText = 'position:fixed;inset:0;z-index:120;display:flex;align-items:center;justify-content:center;background:rgba(20,26,22,.54)';
    var box = document.createElement('div');
    box.style.cssText = 'width:min(520px,88vw);padding:22px 24px;border-radius:16px;background:#fffaf0;color:#5f4626;font:15px/1.6 Georgia,serif;box-shadow:0 18px 50px rgba(0,0,0,.34);border:1px solid rgba(122,90,52,.3)';
    var h = document.createElement('div');
    h.style.cssText = 'font-weight:700;font-size:17px;margin-bottom:12px';
    h.textContent = title;
    box.appendChild(h);
    options.forEach(function (op) {
      var b = document.createElement('button');
      b.style.cssText = 'display:block;width:100%;margin-top:8px;padding:10px 14px;text-align:left;border:1px solid rgba(122,90,52,.3);border-radius:10px;background:#f4ead6;color:#5f4626;font:600 13.5px Georgia,serif;cursor:pointer';
      b.textContent = op.label;
      b.onclick = function () {
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        op.run();
      };
      box.appendChild(b);
    });
    ov.appendChild(box);
    document.body.appendChild(ov);
  }

  window.__CAMPAIGN_TRY_E = function () {
    var now = performance.now();
    if (now < eCd) return false;
    var quest = q(); if (!quest) return false;
    var i = oi(), ob = quest.objs[i];
    if (!ob || objDone(i)) return false;
    if (ob.special === 'care') {
      eCd = now + 400;
      openChoice('Rễ có nhớ không — chọn cách tiếp cận', [
        { label: 'Chăm thử — theo dõi một mùa', run: function () { toast('Chăm thử: ghi nhận phản ứng rễ theo mùa'); progressObj(); } },
        { label: 'Để sau — cần thêm chứng cứ', run: function () { toast('Để sau: quay lại khi có thêm bằng chứng'); progressObj(); } }
      ]);
      return true;
    }
    if (ob.special === 'policy') {
      eCd = now + 400;
      openChoice('Phân dòng — chọn chính sách vận hành', [
        { label: 'THẤP — Bảo vệ bãi bồi', run: function () { CS.policy = 'LOW_PROTECT'; save(); toast('Chính sách THẤP: giữ mức thấp, theo dõi thượng nguồn'); progressObj(); } },
        { label: 'CAO — Mở lối sinh cảnh', run: function () { CS.policy = 'HIGH_ACCESS'; save(); toast('Chính sách CAO: mở dòng, tăng cảnh báo ngập'); progressObj(); } },
        { label: 'XOAY VÒNG — Bảo trì theo lịch', run: function () { CS.policy = 'ROTATING_MAINTENANCE'; save(); toast('Chính sách XOAY VÒNG: chia dòng theo lịch, cần người giữ lịch'); progressObj(); } }
      ]);
      return true;
    }
    if (ob.special) return false;
    var p = localPlayer(); if (!p) return false;
    var best = null, bd = 1.9, bmi = -1;
    for (var mi = 0; mi < markers.length; mi++) {
      var m = markers[mi];
      if (m.oi !== i || visited(i, m.mi)) continue;
      var d = d2(p, m.x, m.z);
      if (d < bd) { bd = d; best = m; bmi = m.mi; }
    }
    if (!best) return false;
    eCd = now + 400;
    if (best.npc && window.__NPC_SYSTEM) window.__NPC_SYSTEM.tryTalk();
    CS.prog['v' + CS.idx + ':' + i + ':' + bmi] = 1;
    if (quest.id === 'Q-BANK-02') {
      var post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.1, 0.95, 6),
        new THREE.MeshLambertMaterial({ color: 0x8a6a42 })
      );
      post.position.set(best.x, hY(best.x, best.z) + 0.48, best.z);
      gardenRoot.add(post);
    }
    if (ob.preview) {
      toast('Ba phương án: THẤP bảo vệ · CAO mở lối · XOAY VÒNG chia dòng');
    }
    progressObj();
    save();
    return true;
  };

  window.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    if (k === 'j') playerStrike();
  });
  window.addEventListener('pointerdown', function (e) {
    if (e.button === 0 && (!e.target.closest || !e.target.closest('button'))) playerStrike();
  });

  var CAM = {};
  window.__campaignState = function () {
    var quest = q(), i = oi(), ob = quest.objs[i];
    return {
      idx: CS.idx, total: QUESTS.length, questId: quest.id, questName: quest.name, chapter: quest.ch,
      objText: ob.text, prog: CS.prog[CS.idx + ':' + i] || 0,
      need: ob.need || ob.marks.length || 1, policy: CS.policy,
      guardians: guardians.map(function (g) { return { name: g.name, state: g.state, hp: g.hp, defeated: g.defeated }; }),
      foes: foes.map(function (f) { return { name: f.name, hp: f.hp, alive: f.alive }; }),
      markerCount: markers.length,
      markers: markers.map(function (m) { return { x: m.x, z: m.z }; })
    };
  };
  window.__CAMPAIGN_DEBUG = { advance: completeQuestForce };
  window.__CAMPAIGN = CAM;

  var hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;right:16px;top:246px;z-index:52;width:220px;padding:8px 12px;border-radius:10px;background:rgba(255,252,246,.78);border:1px solid rgba(122,90,52,.22);color:#5f4626;font:600 12px/1.5 Georgia,serif;pointer-events:none';
  document.body.appendChild(hud);

  var arrow = document.createElement('div');
  arrow.style.cssText = 'position:fixed;left:50%;top:34px;z-index:58;width:26px;height:26px;margin-left:-13px;pointer-events:none;transition:transform .12s linear';
  arrow.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M12 2 L20 20 L12 15 L4 20 Z" fill="#b23c28" stroke="#fff6e0" stroke-width="1.4"/></svg>';
  document.body.appendChild(arrow);

  setInterval(function () {
    tickT += 0.1;
    var now = performance.now();
    var quest = q(); if (!quest) return;
    var i = oi(), ob = quest.objs[i];
    var key = CS.idx + ':' + i;
    if (key !== lastKey) {
      lastKey = key;
      valveT0 = (ob && ob.special === 'valve' && window.__waterToggles) ? window.__waterToggles() : null;
      ensureSpawns();
      rebuildMarkers();
    }
    if (ob && ob.special && !objDone(i)) {
      if (ob.special === 'valve' && window.__waterToggles && valveT0 !== null && window.__waterToggles() > valveT0) progressObj();
      else if (ob.special === 'boss01' && window.__bossState && window.__bossState().defeated) progressObj();
      else if (ob.special === 'gocrac' && guardians.some(function (g) { return g.kind === 'gocrac' && g.defeated; })) progressObj();
      else if (ob.special === 'finalboss' && guardians.some(function (g) { return g.kind === 'finalboss' && g.defeated; })) progressObj();
      else if ((ob.special === 'haz' || ob.special === 'wave') && foes.some(function (f) { return f.kind === ob.special; }) && !foes.some(function (f) { return f.kind === ob.special && f.alive; })) progressObj();
    }
    for (var r = 0; r < markers.length; r++) {
      var m = markers[r];
      m.ring.rotation.z += 0.02;
      m.beam.position.y = m.baseY + Math.sin(tickT * 2 + r) * 0.09;
      m.beam.material.opacity = 0.42 + 0.14 * Math.sin(tickT * 2.2 + r);
    }
    var p = localPlayer();
    guardians.forEach(function (g) {
      if (g.defeated || !p) return;
      var d = d2(p, g.group.position.x, g.group.position.z);
      g.timer -= 0.1;
      g.phase = g.hp > g.maxHp * 0.6 ? 1 : (g.hp > g.maxHp * 0.3 ? 2 : 3);
      if (g.state === 'IDLE' || g.state === 'CHASE') {
        if (d > 15) { g.state = 'IDLE'; return; }
        g.state = 'CHASE';
        g.group.rotation.y = Math.atan2(p.x - g.group.position.x, p.z - g.group.position.z);
        if (d > 2.9) {
          var dx = (p.x - g.group.position.x) / d, dz = (p.z - g.group.position.z) / d;
          g.group.position.x += dx * 0.62 * 0.1;
          g.group.position.z += dz * 0.62 * 0.1;
        } else {
          g.state = 'TELL'; g.timer = g.phase >= 3 ? 0.85 : 1.1; g.attackKind = g.phase >= 2 && Math.random() < 0.5 ? 'SLAM' : 'SWEEP';
        }
      } else if (g.state === 'TELL') {
        g.group.scale.setScalar(1 + 0.05 * Math.sin(now * 0.02));
        if (g.timer <= 0) {
          g.group.scale.setScalar(1);
          if (d <= (g.attackKind === 'SLAM' ? 2.5 : 3.1) && window.__COMBAT && window.__COMBAT.damagePlayer) window.__COMBAT.damagePlayer(g.dmg);
          g.state = 'ACTIVE'; g.timer = 0.25;
        }
      } else if (g.state === 'ACTIVE') {
        if (g.timer <= 0) { g.state = 'RECOVER'; g.timer = g.phase >= 3 ? 2.1 : 2.9; }
      } else if (g.state === 'RECOVER') {
        if (g.timer <= 0) g.state = 'CHASE';
      }
    });
    foes.forEach(function (f) {
      if (!f.alive || !p) return;
      var gx = f.group.position.x, gz = f.group.position.z;
      var tx = f.kind === 'wave' && f.target ? f.target[0] : p.x;
      var tz = f.kind === 'wave' && f.target ? f.target[1] : p.z;
      var d = Math.hypot(tx - gx, tz - gz);
      if ((f.kind === 'wave' && d > 0.7) || (f.kind === 'haz' && d > 1.6 && d < 7)) {
        f.group.position.x += (tx - gx) / d * 0.42 * 0.1;
        f.group.position.z += (tz - gz) / d * 0.42 * 0.1;
      }
      f.group.position.y = hY(f.group.position.x, f.group.position.z) + Math.sin(tickT * 3 + f.ph) * 0.05;
      if (d2(p, f.group.position.x, f.group.position.z) < 1.15 && now - f.lastDmg > 1200) {
        f.lastDmg = now;
        if (window.__COMBAT && window.__COMBAT.damagePlayer) window.__COMBAT.damagePlayer(f.kind === 'wave' ? 6 : 4);
      }
    });
    var dist = p && markers.length ? d2(p, markers[0].x, markers[0].z) : -1;
    if (p && markers.length && window.CAM && window.TARGET) {
      var m0 = markers[0];
      var mw = gardenRoot.localToWorld(new THREE.Vector3(m0.x, 0, m0.z));
      var camF = Math.atan2(window.TARGET.z - window.CAM.z, window.TARGET.x - window.CAM.x);
      var mA = Math.atan2(mw.z - window.CAM.z, mw.x - window.CAM.x);
      var rel = mA - camF;
      while (rel > Math.PI) rel -= 2 * Math.PI;
      while (rel < -Math.PI) rel += 2 * Math.PI;
      arrow.style.transform = 'rotate(' + (-rel * 180 / Math.PI) + 'deg)';
      arrow.style.opacity = Math.abs(rel) < 0.5 ? '0.35' : '1';
    } else {
      arrow.style.opacity = '0';
    }
    hud.innerHTML = '<b>' + quest.ch + '</b> · ' + quest.id + '<br>' + quest.name +
      '<br><span style="font-weight:400">' + ob.text + '</span>' +
      '<br>Tiến độ: <b>' + (CS.prog[key] || 0) + '</b>/' + (ob.need || ob.marks.length || 1) +
      (dist >= 0 ? ' · ' + dist.toFixed(0) + 'm' : '');
  }, 100);

  rebuildMarkers();
  return CAM;
};
