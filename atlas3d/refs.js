const SLUGS = [
  '01_tam_quan_gate',
  '02_nha_ba_gian',
  '03_cau_ngoi_bridge',
  '04_ancient_shrine_bia_rua',
  '05_bamboo_windmill',
  '06_pagoda_lighthouse',
  '07_batwing_junk_boat',
  '08_banyan_tree_shrine',
];

const VIEWS = ['front', 'back', 'left', 'right', 'top', 'hero'];
const FILES = {
  front: '01_front_alpha.webp',
  back: '02_back_alpha.webp',
  left: '03_left_alpha.webp',
  right: '04_right_alpha.webp',
  top: '05_top_alpha.webp',
  hero: '00_hero_3quarter_alpha.webp',
};
const WHITE = {
  front: '01_front_white.webp',
  back: '02_back_white.webp',
  left: '03_left_white.webp',
  right: '04_right_white.webp',
  top: '05_top_white.webp',
  hero: '00_hero_3quarter_white.webp',
};

export const REFS = {};
export const REF_LIST = [];
for (const slug of SLUGS) {
  const entry = { alpha: {}, white: {} };
  for (const view of VIEWS) {
    entry.alpha[view] = `${slug}/${FILES[view]}`;
    entry.white[view] = `${slug}/${WHITE[view]}`;
  }
  REFS[slug] = entry;
  for (const view of VIEWS) REF_LIST.push({ slug, view, url: entry.alpha[view] });
}

export const MAP = {
  world: 'map/world.webp',
  regions: Array.from({ length: 8 }, (_, i) => ({
    main: `map/r0${i + 1}.webp`,
    details: Array.from({ length: 8 }, (_, j) => `map/r0${i + 1}_0${j + 1}.webp`),
  })),
};
