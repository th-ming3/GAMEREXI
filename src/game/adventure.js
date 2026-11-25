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
    var glowMat = new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.55, roughness: 0.2 });
    var base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.82, 0.34, 8), rockMat);
    base.position.y = 0.17; group.add(base);
    var pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 1.8, 7), rockMat);
    pillar.position.y = 1.18; pillar.rotation.z = 0.06; group.add(pillar);
    var crown = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.24, 0.22, 7), trimMat);
    crown.position.y = 2.13; group.add(crown);
    var core = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), glowMat);
    core.position.y = 2.48; group.add(core);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.035, 8, 32), glowMat.clone());
    ring.position.y = 2.48; ring.rotation.x = Math.PI / 2; group.add(ring);
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
  hint.textContent = 'M — phóng to bản đồ';
  hint.style.cssText = 'font:10px/1.4 Georgia,serif;color:#8a6a42;text-align:center;margin-top:5px';
  wrap.appendChild(hint);
  document.body.appendChild(wrap);
  var expanded = false;
  window.addEventListener('keydown', function (event) {
    if ((event.key || '').toLowerCase() !== 'm') return;
    expanded = !expanded;
    wrap.style.width = expanded ? 'min(76vw,520px)' : '196px';
    canvas.style.width = expanded ? 'min(70vw,480px)' : '176px';
    canvas.style.height = canvas.style.width;
  });
  function mapPoint(x, z) { return [180 + x * 3.25, 180 + z * 3.25]; }
  function drawRegion() {
    var pl = window.__playerPos ? garden.worldToLocal(window.__playerPos.clone()) : { x: 0.4, z: 6.8 };
    var region = window.__REGION.at(pl.x, pl.z);
    title.textContent = (window.__REGION.names[region] || 'Cánh Đồng') + ' · Cánh Đồng';
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 360, 360);
    var g = ctx.createRadialGradient(180, 170, 30, 180, 180, 260);
    g.addColorStop(0, '#e9d9ae'); g.addColorStop(1, '#d9c491');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 360, 360);
    ctx.strokeStyle = 'rgba(96,66,32,.18)'; ctx.lineWidth = 1;
    for (var gi = 40; gi < 360; gi += 40) { ctx.beginPath(); ctx.moveTo(gi, 0); ctx.lineTo(gi, 360); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, gi); ctx.lineTo(360, gi); ctx.stroke(); }
    ctx.fillStyle = 'rgba(120,90,50,.16)';
    ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(130, 0); ctx.lineTo(120, 300); ctx.lineTo(0, 340); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(90,130,70,.22)';
    ctx.beginPath(); ctx.moveTo(130, 0); ctx.lineTo(360, 0); ctx.lineTo(360, 140); ctx.lineTo(125, 140); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(120,160,80,.2)';
    ctx.beginPath(); ctx.moveTo(125, 140); ctx.lineTo(360, 140); ctx.lineTo(360, 360); ctx.lineTo(120, 360); ctx.closePath(); ctx.fill();
    var lake = mapPoint(4.5, 17);
    var lg = ctx.createRadialGradient(lake[0], lake[1], 4, lake[0], lake[1], 30);
    lg.addColorStop(0, '#4fa8c0'); lg.addColorStop(1, '#2e7d96');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.ellipse(lake[0], lake[1], 8.2 * 3.25, 6.8 * 3.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(250,240,210,.85)'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]);
    ctx.beginPath(); ctx.moveTo(70, 315); ctx.bezierCurveTo(150, 265, 200, 235, 255, 135); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = 'italic 11px Georgia,serif'; ctx.fillStyle = 'rgba(90,61,30,.75)';
    ctx.fillText('Hồ Gương', lake[0] - 22, lake[1] + 3);
    ctx.fillText('Hẻm Hổ Phách', 240, 250);
    ctx.fillText('Rừng Thì Thầm', 190, 90);
    waypoints.forEach(function (wp) {
      var p = mapPoint(wp.x, wp.z);
      ctx.fillStyle = wp.active ? '#e8b23a' : '#fbf3dc';
      ctx.strokeStyle = '#5a3d1e'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(p[0], p[1], wp.active ? 6.5 : 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (wp.active) { ctx.strokeStyle = 'rgba(232,178,58,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p[0], p[1], 10, 0, Math.PI * 2); ctx.stroke(); }
    });
    var cave = mapPoint(cavePos.x, cavePos.z);
    ctx.fillStyle = '#2e2620'; ctx.beginPath(); ctx.arc(cave[0], cave[1], 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fbf3dc'; ctx.lineWidth = 1.4; ctx.stroke();
    var cab = mapPoint(26, 9);
    ctx.fillStyle = '#8a5a2e'; ctx.fillRect(cab[0] - 5, cab[1] - 5, 10, 10);
    ctx.strokeStyle = '#5a3d1e'; ctx.lineWidth = 1.4; ctx.strokeRect(cab[0] - 5, cab[1] - 5, 10, 10);
    var cs = window.__campaignState ? window.__campaignState() : null;
    if (cs && cs.markers && cs.markers.length) {
      cs.markers.forEach(function (m, mi) {
        var p = mapPoint(m.x, m.z);
        var pulse = 5 + Math.sin(performance.now() * 0.004 + mi) * 1.5;
        ctx.fillStyle = 'rgba(178,60,40,.25)';
        ctx.beginPath(); ctx.arc(p[0], p[1], pulse + 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b23c28';
        ctx.beginPath(); ctx.arc(p[0], p[1], pulse, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff6e0'; ctx.lineWidth = 1.4; ctx.stroke();
      });
    }
    if (window.__NPC_SYSTEM && window.__NPC_SYSTEM.npcs) {
      window.__NPC_SYSTEM.npcs.forEach(function (n) {
        var p = mapPoint(n.x, n.z);
        ctx.fillStyle = '#3e6b4f';
        ctx.beginPath(); ctx.arc(p[0], p[1], 3.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fbf3dc'; ctx.lineWidth = 1; ctx.stroke();
      });
    }
    var player = mapPoint(pl.x, pl.z);
    ctx.save(); ctx.translate(player[0], player[1]);
    var yaw = 0;
    if (window.CAM && window.TARGET) yaw = Math.atan2(window.TARGET.x - window.CAM.x, window.TARGET.z - window.CAM.z);
    ctx.rotate(yaw);
    ctx.fillStyle = '#b23c28'; ctx.strokeStyle = '#fff6e0'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6.5, 7); ctx.lineTo(0, 3.5); ctx.lineTo(-6.5, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(90,61,30,.55)'; ctx.lineWidth = 1.4;
    ctx.strokeRect(0.5, 0.5, 359, 359);
    ctx.fillStyle = 'rgba(90,61,30,.8)'; ctx.font = '700 11px Georgia,serif'; ctx.fillText('B', 8, 16);
    ctx.beginPath(); ctx.moveTo(13, 20); ctx.lineTo(13, 32); ctx.stroke();
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
    caveCrystals.forEach(function (crystal) {
      if (!crystal.visible) return;
      crystal.rotation.y = time * 0.7 + crystal.userData.phase;
      crystal.position.y = crystal.userData.baseY + Math.sin(time * 1.3 + crystal.userData.phase) * 0.08;
    });
  }, 50);
};
