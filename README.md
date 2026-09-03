# VAPKit Web

独立实现的 VAP 礼物动画播放器（TypeScript / WebGL），不是腾讯官方 SDK 的封装。协议与旁边的 [vap-ios](../vap-ios)、[vap-android](../vap-android) 相同：读 MP4 顶层 `vapc`，用浏览器 `<video>` 解码，再按 `rgbFrame` / `aFrame` 合成透明通道。

## 安装

```bash
npm install @shenxiang11/vapkit
```

```ts
import { VapPlayer, parseMp4 } from "@shenxiang11/vapkit";

const canvas = document.querySelector("canvas")!;
const player = new VapPlayer({ canvas });
await player.load("/gift.mp4");
player.loop = false;
player.play();
```

只解析：

```ts
const bytes = new Uint8Array(await (await fetch("/gift.mp4")).arrayBuffer());
const manifest = parseMp4(bytes);
```

## 运行 Demo

```bash
npm install
npm run dev
```

浏览器打开终端里的本地地址。Demo 是直播间送礼页：背景循环视频，底部礼物栏，点发送后播 VAP 并自动收起面板。

开发服务器会按顺序找礼物文件：`demo/public/`，然后旁边的 `vap-android` / `vap-ios` 素材目录。所以本地不必再拷一份 MP4。

加礼物：把带 `vapc` 的 MP4 放到 `demo/public/gifts/`（或 iOS/Android 的同一套 Resources），再在 `demo/main.ts` 加一行。

## 发布 Demo 到 Vercel

1. 把礼物 MP4 放进 `demo/public/gifts/`，背景视频放进 `demo/public/background/`（Vercel 上没有旁边的 iOS/Android 目录）。本地构建时如果旁边有 `vap-ios` / `vap-android`，会自动拷一份进来。
2. 把改动推到 [vapkit-web](https://github.com/shenxiang11/vapkit-web)。
3. 打开 [vercel.com](https://vercel.com)，用 GitHub 登录，Import `shenxiang11/vapkit-web`。
4. 框架选 Vite，或直接用仓库里的 `vercel.json`：
   - Build Command：`npm run build:demo`
   - Output Directory：`demo/dist`
   - Install Command：`npm install`
5. Deploy。完成后会给一个 `*.vercel.app` 地址。

不要用 `npm run build`，那个是打 npm 包，不是 Demo。

也可以本机：

```bash
npm i -g vercel
cd /Users/shenxiang/Desktop/vap-web
vercel
```

## 脚本

```bash
npm test         # 解析单测
npm run build    # 打 npm 包到 dist/
npm run build:demo
```
