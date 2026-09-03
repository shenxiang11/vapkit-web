import { parseMp4 } from "./parser.ts";
import { VapGlRenderer } from "./renderer.ts";
import type { VapManifest, VapPlaybackState } from "./types.ts";

export type VapPlayerOptions = {
  canvas: HTMLCanvasElement;
};

export class VapPlayer {
  loop = false;
  onStateChanged: ((state: VapPlaybackState) => void) | null = null;

  #state: VapPlaybackState = "idle";
  #manifest: VapManifest | null = null;
  #canvas: HTMLCanvasElement;
  #video: HTMLVideoElement;
  #renderer = new VapGlRenderer();
  #objectUrl: string | null = null;
  #raf = 0;

  constructor(options: VapPlayerOptions) {
    this.#canvas = options.canvas;
    this.#video = document.createElement("video");
    this.#video.muted = true;
    this.#video.playsInline = true;
    this.#video.preload = "auto";
    this.#video.setAttribute("playsinline", "");
    this.#video.setAttribute("webkit-playsinline", "");
    this.#video.addEventListener("ended", () => {
      if (this.loop) {
        this.#video.currentTime = 0;
        void this.#video.play();
        return;
      }
      this.stop();
    });
  }

  get state(): VapPlaybackState {
    return this.#state;
  }

  get manifest(): VapManifest | null {
    return this.#manifest;
  }

  async load(source: string | URL | ArrayBuffer | Uint8Array): Promise<void> {
    this.setState("loading");
    this.revokeObjectUrl();
    const bytes = await readBytes(source);
    const manifest = parseMp4(bytes);
    const blob = new Blob([toArrayBuffer(bytes)], { type: "video/mp4" });
    this.#objectUrl = URL.createObjectURL(blob);
    this.#manifest = manifest;
    this.#renderer.attach(this.#canvas, manifest.info);
    await this.bindVideo(this.#objectUrl);
    this.setState("ready");
  }

  play(): void {
    if (!this.#manifest) {
      return;
    }
    this.#video.loop = this.loop;
    this.setState("playing");
    this.startPump();
    void this.#video.play();
  }

  pause(): void {
    if (this.#state !== "playing") {
      return;
    }
    this.#video.pause();
    this.setState("paused");
  }

  stop(): void {
    this.#video.pause();
    this.#video.currentTime = 0;
    this.stopPump();
    this.setState("stopped");
  }

  release(): void {
    this.stop();
    this.#renderer.release();
    this.revokeObjectUrl();
    this.#manifest = null;
    this.setState("idle");
  }

  private startPump(): void {
    this.stopPump();
    const tick = () => {
      if (this.#state === "playing" && this.#video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        this.#renderer.draw(this.#video);
      }
      this.#raf = requestAnimationFrame(tick);
    };
    this.#raf = requestAnimationFrame(tick);
  }

  private stopPump(): void {
    if (this.#raf) {
      cancelAnimationFrame(this.#raf);
      this.#raf = 0;
    }
  }

  private bindVideo(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        this.setState("failed");
        reject(this.#video.error ?? new Error("video load failed"));
      };
      const cleanup = () => {
        this.#video.removeEventListener("loadeddata", onReady);
        this.#video.removeEventListener("error", onError);
      };
      this.#video.addEventListener("loadeddata", onReady);
      this.#video.addEventListener("error", onError);
      this.#video.src = url;
      this.#video.load();
    });
  }

  private revokeObjectUrl(): void {
    if (this.#objectUrl) {
      URL.revokeObjectURL(this.#objectUrl);
      this.#objectUrl = null;
    }
  }

  private setState(next: VapPlaybackState): void {
    this.#state = next;
    this.onStateChanged?.(next);
  }
}

async function readBytes(source: string | URL | ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  if (source instanceof Uint8Array) {
    return source;
  }
  if (source instanceof ArrayBuffer) {
    return new Uint8Array(source);
  }
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`failed to fetch VAP: ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
