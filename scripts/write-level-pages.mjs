import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const siegeBuildings = [
  { file: "building_home_A_blue.gltf", x: 15.471, z: 61.971, yaw: -2.761, height: 12 },
  { file: "building_church_blue.gltf", x: 50.48, z: 46.518, yaw: -2.351, height: 22 },
  { file: "building_barracks_blue.gltf", x: 57.433, z: 12.094, yaw: -1.661, height: 14 },
  { file: "building_market_blue.gltf", x: 45.384, z: -33.7, yaw: -1.058, height: 12 },
  { file: "building_home_B_blue.gltf", x: 10.777, z: -56.04, yaw: 0.042, height: 13 },
  { file: "building_tavern_blue.gltf", x: -25.142, z: -50.478, yaw: 0.332, height: 16 },
  { file: "building_blacksmith_blue.gltf", x: -54.408, z: -27.762, yaw: 1.202, height: 13 },
  { file: "building_windmill_blue.gltf", x: -71.719, z: -2.357, yaw: 1.232, height: 26 },
  { file: "building_tower_A_blue.gltf", x: -57.311, z: 44.192, yaw: 2.222, height: 28 },
  { file: "building_well_blue.gltf", x: -17.792, z: 52.862, yaw: 2.792, height: 5 },
];

const siegeVibe = {
  theme: "siege",
  clear: [0.62, 0.58, 0.72],
  ambient: [0.38, 0.36, 0.42],
  fog: { density: 0.007, color: [0.62, 0.58, 0.68] },
  sun: { position: [70, 48, 22], intensity: 1.05, diffuse: [1, 0.9, 0.78] },
  hemi: { intensity: 0.58, ground: [0.26, 0.22, 0.2] },
  sky: { luminance: 0.82, turbidity: 3.4, rayleigh: 1.35, mieCoefficient: 0.006, mieDirectionalG: 0.82 },
  terrain: { grass: [0.4, 0.58, 0.24], grassDark: [0.3, 0.46, 0.18], dirt: [0.58, 0.4, 0.24] },
};

const siegeScatter = {
  trees: { attempts: 420, count: 86, seed: 1, scale: [1.05, 1.55] },
  pines: { attempts: 140, count: 28, seed: 2, scale: [1.0, 1.4] },
  rocks: { attempts: 160, count: 48, seed: 4, scale: [0.9, 1.7] },
  bushes: { attempts: 220, count: 70, seed: 5, scale: [0.95, 1.6] },
  grass: { attempts: 480, count: 160, seed: 6, scale: [1.1, 1.8] },
  ringTrees: 18,
};

const twinGiant = {
  hp: 320,
  size: 1.05,
  speed: 7.6,
  damage: 58,
  smashRange: 9.2,
  smashAngle: 56,
  sightRange: 64,
  turnSpeed: 100,
  windup: 1.05,
  recovery: 1.2,
  attackCooldown: 2.15,
};

