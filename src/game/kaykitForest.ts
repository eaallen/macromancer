import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { ImportMeshAsync } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import type { Scene } from "@babylonjs/core/scene";

const FOREST_ROOT = "/models/kaykit-forest";
const BUILDING_ROOT = "/models/kaykit-buildings";

export const LEAFY_TREE_FILES = [
  "Tree_1_A_Color1.gltf",
  "Tree_1_C_Color1.gltf",
  "Tree_2_A_Color1.gltf",
  "Tree_2_C_Color1.gltf",
  "Tree_2_E_Color1.gltf",
  "Tree_3_A_Color1.gltf",
  "Tree_3_C_Color1.gltf",
] as const;

export const PINE_TREE_FILES = ["Tree_4_A_Color1.gltf", "Tree_4_C_Color1.gltf"] as const;

export const BUSH_FILES = [
  "Bush_1_A_Color1.gltf",
  "Bush_1_E_Color1.gltf",
  "Bush_2_A_Color1.gltf",
  "Bush_3_A_Color1.gltf",
  "Bush_4_A_Color1.gltf",
] as const;

export const ROCK_FILES = [
  "Rock_1_A_Color1.gltf",
  "Rock_1_J_Color1.gltf",
  "Rock_2_A_Color1.gltf",
  "Rock_2_E_Color1.gltf",
  "Rock_3_A_Color1.gltf",
  "Rock_3_J_Color1.gltf",
] as const;

export const GRASS_FILES = [
  "Grass_1_C_Color1.gltf",
  "Grass_1_D_Color1.gltf",
  "Grass_2_C_Color1.gltf",
] as const;

export const BUILDING_FILES = [
  "building_home_A_blue.gltf",
  "building_home_B_blue.gltf",
  "building_tavern_blue.gltf",
  "building_blacksmith_blue.gltf",
  "building_church_blue.gltf",
  "building_windmill_blue.gltf",
  "building_tower_A_blue.gltf",
  "building_well_blue.gltf",
  "building_barracks_blue.gltf",
  "building_market_blue.gltf",
] as const;

export async function loadGltfTemplate(
  scene: Scene,
  url: string,
  transparencyMode: number,
  collide = false,
): Promise<TransformNode> {
  const result = await ImportMeshAsync(url, scene);
  const root = result.meshes[0];
  if (!root) {
    throw new Error(`Model is missing a root mesh: ${url}`);
  }

  root.computeWorldMatrix(true);
  const bounds = root.getHierarchyBoundingVectors(true);
  const file = url.split("/").pop() ?? "prop";
  const template = new TransformNode(`${file}_template`, scene);
  template.position.set(
    (bounds.min.x + bounds.max.x) / 2,
    bounds.min.y,
    (bounds.min.z + bounds.max.z) / 2,
  );
  root.setParent(template);
  template.position.set(0, 0, 0);

  for (const mesh of root.getChildMeshes()) {
    mesh.isPickable = false;
    mesh.checkCollisions = collide;
    if (mesh.material) {
      mesh.material.transparencyMode = transparencyMode;
    }
  }
  template.setEnabled(false);
  return template;
}

export async function loadForestTemplates(
  scene: Scene,
  files: readonly string[],
  transparencyMode: number,
): Promise<TransformNode[]> {
  return Promise.all(
    files.map((file) =>
      loadGltfTemplate(scene, `${FOREST_ROOT}/${file}`, transparencyMode),
    ),
  );
}

export async function loadBuildingTemplates(
  scene: Scene,
  files: readonly string[],
  transparencyMode: number,
): Promise<TransformNode[]> {
  // Visual meshes stay non-solid; villages add invisible box hulls in world.ts.
  return Promise.all(
    files.map((file) =>
      loadGltfTemplate(scene, `${BUILDING_ROOT}/${file}`, transparencyMode, false),
    ),
  );
}
