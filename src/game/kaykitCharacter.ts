import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF/2.0/glTFLoader";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";

export const CHARACTER_HEIGHT = 1.8;
export const HIT_CLIPS = ["Hit_A", "Hit_B"] as const;
export const CHEER_CLIP = "Cheer";

export async function loadKaykitContainer(
  scene: Scene,
  url: string,
): Promise<AssetContainer> {
  return LoadAssetContainerAsync(url, scene);
}

/**
 * Instantiates a KayKit character from a loaded container and parents it to a capsule.
 */
export function attachKaykitFromContainer(
  container: AssetContainer,
  capsule: Mesh,
  hiddenGear: Set<string>,
  holderName: string,
  height = CHARACTER_HEIGHT,
): AnimationGroup[] {
  const entries = container.instantiateModelsToScene(
    (name) => `${holderName}__${name}`,
    false,
    { doNotInstantiate: true },
  );
  const rootNode = entries.rootNodes[0];
  if (!(rootNode instanceof TransformNode)) {
    throw new Error(`KayKit instance is missing a root: ${holderName}`);
  }
  const root = rootNode;

  const meshes =
    root instanceof AbstractMesh ? [root, ...root.getChildMeshes()] : root.getChildMeshes();
  for (const mesh of meshes) {
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    if (hiddenGear.has(mesh.name) || hiddenGear.has(stripInstancePrefix(mesh.name, holderName))) {
      mesh.setEnabled(false);
    }
  }
  for (const group of entries.animationGroups) {
    group.stop();
    group.reset();
  }

  root.computeWorldMatrix(true);
  const bounds = root.getHierarchyBoundingVectors(true);
  const modelHeight = Math.max(0.001, bounds.max.y - bounds.min.y);
  const scale = height / modelHeight;
  root.scaling.setAll(scale);

  const holder = new TransformNode(holderName, capsule.getScene());
  holder.parent = capsule;
  holder.position.set(0, -height / 2, 0);
  holder.rotation.y = Math.PI;
  root.parent = holder;
  root.position.set(
    -((bounds.min.x + bounds.max.x) / 2) * scale,
    -bounds.min.y * scale,
    -((bounds.min.z + bounds.max.z) / 2) * scale,
  );
  capsule.isVisible = false;
  return entries.animationGroups;
}

function stripInstancePrefix(name: string, holderName: string): string {
  const prefix = `${holderName}__`;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

export function findClip(
  groups: AnimationGroup[],
  name: string,
): AnimationGroup | undefined {
  return (
    groups.find((clip) => clip.name === name) ??
    groups.find(
      (clip) =>
        clip.name.endsWith(`|${name}`) ||
        clip.name.endsWith(`_${name}`) ||
        clip.name.endsWith(`__${name}`),
    )
  );
}
