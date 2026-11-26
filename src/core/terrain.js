/* Tầng địa hình: một nguồn cao độ/màu đất cho base terrain và mọi chunk toàn lục địa Đại Việt. */
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

  /* Độ cao đảo bay Khu 08 (Tiên Giới Đảo Bay) khi nhân vật đứng trên đảo bay */
  function skyIsleY(x, z) {
    if (!window.__REGION || !window.__REGION.skyIsleDist) return null;
    var sd = window.__REGION.skyIsleDist(x, z);
    if (sd < -0.5) return null;
    return 20.0 + 0.65 * Math.sin(x * 0.14) * Math.cos(z * 0.14) + Math.min(2.2, sd * 0.28);
  }

  function hillY(x, z) {
    var rC = Math.sqrt(x * x + z * z);
    var spawnMask = 1 - smooth(rC, 18, 32);
    var fl = 1;
    var SPOTS = hillY._fl || (hillY._fl = [[0.4, 6.8, 8], [26, 9, 7], [4.5, 17, 9.2]]);
    for (var fi = 0; fi < SPOTS.length; fi++) {
      var dxS = x - SPOTS[fi][0], dzS = z - SPOTS[fi][1];
      fl = Math.min(fl, smooth(Math.sqrt(dxS * dxS + dzS * dzS), SPOTS[fi][2] * 0.5, SPOTS[fi][2]));
    }
    fl = Math.min(fl, 1 - Math.min(1, lakeDepth(x, z) * 2.2));

    var base = window.__REGION ? window.__REGION.heightAt(x, z) : 0;
    var micro = (0.14 * Math.sin(x * 0.45 + 1.3) * Math.cos(z * 0.5)
      + 0.08 * Math.sin(x * 1.4 + z * 1.1)) * fl;
    var h = base + micro;

    if (spawnMask > 0.002) {
      h -= creekDepth(x, z) * 0.9 * fl * spawnMask;
      h -= lakeDepth(x, z) * LAKE_DEPTH * spawnMask;
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

  /* Lưới trung tâm Kinh Kỳ (bán kính 30m quanh gốc spawn) */
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

  /* Lưới nền toàn lục địa Đại Việt (LOD xa) để núi non, bờ biển và 8 khu vực luôn hiện rõ ngay lập tức */
  function buildContinentBackdrop() {
    var b = (window.__WORLD_MAP_DATA && window.__WORLD_MAP_DATA.bounds) || { minX: -110.4, maxX: 369.6, minZ: -162.7, maxZ: 125.3 };
    var step = 6.0;
    var cols = Math.floor((b.maxX - b.minX) / step) + 1;
    var rows = Math.floor((b.maxZ - b.minZ) / step) + 1;
    var positions = new Float32Array(cols * rows * 3);
    var colors = new Float32Array(cols * rows * 3);
    var indices = [];
    var gt = new THREE.Color();
    var idx = 0;
    for (var rz = 0; rz < rows; rz++) {
      var z = b.minZ + rz * step;
      for (var cx = 0; cx < cols; cx++) {
        var x = b.minX + cx * step;
        var y = hillY(x, z);
        if (Math.hypot(x, z) < 32) y -= 0.14;
        else y -= 0.06;
        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;
        terrainColor(x, z, gt);
        var sh = 0.94 + 0.06 * Math.sin(x * 0.4) * Math.cos(z * 0.4);
        colors[idx * 3] = gt.r * sh;
        colors[idx * 3 + 1] = gt.g * sh;
        colors[idx * 3 + 2] = gt.b * sh;
        idx++;
      }
    }
    for (var rz2 = 0; rz2 < rows - 1; rz2++) {
      for (var cx2 = 0; cx2 < cols - 1; cx2++) {
        var a = rz2 * cols + cx2;
        var b2 = a + 1;
        var c = a + cols;
        var d = c + 1;
        indices.push(a, c, b2, b2, c, d);
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    var mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0.02 });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    gardenRoot.add(mesh);
  }
  buildContinentBackdrop();

  /* Mặt biển Đông Hải & hệ thống đảo bay Tiên Giới (Khu 08) */
  function buildWorldWaterAndSky() {
    var seaY = window.__REGION ? window.__REGION.SEA_LEVEL : -0.55;
    var seaGeo = new THREE.PlaneGeometry(760, 560);
    seaGeo.rotateX(-Math.PI / 2);
    var seaMat = new THREE.MeshStandardMaterial({
      color: 0x2c7d8f, roughness: 0.22, metalness: 0.15, transparent: true, opacity: 0.84
    });
    var seaMesh = new THREE.Mesh(seaGeo, seaMat);
    seaMesh.position.set(130, seaY, -20);
    seaMesh.receiveShadow = true;
    gardenRoot.add(seaMesh);

    if (window.__REGION && window.__REGION.DATA && window.__REGION.DATA.skyPolys) {
      var skyTopMat = new THREE.MeshStandardMaterial({ color: 0x99b86c, roughness: 0.85 });
      var skyRockMat = new THREE.MeshStandardMaterial({ color: 0x6b6f6a, roughness: 0.92, flatShading: true });
      window.__REGION.DATA.skyPolys.forEach(function (pts) {
        if (pts.length < 3) return;
        var shape = new THREE.Shape();
        shape.moveTo(pts[0][0], -pts[0][1]);
        for (var i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], -pts[i][1]);
        shape.closePath();
        var topGeo = new THREE.ExtrudeGeometry(shape, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.6, bevelSegments: 2 });
        topGeo.rotateX(-Math.PI / 2);
        var topMesh = new THREE.Mesh(topGeo, skyTopMat);
        topMesh.position.y = 19.2;
        gardenRoot.add(topMesh);

        var cx = 0, cz = 0;
        pts.forEach(function (p) { cx += p[0]; cz += p[1]; });
        cx /= pts.length; cz /= pts.length;
        var rad = 0;
        pts.forEach(function (p) { rad = Math.max(rad, Math.hypot(p[0] - cx, p[1] - cz)); });
        var coneGeo = new THREE.ConeGeometry(Math.max(2, rad * 0.78), Math.max(4, rad * 0.95), 7);
        coneGeo.rotateX(Math.PI);
        var coneMesh = new THREE.Mesh(coneGeo, skyRockMat);
        coneMesh.position.set(cx, 19.2 - Math.max(2, rad * 0.48), cz);
        gardenRoot.add(coneMesh);
      });
    }
  }
  buildWorldWaterAndSky();

  window.__hillY = hillY;
  window.__hillYWorld = hillYWorld;
  window.__skyIsleY = skyIsleY;
  return { hillY: hillY, hillYWorld: hillYWorld, terrainColor: terrainColor, groundGeo: buildGroundGeometry() };
};
