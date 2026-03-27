import { test } from "node:test";
import assert from "node:assert/strict";
import {
  homographyFrom4Points,
  applyH,
  invert3x3,
} from "../public/homography.js";

test("homography maps square corners to trapezoid", () => {
  const src = [
    [0, 0],
    [100, 0],
    [100, 100],
    [0, 100],
  ];
  const dst = [
    [10, 10],
    [90, 12],
    [88, 90],
    [12, 88],
  ];
  const H = homographyFrom4Points(src, dst);
  assert.ok(H);
  for (let i = 0; i < 4; i++) {
    const p = applyH(H, src[i][0], src[i][1]);
    assert.ok(p);
    assert.ok(Math.abs(p.x - dst[i][0]) < 0.5);
    assert.ok(Math.abs(p.y - dst[i][1]) < 0.5);
  }
});

test("inverse times matrix is identity", () => {
  const H = [2, 0, 0, 0, 4, 0, 0, 0, 1];
  const Hi = invert3x3(H);
  assert.ok(Hi);
  const I = multiply3(H, Hi);
  assert.ok(Math.abs(I[0] - 1) < 1e-6);
  assert.ok(Math.abs(I[4] - 1) < 1e-6);
  assert.ok(Math.abs(I[8] - 1) < 1e-6);
  assert.ok(Math.abs(I[1]) < 1e-5 && Math.abs(I[2]) < 1e-5);
});

function multiply3(a, b) {
  const o = new Array(9);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      o[r * 3 + c] =
        a[r * 3 + 0] * b[0 * 3 + c] +
        a[r * 3 + 1] * b[1 * 3 + c] +
        a[r * 3 + 2] * b[2 * 3 + c];
    }
  }
  return o;
}
