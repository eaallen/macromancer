import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { SkyMaterial } from "@babylonjs/materials/sky/skyMaterial";
import type { LevelVibe, Rgb } from "./level.ts";

function rgb3(values: Rgb): Color3 {
  return new Color3(values[0], values[1], values[2]);
}

export function createScene(engine: Engine, vibe: LevelVibe): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(vibe.clear[0], vibe.clear[1], vibe.clear[2], 1);
  scene.ambientColor = rgb3(vibe.ambient);
  scene.collisionsEnabled = true;
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = vibe.fog.density;
  scene.fogColor = rgb3(vibe.fog.color);

  const sunPosition = new Vector3(
    vibe.sun.position[0],
    vibe.sun.position[1],
    vibe.sun.position[2],
  );

  const skyMaterial = new SkyMaterial("sky", scene);
  skyMaterial.backFaceCulling = false;
  skyMaterial.useSunPosition = true;
  skyMaterial.sunPosition = sunPosition;
  skyMaterial.luminance = vibe.sky.luminance;
  skyMaterial.turbidity = vibe.sky.turbidity;
  skyMaterial.rayleigh = vibe.sky.rayleigh;
  skyMaterial.mieCoefficient = vibe.sky.mieCoefficient;
  skyMaterial.mieDirectionalG = vibe.sky.mieDirectionalG;

  const skybox = MeshBuilder.CreateBox("skybox", { size: 1000 }, scene);
  skybox.material = skyMaterial;
  skybox.infiniteDistance = true;
  skybox.isPickable = false;
  skybox.checkCollisions = false;
  skybox.freezeWorldMatrix();

  const sun = new DirectionalLight("sun", sunPosition.negate(), scene);
  sun.intensity = vibe.sun.intensity;
  sun.diffuse = rgb3(vibe.sun.diffuse);
  sun.specular = new Color3(1, 0.92, 0.8);

  const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
  hemi.intensity = vibe.hemi.intensity;
  hemi.groundColor = rgb3(vibe.hemi.ground);

  // Skip per-frame material dirty checks on static lighting/sky once set.
  scene.skipPointerMovePicking = true;
  scene.autoClearDepthAndStencil = true;

  return scene;
}
