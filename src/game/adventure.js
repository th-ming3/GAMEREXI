/* Cánh Đồng — waypoint, Hang Pha Lê và minimap; tách khỏi world/player runtime. */
window.__initAdventure = function () {
  var garden = window.__garden, hill = window.__hillY;
  if (!garden || !hill || window.__waypoints) return;

  /* Waypoint là cột đá có khắc kênh và vòng năng lượng, không dùng billboard chung */
  var waypoints = [];
  window.__waypoints = waypoints;
  (window.__REGION.waypoints || []).forEach(function (def) {
    var group = new THREE.Group();
    var rockMat = new THREE.MeshStandardMaterial({ color: 0x4b5551, roughness: 0.86, flatShading: true });
    var trimMat = new THREE.MeshStandardMaterial({ color: 0x8b927d, roughness: 0.72 });
    var glowMat = new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 1.25, roughness: 0.2 });
    var base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.82, 0.34, 8), rockMat);
    base.position.y = 0.17; group.add(base);
    var pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.4, 2.6, 7), rockMat);
    pillar.position.y = 1.48; pillar.rotation.z = 0.06; group.add(pillar);
    var crown = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.28, 0.26, 7), trimMat);
    crown.position.y = 2.92; group.add(crown);
    var core = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), glowMat);
    core.position.y = 3.3; group.add(core);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 8, 32), glowMat.clone());
    ring.position.y = 3.3; ring.rotation.x = Math.PI / 2; group.add(ring);
    for (var ri = 0; ri < 4; ri++) {
      var rune = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 0.025), glowMat.clone());
      var angle = ri * Math.PI / 2;
      rune.position.set(Math.sin(angle) * 0.28, 1.2, Math.cos(angle) * 0.28);
      rune.rotation.y = angle; group.add(rune);
    }
    group.position.set(def.x, hill(def.x, def.z), def.z);
    group.userData.waypointId = def.id;
    garden.add(group);
    waypoints.push({ id: def.id, name: def.name, x: def.x, z: def.z, group: group, core: core, ring: ring, active: false });
  });

  /* Cổng hang có khối đá riêng, để ẩn/hiện khi vào mà không ảnh hưởng cụm đá xung quanh */
  var cavePos = { x: -30, z: -12 };
  window.__cavePos = cavePos;
  var caveExterior = new THREE.Group();
  var caveRock = new THREE.MeshStandardMaterial({ color: 0x403e42, roughness: 0.94, flatShading: true });
  [-1, 1].forEach(function (side) {
    var pillar = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 0), caveRock);
    pillar.scale.set(0.9, 1.9, 1.0);
    pillar.position.set(cavePos.x + side * 1.55, hill(cavePos.x + side * 1.55, cavePos.z) + 1.35, cavePos.z);
    caveExterior.add(pillar);
  });
  var lintel = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), caveRock);
  lintel.scale.set(1.9, 0.65, 0.9);
  lintel.position.set(cavePos.x, hill(cavePos.x, cavePos.z) + 3.05, cavePos.z);
  caveExterior.add(lintel);
  var darkness = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.7), new THREE.MeshBasicMaterial({ color: 0x07090d, side: THREE.DoubleSide }));
  darkness.position.set(cavePos.x, hill(cavePos.x, cavePos.z) + 1.35, cavePos.z + 0.22);
  caveExterior.add(darkness);
  garden.add(caveExterior);
  window.__caveGroup = caveExterior;

  var caveCrystals = [];
  window.__caveCrystals = caveCrystals;
  window.__buildCaveRoom = function () {
    if (window.__caveRoom) return window.__caveRoom;
    var room = new THREE.Group(), gy = hill(cavePos.x, cavePos.z);
    room.position.set(cavePos.x, gy, cavePos.z);
    if (window.__REAL_ASSETS) window.__REAL_ASSETS.addTo(room, 'temple', { x: 7, y: 3.2, z: 11 });
    var wallMat = new THREE.MeshStandardMaterial({ color: 0x252a31, roughness: 0.98, side: THREE.BackSide, flatShading: true });
    var floorMat = new THREE.MeshStandardMaterial({ color: 0x3e3a35, roughness: 0.96 });
    var tunnel = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.6, 14, 12, 1, true), wallMat);
    tunnel.rotation.x = Math.PI / 2; tunnel.position.set(0, 3.1, 0); room.add(tunnel);
    var floor = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.18, 14), floorMat);
    floor.position.y = 0.02; room.add(floor);
    var ribMat = new THREE.MeshStandardMaterial({ color: 0x343a40, roughness: 0.96, flatShading: true });
    for (var ri = 0; ri < 6; ri++) {
      var rib = new THREE.Mesh(new THREE.TorusGeometry(3.65, 0.16, 6, 12, Math.PI), ribMat);
      rib.position.set(0, 0.15, -6 + ri * 2.3); room.add(rib);
    }
    var crystalMat = new THREE.MeshStandardMaterial({ color: 0xb1a1ff, emissive: 0x8065e8, emissiveIntensity: 1.25, roughness: 0.2 });
    [[-1.5, -1.4], [1.35, -3.7], [-0.3, -5.8]].forEach(function (spot, index) {
      var crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), crystalMat.clone());
      crystal.scale.set(0.8, 1.9, 0.8);
      crystal.position.set(spot[0], 0.58, spot[1]);
      crystal.userData = { caveCrystal: true, id: index, baseY: 0.58, phase: index * 1.6 };
      room.add(crystal); caveCrystals.push(crystal);
      var light = new THREE.PointLight(0x9982ff, 0.85, 7, 2);
      light.position.set(spot[0], 1.0, spot[1]); room.add(light);
    });
    for (var si = 0; si < 14; si++) {
      var stal = new THREE.Mesh(new THREE.ConeGeometry(0.16 + (si % 3) * 0.05, 0.65 + (si % 4) * 0.22, 7), ribMat);
      stal.position.set((si % 2 ? 1 : -1) * (2.4 + (si % 3) * 0.3), 0.42, -6 + si * 0.85);
      room.add(stal);
    }
    room.visible = false;
    room.traverse(function (object) { if (object.isMesh) object.frustumCulled = false; });
    garden.add(room);
    window.__caveRoom = room;
    return room;
  };

  /* Vật nhặt phát sáng rải khắp map — đi tới gần và bấm E để nhặt */
  var collectibles = [];
  var collected = 0;
  (function scatterCollectibles() {
    var mat = new THREE.MeshStandardMaterial({ color: 0xffd76a, emissive: 0xffb830, emissiveIntensity: 1.6, roughness: 0.25 });
    var geo = new THREE.OctahedronGeometry(0.22, 0);
    for (var i = 0; i < 26; i++) {
      var a = i * 2.399963, r = 6 + ((i * 37) % 34);
      var x = Math.cos(a) * r, z = Math.sin(a) * r * 0.9;
      if (window.__lakeInfo) { var L = window.__lakeInfo, dx = (x - L.x) / L.rx, dz = (z - L.z) / L.rz; if (dx * dx + dz * dz < 1.1) continue; }
      if (Math.hypot(x - 0.4, z - 6.8) < 3 || Math.hypot(x - 26, z - 9) < 4) continue;
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x, hill(x, z) + 0.55, z);
      m.userData = { baseY: hill(x, z) + 0.55, ph: i * 0.9 };
      garden.add(m);
      collectibles.push(m);
    }
    window.__collectibles = collectibles;
  })();
  window.__tryCollect = function () {
    var pl = window.__playerPos ? garden.worldToLocal(window.__playerPos.clone()) : null;
    if (!pl) return false;
    for (var i = 0; i < collectibles.length; i++) {
      var c = collectibles[i];
      if (!c.visible) continue;
      if (Math.hypot(c.position.x - pl.x, c.position.z - pl.z) < 1.7) {
        c.visible = false;
        if (window.__addScore) window.__addScore(5);
        collected++;
        if (window.__sfx) window.__sfx.chime();
        var w = garden.localToWorld(c.position.clone()); w.y += 0.6;
        if (window.__spawnBurstW) window.__spawnBurstW(w, 10);
        if (collected % 5 === 0) {
          window.__dmgBonus = (window.__dmgBonus || 0) + 1;
          if (window.__healFull) window.__healFull();
          if (window.__toast) window.__toast('✦✦ 5 mảnh sáng → Đòn tay +' + window.__dmgBonus + ', hồi đầy máu');
          if (window.__COMBAT && window.__COMBAT.hud) window.__COMBAT.hud.innerHTML += '';
        } else if (window.__toast) window.__toast('✦ Nhặt được mảnh sáng (' + collected + ')' + ' — đủ 5 mảnh để lên đòn tay');
        return true;
      }
    }
    return false;
  };

  /* Minimap phong cách bản đồ cổ: mực nâu trên giấy, nhãn vùng, mốc nhiệm vụ */
  var wrap = document.createElement('div');
  wrap.id = 'adventureMap';
  wrap.style.cssText = 'position:fixed;right:16px;top:16px;z-index:50;width:196px;padding:10px 10px 8px;border:1px solid rgba(96,66,32,.4);border-radius:14px;background:linear-gradient(160deg,#f7eeda,#efe0bd);box-shadow:0 10px 28px rgba(80,50,25,.18), inset 0 0 24px rgba(150,110,60,.12);transition:width .2s';
  var title = document.createElement('div');
  title.style.cssText = 'font:700 12px/1.3 Georgia,serif;color:#5a3d1e;text-align:center;letter-spacing:.02em;margin-bottom:6px';
  wrap.appendChild(title);
  var canvas = document.createElement('canvas');
  canvas.width = 360; canvas.height = 360;
  canvas.style.cssText = 'display:block;width:176px;height:176px;margin:auto;border-radius:10px;border:1px solid rgba(96,66,32,.35)';
  wrap.appendChild(canvas);
  var hint = document.createElement('div');
  hint.textContent = 'M — mở bản đồ · Bấm số để dịch chuyển';
  hint.style.cssText = 'font:10px/1.4 Georgia,serif;color:#8a6a42;text-align:center;margin-top:5px';
  wrap.appendChild(hint);
  document.body.appendChild(wrap);
  var expanded = false;
  window.addEventListener('keydown', function (event) {
    if ((event.key || '').toLowerCase() !== 'm') return;
    expanded = !expanded;
    wrap.style.width = expanded ? 'min(82vw,640px)' : '196px';
    canvas.style.width = expanded ? 'min(78vw,610px)' : '176px';
    canvas.style.height = expanded ? 'calc(min(78vw,610px) * 0.6)' : '106px';
  });
  canvas.width = 480; canvas.height = 288;
  canvas.style.height = '106px';
  canvas.style.cursor = 'pointer';

  var MDATA = window.__WORLD_MAP_DATA || { bounds: { minX: -110.4, maxX: 369.6, minZ: -162.7, maxZ: 125.3 }, landPolys: [], skyPolys: [], rivers: [], roads: [] };
  function mapPoint(x, z) {
    var b = MDATA.bounds;
    return [((x - b.minX) / (b.maxX - b.minX || 1)) * 480, ((z - b.minZ) / (b.maxZ - b.minZ || 1)) * 288];
  }
  canvas.addEventListener('click', function (ev) {
    var rect = canvas.getBoundingClientRect();
    var cx = (ev.clientX - rect.left) * (480 / rect.width);
    var cy = (ev.clientY - rect.top) * (288 / rect.height);
    var best = null, bd = 24;
    waypoints.forEach(function (wp) {
      var p = mapPoint(wp.x, wp.z);
      var d = Math.hypot(p[0] - cx, p[1] - cy);
      if (d < bd) { bd = d; best = wp; }
    });
    if (best && window.__warpTo) {
      var wy = best.id === 'r08' ? 22.5 : undefined;
      window.__warpTo(best.x, best.z, wy);
      if (window.__toast) window.__toast('✦ Dịch chuyển tới ' + best.name);
    }
  });
  function drawRegion() {
    var pl = window.__playerPos ? garden.worldToLocal(window.__playerPos.clone()) : { x: 0.4, z: 6.8 };
    var region = window.__REGION.at(pl.x, pl.z);
    title.textContent = (window.__REGION.names[region] || 'Đại Việt') + ' · Đại Việt';
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 480, 288);
    var og = ctx.createLinearGradient(0, 0, 0, 288);
    og.addColorStop(0, '#9fc4cf'); og.addColorStop(1, '#84b0be');
    ctx.fillStyle = og; ctx.fillRect(0, 0, 480, 288);

    /* Vẽ lục địa & đảo Đại Việt từ SVG */
    ctx.fillStyle = '#e7d9b2';
    ctx.strokeStyle = '#6f5534';
    ctx.lineWidth = 1.1;
    (MDATA.landPolys || []).forEach(function (poly) {
      if (!poly.length) return;
      ctx.beginPath();
      poly.forEach(function (pt, idx) {
        var p = mapPoint(pt[0], pt[1]);
        if (idx === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      });
      ctx.closePath(); ctx.fill(); ctx.stroke();
    });

    /* Vẽ sông ngòi */
    ctx.strokeStyle = '#3d8ea6'; ctx.lineWidth = 1.6;
    (MDATA.rivers || []).forEach(function (rv) {
      if (rv.length < 2) return;
      ctx.beginPath();
      rv.forEach(function (pt, idx) {
        var p = mapPoint(pt[0], pt[1]);
        if (idx === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      });
      ctx.stroke();
    });

    /* Vẽ quan lộ */
    ctx.strokeStyle = 'rgba(130, 82, 42, 0.72)'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]);
    (MDATA.roads || []).forEach(function (rd) {
      if (rd.length < 2) return;
      ctx.beginPath();
      rd.forEach(function (pt, idx) {
        var p = mapPoint(pt[0], pt[1]);
        if (idx === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      });
      ctx.stroke();
    });
    ctx.setLineDash([]);

    /* Vẽ quần đảo bay Khu 08 */
    ctx.fillStyle = '#f5e49c'; ctx.strokeStyle = '#9d7622'; ctx.lineWidth = 1;
    (MDATA.skyPolys || []).forEach(function (poly) {
      if (!poly.length) return;
      ctx.beginPath();
      poly.forEach(function (pt, idx) {
        var p = mapPoint(pt[0], pt[1]);
        if (idx === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      });
      ctx.closePath(); ctx.fill(); ctx.stroke();
    });

    /* Vẽ 8 mốc khu vực (01 → 08) */
    waypoints.forEach(function (wp, wi) {
      var p = mapPoint(wp.x, wp.z);
      ctx.fillStyle = wp.active ? '#e8b23a' : '#fbf3dc';
      ctx.strokeStyle = '#8b2f1f'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(p[0], p[1], wp.active ? 7.5 : 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3b2412'; ctx.font = '700 8.5px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(wi + 1), p[0], p[1] + 0.5);
    });
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

    var player = mapPoint(pl.x, pl.z);
    ctx.save(); ctx.translate(player[0], player[1]);
    var yaw = 0;
    if (window.CAM && window.TARGET) yaw = Math.atan2(window.TARGET.x - window.CAM.x, window.TARGET.z - window.CAM.z);
    ctx.rotate(yaw);
    ctx.fillStyle = '#b23c28'; ctx.strokeStyle = '#fff6e0'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5.5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5.5, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(90,61,30,.55)'; ctx.lineWidth = 1.4;
    ctx.strokeRect(0.5, 0.5, 479, 287);
    ctx.fillStyle = 'rgba(90,61,30,.85)'; ctx.font = '700 10px Georgia,serif'; ctx.fillText('B', 8, 14);
  }
  drawRegion();
  setInterval(drawRegion, 250);
  setInterval(function () {
    var time = performance.now() * 0.001;
    waypoints.forEach(function (wp, index) {
      wp.core.rotation.y = time * 0.8 + index;
      wp.ring.rotation.z = time * 0.45 + index;
      var pulse = wp.active ? 1 + Math.sin(time * 2 + index) * 0.12 : 0.85;
      wp.ring.scale.setScalar(pulse);
      wp.core.material.emissiveIntensity = wp.active ? 1.5 : 0.45;
    });
    collectibles.forEach(function (c) {
      if (!c.visible) return;
      c.rotation.y = time * 1.4 + c.userData.ph;
      c.position.y = c.userData.baseY + Math.sin(time * 2 + c.userData.ph) * 0.1;
    });
    caveCrystals.forEach(function (crystal) {
      if (!crystal.visible) return;
      crystal.rotation.y = time * 0.7 + crystal.userData.phase;
      crystal.position.y = crystal.userData.baseY + Math.sin(time * 1.3 + crystal.userData.phase) * 0.08;
    });
  }, 50);
};