const levels = [
  {
    file: "index.html",
    config: {
      title: "Training Ground",
      bossName: "The Brute",
      next: "meadow.html",
      knights: 100,
      giant: { hp: 80, size: 0.5, speed: 4, damage: 28, smashRange: 6, smashAngle: 45, sightRange: 32, turnSpeed: 70 },
      arena: { x: 0, z: 4, radius: 34 },
      spawn: { x: 0, z: -28 },
      villageRing: null,
      flats: [{ x: -68, z: 8, radius: 30 }],
      buildings: [
        { file: "building_home_A_blue.gltf", x: -68, z: 18, yaw: 1.2, height: 12 },
        { file: "building_home_B_blue.gltf", x: -78, z: 6, yaw: 0.8, height: 13 },
        { file: "building_tavern_blue.gltf", x: -72, z: -8, yaw: 0.4, height: 16 },
        { file: "building_well_blue.gltf", x: -58, z: 4, yaw: 0, height: 5, clearance: 10 },
        { file: "building_barracks_blue.gltf", x: -84, z: 22, yaw: 1.4, height: 14 },
        { file: "props/tent.gltf", x: -40, z: -10, yaw: 0.4, height: 4.2, clearance: 7 },
        { file: "props/tent.gltf", x: -36, z: 2, yaw: -0.8, height: 4.2, clearance: 7 },
        { file: "props/tent.gltf", x: -42, z: 14, yaw: 1.2, height: 4.2, clearance: 7 },
        { file: "props/tent.gltf", x: -33, z: 22, yaw: 2.1, height: 4, clearance: 7 },
        { file: "props/flag_blue.gltf", x: -48, z: 6, yaw: 0, height: 8, clearance: 4 },
        { file: "props/crate_A_big.gltf", x: -52, z: -4, yaw: 0.3, height: 1.6, clearance: 3 },
        { file: "props/barrel.gltf", x: -50, z: -7, yaw: 0, height: 1.2, clearance: 2 },
      ],
      scatter: {
        trees: { attempts: 180, count: 28, seed: 11, scale: [1.0, 1.4] },
        pines: { attempts: 40, count: 6, seed: 12, scale: [1.0, 1.3] },
        rocks: { attempts: 80, count: 16, seed: 13, scale: [0.8, 1.4] },
        bushes: { attempts: 120, count: 32, seed: 14, scale: [0.9, 1.5] },
        grass: { attempts: 520, count: 180, seed: 15, scale: [1.1, 1.8] },
        ringTrees: 0,
      },
      vibe: {
        theme: "dawn",
        clear: [0.86, 0.62, 0.48],
        ambient: [0.48, 0.36, 0.28],
        fog: { density: 0.0035, color: [0.9, 0.7, 0.52] },
        sun: { position: [110, 18, 8], intensity: 1.15, diffuse: [1, 0.72, 0.45] },
        hemi: { intensity: 0.62, ground: [0.32, 0.18, 0.12] },
        sky: { luminance: 0.95, turbidity: 8, rayleigh: 0.6, mieCoefficient: 0.01, mieDirectionalG: 0.9 },
        terrain: { grass: [0.52, 0.55, 0.22], grassDark: [0.4, 0.42, 0.16], dirt: [0.62, 0.38, 0.2] },
      },
      copy: {
        eyebrow: "Field 1 · Intro",
        blurb: "A smaller brute waits on the training green. You have a hundred knights. Click the field, record a path, and send the copies. Learn the loop before the real siege.",
        startCta: "Begin training",
        winTitle: "The brute falls",
        winBody: "That was the lesson. The next field will not be so kind.",
        loseTitle: "He still stands",
        loseBody: "You have a hundred knights. Record a cleaner path and send more.",
        nextLabel: "Open Meadow",
      },
    },
  },
  {
    file: "meadow.html",
    config: {
      title: "Open Meadow",
      bossName: "The Strider",
      next: "hamlet.html",
      knights: 40,
      giant: { hp: 140, size: 0.7, speed: 5.4, damage: 36, smashRange: 7, smashAngle: 50, sightRange: 40, turnSpeed: 80 },
      arena: { x: 0, z: 4, radius: 36 },
      spawn: { x: 0, z: -30 },
      villageRing: null,
      flats: [],
      buildings: [
        { file: "building_well_blue.gltf", x: -48, z: 36, yaw: 0.4, height: 5, clearance: 10 },
        { file: "building_home_A_blue.gltf", x: 62, z: -40, yaw: -0.6, height: 12 },
        { file: "building_windmill_blue.gltf", x: -70, z: -48, yaw: 0.2, height: 26, clearance: 20 },
      ],
      scatter: {
        trees: { attempts: 200, count: 36, seed: 21, scale: [1.0, 1.45] },
        pines: { attempts: 60, count: 8, seed: 22, scale: [1.0, 1.3] },
        rocks: { attempts: 90, count: 20, seed: 23, scale: [0.8, 1.5] },
        bushes: { attempts: 200, count: 50, seed: 24, scale: [0.9, 1.5] },
        grass: { attempts: 560, count: 200, seed: 25, scale: [1.2, 1.9] },
        ringTrees: 8,
      },
      vibe: {
        theme: "meadow",
        clear: [0.62, 0.74, 0.88],
        ambient: [0.42, 0.46, 0.4],
        fog: { density: 0.003, color: [0.7, 0.78, 0.86] },
        sun: { position: [40, 70, 10], intensity: 1.2, diffuse: [1, 0.96, 0.86] },
        hemi: { intensity: 0.7, ground: [0.28, 0.32, 0.18] },
        sky: { luminance: 1, turbidity: 2.2, rayleigh: 1.6, mieCoefficient: 0.004, mieDirectionalG: 0.8 },
        terrain: { grass: [0.36, 0.62, 0.28], grassDark: [0.24, 0.48, 0.18], dirt: [0.5, 0.4, 0.22] },
      },
      copy: {
        eyebrow: "Field 2",
        blurb: "Wide grass and little cover. Forty knights is still generous, but the strider is quicker than the training brute.",
        startCta: "Enter the meadow",
        winTitle: "The meadow is yours",
        winBody: "He could not outrun every path you laid down.",
        loseTitle: "The grass hides nothing",
        loseBody: "He saw you coming. Split his attention with more macros.",
        nextLabel: "The Hamlet",
      },
    },
  },
  {
    file: "hamlet.html",
    config: {
      title: "The Hamlet",
      bossName: "The Raider",
      next: "siege.html",
      knights: 20,
      giant: { hp: 200, size: 0.85, speed: 6.4, damage: 42, smashRange: 8, smashAngle: 52, sightRange: 46, turnSpeed: 84 },
      arena: { x: 0, z: 4, radius: 34 },
      spawn: { x: 8, z: -32 },
      villageRing: null,
      flats: [{ x: -8, z: 48, radius: 28 }],
      buildings: [
        { file: "building_home_A_blue.gltf", x: -18, z: 52, yaw: 3.1, height: 12 },
        { file: "building_home_B_blue.gltf", x: 4, z: 58, yaw: 3.2, height: 13 },
        { file: "building_tavern_blue.gltf", x: 22, z: 50, yaw: -2.8, height: 16 },
        { file: "building_well_blue.gltf", x: 2, z: 44, yaw: 0, height: 5, clearance: 8 },
        { file: "building_market_blue.gltf", x: -30, z: 40, yaw: 1.1, height: 12 },
        { file: "building_church_blue.gltf", x: 36, z: 62, yaw: -2.4, height: 22, clearance: 18 },
      ],
      scatter: {
        trees: { attempts: 280, count: 54, seed: 31, scale: [1.0, 1.5] },
        pines: { attempts: 80, count: 14, seed: 32, scale: [1.0, 1.35] },
        rocks: { attempts: 120, count: 30, seed: 33, scale: [0.85, 1.55] },
        bushes: { attempts: 200, count: 60, seed: 34, scale: [0.95, 1.55] },
        grass: { attempts: 480, count: 150, seed: 35, scale: [1.1, 1.8] },
        ringTrees: 10,
      },
      vibe: {
        theme: "hamlet",
        clear: [0.72, 0.58, 0.46],
        ambient: [0.44, 0.36, 0.3],
        fog: { density: 0.005, color: [0.74, 0.6, 0.48] },
        sun: { position: [-50, 28, 30], intensity: 1.08, diffuse: [1, 0.78, 0.52] },
        hemi: { intensity: 0.55, ground: [0.3, 0.2, 0.14] },
        sky: { luminance: 0.88, turbidity: 5.5, rayleigh: 0.9, mieCoefficient: 0.008, mieDirectionalG: 0.85 },
        terrain: { grass: [0.44, 0.5, 0.22], grassDark: [0.34, 0.38, 0.16], dirt: [0.6, 0.4, 0.22] },
      },
      copy: {
        eyebrow: "Field 3",
        blurb: "A hamlet at the south edge. Twenty knights, and the raider hits harder. Use the houses to break his chase.",
        startCta: "Defend the hamlet",
        winTitle: "The hamlet holds",
        winBody: "The villagers will speak of the paths you wrote in the dirt.",
        loseTitle: "The hamlet burns",
        loseBody: "He smashed the line. Record a wider approach.",
        nextLabel: "The Siege",
      },
    },
  },
  {
    file: "siege.html",
    config: {
      title: "The Siege",
      bossName: "The Giant",
      next: "sprinter.html",
      knights: 10,
      giant: {
        hp: 320, size: 1, speed: 7.4, damage: 50, smashRange: 8.6, smashAngle: 55,
        sightRange: 52, turnSpeed: 88, windup: 1.15, recovery: 1.35, attackCooldown: 2.4,
      },
      arena: { x: 0, z: 4, radius: 34 },
      spawn: { x: 0, z: -28 },
      villageRing: { radius: 62, halfWidth: 26 },
      flats: [],
      buildings: siegeBuildings,
      scatter: siegeScatter,
      vibe: siegeVibe,
      copy: {
        eyebrow: "Field 4 · The original fight",
        blurb: "Survey the field from above, then click where your knight should begin. Record that run as a macro and send copies from the sky. You have ten knights. The giant chases the first knight he sees — or the closest one — and smashes what is in front of him.",
        startCta: "Enter the field",
        winTitle: "The giant falls",
        winBody: "Your macros struck from every side. You are the Macromancer.",
        loseTitle: "The giant stands",
        loseBody: "He cheers over the fallen knights. Record a better approach, then try again.",
        nextLabel: "The Sprinter",
      },
    },
  },
  {
    file: "sprinter.html",
    config: {
      title: "The Sprinter",
      bossName: "The Runner",
      next: "tank.html",
      knights: 8,
      giant: { hp: 220, size: 0.58, speed: 13.2, damage: 40, smashRange: 6.4, smashAngle: 40, sightRange: 70, turnSpeed: 150 },
      arena: { x: 0, z: 0, radius: 40 },
      spawn: { x: -6, z: -34 },
      villageRing: null,
      flats: [],
      buildings: [
        { file: "building_tower_A_blue.gltf", x: -80, z: -70, yaw: 0.6, height: 28, clearance: 18 },
        { file: "building_tower_A_blue.gltf", x: 82, z: 74, yaw: -2.2, height: 28, clearance: 18 },
        { file: "building_well_blue.gltf", x: 20, z: -50, yaw: 0, height: 5, clearance: 8 },
        { file: "props/tent.gltf", x: -55, z: 48, yaw: 1.1, height: 4, clearance: 7 },
      ],
      scatter: {
        trees: { attempts: 160, count: 22, seed: 41, scale: [0.95, 1.3] },
        pines: { attempts: 40, count: 4, seed: 42, scale: [1.0, 1.2] },
        rocks: { attempts: 70, count: 14, seed: 43, scale: [0.7, 1.3] },
        bushes: { attempts: 100, count: 24, seed: 44, scale: [0.9, 1.4] },
        grass: { attempts: 400, count: 120, seed: 45, scale: [1.0, 1.6] },
        ringTrees: 0,
      },
      vibe: {
        theme: "storm",
        clear: [0.42, 0.5, 0.58],
        ambient: [0.3, 0.34, 0.4],
        fog: { density: 0.006, color: [0.48, 0.54, 0.6] },
        sun: { position: [20, 22, -80], intensity: 0.85, diffuse: [0.82, 0.88, 1] },
        hemi: { intensity: 0.5, ground: [0.16, 0.18, 0.2] },
        sky: { luminance: 0.7, turbidity: 6, rayleigh: 1.8, mieCoefficient: 0.007, mieDirectionalG: 0.75 },
        terrain: { grass: [0.32, 0.42, 0.3], grassDark: [0.22, 0.3, 0.22], dirt: [0.4, 0.36, 0.3] },
      },
      copy: {
        eyebrow: "Field 5",
        blurb: "Small, fast, and he never loses the scent. Eight knights. If you clump, he cuts the pack. If you spread, he sprints the gaps.",
        startCta: "Chase the runner",
        winTitle: "Caught",
        winBody: "Speed was not enough once the paths closed in.",
        loseTitle: "Gone",
        loseBody: "He ran you down one at a time. Pin him with overlapping macros.",
        nextLabel: "The Tank",
      },
    },
  },
  {
    file: "tank.html",
    config: {
      title: "The Tank",
      bossName: "The Bulwark",
      next: "watchman.html",
      knights: 8,
      giant: { hp: 640, size: 1.45, speed: 3.2, damage: 72, smashRange: 12, smashAngle: 72, sightRange: 40, turnSpeed: 48, windup: 1.4, recovery: 1.7, attackCooldown: 2.8 },
      arena: { x: 0, z: 4, radius: 32 },
      spawn: { x: 0, z: -26 },
      villageRing: null,
      flats: [{ x: 55, z: 8, radius: 26 }],
      buildings: [
        { file: "building_barracks_blue.gltf", x: 48, z: 20, yaw: -1.6, height: 14 },
        { file: "building_barracks_blue.gltf", x: 62, z: -2, yaw: -1.4, height: 14 },
        { file: "building_tower_A_blue.gltf", x: 72, z: 28, yaw: -2, height: 30, clearance: 18 },
        { file: "building_blacksmith_blue.gltf", x: 44, z: -16, yaw: -0.8, height: 13 },
        { file: "building_well_blue.gltf", x: 36, z: 6, yaw: 0, height: 5, clearance: 8 },
        { file: "props/weaponrack.gltf", x: 40, z: 12, yaw: 0.4, height: 2.4, clearance: 3 },
      ],
      scatter: {
        trees: { attempts: 240, count: 40, seed: 51, scale: [1.1, 1.6] },
        pines: { attempts: 180, count: 36, seed: 52, scale: [1.1, 1.5] },
        rocks: { attempts: 200, count: 60, seed: 53, scale: [1.0, 1.9] },
        bushes: { attempts: 160, count: 40, seed: 54, scale: [1.0, 1.5] },
        grass: { attempts: 360, count: 100, seed: 55, scale: [1.0, 1.6] },
        ringTrees: 6,
      },
      vibe: {
        theme: "fog",
        clear: [0.5, 0.5, 0.46],
        ambient: [0.32, 0.32, 0.3],
        fog: { density: 0.012, color: [0.52, 0.52, 0.48] },
        sun: { position: [30, 18, 40], intensity: 0.7, diffuse: [0.86, 0.84, 0.76] },
        hemi: { intensity: 0.48, ground: [0.2, 0.18, 0.14] },
        sky: { luminance: 0.6, turbidity: 10, rayleigh: 0.7, mieCoefficient: 0.012, mieDirectionalG: 0.88 },
        terrain: { grass: [0.34, 0.38, 0.22], grassDark: [0.24, 0.26, 0.16], dirt: [0.42, 0.34, 0.24] },
      },
      copy: {
        eyebrow: "Field 6",
        blurb: "Huge, slow, and a single smash clears a crowd. Eight knights against a wall of meat. Do not stand in front of him.",
        startCta: "Face the bulwark",
        winTitle: "The wall cracks",
        winBody: "You chipped him down from every side he could not turn.",
        loseTitle: "Crushed",
        loseBody: "The smash is wide. Attack his back, not his gaze.",
        nextLabel: "The Watchman",
      },
    },
  },
  {
    file: "watchman.html",
    config: {
      title: "The Watchman",
      bossName: "The Warden",
      next: "cleaver.html",
      knights: 7,
      giant: { hp: 360, size: 1.05, speed: 8.6, damage: 54, smashRange: 9, smashAngle: 50, sightRange: 96, turnSpeed: 100 },
      arena: { x: 0, z: 4, radius: 30 },
      spawn: { x: 0, z: -24 },
      villageRing: null,
      flats: [],
      buildings: [
        { file: "building_church_blue.gltf", x: -8, z: 70, yaw: 3.14, height: 24, clearance: 20 },
        { file: "building_tower_A_blue.gltf", x: 18, z: 78, yaw: 3.0, height: 32, clearance: 18 },
        { file: "building_home_A_blue.gltf", x: -70, z: -20, yaw: 0.8, height: 12 },
        { file: "building_home_B_blue.gltf", x: 74, z: -16, yaw: -0.9, height: 13 },
      ],
      scatter: {
        trees: { attempts: 380, count: 90, seed: 61, scale: [1.1, 1.65] },
        pines: { attempts: 220, count: 48, seed: 62, scale: [1.15, 1.55] },
        rocks: { attempts: 140, count: 36, seed: 63, scale: [0.9, 1.6] },
        bushes: { attempts: 200, count: 64, seed: 64, scale: [1.0, 1.6] },
        grass: { attempts: 400, count: 130, seed: 65, scale: [1.1, 1.7] },
        ringTrees: 16,
      },
      vibe: {
        theme: "night",
        clear: [0.12, 0.16, 0.28],
        ambient: [0.18, 0.22, 0.34],
        fog: { density: 0.009, color: [0.16, 0.2, 0.32] },
        sun: { position: [-20, 8, 90], intensity: 0.45, diffuse: [0.55, 0.65, 1] },
        hemi: { intensity: 0.38, ground: [0.08, 0.08, 0.12] },
        sky: { luminance: 0.28, turbidity: 1.8, rayleigh: 0.4, mieCoefficient: 0.003, mieDirectionalG: 0.7 },
        terrain: { grass: [0.18, 0.26, 0.2], grassDark: [0.12, 0.18, 0.14], dirt: [0.28, 0.22, 0.2] },
      },
      copy: {
        eyebrow: "Field 7",
        blurb: "Night, and he sees the whole field. Seven knights. There is no sneaking a spawn — he is already turning toward you.",
        startCta: "Step into the dark",
        winTitle: "The watch ends",
        winBody: "Even a warden cannot face every path at once.",
        loseTitle: "Seen",
        loseBody: "He never dropped the hunt. Overwhelm the gaze.",
        nextLabel: "The Cleaver",
      },
    },
  },
  {
    file: "cleaver.html",
    config: {
      title: "The Cleaver",
      bossName: "The Reaper",
      next: "ember.html",
      knights: 6,
      giant: { hp: 400, size: 1.2, speed: 6.8, damage: 62, smashRange: 16, smashAngle: 82, sightRange: 54, turnSpeed: 76, windup: 1.05 },
      arena: { x: 0, z: 4, radius: 36 },
      spawn: { x: 12, z: -30 },
      villageRing: null,
      flats: [{ x: -40, z: -8, radius: 22 }],
      buildings: [
        { file: "building_market_blue.gltf", x: -42, z: 4, yaw: 1.1, height: 12 },
        { file: "building_blacksmith_blue.gltf", x: -52, z: -14, yaw: 0.7, height: 13 },
        { file: "building_tavern_blue.gltf", x: -28, z: -18, yaw: 0.3, height: 16 },
        { file: "props/crate_A_big.gltf", x: -34, z: -6, yaw: 0.2, height: 1.6, clearance: 3 },
        { file: "props/barrel.gltf", x: -38, z: -10, yaw: 0, height: 1.2, clearance: 2 },
        { file: "props/weaponrack.gltf", x: -46, z: -8, yaw: 1.2, height: 2.4, clearance: 3 },
      ],
      scatter: {
        trees: { attempts: 200, count: 34, seed: 71, scale: [1.0, 1.4] },
        pines: { attempts: 80, count: 12, seed: 72, scale: [1.0, 1.3] },
        rocks: { attempts: 240, count: 70, seed: 73, scale: [1.0, 1.85] },
        bushes: { attempts: 140, count: 36, seed: 74, scale: [0.9, 1.4] },
        grass: { attempts: 360, count: 110, seed: 75, scale: [1.0, 1.6] },
        ringTrees: 4,
      },
      vibe: {
        theme: "storm",
        clear: [0.28, 0.38, 0.4],
        ambient: [0.24, 0.3, 0.32],
        fog: { density: 0.008, color: [0.3, 0.4, 0.42] },
        sun: { position: [8, 14, -40], intensity: 0.75, diffuse: [0.7, 0.86, 0.9] },
        hemi: { intensity: 0.42, ground: [0.12, 0.16, 0.16] },
        sky: { luminance: 0.5, turbidity: 9, rayleigh: 1.1, mieCoefficient: 0.011, mieDirectionalG: 0.8 },
        terrain: { grass: [0.26, 0.36, 0.3], grassDark: [0.18, 0.26, 0.22], dirt: [0.36, 0.32, 0.28] },
      },
      copy: {
        eyebrow: "Field 8",
        blurb: "Six knights. His smash reaches half the arena. Standing anywhere in front of him is a mistake.",
        startCta: "Approach the reaper",
        winTitle: "The blade stills",
        winBody: "You stayed out of the cone long enough to end him.",
        loseTitle: "Reaped",
        loseBody: "The sweep is enormous. Attack from behind the swing.",
        nextLabel: "Ember",
      },
    },
  },
  {
    file: "ember.html",
    config: {
      title: "Ember",
      bossName: "The Cinder",
      next: "colossus.html",
      knights: 5,
      giant: { hp: 440, size: 1.1, speed: 11, damage: 80, smashRange: 9.2, smashAngle: 58, sightRange: 62, turnSpeed: 120, windup: 0.7, recovery: 0.85, attackCooldown: 1.45 },
      arena: { x: 0, z: 4, radius: 34 },
      spawn: { x: 0, z: -28 },
      villageRing: { radius: 58, halfWidth: 16 },
      flats: [],
      buildings: [
        { file: "building_home_A_blue.gltf", x: -50, z: 30, yaw: 2.1, height: 12 },
        { file: "building_home_B_blue.gltf", x: 46, z: 36, yaw: -2.4, height: 13 },
        { file: "building_tavern_blue.gltf", x: 8, z: 64, yaw: 3.1, height: 16 },
        { file: "building_blacksmith_blue.gltf", x: -60, z: -8, yaw: 1.1, height: 13 },
        { file: "building_windmill_blue.gltf", x: 70, z: -20, yaw: -1.2, height: 26, clearance: 18 },
      ],
      scatter: {
        trees: { attempts: 160, count: 24, seed: 81, scale: [0.9, 1.25] },
        pines: { attempts: 260, count: 54, seed: 82, scale: [1.05, 1.5] },
        rocks: { attempts: 180, count: 50, seed: 83, scale: [0.9, 1.7] },
        bushes: { attempts: 120, count: 28, seed: 84, scale: [0.85, 1.3] },
        grass: { attempts: 280, count: 80, seed: 85, scale: [0.9, 1.4] },
        ringTrees: 12,
      },
      vibe: {
        theme: "ember",
        clear: [0.42, 0.18, 0.12],
        ambient: [0.4, 0.2, 0.14],
        fog: { density: 0.007, color: [0.46, 0.2, 0.12] },
        sun: { position: [-80, 16, 10], intensity: 1.25, diffuse: [1, 0.45, 0.22] },
        hemi: { intensity: 0.4, ground: [0.22, 0.08, 0.06] },
        sky: { luminance: 0.55, turbidity: 7, rayleigh: 0.35, mieCoefficient: 0.014, mieDirectionalG: 0.92 },
        terrain: { grass: [0.36, 0.22, 0.1], grassDark: [0.24, 0.12, 0.08], dirt: [0.48, 0.22, 0.12] },
      },
      copy: {
        eyebrow: "Field 9",
        blurb: "Five knights. He hits like a furnace and swings again before you recover. There is no waiting him out.",
        startCta: "Walk into the heat",
        winTitle: "The cinder dies",
        winBody: "You spent knights like fuel and still outlasted the fire.",
        loseTitle: "Ash",
        loseBody: "His recovery is short. You need more overlapping strikes.",
        nextLabel: "The Colossus",
      },
    },
  },
  {
    file: "colossus.html",
    config: {
      title: "The Colossus",
      bossName: "The Colossus",
      next: "twins.html",
      knights: 4,
      giant: { hp: 800, size: 1.75, speed: 8, damage: 90, smashRange: 14, smashAngle: 68, sightRange: 72, turnSpeed: 92, windup: 1.0, recovery: 1.2, attackCooldown: 2.0 },
      arena: { x: 0, z: 4, radius: 38 },
      spawn: { x: 0, z: -32 },
      villageRing: { radius: 70, halfWidth: 18 },
      flats: [],
      buildings: [
        { file: "building_church_blue.gltf", x: 0, z: 78, yaw: 3.14, height: 26, clearance: 20 },
        { file: "building_tower_A_blue.gltf", x: -64, z: 56, yaw: 2.4, height: 34, clearance: 18 },
        { file: "building_tower_A_blue.gltf", x: 64, z: 56, yaw: -2.4, height: 34, clearance: 18 },
        { file: "building_windmill_blue.gltf", x: -78, z: -10, yaw: 1.2, height: 28, clearance: 18 },
        { file: "building_barracks_blue.gltf", x: 70, z: -24, yaw: -1.1, height: 14 },
        { file: "building_home_A_blue.gltf", x: -40, z: -60, yaw: 0.2, height: 12 },
        { file: "building_home_B_blue.gltf", x: 36, z: -62, yaw: -0.2, height: 13 },
      ],
      scatter: {
        trees: { attempts: 300, count: 50, seed: 91, scale: [1.15, 1.7] },
        pines: { attempts: 200, count: 40, seed: 92, scale: [1.2, 1.6] },
        rocks: { attempts: 180, count: 44, seed: 93, scale: [1.1, 2.0] },
        bushes: { attempts: 160, count: 40, seed: 94, scale: [1.0, 1.5] },
        grass: { attempts: 320, count: 90, seed: 95, scale: [1.0, 1.5] },
        ringTrees: 20,
      },
      vibe: {
        theme: "colossus",
        clear: [0.28, 0.1, 0.18],
        ambient: [0.3, 0.14, 0.2],
        fog: { density: 0.008, color: [0.32, 0.12, 0.2] },
        sun: { position: [0, 10, 100], intensity: 1.1, diffuse: [1, 0.35, 0.45] },
        hemi: { intensity: 0.36, ground: [0.16, 0.06, 0.1] },
        sky: { luminance: 0.4, turbidity: 8, rayleigh: 0.5, mieCoefficient: 0.013, mieDirectionalG: 0.9 },
        terrain: { grass: [0.28, 0.14, 0.16], grassDark: [0.18, 0.08, 0.1], dirt: [0.36, 0.16, 0.16] },
      },
      copy: {
        eyebrow: "Field 10",
        blurb: "Four knights. A giant that fills the sky. Every trick you learned, spent in one fight.",
        startCta: "Challenge the colossus",
        winTitle: "The colossus falls",
        winBody: "He filled the sky, and still you cut him down. Two more wait on the next field.",
        loseTitle: "The sky still stands",
        loseBody: "Four lives is not a lot. Make every macro count.",
        nextLabel: "The Twins",
      },
    },
  },
  {
    file: "twins.html",
    config: {
      title: "The Twins",
      bossName: "The Twins",
      next: "fields.html",
      knights: 4,
      giants: [
        { ...twinGiant, x: -34, z: 4 },
        { ...twinGiant, x: 34, z: 4 },
      ],
      arena: { x: 0, z: 4, radius: 40 },
      spawn: { x: 0, z: -34 },
      villageRing: { radius: 72, halfWidth: 16 },
      flats: [],
      buildings: [
        { file: "building_tower_A_blue.gltf", x: -74, z: 28, yaw: 1.7, height: 34, clearance: 18 },
        { file: "building_tower_A_blue.gltf", x: 74, z: 28, yaw: -1.7, height: 34, clearance: 18 },
        { file: "building_church_blue.gltf", x: 0, z: 82, yaw: 3.14, height: 26, clearance: 20 },
        { file: "building_windmill_blue.gltf", x: -82, z: -18, yaw: 1.15, height: 28, clearance: 18 },
        { file: "building_barracks_blue.gltf", x: 82, z: -18, yaw: -1.15, height: 14 },
        { file: "building_home_A_blue.gltf", x: -44, z: -64, yaw: 0.25, height: 12 },
        { file: "building_home_B_blue.gltf", x: 44, z: -64, yaw: -0.25, height: 13 },
      ],
      scatter: {
        trees: { attempts: 280, count: 46, seed: 101, scale: [1.1, 1.6] },
        pines: { attempts: 180, count: 36, seed: 102, scale: [1.15, 1.55] },
        rocks: { attempts: 160, count: 40, seed: 103, scale: [1.0, 1.8] },
        bushes: { attempts: 150, count: 36, seed: 104, scale: [1.0, 1.45] },
        grass: { attempts: 300, count: 84, seed: 105, scale: [1.0, 1.5] },
        ringTrees: 18,
      },
      vibe: {
        theme: "twins",
        clear: [0.18, 0.22, 0.32],
        ambient: [0.24, 0.26, 0.34],
        fog: { density: 0.0065, color: [0.22, 0.26, 0.36] },
        sun: { position: [80, 28, -40], intensity: 1.05, diffuse: [0.95, 0.78, 0.62] },
        hemi: { intensity: 0.48, ground: [0.12, 0.12, 0.16] },
        sky: { luminance: 0.55, turbidity: 4.5, rayleigh: 1.1, mieCoefficient: 0.008, mieDirectionalG: 0.84 },
        terrain: { grass: [0.22, 0.3, 0.24], grassDark: [0.14, 0.2, 0.16], dirt: [0.32, 0.26, 0.22] },
      },
      copy: {
        eyebrow: "Field 11 · The last field",
        blurb: "Four knights — the same as the colossus. Two giants start on opposite sides and never hunt the same knight while two still stand.",
        startCta: "Face the twins",
        winTitle: "Both fall",
        winBody: "Eleven fields. Two giants, split and spent. The field is yours.",
        loseTitle: "They still stand",
        loseBody: "They split the field. Split yours too — one giant each, until only one knight remains.",
        nextLabel: "All fields",
      },
    },
  },
];

