/* Cánh Đồng — menu chính, loading, pause, ending screen */
window.__initMenu = function () {
  if (window.__MENU) return window.__MENU;
  window.__MENU_OPEN = true;

  var css = 'position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 35%, rgba(46,66,48,.88), rgba(16,22,16,.96));color:#f4ead7;font-family:Georgia,serif;text-align:center';
  function btn(label, fn, primary) {
    var b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'margin-top:10px;min-width:240px;padding:12px 26px;border-radius:12px;border:1px solid ' + (primary ? '#ffd76a' : 'rgba(244,234,215,.4)') + ';background:' + (primary ? 'rgba(255,215,106,.14)' : 'rgba(244,234,215,.06)') + ';color:' + (primary ? '#ffd76a' : '#f4ead7') + ';font:700 17px Georgia,serif;cursor:pointer;transition:background .15s';
    b.onmouseenter = function () { b.style.background = primary ? 'rgba(255,215,106,.28)' : 'rgba(244,234,215,.16)'; };
    b.onmouseleave = function () { b.style.background = primary ? 'rgba(255,215,106,.14)' : 'rgba(244,234,215,.06)'; };
    b.addEventListener('click', fn);
    return b;
  }

  var load = document.createElement('div');
  load.style.cssText = css;
  load.innerHTML = '<div style="font:700 42px Georgia,serif;letter-spacing:.12em">CÁNH ĐỒNG</div><div style="margin-top:14px;font:italic 15px Georgia,serif;opacity:.8">đang tải thế giới…</div>';
  document.body.appendChild(load);

  var title = document.createElement('div');
  title.style.cssText = css + ';display:none';
  title.innerHTML = '<div style="font:700 64px Georgia,serif;letter-spacing:.14em;text-shadow:0 4px 24px rgba(0,0,0,.5)">CÁNH ĐỒNG</div>' +
    '<div style="margin-top:6px;font:italic 17px Georgia,serif;opacity:.85">vùng nước bị lãng quên — một đồng quê đang đổi dòng</div>';
  var hasSave = false;
  try { hasSave = !!localStorage.getItem('worldSave'); } catch (e) {}
  var playBtn = btn(hasSave ? 'Tiếp tục hành trình' : 'Bắt đầu', startGame, true);
  title.appendChild(playBtn);
  title.appendChild(btn('Hướng dẫn', function () { title.style.display = 'none'; howto.style.display = 'flex'; }, false));
  var foot = document.createElement('div');
  foot.style.cssText = 'position:absolute;bottom:18px;font:12px Georgia,serif;opacity:.5';
  foot.textContent = 'WASD đi · Shift chạy · Space nhảy · E tương tác · J đánh · X lặn (ở hồ) · B bay · M bản đồ · H về nhà · Esc menu';
  title.appendChild(foot);
  document.body.appendChild(title);

  var howto = document.createElement('div');
  howto.style.cssText = css + ';display:none';
  howto.innerHTML = '<div style="font:700 26px Georgia,serif;margin-bottom:12px">Hướng dẫn</div>' +
    '<div style="font:14.5px/1.9 Georgia,serif;opacity:.9;max-width:520px;text-align:left">' +
    '• <b>WASD</b> di chuyển, <b>Shift</b> chạy nhanh, <b>Space</b> nhảy, <b>C</b> lướt<br>' +
    '• <b>E</b> nói chuyện / tương tác (NPC, van nước, cột mốc, cửa nhà)<br>' +
    '• <b>J</b> hoặc click trái để đánh quái<br>' +
    '• <b>X</b> lặn khi đang ở trong hồ · <b>B</b> bay · <b>H</b> về điểm xuất phát<br>' +
    '• <b>M</b> phóng to bản đồ · <b>Esc</b> mở menu<br>' +
    '• Làm theo <b>mũi tên đỏ</b> và cột sáng để hoàn thành 28 nhiệm vụ<br>' +
    '• Nhặt <b>mảnh sáng vàng</b> — đủ 5 mảnh để lên level đòn tay</div>';
  var hb = btn('Quay lại', function () { howto.style.display = 'none'; title.style.display = 'flex'; }, true);
  howto.appendChild(hb);
  document.body.appendChild(howto);

  var pause = document.createElement('div');
  pause.style.cssText = css + ';display:none;background:rgba(14,18,14,.82);backdrop-filter:blur(6px)';
  pause.innerHTML = '<div style="font:700 34px Georgia,serif;letter-spacing:.1em">TẠM DỪNG</div>';
  pause.appendChild(btn('Tiếp tục', togglePause, true));
  pause.appendChild(btn('Hướng dẫn', function () { pause.style.display = 'none'; howto.style.display = 'flex'; howto.dataset.from = 'pause'; }, false));
  pause.appendChild(btn('Về màn hình chính', function () { location.reload(); }, false));
  document.body.appendChild(pause);

  var ending = document.createElement('div');
  ending.style.cssText = css + ';display:none';
  document.body.appendChild(ending);

  function startGame() {
    title.style.display = 'none';
    load.style.display = 'none';
    window.__MENU_OPEN = false;
    if (window.__sfx) window.__sfx.chime();
  }
  window.__MENU_START = startGame;

  function togglePause() {
    if (window.__MENU_OPEN && pause.style.display === 'flex') { pause.style.display = 'none'; window.__MENU_OPEN = false; return; }
    pause.style.display = 'flex';
    window.__MENU_OPEN = true;
  }
  window.addEventListener('keydown', function (e) {
    if ((e.key || '') === 'Escape') {
      if (howto.style.display === 'flex') { howto.style.display = 'none'; if (howto.dataset.from === 'pause') { pause.style.display = 'flex'; } else { title.style.display = 'flex'; window.__MENU_OPEN = true; } return; }
      if (title.style.display === 'flex') return;
      togglePause();
    }
  });

  window.__showEnding = function (policy) {
    window.__MENU_OPEN = true;
    var policyText = {
      LOW_PROTECT: 'THẤP — giữ bờ an toàn, thượng nguồn chậm hồi phục',
      HIGH_ACCESS: 'CAO — mở dòng cho sinh cảnh, cần cảnh báo ngập thường trực',
      ROTATING_MAINTENANCE: 'XOAY VÒNG — chia dòng theo lịch, cần người giữ lịch'
    }[policy] || 'chưa chọn';
    var score = window.__questScore ? window.__questScore() : 0;
    var shards = (window.__collectibles || []).filter(function (c) { return !c.visible; }).length;
    ending.innerHTML = '<div style="font:700 46px Georgia,serif;letter-spacing:.1em">HÀNH TRÌNH KHÉP LẠI</div>' +
      '<div style="margin-top:10px;font:italic 16px Georgia,serif;opacity:.85">Chính sách vận hành đã chọn: <b>' + policyText + '</b></div>' +
      '<div style="margin-top:16px;font:600 18px Georgia,serif">Điểm: ' + score + ' · Mảnh sáng: ' + shards + '/26 · Quái đã hạ: ' + (window.__combatState ? window.__combatState().kills : 0) + '</div>' +
      '<div style="margin-top:8px;font:italic 14px Georgia,serif;opacity:.7">Cánh Đồng vẫn ở đó, đổi theo dòng nước bạn để lại.</div>';
    ending.appendChild(btn('Chơi lại', function () { try { localStorage.removeItem('canhdongCampaign'); } catch (e) {} location.reload(); }, true));
    ending.style.display = 'flex';
  };

  var bootIv = setInterval(function () {
    if (window.__bootOK && window.__charLoaded) {
      clearInterval(bootIv);
      load.style.display = 'none';
      title.style.display = 'flex';
    }
  }, 400);

  window.__MENU = { start: startGame, togglePause: togglePause };
  return window.__MENU;
};
