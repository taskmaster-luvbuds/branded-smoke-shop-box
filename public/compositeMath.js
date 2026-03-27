/**
 * Normalized regions (0–1) — **safe print zones** on the physical faces.
 * Shelf bands sit on the **red front lips** (not the white shelf wells above them). Header/base: centered, inset margins.
 */
export const REGIONS = {
  header: { left: 0.19, top: 0.082, width: 0.62, height: 0.098 },
  topShelf: { left: 0.26, top: 0.352, width: 0.48, height: 0.022 },
  middleShelf: { left: 0.26, top: 0.518, width: 0.48, height: 0.022 },
  bottom: { left: 0.18, top: 0.708, width: 0.64, height: 0.248 },
};

/**
 * Header backboard as tl, tr, br, bl in normalized coords (bundled display photo).
 * Tuned for **smoke shop in a box display.png** (~832×1248).
 */
export const HEADER_QUAD_NORM = [
  [0.2, 0.092],
  [0.8, 0.094],
  [0.79, 0.232],
  [0.21, 0.23],
];

/**
 * Same role as HEADER_QUAD_NORM but for **public/colors/*.jpg** exports (~1164×1754).
 * Those renders use a different crop than the PNG; reusing the PNG quad misaligns guides and warp.
 */
/** Perspective warp = same inset header safe area as flat `header` (aligned with white panel, clear of corner art). */
export const HEADER_QUAD_COLOR_JPEG = [
  [0.2, 0.104],
  [0.8, 0.106],
  [0.79, 0.188],
  [0.21, 0.186],
];

/** Color JPEGs (~1164×1754): red bands shifted **down** onto lip; narrower (center third of stand width); base inset. */
/** Tuned to 1164×1754 files in public/colors/*.jpg (same framing for all variants). */
export const REGIONS_COLOR_JPEG = {
  header: { left: 0.19, top: 0.096, width: 0.62, height: 0.072 },
  topShelf: { left: 0.26, top: 0.342, width: 0.48, height: 0.02 },
  middleShelf: { left: 0.26, top: 0.502, width: 0.48, height: 0.02 },
  bottom: { left: 0.18, top: 0.692, width: 0.64, height: 0.252 },
};

const COLOR_VARIANT_IDS = new Set([
  "brown",
  "darkBlue",
  "green",
  "gray",
  "orange",
  "pink",
  "red",
  "teal",
  "yellow",
]);

/**
 * Pick header quad + flat regions for the active display asset.
 * @param {string} displayColorId — form value e.g. `original`, `red`
 * @param {number} nw
 * @param {number} nh
 * @param {{ customDisplay?: boolean }} ctx
 * @returns {{ headerQuad: [number, number][], regions: typeof REGIONS, kind: "stockPng" | "colorJpeg" }}
 */
export function resolvePlacementProfile(displayColorId, nw, nh, ctx) {
  const raw = String(displayColorId ?? "").trim();
  /** Empty hidden field would wrongly fall back to stock PNG while preview is still a color JPEG. */
  const id = raw || "red";
  const custom = ctx?.customDisplay === true;

  const stockMatch = Math.abs(nw - 832) <= 8 && Math.abs(nh - 1248) <= 8;
  const jpegMatch =
    Math.abs(nw - 1164) <= 12 && Math.abs(nh - 1754) <= 12;

  if (custom) {
    if (jpegMatch) {
      return {
        headerQuad: HEADER_QUAD_COLOR_JPEG,
        regions: REGIONS_COLOR_JPEG,
        kind: "colorJpeg",
      };
    }
    if (stockMatch) {
      return {
        headerQuad: HEADER_QUAD_NORM,
        regions: REGIONS,
        kind: "stockPng",
      };
    }
    const aspect = nw / nh;
    const rStock = 832 / 1248;
    const rJpeg = 1164 / 1754;
    if (Math.abs(aspect - rJpeg) < Math.abs(aspect - rStock)) {
      return {
        headerQuad: HEADER_QUAD_COLOR_JPEG,
        regions: REGIONS_COLOR_JPEG,
        kind: "colorJpeg",
      };
    }
    return {
      headerQuad: HEADER_QUAD_NORM,
      regions: REGIONS,
      kind: "stockPng",
    };
  }

  if (id === "original") {
    return {
      headerQuad: HEADER_QUAD_NORM,
      regions: REGIONS,
      kind: "stockPng",
    };
  }

  if (COLOR_VARIANT_IDS.has(id)) {
    return {
      headerQuad: HEADER_QUAD_COLOR_JPEG,
      regions: REGIONS_COLOR_JPEG,
      kind: "colorJpeg",
    };
  }

  return {
    headerQuad: HEADER_QUAD_NORM,
    regions: REGIONS,
    kind: "stockPng",
  };
}

/**
 * @param {[number,number][]} quadNorm
 * @param {number} w
 * @param {number} h
 * @param {number} offXN
 * @param {number} offYN
 * @param {number} scale — 1 = full quad; <1 shrinks toward center
 */
export function quadNormToPixels(quadNorm, w, h, offXN, offYN, scale) {
  const pts = quadNorm.map(([nx, ny]) => ({
    x: (nx + offXN) * w,
    y: (ny + offYN) * h,
  }));
  const cx = pts.reduce((s, p) => s + p.x, 0) / 4;
  const cy = pts.reduce((s, p) => s + p.y, 0) / 4;
  return pts.map((p) => ({
    x: cx + (p.x - cx) * scale,
    y: cy + (p.y - cy) * scale,
  }));
}

/**
 * @param {number} dispW
 * @param {number} dispH
 * @param {number} logoW
 * @param {number} logoH
 * @param {{ left: number, top: number, width: number, height: number }} region
 * @param {number} scale — multiplier on "fit inside box" (e.g. 1)
 * @param {number} offXN — offset as fraction of display width (-0.2…0.2)
 * @param {number} offYN — offset as fraction of display height
 */
export function computeLogoDrawRect(
  dispW,
  dispH,
  logoW,
  logoH,
  region,
  scale,
  offXN,
  offYN
) {
  const boxW = region.width * dispW;
  const boxH = region.height * dispH;
  const fit = Math.min(boxW / logoW, boxH / logoH);
  const s = fit * scale;
  const w = logoW * s;
  const h = logoH * s;
  const cx = region.left * dispW + boxW / 2 + offXN * dispW;
  const cy = region.top * dispH + boxH / 2 + offYN * dispH;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
