import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseJson, VapError } from "../src/index.ts";

const fixture = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "fixtures/user_246106.vapc.json"),
  "utf8",
);

describe("parseJson", () => {
  it("parses the user fixture", () => {
    const manifest = parseJson(fixture);
    expect(manifest.info.version).toBe(2);
    expect(manifest.info.frameCount).toBe(151);
    expect(manifest.info.width).toBe(750);
    expect(manifest.info.height).toBe(1624);
    expect(manifest.info.videoWidth).toBe(1136);
    expect(manifest.info.videoHeight).toBe(1632);
    expect(manifest.info.rgbFrame).toEqual({ x: 0, y: 0, width: 750, height: 1624 });
    expect(manifest.info.alphaFrame).toEqual({ x: 754, y: 0, width: 375, height: 812 });
    expect(manifest.info.codeTags).toEqual(["17ae.com"]);
    expect(manifest.info.duration).toBeGreaterThan(5);
  });

  it("rejects an old version", () => {
    expect(() =>
      parseJson(
        '{"info":{"v":1,"f":1,"w":10,"h":10,"fps":30,"videoW":10,"videoH":10,"aFrame":[0,0,5,5],"rgbFrame":[0,0,10,10]}}',
      ),
    ).toThrow(VapError);
  });
});
