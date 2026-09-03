import { createReadStream, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));
const desktop = resolve(root, "../..");
const androidAssets = resolve(desktop, "vap-android/demo/src/main/assets");
const iosResources = resolve(desktop, "vap-ios/Examples/DemoApp/DemoApp/Resources");
const localPublic = resolve(root, "public");

function firstExisting(paths: string[]): string | null {
  return paths.find((path) => existsSync(path)) ?? null;
}

function resolveGift(name: string): string | null {
  return firstExisting([
    resolve(localPublic, "gifts", name),
    resolve(androidAssets, "gifts", name),
    resolve(iosResources, name),
  ]);
}

function resolveBackground(name: string): string | null {
  return firstExisting([
    resolve(localPublic, "background", name),
    resolve(androidAssets, "background", name),
    resolve(iosResources, name),
  ]);
}

function demoAssets(): Plugin {
  return {
    name: "vap-demo-assets",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        let file: string | null = null;
        if (url.startsWith("/gifts/")) {
          file = resolveGift(decodeURIComponent(url.slice("/gifts/".length)));
        } else if (url.startsWith("/background/")) {
          file = resolveBackground(decodeURIComponent(url.slice("/background/".length)));
        }
        if (!file) {
          next();
          return;
        }
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Cache-Control", "no-cache");
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  root,
  publicDir: localPublic,
  plugins: [demoAssets()],
  resolve: {
    alias: {
      vapkit: resolve(root, "../src/index.ts"),
    },
  },
  server: {
    port: 5173,
    host: true,
    fs: {
      allow: [root, resolve(root, ".."), androidAssets, iosResources],
    },
  },
});
