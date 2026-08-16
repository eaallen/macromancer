type HeightLayout = {
  arena: { x: number; z: number; radius: number };
  spawn: { x: number; z: number };
  villageRing: { radius: number; halfWidth: number } | null;
  flats: { x: number; z: number; radius: number }[];
};

let layout: HeightLayout = {
  arena: { x: 0, z: 4, radius: 34 },
  spawn: { x: 0, z: -28 },
  villageRing: { radius: 62, halfWidth: 26 },
  flats: [],
};

export function setHeightLayout(next: HeightLayout): void {
  layout = next;
}

function hash2(x: number, z: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function noise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smoothstep(x - ix);
  const fz = smoothstep(z - iz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fz);
}

function fbm(x: number, z: number, octaves = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise(x * frequency, z * frequency);
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value;
}

function falloff(distance: number, radius: number): number {
  if (distance >= radius) {
    return 0;
  }
  const t = 1 - distance / radius;
  return t * t;
}

export function heightAt(x: number, z: number): number {
  let h = 1.15 + fbm(x * 0.016, z * 0.016) * 4.2;
  h += fbm(x * 0.05, z * 0.05, 3) * 0.9;

  const arenaDist = Math.hypot(x - layout.arena.x, z - layout.arena.z);
  h = lerp(h, 1.12, falloff(arenaDist, layout.arena.radius + 10));

  const spawnDist = Math.hypot(x - layout.spawn.x, z - layout.spawn.z);
  h = lerp(h, 1.12, falloff(spawnDist, 16));

  if (layout.villageRing && layout.villageRing.halfWidth > 0) {
    const villageRingDist = Math.abs(arenaDist - layout.villageRing.radius);
    h = lerp(h, 1.2, falloff(villageRingDist, layout.villageRing.halfWidth));
  }

  for (const flat of layout.flats) {
    const dist = Math.hypot(x - flat.x, z - flat.z);
    h = lerp(h, 1.12, falloff(dist, flat.radius));
  }

  return h;
}
