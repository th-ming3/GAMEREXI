/* ============================================================
 * CANH DONG — GAME PACK: nhan vat third-person + nhiem vu hai hoa
 * - Soldier.glb (CC0 Quaternius) nhung base64 tai build tu
 *   assets/models/soldier.glb (placeholder SOLDIER_B64)
 * - AnimationMixer: Idle/Walk/Run; orbit camera sau lung; drag xoay
 * - Quest hai hoa (interval quet hoa chunk visible), diem, HUD,
 *   nut ⌂ / H ve diem xuat phat, save localStorage 'worldSave'
 * Hooks: __char __playerPos __setOrbit __orbitDrag __goHome
 * ============================================================ */

/* ============ GAME PACK v2: nhân vật chibi + third-person + nhiệm vụ hái hoa + về điểm xuất phát ============ */
(function () {
  var SC = window.__scene3d;
  function smoothG(x, a, b) { var t2 = Math.max(0, Math.min(1, (x - a) / (b - a))); return t2 * t2 * (3 - 2 * t2); }
  function hillY2(x, z) {
    if (window.__hillY) return window.__hillY(x, z);
    return 0.13 * Math.sin(x * 0.45 + 1.3) * Math.cos(z * 0.5)
         + 0.06 * Math.sin(x * 1.7 + z * 1.3)
         + smoothG(-z, 2.5, 9) * 0.75;
  }

  /* ---- sao đêm + chu kỳ ngày-đêm (giữ từ v1) ---- */
  var starGroup = null, starMat = null;
  if (SC && THREE.Points) {
    var N = 320, pos = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var az = Math.random() * 6.283, el = Math.acos(Math.random() * 0.85), r = 27 + Math.random() * 7;
      pos[i * 3] = Math.sin(el) * Math.cos(az) * r;
      pos[i * 3 + 1] = Math.cos(el) * r * 0.75 + 1.5;
      pos[i * 3 + 2] = Math.sin(el) * Math.sin(az) * r;
    }
    var gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starMat = new THREE.PointsMaterial({ color: 0xfff6e0, size: 0.17, transparent: true, opacity: 0, fog: false, depthWrite: false });
    starGroup = new THREE.Points(gg, starMat);
    SC.add(starGroup);
  }
  var tint = document.getElementById('nightTint');
  var fogDay = new THREE.Color(0xe2e3b2), fogDusk = new THREE.Color(0xe7b78f), fogNight = new THREE.Color(0x39415a);
  var keyLow = new THREE.Color(0xff9e5e), keyHigh = new THREE.Color(0xfff0dd), cTmpA = new THREE.Color(), cTmpB = new THREE.Color();
  var sunA = 1.05, paused = false, dayF = 1;
  window.__setSun = function (a) { sunA = a; paused = true; };
  window.__sunNow = function () { return sunA; };
  function frame() {
    if (!paused) sunA += 0.00042;
    if (sunA > 6.283) sunA -= 6.283;
    var el = Math.sin(sunA);
    /* ngày dài ~3x đêm (~75% ngày): hoàng hôn/bình minh dịu dài, đêm sụp ngắn */
    dayF = Math.max(0, Math.min(1, el * 0.95 + 0.97));
    window.__dayF = dayF;
    window.__isNight = dayF < 0.3;
    window.__key && (window.__key.intensity = 0.3 + 2.15 * dayF);
    cTmpA.copy(keyLow).lerp(keyHigh, Math.max(0, Math.min(1, el * 1.8)));
    window.__key && window.__key.color.copy(cTmpA);
    window.__key && window.__key.position.set(Math.cos(sunA) * 8, Math.max(1.5, el * 9), 5);
    window.__hemi && (window.__hemi.intensity = 0.42 + 0.72 * dayF);
    cTmpA.copy(fogDusk).lerp(fogDay, Math.max(0, Math.min(1, el * 2)));
    cTmpB.copy(fogNight).lerp(cTmpA, dayF);
    if (SC.fog) SC.fog.color.copy(cTmpB);
    if (window.__renderer) window.__renderer.toneMappingExposure = 0.74 + 0.34 * dayF;
    if (tint) tint.style.opacity = ((1 - dayF) * 0.62).toFixed(3);
    if (starMat) {
      starMat.opacity = Math.pow(1 - dayF, 2) * 0.9;
      starGroup.rotation.y = sunA * 0.24;
    }
    requestAnimationFrame(frame);
  }
  if (starGroup) starGroup.scale.setScalar(1.75);
  if (SC && SC.fog) { SC.fog.near = 14; SC.fog.far = 33; }
  requestAnimationFrame(frame);

  /* ---- NHÂN VẬT: Soldier.glb CC0 (Quaternius) — skeleton thật, Idle/Walk/Run ---- */
  var charG = new THREE.Group();
  window.__garden.add(charG);
  window.__char = charG;
  var mixer = null, actIdle = null, actWalk = null, actRun = null, curAct = null, avatarModel = null;
  var soldierURI = 'data:model/gltf-binary;base64,' + '__SOLDIER_B64__';
  if (window.THREE && THREE.GLTFLoader) {
    new THREE.GLTFLoader().load(soldierURI, function (gltf) {
      var model = gltf.scene;
      model.scale.setScalar(0.78);
      model.traverse(function (m) {
        if (m.isMesh) {
          m.castShadow = false;
          var mm = m.material;
          if (mm && mm.map) { mm.color = new THREE.Color(0xd9cdb2); }
          else if (mm) { mm.color = new THREE.Color(0xb9a888); }
        }
      });
      charG.add(model); avatarModel = model;
      removeFallbackChar();
      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach(function (clip) {
          var nm = clip.name.toLowerCase();
          if (nm.indexOf('idle') >= 0) actIdle = mixer.clipAction(clip);
          else if (nm.indexOf('walk') >= 0) actWalk = mixer.clipAction(clip);
          else if (nm.indexOf('run') >= 0) actRun = mixer.clipAction(clip);
        });
        if (!actIdle) actIdle = mixer.clipAction(gltf.animations[0]);
        if (!actWalk) actWalk = actIdle;
        actIdle.play(); curAct = actIdle;
      }
      window.__charLoaded = true;
    }, undefined, function () { buildFallbackChar(); });
    setTimeout(function () { if (!window.__charLoaded) buildFallbackChar(); }, 7000);
  }
  function setAct(next) {
    if (!next || next === curAct) return;
    if (curAct) curAct.fadeOut(0.22);
    next.reset().fadeIn(0.22).play();
    curAct = next;
  }

  /* ---- VUỐT VE sinh vật (E gần slime/thỏ): tim bay + chuông kêu ---- */
  function petNear() {
    if (petCd > 0) return;
    var lists = [window.__slimes || [], window.__rabbits || []];
    for (var li = 0; li < lists.length; li++) {
      for (var oi = 0; oi < lists[li].length; oi++) {
        var ob = lists[li][oi];
        var gp = ob.g ? ob.g.position : (ob.m ? ob.m.position : null);
        if (!gp) continue;
        if (Math.hypot(gp.x - pPos.x, gp.z - pPos.z) < 1.45) {
          petCd = 0.9;
          spawnHeart(gp.x, hillY2(gp.x, gp.z) + 0.75, gp.z);
          if (window.__sfx) window.__sfx.chime();
          showToast('\u2661 Vu\u1ed1t ve b\u1ea1n nh\u1ecf!');
          return;
        }
      }
    }
  }
  function spawnHeart(x, y, z) {
    var cH = document.createElement('canvas'); cH.width = cH.height = 48;
    var gH = cH.getContext('2d');
    gH.fillStyle = '#ff7d9c';
    gH.beginPath();
    gH.moveTo(24, 42);
    gH.bezierCurveTo(2, 26, 4, 8, 24, 16);
    gH.bezierCurveTo(44, 8, 46, 26, 24, 42);
    gH.fill();
    var spH = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cH), transparent: true, depthWrite: false }));
    spH.scale.setScalar(0.3);
    if (window.__garden) {
      window.__garden.add(spH);
      var t0 = 0;
      var ivH = setInterval(function () {
        t0 += 0.05;
        spH.position.set(x + Math.sin(t0 * 5) * 0.06, y + t0 * 0.55, z);
        spH.material.opacity = Math.max(0, 1 - t0 / 1.1);
        if (t0 > 1.1) { clearInterval(ivH); window.__garden.remove(spH); spH.material.map.dispose(); spH.material.dispose(); }
      }, 50);
    }
  }

  /* ---- NHÂN VẬT DỰ PHÒNG: nếu GLB lỗi/không load — luôn luôn có nhân vật ---- */
  var fbLegs = null, fbGroup = null;
  function buildFallbackChar() {
    if (window.__charLoaded || fbGroup) return;
    var bF = new THREE.Group();
    fbGroup = bF;
    var matF = new THREE.MeshStandardMaterial({ color: 0xd9cdb2, roughness: 0.6 });
    var torsoF = new THREE.Mesh(THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.16, 0.3, 6, 12) : new THREE.CylinderGeometry(0.16, 0.18, 0.5, 10), matF);
    torsoF.position.y = 0.55; bF.add(torsoF);
    var headF = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), matF);
    headF.position.y = 0.95; bF.add(headF);
    var legMatF = new THREE.MeshStandardMaterial({ color: 0x6b6252, roughness: 0.8 });
    var legF = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.34, 8), legMatF);
    legF.position.set(-0.08, 0.17, 0); bF.add(legF);
    var legF2 = legF.clone(); legF2.position.x = 0.08; bF.add(legF2);
    var armF = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.32, 8), matF);
    armF.position.set(-0.22, 0.6, 0); armF.rotation.z = 0.2; bF.add(armF);
    var armF2 = armF.clone(); armF2.position.x = 0.22; armF2.rotation.z = -0.2; bF.add(armF2);
    fbLegs = [legF, legF2];
    charG.add(bF);
    window.__charLoaded = true;
  }
  function removeFallbackChar() {
    if (fbGroup && charG.children.indexOf(fbGroup) >= 0) {
      charG.remove(fbGroup);
      fbLegs = null; fbGroup = null;
    }
  }
  /* ---- trạng thái người chơi + camera third-person ---- */
  var SPAWN = { x: 0.4, z: 6.8 };
  var pPos = new THREE.Vector3(SPAWN.x, 0, SPAWN.z), pYaw = 0, orbitYaw = 0, orbitPitch = 0.52, walkT = 0;
  var flyMode = false, pY = 0, jumpV = 0, onGround = true, dashT = 0, dashCd = 0, petCd = 0, flyPoseT = 0;
  var indoorMode = false, indoorReturn = null, indoorRoom = null, indoorYawReturn = 0, indoorPitchReturn = 0;
  var keys = {}, lastTick = performance.now();
  window.addEventListener('keydown', function (e) {
    var kk = (e.key || '').toLowerCase();
    keys[kk] = true;
    if (kk === ' ') { e.preventDefault(); keys[' '] = true; }
    if (kk === 't') paused = !paused;
    if (kk === 'b' && !indoorMode) {
      flyMode = !flyMode;
      if (flyMode) { pY = Math.max(pY, 1.25); onGround = false; flyPoseT = 0.4; }
      showToast(flyMode ? '\u2020 Bay B\u1eacT — gi\u1eef E ho\u1eb7c Space \u0111\u1ec3 l\u00ean, Q xu\u1ed1ng' : '\u2022 T\u1eaft bay — tr\u1edf l\u1ea1i \u0111\u1ea5t');
      if (window.__sfx) window.__sfx.whoosh();
    }
    if (kk === 'c' && dashCd <= 0) { dashT = 0.22; dashCd = 1.15; if (window.__sfx) window.__sfx.whoosh(); }
    if (kk === 'e' && !flyMode) { if (!toggleHouse()) petNear(); }
    if (kk === 'h') goHome();
    if (kk === 'f') {
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      else document.documentElement.requestFullscreen().catch(function () {});
    }
    if ('wasdqe'.indexOf(kk) >= 0) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { keys[(e.key || '').toLowerCase()] = false; });
  window.__setOrbit = function (yaw, pitch) { orbitYaw = yaw; if (typeof pitch === 'number') orbitPitch = pitch; };
  window.__setFlyY = function (h) { pY = Math.max(0.2, Math.min(11, h)); }; /* debug/probe */
  window.__keys = keys; /* debug/probe */
  window.__orbitDrag = function (dx, dy) {
    orbitYaw -= dx * 0.005;
    orbitPitch = Math.max(0.10, Math.min(0.88, orbitPitch + dy * 0.003));
  };
  function goHome() {
    pPos.set(SPAWN.x, 0, SPAWN.z); orbitYaw = 0; orbitPitch = 0.52;
    pY = 0; jumpV = 0; flyMode = false;
    showToast('\u23cd V\u1ec1 \u0111i\u1ec3m xu\u1ea5t ph\u00e1t \u2728');
    if (window.__sfx) window.__sfx.chime();
    if (window.__spawnHomeFX) window.__spawnHomeFX();
  }
  window.__goHome = goHome;
  window.__playerPos = pPos;

  /* ---- toast ---- */
  var toastEl = document.createElement('div');
  toastEl.style.cssText = 'position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:60;font:600 15px/1.4 Georgia,serif;color:#fff7ec;background:rgba(122,90,52,.82);padding:8px 18px;border-radius:999px;opacity:0;transition:opacity .4s;pointer-events:none;text-shadow:0 1px 2px rgba(60,30,10,.4)';
  document.body.appendChild(toastEl);
  var toastTm = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.style.opacity = 1;
    clearTimeout(toastTm);
    toastTm = setTimeout(function () { toastEl.style.opacity = 0; }, 1800);
  }
  function makeInterior() {
    if (indoorRoom) return indoorRoom;
    var cab = window.__cabinPos || { x: 26, z: 9 }, gy = hillY2(cab.x, cab.z);
    var g = new THREE.Group();
    g.position.set(cab.x, gy, cab.z);
    var wood = new THREE.MeshStandardMaterial({ color: 0x765238, roughness: 0.86, side: THREE.DoubleSide });
    var dark = new THREE.MeshStandardMaterial({ color: 0x38291f, roughness: 0.95, side: THREE.DoubleSide });
    var floorMat = new THREE.MeshStandardMaterial({ color: 0x98724c, roughness: 0.92, side: THREE.DoubleSide });
    var plaster = new THREE.MeshStandardMaterial({ color: 0x876348, roughness: 0.92, side: THREE.DoubleSide });
    var warm = new THREE.MeshStandardMaterial({ color: 0xffc766, emissive: 0xffa52e, emissiveIntensity: 1.5, roughness: 0.25 });
    function box(w,h,d,mat,x,y,z) { var m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z); g.add(m); return m; }
    box(13,0.22,14,floorMat,0,0,0);
    /* Sealed BackSide shell: unlike an outside-facing cabin wall, this is visible from inside. */
    var insideShell=new THREE.Mesh(new THREE.BoxGeometry(13,9,14),new THREE.MeshStandardMaterial({color:0x76563c,roughness:0.96,side:THREE.BackSide}));
    insideShell.position.y=3; g.add(insideShell);
    /* visible inner timber backdrop panels (camera is always inside the room) */
    var wallCanvas=document.createElement('canvas'); wallCanvas.width=256; wallCanvas.height=128;
    var wg=wallCanvas.getContext('2d'); wg.fillStyle='#806044'; wg.fillRect(0,0,256,128);
    for(var wi=0;wi<8;wi++){wg.fillStyle=wi%2?'#88684a':'#765539';wg.fillRect(0,wi*16+1,256,14);wg.fillStyle='rgba(43,29,19,.35)';wg.fillRect(0,wi*16,256,2);for(var wj=0;wj<4;wj++){wg.fillStyle='rgba(190,150,100,.25)';wg.fillRect(wj*67+((wi%2)*12),wi*16+5,42,1);}}
    var wallMap=new THREE.CanvasTexture(wallCanvas);
    var innerWallMat=new THREE.MeshBasicMaterial({map:wallMap,side:THREE.DoubleSide});
    var innerBack=new THREE.Mesh(new THREE.PlaneGeometry(12.8,9),innerWallMat);innerBack.position.set(0,1.5,-6.8);g.add(innerBack);
    var innerSide1=new THREE.Mesh(new THREE.PlaneGeometry(14,9),innerWallMat);innerSide1.rotation.y=Math.PI/2;innerSide1.position.set(-6.3,1.5,0);g.add(innerSide1);
    var innerSide2=innerSide1.clone();innerSide2.position.x=6.3;g.add(innerSide2);
    /* timber ribs + ceiling beams */
    for (var i=0;i<4;i++) { var xx=-6+i*4; box(0.17,5.8,0.17,wood,xx,3,6.82); box(13,0.12,0.14,dark,0,5.78,-5+i*3.2); }
    /* sleeping nook, low table, rug, shelves and warm lantern */
    box(2.3,0.24,1.5,dark,-2.4,0.28,-2.55); box(2.1,0.24,1.35,new THREE.MeshStandardMaterial({color:0xd8c3a0,roughness:0.98}),-2.4,0.49,-2.55);
    box(1.4,0.14,0.95,wood,1.55,0.55,-0.5); box(0.12,0.52,0.12,dark,1.05,0.25,-0.9); box(0.12,0.52,0.12,dark,2.05,0.25,-0.9); box(0.12,0.52,0.12,dark,1.05,0.25,-0.1); box(0.12,0.52,0.12,dark,2.05,0.25,-0.1);
    box(1.8,1.3,0.28,wood,3.9,1.0,-2.3); box(1.55,0.1,0.35,dark,3.75,1.65,-2.3);
    var rug = new THREE.Mesh(new THREE.CircleGeometry(1.35,32),new THREE.MeshStandardMaterial({color:0x9a5c48,roughness:1})); rug.rotation.x=-Math.PI/2; rug.position.set(0,0.13,0.45); rug.scale.set(1.35,0.76,1); g.add(rug);
    box(0.55,0.82,0.12,dark,0,2.65,0.1); box(0.24,0.36,0.24,warm,0,2.65,0.16);
    var lamp = new THREE.PointLight(0xffb858,1.6,12,2); lamp.position.set(0,2.75,0.4); g.add(lamp);
    var win = new THREE.Mesh(new THREE.PlaneGeometry(1.1,0.9),new THREE.MeshBasicMaterial({color:0xffd38c})); win.position.set(4.37,2.2,1.1); win.rotation.y=-Math.PI/2; g.add(win);
    g.traverse(function(o){if(o.isMesh)o.frustumCulled=false;});
    g.visible=false; window.__garden.add(g); indoorRoom=g; window.__insideRoom=g; return g;
  }
  function toggleHouse() {
    var cab=window.__cabinPos || {x:26,z:9};
    if (indoorMode) {
      indoorMode=false; indoorRoom.visible=false;
      if (window.__cabinGroup) window.__cabinGroup.visible=true;
      if (indoorReturn) pPos.copy(indoorReturn);
      orbitYaw=indoorYawReturn; orbitPitch=indoorPitchReturn;
      showToast('Ra ngoài vườn'); return true;
    }
    var pl=playerLocal(), d=Math.hypot(pl.x-cab.x,pl.z-cab.z);
    if (d>4.1) return false;
    indoorRoom=makeInterior(); indoorRoom.visible=true; indoorMode=true;
    indoorReturn=pPos.clone(); indoorYawReturn=orbitYaw; indoorPitchReturn=orbitPitch;
    orbitYaw=Math.PI; orbitPitch=0.34;
    if (window.__cabinGroup) window.__cabinGroup.visible=false;
    var enter=new THREE.Vector3(cab.x,0,cab.z); window.__garden.localToWorld(enter); pPos.set(enter.x,enter.y,enter.z);
    pY=0; flyMode=false; onGround=true;
    showToast('Vào nhà — E để trở ra'); return true;
  }

  /* ---- NHIỆM VỤ hái hoa dại ---- */
  var score = 0, questIdx = 0, questN = 0;
  try {
    var sv = JSON.parse(localStorage.getItem('worldSave') || 'null');
    if (sv) {
      score = sv.sc || 0; questIdx = sv.qi || 0;
      if (sv.p) pPos.set(sv.p[0], 0, sv.p[2]);
      if (typeof sv.yaw === 'number') orbitYaw = sv.yaw;
      /* không restore bay: luôn bắt đầu trên đất cho an toàn (save fly chỉ để thống kê) */
    }
  } catch (eL) {}
  var qHud = document.createElement('div');
  qHud.style.cssText = 'position:fixed;top:52px;left:16px;z-index:50;font:600 12.5px/1.6 Georgia,serif;color:#5f4626;background:rgba(255,252,246,.78);border:1px solid rgba(122,90,52,.22);border-radius:10px;padding:7px 12px;backdrop-filter:blur(5px);max-width:250px';
  document.body.appendChild(qHud);
  var doorHint=document.createElement('div');
  doorHint.textContent='E — VÀO NHÀ';
  doorHint.style.cssText='position:fixed;left:50%;bottom:76px;transform:translateX(-50%);z-index:55;padding:7px 14px;border-radius:999px;background:rgba(255,248,224,.9);color:#644623;border:1px solid rgba(122,90,52,.34);font:700 13px Georgia,serif;opacity:0;transition:opacity .18s;pointer-events:none';
  document.body.appendChild(doorHint);
  function questTarget() { return 5 + questIdx * 3; }
  function updHud() {
    qHud.innerHTML = '\u273f Nhi\u1ec7m v\u1ee5 ' + (questIdx + 1) + ': h\u00e1i <b>' + questTarget() + ' hoa d\u1ea1i</b> \u2014 <b>' + questN + '/' + questTarget() + '</b><br>\u0110i\u1ec3m: <b>' + score + '</b>';
  }
  updHud();

  var pv = new THREE.Vector3(), pv2 = new THREE.Vector3(), fV = new THREE.Vector3(), rV = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  function playerLocal() {
    pv2.set(pPos.x, 0, pPos.z);
    window.__garden.worldToLocal(pv2);
    return pv2;
  }
  /* hái hoa: mỗi 130ms quét hoa dại gần người chơi */
  setInterval(function () {
    /* Harvest only while physically grounded; flight and ordinary jumps cannot collect. */
    if (flyMode || !onGround || pY > 0.12 || indoorMode) return;
    var pl = playerLocal();
    var picked = 0;
    window.__garden.children.forEach(function (c) {
      if (!c.visible || !c.userData || !c.userData.flowers) return;
      if (Math.abs(c.userData.cx * 10 + 5 - pl.x) > 16 || Math.abs(c.userData.cz * 10 + 5 - pl.z) > 16) return;
      c.userData.flowers.forEach(function (f) {
        if (!f.h.visible) return;
        if (Math.abs(f.h.position.x - pl.x) < 0.95 && Math.abs(f.h.position.z - pl.z) < 0.95) {
          f.h.visible = false; f.s.visible = false;
          picked++;
        }
      });
    });
    if (picked) {
      score += picked; questN += picked;
      pv.set(pl.x, hillY2(pl.x, pl.z) + 0.35, pl.z);
      window.__garden.localToWorld(pv);
      if (window.__spawnBurstW) window.__spawnBurstW(pv, 6 + picked * 2);
      if (window.__sfx) window.__sfx.chime();
      if (questN >= questTarget()) {
        questIdx++; questN = 0;
        showToast('\u273f Ho\u00e0n th\u00e0nh nhi\u1ec7m v\u1ee5! Ti\u1ebfp: h\u00e1i ' + questTarget() + ' hoa');
        if (window.__sfx) setTimeout(function () { window.__sfx.chime(); }, 220);
      }
      updHud();
    }
  }, 130);

  /* ---- vòng điều khiển 16ms: WASD + animation + camera ---- */
  setInterval(function () {
    var now = performance.now();
    var elapsedTick = Math.max(0, (now - lastTick) / 1000);
    var dt = Math.min(0.1, elapsedTick);
    var flightDt = Math.min(0.5, elapsedTick);
    lastTick = now;
    var dx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    var dz = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
    var dy = (keys.e ? 1 : 0) - (keys.q ? 1 : 0);
    fV.set(Math.sin(orbitYaw), 0, Math.cos(orbitYaw));
    rV.crossVectors(fV, UP);
    var mvx = fV.x * dz + rV.x * dx, mvz = fV.z * dz + rV.z * dx;
    var ml = Math.sqrt(mvx * mvx + mvz * mvz);
    var moving = ml > 0.01 || dy !== 0;
    var inLake = false, nearLakeCam = false, lakeAimX = 0, lakeAimZ = 1, lakeAimDist = 0;
    if (window.__lakeInfo) {
      if (!pvLq) var pvLq = new THREE.Vector3();
      pvLq.set(pPos.x, 0, pPos.z);
      window.__garden.worldToLocal(pvLq);
      var ddx = pvLq.x - window.__lakeInfo.x, ddz = pvLq.z - window.__lakeInfo.z;
      var ell = (ddx * ddx) / (window.__lakeInfo.rx * window.__lakeInfo.rx) + (ddz * ddz) / (window.__lakeInfo.rz * window.__lakeInfo.rz);
      inLake = ell < 0.98;
      nearLakeCam = ell < 4.2;
      var lakeWorldAim = window.__garden.localToWorld(new THREE.Vector3(window.__lakeInfo.x, 0, window.__lakeInfo.z));
      lakeAimX = lakeWorldAim.x - pPos.x; lakeAimZ = lakeWorldAim.z - pPos.z;
      lakeAimDist = Math.hypot(lakeAimX, lakeAimZ) || 1;
      lakeAimX /= lakeAimDist; lakeAimZ /= lakeAimDist;
    }
    if (ml > 0.01) {
      mvx /= ml; mvz /= ml;
      dashCd -= dt; dashT -= dt;
      var spd = keys.shift ? (flyMode ? 7.5 : 5.6) : 2.3;
      if (dashT > 0) spd = flyMode ? 11 : 9.5;
      if (inLake && !flyMode) spd *= 0.55;
      var nx = pPos.x + mvx * spd * dt, nz = pPos.z + mvz * spd * dt;
      var rr = Math.sqrt(nx * nx + nz * nz);
      if (rr > 46) { nx *= 46 / rr; nz *= 46 / rr; }
      pPos.x = nx; pPos.z = nz;
      pYaw = Math.atan2(mvx, mvz);
    }
    /* nhảy (Space) — nhảy cao hơn khi đang chạy nhanh */
    if (keys[' '] && onGround && !flyMode) { jumpV = 3.3 + (keys.shift ? 0.9 : 0); onGround = false; if (window.__sfx) window.__sfx.whoosh(); }
    /* bay: B bật/tắt; ↑↑/E lên, Q xuống khi bay */
    if (flyMode) {
      if (keys.e || keys[' ']) pY += 5.2 * flightDt;
      if (keys.q) pY -= 5.2 * flightDt;
      pY = Math.max(0.2, Math.min(12, pY));
      jumpV = 0;
    } else if (!onGround) {
      jumpV -= 9.2 * dt;
      pY += jumpV * dt;
      if (pY <= 0) { pY = 0; jumpV = 0; onGround = true; }
    }
    if (inLake && !flyMode && pY < 0.18) { pY = 0.18; jumpV = 0; onGround = true; }
    walkT += dt * (ml > 0.01 ? (keys.shift ? 10.5 : 7.5) : 1.6);
    var pl = playerLocal();
    var cabinCheck=window.__cabinPos||{x:26,z:9};
    doorHint.style.opacity=(indoorMode||Math.hypot(pl.x-cabinCheck.x,pl.z-cabinCheck.z)<4.1)?'1':'0';
    doorHint.textContent=indoorMode?'E — RA VƯỜN':'E — VÀO NHÀ';
    if (indoorMode) {
      pl.x = Math.max((window.__cabinPos||{x:26}).x-5.3, Math.min((window.__cabinPos||{x:26}).x+5.3, pl.x));
      pl.z = Math.max((window.__cabinPos||{z:9}).z-5.8, Math.min((window.__cabinPos||{z:9}).z+5.8, pl.z));
      window.__garden.localToWorld(pl); pPos.set(pl.x, pl.y, pl.z); window.__garden.worldToLocal(pl);
    }
    var gy2 = hillY2(pl.x, pl.z);
    if (inLake && !flyMode && window.__lakeWaterY) gy2 = window.__lakeWaterY() - 0.78; /* bơi: thân nổi nửa người trên mặt hồ */
    charG.position.set(pl.x, gy2 + pY + (ml > 0.01 && onGround ? Math.abs(Math.sin(walkT)) * 0.035 : Math.sin(walkT) * 0.012), pl.z);
    if (fbLegs) { var swF = (ml > 0.01 && !flyMode) ? Math.sin(walkT * 2) * 0.5 : 0; fbLegs[0].rotation.x = swF; fbLegs[1].rotation.x = -swF; }
    /* nghiêng người khi lướt dash — cảm giác tốc độ */
    charG.rotation.z += ((dashT > 0 ? 0.24 : 0) - charG.rotation.z) * Math.min(1, dt * 9);
    /* BAY: đóng băng animation chân (hết "bay mà vẫn đi bộ") + nghiêng người glide */
    if (mixer) mixer.timeScale = flyMode ? 0 : 1;
    charG.rotation.x += ((flyMode ? (ml > 0.01 ? 0.42 : 0.14) : 0) - charG.rotation.x) * Math.min(1, dt * 6);
    /* quay người mượt theo hướng đi */
    var dy3 = pYaw - charG.rotation.y;
    while (dy3 > Math.PI) dy3 -= 6.283;
    while (dy3 < -Math.PI) dy3 += 6.283;
    charG.rotation.y += dy3 * Math.min(1, dt * 10);
    if (mixer) {
      var moving2 = ml > 0.01;
      if (flyMode) {
        /* bay: luôn Idle (glide) — crossfade 0.4s xong mới đóng băng, không kẹ giữa bước chạy */
        flyPoseT -= dt;
        mixer.timeScale = flyPoseT > 0 ? 1 : 0;
        setAct(actIdle);
      } else {
        mixer.timeScale = 1;
        if (!onGround) setAct(actRun);
        else setAct(moving2 ? (actRun && (ml > 0.85 || keys.shift) ? actRun : actWalk) : actIdle);
        if (curAct) curAct.timeScale = moving2 ? 1.15 : 0.9;
      }
      mixer.update(dt);
    }
    /* camera third-person: sau lưng nhân vật, chặn dưới terrain;
       BAY: camera bay theo độ cao pY (hết đứng dưới đất nhìn nhân vật bay) */
    var camD = indoorMode ? 3.4 : (flyMode ? 5.4 : (nearLakeCam ? 7.6 : 5.0)), camH = (indoorMode ? 1.55 : (flyMode ? 2.35 : (nearLakeCam ? 2.85 : 1.85))) + orbitPitch * 3.4;
    var cx2 = pPos.x - fV.x * camD, cz2 = pPos.z - fV.z * camD;
    var cy2 = pPos.y + pY + camH;
    var gY = hillY2(cx2, cz2) + 0.5;
    if (cy2 < gY) cy2 = gY;
    window.CAM.set(cx2, cy2, cz2);
    var lakeLookAhead = nearLakeCam ? Math.min(2.2, lakeAimDist * 0.22) : 0;
    window.TARGET.set(pPos.x + lakeAimX * lakeLookAhead, pPos.y + pY + (indoorMode ? 1.55 : 1.05), pPos.z + lakeAimZ * lakeLookAhead);
  }, 16);

  /* ---- HUD FPS + chunk ---- */
  var fpsEl = document.getElementById('hudFps'), fr = 0, last = performance.now();
  (function fpsLoop() {
    fr++;
    var nw = performance.now();
    if (nw - last >= 500) {
      var cs = window.__chunkStats;
      if (fpsEl) fpsEl.textContent = 'FPS ' + Math.round(fr * 1000 / (nw - last)) + (cs ? '  \u00b7 chunk ' + cs.vis + '/' + cs.total : '') + (paused ? '  \u23f8' : '');
      fr = 0; last = nw;
    }
    requestAnimationFrame(fpsLoop);
  })();

  /* ---- fullscreen + home + save ---- */
  function mkBtn(txt, label, bottom, fn) {
    var b = document.createElement('button');
    b.textContent = txt;
    b.setAttribute('aria-label', label);
    b.style.cssText = 'position:fixed;left:18px;bottom:' + bottom + 'px;z-index:50;background:rgba(255,252,246,.72);border:1px solid rgba(122,90,52,.25);border-radius:999px;padding:6px 12px;font:700 14px/1 Georgia,serif;color:#6d5433;cursor:pointer;backdrop-filter:blur(6px)';
    b.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
    document.body.appendChild(b);
    return b;
  }
  mkBtn('\u26f6', 'To\u00e0n m\u00e0n h\u00ecnh', 58, function () {
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    else document.documentElement.requestFullscreen().catch(function () {});
  });
  mkBtn('\u23cd', 'V\u1ec1 \u0111i\u1ec3m xu\u1ea5t ph\u00e1t', 98, goHome);
  setInterval(function () {
    try { localStorage.setItem('worldSave', JSON.stringify({ p: [pPos.x, 0, pPos.z], yaw: orbitYaw, sc: score, qi: questIdx, fly: flyMode })); } catch (eS) {}
  }, 4000);
})();
