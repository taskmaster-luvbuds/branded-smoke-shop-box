import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrompt } from "../lib/brandPrompt.js";

test("buildPrompt includes base instructions (with logos)", () => {
  const p = buildPrompt("");
  assert.match(p, /retail|POS|display/i);
  assert.match(p, /logo/i);
});

test("buildPrompt appends user direction", () => {
  const p = buildPrompt("Logo on the header only");
  assert.match(p, /Logo on the header only/);
});

test("buildPrompt without logos uses non-logo branch", () => {
  const p = buildPrompt("", { hasLogos: false });
  assert.match(p, /Apply only the changes described by the user/i);
});

test("buildPrompt includes color label when set", () => {
  const p = buildPrompt("", { hasLogos: true, colorLabel: "Red" });
  assert.match(p, /Red/i);
  assert.match(p, /shelf-band/i);
});
