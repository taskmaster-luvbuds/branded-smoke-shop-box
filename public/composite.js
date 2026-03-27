import {
  computeLogoDrawRect,
  quadNormToPixels,
  resolvePlacementProfile,
} from "./compositeMath.js";
import { warpLogoIntoQuad } from "./homography.js";

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load display"));
    img.src = url;
  });
}

/**
 * @param {{
 *   displayFile: File | null,
 *   displayUrl: string | null,
 *   logoFile: File,
 *   regionKey: string,
 *   scale: number,
 *   offX: number,
 *   offY: number,
 *   displayColorId: string,
 *   customDisplay: boolean,
 * }} opts
 */
export async function buildCompositePng(opts) {
  const {
    displayFile,
    displayUrl,
    logoFile,
    regionKey,
    scale,
    offX,
    offY,
    displayColorId,
    customDisplay,
  } = opts;

  let display;
  if (displayFile) {
    display = await loadImageFromFile(displayFile);
  } else if (displayUrl) {
    display = await loadImageFromUrl(displayUrl);
  } else {
    display = await loadImageFromUrl("/default-display.png");
  }

  const logo = await loadImageFromFile(logoFile);

  const w = display.naturalWidth;
  const h = display.naturalHeight;
  const profile = resolvePlacementProfile(
    String(displayColorId || ""),
    w,
    h,
    { customDisplay: Boolean(customDisplay) }
  );
  const usePerspective = regionKey === "headerPerspective";
  const region = usePerspective
    ? null
    : profile.regions[regionKey] || profile.regions.header;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");

  ctx.drawImage(display, 0, 0, w, h);

  if (usePerspective) {
    const offscreen = document.createElement("canvas");
    offscreen.width = logo.naturalWidth;
    offscreen.height = logo.naturalHeight;
    const octx = offscreen.getContext("2d");
    if (!octx) throw new Error("Canvas unsupported");
    octx.drawImage(logo, 0, 0);
    const logoData = octx.getImageData(
      0,
      0,
      logo.naturalWidth,
      logo.naturalHeight
    );

    const quadPx = quadNormToPixels(
      profile.headerQuad,
      w,
      h,
      offX,
      offY,
      scale
    );
    warpLogoIntoQuad(ctx, logoData, logo.naturalWidth, logo.naturalHeight, quadPx);
  } else if (region) {
    const r = computeLogoDrawRect(
      w,
      h,
      logo.naturalWidth,
      logo.naturalHeight,
      region,
      scale,
      offX,
      offY
    );
    ctx.drawImage(logo, r.x, r.y, r.w, r.h);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Export failed"));
        else resolve(blob);
      },
      "image/png",
      1
    );
  });
}
