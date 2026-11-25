/* Trạng thái nước và van Hồ Gương: đổi mực nước có thẩm quyền, có HUD và hint. */
window.__initWaterState = function (gardenRoot) {
  if (window.__WATER_SYSTEM) return window.__WATER_SYSTEM;
  var state = 'LOW', toggles = 0, offset = -0.16;
  window.__waterState = state;
  window.__waterOffset = offset;
  window.__waterToggles = function () { return toggles; };

  var hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;left:16px;top:126px;z-index:55;padding:7px 12px;border-radius:10px;background:rgba(255,252,246,.78);border:1px solid rgba(122,90,52,.22);color:#5f4626;font:600 12.5px/1.5 Georgia,serif;pointer-events:none';
  document.body.appendChild(hud);
  function refreshHud() {
    hud.innerHTML = 'Mực nước <b>' + (state === 'HIGH' ? 'CAO' : 'THẤP') + '</b><br>Van bến Hồ Gương — <b>E</b> để đổi';
  }
  refreshHud();

  var hint = document.createElement('div');
  hint.style.cssText = 'position:fixed;left:50%;bottom:74px;transform:translateX(-50%);z-index:79;padding:6px 13px;border-radius:999px;background:rgba(28,34,30,.78);color:#ffd89a;font:600 12.5px Georgia,serif;opacity:0;transition:opacity .15s;pointer-events:none';
  document.body.appendChild(hint);

  var valveGroup = window.__REAL_ASSETS ? window.__REAL_ASSETS.makeModel('valve', { height: 1.4 }) : new THREE.Group();
  var vx = 12.8, vz = 13.2, vy = window.__hillY ? window.__hillY(vx, vz) : 0;
  valveGroup.position.set(vx, vy, vz);
  valveGroup.rotation.y = -0.7;
  gardenRoot.add(valveGroup);

  var bases = null;
  function applyWater() {
    var surf = window.__lakeSurf, shore = window.__lakeShore, bank = window.__lakeBank;
    if (!bases && surf && shore && bank) {
      bases = { surf: surf.position.y, shore: shore.position.y, bank: bank.position.y };
    }
    if (!bases) return;
    surf.position.y = bases.surf + offset;
    shore.position.y = bases.shore + offset;
    bank.position.y = bases.bank + offset;
    window.__waterOffset = offset;
    window.__waterState = state;
  }

  function nearestValve() {
    if (!window.__playerPos) return false;
    var p = new THREE.Vector3(window.__playerPos.x, 0, window.__playerPos.z);
    gardenRoot.worldToLocal(p);
    return Math.hypot(p.x - vx, p.z - vz) < 2.6;
  }

  function tryToggle() {
    if (!nearestValve()) return false;
    state = state === 'LOW' ? 'HIGH' : 'LOW';
    offset = state === 'HIGH' ? 0.18 : -0.16;
    toggles++;
    if (toggles === 1 && window.__addScore) window.__addScore(5);
    applyWater();
    refreshHud();
    if (window.__toast) window.__toast('Mực nước chuyển sang ' + (state === 'HIGH' ? 'CAO' : 'THẤP'));
    return true;
  }

  setInterval(function () {
    if (!bases) applyWater();
    hint.textContent = 'E — đổi mực nước';
    hint.style.opacity = nearestValve() ? '1' : '0';
  }, 180);

  applyWater();
  window.__WATER_SYSTEM = { tryToggle: tryToggle, refresh: refreshHud, group: valveGroup };
  return window.__WATER_SYSTEM;
};
