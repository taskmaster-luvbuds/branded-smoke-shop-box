import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getColorById } from "./colors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
export const DEFAULT_DISPLAY_PATH = path.join(
  ROOT,
  "smoke shop in a box display.png"
);

/**
 * @param {string | undefined} m
 */
export function normalizeMime(m) {
  if (!m) return "image/png";
  const lower = String(m).toLowerCase();
  if (lower === "image/jpg") return "image/jpeg";
  return lower;
}

/**
 * Same resolution rules as POST /api/brand: optional uploaded `display`, else color JPEG, else bundled PNG.
 * @param {{ displayFile: import("multer").File | undefined, displayColorId: string | undefined }} opts
 * @returns {{ buffer: Buffer, mime: string }}
 */
export function resolveDisplayBuffer(opts) {
  const { displayFile, displayColorId } = opts;
  if (displayFile?.buffer) {
    return {
      buffer: displayFile.buffer,
      mime: normalizeMime(displayFile.mimetype),
    };
  }
  const picked = getColorById(String(displayColorId || "").trim());
  if (picked) {
    const colorPath = path.join(ROOT, "public", "colors", picked.file);
    if (!fs.existsSync(colorPath)) {
      const e = new Error(`Color display asset missing: ${picked.file}`);
      e.code = "COLOR_MISSING";
      throw e;
    }
    return { buffer: fs.readFileSync(colorPath), mime: "image/jpeg" };
  }
  if (!fs.existsSync(DEFAULT_DISPLAY_PATH)) {
    const e = new Error("Default display file missing");
    e.code = "DEFAULT_MISSING";
    throw e;
  }
  return { buffer: fs.readFileSync(DEFAULT_DISPLAY_PATH), mime: "image/png" };
}
