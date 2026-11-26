/* Combat slice: quái thật, đuổi/tell/active/recovery, đánh J/click, HP HUD. */
window.__initCombat = function (gardenRoot) {
  if (window.__COMBAT) return window.__COMBAT;
  var playerHp = 100, kills = 0, lastAttackAt = -1000, hurtFlash = 0;
  var enemies = [];
  var enemyData = [
    { id: 'EN-01', name: 'Mầm Mốc', asset: 'enemyMushroom', x: -6.2, z: -1.5, height: 0.9, hp: 3, speed: 0.9, range: 1.5, tell: 0.62, active: 0.2, recover: 0.82, damage: 8 },
    { id: 'EN-02', name: 'Lưỡi Sậy', asset: 'enemyReed', x: 9.4, z: 10.2, height: 1.55, hp: 2, speed: 1.25, range: 1.6, tell: 0.72, active: 0.18, recover: 0.75, damage: 7 },
    { id: 'EN-03', name: 'Vạc Bùn', asset: 'enemyBoulder', x: -17.5, z: -6.2, height: 1.35, hp: 5, speed: 0.55, range: 2.0, tell: 1.05, active: 0.25, recover: 1.1, damage: 12 },
    { id: 'EN-05', name: 'Đèn Rỗng', asset: 'enemyLure', x: 4.2, z: 8.4, height: 0.75, hp: 2, speed: 0.8, range: 1.2, tell: 0.85, active: 0.18, recover: 0.9, damage: 5 }
  ];

  var hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;left:16px;top:170px;z-index:56;padding:8px 12px;border-radius:10px;background:rgba(255,252,246,.8);border:1px solid rgba(122,90,52,.22);color:#5f4626;font:600 12.5px/1.5 Georgia,serif;pointer-events:none';
  document.body.appendChild(hud);

  var flashEl = document.createElement('div');
  flashEl.style.cssText = 'position:fixed;inset:0;z-index:45;pointer-events:none;background:radial-gradient(ellipse at center, rgba(200,30,20,0) 40%, rgba(200,30,20,.55) 100%);opacity:0';
  document.body.appendChild(flashEl);

  function floatText(txt, color, big) {
    var d = document.createElement('div');
    d.textContent = txt;
    d.style.cssText = 'position:fixed;z-index:70;pointer-events:none;font:700 ' + (big ? 22 : 15) + 'px Georgia,serif;color:' + color + ';text-shadow:0 1px 3px rgba(0,0,0,.6);left:' + (44 + Math.random() * 12) + '%;top:' + (42 + Math.random() * 8) + '%;transition:transform .8s ease-out,opacity .8s;';
    document.body.appendChild(d);
    requestAnimationFrame(function () { d.style.transform = 'translateY(-46px)'; d.style.opacity = '0'; });
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 850);
  }

  function refreshHud() {
    var alive = enemies.filter(function (e) { return e.hp > 0; }).length;
    var p = window.__playerPos ? gardenRoot.worldToLocal(window.__playerPos.clone()) : null;
    var near = false;
    if (p) enemies.forEach(function (e) { if (e.hp > 0 && Math.hypot(e.x - p.x, e.z - p.z) < 22) near = true; });
    hud.style.display = (near || playerHp < 100 || kills > 0) ? 'block' : 'none';
    if (hud.style.display === 'none') return;
    hud.innerHTML = 'Sức khỏe <b>' + Math.max(0, Math.round(playerHp)) + '</b> / 100' + (window.__dmgBonus ? ' · Đòn tay <b>+' + window.__dmgBonus + '</b>' : '') + '<br>Quái còn <b>' + alive + '</b> · Đã thắng <b>' + kills + '</b><br><span style="opacity:.72">J hoặc click trái để đánh</span>';
  }

  enemyData.forEach(function (info) {
    var group = window.__REAL_ASSETS ? window.__REAL_ASSETS.makeModel(info.asset, { height: info.height }) : new THREE.Group();
    group.traverse(function (o) { if (o.isMesh && o.material) { o.material = o.material.clone(); if (o.material.emissive) { o.material.emissive.setHex(0x661111); o.material.emissiveIntensity = 0.55; } } });
    var y = window.__hillY ? window.__hillY(info.x, info.z) : 0;
    group.position.set(info.x, y, info.z);
    gardenRoot.add(group);
    var alert = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.68, 24), new THREE.MeshBasicMaterial({ color: 0xff4433, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    alert.rotation.x = -Math.PI / 2;
    alert.position.set(info.x, y + 0.06, info.z);
    alert.visible = false;
    gardenRoot.add(alert);
    var barBg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x1a120c, transparent: true, opacity: 0.85, depthWrite: false }));
    barBg.scale.set(1.15, 0.13, 1);
    barBg.position.set(info.x, y + info.height + 0.55, info.z);
    gardenRoot.add(barBg);
    var barFg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x7ee06a, transparent: true, opacity: 1, depthWrite: false }));
    barFg.scale.set(1.1, 0.09, 1);
    barFg.position.set(info.x - 0.55 + 0.55, y + info.height + 0.55, info.z);
    gardenRoot.add(barFg);
    enemies.push({
      info: info, group: group, alert: alert, barBg: barBg, barFg: barFg, hp: info.hp, maxHp: info.hp, state: 'IDLE', timer: 0,
      homeX: info.x, homeZ: info.z, flash: 0
    });
  });

  function localPlayer() {
    if (!window.__playerPos) return null;
    var p = new THREE.Vector3(window.__playerPos.x, 0, window.__playerPos.z);
    gardenRoot.worldToLocal(p);
    return p;
  }

  function dist2d(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

  function damagePlayer(amount) {
    playerHp -= amount;
    hurtFlash = 0.55;
    window.__shakeT = performance.now(); window.__shakeAmt = 0.16;
    floatText('-' + amount, '#ff5a4a', true);
    if (window.__sfx) window.__sfx.whoosh();
    if (playerHp <= 0) {
      playerHp = 100;
      if (window.__goHome) window.__goHome();
    }
    refreshHud();
  }
  window.__healFull = function () { playerHp = 100; refreshHud(); };

  function attack() {
    var now = performance.now();
    if (now - lastAttackAt < 450) return;
    lastAttackAt = now;
    var p = localPlayer();
    if (!p) return;
    var best = null, bd = 3.4;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.hp <= 0) continue;
      var d = dist2d(p, e.group.position);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return;
    var dmg = 1 + (window.__dmgBonus || 0);
    var d0 = dist2d(p, best.group.position) || 1;
    if (d0 > 1.6) {
      var lx = (best.group.position.x - p.x) / d0, lz = (best.group.position.z - p.z) / d0;
      var nw = new THREE.Vector3(p.x + lx * 1.1, 0, p.z + lz * 1.1);
      var ww = gardenRoot.localToWorld(nw);
      window.__playerPos.x = ww.x; window.__playerPos.z = ww.z;
      p = localPlayer();
    }
    best.hp -= dmg;
    best.flash = 0.25;
    var kd = dist2d(p, best.group.position) || 1;
    best.group.position.x += (best.group.position.x - p.x) / kd * 1.3;
    best.group.position.z += (best.group.position.z - p.z) / kd * 1.3;
    var gy2 = window.__hillY ? window.__hillY(best.group.position.x, best.group.position.z) : 0;
    best.group.position.y = gy2;
    window.__shakeT = now; window.__shakeAmt = 0.05;
    floatText('-' + dmg, '#ffd76a', false);
    if (window.__sfx) window.__sfx.chime();
    if (best.hp <= 0) {
      kills += 1;
      best.group.visible = false;
      best.state = 'DEAD';
      if (best.alert) best.alert.visible = false;
      if (best.barBg) best.barBg.visible = false;
      if (best.barFg) best.barFg.visible = false;
      if (window.__addScore) window.__addScore(10);
    } else if (best.state === 'TELL') {
      best.state = 'RECOVER';
      best.timer = best.info.recover;
    }
    refreshHud();
  }

  window.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    if (k === 'j') attack();
  });
  window.addEventListener('pointerdown', function (e) {
    if (e.button === 0 && (!e.target.closest || !e.target.closest('button, .hud, .touchpad, .touchbtn'))) attack();
  });

  setInterval(function () {
    var dt = 0.08;
    if (hurtFlash > 0) hurtFlash = Math.max(0, hurtFlash - dt);
    flashEl.style.opacity = hurtFlash.toFixed(2);
    var p = localPlayer();
    if (!p) return;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.hp <= 0) continue;
      if (e.flash > 0) {
        e.flash = Math.max(0, e.flash - dt);
        e.group.scale.setScalar(1 + e.flash * 0.5);
      } else e.group.scale.setScalar(1);
      var d = dist2d(p, e.group.position);
      e.timer -= dt;
      var frac = Math.max(0, e.hp / e.maxHp);
      if (e.barBg) { e.barBg.visible = e.hp > 0; e.barFg.visible = e.hp > 0 && frac > 0; }
      if (e.barFg && e.barFg.visible) {
        e.barFg.scale.x = 1.1 * frac;
        e.barFg.material.color.setHex(frac > 0.5 ? 0x7ee06a : (frac > 0.25 ? 0xffc14a : 0xff5a4a));
        e.barFg.position.x = e.group.position.x - 0.55 + 0.55 * frac;
        e.barFg.position.z = e.group.position.z;
        e.barFg.position.y = (window.__hillY ? window.__hillY(e.group.position.x, e.group.position.z) : 0) + e.info.height + 0.55;
        e.barBg.position.x = e.group.position.x;
        e.barBg.position.z = e.group.position.z;
        e.barBg.position.y = e.barFg.position.y;
      }
      if (e.state === 'IDLE' || e.state === 'CHASE') {
        if (d > 13) { e.state = 'IDLE'; if (e.alert) { e.alert.visible = false; } continue; }
        if (e.state === 'IDLE' && e.alert) e.alert.visible = true;
        e.state = 'CHASE';
        if (e.alert) { e.alert.position.x = e.group.position.x; e.alert.position.z = e.group.position.z; e.alert.position.y = (window.__hillY ? window.__hillY(e.group.position.x, e.group.position.z) : 0) + 0.06; e.alert.rotation.z += dt * 3; }
        if (d > e.info.range) {
          var dx = (p.x - e.group.position.x) / d, dz = (p.z - e.group.position.z) / d;
          var sp = e.info.speed * 1.35;
          e.group.position.x += dx * sp * dt;
          e.group.position.z += dz * sp * dt;
          var gy = window.__hillY ? window.__hillY(e.group.position.x, e.group.position.z) : 0;
          e.group.position.y = gy;
        }
        e.group.rotation.y = Math.atan2(p.x - e.group.position.x, p.z - e.group.position.z);
        if (d <= e.info.range) { e.state = 'TELL'; e.timer = e.info.tell; if (e.alert) e.alert.material.color.setHex(0xff2211); }
      } else if (e.state === 'TELL') {
        e.group.scale.setScalar(1 + 0.08 * Math.sin(performance.now() * 0.03));
        if (e.alert) { e.alert.position.x = e.group.position.x; e.alert.position.z = e.group.position.z; }
        if (e.timer <= 0) {
          if (dist2d(p, e.group.position) <= e.info.range + 0.35) damagePlayer(e.info.damage);
          e.state = 'ACTIVE'; e.timer = e.info.active;
        }
      } else if (e.state === 'ACTIVE') {
        if (e.timer <= 0) { e.state = 'RECOVER'; e.timer = e.info.recover; if (e.alert) { e.alert.visible = false; e.alert.material.color.setHex(0xff4433); } }
      } else if (e.state === 'RECOVER') {
        if (e.timer <= 0) e.state = 'CHASE';
      }
    }
  }, 80);

  window.__combatState = function () {
    return {
      hp: playerHp, kills: kills, attackCd: Math.max(0, 450 - (performance.now() - lastAttackAt)) / 1000,
      enemies: enemies.map(function (e) { return { id: e.info.id, name: e.info.name, hp: e.hp, state: e.state, visible: e.group.visible, children: e.group.children.length, pos: e.group.position.toArray() }; })
    };
  };
  window.__COMBAT = { enemies: enemies, attack: attack, hud: hud, damagePlayer: damagePlayer };
  refreshHud();
  return window.__COMBAT;
};
