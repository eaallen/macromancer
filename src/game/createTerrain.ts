import { Color4 } from "@babylonjs/core/Maths/math.color";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Scene } from "@babylonjs/core/scene";
import type { GroundMesh } from "@babylonjs/core/Meshes/groundMesh";
import { WORLD_SIZE } from "./config.ts";
import { heightAt } from "./height.ts";
import type { LevelVibe, Rgb } from "./level.ts";
import { isTouchPlay } from "./touchControls.ts";

function rgb4(values: Rgb): Color4 {
  return new Color4(values[0], values[1], values[2], 1);
}

function hashColor(x: number, z: number): number {
  const n = Math.sin(x * 12.99 + z * 78.23) * 43758.5453;
  return n - Math.floor(n);
}

function mix(a: Color4, b: Color4, t: number): Color4 {
  return new Color4(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
    1,
  );
}

export function createTerrain(scene: Scene, vibe: LevelVibe): GroundMesh {
  const grass = rgb4(vibe.terrain.grass);
  const grassDark = rgb4(vibe.terrain.grassDark);
  const dirt = rgb4(vibe.terrain.dirt);
  // Mobile keeps a lighter mesh; heightAt still drives placement/collision.
  const subdivisions = isTouchPlay() ? 48 : 90;

  const ground = MeshBuilder.CreateGround(
    "terrain",
    {
      width: WORLD_SIZE,
      height: WORLD_SIZE,
      subdivisions,
      updatable: true,
    },
    scene,
  );

  const positions = ground.getVerticesData(VertexBuffer.PositionKind);
  if (!positions) {
    throw new Error("Terrain mesh is missing position data.");
  }

  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 1] = heightAt(positions[i], positions[i + 2]);
  }

  ground.updateVerticesData(VertexBuffer.PositionKind, positions);
  ground.convertToFlatShadedMesh();

  const shadedPositions = ground.getVerticesData(VertexBuffer.PositionKind);
  if (!shadedPositions) {
    throw new Error("Terrain mesh is missing position data after flattening.");
  }

  const colors = new Float32Array((shadedPositions.length / 3) * 4);
  for (let i = 0, c = 0; i < shadedPositions.length; i += 3, c += 4) {
    const speck = hashColor(shadedPositions[i], shadedPositions[i + 2]);
    const y = shadedPositions[i + 1];
    const color =
      y > 3.2 ? mix(grassDark, dirt, 0.45 + speck * 0.2) : mix(grass, grassDark, speck * 0.55);
    colors[c] = color.r;
    colors[c + 1] = color.g;
    colors[c + 2] = color.b;
    colors[c + 3] = 1;
  }
  ground.setVerticesData(VertexBuffer.ColorKind, colors);
  ground.refreshBoundingInfo();

  const material = new StandardMaterial("terrainMat", scene);
  material.specularColor.set(0.04, 0.04, 0.04);
  material.diffuseColor.set(1, 1, 1);
  ground.material = material;
  // Flat-shaded heightfields are expensive for Babylon ellipsoid tests.
  // Characters plant with heightAt; keep the mesh pickable for spawn markers.
  ground.checkCollisions = false;
  ground.isPickable = true;
  ground.metadata = { walkable: true };
  ground.freezeWorldMatrix();
  material.freeze();

  return ground;
}
