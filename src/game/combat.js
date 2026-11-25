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

  function refreshHud() {
    var alive = enemies.filter(function (e) { return e.hp > 0; }).length;
    var p = window.__playerPos ? gardenRoot.worldToLocal(window.__playerPos.clone()) : null;
    var near = false;
    if (p) enemies.forEach(function (e) { if (e.hp > 0 && Math.hypot(e.x - p.x, e.z - p.z) < 22) near = true; });
    hud.style.display = (near || playerHp < 100 || kills > 0) ? 'block' : 'none';
    if (hud.style.display === 'none') return;
    hud.innerHTML = 'Sức khỏe <b>' + Math.max(0, Math.round(playerHp)) + '</b> / 100<br>Quái còn <b>' + alive + '</b> · Đã thắng <b>' + kills + '</b><br><span style="opacity:.72">J hoặc click trái để đánh</span>';
  }

  enemyData.forEach(function (info) {
    var group = window.__REAL_ASSETS ? window.__REAL_ASSETS.makeModel(info.asset, { height: info.height }) : new THREE.Group();
    var y = window.__hillY ? window.__hillY(info.x, info.z) : 0;
    group.position.set(info.x, y, info.z);
    gardenRoot.add(group);
    enemies.push({
      info: info, group: group, hp: info.hp, state: 'IDLE', timer: 0,
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
    hurtFlash = 0.35;
    if (playerHp <= 0) {
      playerHp = 100;
      if (window.__goHome) window.__goHome();
    }
    refreshHud();
  }

  function attack() {
    var now = performance.now();
    if (now - lastAttackAt < 450) return;
    lastAttackAt = now;
    var p = localPlayer();
    if (!p) return;
    var best = null, bd = 2.7;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.hp <= 0) continue;
      var d = dist2d(p, e.group.position);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return;
    best.hp -= 1;
    best.flash = 0.25;
    if (best.hp <= 0) {
      kills += 1;
      best.group.visible = false;
      best.state = 'DEAD';
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
    if (e.button === 0 && !e.target.closest && !e.target.closest('button')) attack();
  });

  setInterval(function () {
    var dt = 0.08;
    if (hurtFlash > 0) hurtFlash = Math.max(0, hurtFlash - dt);
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
      if (e.state === 'IDLE' || e.state === 'CHASE') {
        if (d > 9) { e.state = 'IDLE'; continue; }
        e.state = 'CHASE';
        if (d > e.info.range) {
          var dx = (p.x - e.group.position.x) / d, dz = (p.z - e.group.position.z) / d;
          e.group.position.x += dx * e.info.speed * dt;
          e.group.position.z += dz * e.info.speed * dt;
          var gy = window.__hillY ? window.__hillY(e.group.position.x, e.group.position.z) : 0;
          e.group.position.y = gy;
        }
        e.group.rotation.y = Math.atan2(p.x - e.group.position.x, p.z - e.group.position.z);
        if (d <= e.info.range) { e.state = 'TELL'; e.timer = e.info.tell; }
      } else if (e.state === 'TELL') {
        e.group.scale.setScalar(1 + 0.08 * Math.sin(performance.now() * 0.03));
        if (e.timer <= 0) {
          if (dist2d(p, e.group.position) <= e.info.range + 0.35) damagePlayer(e.info.damage);
          e.state = 'ACTIVE'; e.timer = e.info.active;
        }
      } else if (e.state === 'ACTIVE') {
        if (e.timer <= 0) { e.state = 'RECOVER'; e.timer = e.info.recover; }
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
