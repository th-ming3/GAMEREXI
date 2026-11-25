/* B-01 Người Gác Mạch: 3 phase, tell/active/recovery, core seam mở lúc recover. */
window.__initBoss = function (gardenRoot) {
  if (window.__BOSS) return window.__BOSS;
  var hp = 12, phase = 1, state = 'IDLE', timer = 0, attackKind = 'SWEEP';
  var defeated = false, lastHit = -1000;

  var hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;left:16px;top:216px;z-index:56;padding:8px 12px;border-radius:10px;background:rgba(255,252,246,.8);border:1px solid rgba(122,90,52,.22);color:#5f4626;font:600 12.5px/1.5 Georgia,serif;pointer-events:none';
  document.body.appendChild(hud);

  function refresh() {
    var core = state === 'RECOVER' ? ' <b style="color:#2b8b6a">CORE HỞ</b>' : '';
    hud.innerHTML = 'Người Gác Mạch · HP <b>' + Math.max(0, hp) + '</b>/12<br>Phase <b>' + phase + '</b> · ' + state + core;
  }

  var group = window.__REAL_ASSETS ? window.__REAL_ASSETS.makeModel('boss01', { height: 3.4 }) : new THREE.Group();
  var bx = -12, bz = -24, by = window.__hillY ? window.__hillY(bx, bz) : 0;
  group.position.set(bx, by, bz);
  gardenRoot.add(group);

  function localPlayer() {
    if (!window.__playerPos) return null;
    var p = new THREE.Vector3(window.__playerPos.x, 0, window.__playerPos.z);
    gardenRoot.worldToLocal(p);
    return p;
  }
  function dist2d(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

  function setPhase() {
    phase = hp > 7 ? 1 : (hp > 3 ? 2 : 3);
  }

  function strike(kind) {
    var p = localPlayer();
    if (!p) return;
    if (kind === 'SWEEP' && dist2d(p, group.position) <= 3.2) {
      if (window.__COMBAT && window.__COMBAT.damagePlayer) window.__COMBAT.damagePlayer(14);
    } else if (kind === 'SLAM' && dist2d(p, group.position) <= 2.5) {
      if (window.__COMBAT && window.__COMBAT.damagePlayer) window.__COMBAT.damagePlayer(18);
    }
  }

  function hit() {
    if (defeated) return;
    var now = performance.now();
    if (now - lastHit < 450) return;
    lastHit = now;
    var p = localPlayer();
    if (!p || dist2d(p, group.position) > 3.4) return;
    hp -= state === 'RECOVER' ? 2 : 1;
    setPhase();
    if (hp <= 0) {
      hp = 0; defeated = true; state = 'DEFEATED'; group.visible = false;
      if (window.__addScore) window.__addScore(100);
      try { localStorage.setItem('bossB01', '1'); } catch (e) {}
      if (window.__toast) window.__toast('B-01 đã bị đánh bại');
    }
    refresh();
  }

  window.addEventListener('keydown', function (e) {
    if ((e.key || '').toLowerCase() === 'j') hit();
  });
  window.addEventListener('pointerdown', function (e) {
    if (e.button === 0 && (!e.target.closest || !e.target.closest('button'))) hit();
  });

  setInterval(function () {
    var dt = 0.1;
    if (defeated) return;
    var p = localPlayer();
    if (!p) return;
    var d = dist2d(p, group.position);
    timer -= dt;
    if (state === 'IDLE' || state === 'CHASE') {
      if (d > 14) { state = 'IDLE'; return; }
      state = 'CHASE';
      group.rotation.y = Math.atan2(p.x - group.position.x, p.z - group.position.z);
      if (d > 2.8) {
        var dx = (p.x - group.position.x) / d, dz = (p.z - group.position.z) / d;
        group.position.x += dx * 0.7 * dt;
        group.position.z += dz * 0.7 * dt;
      } else {
        attackKind = phase >= 2 && Math.random() < 0.5 ? 'SLAM' : 'SWEEP';
        state = 'TELL';
        timer = attackKind === 'SLAM' ? 1.3 : 1.1;
      }
    } else if (state === 'TELL') {
      group.scale.setScalar(1 + 0.06 * Math.sin(performance.now() * 0.02));
      if (timer <= 0) { strike(attackKind); state = 'ACTIVE'; timer = 0.25; group.scale.setScalar(1); }
    } else if (state === 'ACTIVE') {
      if (timer <= 0) { state = 'RECOVER'; timer = phase >= 3 ? 2.4 : 3.2; }
    } else if (state === 'RECOVER') {
      if (timer <= 0) state = 'CHASE';
    }
    refresh();
  }, 100);

  window.__bossState = function () {
    return { hp: hp, phase: phase, state: state, defeated: defeated, children: group.children.length, pos: group.position.toArray() };
  };
  window.__BOSS = { group: group, hit: hit };
  refresh();
  return window.__BOSS;
};
