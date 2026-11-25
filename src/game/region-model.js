/* Cánh Đồng — deterministic biome model shared by terrain, decoration and map. */
window.__REGION = (function () {
  function clamp01(value) { return Math.max(0, Math.min(1, value)); }
  function smooth(value, min, max) {
    var t = clamp01((value - min) / (max - min));
    return t * t * (3 - 2 * t);
  }
  function mix(a, b, t) { return a + (b - a) * t; }

  function weights(x, z) {
    var r = Math.hypot(x, z);
    var canyon = (1 - smooth(x, -17, -8)) * (1 - smooth(z, 5, 15));
    var forest = smooth(-z, 5, 16) * (1 - canyon * 0.85);
    var lake = smooth(x, 1, 13) * smooth(z, 0, 11) * (1 - canyon);
    var meadow = Math.max(0.04, 1 - Math.max(canyon, forest, lake));
    var border = smooth(r, 35, 47);
    return { meadow: meadow, lake: lake, forest: forest, canyon: canyon, border: border };
  }

  function at(x, z) {
    var w = weights(x, z);
    var best = 'meadow', value = w.meadow;
    ['lake', 'forest', 'canyon', 'border'].forEach(function (key) {
      if (w[key] > value) { best = key; value = w[key]; }
    });
    return best;
  }

  function heightAt(x, z) {
    var w = weights(x, z);
    var meadow = 0.08 * Math.sin(x * 0.32) * Math.cos(z * 0.27);
    var lake = -0.16 + 0.18 * Math.sin(x * 0.18 + z * 0.11);
    var forest = 0.65 + 0.72 * Math.sin(x * 0.16 + 0.8) * Math.cos(z * 0.13)
      + 0.38 * Math.sin(x * 0.29 - z * 0.21);
    var canyonRaw = 1.25 + 0.65 * Math.sin(x * 0.14 - z * 0.09)
      + 0.38 * Math.cos(x * 0.31 + z * 0.17);
    var canyonTerrace = Math.floor(canyonRaw * 2.2) / 2.2;
    var canyon = mix(canyonRaw, canyonTerrace, 0.62)
      + 1.15 * smooth(-x, 18, 35) * (0.55 + 0.45 * Math.sin(z * 0.21 + 1.4));
    var total = w.meadow + w.lake + w.forest + w.canyon;
    var inner = total > 0 ? (w.meadow * meadow + w.lake * lake + w.forest * forest + w.canyon * canyon) / total : 0;
    var r = Math.hypot(x, z), angle = Math.atan2(z, x);
    var ridge = 3.2 + 1.6 * Math.sin(angle * 5 + 0.7) + 0.8 * Math.sin(angle * 11 - 0.4);
    var border = w.border * (4.0 + ridge + Math.max(0, r - 38) * 0.35);
    return inner * (1 - w.border * 0.65) + border;
  }

  function colorAt(x, z) {
    var w = weights(x, z);
    var dx = (x - 4.5) / 9.0, dz = (z - 17) / 7.5;
    var shore = dx * dx + dz * dz < 1.35;
    var meadow = [0.43, 0.52, 0.27];
    var lake = shore ? [0.60, 0.52, 0.34] : [0.35, 0.49, 0.31];
    var forest = [0.22, 0.36, 0.24];
    var canyon = [0.48, 0.32, 0.20];
    var border = [0.36, 0.37, 0.32];
    var total = w.meadow + w.lake + w.forest + w.canyon + w.border;
    return [0, 1, 2].map(function (channel) {
      return (w.meadow * meadow[channel] + w.lake * lake[channel] + w.forest * forest[channel]
        + w.canyon * canyon[channel] + w.border * border[channel]) / total;
    });
  }

  var waypoints = [
    { id: 'lake', name: 'Bến Hồ Gương', x: 10.5, z: 11.5, color: 0x72e4df },
    { id: 'forest', name: 'Cổ Thụ Thì Thầm', x: 7, z: -17.5, color: 0xa6e57d },
    { id: 'canyon', name: 'Cổng Hẻm Hổ Phách', x: -24, z: -8, color: 0xffc26e }
  ];

  var names = {
    meadow: 'Đồng Bình Minh',
    lake: 'Hồ Gương',
    forest: 'Rừng Thì Thầm',
    canyon: 'Hẻm Đá Hổ Phách',
    border: 'Núi Sương Biên'
  };

  return { weights: weights, at: at, heightAt: heightAt, colorAt: colorAt, waypoints: waypoints, names: names };
})();
