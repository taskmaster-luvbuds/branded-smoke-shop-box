/**
 * 3x3 row-major homography: maps (x,y) in homogeneous coords.
 * @param {number[]} H 9 elements
 * @param {number} x
 * @param {number} y
 * @returns {{ x: number, y: number } | null}
 */
export function applyH(H, x, y) {
  const w = H[6] * x + H[7] * y + H[8];
  if (Math.abs(w) < 1e-10) return null;
  return {
    x: (H[0] * x + H[1] * y + H[2]) / w,
    y: (H[3] * x + H[4] * y + H[5]) / w,
  };
}

/** Inverse of 3x3 matrix (row-major). */
export function invert3x3(m) {
  const a = m[0],
    b = m[1],
    c = m[2],
    d = m[3],
    e = m[4],
    f = m[5],
    g = m[6],
    h = m[7],
    i = m[8];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-14) return null;
  const invDet = 1 / det;
  return [
    (e * i - f * h) * invDet,
    (c * h - b * i) * invDet,
    (b * f - c * e) * invDet,
    (f * g - d * i) * invDet,
    (a * i - c * g) * invDet,
    (c * d - a * f) * invDet,
    (d * h - e * g) * invDet,
    (b * g - a * h) * invDet,
    (a * e - b * d) * invDet,
  ];
}

/**
 * Homography from 4 source points to 4 destination points (DLT).
 * Points as [x,y] in pixel coords.
 */
export function homographyFrom4Points(src, dst) {
  const A = new Array(8).fill(0).map(() => new Array(8).fill(0));
  const b = new Array(8);
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [xp, yp] = dst[i];
    A[2 * i][0] = x;
    A[2 * i][1] = y;
    A[2 * i][2] = 1;
    A[2 * i][3] = 0;
    A[2 * i][4] = 0;
    A[2 * i][5] = 0;
    A[2 * i][6] = -xp * x;
    A[2 * i][7] = -xp * y;
    b[2 * i] = xp;
    A[2 * i + 1][0] = 0;
    A[2 * i + 1][1] = 0;
    A[2 * i + 1][2] = 0;
    A[2 * i + 1][3] = x;
    A[2 * i + 1][4] = y;
    A[2 * i + 1][5] = 1;
    A[2 * i + 1][6] = -yp * x;
    A[2 * i + 1][7] = -yp * y;
    b[2 * i + 1] = yp;
  }
  const h = solve8(A, b);
  if (!h) return null;
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

/** Gaussian elimination for 8x8 (small, no deps). */
function solve8(A, b) {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const div = M[col][col];
    for (let c = col; c <= n; c++) M[col][c] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (Math.abs(f) < 1e-15) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row) => row[n]);
}

export function pointInQuad(px, py, quad) {
  const [a, b, c, d] = quad;
  function sign(p1, p2, p3) {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  }
  const p = { x: px, y: py };
  const s1 = sign(p, a, b) < 0;
  const s2 = sign(p, b, c) < 0;
  const s3 = sign(p, c, d) < 0;
  const s4 = sign(p, d, a) < 0;
  return s1 === s2 && s2 === s3 && s3 === s4;
}

function sampleBilinear(img, w, h, x, y) {
  if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= w || yi >= h) return [0, 0, 0, 0];
    const i = (yi * w + xi) * 4;
    return [
      img.data[i],
      img.data[i + 1],
      img.data[i + 2],
      img.data[i + 3],
    ];
  }
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const fx = x - x0;
  const fy = y - y0;
  const idx = (yy, xx) => ((yy * w + xx) * 4);
  const out = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const v00 = img.data[idx(y0, x0) + c];
    const v10 = img.data[idx(y0, x1) + c];
    const v01 = img.data[idx(y1, x0) + c];
    const v11 = img.data[idx(y1, x1) + c];
    out[c] =
      v00 * (1 - fx) * (1 - fy) +
      v10 * fx * (1 - fy) +
      v01 * (1 - fx) * fy +
      v11 * fx * fy;
  }
  return out;
}

/**
 * Warps logo ImageData onto dst canvas: for each pixel in quad, inverse-map to logo.
 * @param {CanvasRenderingContext2D} ctxDest full-size display canvas
 * @param {ImageData} logoData
 * @param {number} logoW
 * @param {number} logoH
 * @param {{x:number,y:number}[]} dstQuadPx — tl, tr, br, bl in destination pixels
 */
export function warpLogoIntoQuad(ctxDest, logoData, logoW, logoH, dstQuadPx) {
  const src = [
    [0, 0],
    [logoW - 1, 0],
    [logoW - 1, logoH - 1],
    [0, logoH - 1],
  ];
  const dst = dstQuadPx.map((p) => [p.x, p.y]);
  /** H maps logo pixel coords → display pixel coords */
  const H = homographyFrom4Points(
    src.map((p) => [p[0], p[1]]),
    dst.map((p) => [p[0], p[1]])
  );
  if (!H) return;
  /** Sample display pixels by inverse-mapping into logo */
  const Hinv = invert3x3(H);
  if (!Hinv) return;

  const quad = dstQuadPx;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of quad) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const W = ctxDest.canvas.width;
  const Hh = ctxDest.canvas.height;
  minX = Math.max(0, Math.floor(minX));
  minY = Math.max(0, Math.floor(minY));
  maxX = Math.min(W - 1, Math.ceil(maxX));
  maxY = Math.min(Hh - 1, Math.ceil(maxY));

  const out = ctxDest.getImageData(0, 0, W, Hh);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!pointInQuad(x, y, quad)) continue;
      const s = applyH(Hinv, x, y);
      if (!s) continue;
      if (s.x < 0 || s.y < 0 || s.x >= logoW - 1 || s.y >= logoH - 1) continue;
      const [r, g, b, a] = sampleBilinear(logoData, logoW, logoH, s.x, s.y);
      if (a < 8) continue;
      const di = (y * W + x) * 4;
      const alpha = a / 255;
      out.data[di] = Math.round(r * alpha + out.data[di] * (1 - alpha));
      out.data[di + 1] = Math.round(g * alpha + out.data[di + 1] * (1 - alpha));
      out.data[di + 2] = Math.round(b * alpha + out.data[di + 2] * (1 - alpha));
      out.data[di + 3] = 255;
    }
  }
  ctxDest.putImageData(out, 0, 0);
}
