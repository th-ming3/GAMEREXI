/* Tầng asset GLB thật: parse một lần, chia geometry/material cho instancing và clone cho landmark. */
window.__createRealAssets = function () {
  var SOURCES = {
    grass: '__RA_GRASS_B64__',
    flower: '__RA_FLOWER_B64__',
    broadleaf: '__RA_BROADLEAF_B64__',
    blossom: '__RA_BLOSSOM_B64__',
    pine: '__RA_PINE_B64__',
    house: '__RA_HOUSE_B64__',
    ruins: '__RA_RUINS_B64__',
    temple: '__RA_TEMPLE_B64__',
    npcTam: '__RA_NPC_TAM_B64__',
    npcBaMan: '__RA_NPC_BA_MAN_B64__',
    npcHoa: '__RA_NPC_HOA_B64__',
    npcLam: '__RA_NPC_LAM_B64__',
    valve: '__RA_VALVE_B64__',
    enemyMushroom: '__RA_ENEMY_MUSHROOM_B64__',
    enemyReed: '__RA_ENEMY_REED_B64__',
    enemyBoulder: '__RA_ENEMY_BOULDER_B64__',
    enemyLure: '__RA_ENEMY_LURE_B64__',
    boss01: '__RA_BOSS_01_B64__',
    guardian01: '__RA_GUARDIAN_01_B64__'
  };
  var loader = new THREE.GLTFLoader();
  var templates = {};
  var waiting = {};
  var windUniform = { value: 0 };
  window.__REAL_WIND_TIME = windUniform;

  function windify(material) {
    if (!material || material.userData && material.userData.gamerexiWind) return material;
    material.userData = material.userData || {};
    material.userData.gamerexiWind = true;
    material.onBeforeCompile = function (shader) {
      shader.uniforms.uGameTime = windUniform;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uGameTime;')
        .replace('#include <begin_vertex>', [
          '#include <begin_vertex>',
          '#ifdef USE_INSTANCING',
          'float phaseW = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;',
          '#else',
          'float phaseW = 0.0;',
          '#endif',
          'float liftW = max(0.0, transformed.y);',
          'float swayW = sin(uGameTime * 1.7 + phaseW) * 0.045 + sin(uGameTime * 0.63 + phaseW * 0.7) * 0.025;',
          'transformed.x += swayW * liftW;',
          'transformed.z += swayW * 0.38 * liftW;'
        ].join('\n'));
    };
    material.customProgramCacheKey = function () { return 'gamerexi-wind-v1'; };
    return material;
  }

  function parse(name) {
    if (templates[name]) return templates[name];
    var record = { ready: false, scene: null, geometry: null, material: null, box: null, size: null };
    templates[name] = record;
    var base64 = SOURCES[name];
    if (!base64 || base64.charAt(0) === '_') return record;
    var bytes = Uint8Array.from(atob(base64), function (c) { return c.charCodeAt(0); });
    loader.parse(bytes.buffer, '', function (gltf) {
      record.scene = gltf.scene;
      record.scene.updateMatrixWorld(true);
      record.box = new THREE.Box3().setFromObject(record.scene);
      record.size = record.box.getSize(new THREE.Vector3());
      var mesh = null;
      record.scene.traverse(function (o) { if (!mesh && o.isMesh) mesh = o; });
      if (mesh) {
        record.geometry = mesh.geometry.clone();
        record.material = Array.isArray(mesh.material) ? mesh.material[0].clone() : mesh.material.clone();
        if (name === 'grass' || name === 'flower') {
          record.geometry.scale(0.95, 1.0, 0.95);
          windify(record.material);
        }
      }
      record.ready = true;
      var queue = waiting[name] || [];
      for (var i = 0; i < queue.length; i++) queue[i](record);
      waiting[name] = null;
    }, function (error) {
      console.warn('Real asset failed: ' + name, error);
      record.ready = true;
      var queue = waiting[name] || [];
      for (var i = 0; i < queue.length; i++) queue[i](record);
      waiting[name] = null;
    });
    return record;
  }

  function whenReady(name, callback) {
    var record = parse(name);
    if (record.ready) callback(record);
    else {
      waiting[name] = waiting[name] || [];
      waiting[name].push(callback);
    }
  }

  function replaceInstanced(name, mesh, count) {
    whenReady(name, function (record) {
      if (!record.geometry || !record.material) return;
      mesh.geometry = record.geometry;
      mesh.material = record.material;
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
    return mesh;
  }

  function makeModel(name, targetSize) {
    var holder = new THREE.Group();
    whenReady(name, function (record) {
      if (!record.scene || !record.size || record.size.y <= 0) return;
      var model = record.scene.clone(true);
      var k = (typeof targetSize === 'number' ? targetSize : 7) / (record.size.x || record.size.y || 1);
      if (targetSize && typeof targetSize === 'object' && targetSize.height) {
        model.scale.setScalar(targetSize.height / (record.size.y || 1));
      } else if (typeof targetSize === 'object') {
        var sx = (targetSize.x || 7) / (record.size.x || 1);
        var sy = (targetSize.y || targetSize.x || 7) / (record.size.y || 1);
        var sz = (targetSize.z || targetSize.x || 7) / (record.size.z || 1);
        model.scale.set(sx, sy, sz);
      } else model.scale.setScalar(k);
      model.position.set(-record.box.min.x * model.scale.x, -record.box.min.y * model.scale.y, -record.box.min.z * model.scale.z);
      holder.add(model);
    });
    return holder;
  }

  function addTo(parent, name, targetSize) {
    var holder = makeModel(name, targetSize);
    parent.add(holder);
    return holder;
  }

  Object.keys(SOURCES).forEach(parse);
  return { whenReady: whenReady, replaceInstanced: replaceInstanced, makeModel: makeModel, addTo: addTo, windUniform: windUniform };
};
window.__REAL_ASSETS = window.__createRealAssets();
