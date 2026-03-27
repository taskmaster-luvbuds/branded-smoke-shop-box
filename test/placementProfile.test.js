import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolvePlacementProfile,
  HEADER_QUAD_NORM,
  HEADER_QUAD_COLOR_JPEG,
} from "../public/compositeMath.js";

test("original + stock PNG dimensions use stock quad", () => {
  const p = resolvePlacementProfile("original", 832, 1248, {});
  assert.equal(p.kind, "stockPng");
  assert.deepEqual(p.headerQuad, HEADER_QUAD_NORM);
});

test("color id uses color JPEG preset", () => {
  const p = resolvePlacementProfile("red", 1164, 1754, {});
  assert.equal(p.kind, "colorJpeg");
  assert.deepEqual(p.headerQuad, HEADER_QUAD_COLOR_JPEG);
});

test("custom upload matching JPEG size uses color preset", () => {
  const p = resolvePlacementProfile("ignored", 1164, 1754, {
    customDisplay: true,
  });
  assert.equal(p.kind, "colorJpeg");
});

test("empty color id defaults to red preset (avoids stock PNG on color preview)", () => {
  const p = resolvePlacementProfile("", 1164, 1754, {});
  assert.equal(p.kind, "colorJpeg");
});
