import type { VapInfo } from "./types";
import { VapError } from "./types";

const VERTEX = `
attribute vec2 aPosition;
attribute vec2 aRgbUV;
attribute vec2 aAlphaUV;
varying vec2 vRgbUV;
varying vec2 vAlphaUV;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
  vRgbUV = aRgbUV;
  vAlphaUV = aAlphaUV;
}
`;

const FRAGMENT = `
precision mediump float;
uniform sampler2D uTexture;
varying vec2 vRgbUV;
varying vec2 vAlphaUV;
void main() {
  vec4 rgb = texture2D(uTexture, vRgbUV);
  vec4 alpha = texture2D(uTexture, vAlphaUV);
  gl_FragColor = vec4(rgb.rgb, alpha.r);
}
`;

export class VapGlRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private buffer: WebGLBuffer | null = null;
  private canvas: HTMLCanvasElement | null = null;

  attach(canvas: HTMLCanvasElement, info: VapInfo): void {
    this.release();
    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      throw new VapError("rendererFailed", "renderer initialization failed");
    }
    canvas.width = info.width;
    canvas.height = info.height;
    this.canvas = canvas;
    this.gl = gl;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const program = linkProgram(gl, VERTEX, FRAGMENT);
    this.program = program;
    gl.useProgram(program);

    const rgb = computeCoord(info.rgbFrame, info.videoWidth, info.videoHeight);
    const alpha = computeCoord(info.alphaFrame, info.videoWidth, info.videoHeight);
    const vertices = new Float32Array([
      -1, 1, rgb[0], rgb[3], alpha[0], alpha[3],
      1, 1, rgb[1], rgb[3], alpha[1], alpha[3],
      -1, -1, rgb[0], rgb[2], alpha[0], alpha[2],
      1, -1, rgb[1], rgb[2], alpha[1], alpha[2],
    ]);
    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new VapError("rendererFailed", "renderer initialization failed");
    }
    this.buffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    bindAttrib(gl, program, "aPosition", 2, 6, 0);
    bindAttrib(gl, program, "aRgbUV", 2, 6, 2);
    bindAttrib(gl, program, "aAlphaUV", 2, 6, 4);

    const texture = gl.createTexture();
    if (!texture) {
      throw new VapError("rendererFailed", "renderer initialization failed");
    }
    this.texture = texture;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0);
  }

  draw(video: HTMLVideoElement): void {
    const gl = this.gl;
    if (!gl || !this.texture) {
      return;
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  release(): void {
    const gl = this.gl;
    if (gl) {
      if (this.buffer) {
        gl.deleteBuffer(this.buffer);
      }
      if (this.texture) {
        gl.deleteTexture(this.texture);
      }
      if (this.program) {
        gl.deleteProgram(this.program);
      }
    }
    this.gl = null;
    this.program = null;
    this.texture = null;
    this.buffer = null;
    this.canvas = null;
  }
}

function computeCoord(
  rect: { x: number; y: number; width: number; height: number },
  videoWidth: number,
  videoHeight: number,
): [number, number, number, number] {
  const vw = Math.max(videoWidth, 1);
  const vh = Math.max(videoHeight, 1);
  return [
    rect.x / vw,
    (rect.x + rect.width) / vw,
    (vh - rect.y - rect.height) / vh,
    (vh - rect.y) / vh,
  ];
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new VapError("rendererFailed", "renderer initialization failed");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "shader compile failed";
    gl.deleteShader(shader);
    throw new VapError("rendererFailed", log);
  }
  return shader;
}

function linkProgram(gl: WebGLRenderingContext, vertex: string, fragment: string): WebGLProgram {
  const vs = compile(gl, gl.VERTEX_SHADER, vertex);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!program) {
    throw new VapError("rendererFailed", "renderer initialization failed");
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new VapError("rendererFailed", gl.getProgramInfoLog(program) ?? "program link failed");
  }
  return program;
}

function bindAttrib(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  name: string,
  size: number,
  stride: number,
  offset: number,
): void {
  const loc = gl.getAttribLocation(program, name);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, offset * 4);
}