/**
 * Total giant HP shown in the HUD, whether the level has one giant or several.
 * @param {{ giant?: { hp: number }; giants?: { hp: number }[] }} config
 */
function totalGiantHp(config) {
  const giants = config.giants ?? (config.giant ? [config.giant] : []);
  return giants.reduce((sum, giant) => sum + giant.hp, 0);
}

/**
 * Win-screen label for the next field. Last field keeps "All fields".
 * @param {{ next?: string | null; copy: { nextLabel: string } }} config
 */
function nextButtonLabel(config) {
  if (!config.next || config.next.includes("fields.html")) {
    return config.copy.nextLabel;
  }
  return `Next level: ${config.copy.nextLabel}`;
}

/**
 * Builds a playable level HTML page with HUD markup and an embedded JSON config.
 * @param {object} config - Parsed level configuration written into #level-config.
 */
function page(config) {
  const giantHp = totalGiantHp(config);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>${config.title}</title>
  </head>
  <body>
    <canvas id="game-canvas"></canvas>
    <div id="hud" class="hidden">
      <div id="mode-badge">MANCER</div>
      <div id="knight-pool">Knights 0/${config.knights}</div>
      <div id="score">Score 10,000</div>
      <div id="giant-hp-wrap">
        <div class="boss-label">${config.bossName}</div>
        <div class="boss-bar">
          <div id="giant-hp-fill"></div>
        </div>
        <div id="giant-hp-text">${giantHp} / ${giantHp}</div>
      </div>
      <div id="knight-hp">Knight HP 20/20</div>
      <div id="recording-pip" class="hidden">REC</div>
      <div id="macro-panel">
        <div class="panel-title">Macros</div>
        <div id="macro-list"></div>
        <div id="macro-hint"></div>
      </div>
      <div id="help"></div>
      <div id="hurt-flash"></div>
    </div>
    <div id="win-overlay" class="hidden">
      <div class="panel">
        <h1 id="win-title">${config.copy.winTitle}</h1>
        <p id="win-score" class="score-line">Score 0</p>
        <p id="win-body">${config.copy.winBody}</p>
        <button type="button" class="cta" id="reset-button">Fight again</button>
        <a id="next-level" class="cta${config.next ? "" : " hidden"}" href="${config.next ?? "fields.html"}">${nextButtonLabel(config)}</a>
      </div>
    </div>
    <div id="lose-overlay" class="hidden">
      <div class="panel">
        <h1 id="lose-title">${config.copy.loseTitle}</h1>
        <p id="lose-body">${config.copy.loseBody}</p>
        <button type="button" class="cta" id="retry-button">Try again</button>
      </div>
    </div>
    <div id="start-overlay">
      <div class="panel">
        <p class="eyebrow" id="level-eyebrow">${config.copy.eyebrow}</p>
        <h1 id="level-title">${config.title}</h1>
        <p id="level-blurb">${config.copy.blurb}</p>
        <ul>
          <li><strong>Mancer</strong> — tap or click the field to place your knight and start a macro</li>
          <li><strong>Macro</strong> — play the knight; Overview or <kbd>Tab</kbd> returns to overview</li>
          <li>Stick or <kbd>WASD</kbd> move · Sprint / <kbd>Shift</kbd> run · Attack or <kbd>J</kbd></li>
        </ul>
        <button type="button" class="cta" id="start-button" disabled>Loading the field…</button>
        <p class="level-nav"><a href="fields.html">All fields</a></p>
      </div>
    </div>
    <script type="application/json" id="level-config">
${JSON.stringify(config, null, 2)}
    </script>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;
}

