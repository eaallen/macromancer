import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    port: 5173,
  },
  resolve: {
    dedupe: ["@babylonjs/core"],
  },
  optimizeDeps: {
    exclude: ["@babylonjs/core", "@babylonjs/loaders", "@babylonjs/materials"],
  },
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        meadow: resolve(root, "meadow.html"),
        hamlet: resolve(root, "hamlet.html"),
        siege: resolve(root, "siege.html"),
        sprinter: resolve(root, "sprinter.html"),
        tank: resolve(root, "tank.html"),
        watchman: resolve(root, "watchman.html"),
        cleaver: resolve(root, "cleaver.html"),
        ember: resolve(root, "ember.html"),
        colossus: resolve(root, "colossus.html"),
        twins: resolve(root, "twins.html"),
        fields: resolve(root, "fields.html"),
        how: resolve(root, "how.html"),
      },
    },
  },
});
