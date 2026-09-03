# VAPKit Web

独立实现的 VAP 礼物动画播放器（TypeScript / WebGL），不是腾讯官方 SDK 的封装。协议与旁边的 [vap-ios](../vap-ios)、[vap-android](../vap-android) 相同：读 MP4 顶层 `vapc`，用浏览器 `<video>` 解码，再按 `rgbFrame` / `aFrame` 合成透明通道。

## 安装

```bash
npm install vapkit
```

```ts
import { VapPlayer, parseMp4 } from "vapkit";

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

## 脚本

```bash
npm test      # 解析单测
npm run build # 打 npm 包到 dist/
```