for (const level of levels) {
  writeFileSync(join(root, level.file), page(level.config));
}

writeFileSync(
  join(root, "fields.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Macromancer — Fields</title>
  </head>
  <body class="fields-page">
    <div class="panel">
      <p class="eyebrow">Macromancer</p>
      <h1>Eleven fields</h1>
      <p>Each page configures the same engine with a JSON block. Giants change size, speed, health, and how they fight.</p>
      <ol class="field-list">
        <li><a href="index.html"><span class="field-num">1</span>Training Ground — small, slow brute · 100 knights</a></li>
        <li><a href="meadow.html"><span class="field-num">2</span>Open Meadow — the strider</a></li>
        <li><a href="hamlet.html"><span class="field-num">3</span>The Hamlet — the raider</a></li>
        <li><a href="siege.html"><span class="field-num">4</span>The Siege — the original fight</a></li>
        <li><a href="sprinter.html"><span class="field-num">5</span>The Sprinter — fast and small</a></li>
        <li><a href="tank.html"><span class="field-num">6</span>The Tank — huge smash, huge HP</a></li>
        <li><a href="watchman.html"><span class="field-num">7</span>The Watchman — sees the whole field</a></li>
        <li><a href="cleaver.html"><span class="field-num">8</span>The Cleaver — arena-wide sweep</a></li>
        <li><a href="ember.html"><span class="field-num">9</span>Ember — furious swings</a></li>
        <li><a href="colossus.html"><span class="field-num">10</span>The Colossus — a giant that fills the sky</a></li>
        <li><a href="twins.html"><span class="field-num">11</span>The Twins — two giants, opposite sides</a></li>
      </ol>
    </div>
    <script type="module" src="/src/fields.ts"></script>
  </body>
</html>
`,
);

console.log(`Wrote ${levels.length} levels + fields.html`);
