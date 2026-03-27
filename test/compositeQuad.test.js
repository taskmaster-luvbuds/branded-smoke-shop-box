import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HEADER_QUAD_NORM,
  quadNormToPixels,
} from "../public/compositeMath.js";

test("quadNormToPixels scales toward center", () => {
  const q = quadNormToPixels(HEADER_QUAD_NORM, 1000, 1000, 0, 0, 0.5);
  assert.equal(q.length, 4);
  const q1 = quadNormToPixels(HEADER_QUAD_NORM, 1000, 1000, 0, 0, 1);
  const cx = q.reduce((s, p) => s + p.x, 0) / 4;
  const cy = q.reduce((s, p) => s + p.y, 0) / 4;
  const cx1 = q1.reduce((s, p) => s + p.x, 0) / 4;
  const cy1 = q1.reduce((s, p) => s + p.y, 0) / 4;
  assert.ok(Math.abs(cx - cx1) < 1e-6);
  assert.ok(Math.abs(cy - cy1) < 1e-6);
  assert.ok(Math.abs(q[0].x - q1[0].x) > 5);
});
