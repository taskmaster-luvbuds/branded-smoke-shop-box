import { test } from "node:test";
import assert from "node:assert/strict";
import { computeLogoDrawRect, REGIONS } from "../public/compositeMath.js";

test("computeLogoDrawRect centers in region at scale 1", () => {
  const region = REGIONS.header;
  const r = computeLogoDrawRect(1000, 1000, 100, 50, region, 1, 0, 0);
  assert.ok(r.w > 0 && r.h > 0);
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const boxCx = (region.left + region.width / 2) * 1000;
  const boxCy = (region.top + region.height / 2) * 1000;
  assert.ok(Math.abs(cx - boxCx) < 1);
  assert.ok(Math.abs(cy - boxCy) < 1);
});

test("offset shifts draw rect", () => {
  const region = REGIONS.header;
  const a = computeLogoDrawRect(1000, 800, 200, 200, region, 1, 0, 0);
  const b = computeLogoDrawRect(1000, 800, 200, 200, region, 1, 0.1, 0);
  assert.ok(b.x > a.x);
});
