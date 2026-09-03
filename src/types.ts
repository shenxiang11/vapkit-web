export class VapError extends Error {
  readonly code: VapErrorCode;

  constructor(code: VapErrorCode, message: string) {
    super(message);
    this.name = "VapError";
    this.code = code;
  }
}

export type VapErrorCode =
  | "invalidManifest"
  | "unsupportedVersion"
  | "invalidFrame"
  | "invalidVideo"
  | "rendererFailed";

export type VapRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type VapInfo = {
  version: number;
  frameCount: number;
  width: number;
  height: number;
  framesPerSecond: number;
  videoWidth: number;
  videoHeight: number;
  alphaFrame: VapRect;
  rgbFrame: VapRect;
  isFusion: boolean;
  orientation: number;
  codeTags: string[];
  duration: number;
};

export type VapManifest = {
  info: VapInfo;
};

export type VapPlaybackState =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "stopped"
  | "failed";

export function rectMaxX(rect: VapRect): number {
  return rect.x + rect.width;
}

export function rectMaxY(rect: VapRect): number {
  return rect.y + rect.height;
}

export function rectIsEmpty(rect: VapRect): boolean {
  return rect.width <= 0 || rect.height <= 0;
}

export function rectIsContained(rect: VapRect, videoWidth: number, videoHeight: number): boolean {
  return (
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.width > 0 &&
    rect.height > 0 &&
    rectMaxX(rect) <= videoWidth &&
    rectMaxY(rect) <= videoHeight
  );
}
