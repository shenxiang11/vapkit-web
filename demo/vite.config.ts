import { copyFileSync, createReadStream, existsSync, mkdirSync } from "node:fs";
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

function stagePublicAssets(): void {
  const gifts = [
    "user_246106.mp4",
    "user_245341.mp4",
    "user_2390.mp4",
    "user_3123.mp4",
    "user_3179.mp4",
  ];
  mkdirSync(resolve(localPublic, "gifts"), { recursive: true });
  mkdirSync(resolve(localPublic, "background"), { recursive: true });
  for (const name of gifts) {
    const from = resolveGift(name);
    const to = resolve(localPublic, "gifts", name);
    if (from && from !== to) {
      copyFileSync(from, to);
    }
  }
  const background = resolveBackground("dong_qu_chun_lai.mp4");
  const backgroundTo = resolve(localPublic, "background", "dong_qu_chun_lai.mp4");
  if (background && background !== backgroundTo) {
    copyFileSync(background, backgroundTo);
  }
}

function demoAssets(): Plugin {
  return {
    name: "vap-demo-assets",
    buildStart() {
      stagePublicAssets();
    },
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
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
