import { test } from "node:test";
import assert from "node:assert/strict";
import { getColorById, DISPLAY_COLORS } from "../lib/colors.js";

test("DISPLAY_COLORS has nine variants", () => {
  assert.equal(DISPLAY_COLORS.length, 9);
});

test("getColorById finds red", () => {
  const c = getColorById("red");
  assert.ok(c);
  assert.equal(c.file, "red.jpg");
});

test("getColorById original returns null", () => {
  assert.equal(getColorById("original"), null);
});
