import {
  type VapInfo,
  type VapManifest,
  type VapRect,
  VapError,
  rectIsContained,
  rectIsEmpty,
} from "./types.ts";

const VAPC = [0x76, 0x61, 0x70, 0x63] as const;

export function parseJson(source: string | Uint8Array): VapManifest {
  const text = typeof source === "string" ? source : new TextDecoder().decode(source);
  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch {
    throw new VapError("invalidManifest", "invalid manifest");
  }
  if (!isRecord(root) || !isRecord(root.info)) {
    throw new VapError("invalidManifest", "invalid manifest");
  }
  return { info: parseInfo(root.info) };
}

export function parseMp4(bytes: Uint8Array): VapManifest {
  const payload = extractVapcPayload(bytes);
  if (!payload) {
    throw new VapError("invalidVideo", "invalid video");
  }
  return parseJson(payload);
}

export function extractVapcPayload(mp4: Uint8Array): Uint8Array | null {
  let offset = 0;
  const count = mp4.byteLength;
  while (offset + 8 <= count) {
    const size = readUInt32BE(mp4, offset);
    if (size < 8) {
      throw new VapError("invalidVideo", "invalid video");
    }
    const end = offset + size;
    if (end > count) {
      throw new VapError("invalidVideo", "invalid video");
    }
    if (
      mp4[offset + 4] === VAPC[0] &&
      mp4[offset + 5] === VAPC[1] &&
      mp4[offset + 6] === VAPC[2] &&
      mp4[offset + 7] === VAPC[3]
    ) {
      return mp4.subarray(offset + 8, end);
    }
    offset = end;
  }
  return null;
}

function parseInfo(obj: Record<string, unknown>): VapInfo {
  const version = intValue(obj.v);
  if (version == null) {
    throw new VapError("invalidManifest", "invalid manifest");
  }
  if (version !== 2) {
    throw new VapError("unsupportedVersion", `unsupported version ${version}`);
  }

  const frameCount = intValue(obj.f);
  const width = intValue(obj.w);
  const height = intValue(obj.h);
  const fps = intValue(obj.fps);
  const videoWidth = intValue(obj.videoW);
  const videoHeight = intValue(obj.videoH);
  if (
    frameCount == null ||
    width == null ||
    height == null ||
    fps == null ||
    videoWidth == null ||
    videoHeight == null ||
    frameCount <= 0 ||
    fps <= 0 ||
    width <= 0 ||
    height <= 0 ||
    videoWidth <= 0 ||
    videoHeight <= 0
  ) {
    throw new VapError("invalidManifest", "invalid manifest");
  }

  const alphaFrame = parseRect(obj.aFrame);
  const rgbFrame = parseRect(obj.rgbFrame);
  if (!rectIsContained(alphaFrame, videoWidth, videoHeight) || !rectIsContained(rgbFrame, videoWidth, videoHeight)) {
    throw new VapError("invalidFrame", "invalid frame");
  }
  if (rgbFrame.width !== width || rgbFrame.height !== height) {
    throw new VapError("invalidFrame", "invalid frame");
  }

  return {
    version,
    frameCount,
    width,
    height,
    framesPerSecond: fps,
    videoWidth,
    videoHeight,
    alphaFrame,
    rgbFrame,
    isFusion: intValue(obj.isVapx) === 1,
    orientation: intValue(obj.orien) ?? 0,
    codeTags: parseCodeTags(obj.codeTag),
    duration: frameCount / fps,
  };
}

function parseRect(raw: unknown): VapRect {
  if (!Array.isArray(raw) || raw.length !== 4) {
    throw new VapError("invalidFrame", "invalid frame");
  }
  const x = intValue(raw[0]);
  const y = intValue(raw[1]);
  const width = intValue(raw[2]);
  const height = intValue(raw[3]);
  if (x == null || y == null || width == null || height == null) {
    throw new VapError("invalidFrame", "invalid frame");
  }
  const rect = { x, y, width, height };
  if (rectIsEmpty(rect)) {
    throw new VapError("invalidFrame", "invalid frame");
  }
  return rect;
}

function parseCodeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  if (typeof raw === "string" && raw.length > 0) {
    return [raw];
  }
  return [];
}

function readUInt32BE(data: Uint8Array, offset: number): number {
  return ((data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]) >>> 0;
}

function intValue(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.trunc(raw);
  }
  if (typeof raw === "string") {
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
