/* Tầng địa hình: một nguồn cao độ/màu đất cho base terrain và mọi chunk. */
window.__createTerrain = function (context) {
  var gardenRoot = context.gardenRoot;
  var LAKE = context.LAKE, LAKE_DEPTH = context.LAKE_DEPTH;
  var smooth = context.smooth, lakeDepth = context.lakeDepth;

  var CREEK = [[-16, -22], [-9, -10], [-2, 0], [0, 8], [-1, 14]];
  window.__creek = CREEK;
  function creekDepth(x, z) {
    var best = 1e9;
    for (var i = 0; i < CREEK.length - 1; i++) {
      var ax = CREEK[i][0], az = CREEK[i][1], bx = CREEK[i + 1][0], bz = CREEK[i + 1][1];
      var abx = bx - ax, abz = bz - az;
      var t = ((x - ax) * abx + (z - az) * abz) / (abx * abx + abz * abz || 1);
      t = Math.max(0, Math.min(1, t));
      var dx = x - (ax + abx * t), dz = z - (az + abz * t);
      best = Math.min(best, Math.sqrt(dx * dx + dz * dz));
    }
    var w = 1.7;
    var d = Math.max(0, 1 - best / w);
    return d * d * (3 - 2 * d);
  }
  window.__creekDepth = creekDepth;

  function hillY(x, z) {
    var h = 0.42 * Math.sin(x * 0.45 + 1.3) * Math.cos(z * 0.5)
          + 0.22 * Math.sin(x * 1.7 + z * 1.3)
          + 0.3 * Math.sin(x * 0.9 - z * 1.1 + 2.2)
          + smooth(-z, 2.5, 9) * 0.75;
    var rC = Math.sqrt(x * x + z * z);
    var wild = smooth(rC, 7, 24);
    var fl = 1;
    var SPOTS = hillY._fl || (hillY._fl = [[0.4, 6.8, 8], [26, 9, 7], [-27.5, -9.5, 5.5], [-18, 6, 5.5], [-30, -12, 6.5], [-10.5, -27, 6.5], [7, -20, 6.5], [4.5, 17, 9.2]]);
    for (var fi = 0; fi < SPOTS.length; fi++) {
      var dxS = x - SPOTS[fi][0], dzS = z - SPOTS[fi][1];
      fl = Math.min(fl, smooth(Math.sqrt(dxS * dxS + dzS * dzS), SPOTS[fi][2] * 0.5, SPOTS[fi][2]));
    }
    fl = Math.min(fl, 1 - Math.min(1, lakeDepth(x, z) * 2.2));
    h -= creekDepth(x, z) * 1.5 * fl;
    if (wild > 0.002) {
      var extra = 2.4 * Math.sin(x * 0.1 + 2.1) * Math.cos(z * 0.12 + 0.7)
        + 0.8 * Math.sin(x * 0.21 + z * 0.17 + 1.3)
        + 0.55 * Math.sin(x * 0.33 - z * 0.27 + 0.5) + 0.6;
      h -= lakeDepth(x, z) * LAKE_DEPTH;
      var feature = window.__REGION ? window.__REGION.heightAt(x, z) : extra;
      h += feature * fl;
    }
    return h;
  }

  function hillYWorld(x, z) {
    var q = new THREE.Vector3(x, 0, z);
    gardenRoot.worldToLocal(q);
    return hillY(q.x, q.z);
  }

  function terrainColor(x, z, target) {
    if (window.__REGION) {
      var rgb = window.__REGION.colorAt(x, z);
      target.setRGB(rgb[0], rgb[1], rgb[2]);
    } else target.setHex(0x8c925c);
    return target;
  }

  /* Lưới dày để tránh các tam giác khổng lồ gây nếp/zigzag trên mặt đất. */
  function buildGroundGeometry() {
    var step = 0.65, min = -30, max = 30;
    var positions = [], colors = [], uvs = [], indices = [], lookup = {};
    var gt = new THREE.Color();
    function vertex(x, z) {
      var key = x.toFixed(3) + '|' + z.toFixed(3);
      if (lookup[key] !== undefined) return lookup[key];
      var index = positions.length / 3;
      positions.push(x, hillY(x, z), z);
      uvs.push((x + 30) / 60, (z + 30) / 60);
      terrainColor(x, z, gt);
      var shade = 0.93 + 0.07 * Math.sin(x * 2.1) * Math.cos(z * 1.7);
      colors.push(gt.r * shade, gt.g * shade, gt.b * shade);
      lookup[key] = index;
      return index;
    }
    function insideLake(x, z) {
      var dx = (x - LAKE.x) / (LAKE.rx * 1.02), dz = (z - LAKE.z) / (LAKE.rz * 1.02);
      return dx * dx + dz * dz < 1;
    }
    for (var x = min; x < max; x += step) {
      for (var z = min; z < max; z += step) {
        var cx = x + step / 2, cz = z + step / 2;
        if (Math.sqrt(cx * cx + cz * cz) > 30 || insideLake(cx, cz)) continue;
        var a = vertex(x, z), b = vertex(x + step, z), c = vertex(x + step, z + step), d = vertex(x, z + step);
        indices.push(a, c, b, a, d, c);
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  window.__hillY = hillY;
  window.__hillYWorld = hillYWorld;
  return { hillY: hillY, hillYWorld: hillYWorld, terrainColor: terrainColor, groundGeo: buildGroundGeometry() };
};
