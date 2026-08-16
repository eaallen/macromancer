import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Material } from "@babylonjs/core/Materials/material";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { ARENA, ARENA_RADIUS, SPAWN, WORLD_SIZE, inArena } from "./config.ts";
import { heightAt } from "./height.ts";
import {
  BUSH_FILES,
  GRASS_FILES,
  LEAFY_TREE_FILES,
  PINE_TREE_FILES,
  ROCK_FILES,
  loadBuildingTemplates,
  loadForestTemplates,
} from "./kaykitForest.ts";
import type { LevelBuilding, LevelConfig, ScatterKind } from "./level.ts";

function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function createBounds(scene: Scene): void {
  const half = WORLD_SIZE / 2;
  const thickness = 8;
  const height = 40;
  const inset = thickness / 2 + 1;
  const y = height / 2 - 4;
  const walls = [
    { name: "wallN", width: WORLD_SIZE, depth: thickness, x: 0, z: half - inset },
    { name: "wallS", width: WORLD_SIZE, depth: thickness, x: 0, z: -(half - inset) },
    { name: "wallE", width: thickness, depth: WORLD_SIZE, x: half - inset, z: 0 },
    { name: "wallW", width: thickness, depth: WORLD_SIZE, x: -(half - inset), z: 0 },
  ];
  for (const wall of walls) {
    const mesh = MeshBuilder.CreateBox(
      wall.name,
      { width: wall.width, height, depth: wall.depth },
      scene,
    );
    mesh.position.set(wall.x, y, wall.z);
    mesh.checkCollisions = true;
    mesh.isVisible = false;
    mesh.isPickable = false;
    mesh.metadata = { walkable: false };
  }
}

function cloneProp(
  template: TransformNode,
  name: string,
  x: number,
  z: number,
  scale: number,
  yaw: number,
): TransformNode | null {
  const clone = template.clone(name, null);
  if (!clone) {
    return null;
  }
  clone.rotation.y = yaw;
  clone.scaling.scaleInPlace(scale);
  clone.position.set(x, heightAt(x, z), z);
  clone.setEnabled(true);
  return clone;
}

function addSolidHull(node: TransformNode, scene: Scene): void {
  node.computeWorldMatrix(true);
  const bounds = node.getHierarchyBoundingVectors(true);
  const hull = MeshBuilder.CreateBox(
    `${node.name}Hull`,
    {
      width: Math.max(0.5, bounds.max.x - bounds.min.x),
      height: Math.max(0.5, bounds.max.y - bounds.min.y),
      depth: Math.max(0.5, bounds.max.z - bounds.min.z),
    },
    scene,
  );
  hull.position.set(
    (bounds.min.x + bounds.max.x) / 2,
    (bounds.min.y + bounds.max.y) / 2,
    (bounds.min.z + bounds.max.z) / 2,
  );
  hull.checkCollisions = true;
  hull.isVisible = false;
  hull.isPickable = false;
  hull.metadata = { walkable: false };
}

function nearBuilding(x: number, z: number, buildings: readonly LevelBuilding[]): boolean {
  for (const spot of buildings) {
    if (Math.hypot(x - spot.x, z - spot.z) < spot.clearance) {
      return true;
    }
  }
  return false;
}

