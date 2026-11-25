/* NPC hiện trường: model thật + hội thoại trạng thái theo quest. */
window.__initNPCs = function (gardenRoot) {
  if (window.__NPC_SYSTEM) return window.__NPC_SYSTEM;
  var DATA = [
    {
      id: 'tam', name: 'Tâm', role: 'Kỹ sư hiện trường', asset: 'npcTam', x: -2.6, z: 4.2, yaw: 0.8,
      first: 'Đồng hồ đang nói mực nước giảm. Bờ hồ lại bảo điều ngược lại. Mình cần kiểm tra ba dấu trước khi chạm van.',
      late: 'Tôi đọc nó như lệnh cần sửa. Nó là dấu vết của một lần người ta phải chọn ai được an toàn trước.'
    },
    {
      id: 'ba_man', name: 'Bà Mận', role: 'Giữ ký ức lũ', asset: 'npcBaMan', x: 2.4, z: 7.8, yaw: -1.2,
      first: 'Trước khi đổi dòng, mình cần chắc đường sơ tán vẫn mở. Lũ không chỉ là con số trên đồng hồ.',
      late: 'Đi vạch nước này cùng tôi. Nếu mình đánh dấu được đường an toàn thứ hai, tôi sẽ yên tâm hơn.'
    },
    {
      id: 'hoa', name: 'Hòa', role: 'Ngư dân bến Hồ Gương', asset: 'npcHoa', x: 11.2, z: 12.6, yaw: 2.1,
      first: 'Nếu mở nước mà cá không về thì ai trả lại cái bến này? Tôi cần thấy dấu cá trước đã.',
      late: 'Tôi đã chép lại lịch cá. Giờ mình có thể cùng giữ lịch bến cho những người tới sau.'
    },
    {
      id: 'lam', name: 'Lâm', role: 'Người ghi chép sinh cảnh', asset: 'npcLam', x: 6.4, z: -11.8, yaw: -0.4,
      first: 'Tôi ghi dấu vết, không kết luận thay người dân. Cái cò và dấu chân đang nói khác cái đồng hồ.',
      late: 'Cuốn ghi chép cần cả lời người dân lẫn dấu tự nhiên. Nhà cửa cũng là một phần của sinh cảnh.'
    }
  ];

  var panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;left:50%;bottom:110px;transform:translateX(-50%);z-index:80;width:min(560px,86vw);display:none;padding:14px 18px;border-radius:14px;background:rgba(28,34,30,.92);color:#f4ead7;font:15px/1.55 Georgia,serif;box-shadow:0 12px 36px rgba(0,0,0,.35);border:1px solid rgba(255,225,170,.24);';
  var nameEl = document.createElement('div');
  nameEl.style.cssText = 'font-weight:700;color:#ffd89a;margin-bottom:4px;letter-spacing:.02em';
  var roleEl = document.createElement('div');
  roleEl.style.cssText = 'font-size:12px;opacity:.72;margin-bottom:8px';
  var textEl = document.createElement('div');
  panel.appendChild(nameEl); panel.appendChild(roleEl); panel.appendChild(textEl);
  document.body.appendChild(panel);

  var hint = document.createElement('div');
  hint.style.cssText = 'position:fixed;left:50%;bottom:74px;transform:translateX(-50%);z-index:79;padding:6px 13px;border-radius:999px;background:rgba(28,34,30,.78);color:#ffd89a;font:600 12.5px Georgia,serif;opacity:0;transition:opacity .15s;pointer-events:none';
  document.body.appendChild(hint);

  var npcs = [];
  DATA.forEach(function (info) {
    var group = window.__REAL_ASSETS ? window.__REAL_ASSETS.makeModel(info.asset, { height: 1.78 }) : new THREE.Group();
    var y = window.__hillY ? window.__hillY(info.x, info.z) : 0;
    group.position.set(info.x, y, info.z);
    group.rotation.y = info.yaw;
    gardenRoot.add(group);
    npcs.push({ info: info, group: group });
  });

  function localPlayer() {
    if (!window.__playerPos || !gardenRoot) return null;
    var v = new THREE.Vector3(window.__playerPos.x, 0, window.__playerPos.z);
    gardenRoot.worldToLocal(v);
    return v;
  }

  function nearest() {
    var p = localPlayer();
    if (!p) return null;
    var best = null, bd = 2.8;
    for (var i = 0; i < npcs.length; i++) {
      var d = Math.hypot(npcs[i].info.x - p.x, npcs[i].info.z - p.z);
      if (d < bd) { bd = d; best = npcs[i]; }
    }
    return best;
  }

  var currentId = null;
  function tryTalk() {
    var npc = nearest();
    if (!npc) {
      if (panel.style.display === 'block') { panel.style.display = 'none'; currentId = null; return true; }
      return false;
    }
    if (panel.style.display === 'block' && currentId === npc.info.id) {
      panel.style.display = 'none'; currentId = null; return true;
    }
    currentId = npc.info.id;
    var state = window.__questState ? window.__questState() : { stage: 0 };
    var late = (state.stage || 0) >= 4;
    nameEl.textContent = npc.info.name;
    roleEl.textContent = npc.info.role;
    textEl.textContent = late ? npc.info.late : npc.info.first;
    panel.style.display = 'block';
    if (window.__sfx) window.__sfx.chime();
    return true;
  }

  setInterval(function () {
    var npc = nearest();
    if (npc) {
      hint.textContent = 'E — trò chuyện với ' + npc.info.name;
      hint.style.opacity = '1';
    } else hint.style.opacity = '0';
  }, 180);

  var walkT0 = performance.now();
  setInterval(function () {
    var el = (performance.now() - walkT0) / 1000;
    npcs.forEach(function (n, i) {
      var a = el * 0.22 + i * 1.9;
      var nx = n.info.x + Math.cos(a) * 1.5;
      var nz = n.info.z + Math.sin(a) * 1.1;
      n.group.position.set(nx, window.__hillY ? window.__hillY(nx, nz) : 0, nz);
      n.group.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a) * 0.73) + Math.PI;
    });
  }, 100);

  window.__NPC_SYSTEM = { npcs: npcs, tryTalk: tryTalk, panel: panel };
  return window.__NPC_SYSTEM;
};
