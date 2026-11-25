// A tiny seeded random generator (mulberry32). The kitchen runs on a seed so
// a shift plays the same way twice when asked to — the screenshot poses and
// any replay both lean on that determinism.

export function makeRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickFrom(rand, list) {
  return list[Math.floor(rand() * list.length) % list.length];
}
