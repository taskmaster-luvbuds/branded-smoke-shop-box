import { test } from "node:test";
import assert from "node:assert/strict";
import { getContainedImageRect } from "../public/guideOverlay.js";

test("getContainedImageRect letterboxes tall image in square box", () => {
  const img = {
    naturalWidth: 800,
    naturalHeight: 1200,
    clientWidth: 200,
    clientHeight: 200,
  };
  const r = getContainedImageRect(/** @type {any} */ (img));
  assert.ok(r.scale > 0);
  assert.equal(r.nw, 800);
  assert.equal(r.nh, 1200);
  const drawnH = r.nh * r.scale;
  assert.ok(drawnH <= 200);
  assert.ok(r.oy >= 0);
  assert.ok(r.ox > 0);
});
