/* Cánh Đồng — Mô hình địa lý Đại Việt 8 khu vực (deterministic, dùng chung cho terrain, chunk, minimap). */
window.__REGION = (function () {
  var DATA = window.__WORLD_MAP_DATA || {
    regions: [], landPolys: [], skyPolys: [], rivers: [], roads: [],
    bounds: { minX: -110.4, maxX: 369.6, minZ: -162.7, maxZ: 125.3 }
  };
  var SEA_LEVEL = -0.55;

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function smooth(v, a, b) {
    var t = clamp01((v - a) / (b - a || 1));
    return t * t * (3 - 2 * t);
  }
  function mix(a, b, t) { return a + (b - a) * t; }

  /* Tính bounding box sẵn để tăng tốc truy vấn Point-in-Polygon và Distance-to-Polyline */
  function makeBBox(pts, pad) {
    var minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
    for (var i = 0; i < pts.length; i++) {
      if (pts[i][0] < minX) minX = pts[i][0];
      if (pts[i][0] > maxX) maxX = pts[i][0];
      if (pts[i][1] < minZ) minZ = pts[i][1];
      if (pts[i][1] > maxZ) maxZ = pts[i][1];
    }
    return { pts: pts, minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad };
  }
  var landBoxes = DATA.landPolys.map(function (p) { return makeBBox(p, 16); });
  var skyBoxes = DATA.skyPolys.map(function (p) { return makeBBox(p, 8); });
  var riverBoxes = DATA.rivers.map(function (p) { return makeBBox(p, 8); });
  var roadBoxes = DATA.roads.map(function (p) { return makeBBox(p, 6); });

  function pointInPoly(x, z, pts) {
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], zi = pts[i][1], xj = pts[j][0], zj = pts[j][1];
      if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / ((zj - zi) || 1e-9) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  function distToPolyline(x, z, pts, closed) {
    var best2 = 1e12;
    var end = closed ? pts.length : pts.length - 1;
    for (var i = 0; i < end; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length];
      var abx = b[0] - a[0], abz = b[1] - a[1];
      var ab2 = abx * abx + abz * abz;
      var t = ab2 > 1e-9 ? clamp01(((x - a[0]) * abx + (z - a[1]) * abz) / ab2) : 0;
      var dx = x - (a[0] + abx * t), dz = z - (a[1] + abz * t);
      var d2 = dx * dx + dz * dz;
      if (d2 < best2) best2 = d2;
    }
    return Math.sqrt(best2);
  }

  /* Khoảng cách có dấu tới bờ biển Đại Việt (>0: đất liền, <0: biển) */
  function coastDist(x, z) {
    var inside = false, minDist = 999;
    for (var i = 0; i < landBoxes.length; i++) {
      var b = landBoxes[i];
      if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
      if (!inside && pointInPoly(x, z, b.pts)) inside = true;
      var d = distToPolyline(x, z, b.pts, true);
      if (d < minDist) minDist = d;
    }
    if (minDist > 900) {
      /* Ngoài bbox tất cả đảo/lục địa: ước lượng khoảng cách thô tới tâm lục địa */
      return -Math.max(12, Math.hypot(x - 125, z + 20) - 180);
    }
    return inside ? minDist : -minDist;
  }

  function skyIsleDist(x, z) {
    var inside = false, minDist = 999;
    for (var i = 0; i < skyBoxes.length; i++) {
      var b = skyBoxes[i];
      if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
      if (!inside && pointInPoly(x, z, b.pts)) inside = true;
      var d = distToPolyline(x, z, b.pts, true);
      if (d < minDist) minDist = d;
    }
    return inside ? minDist : -minDist;
  }

  function riverDist(x, z) {
    var minDist = 999;
    for (var i = 0; i < riverBoxes.length; i++) {
      var b = riverBoxes[i];
      if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
      var d = distToPolyline(x, z, b.pts, false);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  function roadDist(x, z) {
    var minDist = 999;
    for (var i = 0; i < roadBoxes.length; i++) {
      var b = roadBoxes[i];
      if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
      var d = distToPolyline(x, z, b.pts, false);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  var REGION_LIST = DATA.regions;
  var R_MAP = {};
  REGION_LIST.forEach(function (r) { R_MAP[r.id] = r; });

  function weights(x, z) {
    var w = { r01: 0, r02: 0, r03: 0, r04: 0, r05: 0, r06: 0, r07: 0, r08: 0, ocean: 0 };
    var cd = coastDist(x, z);
    var sd = skyIsleDist(x, z);
    if (sd > -1.5) {
      w.r08 = smooth(sd, -1.5, 4);
    }
    if (cd < 0) {
      w.ocean = smooth(-cd, 0, 5);
    }
    var sumLand = 0;
    for (var i = 0; i < REGION_LIST.length; i++) {
      var reg = REGION_LIST[i];
      var d = Math.hypot(x - reg.x, z - reg.z);
      var rad = reg.radius || 60;
      var val = Math.exp(-(d * d) / (2 * rad * rad * 0.65));
      w[reg.id] = Math.max(w[reg.id], val);
      sumLand += val;
    }
    if (sumLand > 0) {
      for (var j = 0; j < REGION_LIST.length; j++) {
        var id = REGION_LIST[j].id;
        if (id === 'r08' && sd > -1.5) continue;
        w[id] /= sumLand;
      }
    }
    return w;
  }

  function at(x, z) {
    var sd = skyIsleDist(x, z);
    if (sd > 0 && window.__playerPos && window.__playerPos.y > 12) return 'r08';
    var cd = coastDist(x, z);
    if (cd < -1.5) return 'ocean';
    var best = 'r01', bestVal = -1;
    for (var i = 0; i < REGION_LIST.length; i++) {
      var reg = REGION_LIST[i];
      var d = Math.hypot(x - reg.x, z - reg.z) / (reg.radius || 60);
      var score = 1 / (0.15 + d * d);
      if (score > bestVal) { bestVal = score; best = reg.id; }
    }
    return best;
  }

  function heightAt(x, z) {
    var cd = coastDist(x, z);
    var w = weights(x, z);

    /* Vùng khởi đầu quanh gốc (0,0) giữ êm để nhà/vườn/Hồ Gương không bị biến dạng */
    var spawnFlat = 1 - smooth(Math.hypot(x, z), 14, 34);

    /* 1. Đồng Bằng Kinh Kỳ & Ruộng Bậc Thang (r01) */
    var r01Raw = 0.35 + 1.45 * Math.sin(x * 0.045 + 0.5) * Math.cos(z * 0.04 + 0.3)
      + 0.45 * Math.sin(x * 0.14 - z * 0.11);
    var r01Terrace = Math.floor(r01Raw * 2.1) / 2.1;
    var h01 = mix(r01Raw, r01Terrace, 0.55) * (1 - spawnFlat * 0.88);

    /* 2. Đại Thụ Cây Đa Thần & Rừng Núi Đá Vôi (r02) */
    var r2 = R_MAP.r02 || { x: 4.8, z: -79.2 };
    var d2 = Math.hypot(x - r2.x, z - r2.z);
    var karst = Math.pow(Math.max(0, Math.sin(x * 0.11) * Math.cos(z * 0.11)), 2) * 8.5;
    var h02 = 1.4 + karst + 1.6 * Math.sin(x * 0.06 + z * 0.05) + 4.2 * Math.exp(-(d2 * d2) / 380);

    /* 3. Bãi Biển Đá Đỏ & Tháp Chăm Cổ (r03) */
    var r3 = R_MAP.r03 || { x: 122.4, z: 60.5 };
    var d3 = Math.hypot(x - r3.x, z - r3.z);
    var dune = 1.2 + 1.8 * Math.sin(x * 0.08 + Math.sin(z * 0.07)) + 0.6 * Math.cos(z * 0.15);
    var cliff3 = Math.floor((dune + 3.4 * Math.exp(-(d3 * d3) / 450)) * 1.4) / 1.4;
    var h03 = mix(dune, cliff3, 0.65);

    /* 4. Rừng Đước Ngập Mặn & Phế Tích Chìm (r04) */
    var h04 = -0.35 + 0.72 * Math.sin(x * 0.12 + 1.1) * Math.cos(z * 0.13 - 0.6)
      + 0.35 * Math.sin(x * 0.25 - z * 0.22);

    /* 5. Đỉnh Tuyết Hoàng Liên & Cổ Tự Trên Mây (r05) */
    var r5 = R_MAP.r05 || { x: 245.8, z: -69.1 };
    var d5 = Math.hypot(x - r5.x, z - r5.z);
    var ridge5 = Math.abs(Math.sin(x * 0.06 + z * 0.04)) * 5.5 + Math.abs(Math.cos(x * 0.11 - z * 0.09)) * 2.8;
    var h05 = 3.2 + ridge5 + 11.5 * Math.exp(-(d5 * d5) / 1150);

    /* 6. Hắc Sơn Núi Lửa Huyền Thiết (r06) — vành núi cao bao quanh miệng núi lửa lõm */
    var r6 = R_MAP.r06 || { x: 122.4, z: -106.6 };
    var d6 = Math.hypot(x - r6.x, z - r6.z);
    var rim6 = 12.2 * Math.exp(-Math.pow((d6 - 18) / 11, 2));
    var crater6 = -7.5 * Math.exp(-(d6 * d6) / 95);
    var h06 = 2.0 + rim6 + crater6 + 1.1 * Math.sin(x * 0.16) * Math.cos(z * 0.16);

    /* 7. Thiên Khanh Sơn Đoòng & Vực Ngọc Bích (r07) — hố sụt sâu ở trung tâm lục địa */
    var r7 = R_MAP.r07 || { x: 127.2, z: -15.8 };
    var d7 = Math.hypot(x - r7.x, z - r7.z);
    var sinkhole = -11.5 * (1 - smooth(d7, 7, 24));
    var rim7 = 4.6 * Math.exp(-Math.pow((d7 - 26) / 10, 2));
    var h07 = 1.6 + rim7 + sinkhole + 0.7 * Math.sin(x * 0.15 + z * 0.12);

    /* 8. Tiên Giới Đảo Bay (nền đất bên dưới) */
    var h08 = 0.8 + 1.2 * Math.sin(x * 0.08) * Math.cos(z * 0.08);

    var landH = w.r01 * h01 + w.r02 * h02 + w.r03 * h03 + w.r04 * h04
      + w.r05 * h05 + w.r06 * h06 + w.r07 * h07 + w.r08 * h08;

    /* Cắt sông ngòi (trừ đỉnh núi tuyết > 9m và tâm vùng spawn) */
    var rd = riverDist(x, z);
    if (rd < 4.5 && landH < 9.5) {
      var rCut = (1 - smooth(rd, 1.2, 4.5)) * (1 - spawnFlat * 0.85);
      landH = mix(landH, -1.65, rCut * 0.85);
    }

    /* Làm phẳng nhẹ quan lộ */
    var roadd = roadDist(x, z);
    if (roadd < 2.6) {
      var roadF = 1 - smooth(roadd, 0.8, 2.6);
      landH = mix(landH, Math.max(0.25, landH * 0.85), roadF * 0.35);
    }

    /* Bờ biển & đáy biển */
    if (cd < 0) {
      var seaDepth = mix(-0.7, -3.8, smooth(-cd, 0, 14));
      return seaDepth + 0.2 * Math.sin(x * 0.18) * Math.cos(z * 0.18);
    }
    var shoreF = smooth(cd, 0, 7.5);
    return mix(-0.48, landH, shoreF);
  }

  function colorAt(x, z) {
    var cd = coastDist(x, z);
    if (cd < -0.5) return [0.16, 0.37, 0.43];
    if (cd < 3.6) return [0.74, 0.67, 0.46];

    var w = weights(x, z);
    var h = heightAt(x, z);

    var c01 = [0.40, 0.56, 0.26]; /* Đồng bằng lúa & cỏ */
    var c02 = [0.23, 0.41, 0.25]; /* Rừng đá vôi rêu */
    var c03 = [0.73, 0.46, 0.24]; /* Cát vàng & đá đỏ Chăm */
    var c04 = [0.22, 0.39, 0.33]; /* Rừng đước ngập mặn */
    var c05 = h > 8.5 ? [0.90, 0.94, 0.97] : [0.44, 0.49, 0.52]; /* Tuyết trắng / đá núi */
    var r6 = R_MAP.r06 || { x: 122.4, z: -106.6 };
    var d6 = Math.hypot(x - r6.x, z - r6.z);
    var c06 = (d6 < 10 && h < 1.5) ? [0.88, 0.30, 0.08] : [0.20, 0.18, 0.20]; /* Dung nham / đá bazan */
    var r7 = R_MAP.r07 || { x: 127.2, z: -15.8 };
    var d7 = Math.hypot(x - r7.x, z - r7.z);
    var c07 = d7 < 14 ? [0.15, 0.49, 0.47] : [0.33, 0.37, 0.35]; /* Vực ngọc bích / vách đá vôi */
    var c08 = [0.56, 0.65, 0.42];

    var rgb = [0, 1, 2].map(function (ch) {
      return w.r01 * c01[ch] + w.r02 * c02[ch] + w.r03 * c03[ch] + w.r04 * c04[ch]
        + w.r05 * c05[ch] + w.r06 * c06[ch] + w.r07 * c07[ch] + w.r08 * c08[ch];
    });

    /* Đường quan lộ */
    var roadd = roadDist(x, z);
    if (roadd < 1.8) {
      var rf = 1 - smooth(roadd, 0.6, 1.8);
      rgb[0] = mix(rgb[0], 0.58, rf * 0.75);
      rgb[1] = mix(rgb[1], 0.49, rf * 0.75);
      rgb[2] = mix(rgb[2], 0.35, rf * 0.75);
    }
    return rgb;
  }

  var waypoints = REGION_LIST.map(function (r) {
    return { id: r.id, num: r.num, name: r.name, sub: r.sub, x: r.x, z: r.z, color: r.color };
  });

  var names = { ocean: 'Đông Hải Bích Ba' };
  REGION_LIST.forEach(function (r) { names[r.id] = r.name; });

  return {
    DATA: DATA,
    SEA_LEVEL: SEA_LEVEL,
    coastDist: coastDist,
    skyIsleDist: skyIsleDist,
    riverDist: riverDist,
    roadDist: roadDist,
    weights: weights,
    at: at,
    heightAt: heightAt,
    colorAt: colorAt,
    waypoints: waypoints,
    names: names
  };
})();
