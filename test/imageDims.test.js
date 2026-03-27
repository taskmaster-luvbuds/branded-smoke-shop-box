import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  probeImageDimensions,
  nearestAspectRatioName,
} from "../lib/imageDims.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

test("probeImageDimensions reads bundled PNG", () => {
  const p = path.join(root, "smoke shop in a box display.png");
  if (!fs.existsSync(p)) return;
  const buf = fs.readFileSync(p);
  const d = probeImageDimensions(buf, "image/png");
  assert.ok(d && d.width > 100 && d.height > 100);
});

test("nearestAspectRatioName picks 16:9 for wide", () => {
  assert.equal(nearestAspectRatioName(1920, 1080), "16:9");
});

test("nearestAspectRatioName picks 3:4 for tall", () => {
  assert.equal(nearestAspectRatioName(900, 1200), "3:4");
});