function scatter(
  templates: TransformNode[],
  namePrefix: string,
  spec: ScatterKind,
  buildings: readonly LevelBuilding[],
): void {
  let placed = 0;
  const spread = WORLD_SIZE * 0.42;
  for (let i = 0; i < spec.attempts && placed < spec.count; i++) {
    const x = (hash(i * 3.1 + spec.seed) - 0.5) * spread * 2;
    const z = (hash(i * 7.7 + spec.seed) - 0.5) * spread * 2;
    if (spec.skipArena && inArena(x, z, 6)) {
      continue;
    }
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 10) {
      continue;
    }
    if (nearBuilding(x, z, buildings)) {
      continue;
    }
    const template = templates[placed % templates.length];
    if (!template) {
      continue;
    }
    const scale = spec.scale[0] + hash(i * 11.3 + spec.seed) * (spec.scale[1] - spec.scale[0]);
    const node = cloneProp(
      template,
      `${namePrefix}${placed}`,
      x,
      z,
      scale,
      hash(i * 13.7 + spec.seed) * Math.PI * 2,
    );
    if (!node) {
      continue;
    }
    if (spec.collide) {
      for (const mesh of node.getChildMeshes()) {
        mesh.checkCollisions = true;
      }
    }
    placed += 1;
  }
}

function scaleTemplateToHeight(template: TransformNode, targetHeight: number): void {
  template.computeWorldMatrix(true);
  const bounds = template.getHierarchyBoundingVectors(true);
  const height = Math.max(0.001, bounds.max.y - bounds.min.y);
  template.scaling.setAll(targetHeight / height);
}

async function createVillage(scene: Scene, buildings: readonly LevelBuilding[]): Promise<void> {
  const files = [...new Set(buildings.map((building) => building.file))];
  if (files.length === 0) {
    return;
  }
  const templates = await loadBuildingTemplates(scene, files, Material.MATERIAL_OPAQUE);
  const byFile = new Map(files.map((file, index) => [file, templates[index]]));

  for (let i = 0; i < buildings.length; i++) {
    const spot = buildings[i];
    if (!spot) {
      continue;
    }
    const template = byFile.get(spot.file);
    if (!template) {
      continue;
    }
    const node = template.clone(`building${i}`, null);
    if (!node) {
      continue;
    }
    node.position.set(0, 0, 0);
    node.scaling.setAll(1);
    node.setEnabled(true);
    scaleTemplateToHeight(node, spot.height);
    node.rotation.y = spot.yaw;
    node.position.set(spot.x, heightAt(spot.x, spot.z), spot.z);
    addSolidHull(node, scene);
  }
}

async function createForest(scene: Scene, level: LevelConfig): Promise<void> {
  const cutout = Material.MATERIAL_ALPHATEST;
  const [leafy, pines, bushes, rocks, grass] = await Promise.all([
    loadForestTemplates(scene, LEAFY_TREE_FILES, cutout),
    loadForestTemplates(scene, PINE_TREE_FILES, cutout),
    loadForestTemplates(scene, BUSH_FILES, cutout),
    loadForestTemplates(scene, ROCK_FILES, Material.MATERIAL_OPAQUE),
    loadForestTemplates(scene, GRASS_FILES, cutout),
  ]);

  scatter(leafy, "tree", level.scatter.trees, level.buildings);
  scatter(pines, "pine", level.scatter.pines, level.buildings);
  scatter(rocks, "rock", level.scatter.rocks, level.buildings);
  scatter(bushes, "bush", level.scatter.bushes, level.buildings);
  scatter(grass, "grass", level.scatter.grass, level.buildings);

  const treeRing = level.scatter.ringTrees;
  for (let i = 0; i < treeRing; i++) {
    const angle = (i / treeRing) * Math.PI * 2 + 0.2;
    const radius = ARENA_RADIUS + 4 + hash(i * 9.1) * 6;
    const x = ARENA.x + Math.cos(angle) * radius;
    const z = ARENA.z + Math.sin(angle) * radius;
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 12) {
      continue;
    }
    if (nearBuilding(x, z, level.buildings)) {
      continue;
    }
    const template = leafy[i % leafy.length];
    if (!template) {
      continue;
    }
    cloneProp(template, `ringTree${i}`, x, z, 1.15 + hash(i) * 0.35, angle);
  }
}

export async function createWorld(scene: Scene, level: LevelConfig): Promise<void> {
  createBounds(scene);
  await Promise.all([createForest(scene, level), createVillage(scene, level.buildings)]);
}
